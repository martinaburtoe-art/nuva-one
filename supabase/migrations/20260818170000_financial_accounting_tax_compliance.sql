create table if not exists public.accounting_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  code text not null,
  name text not null,
  account_type text not null check (account_type in ('asset','liability','equity','revenue','cost_of_sales','expense','other_income','other_expense')),
  parent_id uuid references public.accounting_accounts(id) on delete set null,
  tax_category text,
  active boolean not null default true,
  system_key text,
  created_at timestamptz not null default now(),
  unique (business_id, code)
);
create table if not exists public.accounting_journals (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  entry_date date not null default current_date, description text not null, source_type text not null default 'manual', source_id uuid,
  status text not null default 'posted' check (status in ('draft','posted','void')), created_by uuid default auth.uid(), created_at timestamptz not null default now()
);
create table if not exists public.accounting_lines (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  journal_id uuid not null references public.accounting_journals(id) on delete cascade,
  account_id uuid not null references public.accounting_accounts(id) on delete restrict,
  description text, debit numeric(18,2) not null default 0 check (debit >= 0), credit numeric(18,2) not null default 0 check (credit >= 0),
  tax_code text, created_at timestamptz not null default now(), check (not (debit > 0 and credit > 0))
);
create table if not exists public.accounting_period_closures (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  period_start date not null, period_end date not null, status text not null default 'open' check (status in ('open','review','closed')),
  closed_at timestamptz, closed_by uuid, notes text, created_at timestamptz not null default now(), unique (business_id, period_start, period_end), check (period_end >= period_start)
);
create table if not exists public.tax_profiles (
  id uuid primary key default gen_random_uuid(), business_id uuid not null unique references public.businesses(id) on delete cascade,
  tax_regime text not null default 'pro_pyme_general', vat_status text not null default 'vat_registered', ppm_rate numeric(8,4),
  fiscal_year_end_month smallint not null default 12 check (fiscal_year_end_month between 1 and 12),
  accounting_basis text not null default 'accrual' check (accounting_basis in ('accrual','cash','simplified')), activity_start_date date, updated_at timestamptz not null default now()
);
create table if not exists public.tax_periods (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  period_year smallint not null check (period_year between 2000 and 2100), period_month smallint not null check (period_month between 1 and 12),
  status text not null default 'open' check (status in ('open','calculated','review','filed','paid','rectified')), due_date date, filed_at timestamptz, paid_at timestamptz,
  sii_reference text, notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (business_id, period_year, period_month)
);
create table if not exists public.tax_f29_returns (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  tax_period_id uuid not null unique references public.tax_periods(id) on delete cascade,
  sales_taxable_net numeric(18,2) not null default 0, sales_exempt_net numeric(18,2) not null default 0, sales_export_net numeric(18,2) not null default 0,
  debit_iva numeric(18,2) not null default 0, credit_iva numeric(18,2) not null default 0, credit_iva_remanent numeric(18,2) not null default 0,
  iva_to_pay numeric(18,2) not null default 0, ppm_base numeric(18,2) not null default 0, ppm_rate numeric(8,4), ppm_amount numeric(18,2) not null default 0,
  withholdings numeric(18,2) not null default 0, other_taxes numeric(18,2) not null default 0, total_to_pay numeric(18,2) not null default 0,
  total_documents integer not null default 0, calculation_json jsonb not null default '{}'::jsonb, reviewed_by uuid, reviewed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.tax_supporting_documents (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  tax_period_id uuid references public.tax_periods(id) on delete set null,
  document_type text not null check (document_type in ('dte_sale','dte_purchase','credit_note','debit_note','bank_statement','payment_receipt','expense_receipt','f29_receipt','f22_receipt','declaration','other')),
  document_date date, document_number text, counterparty_rut text, counterparty_name text,
  net_amount numeric(18,2) not null default 0, exempt_amount numeric(18,2) not null default 0, iva_amount numeric(18,2) not null default 0, total_amount numeric(18,2) not null default 0,
  file_name text, storage_path text, source text not null default 'manual', status text not null default 'pending' check (status in ('pending','validated','reconciled','rejected')),
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.tax_annual_returns (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  tax_year smallint not null check (tax_year between 2000 and 2100), status text not null default 'draft' check (status in ('draft','review','ready','filed','paid','rectified')),
  accounting_result numeric(18,2) not null default 0, tax_result numeric(18,2) not null default 0, taxable_base numeric(18,2) not null default 0,
  idpc_amount numeric(18,2) not null default 0, ppm_credits numeric(18,2) not null default 0, other_credits numeric(18,2) not null default 0, balance_to_pay numeric(18,2) not null default 0,
  due_date date, filed_at timestamptz, paid_at timestamptz, sii_reference text, working_papers jsonb not null default '{}'::jsonb, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (business_id, tax_year)
);
create table if not exists public.cash_flow_forecasts (
  id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
  flow_date date not null, flow_type text not null check (flow_type in ('inflow','outflow')), category text not null, description text,
  amount numeric(18,2) not null check (amount >= 0), probability numeric(5,2) not null default 100 check (probability between 0 and 100),
  source_type text not null default 'manual', source_id uuid, scenario text not null default 'base' check (scenario in ('base','conservative','optimistic')),
  status text not null default 'planned' check (status in ('planned','confirmed','realized','cancelled')), created_at timestamptz not null default now()
);

create index if not exists accounting_accounts_business_idx on public.accounting_accounts(business_id, account_type, active);
create index if not exists accounting_journals_business_date_idx on public.accounting_journals(business_id, entry_date);
create index if not exists accounting_lines_business_account_idx on public.accounting_lines(business_id, account_id);
create index if not exists accounting_lines_journal_idx on public.accounting_lines(journal_id);
create index if not exists tax_periods_business_period_idx on public.tax_periods(business_id, period_year desc, period_month desc);
create index if not exists tax_supporting_documents_business_period_idx on public.tax_supporting_documents(business_id, tax_period_id, document_date);
create index if not exists cash_flow_forecasts_business_date_idx on public.cash_flow_forecasts(business_id, flow_date, scenario);

alter table public.accounting_accounts enable row level security;
alter table public.accounting_journals enable row level security;
alter table public.accounting_lines enable row level security;
alter table public.accounting_period_closures enable row level security;
alter table public.tax_profiles enable row level security;
alter table public.tax_periods enable row level security;
alter table public.tax_f29_returns enable row level security;
alter table public.tax_supporting_documents enable row level security;
alter table public.tax_annual_returns enable row level security;
alter table public.cash_flow_forecasts enable row level security;

create policy "Members read accounting_accounts" on public.accounting_accounts for select using (private.is_business_member(business_id, (select auth.uid())));
create policy "Staff write accounting_accounts" on public.accounting_accounts for all using (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role,'staff'::member_role])) with check (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role,'staff'::member_role]));
create policy "Members read accounting_journals" on public.accounting_journals for select using (private.is_business_member(business_id, (select auth.uid())));
create policy "Staff write accounting_journals" on public.accounting_journals for all using (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role,'staff'::member_role])) with check (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role,'staff'::member_role]));
create policy "Members read accounting_lines" on public.accounting_lines for select using (private.is_business_member(business_id, (select auth.uid())));
create policy "Staff write accounting_lines" on public.accounting_lines for all using (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role,'staff'::member_role])) with check (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role,'staff'::member_role]));
create policy "Members read accounting_period_closures" on public.accounting_period_closures for select using (private.is_business_member(business_id, (select auth.uid())));
create policy "Admin manage accounting_period_closures" on public.accounting_period_closures for all using (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role])) with check (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role]));
create policy "Members read tax_profiles" on public.tax_profiles for select using (private.is_business_member(business_id, (select auth.uid())));
create policy "Admin manage tax_profiles" on public.tax_profiles for all using (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role])) with check (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role]));
create policy "Members read tax_periods" on public.tax_periods for select using (private.is_business_member(business_id, (select auth.uid())));
create policy "Admin manage tax_periods" on public.tax_periods for all using (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role])) with check (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role]));
create policy "Members read tax_f29_returns" on public.tax_f29_returns for select using (private.is_business_member(business_id, (select auth.uid())));
create policy "Admin manage tax_f29_returns" on public.tax_f29_returns for all using (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role])) with check (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role]));
create policy "Members read tax_supporting_documents" on public.tax_supporting_documents for select using (private.is_business_member(business_id, (select auth.uid())));
create policy "Staff manage tax_supporting_documents" on public.tax_supporting_documents for all using (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role,'staff'::member_role])) with check (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role,'staff'::member_role]));
create policy "Members read tax_annual_returns" on public.tax_annual_returns for select using (private.is_business_member(business_id, (select auth.uid())));
create policy "Admin manage tax_annual_returns" on public.tax_annual_returns for all using (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role])) with check (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role]));
create policy "Members read cash_flow_forecasts" on public.cash_flow_forecasts for select using (private.is_business_member(business_id, (select auth.uid())));
create policy "Staff manage cash_flow_forecasts" on public.cash_flow_forecasts for all using (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role,'staff'::member_role])) with check (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role,'staff'::member_role]));

