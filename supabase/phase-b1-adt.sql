-- ============================================================
-- Phase B1 — ADT: wards, beds, admissions
-- Safe to re-run. Apply after Phase C SQL if present.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.wards (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  floor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.beds (
  id SERIAL PRIMARY KEY,
  ward_id INTEGER NOT NULL REFERENCES public.wards(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'occupied', 'cleaning', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ward_id, label)
);

CREATE INDEX IF NOT EXISTS idx_beds_ward ON public.beds(ward_id);
CREATE INDEX IF NOT EXISTS idx_beds_status ON public.beds(status);

CREATE TABLE IF NOT EXISTS public.admissions (
  id BIGSERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES public.patients(id) ON DELETE RESTRICT,
  patient_name TEXT NOT NULL,
  bed_id INTEGER NOT NULL REFERENCES public.beds(id) ON DELETE RESTRICT,
  ward_id INTEGER NOT NULL REFERENCES public.wards(id) ON DELETE RESTRICT,
  attending_doctor_id INTEGER REFERENCES public.doctors(id) ON DELETE SET NULL,
  attending_doctor_name TEXT,
  status TEXT NOT NULL DEFAULT 'admitted'
    CHECK (status IN ('admitted', 'discharged')),
  admit_reason TEXT,
  admitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  discharged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admissions_patient ON public.admissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_admissions_bed ON public.admissions(bed_id);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON public.admissions(status);

-- At most one active admission per patient
CREATE UNIQUE INDEX IF NOT EXISTS idx_admissions_one_active_patient
  ON public.admissions(patient_id)
  WHERE status = 'admitted';

-- At most one active admission per bed
CREATE UNIQUE INDEX IF NOT EXISTS idx_admissions_one_active_bed
  ON public.admissions(bed_id)
  WHERE status = 'admitted';

DROP TRIGGER IF EXISTS set_updated_at_admissions ON public.admissions;
CREATE TRIGGER set_updated_at_admissions
  BEFORE UPDATE ON public.admissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Wards staff read" ON public.wards;
DROP POLICY IF EXISTS "Wards admin write" ON public.wards;
CREATE POLICY "Wards staff read" ON public.wards
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'));
CREATE POLICY "Wards admin write" ON public.wards
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "Beds staff read" ON public.beds;
DROP POLICY IF EXISTS "Beds staff write" ON public.beds;
CREATE POLICY "Beds staff read" ON public.beds
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'));
CREATE POLICY "Beds staff write" ON public.beds
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'))
  WITH CHECK (public.current_user_role() IN ('admin', 'doctor', 'nurse'));

DROP POLICY IF EXISTS "Admissions staff read" ON public.admissions;
DROP POLICY IF EXISTS "Admissions staff write" ON public.admissions;
CREATE POLICY "Admissions staff read" ON public.admissions
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'));
CREATE POLICY "Admissions staff write" ON public.admissions
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'))
  WITH CHECK (public.current_user_role() IN ('admin', 'doctor', 'nurse'));

-- Seed demo wards/beds (idempotent by code)
INSERT INTO public.wards (code, name, floor)
VALUES
  ('MED-A', 'Medical Ward A', '2'),
  ('SUR-B', 'Surgical Ward B', '3'),
  ('ICU', 'Intensive Care', '4')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.beds (ward_id, label, status)
SELECT w.id, b.label, 'available'
FROM public.wards w
CROSS JOIN (VALUES ('1'), ('2'), ('3'), ('4')) AS b(label)
WHERE w.code IN ('MED-A', 'SUR-B', 'ICU')
  AND NOT EXISTS (
    SELECT 1 FROM public.beds x WHERE x.ward_id = w.id AND x.label = b.label
  );
