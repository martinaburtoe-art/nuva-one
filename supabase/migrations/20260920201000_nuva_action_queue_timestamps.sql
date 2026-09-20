create or replace function public.touch_nuva_action_queue_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  if new.status = 'completed' and old.status is distinct from 'completed' then
    new.completed_at = coalesce(new.completed_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_nuva_action_queue_updated_at on public.nuva_action_queue;
create trigger trg_nuva_action_queue_updated_at
before update on public.nuva_action_queue
for each row execute function public.touch_nuva_action_queue_updated_at();
