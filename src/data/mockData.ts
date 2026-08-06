import type { Appointment, Patient, Invoice, Medicine, PharmacyOrder, LabTest } from '../types'

export interface SeedAppointment {
  id: number
  patient: string
  doctor: string
  date: string
  status: Appointment['status']
}

export type SeedPatient = Omit<Patient, 'bloodType' | 'allergies'>

export interface SeedDoctor {
  id: number
  name: string
  specialty: string
  available: boolean
  patients: number
  rating: number
}

export interface PatientRecord {
  bloodType: string
  allergies: string[]
  history: { date: string; title: string; doctor: string; notes: string }[]
  medications: { name: string; dosage: string; startDate: string }[]
  notes: { date: string; text: string }[]
  files: { name: string; date: string }[]
}

export const stats = [
  { id: 1, labelKey: 'todayAppointments', value: '42', trend: '+12%', icon: 'CalendarDays', color: 'bg-primary-500' },
  { id: 2, labelKey: 'totalPatients', value: '1,248', trend: '+5.4%', icon: 'Users', color: 'bg-accent-500' },
  { id: 3, labelKey: 'totalDoctors', value: '36', trend: '+2', icon: 'Stethoscope', color: 'bg-purple-500' },
  { id: 4, labelKey: 'monthlyRevenue', value: '$84,320', trend: '+8.1%', icon: 'DollarSign', color: 'bg-emerald-500' },
]

export const appointments: SeedAppointment[] = [
  { id: 1, patient: 'أحمد محمد', doctor: 'د. سارة القحطاني', date: '2026-07-18 09:00', status: 'confirmed' },
  { id: 2, patient: 'Laila Hassan', doctor: 'Dr. Omar Saleh', date: '2026-07-18 10:30', status: 'pending' },
  { id: 3, patient: 'Khalid Al-Rashid', doctor: 'Dr. Fatima Noor', date: '2026-07-18 11:00', status: 'completed' },
  { id: 4, patient: 'Noor Abdullah', doctor: 'Dr. Yasser Hamdi', date: '2026-07-18 13:15', status: 'cancelled' },
  { id: 5, patient: 'Hana Saeed', doctor: 'Dr. Mona Khalil', date: '2026-07-18 14:45', status: 'confirmed' },
]

export const patients: SeedPatient[] = [
  { id: 101, name: 'أحمد محمد', age: 34, phone: '+966 50 123 4567', lastVisit: '2026-06-12', condition: 'Hypertension' },
  { id: 102, name: 'Laila Hassan', age: 28, phone: '+966 55 987 6543', lastVisit: '2026-07-01', condition: 'Routine Checkup' },
  { id: 103, name: 'Khalid Al-Rashid', age: 45, phone: '+966 54 555 1212', lastVisit: '2026-07-10', condition: 'Diabetes Follow-up' },
  { id: 104, name: 'Noor Abdullah', age: 22, phone: '+966 56 777 8888', lastVisit: '2026-05-20', condition: 'Allergy Test' },
  { id: 105, name: 'Hana Saeed', age: 56, phone: '+966 50 333 4444', lastVisit: '2026-07-15', condition: 'Cardiology' },
]

export const doctors: SeedDoctor[] = [
  { id: 1, name: 'د. سارة القحطاني', specialty: 'Cardiology', available: true, patients: 120, rating: 4.9 },
  { id: 2, name: 'Dr. Omar Saleh', specialty: 'Pediatrics', available: true, patients: 95, rating: 4.8 },
  { id: 3, name: 'Dr. Fatima Noor', specialty: 'Dermatology', available: false, patients: 80, rating: 4.7 },
  { id: 4, name: 'Dr. Yasser Hamdi', specialty: 'Orthopedics', available: true, patients: 110, rating: 4.9 },
  { id: 5, name: 'Dr. Mona Khalil', specialty: 'Neurology', available: true, patients: 70, rating: 4.8 },
  { id: 6, name: 'Dr. Hassan Turki', specialty: 'General Surgery', available: false, patients: 60, rating: 4.6 },
]

