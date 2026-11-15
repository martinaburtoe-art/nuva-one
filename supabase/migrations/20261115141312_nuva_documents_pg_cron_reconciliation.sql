-- Schedule invoice-payment reconciliation from Supabase itself.
-- This avoids depending on Inngest for the payment safety-net job.
-- The job is only registered when the production bearer secret exists in Vault;
-- local/CI databases without that secret remain inert.

DO $migration$
BEGIN
  IF to_regclass('cron.job') IS NULL THEN
    RAISE NOTICE 'pg_cron is unavailable; skipping document cron maintenance.';
    RETURN;
  END IF;

  -- Retire legacy jobs whose production routes now return HTTP 404.
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname IN ('nuva-quotes-followup-daily', 'nuva-check-overdue-daily');

  IF to_regclass('vault.secrets') IS NULL
     OR to_regclass('vault.decrypted_secrets') IS NULL
     OR to_regprocedure('net.http_get(text,jsonb,jsonb,integer)') IS NULL THEN
    RAISE NOTICE 'Vault or pg_net is unavailable; skipping document reconciliation schedule.';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM vault.secrets WHERE name = 'nuva_documents_cron_secret'
  ) THEN
    RAISE NOTICE 'nuva_documents_cron_secret is not present; skipping document reconciliation schedule.';
    RETURN;
  END IF;

  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'nuva-documents-reconciliation-15m';

  PERFORM cron.schedule(
    'nuva-documents-reconciliation-15m',
    '*/15 * * * *',
    $command$
      SELECT net.http_get(
        url := 'https://nuva-one.vercel.app/api/cron/nuva-documents-reconciliation',
        headers := jsonb_build_object(
          'Authorization',
          'Bearer ' || (
            SELECT decrypted_secret
            FROM vault.decrypted_secrets
            WHERE name = 'nuva_documents_cron_secret'
          )
        ),
        timeout_milliseconds := 30000
      );
    $command$
  );
END
$migration$;
