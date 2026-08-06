import { describe, expect, it } from 'vitest'
import {
  mapPatientToFhir,
  mapInvoiceToFhir,
  mapAccountToFhir,
  mapEncounterToFhir,
  mapObservationToFhir,
  mapMedicationRequestToFhir,
  mapConditionToFhir,
  mapVitalSignToFhirObservation,
  mapServiceRequestToFhir,
  capabilityStatement,
} from './fhirMappers'

describe('fhirMappers', () => {
  it('maps Patient resource', () => {
    const r = mapPatientToFhir({ id: 101, name: 'Test', phone: '+1', condition: 'HTN' })
    expect(r.resourceType).toBe('Patient')
    expect(r.id).toBe('101')
  })

  it('maps Invoice resource', () => {
    const r = mapInvoiceToFhir({
      id: 5,
      patientId: 101,
      patientName: 'Test',
      date: '2026-08-01',
      items: [{ description: 'Visit', quantity: 1, unitPrice: 100 }],
      status: 'unpaid',
      paidAmount: 0,
      currency: 'USD',
    })
    expect(r.resourceType).toBe('Invoice')
    expect((r.totalNet as { value: number }).value).toBe(100)
  })

  it('maps Account with balance', () => {
    const r = mapAccountToFhir(
      101,
      'Test',
      [{
        id: 5,
        patientId: 101,
        patientName: 'Test',
        date: '2026-08-01',
        items: [{ description: 'Visit', quantity: 1, unitPrice: 100 }],
        status: 'unpaid',
        paidAmount: 0,
      }],
      [],
    )
    expect(r.resourceType).toBe('Account')
    expect(r.status).toBe('active')
  })

  it('maps Encounter and Observation', () => {
    const enc = mapEncounterToFhir({
      id: 1,
      patientId: 101,
      patientName: 'Test',
      doctorId: 1,
      doctorName: 'Dr',
      date: '2026-08-01T09:00',
      status: 'confirmed',
    })
    expect(enc.resourceType).toBe('Encounter')
    expect((enc.class as { code: string }).code).toBe('AMB')

    const imp = mapEncounterToFhir({
      id: 'adm-1',
      patientId: 103,
      patientName: 'Inpatient',
      date: '2026-08-01T10:00:00Z',
      status: 'admitted',
      title: 'Diabetes',
      classCode: 'IMP',
    })
    expect((imp.class as { code: string }).code).toBe('IMP')
    expect(imp.status).toBe('in-progress')

    const obs = mapObservationToFhir({
      id: 1,
      patientId: 101,
      testName: 'CBC',
      date: '2026-08-01',
      status: 'completed',
      result: 'OK',
    })
    expect(obs.resourceType).toBe('Observation')
    expect(obs.status).toBe('final')
  })

  it('maps MedicationRequest', () => {
    const r = mapMedicationRequestToFhir({
      id: 'm1',
      patientId: 101,
      name: 'Metformin',
      dosage: '500mg',
      startDate: '2026-01-01',
    })
    expect(r.resourceType).toBe('MedicationRequest')
  })

  it('maps Condition and vital Observation', () => {
    const c = mapConditionToFhir({
      id: 'cond-1',
      patientId: 103,
      display: 'Type 2 diabetes',
      code: 'E11.9',
      status: 'active',
    })
    expect(c.resourceType).toBe('Condition')
    const vs = mapVitalSignToFhirObservation({
      id: 1,
      patientId: 103,
      recordedAt: '2026-08-01T10:00:00Z',
      temperatureC: 37,
      heartRate: 80,
    })
    expect(vs.resourceType).toBe('Observation')
    expect(vs.id).toBe('vs-1')
    expect((vs.category as { coding: { code: string }[] }[])[0].coding[0].code).toBe('vital-signs')
  })

  it('maps ServiceRequest', () => {
    const sr = mapServiceRequestToFhir({
      id: 'sr-1',
      patientId: 103,
      description: 'Chest X-ray',
      code: '71045',
      status: 'ordered',
      priority: 'urgent',
      orderType: 'imaging',
      orderedAt: '2026-08-01T10:00:00Z',
    })
    expect(sr.resourceType).toBe('ServiceRequest')
    expect(sr.status).toBe('active')
  })

  it('returns CapabilityStatement', () => {
    expect(capabilityStatement().resourceType).toBe('CapabilityStatement')
    const resources = (capabilityStatement().rest as { resource: { type: string }[] }[])[0].resource.map((r) => r.type)
    expect(resources).toContain('Condition')
    expect(resources).toContain('ServiceRequest')
  })
})
