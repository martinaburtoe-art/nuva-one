begin;
select plan(5);
select ok(exists (select 1 from pg_trigger where tgname = 'trg_guard_cash_register_lifecycle'), 'cash register lifecycle trigger exists');
select ok(not has_table_privilege('authenticated', 'public.cash_register_movements', 'UPDATE'), 'authenticated cannot update cash movements');
select ok(not has_table_privilege('authenticated', 'public.cash_register_movements', 'DELETE'), 'authenticated cannot delete cash movements');
select ok(exists (select 1 from pg_constraint where conrelid = 'public.cash_registers'::regclass and conname = 'cash_register_close_state'), 'cash register close-state constraint exists');
select ok(exists (select 1 from pg_indexes where indexname = 'uq_cash_register_one_open_per_business'), 'one-open-register constraint remains present');
select * from finish();
rollback;
