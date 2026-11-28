-- Read-only fingerprint snapshot for the applied Supabase migration payloads.
-- Run in the target project with a read-only SQL session; this performs no writes.
-- Save the returned rows as JSON and pass them to audit-migration-history.mjs --remote-json.

select
  version,
  name,
  coalesce(cardinality(statements), 0) as statement_count,
  coalesce(octet_length(array_to_string(statements, E'\\n')), 0) as statement_bytes,
  md5(coalesce(array_to_string(statements, E'\\n'), '')) as statements_md5
from supabase_migrations.schema_migrations
order by version;
