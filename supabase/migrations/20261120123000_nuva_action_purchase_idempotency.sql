-- Persist the Action Queue identity on the business mutation itself.
-- A nullable key preserves all manual and legacy purchases.
ALTER TABLE public.purchases
  ADD COLUMN IF NOT EXISTS source_action_id UUID;

-- A regular UNIQUE index permits multiple NULL values while guaranteeing that
-- one action can create at most one purchase, including after an ambiguous HTTP response.
CREATE UNIQUE INDEX IF NOT EXISTS purchases_source_action_id_uidx
  ON public.purchases (source_action_id);

-- One durable execution outcome per action. The API treats only this exact
-- unique conflict as an idempotent replay.
CREATE UNIQUE INDEX IF NOT EXISTS nuva_action_outcomes_executed_action_uidx
  ON public.nuva_action_outcomes (action_id)
  WHERE action_id IS NOT NULL
    AND outcome_type = 'executed';

COMMENT ON COLUMN public.purchases.source_action_id IS
  'Action Queue action that created this purchase; unique when non-null to make ambiguous retries idempotent.';
