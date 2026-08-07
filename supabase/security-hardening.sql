-- ============================================================
-- Security hardening migration (run on existing Supabase projects)
-- Safe to re-run: drops/replaces policies and functions.
-- ============================================================

-- 1) Signup cannot self-assign admin/doctor/nurse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'patient'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2) Block non-admin role changes
CREATE OR REPLACE FUNCTION public.prevent_role_self_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND public.current_user_role() <> 'admin' THEN
    RAISE EXCEPTION 'Only admin can change roles';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prevent_role_self_escalation ON public.profiles;
CREATE TRIGGER prevent_role_self_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_escalation();

-- 3) Audit log: admin read; insert only as self
DROP POLICY IF EXISTS "Authenticated read audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "Staff write audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "Admin read audit_log" ON public.audit_log;
DROP POLICY IF EXISTS "Authenticated insert own audit_log" ON public.audit_log;
CREATE POLICY "Admin read audit_log" ON public.audit_log FOR SELECT TO authenticated
  USING (public.current_user_role() = 'admin');
CREATE POLICY "Authenticated insert own audit_log" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 4) Patients: split write; delete = admin only
DROP POLICY IF EXISTS "Patients staff write" ON public.patients;
DROP POLICY IF EXISTS "Patients staff insert" ON public.patients;
DROP POLICY IF EXISTS "Patients staff update" ON public.patients;
DROP POLICY IF EXISTS "Patients admin delete" ON public.patients;
CREATE POLICY "Patients staff insert" ON public.patients FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('admin', 'doctor', 'nurse'));
CREATE POLICY "Patients staff update" ON public.patients FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'));
CREATE POLICY "Patients admin delete" ON public.patients FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

-- 5) Private medical-files bucket + path-scoped patient read
UPDATE storage.buckets SET public = false WHERE id = 'medical-files';

DROP POLICY IF EXISTS "Authenticated read medical-files bucket" ON storage.objects;
DROP POLICY IF EXISTS "Staff read medical-files bucket" ON storage.objects;
DROP POLICY IF EXISTS "Patient read own medical-files bucket" ON storage.objects;
DROP POLICY IF EXISTS "Staff write medical-files bucket" ON storage.objects;
DROP POLICY IF EXISTS "Staff delete medical-files bucket" ON storage.objects;

CREATE POLICY "Staff read medical-files bucket" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'medical-files' AND
    public.current_user_role() IN ('admin', 'doctor', 'nurse')
  );

CREATE POLICY "Patient read own medical-files bucket" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'medical-files' AND
    public.current_user_role() = 'patient' AND
    (storage.foldername(name))[1] = public.current_user_patient_id()::text
  );

CREATE POLICY "Staff write medical-files bucket" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'medical-files' AND
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'doctor', 'nurse'))
  );

CREATE POLICY "Staff delete medical-files bucket" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'medical-files' AND
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'doctor', 'nurse'))
  );
