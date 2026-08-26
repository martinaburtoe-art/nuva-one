-- Remove exact duplicate non-essential indexes where a unique constraint/index
-- already provides the same access path. IF EXISTS keeps clean-db replay safe.
DROP INDEX IF EXISTS public.idx_financial_cash_ledger_business_source;
DROP INDEX IF EXISTS public.idx_payment_intents_token;
DROP INDEX IF EXISTS public.idx_products_business_sku;
DROP INDEX IF EXISTS public.idx_tax_periods_business_period;
DROP INDEX IF EXISTS public.idx_whatsapp_connections_business_id;
DROP INDEX IF EXISTS public.idx_whatsapp_connections_phone_number_id;
DROP INDEX IF EXISTS public.idx_whatsapp_owner_links_phone;
