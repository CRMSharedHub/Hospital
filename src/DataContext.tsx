import React, { createContext, useContext, useState } from 'react'
import { doctors as initialDoctors, patients as initialPatients, appointments as initialAppointments, patientRecords as initialRecords } from './data/mockData'

const DataContext = createContext(null)

export function DataProvider({ children }) {
  const [doctors, setDoctors] = useState(initialDoctors)
  const [patients, setPatients] = useState(initialPatients)
  const [appointments, setAppointments] = useState(initialAppointments)
  const [patientRecords, setPatientRecords] = useState(initialRecords)

  const addDoctor = (doctor) => setDoctors((prev) => [doctor, ...prev])

  const updateDoctor = (updated) =>
    setDoctors((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))

  const addPatient = (patient) => {
    setPatients((prev) => [patient, ...prev])
    setPatientRecords((prev) => ({
      ...prev,
      [patient.id]: {
        bloodType: patient.bloodType || '-',
        allergies: patient.allergies ? patient.allergies.split(',').map((a) => a.trim()) : [],
        history: [],
        medications: [],
        notes: [],
        files: [],
      },
    }))
  }

  const addAppointment = (appointment) =>
    setAppointments((prev) => [appointment, ...prev])

  return (
    <DataContext.Provider
      value={{
        doctors,
        patients,
        appointments,
        patientRecords,
        addDoctor,
        updateDoctor,
        addPatient,
        addAppointment,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
