import Dexie, { type Table } from 'dexie'
import { Patient, Doctor, Appointment, ClinicalVisit, Medication, ClinicalNote, MedicalFile } from '../types'

export class HospitalDatabase extends Dexie {
  patients!: Table<Patient, number>
  doctors!: Table<Doctor, number>
  appointments!: Table<Appointment, number>
  visits!: Table<ClinicalVisit, string>
  medications!: Table<Medication, string>
  notes!: Table<ClinicalNote, string>
  files!: Table<MedicalFile, string>

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
  }
}

export const db = new HospitalDatabase()
