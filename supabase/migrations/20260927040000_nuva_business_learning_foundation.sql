create table if not exists public.nuva_decision_evidence (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  decision_id text not null,
  signal text not null,
  evidence jsonb not null default '{}'::jsonb,
  agents_consulted text[] not null default '{}'::text[],
  consensus_confidence numeric(5,4) not null check (consensus_confidence between 0 and 1),
  agreement numeric(5,4) not null check (agreement between 0 and 1),
  dissent text[] not null default '{}'::text[],
  recommended_action text,
  guardian_decision text check (guardian_decision in ('ALLOW','REVIEW','BLOCK')),
  execution_result text,
  verification_passed boolean,
  created_at timestamptz not null default now(),
  unique (business_id, decision_id)
);

create table if not exists public.nuva_business_instincts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  key text not null,
  statement text not null,
  confidence numeric(5,4) not null default 0 check (confidence between 0 and 1),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  scope text not null default 'business' check (scope in ('business','global')),
  last_observed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, key)
);

create index if not exists idx_nuva_decision_evidence_business_created on public.nuva_decision_evidence (business_id, created_at desc);
create index if not exists idx_nuva_instincts_business_confidence on public.nuva_business_instincts (business_id, confidence desc);

alter table public.nuva_decision_evidence enable row level security;
alter table public.nuva_business_instincts enable row level security;

create policy "nuva evidence member select" on public.nuva_decision_evidence for select to authenticated using (private.is_business_member(business_id, (select auth.uid())));
create policy "nuva evidence manager insert" on public.nuva_decision_evidence for insert to authenticated with check (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role]));
create policy "nuva evidence manager update" on public.nuva_decision_evidence for update to authenticated using (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role])) with check (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role]));
create policy "nuva evidence manager delete" on public.nuva_decision_evidence for delete to authenticated using (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role]));

create policy "nuva instincts member select" on public.nuva_business_instincts for select to authenticated using (private.is_business_member(business_id, (select auth.uid())));
create policy "nuva instincts manager insert" on public.nuva_business_instincts for insert to authenticated with check (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role]));
create policy "nuva instincts manager update" on public.nuva_business_instincts for update to authenticated using (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role])) with check (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role]));
create policy "nuva instincts manager delete" on public.nuva_business_instincts for delete to authenticated using (private.has_business_role(business_id, (select auth.uid()), array['owner'::member_role,'admin'::member_role]));