-- ============================================================
-- Phase D2 — Facility-scoped RLS helpers (automatable hardening)
-- Apply after phase-d-enterprise.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_user_facility_ids()
RETURNS SETOF BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT facility_id
  FROM public.facility_memberships
  WHERE user_id = auth.uid()
  UNION
  SELECT active_facility_id
  FROM public.profiles
  WHERE id = auth.uid() AND active_facility_id IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.user_can_access_facility(p_facility_id BIGINT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.current_user_role() = 'admin'
    OR p_facility_id IS NULL
    OR p_facility_id IN (SELECT public.current_user_facility_ids());
$$;

-- Tighten patients: staff still read all if no memberships; when memberships exist, scope by facility
DROP POLICY IF EXISTS "Patients staff read" ON public.patients;
CREATE POLICY "Patients staff read" ON public.patients
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'doctor', 'nurse')
    AND (
      public.current_user_role() = 'admin'
      OR NOT EXISTS (SELECT 1 FROM public.facility_memberships WHERE user_id = auth.uid())
      OR facility_id IS NULL
      OR public.user_can_access_facility(facility_id)
    )
  );

DROP POLICY IF EXISTS "Patients staff insert" ON public.patients;
CREATE POLICY "Patients staff insert" ON public.patients
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_role() IN ('admin', 'doctor', 'nurse')
    AND public.user_can_access_facility(facility_id)
  );

DROP POLICY IF EXISTS "Patients staff update" ON public.patients;
CREATE POLICY "Patients staff update" ON public.patients
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'doctor', 'nurse')
    AND public.user_can_access_facility(facility_id)
  )
  WITH CHECK (
    public.current_user_role() IN ('admin', 'doctor', 'nurse')
    AND public.user_can_access_facility(facility_id)
  );

COMMENT ON FUNCTION public.current_user_facility_ids() IS 'Phase D2: facilities the current user may access';
