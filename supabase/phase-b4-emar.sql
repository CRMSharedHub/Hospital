-- ============================================================
-- Phase B4 — eMAR (medication administration record)
-- Safe to re-run. Apply after phase-b3-cpoe.sql.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.medication_administrations (
  id BIGSERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  medicine_name TEXT NOT NULL,
  dose TEXT NOT NULL,
  route TEXT DEFAULT 'oral',
  scheduled_at TIMESTAMPTZ NOT NULL,
  administered_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'given', 'held', 'refused', 'missed')),
  administered_by TEXT,
  notes TEXT,
  clinical_order_id BIGINT REFERENCES public.clinical_orders(id) ON DELETE SET NULL,
  pharmacy_order_id INTEGER REFERENCES public.pharmacy_orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mar_patient ON public.medication_administrations(patient_id);
CREATE INDEX IF NOT EXISTS idx_mar_status ON public.medication_administrations(status);
CREATE INDEX IF NOT EXISTS idx_mar_scheduled ON public.medication_administrations(scheduled_at);

DROP TRIGGER IF EXISTS set_updated_at_mar ON public.medication_administrations;
CREATE TRIGGER set_updated_at_mar
  BEFORE UPDATE ON public.medication_administrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.medication_administrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "MAR staff read" ON public.medication_administrations;
DROP POLICY IF EXISTS "MAR patient read" ON public.medication_administrations;
DROP POLICY IF EXISTS "MAR staff write" ON public.medication_administrations;
CREATE POLICY "MAR staff read" ON public.medication_administrations
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'));
CREATE POLICY "MAR patient read" ON public.medication_administrations
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'patient'
    AND patient_id = public.current_user_patient_id()
  );
CREATE POLICY "MAR staff write" ON public.medication_administrations
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'))
  WITH CHECK (public.current_user_role() IN ('admin', 'doctor', 'nurse'));

INSERT INTO public.medication_administrations (
  patient_id, patient_name, medicine_name, dose, route, scheduled_at, status
)
SELECT 103, 'Khalid Al-Rashid', 'Metformin 500mg', '500 mg', 'oral',
  now() + interval '1 hour', 'scheduled'
WHERE EXISTS (SELECT 1 FROM public.patients WHERE id = 103)
  AND NOT EXISTS (
    SELECT 1 FROM public.medication_administrations
    WHERE patient_id = 103 AND medicine_name = 'Metformin 500mg' AND status = 'scheduled'
  );
