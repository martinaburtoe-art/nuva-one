-- Nüva People — fix helper alias shadowing.
-- El alias SQL no puede colisionar con el record PL/pgSQL.

create or replace function public.people_unpaid_absence_days(p_employee_id uuid,p_start date,p_end date)
returns numeric language plpgsql stable set search_path=public as $$
declare d date:=p_start; n numeric:=0;
begin
 if p_end<p_start then return 0; end if;
 while d<=p_end loop
  if exists(select 1 from public.people_absences pa where pa.employee_id=p_employee_id and pa.starts_on<=d and pa.ends_on>=d and coalesce(pa.paid,false)=false and coalesce(pa.absence_type,'')<>'vacation') then n:=n+1; end if;
  d:=d+1;
 end loop;
 return n;
end $$;