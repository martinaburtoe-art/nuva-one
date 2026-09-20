create or replace function public.validate_nuva_action_queue_transition()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.business_id <> old.business_id
     or new.idempotency_key is distinct from old.idempotency_key
     or new.created_by is distinct from old.created_by
  then
    raise exception 'Nüva Action: immutable fields cannot be changed';
  end if;

  if old.status = new.status then
    return new;
  end if;

  if not (
    (old.status = 'pending' and new.status in ('approved','dismissed')) or
    (old.status = 'approved' and new.status = 'executing') or
    (old.status = 'executing' and new.status in ('completed','failed')) or
    (old.status = 'failed' and new.status = 'executing')
  ) then
    raise exception 'Nüva Action: invalid status transition % -> %', old.status, new.status;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_nuva_action_queue_transition on public.nuva_action_queue;
create trigger trg_nuva_action_queue_transition
before update on public.nuva_action_queue
for each row execute function public.validate_nuva_action_queue_transition();

drop trigger if exists trg_audit_nuva_action_queue on public.nuva_action_queue;
create trigger trg_audit_nuva_action_queue
after insert or update or delete on public.nuva_action_queue
for each row execute function public.log_audit_action();