export const patientRecords: Record<number, PatientRecord> = {
  101: {
    bloodType: 'A+',
    allergies: ['Penicillin'],
    history: [
      { date: '2026-06-12', title: 'Hypertension checkup', doctor: 'د. سارة القحطاني', notes: 'Blood pressure stable on current medication.' },
      { date: '2026-03-05', title: 'Routine blood test', doctor: 'Dr. Omar Saleh', notes: 'Cholesterol slightly elevated.' },
    ],
    medications: [
      { name: 'Amlodipine 5mg', dosage: 'Once daily', startDate: '2026-01-10' },
    ],
    notes: [
      { date: '2026-06-12', text: 'Patient advised to reduce sodium intake and exercise regularly.' },
    ],
    files: [
      { name: 'Blood_Test_March_2026.pdf', date: '2026-03-05' },
    ],
  },
  102: {
    bloodType: 'O-',
    allergies: [],
    history: [
      { date: '2026-07-01', title: 'Routine Checkup', doctor: 'Dr. Fatima Noor', notes: 'Healthy, no issues found.' },
    ],
    medications: [],
    notes: [
      { date: '2026-07-01', text: 'Annual physical completed; follow-up in one year.' },
    ],
    files: [],
  },
  103: {
    bloodType: 'B+',
    allergies: ['Sulfa drugs'],
    history: [
      { date: '2026-07-10', title: 'Diabetes Follow-up', doctor: 'Dr. Yasser Hamdi', notes: 'HbA1c improved to 6.8%.' },
      { date: '2026-04-12', title: 'Diabetes screening', doctor: 'Dr. Yasser Hamdi', notes: 'Diagnosed Type 2 diabetes.' },
    ],
    medications: [
      { name: 'Metformin 500mg', dosage: 'Twice daily', startDate: '2026-04-15' },
    ],
    notes: [
      { date: '2026-07-10', text: 'Diet plan reinforced; continue exercise regimen.' },
    ],
    files: [
      { name: 'HbA1c_Report_Apr2026.pdf', date: '2026-04-12' },
    ],
  },
  104: {
    bloodType: 'AB+',
    allergies: ['Pollen'],
    history: [
      { date: '2026-05-20', title: 'Allergy Test', doctor: 'Dr. Mona Khalil', notes: 'Positive for pollen allergy.' },
    ],
    medications: [
      { name: 'Cetirizine 10mg', dosage: 'As needed', startDate: '2026-05-20' },
    ],
    notes: [
      { date: '2026-05-20', text: 'Avoid outdoor activities during high pollen season.' },
    ],
    files: [
      { name: 'Allergy_Test_Result.pdf', date: '2026-05-20' },
    ],
  },
  105: {
    bloodType: 'O+',
    allergies: [],
    history: [
      { date: '2026-07-15', title: 'Cardiology review', doctor: 'د. سارة القحطاني', notes: 'ECG normal, continue follow-up.' },
    ],
    medications: [
      { name: 'Atorvastatin 20mg', dosage: 'Once nightly', startDate: '2026-06-01' },
    ],
    notes: [
      { date: '2026-07-15', text: 'Schedule stress test next visit.' },
    ],
    files: [
      { name: 'ECG_July2026.pdf', date: '2026-07-15' },
    ],
  },
}

// ── Billing seed data ────────────────────────────────────
export const seedInvoices: Invoice[] = [
  {
    id: 1,
    patientId: 101,
    patientName: 'أحمد محمد',
    date: '2026-07-18',
    items: [
      { description: 'Cardiology Consultation', quantity: 1, unitPrice: 300 },
      { description: 'ECG Test', quantity: 1, unitPrice: 150 },
    ],
    status: 'paid',
    paidAmount: 450,
  },
  {
    id: 2,
    patientId: 102,
    patientName: 'Laila Hassan',
    date: '2026-07-18',
    items: [
      { description: 'Routine Checkup', quantity: 1, unitPrice: 200 },
    ],
    status: 'unpaid',
    paidAmount: 0,
  },
  {
    id: 3,
    patientId: 103,
    patientName: 'Khalid Al-Rashid',
    date: '2026-07-10',
    items: [
      { description: 'Diabetes Follow-up', quantity: 1, unitPrice: 250 },
      { description: 'HbA1c Lab Test', quantity: 1, unitPrice: 120 },
      { description: 'Metformin 500mg (60 tabs)', quantity: 1, unitPrice: 45 },
    ],
    status: 'partial',
    paidAmount: 200,
  },
  {
    id: 4,
    patientId: 105,
    patientName: 'Hana Saeed',
    date: '2026-07-15',
    items: [
      { description: 'Cardiology Review', quantity: 1, unitPrice: 300 },
      { description: 'ECG Test', quantity: 1, unitPrice: 150 },
      { description: 'Stress Test', quantity: 1, unitPrice: 400 },
    ],
    status: 'unpaid',
    paidAmount: 0,
  },
  {
    id: 5,
    patientId: 101,
    patientName: 'أحمد محمد',
    date: '2026-08-01',
    items: [
      { description: 'Follow-up Consultation', quantity: 1, unitPrice: 180 },
    ],
    status: 'unpaid',
    paidAmount: 0,
    currency: 'USD',
  },
]

