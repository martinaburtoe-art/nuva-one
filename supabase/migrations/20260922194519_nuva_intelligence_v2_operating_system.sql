-- Nüva Intelligence v2 operating-system persistence foundation.
CREATE TABLE IF NOT EXISTS public.nuva_intelligence_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  event_type text NOT NULL,
  source_table text,
  source_id uuid,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  summary text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.nuva_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  risk_type text NOT NULL,
  title text NOT NULL,
  description text,
  severity text NOT NULL DEFAULT 'medium',
  probability numeric,
  impact numeric,
  confidence numeric,
  status text NOT NULL DEFAULT 'open',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommended_action jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.nuva_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  opportunity_type text NOT NULL,
  title text NOT NULL,
  description text,
  potential_impact numeric,
  confidence numeric,
  status text NOT NULL DEFAULT 'open',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommended_action jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.nuva_simulation_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  created_by uuid,
  name text NOT NULL,
  scenario_type text NOT NULL,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  outputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  assumptions jsonb NOT NULL DEFAULT '{}'::jsonb,
  baseline_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.nuva_business_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  memory_type text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  source_type text,
  source_id uuid,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence numeric,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  supersedes_id uuid REFERENCES public.nuva_business_memory(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.nuva_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  metric_key text NOT NULL,
  metric_value numeric,
  cohort_key text NOT NULL,
  cohort_size integer,
  percentile numeric,
  period_start date,
  period_end date,
  methodology_version text NOT NULL DEFAULT 'v1',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.nuva_autopilot_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  created_by uuid,
  name text NOT NULL,
  action_type text NOT NULL,
  mode text NOT NULL DEFAULT 'recommend',
  enabled boolean NOT NULL DEFAULT true,
  constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
  approval_required boolean NOT NULL DEFAULT true,
  last_evaluated_at timestamptz,
  last_executed_at timestamptz,
  execution_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.nuva_action_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  action_id uuid REFERENCES public.nuva_action_queue(id),
  outcome_type text NOT NULL,
  expected_impact numeric,
  actual_impact numeric,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  observed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nuva_intelligence_events_business_id_idx ON public.nuva_intelligence_events(business_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS nuva_risks_business_id_idx ON public.nuva_risks(business_id, status, detected_at DESC);
CREATE INDEX IF NOT EXISTS nuva_opportunities_business_id_idx ON public.nuva_opportunities(business_id, status, detected_at DESC);
CREATE INDEX IF NOT EXISTS nuva_simulation_scenarios_business_id_idx ON public.nuva_simulation_scenarios(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS nuva_business_memory_business_id_idx ON public.nuva_business_memory(business_id, valid_from DESC);
CREATE INDEX IF NOT EXISTS nuva_benchmarks_business_id_idx ON public.nuva_benchmarks(business_id, metric_key, period_end DESC);
CREATE INDEX IF NOT EXISTS nuva_autopilot_policies_business_id_idx ON public.nuva_autopilot_policies(business_id, enabled);
CREATE INDEX IF NOT EXISTS nuva_action_outcomes_business_id_idx ON public.nuva_action_outcomes(business_id, observed_at DESC);

ALTER TABLE public.nuva_intelligence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nuva_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nuva_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nuva_simulation_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nuva_business_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nuva_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nuva_autopilot_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nuva_action_outcomes ENABLE ROW LEVEL SECURITY;
