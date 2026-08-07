// Supabase Edge Function: fhir-r4 (read-only)
// Invoke: POST with body { resourceType, id?, patientId? }
// Deploy: supabase functions deploy fhir-r4

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/fhir+json' },
  })
}

function mapPatient(p: Record<string, unknown>) {
  return {
    resourceType: 'Patient',
    id: String(p.id),
    meta: { profile: ['http://hl7.org/fhir/StructureDefinition/Patient'] },
    active: true,
    name: [{ use: 'official', text: p.name }],
    telecom: p.phone ? [{ system: 'phone', value: p.phone }] : [],
    extension: p.condition
      ? [{
          url: 'https://dynex360.hospital/fhir/StructureDefinition/primary-condition',
          valueString: p.condition,
        }]
      : [],
  }
}

function mapInvoice(inv: Record<string, unknown>) {
  const items = (inv.items as { description: string; quantity: number; unitPrice?: number; unit_price?: number }[]) ?? []
  const currency = (inv.currency as string) || 'USD'
  const total = items.reduce((s, i) => s + i.quantity * Number(i.unitPrice ?? i.unit_price ?? 0), 0)
  const statusMap: Record<string, string> = {
    unpaid: 'issued',
    partial: 'balanced',
    paid: 'balanced',
  }
  return {
    resourceType: 'Invoice',
    id: String(inv.id),
    status: statusMap[String(inv.status)] ?? 'issued',
    subject: {
      reference: `Patient/${inv.patient_id}`,
      display: inv.patient_name,
    },
    date: inv.date,
    lineItem: items.map((item, idx) => ({
      sequence: idx + 1,
      chargeItemCodeableConcept: { text: item.description },
      priceComponent: [{
        type: 'base',
        amount: {
          value: item.quantity * Number(item.unitPrice ?? item.unit_price ?? 0),
          currency,
        },
      }],
    })),
    totalNet: { value: total, currency },
    totalGross: { value: total, currency },
    extension: [{
      url: 'https://dynex360.hospital/fhir/StructureDefinition/paid-amount',
      valueMoney: { value: Number(inv.paid_amount ?? 0), currency },
    }],
  }
}

function capabilityStatement() {
  return {
    resourceType: 'CapabilityStatement',
    status: 'active',
    date: new Date().toISOString().slice(0, 10),
    kind: 'instance',
    fhirVersion: '4.0.1',
    format: ['json'],
    rest: [{
      mode: 'server',
      resource: [
        { type: 'Patient', interaction: [{ code: 'read' }] },
        { type: 'Invoice', interaction: [{ code: 'read' }] },
        { type: 'Account', interaction: [{ code: 'search-type' }] },
        { type: 'Encounter', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'Observation', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'Condition', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'ServiceRequest', interaction: [{ code: 'read' }, { code: 'search-type' }] },
        { type: 'MedicationRequest', interaction: [{ code: 'read' }, { code: 'search-type' }] },
      ],
    }],
  }
}

