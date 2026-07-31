import { db } from './db'
import { patients, doctors, appointments, patientRecords } from '../data/mockData'

export async function seedDatabase() {
  const patientCount = await db.patients.count()
  if (patientCount > 0) return // Already seeded

  console.log('Seeding database with initial mock data...')

  // Seed Patients
  for (const p of patients) {
    await db.patients.add({
      id: p.id,
      name: p.name,
      age: p.age,
      phone: p.phone,
      condition: p.condition,
      lastVisit: p.lastVisit,
      bloodType: patientRecords[p.id]?.bloodType || 'Unknown',
      allergies: patientRecords[p.id]?.allergies || [],
    })
  }

  // Seed Doctors
  for (const d of doctors) {
    await db.doctors.add({
      id: d.id,
      name: d.name,
      specialty: d.specialty,
      available: d.available,
      patients: d.patients,
      rating: d.rating,
    })
  }

  // Seed Appointments
  for (const a of appointments) {
    const patientDoc = patients.find((p) => p.name === a.patient)
    const doctorDoc = doctors.find((d) => d.name === a.doctor)

    if (patientDoc && doctorDoc) {
      await db.appointments.add({
        id: a.id,
        patientId: patientDoc.id,
        doctorId: doctorDoc.id,
        patientName: a.patient,
        doctorName: a.doctor,
        date: a.date.split(' ')[0],
        time: a.date.split(' ')[1],
        status: a.status,
      })
    }
  }

  // Seed EHR Data
  for (const patientIdStr of Object.keys(patientRecords)) {
    const pId = Number(patientIdStr)
    const record = patientRecords[pId]

    for (const history of record.history || []) {
      await db.visits.add({
        id: crypto.randomUUID(),
        patientId: pId,
        doctorId: 1, // default mock
        date: history.date,
        title: history.title,
        notes: history.notes,
      })
    }

    for (const med of record.medications || []) {
      await db.medications.add({
        id: crypto.randomUUID(),
        patientId: pId,
        name: med.name,
        dosage: med.dosage,
        startDate: med.startDate,
      })
    }

    for (const note of record.notes || []) {
      await db.notes.add({
        id: crypto.randomUUID(),
        patientId: pId,
        date: note.date,
        text: note.text,
      })
    }

    for (const file of record.files || []) {
      await db.files.add({
        id: crypto.randomUUID(),
        patientId: pId,
        name: file.name,
        url: '#',
        date: file.date,
        size: 1024,
      })
    }
  }

  console.log('Seeding complete!')
}
