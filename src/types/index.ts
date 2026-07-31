export interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'doctor' | 'nurse' | 'patient'
  avatar?: string
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