insert into public.tax_profiles (business_id) select id from public.businesses on conflict (business_id) do nothing;
create or replace view public.v_financial_account_balances as
select l.business_id, a.id as account_id, a.code, a.name, a.account_type,
coalesce(sum(l.debit),0)::numeric(18,2) as debits, coalesce(sum(l.credit),0)::numeric(18,2) as credits,
case when a.account_type in ('asset','cost_of_sales','expense') then coalesce(sum(l.debit-l.credit),0) else coalesce(sum(l.credit-l.debit),0) end::numeric(18,2) as balance
from public.accounting_lines l join public.accounting_accounts a on a.id=l.account_id join public.accounting_journals j on j.id=l.journal_id and j.status='posted'
group by l.business_id,a.id,a.code,a.name,a.account_type;
create or replace view public.v_tax_document_summary as
select business_id, tax_period_id,
count(*) filter (where document_type in ('dte_sale','credit_note','debit_note')) as sales_docs,
count(*) filter (where document_type='dte_purchase') as purchase_docs,
coalesce(sum(case when document_type in ('dte_sale','credit_note','debit_note') then net_amount else 0 end),0)::numeric(18,2) as sales_net,
coalesce(sum(case when document_type='dte_purchase' then net_amount else 0 end),0)::numeric(18,2) as purchases_net,
coalesce(sum(case when document_type in ('dte_sale','credit_note','debit_note') then iva_amount else 0 end),0)::numeric(18,2) as output_iva,
coalesce(sum(case when document_type='dte_purchase' then iva_amount else 0 end),0)::numeric(18,2) as input_iva
from public.tax_supporting_documents group by business_id,tax_period_id;
