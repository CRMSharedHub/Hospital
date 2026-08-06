-- ============================================================
-- Phase B2 — Vitals + Problem List
-- Safe to re-run. Apply after phase-b1-adt.sql (recommended).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.vital_signs (
  id BIGSERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  admission_id BIGINT REFERENCES public.admissions(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by TEXT,
  temperature_c NUMERIC(4,1),
  heart_rate INTEGER,
  respiratory_rate INTEGER,
  systolic_bp INTEGER,
  diastolic_bp INTEGER,
  spo2 INTEGER,
  weight_kg NUMERIC(5,1),
  height_cm NUMERIC(5,1),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vital_signs_patient ON public.vital_signs(patient_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_recorded ON public.vital_signs(recorded_at DESC);

CREATE TABLE IF NOT EXISTS public.problems (
  id BIGSERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  code TEXT,
  display TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'resolved', 'inactive')),
  severity TEXT CHECK (severity IS NULL OR severity IN ('mild', 'moderate', 'severe')),
  onset_date DATE,
  resolved_date DATE,
  notes TEXT,
  recorded_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_problems_patient ON public.problems(patient_id);
CREATE INDEX IF NOT EXISTS idx_problems_status ON public.problems(status);

DROP TRIGGER IF EXISTS set_updated_at_problems ON public.problems;
CREATE TRIGGER set_updated_at_problems
  BEFORE UPDATE ON public.problems
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.vital_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vitals staff read" ON public.vital_signs;
DROP POLICY IF EXISTS "Vitals patient read" ON public.vital_signs;
DROP POLICY IF EXISTS "Vitals staff write" ON public.vital_signs;
CREATE POLICY "Vitals staff read" ON public.vital_signs
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'));
CREATE POLICY "Vitals patient read" ON public.vital_signs
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'patient'
    AND patient_id = public.current_user_patient_id()
  );
CREATE POLICY "Vitals staff write" ON public.vital_signs
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'))
  WITH CHECK (public.current_user_role() IN ('admin', 'doctor', 'nurse'));

DROP POLICY IF EXISTS "Problems staff read" ON public.problems;
DROP POLICY IF EXISTS "Problems patient read" ON public.problems;
DROP POLICY IF EXISTS "Problems staff write" ON public.problems;
CREATE POLICY "Problems staff read" ON public.problems
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'));
CREATE POLICY "Problems patient read" ON public.problems
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'patient'
    AND patient_id = public.current_user_patient_id()
  );
CREATE POLICY "Problems staff write" ON public.problems
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'))
  WITH CHECK (public.current_user_role() IN ('admin', 'doctor', 'nurse'));

-- Demo seed (idempotent: only if empty for patient 103)
INSERT INTO public.vital_signs (
  patient_id, recorded_at, recorded_by,
  temperature_c, heart_rate, respiratory_rate, systolic_bp, diastolic_bp, spo2, notes
)
SELECT 103, now() - interval '2 hours', 'Nurse Demo',
  37.2, 88, 18, 128, 82, 97, 'Admission baseline'
WHERE EXISTS (SELECT 1 FROM public.patients WHERE id = 103)
  AND NOT EXISTS (SELECT 1 FROM public.vital_signs WHERE patient_id = 103);

INSERT INTO public.problems (patient_id, code, display, status, severity, onset_date, recorded_by)
SELECT 103, 'E11.9', 'Type 2 diabetes mellitus', 'active', 'moderate', CURRENT_DATE - 365, 'Dr Demo'
WHERE EXISTS (SELECT 1 FROM public.patients WHERE id = 103)
  AND NOT EXISTS (SELECT 1 FROM public.problems WHERE patient_id = 103 AND code = 'E11.9');
