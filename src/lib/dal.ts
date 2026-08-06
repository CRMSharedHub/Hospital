import { supabase, isSupabaseConfigured } from './supabase'
import { db } from './db'
import type {
  Patient,
  Doctor,
  Appointment,
  ClinicalVisit,
  Medication,
  ClinicalNote,
  MedicalFile,
  Invoice,
  Medicine,
  PharmacyOrder,
  LabTest,
  Payment,
  Claim,
  Remittance,
  Ward,
  Bed,
  Admission,
  VitalSign,
  Problem,
  ClinicalOrder,
  MedicationAdministration,
  PatientMessage,
} from '../types'
import { invoiceStatusAfterPayment } from './billingMath'
import { canAdmitPatient, canAdmitToBed } from './adt'
import { hasAnyVitalMeasurement, canResolveProblem } from './clinicalChart'
import { canPlaceOrder, checkDrugAllergyAlert } from './cpoe'
import { canAdminister } from './emar'

// ── Field mapping helpers (snake_case ↔ camelCase) ────────
function mapPatient(row: Record<string, unknown>): Patient {
  return {
    id: row.id as number,
    name: row.name as string,
    age: row.age as number,
    phone: row.phone as string,
    condition: row.condition as string,
    lastVisit: row.last_visit as string,
    bloodType: row.blood_type as string,
    allergies: row.allergies as string[],
  }
}

function mapDoctor(row: Record<string, unknown>): Doctor {
  return {
    id: row.id as number,
    name: row.name as string,
    specialty: row.specialty as string,
    available: row.available as boolean,
    patients: row.patients as number,
    rating: Number(row.rating),
  }
}

function mapAppointment(row: Record<string, unknown>): Appointment {
  return {
    id: row.id as number,
    patientId: row.patient_id as number,
    doctorId: row.doctor_id as number,
    patientName: row.patient_name as string,
    doctorName: row.doctor_name as string,
    date: row.date as string,
    time: row.time as string,
    status: row.status as Appointment['status'],
  }
}

function mapVisit(row: Record<string, unknown>): ClinicalVisit {
  return {
    id: row.id as string,
    patientId: row.patient_id as number,
    doctorId: row.doctor_id as number,
    date: row.date as string,
    title: row.title as string,
    notes: row.notes as string,
  }
}

function mapMedication(row: Record<string, unknown>): Medication {
  return {
    id: row.id as string,
    patientId: row.patient_id as number,
    name: row.name as string,
    dosage: row.dosage as string,
    startDate: row.start_date as string,
    endDate: row.end_date as string | undefined,
  }
}

function mapNote(row: Record<string, unknown>): ClinicalNote {
  return {
    id: row.id as string,
    patientId: row.patient_id as number,
    date: row.date as string,
    text: row.text as string,
  }
}

function mapFile(row: Record<string, unknown>): MedicalFile {
  return {
    id: row.id as string,
    patientId: row.patient_id as number,
    name: row.name as string,
    url: row.url as string,
    date: row.date as string,
    size: row.size as number,
  }
}

function mapInvoice(row: Record<string, unknown>): Invoice {
  return {
    id: row.id as number,
    patientId: row.patient_id as number,
    patientName: row.patient_name as string,
    date: row.date as string,
    items: row.items as Invoice['items'],
    status: row.status as Invoice['status'],
    paidAmount: Number(row.paid_amount),
    currency: (row.currency as string) || 'USD',
  }
}

function mapPayment(row: Record<string, unknown>): Payment {
  return {
    id: Number(row.id),
    invoiceId: row.invoice_id as number,
    patientId: row.patient_id as number,
    amount: Number(row.amount),
    currency: (row.currency as string) || 'USD',
    provider: row.provider as Payment['provider'],
    providerRef: (row.provider_ref as string) || undefined,
    status: row.status as Payment['status'],
    createdAt: (row.created_at as string) || new Date().toISOString(),
  }
}

function mapClaim(row: Record<string, unknown>): Claim {
  return {
    id: Number(row.id),
    invoiceId: row.invoice_id as number,
    patientId: row.patient_id as number,
    payerName: (row.payer_name as string) || 'Self-Pay',
    icd10Codes: (row.icd10_codes as string[]) || [],
    cptCodes: (row.cpt_codes as string[]) || [],
    total: Number(row.total),
    status: row.status as Claim['status'],
    externalRef: (row.external_ref as string) || undefined,
    createdAt: (row.created_at as string) || new Date().toISOString(),
    updatedAt: (row.updated_at as string) || undefined,
  }
}

function mapRemittance(row: Record<string, unknown>): Remittance {
  return {
    id: Number(row.id),
    claimId: Number(row.claim_id),
    payerName: (row.payer_name as string) || '',
    amountPaid: Number(row.amount_paid),
    amountAdjusted: Number(row.amount_adjusted ?? 0),
    currency: (row.currency as string) || 'USD',
    status: row.status as Remittance['status'],
    remittanceRef: (row.remittance_ref as string) || undefined,
    notes: (row.notes as string) || undefined,
    postedAt: (row.posted_at as string) || new Date().toISOString(),
  }
}

function mapPatientMessage(row: Record<string, unknown>): PatientMessage {
  return {
    id: Number(row.id),
    patientId: Number(row.patient_id),
    patientName: (row.patient_name as string) || '',
    subject: (row.subject as string) || '',
    body: (row.body as string) || '',
    senderRole: row.sender_role as PatientMessage['senderRole'],
    senderName: (row.sender_name as string) || '',
    createdAt: (row.created_at as string) || new Date().toISOString(),
    readAt: (row.read_at as string) || undefined,
  }
}

function mapAdmission(row: Record<string, unknown>): Admission {
  return {
    id: Number(row.id),
    patientId: row.patient_id as number,
    patientName: row.patient_name as string,
    bedId: row.bed_id as number,
    wardId: row.ward_id as number,
    attendingDoctorId: (row.attending_doctor_id as number) || undefined,
    attendingDoctorName: (row.attending_doctor_name as string) || undefined,
    status: row.status as Admission['status'],
    admitReason: (row.admit_reason as string) || undefined,
    admittedAt: (row.admitted_at as string) || new Date().toISOString(),
    dischargedAt: (row.discharged_at as string) || undefined,
  }
}

