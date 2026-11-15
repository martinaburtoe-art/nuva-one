BEGIN;
SELECT plan(4);

SELECT ok(
  NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'nuva_documents_cron_secret')
  OR EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'nuva-documents-reconciliation-15m'),
  'document reconciliation is scheduled whenever the Vault secret is provisioned'
);

SELECT ok(
  NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'nuva-documents-reconciliation-15m')
  OR EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'nuva-documents-reconciliation-15m'
      AND schedule = '*/15 * * * *'
      AND active
  ),
  'the Supabase reconciliation fallback runs every 15 minutes'
);

SELECT ok(
  NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'nuva-documents-reconciliation-15m')
  OR EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname = 'nuva-documents-reconciliation-15m'
      AND command LIKE '%nuva_documents_cron_secret%'
      AND command LIKE '%/api/cron/nuva-documents-reconciliation%'
  ),
  'the scheduled command reads its bearer secret from Vault and calls the protected reconciliation endpoint'
);


SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM cron.job
    WHERE jobname IN ('nuva-quotes-followup-daily', 'nuva-check-overdue-daily')
  ),
  'obsolete quote and overdue cron jobs targeting missing routes are retired'
);

SELECT * FROM finish();
ROLLBACK;
