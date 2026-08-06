-- ============================================================
-- Hospital Management System — Supabase Seed Data
-- Run this AFTER schema.sql in Supabase SQL Editor
-- ============================================================

-- ── Demo Users (create via Supabase Auth, then set roles) ──
-- After creating users in Supabase Auth, run:
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@cityhospital.com';
-- UPDATE profiles SET role = 'doctor' WHERE email = 'doctor@cityhospital.com';
-- UPDATE profiles SET role = 'nurse' WHERE email = 'nurse@cityhospital.com';
-- UPDATE profiles SET role = 'patient' WHERE email = 'patient@cityhospital.com';

-- ── Patients ──────────────────────────────────────────────
INSERT INTO public.patients (id, name, age, phone, condition, last_visit, blood_type, allergies) VALUES
  (101, 'أحمد محمد', 34, '+966 50 123 4567', 'Hypertension', '2026-06-12', 'A+', '["Penicillin"]'::jsonb),
  (102, 'Laila Hassan', 28, '+966 55 987 6543', 'Routine Checkup', '2026-07-01', 'O-', '[]'::jsonb),
  (103, 'Khalid Al-Rashid', 45, '+966 54 555 1212', 'Diabetes Follow-up', '2026-07-10', 'B+', '["Sulfa drugs"]'::jsonb),
  (104, 'Noor Abdullah', 22, '+966 56 777 8888', 'Allergy Test', '2026-05-20', 'AB+', '["Pollen"]'::jsonb),
  (105, 'Hana Saeed', 56, '+966 50 333 4444', 'Cardiology', '2026-07-15', 'O+', '[]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ── Doctors ───────────────────────────────────────────────
INSERT INTO public.doctors (id, name, specialty, available, patients, rating) VALUES
  (1, 'د. سارة القحطاني', 'Cardiology', true, 120, 4.9),
  (2, 'Dr. Omar Saleh', 'Pediatrics', true, 95, 4.8),
  (3, 'Dr. Fatima Noor', 'Dermatology', false, 80, 4.7),
  (4, 'Dr. Yasser Hamdi', 'Orthopedics', true, 110, 4.9),
  (5, 'Dr. Mona Khalil', 'Neurology', true, 70, 4.8),
  (6, 'Dr. Hassan Turki', 'General Surgery', false, 60, 4.6)
ON CONFLICT (id) DO NOTHING;

-- ── Appointments ──────────────────────────────────────────
INSERT INTO public.appointments (id, patient_id, doctor_id, patient_name, doctor_name, date, time, status) VALUES
  (1, 101, 1, 'أحمد محمد', 'د. سارة القحطاني', '2026-07-18', '09:00', 'confirmed'),
  (2, 102, 2, 'Laila Hassan', 'Dr. Omar Saleh', '2026-07-18', '10:30', 'pending'),
  (3, 103, 3, 'Khalid Al-Rashid', 'Dr. Fatima Noor', '2026-07-18', '11:00', 'completed'),
  (4, 104, 4, 'Noor Abdullah', 'Dr. Yasser Hamdi', '2026-07-18', '13:15', 'cancelled'),
  (5, 105, 5, 'Hana Saeed', 'Dr. Mona Khalil', '2026-07-18', '14:45', 'confirmed')
ON CONFLICT (id) DO NOTHING;

-- ── Clinical Visits ───────────────────────────────────────
INSERT INTO public.visits (id, patient_id, doctor_id, date, title, notes) VALUES
  ('v-101-1', 101, 1, '2026-06-12', 'Hypertension checkup', 'Blood pressure stable on current medication.'),
  ('v-101-2', 101, 2, '2026-03-05', 'Routine blood test', 'Cholesterol slightly elevated.'),
  ('v-102-1', 102, 3, '2026-07-01', 'Routine Checkup', 'Healthy, no issues found.'),
  ('v-103-1', 103, 4, '2026-07-10', 'Diabetes Follow-up', 'HbA1c improved to 6.8%.'),
  ('v-103-2', 103, 4, '2026-04-12', 'Diabetes screening', 'Diagnosed Type 2 diabetes.'),
  ('v-104-1', 104, 5, '2026-05-20', 'Allergy Test', 'Positive for pollen allergy.'),
  ('v-105-1', 105, 1, '2026-07-15', 'Cardiology review', 'ECG normal, continue follow-up.')
ON CONFLICT (id) DO NOTHING;

-- ── Medications ───────────────────────────────────────────
INSERT INTO public.medications (id, patient_id, name, dosage, start_date) VALUES
  ('m-101-1', 101, 'Amlodipine 5mg', 'Once daily', '2026-01-10'),
  ('m-103-1', 103, 'Metformin 500mg', 'Twice daily', '2026-04-15'),
  ('m-104-1', 104, 'Cetirizine 10mg', 'As needed', '2026-05-20'),
  ('m-105-1', 105, 'Atorvastatin 20mg', 'Once nightly', '2026-06-01')
ON CONFLICT (id) DO NOTHING;

-- ── Clinical Notes ────────────────────────────────────────
INSERT INTO public.notes (id, patient_id, date, text) VALUES
  ('n-101-1', 101, '2026-06-12', 'Patient advised to reduce sodium intake and exercise regularly.'),
  ('n-102-1', 102, '2026-07-01', 'Annual physical completed; follow-up in one year.'),
  ('n-103-1', 103, '2026-07-10', 'Diet plan reinforced; continue exercise regimen.'),
  ('n-104-1', 104, '2026-05-20', 'Avoid outdoor activities during high pollen season.'),
  ('n-105-1', 105, '2026-07-15', 'Schedule stress test next visit.')
ON CONFLICT (id) DO NOTHING;

-- ── Medical Files ─────────────────────────────────────────
INSERT INTO public.medical_files (id, patient_id, name, url, date, size) VALUES
  ('f-101-1', 101, 'Blood_Test_March_2026.pdf', '#', '2026-03-05', 1024),
  ('f-103-1', 103, 'HbA1c_Report_Apr2026.pdf', '#', '2026-04-12', 1024),
  ('f-104-1', 104, 'Allergy_Test_Result.pdf', '#', '2026-05-20', 1024),
  ('f-105-1', 105, 'ECG_July2026.pdf', '#', '2026-07-15', 1024)
ON CONFLICT (id) DO NOTHING;

-- ── Invoices ──────────────────────────────────────────────
INSERT INTO public.invoices (id, patient_id, patient_name, date, items, status, paid_amount) VALUES
  (1, 101, 'أحمد محمد', '2026-07-18', '[{"description":"Cardiology Consultation","quantity":1,"unitPrice":300},{"description":"ECG Test","quantity":1,"unitPrice":150}]'::jsonb, 'paid', 450),
  (2, 102, 'Laila Hassan', '2026-07-18', '[{"description":"Routine Checkup","quantity":1,"unitPrice":200}]'::jsonb, 'unpaid', 0),
  (3, 103, 'Khalid Al-Rashid', '2026-07-10', '[{"description":"Diabetes Follow-up","quantity":1,"unitPrice":250},{"description":"HbA1c Lab Test","quantity":1,"unitPrice":120},{"description":"Metformin 500mg (60 tabs)","quantity":1,"unitPrice":45}]'::jsonb, 'partial', 200),
  (4, 105, 'Hana Saeed', '2026-07-15', '[{"description":"Cardiology Review","quantity":1,"unitPrice":300},{"description":"ECG Test","quantity":1,"unitPrice":150},{"description":"Stress Test","quantity":1,"unitPrice":400}]'::jsonb, 'unpaid', 0)
ON CONFLICT (id) DO NOTHING;

-- ── Medicines ─────────────────────────────────────────────
INSERT INTO public.medicines (id, name, category, stock, unit_price, expiry_date) VALUES
  (1, 'Amlodipine 5mg', 'Cardiology', 480, 0.5, '2027-06-30'),
  (2, 'Metformin 500mg', 'Diabetes', 1200, 0.3, '2027-03-15'),
  (3, 'Atorvastatin 20mg', 'Cardiology', 350, 0.8, '2027-01-20'),
  (4, 'Cetirizine 10mg', 'Allergy', 60, 0.4, '2026-12-10'),
  (5, 'Paracetamol 500mg', 'Analgesic', 2000, 0.1, '2028-05-01'),
  (6, 'Amoxicillin 500mg', 'Antibiotic', 0, 0.6, '2027-09-30'),
  (7, 'Omeprazole 20mg', 'Gastro', 180, 0.5, '2027-04-15'),
  (8, 'Insulin Glargine', 'Diabetes', 90, 15, '2026-11-30')
ON CONFLICT (id) DO NOTHING;

-- ── Pharmacy Orders ───────────────────────────────────────
INSERT INTO public.pharmacy_orders (id, patient_id, patient_name, medicine_id, medicine_name, quantity, date, status) VALUES
  (1, 101, 'أحمد محمد', 1, 'Amlodipine 5mg', 30, '2026-07-18', 'dispensed'),
  (2, 103, 'Khalid Al-Rashid', 2, 'Metformin 500mg', 60, '2026-07-10', 'dispensed'),
  (3, 104, 'Noor Abdullah', 4, 'Cetirizine 10mg', 20, '2026-07-18', 'pending'),
  (4, 105, 'Hana Saeed', 3, 'Atorvastatin 20mg', 30, '2026-07-15', 'pending')
ON CONFLICT (id) DO NOTHING;

-- ── Lab Tests ─────────────────────────────────────────────
INSERT INTO public.lab_tests (id, patient_id, patient_name, test_name, category, date, status, result) VALUES
  (1, 101, 'أحمد محمد', 'Lipid Panel', 'Cardiology', '2026-07-18', 'completed', 'Cholesterol 210 mg/dL, LDL 130 mg/dL, HDL 45 mg/dL'),
  (2, 102, 'Laila Hassan', 'Complete Blood Count', 'Hematology', '2026-07-18', 'in-progress', NULL),
  (3, 103, 'Khalid Al-Rashid', 'HbA1c', 'Diabetes', '2026-07-10', 'completed', 'HbA1c 6.8% (Normal < 5.7%)'),
  (4, 104, 'Noor Abdullah', 'Allergy Panel (IgE)', 'Immunology', '2026-07-18', 'ordered', NULL),
  (5, 105, 'Hana Saeed', 'ECG', 'Cardiology', '2026-07-15', 'completed', 'Normal sinus rhythm, no abnormalities detected'),
  (6, 105, 'Hana Saeed', 'Stress Test', 'Cardiology', '2026-07-18', 'ordered', NULL)
ON CONFLICT (id) DO NOTHING;

-- Reset sequences after explicit ID inserts
SELECT setval('patients_id_seq', (SELECT MAX(id) FROM public.patients));
SELECT setval('doctors_id_seq', (SELECT MAX(id) FROM public.doctors));
SELECT setval('appointments_id_seq', (SELECT MAX(id) FROM public.appointments));
SELECT setval('invoices_id_seq', (SELECT MAX(id) FROM public.invoices));
SELECT setval('medicines_id_seq', (SELECT MAX(id) FROM public.medicines));
SELECT setval('pharmacy_orders_id_seq', (SELECT MAX(id) FROM public.pharmacy_orders));
SELECT setval('lab_tests_id_seq', (SELECT MAX(id) FROM public.lab_tests));
