BEGIN;

SELECT plan(33);

-- Public RPC entrypoints must be invoker functions; privileged implementations
-- must live in the private schema.
SELECT is((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'adjust_product_stock' AND pg_get_function_identity_arguments(p.oid) = 'p_product_id uuid, p_delta integer, p_reason text, p_source_type text, p_source_id uuid'), false, 'adjust_product_stock public wrapper is invoker');
SELECT is((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'close_cash_register'), false, 'close_cash_register public wrapper is invoker');
SELECT is((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'create_mobile_scanner_session'), false, 'create_mobile_scanner_session public wrapper is invoker');
SELECT is((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'create_product_from_scanner'), false, 'create_product_from_scanner public wrapper is invoker');
SELECT is((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'finalize_inventory_stocktake'), false, 'finalize_inventory_stocktake public wrapper is invoker');
SELECT is((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'get_cash_register_summary'), false, 'get_cash_register_summary public wrapper is invoker');
SELECT is((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'open_cash_register'), false, 'open_cash_register public wrapper is invoker');
SELECT is((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'pair_mobile_scanner'), false, 'pair_mobile_scanner public wrapper is invoker');
SELECT is((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'record_cash_register_movement'), false, 'record_cash_register_movement public wrapper is invoker');
SELECT is((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'revoke_mobile_scanner_session'), false, 'revoke_mobile_scanner_session public wrapper is invoker');
SELECT is((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'submit_mobile_scanner_event'), false, 'submit_mobile_scanner_event public wrapper is invoker');

SELECT is((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'private' AND p.proname = 'adjust_product_stock'), true, 'adjust_product_stock private implementation remains definer');
SELECT is((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'private' AND p.proname = 'close_cash_register'), true, 'close_cash_register private implementation remains definer');
SELECT is((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'private' AND p.proname = 'create_mobile_scanner_session'), true, 'create_mobile_scanner_session private implementation remains definer');
SELECT is((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'private' AND p.proname = 'create_product_from_scanner'), true, 'create_product_from_scanner private implementation remains definer');
SELECT is((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'private' AND p.proname = 'finalize_inventory_stocktake'), true, 'finalize_inventory_stocktake private implementation remains definer');
SELECT is((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'private' AND p.proname = 'get_cash_register_summary'), true, 'get_cash_register_summary private implementation remains definer');
SELECT is((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'private' AND p.proname = 'open_cash_register'), true, 'open_cash_register private implementation remains definer');
SELECT is((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'private' AND p.proname = 'pair_mobile_scanner'), true, 'pair_mobile_scanner private implementation remains definer');
SELECT is((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'private' AND p.proname = 'record_cash_register_movement'), true, 'record_cash_register_movement private implementation remains definer');
SELECT is((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'private' AND p.proname = 'revoke_mobile_scanner_session'), true, 'revoke_mobile_scanner_session private implementation remains definer');
SELECT is((SELECT prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'private' AND p.proname = 'submit_mobile_scanner_event'), true, 'submit_mobile_scanner_event private implementation remains definer');

-- Private implementations must not be executable by anon/public.
SELECT ok(NOT has_function_privilege('anon', 'private.adjust_product_stock(uuid,integer,text,text,uuid)', 'EXECUTE'), 'anon cannot execute private stock adjustment');
SELECT ok(NOT has_function_privilege('anon', 'private.close_cash_register(uuid,numeric)', 'EXECUTE'), 'anon cannot execute private cash close');
SELECT ok(NOT has_function_privilege('anon', 'private.create_mobile_scanner_session(uuid)', 'EXECUTE'), 'anon cannot execute private scanner session');
SELECT ok(NOT has_function_privilege('anon', 'private.create_product_from_scanner(uuid,text,text,text,text,text,numeric,numeric,integer,integer)', 'EXECUTE'), 'anon cannot execute private scanner product creation');
SELECT ok(NOT has_function_privilege('anon', 'private.finalize_inventory_stocktake(uuid)', 'EXECUTE'), 'anon cannot execute private stocktake finalization');
SELECT ok(NOT has_function_privilege('anon', 'private.get_cash_register_summary(uuid)', 'EXECUTE'), 'anon cannot execute private cash summary');
SELECT ok(NOT has_function_privilege('anon', 'private.open_cash_register(uuid,numeric)', 'EXECUTE'), 'anon cannot execute private cash opening');
SELECT ok(NOT has_function_privilege('anon', 'private.pair_mobile_scanner(text)', 'EXECUTE'), 'anon cannot execute private scanner pairing');
SELECT ok(NOT has_function_privilege('anon', 'private.record_cash_register_movement(uuid,text,numeric,text)', 'EXECUTE'), 'anon cannot execute private cash movement');
SELECT ok(NOT has_function_privilege('anon', 'private.revoke_mobile_scanner_session(uuid)', 'EXECUTE'), 'anon cannot execute private scanner revoke');
SELECT ok(NOT has_function_privilege('anon', 'private.submit_mobile_scanner_event(uuid,text,uuid,text)', 'EXECUTE'), 'anon cannot execute private scanner event');

SELECT * FROM finish();
ROLLBACK;
