BEGIN;
SELECT plan(4);

DO $test$
DECLARE
  has_secret boolean := false;
  has_job boolean := false;
BEGIN
  IF to_regclass('vault.secrets') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM vault.secrets WHERE name = $1)'
      INTO has_secret USING 'nuva_documents_cron_secret';
  END IF;
  IF to_regclass('cron.job') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM cron.job WHERE jobname = $1)'
      INTO has_job USING 'nuva-documents-reconciliation-15m';
  END IF;
  PERFORM ok(NOT has_secret OR has_job,
    'document reconciliation is scheduled whenever the Vault secret is provisioned');
END
$test$;

DO $test$
DECLARE
  schedule_ok boolean := true;
BEGIN
  IF to_regclass('cron.job') IS NOT NULL THEN
    EXECUTE $query$
      SELECT NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = $1)
        OR EXISTS (SELECT 1 FROM cron.job WHERE jobname = $1 AND schedule = $2 AND active)
    $query$ INTO schedule_ok USING 'nuva-documents-reconciliation-15m', '*/15 * * * *';
  END IF;
  PERFORM ok(schedule_ok, 'the Supabase reconciliation fallback runs every 15 minutes');
END
$test$;

DO $test$
DECLARE
  command_ok boolean := true;
BEGIN
  IF to_regclass('cron.job') IS NOT NULL THEN
    EXECUTE $query$
      SELECT NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = $1)
        OR EXISTS (SELECT 1 FROM cron.job WHERE jobname = $1
          AND command LIKE $2 AND command LIKE $3)
    $query$ INTO command_ok USING
      'nuva-documents-reconciliation-15m',
      '%nuva_documents_cron_secret%',
      '%/api/cron/nuva-documents-reconciliation%';
  END IF;
  PERFORM ok(command_ok,
    'the scheduled command reads its bearer secret from Vault and calls the protected endpoint');
END
$test$;

DO $test$
DECLARE
  legacy_jobs_gone boolean := true;
BEGIN
  IF to_regclass('cron.job') IS NOT NULL THEN
    EXECUTE $query$
      SELECT NOT EXISTS (SELECT 1 FROM cron.job
        WHERE jobname IN ($1, $2))
    $query$ INTO legacy_jobs_gone USING
      'nuva-quotes-followup-daily', 'nuva-check-overdue-daily';
  END IF;
  PERFORM ok(legacy_jobs_gone,
    'obsolete quote and overdue cron jobs targeting missing routes are retired');
END
$test$;

SELECT * FROM finish();
ROLLBACK;
