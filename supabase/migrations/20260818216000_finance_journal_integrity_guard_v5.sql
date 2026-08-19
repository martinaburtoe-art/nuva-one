begin;

create or replace function private.validate_accounting_journal_integrity()
returns trigger language plpgsql security definer set search_path = public, private as $$
declare d numeric; c numeric; line_count integer; bad_business boolean;
begin
  if new.status='posted' then
    select count(*),coalesce(sum(debit),0),coalesce(sum(credit),0) into line_count,d,c from public.accounting_lines where journal_id=new.id and business_id=new.business_id;
    if line_count<2 then raise exception 'ACCOUNTING_JOURNAL_MIN_LINES'; end if;
    if d<=0 or round(d,2)<>round(c,2) then raise exception 'ACCOUNTING_JOURNAL_UNBALANCED'; end if;
    select exists(select 1 from public.accounting_lines l left join public.accounting_accounts a on a.id=l.account_id where l.journal_id=new.id and (a.id is null or a.business_id<>new.business_id or l.business_id<>new.business_id)) into bad_business;
    if bad_business then raise exception 'ACCOUNTING_JOURNAL_TENANT_MISMATCH'; end if;
  end if;
  return new;
end;
$$;
revoke all on function private.validate_accounting_journal_integrity() from public, anon, authenticated;
drop trigger if exists trg_validate_accounting_journal_integrity on public.accounting_journals;
create trigger trg_validate_accounting_journal_integrity after insert or update on public.accounting_journals for each row execute function private.validate_accounting_journal_integrity();

commit;
