BEGIN;
SELECT plan(12);

SELECT has_table('public', 'billing_plans', 'billing_plans exists');
SELECT has_table('public', 'billing_subscriptions', 'billing_subscriptions exists');
SELECT has_table('public', 'billing_payments', 'billing_payments exists');
SELECT has_table('public', 'billing_webhook_events', 'billing_webhook_events exists');
SELECT has_index('public', 'billing_subscriptions', 'idx_billing_subscriptions_business', 'subscription business index exists');
SELECT has_index('public', 'billing_payments', 'idx_billing_payments_business', 'payment business index exists');
SELECT has_index('public', 'billing_webhook_events', 'idx_billing_webhooks_pending', 'webhook pending index exists');
SELECT count(*) = 3 AS three_default_plans FROM public.billing_plans WHERE code IN ('starter','pro','business');
SELECT has_table_privilege('anon', 'public.billing_subscriptions', 'SELECT') = false AS anon_cannot_read_subscriptions;
SELECT has_table_privilege('anon', 'public.billing_payments', 'SELECT') = false AS anon_cannot_read_payments;
SELECT has_table_privilege('authenticated', 'public.billing_webhook_events', 'SELECT') = false AS authenticated_cannot_read_webhooks;
SELECT has_table_privilege('authenticated', 'public.billing_plans', 'SELECT') AS authenticated_can_read_plans;

SELECT * FROM finish();
ROLLBACK;
