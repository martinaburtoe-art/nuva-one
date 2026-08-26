BEGIN;

SELECT plan(3);

-- Every client-exposed public view must use invoker semantics. PostgreSQL
-- creates views as security-definer by default when owned by postgres, which
-- can bypass the RLS policies of the underlying tenant tables.
SELECT is(
  (
    SELECT count(*)::integer
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'v'
      AND (
        has_table_privilege('anon', c.oid, 'SELECT')
        OR has_table_privilege('authenticated', c.oid, 'SELECT')
      )
      AND NOT ('security_invoker=true' = ANY(coalesce(c.reloptions, ARRAY[]::text[])))
  ),
  0,
  'all client-exposed public views enforce underlying-table RLS via security_invoker'
);

-- All public tables remain RLS-protected.
SELECT is(
  (
    SELECT count(*)::integer
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity
  ),
  0,
  'all public tables have RLS enabled'
);

-- Exact duplicate indexes waste write I/O and storage without adding a new
-- access path. Unique constraints/indexes are allowed to remain as the single
-- canonical implementation of their access path.
SELECT is(
  (
    WITH idx AS (
      SELECT regexp_replace(
        indexdef,
        '^CREATE( UNIQUE)? INDEX [^ ]+ ON ',
        'CREATE INDEX ON ',
        'i'
      ) AS normalized
      FROM pg_indexes
      WHERE schemaname = 'public'
    )
    SELECT count(*)::integer
    FROM (
      SELECT normalized
      FROM idx
      GROUP BY normalized
      HAVING count(*) > 1
    ) duplicates
  ),
  0,
  'public schema contains no exact duplicate index definitions'
);

SELECT * FROM finish();
ROLLBACK;
