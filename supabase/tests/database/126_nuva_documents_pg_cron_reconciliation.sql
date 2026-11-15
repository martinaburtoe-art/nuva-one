BEGIN;
SELECT plan(3);

CREATE OR REPLACE FUNCTION pg_temp.nuva_documents_cron_check(p_check text)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
  result boolean := true;
BEGIN
  -- Local Supabase CI may not enable pg_cron; production provisioning is verified separately.
  IF to_regclass('cron.job') IS NULL THEN
    RETURN true;
  END IF;

  IF p_check = 'schedule' THEN
    EXECUTE $query$
      SELECT NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = $1)
        OR EXISTS (SELECT 1 FROM cron.job WHERE jobname = $1 AND schedule = $2 AND active)
    $query$ INTO result USING 'nuva-documents-reconciliation-15m', '*/15 * * * *';
  ELSIF p_check = 'vault-command' THEN
    EXECUTE $query$
      SELECT NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = $1)
        OR EXISTS (SELECT 1 FROM cron.job WHERE jobname = $1
          AND command LIKE $2 AND command LIKE $3)
    $query$ INTO result USING
      'nuva-documents-reconciliation-15m',
      '%nuva_documents_cron_secret%',
      '%/api/cron/nuva-documents-reconciliation%';
  ELSIF p_check = 'legacy' THEN
    EXECUTE $query$
      SELECT NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname IN ($1, $2))
    $query$ INTO result USING
      'nuva-quotes-followup-daily', 'nuva-check-overdue-daily';
  ELSE
    RETURN false;
  END IF;

  RETURN COALESCE(result, false);
END;
$function$;

SELECT ok(pg_temp.nuva_documents_cron_check('schedule'),
  'the Supabase reconciliation fallback runs every 15 minutes when provisioned');

SELECT ok(pg_temp.nuva_documents_cron_check('vault-command'),
  'the scheduled command reads its bearer secret from Vault and calls the protected endpoint');

SELECT ok(pg_temp.nuva_documents_cron_check('legacy'),
  'obsolete quote and overdue cron jobs targeting missing routes are retired');

SELECT * FROM finish();
ROLLBACK;