function mapVitalSign(row: Record<string, unknown>): VitalSign {
  return {
    id: Number(row.id),
    patientId: row.patient_id as number,
    admissionId: (row.admission_id as number) || undefined,
    recordedAt: (row.recorded_at as string) || new Date().toISOString(),
    recordedBy: (row.recorded_by as string) || undefined,
    temperatureC: row.temperature_c != null ? Number(row.temperature_c) : undefined,
    heartRate: row.heart_rate != null ? Number(row.heart_rate) : undefined,
    respiratoryRate: row.respiratory_rate != null ? Number(row.respiratory_rate) : undefined,
    systolicBp: row.systolic_bp != null ? Number(row.systolic_bp) : undefined,
    diastolicBp: row.diastolic_bp != null ? Number(row.diastolic_bp) : undefined,
    spo2: row.spo2 != null ? Number(row.spo2) : undefined,
    weightKg: row.weight_kg != null ? Number(row.weight_kg) : undefined,
    heightCm: row.height_cm != null ? Number(row.height_cm) : undefined,
    notes: (row.notes as string) || undefined,
  }
}

function mapProblem(row: Record<string, unknown>): Problem {
  return {
    id: Number(row.id),
    patientId: row.patient_id as number,
    code: (row.code as string) || undefined,
    display: row.display as string,
    status: row.status as Problem['status'],
    severity: (row.severity as Problem['severity']) || undefined,
    onsetDate: (row.onset_date as string) || undefined,
    resolvedDate: (row.resolved_date as string) || undefined,
    notes: (row.notes as string) || undefined,
    recordedBy: (row.recorded_by as string) || undefined,
  }
}

function mapClinicalOrder(row: Record<string, unknown>): ClinicalOrder {
  return {
    id: Number(row.id),
    patientId: row.patient_id as number,
    patientName: row.patient_name as string,
    orderType: row.order_type as ClinicalOrder['orderType'],
    status: row.status as ClinicalOrder['status'],
    priority: row.priority as ClinicalOrder['priority'],
    description: row.description as string,
    code: (row.code as string) || undefined,
    medicineId: (row.medicine_id as number) || undefined,
    quantity: row.quantity != null ? Number(row.quantity) : undefined,
    orderedBy: (row.ordered_by as string) || undefined,
    orderedAt: (row.ordered_at as string) || new Date().toISOString(),
    notes: (row.notes as string) || undefined,
    allergyAlert: (row.allergy_alert as string) || undefined,
    linkedLabTestId: (row.linked_lab_test_id as number) || undefined,
    linkedPharmacyOrderId: (row.linked_pharmacy_order_id as number) || undefined,
  }
}

function mapMar(row: Record<string, unknown>): MedicationAdministration {
  return {
    id: Number(row.id),
    patientId: row.patient_id as number,
    patientName: row.patient_name as string,
    medicineName: row.medicine_name as string,
    dose: row.dose as string,
    route: (row.route as string) || 'oral',
    scheduledAt: (row.scheduled_at as string) || new Date().toISOString(),
    administeredAt: (row.administered_at as string) || undefined,
    status: row.status as MedicationAdministration['status'],
    administeredBy: (row.administered_by as string) || undefined,
    notes: (row.notes as string) || undefined,
    clinicalOrderId: (row.clinical_order_id as number) || undefined,
    pharmacyOrderId: (row.pharmacy_order_id as number) || undefined,
  }
}

function mapMedicine(row: Record<string, unknown>): Medicine {
  return {
    id: row.id as number,
    name: row.name as string,
    category: row.category as string,
    stock: row.stock as number,
    unitPrice: Number(row.unit_price),
    expiryDate: row.expiry_date as string,
  }
}

function mapPharmacyOrder(row: Record<string, unknown>): PharmacyOrder {
  return {
    id: row.id as number,
    patientId: row.patient_id as number,
    patientName: row.patient_name as string,
    medicineId: row.medicine_id as number,
    medicineName: row.medicine_name as string,
    quantity: row.quantity as number,
    date: row.date as string,
    status: row.status as PharmacyOrder['status'],
  }
}

function mapLabTest(row: Record<string, unknown>): LabTest {
  return {
    id: row.id as number,
    patientId: row.patient_id as number,
    patientName: row.patient_name as string,
    testName: row.test_name as string,
    category: row.category as string,
    date: row.date as string,
    status: row.status as LabTest['status'],
    result: row.result as string | undefined,
  }
}