function assertPatientAccess(
  isStaff: boolean,
  linked: number | null,
  patientId: number,
): Response | null {
  if (!isStaff && linked !== patientId) {
    return json({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'forbidden', diagnostics: 'Forbidden' }],
    }, 403)
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-supported', diagnostics: 'POST only' }] }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !serviceKey || !anonKey) {
    return json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'exception', diagnostics: 'misconfigured' }] }, 500)
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'login', diagnostics: 'Unauthorized' }] }, 401)
  }

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'login', diagnostics: 'Unauthorized' }] }, 401)
  }

  const admin = createClient(url, serviceKey)
  const { data: profile } = await admin
    .from('profiles')
    .select('role, linked_patient_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'forbidden', diagnostics: 'No profile' }] }, 403)
  }

  let body: { resourceType?: string; id?: string | number; patientId?: number }
  try {
    body = await req.json()
  } catch {
    return json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'invalid', diagnostics: 'Invalid JSON' }] }, 400)
  }

  const resourceType = body.resourceType
  if (resourceType === 'CapabilityStatement' || resourceType === 'metadata') {
    return json(capabilityStatement())
  }

  const isStaff = ['admin', 'doctor', 'nurse'].includes(profile.role)

  if (resourceType === 'Patient') {
    const id = Number(body.id)
    if (!id) {
      return json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'required', diagnostics: 'id required' }] }, 400)
    }
    if (!isStaff && profile.linked_patient_id !== id) {
      return json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'forbidden', diagnostics: 'Forbidden' }] }, 403)
    }
    const { data: patient, error } = await admin.from('patients').select('*').eq('id', id).single()
    if (error || !patient) {
      return json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found', diagnostics: 'Patient not found' }] }, 404)
    }
    return json(mapPatient(patient))
  }

  if (resourceType === 'Invoice') {
    const id = Number(body.id)
    if (!id) {
      return json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'required', diagnostics: 'id required' }] }, 400)
    }
    const { data: inv, error } = await admin.from('invoices').select('*').eq('id', id).single()
    if (error || !inv) {
      return json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found', diagnostics: 'Invoice not found' }] }, 404)
    }
    if (!isStaff && profile.linked_patient_id !== inv.patient_id) {
      return json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'forbidden', diagnostics: 'Forbidden' }] }, 403)
    }
    return json(mapInvoice(inv))
  }

  if (resourceType === 'Account') {
    const patientId = Number(body.patientId ?? body.id)
    if (!patientId) {
      return json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'required', diagnostics: 'patientId required' }] }, 400)
    }
    if (!isStaff && profile.linked_patient_id !== patientId) {
      return json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'forbidden', diagnostics: 'Forbidden' }] }, 403)
    }
    const { data: patient } = await admin.from('patients').select('*').eq('id', patientId).single()
    if (!patient) {
      return json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found', diagnostics: 'Patient not found' }] }, 404)
    }
    const { data: invoices = [] } = await admin.from('invoices').select('*').eq('patient_id', patientId)
    const { data: payments = [] } = await admin.from('payments').select('*').eq('patient_id', patientId)
    const balance = invoices.reduce((sum: number, inv: Record<string, unknown>) => {
      const items = (inv.items as { quantity: number; unitPrice?: number; unit_price?: number }[]) ?? []
      const total = items.reduce((s, i) => s + i.quantity * Number(i.unitPrice ?? i.unit_price ?? 0), 0)
      return sum + Math.max(0, total - Number(inv.paid_amount ?? 0))
    }, 0)
    const currency = (invoices[0]?.currency as string) || 'USD'
    return json({
      resourceType: 'Account',
      id: `patient-${patientId}`,
      status: balance > 0 ? 'active' : 'inactive',
      name: `Statement — ${patient.name}`,
      subject: [{ reference: `Patient/${patientId}`, display: patient.name }],
      description: `Aggregated balance from ${invoices.length} invoice(s), ${payments.length} payment(s)`,
      extension: [{
        url: 'https://dynex360.hospital/fhir/StructureDefinition/account-balance',
        valueMoney: { value: balance, currency },
      }],
    })
  }

  if (resourceType === 'Encounter') {
    const patientId = body.patientId != null ? Number(body.patientId) : undefined
    if (body.id != null && !patientId) {
      const idRaw = String(body.id)
      if (idRaw.startsWith('adm-')) {
        const admId = Number(idRaw.slice(4))
        const { data: adm } = await admin.from('admissions').select('*').eq('id', admId).maybeSingle()
        if (adm) {
          const denied = assertPatientAccess(isStaff, profile.linked_patient_id, adm.patient_id)
          if (denied) return denied
          return json({
            resourceType: 'Encounter',
            id: `adm-${adm.id}`,
            status: adm.status === 'discharged' ? 'finished' : 'in-progress',
            class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'IMP', display: 'inpatient' },
            subject: { reference: `Patient/${adm.patient_id}`, display: adm.patient_name },
            participant: adm.attending_doctor_id
              ? [{ individual: { reference: `Practitioner/${adm.attending_doctor_id}`, display: adm.attending_doctor_name } }]
              : [],
            period: { start: adm.admitted_at, ...(adm.discharged_at ? { end: adm.discharged_at } : {}) },
            reasonCode: adm.admit_reason ? [{ text: adm.admit_reason }] : [],
          })
        }
      }
      const id = body.id
      const { data: appt } = await admin.from('appointments').select('*').eq('id', id).maybeSingle()
      if (appt) {
        const denied = assertPatientAccess(isStaff, profile.linked_patient_id, appt.patient_id)
        if (denied) return denied
        return json({
          resourceType: 'Encounter',
          id: String(appt.id),
          status: appt.status === 'completed' ? 'finished' : appt.status === 'cancelled' ? 'cancelled' : 'planned',
          class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB', display: 'ambulatory' },
          subject: { reference: `Patient/${appt.patient_id}`, display: appt.patient_name },
          participant: [{ individual: { reference: `Practitioner/${appt.doctor_id}`, display: appt.doctor_name } }],
          period: { start: `${appt.date}T${appt.time || '00:00'}:00` },
        })
      }
      const { data: visit } = await admin.from('visits').select('*').eq('id', String(id)).maybeSingle()
      if (visit) {
        const denied = assertPatientAccess(isStaff, profile.linked_patient_id, visit.patient_id)
        if (denied) return denied
        return json({
          resourceType: 'Encounter',
          id: String(visit.id),
          status: 'finished',
          class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB', display: 'ambulatory' },
          subject: { reference: `Patient/${visit.patient_id}` },
          period: { start: visit.date },
          reasonCode: [{ text: visit.title }],
        })
      }
      return json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found', diagnostics: 'Encounter not found' }] }, 404)
    }
    if (!patientId) {
      return json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'required', diagnostics: 'patientId or id required' }] }, 400)
    }
    const denied = assertPatientAccess(isStaff, profile.linked_patient_id, patientId)
    if (denied) return denied
    const { data: appts = [] } = await admin.from('appointments').select('*').eq('patient_id', patientId)
    const { data: adms = [] } = await admin.from('admissions').select('*').eq('patient_id', patientId)
    const entries = [
      ...appts.map((appt: Record<string, unknown>) => ({
        resource: {
          resourceType: 'Encounter',
          id: String(appt.id),
          status: appt.status === 'completed' ? 'finished' : appt.status === 'cancelled' ? 'cancelled' : 'planned',
          class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB' },
          subject: { reference: `Patient/${patientId}`, display: appt.patient_name },
          period: { start: `${appt.date}T${appt.time || '00:00'}:00` },
        },
      })),
      ...adms.map((adm: Record<string, unknown>) => ({
        resource: {
          resourceType: 'Encounter',
          id: `adm-${adm.id}`,
          status: adm.status === 'discharged' ? 'finished' : 'in-progress',
          class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'IMP', display: 'inpatient' },
          subject: { reference: `Patient/${patientId}`, display: adm.patient_name },
          period: {
            start: adm.admitted_at,
            ...(adm.discharged_at ? { end: adm.discharged_at } : {}),
          },
          reasonCode: adm.admit_reason ? [{ text: adm.admit_reason }] : [],
        },
      })),
    ]
    return json({ resourceType: 'Bundle', type: 'searchset', total: entries.length, entry: entries })
  }

  if (resourceType === 'Observation') {
    if (body.id != null) {
      const idRaw = String(body.id)
      if (idRaw.startsWith('vs-')) {
        const vsId = Number(idRaw.slice(3))
        const { data: vs } = await admin.from('vital_signs').select('*').eq('id', vsId).maybeSingle()
        if (!vs) {
          return json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found', diagnostics: 'Observation not found' }] }, 404)
        }
        const denied = assertPatientAccess(isStaff, profile.linked_patient_id, vs.patient_id)
        if (denied) return denied
        const components = []
        if (vs.temperature_c != null) components.push({ code: { text: 'Body temperature' }, valueQuantity: { value: Number(vs.temperature_c), unit: 'Cel' } })
        if (vs.heart_rate != null) components.push({ code: { text: 'Heart rate' }, valueQuantity: { value: Number(vs.heart_rate), unit: '/min' } })
        if (vs.respiratory_rate != null) components.push({ code: { text: 'Respiratory rate' }, valueQuantity: { value: Number(vs.respiratory_rate), unit: '/min' } })
        if (vs.systolic_bp != null) components.push({ code: { text: 'Systolic BP' }, valueQuantity: { value: Number(vs.systolic_bp), unit: 'mmHg' } })
        if (vs.diastolic_bp != null) components.push({ code: { text: 'Diastolic BP' }, valueQuantity: { value: Number(vs.diastolic_bp), unit: 'mmHg' } })
        if (vs.spo2 != null) components.push({ code: { text: 'SpO2' }, valueQuantity: { value: Number(vs.spo2), unit: '%' } })
        return json({
          resourceType: 'Observation',
          id: `vs-${vs.id}`,
          status: 'final',
          category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
          code: { text: 'Vital signs panel' },
          subject: { reference: `Patient/${vs.patient_id}` },
          effectiveDateTime: vs.recorded_at,
          component: components,
        })
      }
      const { data: lab, error } = await admin.from('lab_tests').select('*').eq('id', body.id).single()
      if (error || !lab) {
        return json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found', diagnostics: 'Observation not found' }] }, 404)
      }
      const denied = assertPatientAccess(isStaff, profile.linked_patient_id, lab.patient_id)
      if (denied) return denied
      const statusMap: Record<string, string> = {
        ordered: 'registered',
        'in-progress': 'preliminary',
        completed: 'final',
        cancelled: 'cancelled',
      }
      return json({
        resourceType: 'Observation',
        id: String(lab.id),
        status: statusMap[lab.status] ?? 'unknown',
        category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory' }] }],
        code: { text: lab.test_name },
        subject: { reference: `Patient/${lab.patient_id}` },
        effectiveDateTime: lab.date,
        valueString: lab.result,
      })
    }
    const patientId = Number(body.patientId)
    if (!patientId) {
      return json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'required', diagnostics: 'patientId or id required' }] }, 400)
    }
    const denied = assertPatientAccess(isStaff, profile.linked_patient_id, patientId)
    if (denied) return denied
    const { data: labs = [] } = await admin.from('lab_tests').select('*').eq('patient_id', patientId)
    const { data: vitals = [] } = await admin.from('vital_signs').select('*').eq('patient_id', patientId)
    const entries = [
      ...labs.map((lab: Record<string, unknown>) => ({
        resource: {
          resourceType: 'Observation',
          id: String(lab.id),
          status: lab.status === 'completed' ? 'final' : 'registered',
          code: { text: lab.test_name },
          subject: { reference: `Patient/${patientId}` },
          effectiveDateTime: lab.date,
          valueString: lab.result,
        },
      })),
      ...vitals.map((vs: Record<string, unknown>) => ({
        resource: {
          resourceType: 'Observation',
          id: `vs-${vs.id}`,
          status: 'final',
          category: [{ coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'vital-signs' }] }],
          code: { text: 'Vital signs panel' },
          subject: { reference: `Patient/${patientId}` },
          effectiveDateTime: vs.recorded_at,
        },
      })),
    ]
    return json({ resourceType: 'Bundle', type: 'searchset', total: entries.length, entry: entries })
  }

  if (resourceType === 'Condition') {
    if (body.id != null) {
      const idRaw = String(body.id)
      const condId = idRaw.startsWith('cond-') ? Number(idRaw.slice(5)) : Number(idRaw)
      const { data: problem } = await admin.from('problems').select('*').eq('id', condId).maybeSingle()
      if (!problem) {
        return json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found', diagnostics: 'Condition not found' }] }, 404)
      }
      const denied = assertPatientAccess(isStaff, profile.linked_patient_id, problem.patient_id)
      if (denied) return denied
      return json({
        resourceType: 'Condition',
        id: `cond-${problem.id}`,
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: problem.status === 'resolved' ? 'resolved' : problem.status === 'inactive' ? 'inactive' : 'active',
          }],
        },
        code: {
          text: problem.display,
          ...(problem.code ? { coding: [{ system: 'http://hl7.org/fhir/sid/icd-10', code: problem.code, display: problem.display }] } : {}),
        },
        subject: { reference: `Patient/${problem.patient_id}` },
        onsetDateTime: problem.onset_date,
        abatementDateTime: problem.resolved_date,
      })
    }
    const patientId = Number(body.patientId)
    if (!patientId) {
      return json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'required', diagnostics: 'patientId or id required' }] }, 400)
    }
    const denied = assertPatientAccess(isStaff, profile.linked_patient_id, patientId)
    if (denied) return denied
    const { data: problems = [] } = await admin.from('problems').select('*').eq('patient_id', patientId)
    const entries = problems.map((problem: Record<string, unknown>) => ({
      resource: {
        resourceType: 'Condition',
        id: `cond-${problem.id}`,
        clinicalStatus: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: problem.status === 'resolved' ? 'resolved' : problem.status === 'inactive' ? 'inactive' : 'active',
          }],
        },
        code: { text: problem.display },
        subject: { reference: `Patient/${patientId}` },
        onsetDateTime: problem.onset_date,
      },
    }))
    return json({ resourceType: 'Bundle', type: 'searchset', total: entries.length, entry: entries })
  }

  if (resourceType === 'ServiceRequest') {
    if (body.id != null) {
      const idRaw = String(body.id)
      const oid = idRaw.startsWith('sr-') ? Number(idRaw.slice(3)) : Number(idRaw)
      const { data: order } = await admin.from('clinical_orders').select('*').eq('id', oid).maybeSingle()
      if (!order) {
        return json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found', diagnostics: 'ServiceRequest not found' }] }, 404)
      }
      const denied = assertPatientAccess(isStaff, profile.linked_patient_id, order.patient_id)
      if (denied) return denied
      const statusMap: Record<string, string> = {
        draft: 'draft', ordered: 'active', 'in-progress': 'active', completed: 'completed', cancelled: 'revoked',
      }
      return json({
        resourceType: 'ServiceRequest',
        id: `sr-${order.id}`,
        status: statusMap[order.status] ?? 'active',
        intent: 'order',
        priority: order.priority ?? 'routine',
        category: [{ text: order.order_type }],
        code: { text: order.description, ...(order.code ? { coding: [{ code: order.code }] } : {}) },
        subject: { reference: `Patient/${order.patient_id}`, display: order.patient_name },
        authoredOn: order.ordered_at,
        requester: order.ordered_by ? { display: order.ordered_by } : undefined,
      })
    }
    const patientId = Number(body.patientId)
    if (!patientId) {
      return json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'required', diagnostics: 'patientId or id required' }] }, 400)
    }
    const denied = assertPatientAccess(isStaff, profile.linked_patient_id, patientId)
    if (denied) return denied
    const { data: orders = [] } = await admin
      .from('clinical_orders')
      .select('*')
      .eq('patient_id', patientId)
      .neq('order_type', 'pharmacy')
    const entries = orders.map((order: Record<string, unknown>) => ({
      resource: {
        resourceType: 'ServiceRequest',
        id: `sr-${order.id}`,
        status: order.status === 'completed' ? 'completed' : order.status === 'cancelled' ? 'revoked' : 'active',
        intent: 'order',
        code: { text: order.description },
        subject: { reference: `Patient/${patientId}`, display: order.patient_name },
        authoredOn: order.ordered_at,
      },
    }))
    return json({ resourceType: 'Bundle', type: 'searchset', total: entries.length, entry: entries })
  }

  if (resourceType === 'MedicationRequest') {
    if (body.id != null) {
      const { data: med, error } = await admin.from('medications').select('*').eq('id', String(body.id)).single()
      if (error || !med) {
        return json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'not-found', diagnostics: 'MedicationRequest not found' }] }, 404)
      }
      const denied = assertPatientAccess(isStaff, profile.linked_patient_id, med.patient_id)
      if (denied) return denied
      return json({
        resourceType: 'MedicationRequest',
        id: String(med.id),
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: { text: med.name },
        subject: { reference: `Patient/${med.patient_id}` },
        authoredOn: med.start_date,
        dosageInstruction: [{ text: med.dosage }],
      })
    }
    const patientId = Number(body.patientId)
    if (!patientId) {
      return json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'required', diagnostics: 'patientId or id required' }] }, 400)
    }
    const denied = assertPatientAccess(isStaff, profile.linked_patient_id, patientId)
    if (denied) return denied
    const { data: meds = [] } = await admin.from('medications').select('*').eq('patient_id', patientId)
    const entries = meds.map((med: Record<string, unknown>) => ({
      resource: {
        resourceType: 'MedicationRequest',
        id: String(med.id),
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: { text: med.name },
        subject: { reference: `Patient/${patientId}` },
        authoredOn: med.start_date,
        dosageInstruction: [{ text: med.dosage }],
      },
    }))
    return json({ resourceType: 'Bundle', type: 'searchset', total: entries.length, entry: entries })
  }

  return json({
    resourceType: 'OperationOutcome',
    issue: [{ severity: 'error', code: 'not-supported', diagnostics: `Unsupported resourceType: ${resourceType}` }],
  }, 400)
})
