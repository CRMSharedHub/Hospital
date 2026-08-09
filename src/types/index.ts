import type { CdsAlert } from '../lib/cdsTypes'

export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'doctor' | 'nurse' | 'patient'
  avatar?: string
  /** Linked patients.id when role is patient (Supabase profiles.linked_patient_id). */
  linkedPatientId?: number
  /** Active facility for multi-facility staff sessions (Phase D). */
  activeFacilityId?: number
  /** Facilities this user may access. */
  facilityIds?: number[]
}

export interface Facility {
  id: number
  code: string
  name: string
  city?: string
  timezone: string
  active: boolean
}

export interface FacilityMembership {
  id: number
  userId: string
  facilityId: number
  role: 'admin' | 'doctor' | 'nurse' | 'staff'
}

export type ComplianceStatus = 'pending' | 'in_progress' | 'done' | 'na'

export interface ComplianceAttestation {
  id: number
  key: string
  label: string
  status: ComplianceStatus
  notes?: string
  updatedAt: string
}

export interface Patient {
  id: number
  name: string
  age: number
  phone: string
  condition: string
  lastVisit: string
  bloodType: string
  allergies: string[]
  facilityId?: number
}

export interface Doctor {
  id: number
  name: string
  specialty: string
  available: boolean
  patients: number
  rating: number
}

export interface Appointment {
  id: number
  patientId: number
  doctorId: number
  patientName: string
  doctorName: string
  date: string // ISO date string
  time: string // HH:mm
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed'
}

export interface ClinicalVisit {
  id: string
  patientId: number
  doctorId: number
  date: string
  title: string
  notes: string
}

export interface Medication {
  id: string
  patientId: number
  name: string
  dosage: string
  startDate: string
  endDate?: string
}

export interface ClinicalNote {
  id: string
  patientId: number
  date: string
  text: string
}

export interface MedicalFile {
  id: string
  patientId: number
  name: string
  url: string
  date: string
  size: number
}

// ── Billing ──────────────────────────────────────────────
export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
}

export interface Invoice {
  id: number
  patientId: number
  patientName: string
  date: string
  items: InvoiceItem[]
  status: 'unpaid' | 'paid' | 'partial'
  paidAmount: number
  currency?: string
}

export type PaymentProvider = 'stripe' | 'mock'
export type PaymentStatus = 'pending' | 'succeeded' | 'failed' | 'refunded'

export interface Payment {
  id: number
  invoiceId: number
  patientId: number
  amount: number
  currency: string
  provider: PaymentProvider
  providerRef?: string
  status: PaymentStatus
  createdAt: string
}

export type ClaimStatus = 'draft' | 'submitted' | 'accepted' | 'rejected' | 'paid'

export interface Claim {
  id: number
  invoiceId: number
  patientId: number
  payerName: string
  icd10Codes: string[]
  cptCodes: string[]
  total: number
  status: ClaimStatus
  externalRef?: string
  createdAt: string
  updatedAt?: string
}

export type RemittanceStatus = 'posted' | 'denied' | 'partial'

export interface Remittance {
  id: number
  claimId: number
  payerName: string
  amountPaid: number
  amountAdjusted: number
  currency: string
  status: RemittanceStatus
  remittanceRef?: string
  notes?: string
  postedAt: string
}

// ── Patient messaging (Phase C3) ──────────────────────────
export type MessageSenderRole = 'admin' | 'doctor' | 'nurse' | 'patient'

export interface PatientMessage {
  id: number
  patientId: number
  patientName: string
  subject: string
  body: string
  senderRole: MessageSenderRole
  senderName: string
  createdAt: string
  readAt?: string
}

// ── ADT / Census (Phase B1) ───────────────────────────────
export type BedStatus = 'available' | 'occupied' | 'cleaning' | 'blocked'
export type AdmissionStatus = 'admitted' | 'discharged'

export interface Ward {
  id: number
  code: string
  name: string
  floor?: string
}

export interface Bed {
  id: number
  wardId: number
  label: string
  status: BedStatus
}

export interface Admission {
  id: number
  patientId: number
  patientName: string
  bedId: number
  wardId: number
  attendingDoctorId?: number
  attendingDoctorName?: string
  status: AdmissionStatus
  admitReason?: string
  admittedAt: string
  dischargedAt?: string
}

// ── Clinical chart (Phase B2) ─────────────────────────────
export type ProblemStatus = 'active' | 'resolved' | 'inactive'
export type ProblemSeverity = 'mild' | 'moderate' | 'severe'

export interface VitalSign {
  id: number
  patientId: number
  admissionId?: number
  recordedAt: string
  recordedBy?: string
  temperatureC?: number
  heartRate?: number
  respiratoryRate?: number
  systolicBp?: number
  diastolicBp?: number
  spo2?: number
  weightKg?: number
  heightCm?: number
  notes?: string
}

export interface Problem {
  id: number
  patientId: number
  code?: string
  display: string
  status: ProblemStatus
  severity?: ProblemSeverity
  onsetDate?: string
  resolvedDate?: string
  notes?: string
  recordedBy?: string
}

// ── CPOE (Phase B3) ───────────────────────────────────────
export type ClinicalOrderType = 'lab' | 'pharmacy' | 'imaging' | 'nursing' | 'other'
export type ClinicalOrderStatus = 'draft' | 'ordered' | 'in-progress' | 'completed' | 'cancelled'
export type ClinicalOrderPriority = 'routine' | 'urgent' | 'stat'

export interface ClinicalOrder {
  id: number
  patientId: number
  patientName: string
  orderType: ClinicalOrderType
  status: ClinicalOrderStatus
  priority: ClinicalOrderPriority
  description: string
  code?: string
  medicineId?: number
  quantity?: number
  orderedBy?: string
  orderedAt: string
  notes?: string
  allergyAlert?: string
  linkedLabTestId?: number
  linkedPharmacyOrderId?: number
  cdsAlerts?: CdsAlert[]
  cdsOverrideReason?: string
  cdsAcknowledgedBy?: string
  cdsAcknowledgedAt?: string
}

// ── eMAR (Phase B4) ───────────────────────────────────────
export type MarStatus = 'scheduled' | 'given' | 'held' | 'refused' | 'missed'

export interface MedicationAdministration {
  id: number
  patientId: number
  patientName: string
  medicineName: string
  dose: string
  route?: string
  scheduledAt: string
  administeredAt?: string
  status: MarStatus
  administeredBy?: string
  notes?: string
  clinicalOrderId?: number
  pharmacyOrderId?: number
}

// ── Pharmacy ─────────────────────────────────────────────
export interface Medicine {
  id: number
  name: string
  category: string
  stock: number
  unitPrice: number
  expiryDate: string
}

export interface PharmacyOrder {
  id: number
  patientId: number
  patientName: string
  medicineId: number
  medicineName: string
  quantity: number
  date: string
  status: 'pending' | 'dispensed' | 'cancelled'
}

// ── Lab ──────────────────────────────────────────────────
export interface LabTest {
  id: number
  patientId: number
  patientName: string
  testName: string
  category: string
  date: string
  status: 'ordered' | 'in-progress' | 'completed' | 'cancelled'
  result?: string
}

// ── Notifications ────────────────────────────────────────
export type NotificationType =
  | 'appointment_today'
  | 'appointment_upcoming'
  | 'invoice_overdue'
  | 'medicine_low_stock'
  | 'medicine_out_of_stock'
  | 'lab_result_ready'
  | 'pharmacy_order_pending'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  createdAt: string
  read: boolean
  link?: string
}
