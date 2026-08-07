-- ============================================================
-- Hospital Management System — Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── Users (extends auth.users) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('admin', 'doctor', 'nurse', 'patient')),
  avatar TEXT,
  linked_patient_id INTEGER REFERENCES public.patients(id) ON DELETE SET NULL,
  linked_doctor_id INTEGER REFERENCES public.doctors(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on signup (role is ALWAYS patient — admins promote via dashboard)
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Patients ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.patients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  phone TEXT NOT NULL,
  condition TEXT NOT NULL,
  last_visit TEXT NOT NULL,
  blood_type TEXT DEFAULT 'Unknown',
  allergies JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Doctors ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.doctors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  available BOOLEAN DEFAULT true,
  patients INTEGER DEFAULT 0,
  rating NUMERIC(2,1) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Appointments ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.appointments (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id INTEGER REFERENCES public.doctors(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  doctor_name TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('confirmed', 'pending', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Clinical Visits (EHR) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.visits (
  id TEXT PRIMARY KEY,
  patient_id INTEGER REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id INTEGER REFERENCES public.doctors(id) ON DELETE SET NULL,
  date TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Medications (EHR) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.medications (
  id TEXT PRIMARY KEY,
  patient_id INTEGER REFERENCES public.patients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Clinical Notes (EHR) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notes (
  id TEXT PRIMARY KEY,
  patient_id INTEGER REFERENCES public.patients(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Medical Files (EHR) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.medical_files (
  id TEXT PRIMARY KEY,
  patient_id INTEGER REFERENCES public.patients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  date TEXT NOT NULL,
  size INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Invoices (Billing) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invoices (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  date TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'partial')),
  paid_amount NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Medicines (Pharmacy) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.medicines (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  stock INTEGER DEFAULT 0,
  unit_price NUMERIC(10,2) DEFAULT 0,
  expiry_date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Pharmacy Orders ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pharmacy_orders (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  medicine_id INTEGER REFERENCES public.medicines(id) ON DELETE CASCADE,
  medicine_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'dispensed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Lab Tests ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lab_tests (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  test_name TEXT NOT NULL,
  category TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ordered' CHECK (status IN ('ordered', 'in-progress', 'completed', 'cancelled')),
  result TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ── Audit Log ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
-- Policies created after current_user_role() helper below

-- ── updated_at trigger function ───────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Add updated_at columns ────────────────────────────────
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.doctors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.visits ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.medications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.medical_files ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.medicines ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.pharmacy_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.lab_tests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ── Create updated_at triggers ────────────────────────────
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'profiles', 'patients', 'doctors', 'appointments', 'visits',
    'medications', 'notes', 'medical_files', 'invoices',
    'medicines', 'pharmacy_orders', 'lab_tests'
  ])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
  END LOOP;
END $$;

-- ── Row Level Security ────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_tests ENABLE ROW LEVEL SECURITY;

-- ── Helper functions for RLS ──────────────────────────────
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'patient'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_user_patient_id()
RETURNS INTEGER AS $$
  SELECT linked_patient_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_user_doctor_id()
RETURNS INTEGER AS $$
  SELECT linked_doctor_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ── Audit log policies (after helpers) ────────────────────
CREATE POLICY "Admin read audit_log" ON public.audit_log FOR SELECT TO authenticated
  USING (public.current_user_role() = 'admin');
CREATE POLICY "Authenticated insert own audit_log" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- ── Profiles: self or admin ───────────────────────────────
CREATE POLICY "Profiles self read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles admin read all" ON public.profiles FOR SELECT TO authenticated USING (public.current_user_role() = 'admin');
CREATE POLICY "Profiles self update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id); -- role changes blocked by prevent_role_self_escalation trigger
CREATE POLICY "Profiles admin update all" ON public.profiles FOR UPDATE TO authenticated USING (public.current_user_role() = 'admin');

-- Prevent non-admins from changing their own role
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

-- ── Patients: staff see all, patient sees own record ──────
CREATE POLICY "Patients staff read" ON public.patients FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'));
CREATE POLICY "Patients self read" ON public.patients FOR SELECT TO authenticated
  USING (id = public.current_user_patient_id());
CREATE POLICY "Patients staff insert" ON public.patients FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('admin', 'doctor', 'nurse'));
CREATE POLICY "Patients staff update" ON public.patients FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'));
CREATE POLICY "Patients admin delete" ON public.patients FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

-- ── Doctors: staff read all, patient reads assigned doctor ─
CREATE POLICY "Doctors staff read" ON public.doctors FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'));
CREATE POLICY "Doctors patient read" ON public.doctors FOR SELECT TO authenticated
  USING (public.current_user_role() = 'patient');
CREATE POLICY "Doctors admin write" ON public.doctors FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin');

-- ── Appointments: staff see all, patient sees own ─────────
CREATE POLICY "Appointments staff read" ON public.appointments FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'));
CREATE POLICY "Appointments patient read" ON public.appointments FOR SELECT TO authenticated
  USING (patient_id = public.current_user_patient_id());
CREATE POLICY "Appointments staff write" ON public.appointments FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'));

-- ── Visits: staff see all, patient sees own ───────────────
CREATE POLICY "Visits staff read" ON public.visits FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'));
CREATE POLICY "Visits patient read" ON public.visits FOR SELECT TO authenticated
  USING (patient_id = public.current_user_patient_id());
CREATE POLICY "Visits doctor write" ON public.visits FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor'));

-- ── Medications: staff see all, patient sees own ──────────
CREATE POLICY "Medications staff read" ON public.medications FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'));
CREATE POLICY "Medications patient read" ON public.medications FOR SELECT TO authenticated
  USING (patient_id = public.current_user_patient_id());
CREATE POLICY "Medications doctor write" ON public.medications FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor'));

-- ── Notes: staff see all, patient sees own ────────────────
CREATE POLICY "Notes staff read" ON public.notes FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'));
CREATE POLICY "Notes patient read" ON public.notes FOR SELECT TO authenticated
  USING (patient_id = public.current_user_patient_id());
CREATE POLICY "Notes staff write" ON public.notes FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'));

-- ── Medical Files: staff see all, patient sees own ────────
CREATE POLICY "Files staff read" ON public.medical_files FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'));
CREATE POLICY "Files patient read" ON public.medical_files FOR SELECT TO authenticated
  USING (patient_id = public.current_user_patient_id());
CREATE POLICY "Files staff write" ON public.medical_files FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'));

-- ── Invoices: admin/billing see all, patient sees own ─────
CREATE POLICY "Invoices admin read" ON public.invoices FOR SELECT TO authenticated
  USING (public.current_user_role() = 'admin');
CREATE POLICY "Invoices patient read" ON public.invoices FOR SELECT TO authenticated
  USING (patient_id = public.current_user_patient_id());
CREATE POLICY "Invoices admin write" ON public.invoices FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin');

-- ── Medicines: staff see all, patient read ────────────────
CREATE POLICY "Medicines staff read" ON public.medicines FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'));
CREATE POLICY "Medicines patient read" ON public.medicines FOR SELECT TO authenticated
  USING (public.current_user_role() = 'patient');
CREATE POLICY "Medicines admin nurse write" ON public.medicines FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'nurse'));

-- ── Pharmacy Orders: staff see all, patient sees own ──────
CREATE POLICY "Pharmacy orders staff read" ON public.pharmacy_orders FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'));
CREATE POLICY "Pharmacy orders patient read" ON public.pharmacy_orders FOR SELECT TO authenticated
  USING (patient_id = public.current_user_patient_id());
CREATE POLICY "Pharmacy orders admin nurse write" ON public.pharmacy_orders FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'nurse'));

-- ── Lab Tests: staff see all, patient sees own ────────────
CREATE POLICY "Lab tests staff read" ON public.lab_tests FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'));
CREATE POLICY "Lab tests patient read" ON public.lab_tests FOR SELECT TO authenticated
  USING (patient_id = public.current_user_patient_id());
CREATE POLICY "Lab tests staff write" ON public.lab_tests FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'doctor', 'nurse'));

-- ── Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(date);
CREATE INDEX IF NOT EXISTS idx_visits_patient ON public.visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_medications_patient ON public.medications(patient_id);
CREATE INDEX IF NOT EXISTS idx_notes_patient ON public.notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_files_patient ON public.medical_files(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON public.invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_patient ON public.pharmacy_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_tests_patient ON public.lab_tests(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON public.audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at);

-- ── Storage Bucket for Medical Files (PRIVATE) ────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-files', 'medical-files', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Staff can read all objects; patients only their linked patient folder
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

-- Phase A: consent + retention — see supabase/phase-a-compliance.sql (apply on existing projects too)
-- Phase C1: payments + claims — see supabase/phase-c-payments.sql
-- Phase C2: remittances — see supabase/phase-c2-interop.sql