// ── Pharmacy seed data ───────────────────────────────────
export const seedMedicines: Medicine[] = [
  { id: 1, name: 'Amlodipine 5mg', category: 'Cardiology', stock: 480, unitPrice: 0.5, expiryDate: '2027-06-30' },
  { id: 2, name: 'Metformin 500mg', category: 'Diabetes', stock: 1200, unitPrice: 0.3, expiryDate: '2027-03-15' },
  { id: 3, name: 'Atorvastatin 20mg', category: 'Cardiology', stock: 350, unitPrice: 0.8, expiryDate: '2027-01-20' },
  { id: 4, name: 'Cetirizine 10mg', category: 'Allergy', stock: 60, unitPrice: 0.4, expiryDate: '2026-12-10' },
  { id: 5, name: 'Paracetamol 500mg', category: 'Analgesic', stock: 2000, unitPrice: 0.1, expiryDate: '2028-05-01' },
  { id: 6, name: 'Amoxicillin 500mg', category: 'Antibiotic', stock: 0, unitPrice: 0.6, expiryDate: '2027-09-30' },
  { id: 7, name: 'Omeprazole 20mg', category: 'Gastro', stock: 180, unitPrice: 0.5, expiryDate: '2027-04-15' },
  { id: 8, name: 'Insulin Glargine', category: 'Diabetes', stock: 90, unitPrice: 15, expiryDate: '2026-11-30' },
]

export const seedPharmacyOrders: PharmacyOrder[] = [
  { id: 1, patientId: 101, patientName: 'أحمد محمد', medicineId: 1, medicineName: 'Amlodipine 5mg', quantity: 30, date: '2026-07-18', status: 'dispensed' },
  { id: 2, patientId: 103, patientName: 'Khalid Al-Rashid', medicineId: 2, medicineName: 'Metformin 500mg', quantity: 60, date: '2026-07-10', status: 'dispensed' },
  { id: 3, patientId: 104, patientName: 'Noor Abdullah', medicineId: 4, medicineName: 'Cetirizine 10mg', quantity: 20, date: '2026-07-18', status: 'pending' },
  { id: 4, patientId: 105, patientName: 'Hana Saeed', medicineId: 3, medicineName: 'Atorvastatin 20mg', quantity: 30, date: '2026-07-15', status: 'pending' },
]

// ── Lab seed data ────────────────────────────────────────
export const seedLabTests: LabTest[] = [
  { id: 1, patientId: 101, patientName: 'أحمد محمد', testName: 'Lipid Panel', category: 'Cardiology', date: '2026-07-18', status: 'completed', result: 'Cholesterol 210 mg/dL, LDL 130 mg/dL, HDL 45 mg/dL' },
  { id: 2, patientId: 102, patientName: 'Laila Hassan', testName: 'Complete Blood Count', category: 'Hematology', date: '2026-07-18', status: 'in-progress' },
  { id: 3, patientId: 103, patientName: 'Khalid Al-Rashid', testName: 'HbA1c', category: 'Diabetes', date: '2026-07-10', status: 'completed', result: 'HbA1c 6.8% (Normal < 5.7%)' },
  { id: 4, patientId: 104, patientName: 'Noor Abdullah', testName: 'Allergy Panel (IgE)', category: 'Immunology', date: '2026-07-18', status: 'ordered' },
  { id: 5, patientId: 105, patientName: 'Hana Saeed', testName: 'ECG', category: 'Cardiology', date: '2026-07-15', status: 'completed', result: 'Normal sinus rhythm, no abnormalities detected' },
  { id: 6, patientId: 105, patientName: 'Hana Saeed', testName: 'Stress Test', category: 'Cardiology', date: '2026-07-18', status: 'ordered' },
]