// ── Data Access Layer ──────────────────────────────────────
export const dal = {
  // ── Patients ─────────────────────────────────────────────
  async getPatients(): Promise<Patient[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('patients').select('*').order('id')
      if (error) throw error
      return data.map(mapPatient)
    }
    return db.patients.toArray()
  },

  async getPatient(id: number): Promise<Patient | undefined> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('patients').select('*').eq('id', id).single()
      if (error) throw error
      return data ? mapPatient(data) : undefined
    }
    return db.patients.get(id)
  },

  async addPatient(patient: Omit<Patient, 'id'>): Promise<number> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('patients')
        .insert({
          name: patient.name,
          age: patient.age,
          phone: patient.phone,
          condition: patient.condition,
          last_visit: patient.lastVisit,
          blood_type: patient.bloodType,
          allergies: patient.allergies,
        })
        .select('id')
        .single()
      if (error) throw error
      return data.id
    }
    return db.patients.add(patient as Patient)
  },

  // ── Doctors ──────────────────────────────────────────────
  async getDoctors(): Promise<Doctor[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('doctors').select('*').order('id')
      if (error) throw error
      return data.map(mapDoctor)
    }
    return db.doctors.toArray()
  },

  async getDoctor(id: number): Promise<Doctor | undefined> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('doctors').select('*').eq('id', id).single()
      if (error) throw error
      return data ? mapDoctor(data) : undefined
    }
    return db.doctors.get(id)
  },

  async addDoctor(doctor: Omit<Doctor, 'id'>): Promise<number> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('doctors')
        .insert({
          name: doctor.name,
          specialty: doctor.specialty,
          available: doctor.available,
          patients: doctor.patients,
          rating: doctor.rating,
        })
        .select('id')
        .single()
      if (error) throw error
      return data.id
    }
    return db.doctors.add(doctor as Doctor)
  },

  async updateDoctor(doctor: Doctor): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('doctors')
        .update({
          name: doctor.name,
          specialty: doctor.specialty,
          available: doctor.available,
          patients: doctor.patients,
          rating: doctor.rating,
        })
        .eq('id', doctor.id)
      if (error) throw error
      return
    }
    await db.doctors.put(doctor)
  },

  // ── Appointments ─────────────────────────────────────────
  async getAppointments(): Promise<Appointment[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('appointments').select('*').order('id')
      if (error) throw error
      return data.map(mapAppointment)
    }
    return db.appointments.toArray()
  },

  async addAppointment(appt: Omit<Appointment, 'id'>): Promise<number> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          patient_id: appt.patientId,
          doctor_id: appt.doctorId,
          patient_name: appt.patientName,
          doctor_name: appt.doctorName,
          date: appt.date,
          time: appt.time,
          status: appt.status,
        })
        .select('id')
        .single()
      if (error) throw error
      return data.id
    }
    return db.appointments.add(appt as Appointment)
  },

  async updateAppointmentStatus(id: number, status: Appointment['status']): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('appointments').update({ status }).eq('id', id)
      if (error) throw error
      return
    }
    await db.appointments.update(id, { status })
  },

  // ── EHR: Visits ──────────────────────────────────────────
  async getVisits(patientId: number): Promise<ClinicalVisit[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('visits')
        .select('*')
        .eq('patient_id', patientId)
        .order('date', { ascending: false })
      if (error) throw error
      return data.map(mapVisit)
    }
    return db.visits.where('patientId').equals(patientId).toArray()
  },

  async addVisit(visit: ClinicalVisit): Promise<string> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('visits').insert({
        id: visit.id,
        patient_id: visit.patientId,
        doctor_id: visit.doctorId,
        date: visit.date,
        title: visit.title,
        notes: visit.notes,
      })
      if (error) throw error
      return visit.id
    }
    return db.visits.add(visit)
  },

  // ── EHR: Medications ─────────────────────────────────────
  async getMedications(patientId: number): Promise<Medication[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('patient_id', patientId)
        .order('start_date', { ascending: false })
      if (error) throw error
      return data.map(mapMedication)
    }
    return db.medications.where('patientId').equals(patientId).toArray()
  },

  async addMedication(med: Medication): Promise<string> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('medications').insert({
        id: med.id,
        patient_id: med.patientId,
        name: med.name,
        dosage: med.dosage,
        start_date: med.startDate,
        end_date: med.endDate,
      })
      if (error) throw error
      return med.id
    }
    return db.medications.add(med)
  },

  // ── EHR: Notes ───────────────────────────────────────────
  async getNotes(patientId: number): Promise<ClinicalNote[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('patient_id', patientId)
        .order('date', { ascending: false })
      if (error) throw error
      return data.map(mapNote)
    }
    return db.notes.where('patientId').equals(patientId).toArray()
  },

  async addNote(note: ClinicalNote): Promise<string> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('notes').insert({
        id: note.id,
        patient_id: note.patientId,
        date: note.date,
        text: note.text,
      })
      if (error) throw error
      return note.id
    }
    return db.notes.add(note)
  },

  // ── EHR: Files ───────────────────────────────────────────
  async getFiles(patientId: number): Promise<MedicalFile[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('medical_files')
        .select('*')
        .eq('patient_id', patientId)
        .order('date', { ascending: false })
      if (error) throw error
      return data.map(mapFile)
    }
    return db.files.where('patientId').equals(patientId).toArray()
  },

  async addFile(file: MedicalFile): Promise<string> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('medical_files').insert({
        id: file.id,
        patient_id: file.patientId,
        name: file.name,
        url: file.url,
        date: file.date,
        size: file.size,
      })
      if (error) throw error
      return file.id
    }
    return db.files.add(file)
  },

  async uploadMedicalFile(
    patientId: number,
    file: File,
    fileId: string,
  ): Promise<{ url: string; size: number }> {
    if (isSupabaseConfigured && supabase) {
      const { usesServerEncryption, uploadEncryptedViaEdge } = await import('./medicalFilesApi')

      // Prefer Edge Function — ENCRYPTION_KEY never leaves the server
      if (usesServerEncryption()) {
        try {
          const { path, size } = await uploadEncryptedViaEdge(patientId, file, fileId)
          return { url: path, size }
        } catch (e) {
          // Fall through to client encryption only if explicitly allowed
          if (import.meta.env.VITE_ALLOW_CLIENT_ENCRYPTION !== 'true') {
            throw e
          }
        }
      }

      const ext = file.name.split('.').pop()
      const path = `${patientId}/${fileId}.${ext}`
      const { encryptFileForUpload } = await import('./encryption')
      const encryptedBlob = await encryptFileForUpload(file)
      const encryptedFile = new File([encryptedBlob], file.name, { type: 'application/octet-stream' })

      const { error: uploadError } = await supabase.storage
        .from('medical-files')
        .upload(path, encryptedFile, { upsert: false })
      if (uploadError) throw uploadError

      return { url: path, size: file.size }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
    return { url: URL.createObjectURL(file), size: file.size }
  },

  /**
   * Create a short-lived signed URL for a private medical file storage path.
   * Encrypted blobs should be downloaded via downloadMedicalFile (Edge decrypt).
   * Public http(s) URLs (legacy / demo blob URLs) are returned as-is.
   */
  async getMedicalFileAccessUrl(storedUrl: string, expiresInSeconds = 300): Promise<string> {
    if (!storedUrl) throw new Error('Missing file path')
    if (storedUrl.startsWith('http://') || storedUrl.startsWith('https://') || storedUrl.startsWith('blob:')) {
      return storedUrl
    }
    // Prefer decrypt-via-edge then object URL for private encrypted objects
    if (isSupabaseConfigured && supabase) {
      const { usesServerEncryption, downloadDecryptedViaEdge } = await import('./medicalFilesApi')
      if (usesServerEncryption()) {
        const blob = await downloadDecryptedViaEdge(storedUrl)
        return URL.createObjectURL(blob)
      }
      const { data, error } = await supabase.storage
        .from('medical-files')
        .createSignedUrl(storedUrl, expiresInSeconds)
      if (error) throw error
      if (!data?.signedUrl) throw new Error('Failed to create signed URL')
      return data.signedUrl
    }
    return storedUrl
  },

  async downloadMedicalFile(
    patientId: number,
    fileName: string,
    mimeType?: string,
  ): Promise<Blob> {
    if (isSupabaseConfigured && supabase) {
      const path = fileName.includes('/') ? fileName : `${patientId}/${fileName}`
      const { usesServerEncryption, downloadDecryptedViaEdge } = await import('./medicalFilesApi')
      if (usesServerEncryption()) {
        try {
          return await downloadDecryptedViaEdge(path, mimeType)
        } catch (e) {
          if (import.meta.env.VITE_ALLOW_CLIENT_ENCRYPTION !== 'true') throw e
        }
      }

      const { data, error } = await supabase.storage
        .from('medical-files')
        .download(path)
      if (error) throw error

      const { decryptDownloadedFile } = await import('./encryption')
      return decryptDownloadedFile(data as Blob, mimeType)
    }

    return new Blob([], { type: mimeType || 'application/octet-stream' })
  },

  async deleteFile(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('medical_files').delete().eq('id', id)
      if (error) throw error
      return
    }
    await db.files.delete(id)
  },

  // ── Invoices ─────────────────────────────────────────────
  async getInvoices(): Promise<Invoice[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('invoices').select('*').order('id')
      if (error) throw error
      return data.map(mapInvoice)
    }
    return db.invoices.toArray()
  },

  async addInvoice(invoice: Omit<Invoice, 'id'>): Promise<number> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('invoices')
        .insert({
          patient_id: invoice.patientId,
          patient_name: invoice.patientName,
          date: invoice.date,
          items: invoice.items,
          status: invoice.status,
          paid_amount: invoice.paidAmount,
        })
        .select('id')
        .single()
      if (error) throw error
      return data.id
    }
    return db.invoices.add(invoice as Invoice)
  },

  async updateInvoiceStatus(
    id: number,
    status: Invoice['status'],
    paidAmount?: number,
  ): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const update: Record<string, unknown> = { status }
      if (paidAmount !== undefined) {
        update.paid_amount = paidAmount
      }
      const { error } = await supabase.from('invoices').update(update).eq('id', id)
      if (error) throw error
      return
    }
    await db.invoices.update(id, paidAmount !== undefined ? { status, paidAmount } : { status })
  },

  async getInvoicesByPatient(patientId: number): Promise<Invoice[]> {
    const all = await this.getInvoices()
    return all.filter((i) => i.patientId === patientId)
  },

  // ── Payments ─────────────────────────────────────────────
  async getPayments(filters?: { patientId?: number; invoiceId?: number }): Promise<Payment[]> {
    if (isSupabaseConfigured && supabase) {
      let q = supabase.from('payments').select('*').order('id', { ascending: false })
      if (filters?.patientId) q = q.eq('patient_id', filters.patientId)
      if (filters?.invoiceId) q = q.eq('invoice_id', filters.invoiceId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []).map(mapPayment)
    }
    let rows = await db.payments.toArray()
    if (filters?.patientId) rows = rows.filter((p) => p.patientId === filters.patientId)
    if (filters?.invoiceId) rows = rows.filter((p) => p.invoiceId === filters.invoiceId)
    return rows.sort((a, b) => b.id - a.id)
  },

  async createLocalPendingPayment(input: {
    invoiceId: number
    patientId: number
    amount: number
    currency?: string
  }): Promise<Payment> {
    const providerRef = `mock_${input.invoiceId}_${crypto.randomUUID()}`
    const record: Omit<Payment, 'id'> = {
      invoiceId: input.invoiceId,
      patientId: input.patientId,
      amount: input.amount,
      currency: input.currency ?? 'USD',
      provider: 'mock',
      providerRef,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          invoice_id: record.invoiceId,
          patient_id: record.patientId,
          amount: record.amount,
          currency: record.currency,
          provider: record.provider,
          provider_ref: record.providerRef,
          status: record.status,
        })
        .select('*')
        .single()
      if (error) throw error
      return mapPayment(data)
    }
    const id = await db.payments.add(record as Payment)
    return { ...record, id } as Payment
  },

  async confirmLocalMockPayment(paymentId: number): Promise<Payment> {
    let payment: Payment | undefined
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('payments').select('*').eq('id', paymentId).single()
      if (error || !data) throw new Error(error?.message ?? 'Payment not found')
      payment = mapPayment(data)
    } else {
      payment = await db.payments.get(paymentId)
      if (!payment) throw new Error('Payment not found')
    }

    if (payment.status === 'succeeded') return payment

    const invoices = await this.getInvoices()
    const inv = invoices.find((i) => i.id === payment!.invoiceId)
    if (!inv) throw new Error('Invoice not found')

    const { status, paidAmount } = invoiceStatusAfterPayment(inv, payment.amount)
    await this.updateInvoiceStatus(inv.id, status, paidAmount)

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('payments')
        .update({ status: 'succeeded' })
        .eq('id', paymentId)
        .select('*')
        .single()
      if (error) throw error
      return mapPayment(data)
    }
    await db.payments.update(paymentId, { status: 'succeeded' })
    return { ...payment, status: 'succeeded' }
  },

  // ── Claims ───────────────────────────────────────────────
  async getClaims(): Promise<Claim[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('claims').select('*').order('id', { ascending: false })
      if (error) throw error
      return (data ?? []).map(mapClaim)
    }
    return (await db.claims.toArray()).sort((a, b) => b.id - a.id)
  },

  async addClaim(claim: Omit<Claim, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('claims')
        .insert({
          invoice_id: claim.invoiceId,
          patient_id: claim.patientId,
          payer_name: claim.payerName,
          icd10_codes: claim.icd10Codes,
          cpt_codes: claim.cptCodes,
          total: claim.total,
          status: claim.status,
          external_ref: claim.externalRef ?? null,
        })
        .select('id')
        .single()
      if (error) throw error
      return data.id
    }
    return db.claims.add({
      ...claim,
      createdAt: new Date().toISOString(),
    } as Claim)
  },

  async updateClaimStatus(id: number, status: Claim['status'], externalRef?: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const update: Record<string, unknown> = { status }
      if (externalRef !== undefined) update.external_ref = externalRef
      const { error } = await supabase.from('claims').update(update).eq('id', id)
      if (error) throw error
      return
    }
    await db.claims.update(id, {
      status,
      ...(externalRef !== undefined ? { externalRef } : {}),
      updatedAt: new Date().toISOString(),
    })
  },

  async getRemittances(claimId?: number): Promise<Remittance[]> {
    if (isSupabaseConfigured && supabase) {
      let q = supabase.from('remittances').select('*').order('id', { ascending: false })
      if (claimId) q = q.eq('claim_id', claimId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []).map(mapRemittance)
    }
    let rows = await db.remittances.toArray()
    if (claimId) rows = rows.filter((r) => r.claimId === claimId)
    return rows.sort((a, b) => b.id - a.id)
  },

  async postRemittance(input: Omit<Remittance, 'id' | 'postedAt'>): Promise<number> {
    const postedAt = new Date().toISOString()
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('remittances')
        .insert({
          claim_id: input.claimId,
          payer_name: input.payerName,
          amount_paid: input.amountPaid,
          amount_adjusted: input.amountAdjusted,
          currency: input.currency,
          status: input.status,
          remittance_ref: input.remittanceRef ?? null,
          notes: input.notes ?? null,
          posted_at: postedAt,
        })
        .select('id')
        .single()
      if (error) throw error
      // Mark claim paid when remittance posts
      if (input.status === 'posted' || input.status === 'partial') {
        await this.updateClaimStatus(input.claimId, input.status === 'posted' ? 'paid' : 'accepted')
      }
      if (input.status === 'denied') {
        await this.updateClaimStatus(input.claimId, 'rejected')
      }
      return data.id
    }
    const id = await db.remittances.add({ ...input, postedAt } as Remittance)
    if (input.status === 'posted') await this.updateClaimStatus(input.claimId, 'paid')
    else if (input.status === 'denied') await this.updateClaimStatus(input.claimId, 'rejected')
    else if (input.status === 'partial') await this.updateClaimStatus(input.claimId, 'accepted')
    return id
  },

  async postRemittancesFromEra(inputs: Omit<Remittance, 'id' | 'postedAt'>[]): Promise<number[]> {
    const ids: number[] = []
    for (const input of inputs) {
      ids.push(await this.postRemittance(input))
    }
    return ids
  },

  // ── Patient messaging (Phase C3) ─────────────────────────
  async getPatientMessages(patientId?: number): Promise<PatientMessage[]> {
    if (isSupabaseConfigured && supabase) {
      let q = supabase.from('patient_messages').select('*').order('id', { ascending: false })
      if (patientId) q = q.eq('patient_id', patientId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []).map(mapPatientMessage)
    }
    let rows = await db.patientMessages.toArray()
    if (patientId) rows = rows.filter((m) => m.patientId === patientId)
    return rows.sort((a, b) => b.id - a.id)
  },

  async sendPatientMessage(
    input: Omit<PatientMessage, 'id' | 'createdAt' | 'readAt'>,
  ): Promise<number> {
    const createdAt = new Date().toISOString()
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('patient_messages')
        .insert({
          patient_id: input.patientId,
          patient_name: input.patientName,
          subject: input.subject,
          body: input.body,
          sender_role: input.senderRole,
          sender_name: input.senderName,
          created_at: createdAt,
        })
        .select('id')
        .single()
      if (error) throw error
      return data.id
    }
    return db.patientMessages.add({ ...input, createdAt } as PatientMessage)
  },

  async markMessageRead(id: number): Promise<void> {
    const readAt = new Date().toISOString()
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('patient_messages').update({ read_at: readAt }).eq('id', id)
      if (error) throw error
      return
    }
    await db.patientMessages.update(id, { readAt })
  },

  /** Apply ORU/MLLP lab result locally (demo path when Edge not used). */
  async ingestOruLabResult(opts: {
    patientId: number
    patientName?: string
    testName: string
    result: string
  }): Promise<number> {
    const labs = await this.getLabTestsByPatient(opts.patientId)
    const open = labs.find((l) => l.status === 'ordered' || l.status === 'in-progress')
    if (open) {
      await this.updateLabTestStatus(open.id, 'completed', opts.result)
      return open.id
    }
    return this.addLabTest({
      patientId: opts.patientId,
      patientName: opts.patientName || `Patient ${opts.patientId}`,
      testName: opts.testName,
      category: 'Interop',
      date: new Date().toISOString().slice(0, 10),
      status: 'completed',
      result: opts.result,
    })
  },

  async getAppointmentsByPatient(patientId: number): Promise<Appointment[]> {
    const all = await this.getAppointments()
    return all.filter((a) => a.patientId === patientId)
  },

  async getLabTestsByPatient(patientId: number): Promise<LabTest[]> {
    const all = await this.getLabTests()
    return all.filter((t) => t.patientId === patientId)
  },

  // ── ADT / Census ─────────────────────────────────────────
  async getWards(): Promise<Ward[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('wards').select('*').order('id')
      if (error) throw error
      return (data ?? []).map((r) => ({
        id: r.id as number,
        code: r.code as string,
        name: r.name as string,
        floor: (r.floor as string) || undefined,
      }))
    }
    return db.wards.toArray()
  },

  async getBeds(): Promise<Bed[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('beds').select('*').order('id')
      if (error) throw error
      return (data ?? []).map((r) => ({
        id: r.id as number,
        wardId: r.ward_id as number,
        label: r.label as string,
        status: r.status as Bed['status'],
      }))
    }
    return db.beds.toArray()
  },

  async getAdmissions(status?: Admission['status']): Promise<Admission[]> {
    if (isSupabaseConfigured && supabase) {
      let q = supabase.from('admissions').select('*').order('id', { ascending: false })
      if (status) q = q.eq('status', status)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []).map(mapAdmission)
    }
    let rows = await db.admissions.toArray()
    if (status) rows = rows.filter((a) => a.status === status)
    return rows.sort((a, b) => b.id - a.id)
  },

  async admitPatient(input: {
    patientId: number
    patientName: string
    bedId: number
    wardId: number
    attendingDoctorId?: number
    attendingDoctorName?: string
    admitReason?: string
  }): Promise<number> {
    const beds = await this.getBeds()
    const bed = beds.find((b) => b.id === input.bedId)
    const active = await this.getAdmissions('admitted')
    const errPatient = canAdmitPatient(active.find((a) => a.patientId === input.patientId))
    if (errPatient) throw new Error(errPatient)
    const errBed = canAdmitToBed(bed, active.find((a) => a.bedId === input.bedId))
    if (errBed) throw new Error(errBed)

    const admittedAt = new Date().toISOString()
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('admissions')
        .insert({
          patient_id: input.patientId,
          patient_name: input.patientName,
          bed_id: input.bedId,
          ward_id: input.wardId,
          attending_doctor_id: input.attendingDoctorId ?? null,
          attending_doctor_name: input.attendingDoctorName ?? null,
          status: 'admitted',
          admit_reason: input.admitReason ?? null,
          admitted_at: admittedAt,
        })
        .select('id')
        .single()
      if (error) throw error
      const { error: bedErr } = await supabase.from('beds').update({ status: 'occupied' }).eq('id', input.bedId)
      if (bedErr) throw bedErr
      return data.id
    }

    await db.beds.update(input.bedId, { status: 'occupied' })
    return db.admissions.add({
      ...input,
      status: 'admitted',
      admittedAt,
    } as Admission)
  },

  async transferAdmission(admissionId: number, newBedId: number, newWardId: number): Promise<void> {
    const admissions = await this.getAdmissions('admitted')
    const adm = admissions.find((a) => a.id === admissionId)
    if (!adm) throw new Error('Active admission not found')
    const beds = await this.getBeds()
    const newBed = beds.find((b) => b.id === newBedId)
    const errBed = canAdmitToBed(newBed, admissions.find((a) => a.bedId === newBedId))
    if (errBed) throw new Error(errBed)

    if (isSupabaseConfigured && supabase) {
      const { error: freeErr } = await supabase.from('beds').update({ status: 'cleaning' }).eq('id', adm.bedId)
      if (freeErr) throw freeErr
      const { error: occErr } = await supabase.from('beds').update({ status: 'occupied' }).eq('id', newBedId)
      if (occErr) throw occErr
      const { error } = await supabase
        .from('admissions')
        .update({ bed_id: newBedId, ward_id: newWardId })
        .eq('id', admissionId)
      if (error) throw error
      return
    }

    await db.beds.update(adm.bedId, { status: 'cleaning' })
    await db.beds.update(newBedId, { status: 'occupied' })
    await db.admissions.update(admissionId, { bedId: newBedId, wardId: newWardId })
  },

  async dischargeAdmission(admissionId: number): Promise<void> {
    const admissions = await this.getAdmissions('admitted')
    const adm = admissions.find((a) => a.id === admissionId)
    if (!adm) throw new Error('Active admission not found')
    const dischargedAt = new Date().toISOString()

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('admissions')
        .update({ status: 'discharged', discharged_at: dischargedAt })
        .eq('id', admissionId)
      if (error) throw error
      const { error: bedErr } = await supabase.from('beds').update({ status: 'cleaning' }).eq('id', adm.bedId)
      if (bedErr) throw bedErr
      return
    }

    await db.admissions.update(admissionId, { status: 'discharged', dischargedAt })
    await db.beds.update(adm.bedId, { status: 'cleaning' })
  },

  async markBedAvailable(bedId: number): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('beds').update({ status: 'available' }).eq('id', bedId)
      if (error) throw error
      return
    }
    await db.beds.update(bedId, { status: 'available' })
  },

  // ── Clinical chart (vitals / problems) ───────────────────
  async getVitalSigns(patientId: number): Promise<VitalSign[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('vital_signs')
        .select('*')
        .eq('patient_id', patientId)
        .order('recorded_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map(mapVitalSign)
    }
    return (await db.vitalSigns.where('patientId').equals(patientId).toArray()).sort((a, b) =>
      b.recordedAt.localeCompare(a.recordedAt),
    )
  },

  async addVitalSign(input: Omit<VitalSign, 'id'>): Promise<number> {
    if (!hasAnyVitalMeasurement(input)) {
      throw new Error('At least one vital measurement is required')
    }
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('vital_signs')
        .insert({
          patient_id: input.patientId,
          admission_id: input.admissionId ?? null,
          recorded_at: input.recordedAt,
          recorded_by: input.recordedBy ?? null,
          temperature_c: input.temperatureC ?? null,
          heart_rate: input.heartRate ?? null,
          respiratory_rate: input.respiratoryRate ?? null,
          systolic_bp: input.systolicBp ?? null,
          diastolic_bp: input.diastolicBp ?? null,
          spo2: input.spo2 ?? null,
          weight_kg: input.weightKg ?? null,
          height_cm: input.heightCm ?? null,
          notes: input.notes ?? null,
        })
        .select('id')
        .single()
      if (error) throw error
      return data.id
    }
    return db.vitalSigns.add(input as VitalSign)
  },

  async getProblems(patientId: number, status?: Problem['status']): Promise<Problem[]> {
    if (isSupabaseConfigured && supabase) {
      let q = supabase.from('problems').select('*').eq('patient_id', patientId).order('id', { ascending: false })
      if (status) q = q.eq('status', status)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []).map(mapProblem)
    }
    let rows = await db.problems.where('patientId').equals(patientId).toArray()
    if (status) rows = rows.filter((p) => p.status === status)
    return rows.sort((a, b) => b.id - a.id)
  },

  async addProblem(input: Omit<Problem, 'id'>): Promise<number> {
    if (!input.display?.trim()) throw new Error('Problem display name is required')
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('problems')
        .insert({
          patient_id: input.patientId,
          code: input.code ?? null,
          display: input.display.trim(),
          status: input.status ?? 'active',
          severity: input.severity ?? null,
          onset_date: input.onsetDate ?? null,
          resolved_date: input.resolvedDate ?? null,
          notes: input.notes ?? null,
          recorded_by: input.recordedBy ?? null,
        })
        .select('id')
        .single()
      if (error) throw error
      return data.id
    }
    return db.problems.add(input as Problem)
  },

  async updateProblemStatus(
    id: number,
    status: Problem['status'],
    resolvedDate?: string,
  ): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const patch: Record<string, unknown> = { status }
      if (status === 'resolved') patch.resolved_date = resolvedDate ?? new Date().toISOString().slice(0, 10)
      if (status === 'active') patch.resolved_date = null
      const { error } = await supabase.from('problems').update(patch).eq('id', id)
      if (error) throw error
      return
    }
    const existing = await db.problems.get(id)
    const err = status === 'resolved' ? canResolveProblem(existing) : null
    if (err) throw new Error(err)
    await db.problems.update(id, {
      status,
      resolvedDate:
        status === 'resolved'
          ? resolvedDate ?? new Date().toISOString().slice(0, 10)
          : undefined,
    })
  },

  // ── CPOE / clinical orders ───────────────────────────────
  async getClinicalOrders(opts?: {
    patientId?: number
    status?: ClinicalOrder['status']
    orderType?: ClinicalOrder['orderType']
  }): Promise<ClinicalOrder[]> {
    if (isSupabaseConfigured && supabase) {
      let q = supabase.from('clinical_orders').select('*').order('ordered_at', { ascending: false })
      if (opts?.patientId) q = q.eq('patient_id', opts.patientId)
      if (opts?.status) q = q.eq('status', opts.status)
      if (opts?.orderType) q = q.eq('order_type', opts.orderType)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []).map(mapClinicalOrder)
    }
    let rows = await db.clinicalOrders.toArray()
    if (opts?.patientId) rows = rows.filter((o) => o.patientId === opts.patientId)
    if (opts?.status) rows = rows.filter((o) => o.status === opts.status)
    if (opts?.orderType) rows = rows.filter((o) => o.orderType === opts.orderType)
    return rows.sort((a, b) => b.orderedAt.localeCompare(a.orderedAt))
  },

  async placeClinicalOrder(input: {
    patientId: number
    patientName: string
    orderType: ClinicalOrder['orderType']
    priority?: ClinicalOrder['priority']
    description: string
    code?: string
    medicineId?: number
    quantity?: number
    orderedBy?: string
    notes?: string
    acknowledgeAllergy?: boolean
  }): Promise<{ id: number; allergyAlert?: string }> {
    const err = canPlaceOrder(input)
    if (err) throw new Error(err)

    let allergyAlert: string | undefined
    let medicineName = input.description
    if (input.orderType === 'pharmacy' && input.medicineId) {
      const medicines = await this.getMedicines()
      const med = medicines.find((m) => m.id === input.medicineId)
      if (!med) throw new Error('Medicine not found')
      medicineName = med.name
      const patient = (await this.getPatients()).find((p) => p.id === input.patientId)
      const alert = checkDrugAllergyAlert(med.name, patient?.allergies)
      if (alert) {
        allergyAlert = alert
        if (!input.acknowledgeAllergy) {
          throw new Error(alert)
        }
      }
    }

    const orderedAt = new Date().toISOString()
    const description = input.orderType === 'pharmacy' ? medicineName : input.description.trim()
    let linkedLabTestId: number | undefined
    let linkedPharmacyOrderId: number | undefined

    if (input.orderType === 'lab') {
      linkedLabTestId = await this.addLabTest({
        patientId: input.patientId,
        patientName: input.patientName,
        testName: description,
        category: 'CPOE',
        date: orderedAt.slice(0, 10),
        status: 'ordered',
      })
    }
    if (input.orderType === 'pharmacy' && input.medicineId) {
      linkedPharmacyOrderId = await this.addPharmacyOrder({
        patientId: input.patientId,
        patientName: input.patientName,
        medicineId: input.medicineId,
        medicineName,
        quantity: input.quantity ?? 1,
        date: orderedAt.slice(0, 10),
        status: 'pending',
      })
    }

    const row: Omit<ClinicalOrder, 'id'> = {
      patientId: input.patientId,
      patientName: input.patientName,
      orderType: input.orderType,
      status: 'ordered',
      priority: input.priority ?? 'routine',
      description,
      code: input.code,
      medicineId: input.medicineId,
      quantity: input.quantity,
      orderedBy: input.orderedBy,
      orderedAt,
      notes: input.notes,
      allergyAlert,
      linkedLabTestId,
      linkedPharmacyOrderId,
    }

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('clinical_orders')
        .insert({
          patient_id: row.patientId,
          patient_name: row.patientName,
          order_type: row.orderType,
          status: row.status,
          priority: row.priority,
          description: row.description,
          code: row.code ?? null,
          medicine_id: row.medicineId ?? null,
          quantity: row.quantity ?? null,
          ordered_by: row.orderedBy ?? null,
          ordered_at: row.orderedAt,
          notes: row.notes ?? null,
          allergy_alert: row.allergyAlert ?? null,
          linked_lab_test_id: row.linkedLabTestId ?? null,
          linked_pharmacy_order_id: row.linkedPharmacyOrderId ?? null,
        })
        .select('id')
        .single()
      if (error) throw error
      if (input.orderType === 'pharmacy') {
        await this.scheduleMar({
          patientId: input.patientId,
          patientName: input.patientName,
          medicineName: description,
          dose: `${input.quantity ?? 1} unit(s)`,
          route: 'oral',
          scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          clinicalOrderId: data.id,
          pharmacyOrderId: linkedPharmacyOrderId,
        })
      }
      return { id: data.id, allergyAlert }
    }

    const id = await db.clinicalOrders.add(row as ClinicalOrder)
    if (input.orderType === 'pharmacy') {
      await this.scheduleMar({
        patientId: input.patientId,
        patientName: input.patientName,
        medicineName: description,
        dose: `${input.quantity ?? 1} unit(s)`,
        route: 'oral',
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        clinicalOrderId: id,
        pharmacyOrderId: linkedPharmacyOrderId,
      })
    }
    return { id, allergyAlert }
  },

  async updateClinicalOrderStatus(id: number, status: ClinicalOrder['status']): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('clinical_orders').update({ status }).eq('id', id)
      if (error) throw error
      return
    }
    await db.clinicalOrders.update(id, { status })
  },

  // ── eMAR ─────────────────────────────────────────────────
  async getMarEntries(opts?: {
    patientId?: number
    status?: MedicationAdministration['status']
  }): Promise<MedicationAdministration[]> {
    if (isSupabaseConfigured && supabase) {
      let q = supabase
        .from('medication_administrations')
        .select('*')
        .order('scheduled_at', { ascending: true })
      if (opts?.patientId) q = q.eq('patient_id', opts.patientId)
      if (opts?.status) q = q.eq('status', opts.status)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []).map(mapMar)
    }
    let rows = await db.medicationAdministrations.toArray()
    if (opts?.patientId) rows = rows.filter((r) => r.patientId === opts.patientId)
    if (opts?.status) rows = rows.filter((r) => r.status === opts.status)
    return rows.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  },

  async scheduleMar(input: Omit<MedicationAdministration, 'id' | 'status'> & { status?: MedicationAdministration['status'] }): Promise<number> {
    if (!input.medicineName?.trim() || !input.dose?.trim()) {
      throw new Error('Medicine name and dose required')
    }
    const status = input.status ?? 'scheduled'
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('medication_administrations')
        .insert({
          patient_id: input.patientId,
          patient_name: input.patientName,
          medicine_name: input.medicineName,
          dose: input.dose,
          route: input.route ?? 'oral',
          scheduled_at: input.scheduledAt,
          status,
          notes: input.notes ?? null,
          clinical_order_id: input.clinicalOrderId ?? null,
          pharmacy_order_id: input.pharmacyOrderId ?? null,
        })
        .select('id')
        .single()
      if (error) throw error
      return data.id
    }
    return db.medicationAdministrations.add({
      ...input,
      route: input.route ?? 'oral',
      status,
    } as MedicationAdministration)
  },

  async updateMarStatus(
    id: number,
    status: MedicationAdministration['status'],
    administeredBy?: string,
    notes?: string,
  ): Promise<void> {
    const entries = await this.getMarEntries()
    const entry = entries.find((e) => e.id === id)
    const err = canAdminister(entry?.status)
    if (err) throw new Error(err)

    const administeredAt = new Date().toISOString()

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('medication_administrations')
        .update({
          status,
          administered_at: administeredAt,
          administered_by: administeredBy ?? null,
          notes: notes ?? entry?.notes ?? null,
        })
        .eq('id', id)
      if (error) throw error
      return
    }
    await db.medicationAdministrations.update(id, {
      status,
      administeredAt,
      administeredBy,
      notes: notes ?? entry?.notes,
    })
  },

  // ── Medicines ────────────────────────────────────────────
  async getMedicines(): Promise<Medicine[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('medicines').select('*').order('id')
      if (error) throw error
      return data.map(mapMedicine)
    }
    return db.medicines.toArray()
  },

  async addMedicine(medicine: Omit<Medicine, 'id'>): Promise<number> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('medicines')
        .insert({
          name: medicine.name,
          category: medicine.category,
          stock: medicine.stock,
          unit_price: medicine.unitPrice,
          expiry_date: medicine.expiryDate,
        })
        .select('id')
        .single()
      if (error) throw error
      return data.id
    }
    return db.medicines.add(medicine as Medicine)
  },

  async updateMedicineStock(id: number, stock: number): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('medicines').update({ stock }).eq('id', id)
      if (error) throw error
      return
    }
    await db.medicines.update(id, { stock })
  },

  // ── Pharmacy Orders ──────────────────────────────────────
  async getPharmacyOrders(): Promise<PharmacyOrder[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('pharmacy_orders').select('*').order('id')
      if (error) throw error
      return data.map(mapPharmacyOrder)
    }
    return db.pharmacyOrders.toArray()
  },

  async addPharmacyOrder(order: Omit<PharmacyOrder, 'id'>): Promise<number> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('pharmacy_orders')
        .insert({
          patient_id: order.patientId,
          patient_name: order.patientName,
          medicine_id: order.medicineId,
          medicine_name: order.medicineName,
          quantity: order.quantity,
          date: order.date,
          status: order.status,
        })
        .select('id')
        .single()
      if (error) throw error
      return data.id
    }
    return db.pharmacyOrders.add(order as PharmacyOrder)
  },

  async updatePharmacyOrderStatus(id: number, status: PharmacyOrder['status']): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('pharmacy_orders').update({ status }).eq('id', id)
      if (error) throw error
      return
    }
    await db.pharmacyOrders.update(id, { status })
  },

  // ── Lab Tests ────────────────────────────────────────────
  async getLabTests(): Promise<LabTest[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('lab_tests').select('*').order('id')
      if (error) throw error
      return data.map(mapLabTest)
    }
    return db.labTests.toArray()
  },

  async addLabTest(test: Omit<LabTest, 'id'>): Promise<number> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('lab_tests')
        .insert({
          patient_id: test.patientId,
          patient_name: test.patientName,
          test_name: test.testName,
          category: test.category,
          date: test.date,
          status: test.status,
          result: test.result,
        })
        .select('id')
        .single()
      if (error) throw error
      return data.id
    }
    return db.labTests.add(test as LabTest)
  },

  async updateLabTestStatus(
    id: number,
    status: LabTest['status'],
    result?: string,
  ): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const update: Record<string, unknown> = { status }
      if (result !== undefined) update.result = result
      const { error } = await supabase.from('lab_tests').update(update).eq('id', id)
      if (error) throw error
      return
    }
    await db.labTests.update(id, result !== undefined ? { status, result } : { status })
  },

  // ── Audit Log ────────────────────────────────────────────
  async logAudit(
    action: string,
    tableName: string,
    recordId?: string | number,
    details?: Record<string, unknown>,
  ): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { data: userData } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userData.user?.id ?? '')
        .single()

      await supabase.from('audit_log').insert({
        user_id: userData.user?.id ?? null,
        user_name: profile?.name ?? null,
        action,
        table_name: tableName,
        record_id: recordId != null ? String(recordId) : null,
        details: details ?? {},
      })
    }
    // No-op in demo mode
  },

  async getAuditLog(limit = 50): Promise<Array<{
    id: number
    userName: string | null
    action: string
    tableName: string
    recordId: string | null
    details: Record<string, unknown>
    createdAt: string
  }>> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data.map((r) => ({
        id: r.id,
        userName: r.user_name,
        action: r.action,
        tableName: r.table_name,
        recordId: r.record_id,
        details: r.details,
        createdAt: r.created_at,
      }))
    }
    return []
  },

  // ── GDPR Right to Erasure ────────────────────────────────
  async rightToErasure(patientId: number): Promise<{ deleted: string[]; errors: string[] }> {
    const deleted: string[] = []
    const errors: string[] = []
    // Table names must match supabase/schema.sql
    const tables = [
      'visits',
      'medications',
      'notes',
      'medical_files',
      'lab_tests',
      'appointments',
      'invoices',
      'pharmacy_orders',
    ] as const

    if (isSupabaseConfigured && supabase) {
      // Remove storage objects under patient folder when possible
      try {
        const { data: objects } = await supabase.storage.from('medical-files').list(String(patientId))
        if (objects?.length) {
          const paths = objects.map((o) => `${patientId}/${o.name}`)
          await supabase.storage.from('medical-files').remove(paths)
          deleted.push('storage:medical-files')
        }
      } catch (e) {
        errors.push(`storage:medical-files: ${String(e)}`)
      }

      for (const table of tables) {
        try {
          const { error } = await supabase.from(table).delete().eq('patient_id', patientId)
          if (error) {
            errors.push(`${table}: ${error.message}`)
          } else {
            deleted.push(table)
          }
        } catch (e) {
          errors.push(`${table}: ${String(e)}`)
        }
      }

      try {
        const { error } = await supabase.from('patients').delete().eq('id', patientId)
        if (error) errors.push(`patients: ${error.message}`)
        else deleted.push('patients')
      } catch (e) {
        errors.push(`patients: ${String(e)}`)
      }

      try {
        await this.logAudit('delete', 'patients', patientId, { gdpr_erasure: true, deleted_tables: deleted })
      } catch {
        // Audit log failure should not block erasure
      }
    } else {
      // Demo mode — delete from local DB
      try {
        await db.appointments.where('patientId').equals(patientId).delete()
        deleted.push('appointments')
      } catch (e) {
        errors.push(`appointments: ${String(e)}`)
      }
      try {
        await db.visits.where('patientId').equals(patientId).delete()
        deleted.push('visits')
      } catch (e) {
        errors.push(`visits: ${String(e)}`)
      }
      try {
        await db.medications.where('patientId').equals(patientId).delete()
        deleted.push('medications')
      } catch (e) {
        errors.push(`medications: ${String(e)}`)
      }
      try {
        await db.notes.where('patientId').equals(patientId).delete()
        deleted.push('notes')
      } catch (e) {
        errors.push(`notes: ${String(e)}`)
      }
      try {
        await db.files.where('patientId').equals(patientId).delete()
        deleted.push('medical_files')
      } catch (e) {
        errors.push(`medical_files: ${String(e)}`)
      }
      try {
        await db.patients.delete(patientId)
        deleted.push('patients')
      } catch (e) {
        errors.push(`patients: ${String(e)}`)
      }
    }

    return { deleted, errors }
  },
}
