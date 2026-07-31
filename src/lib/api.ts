import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { db } from './db'
import type {
  Patient,
  Doctor,
  Appointment,
  ClinicalVisit,
  Medication,
  ClinicalNote,
  MedicalFile,
} from '../types'
import { toast } from 'sonner'

// Patients
export const usePatients = () => {
  return useQuery({
    queryKey: ['patients'],
    queryFn: () => db.patients.toArray(),
  })
}

export const usePatient = (id: number) => {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: () => db.patients.get(id),
    enabled: !!id,
  })
}

export const useAddPatient = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patient: Omit<Patient, 'id'>) => db.patients.add(patient as Patient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      toast.success('Patient added successfully')
    },
  })
}

// Doctors
export const useDoctors = () => {
  return useQuery({
    queryKey: ['doctors'],
    queryFn: () => db.doctors.toArray(),
  })
}

export const useDoctor = (id: number) => {
  return useQuery({
    queryKey: ['doctors', id],
    queryFn: () => db.doctors.get(id),
    enabled: !!id,
  })
}

export const useAddDoctor = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (doctor: Omit<Doctor, 'id'>) => db.doctors.add(doctor as Doctor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      toast.success('Doctor added successfully')
    },
  })
}

export const useUpdateDoctor = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (doctor: Doctor) => db.doctors.put(doctor),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      queryClient.invalidateQueries({ queryKey: ['doctors', variables.id] })
    },
  })
}

// Appointments
export const useAppointments = () => {
  return useQuery({
    queryKey: ['appointments'],
    queryFn: () => db.appointments.toArray(),
  })
}

export const useAddAppointment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (appointment: Omit<Appointment, 'id'>) => db.appointments.add(appointment as Appointment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast.success('Appointment booked successfully')
    },
  })
}

export const useUpdateAppointmentStatus = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: Appointment['status'] }) =>
      db.appointments.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast.success('Appointment status updated')
    },
  })
}

// EHR Modules
export const usePatientEHR = (patientId: number) => {
  const visits = useQuery({ queryKey: ['visits', patientId], queryFn: () => db.visits.where('patientId').equals(patientId).toArray() })
  const medications = useQuery({ queryKey: ['medications', patientId], queryFn: () => db.medications.where('patientId').equals(patientId).toArray() })
  const notes = useQuery({ queryKey: ['notes', patientId], queryFn: () => db.notes.where('patientId').equals(patientId).toArray() })
  const files = useQuery({ queryKey: ['files', patientId], queryFn: () => db.files.where('patientId').equals(patientId).toArray() })

  return { visits, medications, notes, files }
}

export const useAddClinicalVisit = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (visit: ClinicalVisit) => db.visits.add(visit),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['visits', vars.patientId] })
      toast.success('Visit record added')
    },
  })
}

export const useAddMedication = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (med: Medication) => db.medications.add(med),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['medications', vars.patientId] })
      toast.success('Medication added')
    },
  })
}

export const useAddClinicalNote = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (note: ClinicalNote) => db.notes.add(note),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['notes', vars.patientId] })
      toast.success('Clinical note saved')
    },
  })
}

export const useUploadMedicalFile = () => {
  const queryClient = useQueryClient()
  return useMutation({
    // Simulating file upload delay
    mutationFn: async (file: MedicalFile) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return db.files.add(file)
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['files', vars.patientId] })
      toast.success('File uploaded successfully')
    },
  })
}
