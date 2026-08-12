import Dexie, { type Table } from 'dexie'
import {
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
  Facility,
  FacilityMembership,
  ComplianceAttestation,
} from '../types'
import type { CdsAllergyRule, CdsDrugInteractionRule } from './cdsTypes'
import type { QueuedMutation } from './offlineQueue'

export class HospitalDatabase extends Dexie {
  patients!: Table<Patient, number>
  doctors!: Table<Doctor, number>
  appointments!: Table<Appointment, number>
  visits!: Table<ClinicalVisit, string>
  medications!: Table<Medication, string>
  notes!: Table<ClinicalNote, string>
  files!: Table<MedicalFile, string>
  invoices!: Table<Invoice, number>
  medicines!: Table<Medicine, number>
  pharmacyOrders!: Table<PharmacyOrder, number>
  labTests!: Table<LabTest, number>
  payments!: Table<Payment, number>
  claims!: Table<Claim, number>
  remittances!: Table<Remittance, number>
  wards!: Table<Ward, number>
  beds!: Table<Bed, number>
  admissions!: Table<Admission, number>
  vitalSigns!: Table<VitalSign, number>
  problems!: Table<Problem, number>
  clinicalOrders!: Table<ClinicalOrder, number>
  medicationAdministrations!: Table<MedicationAdministration, number>
  patientMessages!: Table<PatientMessage, number>
  facilities!: Table<Facility, number>
  facilityMemberships!: Table<FacilityMembership, number>
  complianceAttestations!: Table<ComplianceAttestation, number>
  cdsDrugInteractions!: Table<CdsDrugInteractionRule, number>
  cdsAllergyRules!: Table<CdsAllergyRule, number>
  mutationQueue!: Table<QueuedMutation, string>

