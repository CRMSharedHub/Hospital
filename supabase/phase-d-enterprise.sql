-- ============================================================
-- Phase D — Enterprise: facilities, memberships, SCIM audit
-- Safe to re-run. Apply after phase-c3-remaining.sql (or after B4).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.facilities (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  city TEXT,
  timezone TEXT NOT NULL DEFAULT 'Asia/Riyadh',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.facility_memberships (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  facility_id BIGINT NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff'
    CHECK (role IN ('admin', 'doctor', 'nurse', 'staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, facility_id)
);

CREATE INDEX IF NOT EXISTS idx_facility_memberships_user ON public.facility_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_facility_memberships_facility ON public.facility_memberships(facility_id);

-- Scope patients to a facility (nullable = legacy / all-facility admin view)
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS facility_id BIGINT REFERENCES public.facilities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_patients_facility ON public.patients(facility_id);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_facility_id BIGINT REFERENCES public.facilities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_idp_sub TEXT,
  ADD COLUMN IF NOT EXISTS scim_external_id TEXT;

CREATE TABLE IF NOT EXISTS public.compliance_attestations (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'done', 'na')),
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_attestations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Facilities staff read" ON public.facilities;
CREATE POLICY "Facilities staff read" ON public.facilities
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse', 'patient'));

DROP POLICY IF EXISTS "Facilities admin write" ON public.facilities;
CREATE POLICY "Facilities admin write" ON public.facilities
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "Memberships admin all" ON public.facility_memberships;
CREATE POLICY "Memberships admin all" ON public.facility_memberships
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "Memberships self read" ON public.facility_memberships;
CREATE POLICY "Memberships self read" ON public.facility_memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "Compliance admin all" ON public.compliance_attestations;
CREATE POLICY "Compliance admin all" ON public.compliance_attestations
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

-- Seed demo facilities
INSERT INTO public.facilities (code, name, city, timezone)
VALUES
  ('MAIN', 'City Hospital — Main Campus', 'Riyadh', 'Asia/Riyadh'),
  ('NORTH', 'City Hospital — North Clinic', 'Riyadh', 'Asia/Riyadh')
ON CONFLICT (code) DO NOTHING;

-- Default compliance checklist
INSERT INTO public.compliance_attestations (key, label, status) VALUES
  ('baa_signed', 'Business Associate Agreement (BAA) signed with vendors', 'pending'),
  ('encryption_at_rest', 'PHI encryption at rest (KMS / Edge secrets)', 'in_progress'),
  ('encryption_in_transit', 'TLS everywhere (app, API, storage)', 'done'),
  ('access_control', 'RBAC + MFA for privileged roles', 'done'),
  ('audit_logging', 'Immutable audit log for PHI access', 'done'),
  ('retention_policy', 'Data retention & purge schedule active', 'in_progress'),
  ('breach_plan', 'Incident / breach response playbook', 'pending'),
  ('workforce_training', 'Workforce HIPAA/privacy training', 'pending'),
  ('dlp_exports', 'DLP redaction on exports / downloads', 'in_progress'),
  ('sso_scim', 'SSO + SCIM lifecycle for workforce accounts', 'pending')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE public.facilities IS 'Phase D multi-facility tenancy';
COMMENT ON TABLE public.compliance_attestations IS 'Phase D HIPAA/BAA checklist stubs';
