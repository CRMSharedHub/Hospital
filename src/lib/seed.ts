import { db } from './db'
import { isSupabaseConfigured } from './supabase'
import { patients, doctors, appointments, patientRecords, seedInvoices, seedMedicines, seedPharmacyOrders, seedLabTests } from '../data/mockData'
import { SEED_WARDS, seedBedsWithDemoOccupancy, SEED_ADMISSIONS } from '../data/adtSeed'
import { SEED_VITALS, SEED_PROBLEMS } from '../data/clinicalSeed'
import { SEED_CLINICAL_ORDERS } from '../data/cpoeSeed'
import { SEED_MAR } from '../data/emarSeed'

export async function seedDatabase() {
  if (isSupabaseConfigured) return // Supabase handles its own seeding via SQL

  const patientCount = await db.patients.count()
  if (patientCount === 0) {
    console.log('Seeding database with initial mock data...')

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

    for (const patientIdStr of Object.keys(patientRecords)) {
      const pId = Number(patientIdStr)
      const record = patientRecords[pId]

      for (const history of record.history || []) {
        await db.visits.add({
          id: crypto.randomUUID(),
          patientId: pId,
          doctorId: 1,
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

    for (const inv of seedInvoices) {
      await db.invoices.add(inv)
    }
    for (const med of seedMedicines) {
      await db.medicines.add(med)
    }
    for (const order of seedPharmacyOrders) {
      await db.pharmacyOrders.add(order)
    }
    for (const test of seedLabTests) {
      await db.labTests.add(test)
    }
    console.log('Seeding complete!')
  }

  // ADT seed (also for DBs that already had patients before B1)
  const wardCount = await db.wards.count()
  if (wardCount === 0) {
    for (const w of SEED_WARDS) await db.wards.add(w)
    for (const b of seedBedsWithDemoOccupancy()) await db.beds.add(b)
    for (const a of SEED_ADMISSIONS) await db.admissions.add(a)
  }

  // Clinical chart seed (B2)
  const vitalsCount = await db.vitalSigns.count()
  if (vitalsCount === 0) {
    for (const v of SEED_VITALS) await db.vitalSigns.add(v)
  }
  const problemsCount = await db.problems.count()
  if (problemsCount === 0) {
    for (const p of SEED_PROBLEMS) await db.problems.add(p)
  }

  const ordersCount = await db.clinicalOrders.count()
  if (ordersCount === 0) {
    for (const o of SEED_CLINICAL_ORDERS) await db.clinicalOrders.add(o)
  }

  const marCount = await db.medicationAdministrations.count()
  if (marCount === 0) {
    for (const m of SEED_MAR) await db.medicationAdministrations.add(m)
  }
}
