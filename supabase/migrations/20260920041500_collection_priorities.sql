create or replace function public.get_collection_priorities()
returns table(sale_id uuid,customer_id uuid,customer_name text,customer_phone text,total numeric,paid_amount numeric,balance numeric,due_date date,days_overdue integer,priority text)
language sql security invoker set search_path to public, pg_temp
as $$
 select s.id,s.customer_id,coalesce(s.customer_name,c.name,'Cliente'),c.phone,s.total,s.paid_amount,
 round(greatest(0,s.total-coalesce(s.paid_amount,0)),2),s.due_date,
 greatest(0,(current_date-s.due_date))::int,
 case when s.due_date < current_date then 'overdue' when s.due_date <= current_date + 3 then 'due_soon' else 'upcoming' end
 from public.sales s left join public.customers c on c.id=s.customer_id and c.business_id=s.business_id
 where s.business_id in (select bm.business_id from public.business_members bm where bm.user_id=auth.uid())
 and s.is_credit=true and s.status <> 'paid' and greatest(0,s.total-coalesce(s.paid_amount,0))>0
 order by case when s.due_date < current_date then 0 when s.due_date <= current_date + 3 then 1 else 2 end,s.due_date asc nulls last,greatest(0,s.total-coalesce(s.paid_amount,0)) desc;
$$;
grant execute on function public.get_collection_priorities() to authenticated;
