-- ============================================================
-- Phase D3 — Facility scope on clinical rows via patient.facility_id
-- Apply after phase-d2-facility-rls.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.patient_facility_accessible(p_patient_id BIGINT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.current_user_role() = 'admin'
    OR NOT EXISTS (SELECT 1 FROM public.facility_memberships WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.patients p
      WHERE p.id = p_patient_id
        AND (
          p.facility_id IS NULL
          OR public.user_can_access_facility(p.facility_id)
        )
    );
$$;

-- Appointments
DROP POLICY IF EXISTS "Appointments staff read" ON public.appointments;
CREATE POLICY "Appointments staff read" ON public.appointments
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'doctor', 'nurse')
    AND public.patient_facility_accessible(patient_id)
  );

DROP POLICY IF EXISTS "Appointments staff write" ON public.appointments;
CREATE POLICY "Appointments staff write" ON public.appointments
  FOR ALL TO authenticated
  USING (
    public.current_user_role() IN ('admin', 'doctor', 'nurse')
    AND public.patient_facility_accessible(patient_id)
  )
  WITH CHECK (
    public.current_user_role() IN ('admin', 'doctor', 'nurse')
    AND public.patient_facility_accessible(patient_id)
  );

-- Lab tests (if table exists from earlier phases)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lab_tests') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Lab staff read" ON public.lab_tests';
    EXECUTE $p$
      CREATE POLICY "Lab staff read" ON public.lab_tests
        FOR SELECT TO authenticated
        USING (
          public.current_user_role() IN ('admin', 'doctor', 'nurse')
          AND public.patient_facility_accessible(patient_id)
        )
    $p$;
    EXECUTE 'DROP POLICY IF EXISTS "Lab staff write" ON public.lab_tests';
    EXECUTE $p$
      CREATE POLICY "Lab staff write" ON public.lab_tests
        FOR ALL TO authenticated
        USING (
          public.current_user_role() IN ('admin', 'doctor', 'nurse')
          AND public.patient_facility_accessible(patient_id)
        )
        WITH CHECK (
          public.current_user_role() IN ('admin', 'doctor', 'nurse')
          AND public.patient_facility_accessible(patient_id)
        )
    $p$;
  END IF;
END $$;

-- Invoices
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Invoices staff read" ON public.invoices';
    EXECUTE $p$
      CREATE POLICY "Invoices staff read" ON public.invoices
        FOR SELECT TO authenticated
        USING (
          public.current_user_role() IN ('admin', 'doctor', 'nurse')
          AND public.patient_facility_accessible(patient_id)
        )
    $p$;
  END IF;
END $$;

-- Clinical orders
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clinical_orders') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Orders staff read" ON public.clinical_orders';
    EXECUTE 'DROP POLICY IF EXISTS "Clinical orders staff read" ON public.clinical_orders';
    EXECUTE $p$
      CREATE POLICY "Clinical orders staff facility read" ON public.clinical_orders
        FOR SELECT TO authenticated
        USING (
          public.current_user_role() IN ('admin', 'doctor', 'nurse')
          AND public.patient_facility_accessible(patient_id)
        )
    $p$;
  END IF;
END $$;

COMMENT ON FUNCTION public.patient_facility_accessible(BIGINT) IS 'Phase D3: row access via patient facility membership';
