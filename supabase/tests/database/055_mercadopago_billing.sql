BEGIN;
SELECT plan(12);

SELECT has_table('public', 'billing_plans', 'billing_plans exists');
SELECT has_table('public', 'billing_subscriptions', 'billing_subscriptions exists');
SELECT has_table('public', 'billing_payments', 'billing_payments exists');
SELECT has_table('public', 'billing_webhook_events', 'billing_webhook_events exists');
SELECT has_index('public', 'billing_subscriptions', 'idx_billing_subscriptions_business', 'subscription business index exists');
SELECT has_index('public', 'billing_payments', 'idx_billing_payments_business_created', 'payment business index exists');
SELECT has_index('public', 'billing_webhook_events', 'idx_billing_webhook_events_created', 'webhook event index exists');
SELECT has_table_privilege('anon', 'public.billing_subscriptions', 'SELECT') = false AS anon_cannot_read_subscriptions;
SELECT has_table_privilege('authenticated', 'public.billing_subscriptions', 'INSERT') = false AS authenticated_cannot_insert_subscriptions;
SELECT has_table_privilege('authenticated', 'public.billing_payments', 'INSERT') = false AS authenticated_cannot_insert_payments;
SELECT has_table_privilege('authenticated', 'public.billing_webhook_events', 'SELECT') = false AS authenticated_cannot_read_webhooks;
SELECT EXISTS (SELECT 1 FROM public.billing_plans WHERE code = 'pro' AND monthly_amount = 19990 AND annual_amount = 199900) AS pro_price_is_seeded;

SELECT * FROM finish();
ROLLBACK;
