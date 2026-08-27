BEGIN;
SELECT plan(3);

SELECT is((SELECT count(*)::integer FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='v' AND (has_table_privilege('anon',c.oid,'SELECT') OR has_table_privilege('authenticated',c.oid,'SELECT')) AND NOT ('security_invoker=true'=ANY(coalesce(c.reloptions,ARRAY[]::text[])))),0,'all client-exposed public views enforce underlying-table RLS via security_invoker');

SELECT is((SELECT count(*)::integer FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity),0,'all public tables have RLS enabled');

SELECT diag(coalesce((SELECT string_agg(format('%s => %s',normalized,indexes),E'\n' ORDER BY normalized) FROM (SELECT regexp_replace(indexdef,'^CREATE( UNIQUE)? INDEX [^ ]+ ON ','CREATE INDEX ON ','i') normalized,string_agg(indexname,', ' ORDER BY indexname) indexes FROM pg_indexes WHERE schemaname='public' GROUP BY regexp_replace(indexdef,'^CREATE( UNIQUE)? INDEX [^ ]+ ON ','CREATE INDEX ON ','i') HAVING count(*)>1) d),'No duplicate public index definitions detected'));

SELECT is((SELECT count(*)::integer FROM (WITH idx AS (SELECT regexp_replace(indexdef,'^CREATE( UNIQUE)? INDEX [^ ]+ ON ','CREATE INDEX ON ','i') normalized FROM pg_indexes WHERE schemaname='public') SELECT normalized FROM idx GROUP BY normalized HAVING count(*)>1) duplicates),0,'public schema contains no exact duplicate index definitions');

SELECT * FROM finish();
ROLLBACK;
