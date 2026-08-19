begin;

-- Fix the interaction between the atomic journal RPC and the posted-journal
-- integrity trigger. A journal is assembled as draft, its lines are inserted,
-- then it is transitioned to posted so the trigger validates the completed entry.
create or replace function public.post_financial_journal(
  p_business_id uuid,
  p_entry_date date,
  p_description text,
  p_source_type text,
  p_source_id uuid,
  p_lines jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_journal uuid;
  v_total_debit numeric(18,2);
  v_total_credit numeric(18,2);
  v_period record;
  v_line jsonb;
begin
  if auth.uid() is not null
     and not private.has_business_role(p_business_id, auth.uid(), array['owner','admin','staff']::public.member_role[]) then
    raise exception 'business write access denied';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) < 2 then
    raise exception 'journal requires at least two lines';
  end if;

  select * into v_period
  from public.accounting_period_closures
  where business_id=p_business_id
    and p_entry_date between period_start and period_end
  order by period_start desc
  limit 1;

  if found and v_period.status='closed' then
    raise exception 'accounting period is closed';
  end if;

  select coalesce(sum((x->>'debit')::numeric),0),
         coalesce(sum((x->>'credit')::numeric),0)
  into v_total_debit,v_total_credit
  from jsonb_array_elements(p_lines) x;

  if v_total_debit <= 0 or round(v_total_debit,2) <> round(v_total_credit,2) then
    raise exception 'unbalanced journal: debit %, credit %',v_total_debit,v_total_credit;
  end if;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    if not exists (
      select 1 from public.accounting_accounts a
      where a.id=(v_line->>'account_id')::uuid
        and a.business_id=p_business_id
        and a.active
    ) then
      raise exception 'account does not belong to business';
    end if;

    if coalesce((v_line->>'debit')::numeric,0) < 0
       or coalesce((v_line->>'credit')::numeric,0) < 0
       or (coalesce((v_line->>'debit')::numeric,0)>0
           and coalesce((v_line->>'credit')::numeric,0)>0) then
      raise exception 'invalid debit/credit line';
    end if;
  end loop;

  -- Second-layer source idempotency. Operational posting functions also lock
  -- their source rows, while this protects generic callers at the journal layer.
  if p_source_id is not null and p_source_type is not null then
    select id into v_journal
    from public.accounting_journals
    where business_id=p_business_id
      and source_type=p_source_type
      and source_id=p_source_id
    limit 1;
    if found then
      return v_journal;
    end if;
  end if;

  insert into public.accounting_journals(
    business_id,entry_date,description,source_type,source_id,status,created_by
  )
  values(
    p_business_id,p_entry_date,p_description,coalesce(p_source_type,'manual'),p_source_id,'draft',auth.uid()
  )
  returning id into v_journal;

  insert into public.accounting_lines(
    business_id,journal_id,account_id,description,debit,credit,tax_code
  )
  select
    p_business_id,v_journal,(x->>'account_id')::uuid,x->>'description',
    coalesce((x->>'debit')::numeric,0),
    coalesce((x->>'credit')::numeric,0),
    x->>'tax_code'
  from jsonb_array_elements(p_lines) x;

  update public.accounting_journals
  set status='posted'
  where id=v_journal
    and business_id=p_business_id;

  return v_journal;
end;
$$;

create unique index if not exists uq_accounting_journal_source
  on public.accounting_journals(business_id,source_type,source_id)
  where source_id is not null;

revoke all on function public.post_financial_journal(uuid,date,text,text,uuid,jsonb) from public, anon;
grant execute on function public.post_financial_journal(uuid,date,text,text,uuid,jsonb) to authenticated;

commit;
