-- ============================================================
-- Phase A compliance (run on Supabase SQL editor after schema)
-- Consent records (server-side) + retention purge helpers
-- Safe to re-run.
-- ============================================================

-- ── Consent records ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL
    CHECK (consent_type IN ('data_processing', 'marketing', 'analytics', 'third_party_share')),
  granted BOOLEAN NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, consent_type)
);

CREATE INDEX IF NOT EXISTS idx_consent_records_user ON public.consent_records(user_id);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Consent select own or admin" ON public.consent_records;
DROP POLICY IF EXISTS "Consent insert own" ON public.consent_records;
DROP POLICY IF EXISTS "Consent update own" ON public.consent_records;

CREATE POLICY "Consent select own or admin" ON public.consent_records
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_role() = 'admin');

CREATE POLICY "Consent insert own" ON public.consent_records
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Consent update own" ON public.consent_records
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Retention purge audit ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.retention_purge_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  rows_deleted INTEGER NOT NULL DEFAULT 0,
  cutoff TIMESTAMPTZ NOT NULL,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ran_by TEXT
);

ALTER TABLE public.retention_purge_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read retention_purge_log" ON public.retention_purge_log;
CREATE POLICY "Admin read retention_purge_log" ON public.retention_purge_log
  FOR SELECT TO authenticated
  USING (public.current_user_role() = 'admin');

-- ── Purge function (SECURITY DEFINER — call via Edge / cron only) ─
-- Clinical tables (visits, notes, meds, lab, invoices, audit) keep 7y;
-- this job only removes operational rows past policy windows.
CREATE OR REPLACE FUNCTION public.purge_expired_records(p_ran_by TEXT DEFAULT 'system')
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appt INTEGER := 0;
  v_pharm INTEGER := 0;
  v_cutoff_appt TIMESTAMPTZ := now() - INTERVAL '2 years';
  v_cutoff_pharm TIMESTAMPTZ := now() - INTERVAL '3 years';
BEGIN
  -- Completed/cancelled appointments older than 2 years
  DELETE FROM public.appointments
  WHERE status IN ('completed', 'cancelled')
    AND COALESCE(updated_at, created_at) < v_cutoff_appt;
  GET DIAGNOSTICS v_appt = ROW_COUNT;

  INSERT INTO public.retention_purge_log (table_name, rows_deleted, cutoff, ran_by)
  VALUES ('appointments', v_appt, v_cutoff_appt, p_ran_by);

  -- Pharmacy orders older than 3 years
  DELETE FROM public.pharmacy_orders
  WHERE COALESCE(updated_at, created_at) < v_cutoff_pharm;
  GET DIAGNOSTICS v_pharm = ROW_COUNT;

  INSERT INTO public.retention_purge_log (table_name, rows_deleted, cutoff, ran_by)
  VALUES ('pharmacy_orders', v_pharm, v_cutoff_pharm, p_ran_by);

  INSERT INTO public.audit_log (user_id, user_name, action, table_name, record_id, details)
  VALUES (
    NULL,
    p_ran_by,
    'retention_purge',
    'system',
    NULL,
    jsonb_build_object(
      'appointments', v_appt,
      'pharmacy_orders', v_pharm,
      'ran_by', p_ran_by
    )
  );

  RETURN jsonb_build_object(
    'ok', true,
    'appointments_deleted', v_appt,
    'pharmacy_orders_deleted', v_pharm,
    'cutoff_appointments', v_cutoff_appt,
    'cutoff_pharmacy_orders', v_cutoff_pharm
  );
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_records(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_expired_records(TEXT) TO service_role;
