begin;

-- Keep the integrity guard strict while remaining compatible with the current
-- manual-journal UI, which historically used two API requests (journal then lines).
-- Manual inserts are staged as draft; once the complete balanced line set exists,
-- the database publishes the journal and the existing integrity trigger validates it.
alter table public.accounting_journals
  alter column status set default 'draft';

create or replace function private.stage_manual_journal_insert()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if new.source_type = 'manual' and new.status = 'posted' then
    new.status := 'draft';
  end if;
  return new;
end;
$$;

revoke all on function private.stage_manual_journal_insert() from public, anon, authenticated;

drop trigger if exists trg_stage_manual_journal_insert on public.accounting_journals;
create trigger trg_stage_manual_journal_insert
before insert on public.accounting_journals
for each row execute function private.stage_manual_journal_insert();

create or replace function private.publish_complete_manual_journal()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  j record;
  line_count integer;
  total_debit numeric;
  total_credit numeric;
begin
  select * into j
  from public.accounting_journals
  where id = new.journal_id;

  if not found or j.status <> 'draft' or j.source_type <> 'manual' then
    return new;
  end if;

  select count(*), coalesce(sum(debit),0), coalesce(sum(credit),0)
    into line_count, total_debit, total_credit
  from public.accounting_lines
  where journal_id=j.id and business_id=j.business_id;

  if line_count >= 2 and total_debit > 0 and round(total_debit,2)=round(total_credit,2) then
    update public.accounting_journals
      set status='posted'
      where id=j.id and status='draft';
  end if;

  return new;
end;
$$;

revoke all on function private.publish_complete_manual_journal() from public, anon, authenticated;

drop trigger if exists trg_publish_complete_manual_journal on public.accounting_lines;
create trigger trg_publish_complete_manual_journal
after insert or update on public.accounting_lines
for each row execute function private.publish_complete_manual_journal();

commit;
