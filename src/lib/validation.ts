import * as z from 'zod'

// ── Login ──────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
})
export type LoginFormValues = z.output<typeof loginSchema>

// ── Doctor ─────────────────────────────────────────────────
export const doctorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  specialty: z.string().min(2, 'Specialty required'),
  rating: z.coerce.number().min(0).max(5, 'Rating must be 0-5'),
  patients: z.coerce.number().int().min(0, 'Patients count must be >= 0'),
})
export type DoctorFormValues = z.output<typeof doctorSchema>

// ── Appointment ────────────────────────────────────────────
export const appointmentSchema = z.object({
  patientId: z.string().min(1, 'Patient required'),
  doctorId: z.string().min(1, 'Doctor required'),
  date: z.string().min(1, 'Date required'),
  time: z.string().min(1, 'Time required'),
})
export type AppointmentFormValues = z.output<typeof appointmentSchema>

// ── Clinical Visit ─────────────────────────────────────────
export const visitSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters'),
  date: z.string().min(1, 'Date required'),
  notes: z.string().min(2, 'Notes must be at least 2 characters'),
})
export type VisitFormValues = z.output<typeof visitSchema>

// ── Medication ─────────────────────────────────────────────
export const medicationSchema = z.object({
  name: z.string().min(2, 'Medication name required'),
  dosage: z.string().min(2, 'Dosage required'),
  startDate: z.string().min(1, 'Start date required'),
})
export type MedicationFormValues = z.output<typeof medicationSchema>

// ── Clinical Note ──────────────────────────────────────────
export const noteSchema = z.object({
  text: z.string().min(2, 'Note must be at least 2 characters'),
})
export type NoteFormValues = z.output<typeof noteSchema>

// ── Lab Result ─────────────────────────────────────────────
export const labResultSchema = z.object({
  result: z.string().min(1, 'Result required'),
})
export type LabResultFormValues = z.output<typeof labResultSchema>

// ── Vitals ─────────────────────────────────────────────────
export const vitalSignSchema = z
  .object({
    temperatureC: z.coerce.number().optional(),
    heartRate: z.coerce.number().int().optional(),
    respiratoryRate: z.coerce.number().int().optional(),
    systolicBp: z.coerce.number().int().optional(),
    diastolicBp: z.coerce.number().int().optional(),
    spo2: z.coerce.number().int().optional(),
    weightKg: z.coerce.number().optional(),
    heightCm: z.coerce.number().optional(),
    notes: z.string().optional(),
  })
  .refine(
    (v) =>
      [v.temperatureC, v.heartRate, v.respiratoryRate, v.systolicBp, v.diastolicBp, v.spo2, v.weightKg, v.heightCm].some(
        (x) => x != null && !Number.isNaN(x),
      ),
    { message: 'At least one vital measurement is required' },
  )
export type VitalSignFormValues = z.output<typeof vitalSignSchema>

// ── Problem list ───────────────────────────────────────────
export const problemSchema = z.object({
  display: z.string().min(2, 'Problem name required'),
  code: z.string().optional(),
  severity: z.enum(['mild', 'moderate', 'severe']).optional(),
  onsetDate: z.string().optional(),
  notes: z.string().optional(),
})
export type ProblemFormValues = z.output<typeof problemSchema>

// ── CPOE ───────────────────────────────────────────────────
export const clinicalOrderSchema = z
  .object({
    patientId: z.coerce.number().int().positive('Patient required'),
    orderType: z.enum(['lab', 'pharmacy', 'imaging', 'nursing', 'other']),
    priority: z.enum(['routine', 'urgent', 'stat']).default('routine'),
    description: z.string().min(2, 'Description required'),
    code: z.string().optional(),
    medicineId: z.coerce.number().int().optional(),
    quantity: z.coerce.number().int().positive().optional(),
    notes: z.string().optional(),
  })
  .refine((v) => v.orderType !== 'pharmacy' || !!v.medicineId, {
    message: 'Medicine required for pharmacy order',
    path: ['medicineId'],
  })
export type ClinicalOrderFormValues = z.output<typeof clinicalOrderSchema>
