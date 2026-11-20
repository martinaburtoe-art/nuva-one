-- Nüva People — guard against accidental deletion of write policies.
-- These expected policy counts were read from the current remote pg_policies
-- catalog on 2026-11-02. The hardening migration is intended to replace SELECT
-- policies only; INSERT/UPDATE/DELETE policies must remain intact.
begin;
select plan(14);

select is((select count(*)::integer from pg_policies where schemaname='public' and tablename='people_absences' and cmd <> 'SELECT'), 3, 'people_absences retains INSERT/UPDATE/DELETE policies');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename='people_contracts' and cmd <> 'SELECT'), 3, 'people_contracts retains INSERT/UPDATE/DELETE policies');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename='people_documents' and cmd <> 'SELECT'), 3, 'people_documents retains INSERT/UPDATE/DELETE policies');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename='people_employees' and cmd <> 'SELECT'), 3, 'people_employees retains INSERT/UPDATE/DELETE policies');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename='people_karin_cases' and cmd <> 'SELECT'), 2, 'people_karin_cases retains INSERT/UPDATE policies');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename='people_lre_rows' and cmd <> 'SELECT'), 3, 'people_lre_rows retains INSERT/UPDATE/DELETE policies');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename='people_payroll_inputs' and cmd <> 'SELECT'), 3, 'people_payroll_inputs retains INSERT/UPDATE/DELETE policies');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename='people_payroll_items' and cmd <> 'SELECT'), 3, 'people_payroll_items retains INSERT/UPDATE/DELETE policies');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename='people_payroll_liquidations' and cmd <> 'SELECT'), 3, 'people_payroll_liquidations retains INSERT/UPDATE/DELETE policies');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename='people_payroll_periods' and cmd <> 'SELECT'), 3, 'people_payroll_periods retains INSERT/UPDATE/DELETE policies');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename='people_payroll_postings' and cmd <> 'SELECT'), 3, 'people_payroll_postings retains INSERT/UPDATE/DELETE policies');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename='people_payroll_runs' and cmd <> 'SELECT'), 3, 'people_payroll_runs retains INSERT/UPDATE/DELETE policies');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename='people_terminations' and cmd <> 'SELECT'), 3, 'people_terminations retains INSERT/UPDATE/DELETE policies');
select is((select count(*)::integer from pg_policies where schemaname='public' and tablename='people_vacation_balances' and cmd <> 'SELECT'), 3, 'people_vacation_balances retains INSERT/UPDATE/DELETE policies');

select * from finish();
rollback;
