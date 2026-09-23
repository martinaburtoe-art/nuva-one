-- Fix gratification settlement volatility and controlled RPC access.
-- The function writes a settlement row, therefore it must be VOLATILE.
-- It remains SECURITY INVOKER and explicitly requires owner/admin membership.

create or replace function public.calculate_people_gratification_settlement(
  p_employee_id uuid,
  p_year integer
)
returns numeric
language plpgsql
volatile
set search_path to 'public','private'
as $function$
declare
  v_business uuid;
  v_mode text;
  v_scheme text;
  v_profit numeric;
  v_total_rem numeric:=0;
  v_employee_rem numeric:=0;
  v_legal numeric:=0;
  v_revalued numeric:=0;
  v_cap numeric:=0;
  v_missing integer:=0;
  v_user uuid:=auth.uid();
  r record;
begin
  if v_user is null then
    raise exception 'authentication required';
  end if;

  select business_id, gratification_mode into v_business, v_mode
  from public.people_employees where id=p_employee_id;

  if not found then raise exception 'Empleado no existe'; end if;

  if not private.has_business_role(
    v_business, v_user, array['owner','admin']::public.member_role[]
  ) then
    raise exception 'owner/admin role required';
  end if;

  select scheme, liquid_profit into v_scheme, v_profit
  from public.people_gratification_settings
  where business_id=v_business and fiscal_year=p_year
    and status in ('approved','closed');

  if not found or v_scheme='none' then return 0; end if;

  select coalesce(sum(greatest(
    0, i.gross_taxable-coalesce((i.components->>'gratification')::numeric,0)
  )),0)
  into v_employee_rem
  from public.people_payroll_items i
  join public.people_payroll_periods p on p.id=i.payroll_period_id
  where i.employee_id=p_employee_id and p.business_id=v_business
    and p.period_year=p_year and p.status in ('calculated','approved','closed');

  if v_scheme='article_50' then
    select count(*) into v_missing
    from public.people_payroll_items i
    join public.people_payroll_periods p on p.id=i.payroll_period_id
    where i.employee_id=p_employee_id and p.business_id=v_business
      and p.period_year=p_year and p.status in ('calculated','approved','closed')
      and not exists (
        select 1 from public.people_gratification_ipc x
        where (x.business_id=v_business or x.business_id is null)
          and x.fiscal_year=p_year and x.month=p.period_month
      );

    if v_missing>0 then
      raise exception 'Faltan factores IPC para cerrar gratificación Art. 50 del ejercicio %',p_year;
    end if;

    for r in
      select p.period_month,
             coalesce((i.components->>'gratification')::numeric,0) gratification
      from public.people_payroll_items i
      join public.people_payroll_periods p on p.id=i.payroll_period_id
      where i.employee_id=p_employee_id and p.business_id=v_business
        and p.period_year=p_year and p.status in ('calculated','approved','closed')
    loop
      v_revalued:=v_revalued+r.gratification*(
        (select index_value from public.people_gratification_ipc
         where (business_id=v_business or business_id is null)
           and fiscal_year=p_year and month=12
         order by business_id nulls last limit 1)
        /
        (select index_value from public.people_gratification_ipc
         where (business_id=v_business or business_id is null)
           and fiscal_year=p_year and month=r.period_month
         order by business_id nulls last limit 1)
      );
    end loop;

    select value_numeric*4.75 into v_cap
    from public.people_legal_parameters
    where country_code='CL' and parameter_key='minimum_monthly_wage'
      and effective_from<=make_date(p_year,12,31)
      and (effective_to is null or effective_to>=make_date(p_year,12,31))
    order by effective_from desc limit 1;

    v_legal:=least(v_employee_rem*0.25,v_cap);

  elsif v_scheme='article_47' then
    select coalesce(sum(greatest(
      0, i.gross_taxable-coalesce((i.components->>'gratification')::numeric,0)
    )),0)
    into v_total_rem
    from public.people_payroll_items i
    join public.people_payroll_periods p on p.id=i.payroll_period_id
    join public.people_employees e on e.id=i.employee_id
    where i.business_id=v_business and p.period_year=p_year
      and p.status in ('calculated','approved','closed')
      and e.gratification_mode<>'none';

    v_legal:=case when v_total_rem>0
      then greatest(0,v_profit*0.30*(v_employee_rem/v_total_rem))
      else 0 end;
  else
    v_legal:=v_employee_rem*0.25;
  end if;

  v_legal:=round(greatest(0,v_legal),0);
  v_revalued:=round(greatest(0,v_revalued),0);

  insert into public.people_gratification_settlements(
    business_id,employee_id,fiscal_year,scheme,legal_amount,
    advances_revalued,balance_due,balance_credit,cap_amount,calculation_payload
  )
  values(
    v_business,p_employee_id,p_year,v_scheme,v_legal,v_revalued,
    greatest(0,v_legal-v_revalued),greatest(0,v_revalued-v_legal),v_cap,
    jsonb_build_object(
      'employee_remuneration',v_employee_rem,'profit',v_profit,
      'ipc_revaluation',v_revalued,'generated_at',now(),
      'calculation_version','gratification-cl-2026.1'
    )
  )
  on conflict(business_id,employee_id,fiscal_year)
  do update set
    legal_amount=excluded.legal_amount,
    advances_revalued=excluded.advances_revalued,
    balance_due=excluded.balance_due,
    balance_credit=excluded.balance_credit,
    cap_amount=excluded.cap_amount,
    calculation_payload=excluded.calculation_payload,
    calculated_at=now(),
    status='calculated';

  return greatest(0,v_legal-v_revalued);
end
$function$;

revoke all on function public.calculate_people_gratification_settlement(uuid,integer) from public;
revoke all on function public.calculate_people_gratification_settlement(uuid,integer) from anon;
grant execute on function public.calculate_people_gratification_settlement(uuid,integer) to authenticated;
