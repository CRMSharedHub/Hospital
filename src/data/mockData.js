export const stats = [
  { id: 1, labelKey: 'todayAppointments', value: '42', trend: '+12%', icon: 'CalendarDays', color: 'bg-primary-500' },
  { id: 2, labelKey: 'totalPatients', value: '1,248', trend: '+5.4%', icon: 'Users', color: 'bg-accent-500' },
  { id: 3, labelKey: 'totalDoctors', value: '36', trend: '+2', icon: 'Stethoscope', color: 'bg-purple-500' },
  { id: 4, labelKey: 'monthlyRevenue', value: '$84,320', trend: '+8.1%', icon: 'DollarSign', color: 'bg-emerald-500' },
]

export const appointments = [
  { id: 1, patient: 'أحمد محمد', doctor: 'د. سارة القحطاني', date: '2026-07-18 09:00', status: 'confirmed' },
  { id: 2, patient: 'Laila Hassan', doctor: 'Dr. Omar Saleh', date: '2026-07-18 10:30', status: 'pending' },
  { id: 3, patient: 'Khalid Al-Rashid', doctor: 'Dr. Fatima Noor', date: '2026-07-18 11:00', status: 'completed' },
  { id: 4, patient: 'Noor Abdullah', doctor: 'Dr. Yasser Hamdi', date: '2026-07-18 13:15', status: 'cancelled' },
  { id: 5, patient: 'Hana Saeed', doctor: 'Dr. Mona Khalil', date: '2026-07-18 14:45', status: 'confirmed' },
]

export const patients = [
  { id: 101, name: 'أحمد محمد', age: 34, phone: '+966 50 123 4567', lastVisit: '2026-06-12', condition: 'Hypertension' },
  { id: 102, name: 'Laila Hassan', age: 28, phone: '+966 55 987 6543', lastVisit: '2026-07-01', condition: 'Routine Checkup' },
  { id: 103, name: 'Khalid Al-Rashid', age: 45, phone: '+966 54 555 1212', lastVisit: '2026-07-10', condition: 'Diabetes Follow-up' },
  { id: 104, name: 'Noor Abdullah', age: 22, phone: '+966 56 777 8888', lastVisit: '2026-05-20', condition: 'Allergy Test' },
  { id: 105, name: 'Hana Saeed', age: 56, phone: '+966 50 333 4444', lastVisit: '2026-07-15', condition: 'Cardiology' },
]

export const doctors = [
  { id: 1, name: 'د. سارة القحطاني', specialty: 'Cardiology', available: true, patients: 120, rating: 4.9 },
  { id: 2, name: 'Dr. Omar Saleh', specialty: 'Pediatrics', available: true, patients: 95, rating: 4.8 },
  { id: 3, name: 'Dr. Fatima Noor', specialty: 'Dermatology', available: false, patients: 80, rating: 4.7 },
  { id: 4, name: 'Dr. Yasser Hamdi', specialty: 'Orthopedics', available: true, patients: 110, rating: 4.9 },
  { id: 5, name: 'Dr. Mona Khalil', specialty: 'Neurology', available: true, patients: 70, rating: 4.8 },
  { id: 6, name: 'Dr. Hassan Turki', specialty: 'General Surgery', available: false, patients: 60, rating: 4.6 },
]

export const patientRecords = {
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
