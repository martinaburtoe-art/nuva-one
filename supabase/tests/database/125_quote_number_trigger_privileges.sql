BEGIN;
SELECT plan(3);

SELECT ok(
  NOT has_function_privilege('anon', 'public.assign_quote_number()', 'EXECUTE'),
  'anonymous clients cannot invoke the quote-number trigger function directly'
);
SELECT ok(
  NOT has_function_privilege('authenticated', 'public.assign_quote_number()', 'EXECUTE'),
  'authenticated clients cannot invoke the quote-number trigger function directly'
);
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'assign_quote_number'
      AND p.prorettype = 'trigger'::regtype
  ),
  'quote-number trigger function remains installed for PostgreSQL trigger execution'
);

SELECT * FROM finish();
ROLLBACK;
