-- ============================================================
-- Phase A add-on — schedule retention purge via pg_cron
-- Requires: pg_cron enabled (Supabase Pro+) + phase-a-compliance.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
BEGIN
  -- Remove previous schedule if present
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dynex360-retention-purge') THEN
    PERFORM cron.unschedule('dynex360-retention-purge');
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'purge_expired_records'
  ) THEN
    PERFORM cron.schedule(
      'dynex360-retention-purge',
      '15 2 * * *',
      $cron$SELECT public.purge_expired_records('pg_cron');$cron$
    );
    RAISE NOTICE 'Scheduled dynex360-retention-purge daily 02:15 UTC';
  ELSE
    RAISE NOTICE 'purge_expired_records() missing — apply phase-a-compliance.sql first';
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'cron.job unavailable — enable pg_cron (Database → Extensions) on Pro+';
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron schedule skipped: %', SQLERRM;
END $$;
