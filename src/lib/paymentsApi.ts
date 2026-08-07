import { supabase, isSupabaseConfigured } from './supabase'
import { dal } from './dal'
import { invoiceRemaining } from './billingMath'

export type PaymentSessionResult = {
  ok: boolean
  provider: 'stripe' | 'mock'
  paymentId: number
  providerRef?: string
  checkoutUrl: string
  amount: number
  currency: string
}

function paymentProvider(): 'stripe' | 'mock' {
  const env = import.meta.env.VITE_PAYMENT_PROVIDER as string | undefined
  if (env === 'stripe' || env === 'mock') return env
  return 'mock'
}

/**
 * Start a payment for an invoice. Uses Edge Function when Supabase is configured;
 * otherwise creates a local mock pending payment and returns an in-app confirm URL.
 */
export async function createPaymentSession(
  invoiceId: number,
  options?: { amount?: number },
): Promise<PaymentSessionResult> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.functions.invoke('payments', {
      body: {
        action: 'create_session',
        invoiceId,
        amount: options?.amount,
      },
    })
    if (error) throw new Error(error.message)
    if (data?.error) throw new Error(String(data.error))
    return data as PaymentSessionResult
  }

  const invoices = await dal.getInvoices()
  const inv = invoices.find((i) => i.id === invoiceId)
  if (!inv) throw new Error('Invoice not found')
  if (inv.status === 'paid') throw new Error('Invoice already paid')

  const remaining = invoiceRemaining(inv)
  const amount =
    options?.amount && options.amount > 0 && options.amount <= remaining
      ? options.amount
      : remaining
  if (amount <= 0) throw new Error('Nothing to pay')

  const payment = await dal.createLocalPendingPayment({
    invoiceId: inv.id,
    patientId: inv.patientId,
    amount,
    currency: inv.currency ?? 'USD',
  })

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return {
    ok: true,
    provider: 'mock',
    paymentId: payment.id,
    providerRef: payment.providerRef,
    checkoutUrl: `${origin}/portal?mockPay=${payment.id}&invoice=${invoiceId}`,
    amount,
    currency: payment.currency,
  }
}

export async function confirmMockPayment(paymentId: number): Promise<void> {
  if (isSupabaseConfigured && supabase && paymentProvider() !== 'mock') {
    // Still try Edge confirm_mock (works when Edge PAYMENT_PROVIDER=mock)
    const { data, error } = await supabase.functions.invoke('payments', {
      body: { action: 'confirm_mock', paymentId },
    })
    if (!error && data?.ok) return
    // Fall through to local confirm for demo hybrids
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.functions.invoke('payments', {
      body: { action: 'confirm_mock', paymentId },
    })
    if (!error && data?.ok) return
    if (error && !String(error.message).includes('Failed to send')) {
      // Edge may be undeployed — local confirm against tables if RLS allows
    }
  }

  await dal.confirmLocalMockPayment(paymentId)
}

