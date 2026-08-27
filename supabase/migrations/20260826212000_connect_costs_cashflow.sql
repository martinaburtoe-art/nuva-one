alter table public.costs add column if not exists cash_ledger_id uuid references public.financial_cash_ledger(id) on delete set null;

create or replace function public.sync_cost_transaction() returns trigger language plpgsql security definer set search_path = public as $$
declare tx_id uuid; ledger_id uuid;
begin
  if new.transaction_id is null and new.payment_status <> 'cancelled' then
    insert into public.transactions(business_id,type,category,amount,description,tx_date)
    values(new.business_id,'expense',new.category,new.total_amount,new.description,new.incurred_at)
    returning id into tx_id;
    new.transaction_id := tx_id;
  elsif new.transaction_id is not null and tg_op = 'UPDATE' then
    update public.transactions set category=new.category, amount=new.total_amount, description=new.description, tx_date=new.incurred_at where id=new.transaction_id and business_id=new.business_id;
  end if;
  if new.payment_status = 'paid' and new.cash_ledger_id is null then
    insert into public.financial_cash_ledger(business_id,entry_date,direction,amount,category,description,payment_method,source_type,source_id)
    values(new.business_id,coalesce(new.paid_at,new.incurred_at),'outflow',new.total_amount,new.category,new.description,new.payment_method,'cost',new.id)
    returning id into ledger_id;
    new.cash_ledger_id := ledger_id;
  end if;
  if new.payment_status = 'paid' and new.paid_at is null then new.paid_at := coalesce(new.incurred_at,current_date); end if;
  return new;
end;
$$;

revoke all on function public.sync_cost_transaction() from public;
revoke all on function public.sync_cost_transaction() from anon;
revoke all on function public.sync_cost_transaction() from authenticated;