  constructor() {
    super('HospitalDB')
    this.version(1).stores({
      patients: '++id, name, phone',
      doctors: '++id, name, specialty',
      appointments: '++id, patientId, doctorId, date, status',
      visits: 'id, patientId, doctorId, date',
      medications: 'id, patientId',
      notes: 'id, patientId',
      files: 'id, patientId',
    })
    this.version(2).stores({
      patients: '++id, name, phone',
      doctors: '++id, name, specialty',
      appointments: '++id, patientId, doctorId, date, status',
      visits: 'id, patientId, doctorId, date',
      medications: 'id, patientId',
      notes: 'id, patientId',
      files: 'id, patientId',
      invoices: '++id, patientId, date, status',
      medicines: '++id, name, category',
      pharmacyOrders: '++id, patientId, medicineId, date, status',
      labTests: '++id, patientId, date, status',
    })
    this.version(3).stores({
      patients: '++id, name, phone',
      doctors: '++id, name, specialty',
      appointments: '++id, patientId, doctorId, date, status',
      visits: 'id, patientId, doctorId, date',
      medications: 'id, patientId',
      notes: 'id, patientId',
      files: 'id, patientId',
      invoices: '++id, patientId, date, status',
      medicines: '++id, name, category',
      pharmacyOrders: '++id, patientId, medicineId, date, status',
      labTests: '++id, patientId, date, status',
      payments: '++id, invoiceId, patientId, status, providerRef',
      claims: '++id, invoiceId, patientId, status',
    })
    this.version(4).stores({
      patients: '++id, name, phone',
      doctors: '++id, name, specialty',
      appointments: '++id, patientId, doctorId, date, status',
      visits: 'id, patientId, doctorId, date',
      medications: 'id, patientId',
      notes: 'id, patientId',
      files: 'id, patientId',
      invoices: '++id, patientId, date, status',
      medicines: '++id, name, category',
      pharmacyOrders: '++id, patientId, medicineId, date, status',
      labTests: '++id, patientId, date, status',
      payments: '++id, invoiceId, patientId, status, providerRef',
      claims: '++id, invoiceId, patientId, status',
      remittances: '++id, claimId, status',
    })
    this.version(5).stores({
      patients: '++id, name, phone',
      doctors: '++id, name, specialty',
      appointments: '++id, patientId, doctorId, date, status',
      visits: 'id, patientId, doctorId, date',
      medications: 'id, patientId',
      notes: 'id, patientId',
      files: 'id, patientId',
      invoices: '++id, patientId, date, status',
      medicines: '++id, name, category',
      pharmacyOrders: '++id, patientId, medicineId, date, status',
      labTests: '++id, patientId, date, status',
      payments: '++id, invoiceId, patientId, status, providerRef',
      claims: '++id, invoiceId, patientId, status',
      remittances: '++id, claimId, status',
      wards: '++id, code',
      beds: '++id, wardId, status',
      admissions: '++id, patientId, bedId, wardId, status',
    })
    this.version(6).stores({
      patients: '++id, name, phone',
      doctors: '++id, name, specialty',
      appointments: '++id, patientId, doctorId, date, status',
      visits: 'id, patientId, doctorId, date',
      medications: 'id, patientId',
      notes: 'id, patientId',
      files: 'id, patientId',
      invoices: '++id, patientId, date, status',
      medicines: '++id, name, category',
      pharmacyOrders: '++id, patientId, medicineId, date, status',
      labTests: '++id, patientId, date, status',
      payments: '++id, invoiceId, patientId, status, providerRef',
      claims: '++id, invoiceId, patientId, status',
      remittances: '++id, claimId, status',
      wards: '++id, code',
      beds: '++id, wardId, status',
      admissions: '++id, patientId, bedId, wardId, status',
      vitalSigns: '++id, patientId, recordedAt',
      problems: '++id, patientId, status',
    })
    this.version(7).stores({
      patients: '++id, name, phone',
      doctors: '++id, name, specialty',
      appointments: '++id, patientId, doctorId, date, status',
      visits: 'id, patientId, doctorId, date',
      medications: 'id, patientId',
      notes: 'id, patientId',
      files: 'id, patientId',
      invoices: '++id, patientId, date, status',
      medicines: '++id, name, category',
      pharmacyOrders: '++id, patientId, medicineId, date, status',
      labTests: '++id, patientId, date, status',
      payments: '++id, invoiceId, patientId, status, providerRef',
      claims: '++id, invoiceId, patientId, status',
      remittances: '++id, claimId, status',
      wards: '++id, code',
      beds: '++id, wardId, status',
      admissions: '++id, patientId, bedId, wardId, status',
      vitalSigns: '++id, patientId, recordedAt',
      problems: '++id, patientId, status',
      clinicalOrders: '++id, patientId, orderType, status, orderedAt',
    })
    this.version(8).stores({
      patients: '++id, name, phone',
      doctors: '++id, name, specialty',
      appointments: '++id, patientId, doctorId, date, status',
      visits: 'id, patientId, doctorId, date',
      medications: 'id, patientId',
      notes: 'id, patientId',
      files: 'id, patientId',
      invoices: '++id, patientId, date, status',
      medicines: '++id, name, category',
      pharmacyOrders: '++id, patientId, medicineId, date, status',
      labTests: '++id, patientId, date, status',
      payments: '++id, invoiceId, patientId, status, providerRef',
      claims: '++id, invoiceId, patientId, status',
      remittances: '++id, claimId, status',
      wards: '++id, code',
      beds: '++id, wardId, status',
      admissions: '++id, patientId, bedId, wardId, status',
      vitalSigns: '++id, patientId, recordedAt',
      problems: '++id, patientId, status',
      clinicalOrders: '++id, patientId, orderType, status, orderedAt',
      medicationAdministrations: '++id, patientId, status, scheduledAt',
    })
    this.version(9).stores({
      patients: '++id, name, phone',
      doctors: '++id, name, specialty',
      appointments: '++id, patientId, doctorId, date, status',
      visits: 'id, patientId, doctorId, date',
      medications: 'id, patientId',
      notes: 'id, patientId',
      files: 'id, patientId',
      invoices: '++id, patientId, date, status',
      medicines: '++id, name, category',
      pharmacyOrders: '++id, patientId, medicineId, date, status',
      labTests: '++id, patientId, date, status',
      payments: '++id, invoiceId, patientId, status, providerRef',
      claims: '++id, invoiceId, patientId, status',
      remittances: '++id, claimId, status',
      wards: '++id, code',
      beds: '++id, wardId, status',
      admissions: '++id, patientId, bedId, wardId, status',
      vitalSigns: '++id, patientId, recordedAt',
      problems: '++id, patientId, status',
      clinicalOrders: '++id, patientId, orderType, status, orderedAt',
      medicationAdministrations: '++id, patientId, status, scheduledAt',
      patientMessages: '++id, patientId, createdAt',
    })
    this.version(10).stores({
      patients: '++id, name, phone, facilityId',
      doctors: '++id, name, specialty',
      appointments: '++id, patientId, doctorId, date, status',
      visits: 'id, patientId, doctorId, date',
      medications: 'id, patientId',
      notes: 'id, patientId',
      files: 'id, patientId',
      invoices: '++id, patientId, date, status',
      medicines: '++id, name, category',
      pharmacyOrders: '++id, patientId, medicineId, date, status',
      labTests: '++id, patientId, date, status',
      payments: '++id, invoiceId, patientId, status, providerRef',
      claims: '++id, invoiceId, patientId, status',
      remittances: '++id, claimId, status',
      wards: '++id, code',
      beds: '++id, wardId, status',
      admissions: '++id, patientId, bedId, wardId, status',
      vitalSigns: '++id, patientId, recordedAt',
      problems: '++id, patientId, status',
      clinicalOrders: '++id, patientId, orderType, status, orderedAt',
      medicationAdministrations: '++id, patientId, status, scheduledAt',
      patientMessages: '++id, patientId, createdAt',
      facilities: '++id, code, active',
      facilityMemberships: '++id, userId, facilityId',
      complianceAttestations: '++id, key, status',
    })
    this.version(11).stores({
      patients: '++id, name, phone, facilityId',
      doctors: '++id, name, specialty',
      appointments: '++id, patientId, doctorId, date, status',
      visits: 'id, patientId, doctorId, date',
      medications: 'id, patientId',
      notes: 'id, patientId',
      files: 'id, patientId',
      invoices: '++id, patientId, date, status',
      medicines: '++id, name, category',
      pharmacyOrders: '++id, patientId, medicineId, date, status',
      labTests: '++id, patientId, date, status',
      payments: '++id, invoiceId, patientId, status, providerRef',
      claims: '++id, invoiceId, patientId, status',
      remittances: '++id, claimId, status',
      wards: '++id, code',
      beds: '++id, wardId, status',
      admissions: '++id, patientId, bedId, wardId, status',
      vitalSigns: '++id, patientId, recordedAt',
      problems: '++id, patientId, status',
      clinicalOrders: '++id, patientId, orderType, status, orderedAt',
      medicationAdministrations: '++id, patientId, status, scheduledAt',
      patientMessages: '++id, patientId, createdAt',
      facilities: '++id, code, active',
      facilityMemberships: '++id, userId, facilityId',
      complianceAttestations: '++id, key, status',
      cdsDrugInteractions: '++id, drugA, drugB, active',
      cdsAllergyRules: '++id, allergyKey, active',
    })
    this.version(12).stores({
      patients: '++id, name, phone, facilityId',
      doctors: '++id, name, specialty',
      appointments: '++id, patientId, doctorId, date, status',
      visits: 'id, patientId, doctorId, date',
      medications: 'id, patientId',
      notes: 'id, patientId',
      files: 'id, patientId',
      invoices: '++id, patientId, date, status',
      medicines: '++id, name, category',
      pharmacyOrders: '++id, patientId, medicineId, date, status',
      labTests: '++id, patientId, date, status',
      payments: '++id, invoiceId, patientId, status, providerRef',
      claims: '++id, invoiceId, patientId, status',
      remittances: '++id, claimId, status',
      wards: '++id, code',
      beds: '++id, wardId, status',
      admissions: '++id, patientId, bedId, wardId, status',
      vitalSigns: '++id, patientId, recordedAt',
      problems: '++id, patientId, status',
      clinicalOrders: '++id, patientId, orderType, status, orderedAt',
      medicationAdministrations: '++id, patientId, status, scheduledAt',
      patientMessages: '++id, patientId, createdAt',
      facilities: '++id, code, active',
      facilityMemberships: '++id, userId, facilityId',
      complianceAttestations: '++id, key, status',
      cdsDrugInteractions: '++id, drugA, drugB, active',
      cdsAllergyRules: '++id, allergyKey, active',
      mutationQueue: 'id, createdAt, status',
    })
  }
}

export const db = new HospitalDatabase()