export async function fetchFhirResource(body: {
  resourceType: string
  id?: string | number
  patientId?: number
}): Promise<Record<string, unknown>> {
  if (!isSupabaseConfigured || !supabase) {
    const {
      capabilityStatement,
      mapPatientToFhir,
      mapInvoiceToFhir,
      mapAccountToFhir,
      mapEncounterToFhir,
      mapObservationToFhir,
      mapMedicationRequestToFhir,
      mapConditionToFhir,
      mapVitalSignToFhirObservation,
      mapServiceRequestToFhir,
    } = await import('./fhirMappers')
    if (body.resourceType === 'CapabilityStatement' || body.resourceType === 'metadata') {
      return capabilityStatement()
    }
    if (body.resourceType === 'Patient' && body.id) {
      const patients = await dal.getPatients()
      const p = patients.find((x) => x.id === Number(body.id))
      if (!p) throw new Error('Patient not found')
      return mapPatientToFhir(p)
    }
    if (body.resourceType === 'Invoice' && body.id) {
      const invoices = await dal.getInvoices()
      const inv = invoices.find((x) => x.id === Number(body.id))
      if (!inv) throw new Error('Invoice not found')
      return mapInvoiceToFhir(inv)
    }
    if (body.resourceType === 'Account') {
      const patientId = Number(body.patientId ?? body.id)
      const patients = await dal.getPatients()
      const p = patients.find((x) => x.id === patientId)
      if (!p) throw new Error('Patient not found')
      const invoices = await dal.getInvoicesByPatient(patientId)
      const payments = await dal.getPayments({ patientId })
      return mapAccountToFhir(
        patientId,
        p.name,
        invoices,
        payments.map((pay) => ({
          id: pay.id,
          amount: pay.amount,
          currency: pay.currency,
          status: pay.status,
          createdAt: pay.createdAt,
        })),
      )
    }
    if (body.resourceType === 'Encounter') {
      if (body.id != null) {
        const idStr = String(body.id)
        if (idStr.startsWith('adm-')) {
          const admId = Number(idStr.slice(4))
          const admissions = await dal.getAdmissions()
          const adm = admissions.find((x) => x.id === admId)
          if (!adm) throw new Error('Encounter not found')
          return mapEncounterToFhir({
            id: `adm-${adm.id}`,
            patientId: adm.patientId,
            patientName: adm.patientName,
            doctorId: adm.attendingDoctorId,
            doctorName: adm.attendingDoctorName,
            date: adm.admittedAt,
            endDate: adm.dischargedAt,
            status: adm.status,
            title: adm.admitReason,
            classCode: 'IMP',
          })
        }
        const appts = await dal.getAppointments()
        const a = appts.find((x) => x.id === Number(body.id))
        if (a) {
          return mapEncounterToFhir({
            id: a.id,
            patientId: a.patientId,
            patientName: a.patientName,
            doctorId: a.doctorId,
            doctorName: a.doctorName,
            date: `${a.date}T${a.time}`,
            status: a.status,
            classCode: 'AMB',
          })
        }
        throw new Error('Encounter not found')
      }
      const patientId = Number(body.patientId)
      const appts = await dal.getAppointmentsByPatient(patientId)
      const admissions = (await dal.getAdmissions()).filter((a) => a.patientId === patientId)
      const entry = [
        ...appts.map((a) => ({
          resource: mapEncounterToFhir({
            id: a.id,
            patientId: a.patientId,
            patientName: a.patientName,
            doctorId: a.doctorId,
            doctorName: a.doctorName,
            date: `${a.date}T${a.time}`,
            status: a.status,
            classCode: 'AMB',
          }),
        })),
        ...admissions.map((adm) => ({
          resource: mapEncounterToFhir({
            id: `adm-${adm.id}`,
            patientId: adm.patientId,
            patientName: adm.patientName,
            doctorId: adm.attendingDoctorId,
            doctorName: adm.attendingDoctorName,
            date: adm.admittedAt,
            endDate: adm.dischargedAt,
            status: adm.status,
            title: adm.admitReason,
            classCode: 'IMP',
          }),
        })),
      ]
      return {
        resourceType: 'Bundle',
        type: 'searchset',
        total: entry.length,
        entry,
      }
    }
    if (body.resourceType === 'Observation') {
      if (body.id != null) {
        const idStr = String(body.id)
        if (idStr.startsWith('vs-')) {
          const vsId = Number(idStr.slice(3))
          const allPatients = await dal.getPatients()
          for (const p of allPatients) {
            const list = await dal.getVitalSigns(p.id)
            const v = list.find((x) => x.id === vsId)
            if (v) return mapVitalSignToFhirObservation(v)
          }
          throw new Error('Observation not found')
        }
        const labs = await dal.getLabTests()
        const lab = labs.find((x) => x.id === Number(body.id))
        if (!lab) throw new Error('Observation not found')
        return mapObservationToFhir({
          id: lab.id,
          patientId: lab.patientId,
          testName: lab.testName,
          date: lab.date,
          status: lab.status,
          result: lab.result,
          category: lab.category,
        })
      }
      const patientId = Number(body.patientId)
      const labs = await dal.getLabTestsByPatient(patientId)
      const vitals = await dal.getVitalSigns(patientId)
      const entry = [
        ...labs.map((lab) => ({
          resource: mapObservationToFhir({
            id: lab.id,
            patientId: lab.patientId,
            testName: lab.testName,
            date: lab.date,
            status: lab.status,
            result: lab.result,
            category: lab.category,
          }),
        })),
        ...vitals.map((v) => ({ resource: mapVitalSignToFhirObservation(v) })),
      ]
      return {
        resourceType: 'Bundle',
        type: 'searchset',
        total: entry.length,
        entry,
      }
    }
    if (body.resourceType === 'Condition') {
      if (body.id != null) {
        const idStr = String(body.id)
        const condId = idStr.startsWith('cond-') ? Number(idStr.slice(5)) : Number(idStr)
        const patients = await dal.getPatients()
        for (const p of patients) {
          const list = await dal.getProblems(p.id)
          const c = list.find((x) => x.id === condId)
          if (c) {
            return mapConditionToFhir({
              id: `cond-${c.id}`,
              patientId: c.patientId,
              display: c.display,
              code: c.code,
              status: c.status,
              severity: c.severity,
              onsetDate: c.onsetDate,
              resolvedDate: c.resolvedDate,
              notes: c.notes,
            })
          }
        }
        throw new Error('Condition not found')
      }
      const patientId = Number(body.patientId)
      const problems = await dal.getProblems(patientId)
      return {
        resourceType: 'Bundle',
        type: 'searchset',
        total: problems.length,
        entry: problems.map((c) => ({
          resource: mapConditionToFhir({
            id: `cond-${c.id}`,
            patientId: c.patientId,
            display: c.display,
            code: c.code,
            status: c.status,
            severity: c.severity,
            onsetDate: c.onsetDate,
            resolvedDate: c.resolvedDate,
            notes: c.notes,
          }),
        })),
      }
    }
    if (body.resourceType === 'MedicationRequest') {
      const pid = Number(body.patientId)
      if (!pid) throw new Error('patientId required for MedicationRequest')
      const meds = await dal.getMedications(pid)
      if (body.id != null) {
        const m = meds.find((x) => String(x.id) === String(body.id))
        if (!m) throw new Error('MedicationRequest not found')
        return mapMedicationRequestToFhir(m)
      }
      return {
        resourceType: 'Bundle',
        type: 'searchset',
        total: meds.length,
        entry: meds.map((m) => ({ resource: mapMedicationRequestToFhir(m) })),
      }
    }
    if (body.resourceType === 'ServiceRequest') {
      const toFhir = (o: Awaited<ReturnType<typeof dal.getClinicalOrders>>[number]) =>
        mapServiceRequestToFhir({
          id: `sr-${o.id}`,
          patientId: o.patientId,
          patientName: o.patientName,
          description: o.description,
          code: o.code,
          status: o.status,
          priority: o.priority,
          orderType: o.orderType,
          orderedAt: o.orderedAt,
          orderedBy: o.orderedBy,
          notes: o.notes,
        })
      if (body.id != null) {
        const idStr = String(body.id)
        const oid = idStr.startsWith('sr-') ? Number(idStr.slice(3)) : Number(idStr)
        const all = await dal.getClinicalOrders()
        const o = all.find((x) => x.id === oid)
        if (!o) throw new Error('ServiceRequest not found')
        return toFhir(o)
      }
      const patientId = Number(body.patientId)
      const list = await dal.getClinicalOrders({ patientId })
      const nonMed = list.filter((o) => o.orderType !== 'pharmacy')
      return {
        resourceType: 'Bundle',
        type: 'searchset',
        total: nonMed.length,
        entry: nonMed.map((o) => ({ resource: toFhir(o) })),
      }
    }
    throw new Error(`Unsupported: ${body.resourceType}`)
  }

  const { data, error } = await supabase.functions.invoke('fhir-r4', { body })
  if (error) throw new Error(error.message)
  if (data?.resourceType === 'OperationOutcome') {
    const msg = data.issue?.[0]?.diagnostics ?? 'FHIR error'
    throw new Error(String(msg))
  }
  return data as Record<string, unknown>
}
