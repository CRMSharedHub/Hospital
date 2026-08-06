-- ============================================================
-- Phase C3 — Remaining interop: patient messages + ERA audit note
-- Safe to re-run. Apply after phase-c2-interop.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.patient_messages (
  id BIGSERIAL PRIMARY KEY,
  patient_id BIGINT NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'doctor', 'nurse', 'patient')),
  sender_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_patient_messages_patient ON public.patient_messages(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_messages_created ON public.patient_messages(created_at DESC);

ALTER TABLE public.patient_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Messages staff all" ON public.patient_messages;
CREATE POLICY "Messages staff all" ON public.patient_messages
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'))
  WITH CHECK (public.current_user_role() IN ('admin', 'doctor', 'nurse'));

DROP POLICY IF EXISTS "Messages patient own" ON public.patient_messages;
CREATE POLICY "Messages patient own" ON public.patient_messages
  FOR ALL TO authenticated
  USING (
    public.current_user_role() = 'patient'
    AND patient_id = public.current_user_patient_id()
  )
  WITH CHECK (
    public.current_user_role() = 'patient'
    AND patient_id = public.current_user_patient_id()
    AND sender_role = 'patient'
  );

-- Optional: store last ERA import raw on remittances.notes already covers audit.
COMMENT ON TABLE public.patient_messages IS 'Phase C3 patient–staff messaging';
