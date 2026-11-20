BEGIN;
SELECT plan(8);

INSERT INTO auth.users (id) VALUES
  ('00000000-0000-0000-0000-00000000f901');
INSERT INTO public.businesses (id, name, owner_id, plan) VALUES
  ('00000000-0000-0000-0000-00000000f911', 'Action Purchase Idempotency', '00000000-0000-0000-0000-00000000f901', 'starter');
INSERT INTO public.nuva_action_queue (id, business_id, action_type, title)
VALUES (
  '00000000-0000-0000-0000-00000000f921',
  '00000000-0000-0000-0000-00000000f911',
  'low-stock',
  'Idempotency fixture'
);

SELECT lives_ok(
  $$INSERT INTO public.purchases (id, business_id, source_action_id, status, total, items)
    VALUES ('00000000-0000-0000-0000-00000000f931',
            '00000000-0000-0000-0000-00000000f911',
            '00000000-0000-0000-0000-00000000f921',
            'pending', 2500, '[{"product_id":"p1","qty":2,"unit_cost":1250,"total":2500}]'::jsonb)$$,
  'first action-linked purchase is accepted'
);
SELECT throws_ok(
  $$INSERT INTO public.purchases (id, business_id, source_action_id, status, total, items)
    VALUES ('00000000-0000-0000-0000-00000000f932',
            '00000000-0000-0000-0000-00000000f911',
            '00000000-0000-0000-0000-00000000f921',
            'pending', 2500, '[{"product_id":"p1","qty":2,"unit_cost":1250,"total":2500}]'::jsonb)$$,
  '23505',
  NULL,
  'a repeated action id cannot create a second purchase'
);
SELECT is(
  (SELECT count(*)::int FROM public.purchases WHERE source_action_id = '00000000-0000-0000-0000-00000000f921'),
  1,
  'only one purchase exists for the action id'
);
SELECT lives_ok(
  $$INSERT INTO public.purchases (id, business_id, status, total, items)
    VALUES
      ('00000000-0000-0000-0000-00000000f933','00000000-0000-0000-0000-00000000f911','pending',1000,'[]'::jsonb),
      ('00000000-0000-0000-0000-00000000f934','00000000-0000-0000-0000-00000000f911','pending',1000,'[]'::jsonb)$$,
  'manual purchases without an action id remain compatible'
);
SELECT is(
  (SELECT count(*)::int FROM public.purchases WHERE source_action_id IS NULL AND business_id = '00000000-0000-0000-0000-00000000f911'),
  2,
  'multiple legacy/manual purchases may keep a null action id'
);
SELECT lives_ok(
  $$INSERT INTO public.nuva_action_outcomes (business_id, action_id, outcome_type, evidence)
    VALUES ('00000000-0000-0000-0000-00000000f911',
            '00000000-0000-0000-0000-00000000f921',
            'executed', '{"record_id":"00000000-0000-0000-0000-00000000f931"}'::jsonb)$$,
  'first executed outcome is accepted'
);
SELECT throws_ok(
  $$INSERT INTO public.nuva_action_outcomes (business_id, action_id, outcome_type, evidence)
    VALUES ('00000000-0000-0000-0000-00000000f911',
            '00000000-0000-0000-0000-00000000f921',
            'executed', '{"record_id":"duplicate"}'::jsonb)$$,
  '23505',
  NULL,
  'a retry cannot persist a duplicate executed outcome'
);
SELECT lives_ok(
  $$INSERT INTO public.nuva_action_outcomes (business_id, action_id, outcome_type, evidence)
    VALUES ('00000000-0000-0000-0000-00000000f911',
            '00000000-0000-0000-0000-00000000f921',
            'reviewed', '{"review":"separate outcome"}'::jsonb)$$,
  'non-executed outcome types remain available'
);

SELECT * FROM finish();
ROLLBACK;
