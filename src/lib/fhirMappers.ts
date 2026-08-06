/**
 * FHIR R4 mappers — shared by unit tests and Edge contract.
 */

export interface FhirPatientInput {
  id: number
  name: string
  age?: number
  phone?: string
  condition?: string
}

export interface FhirInvoiceInput {
  id: number
  patientId: number
  patientName: string
  date: string
  items: { description: string; quantity: number; unitPrice: number }[]
  status: 'unpaid' | 'paid' | 'partial'
  paidAmount: number
  currency?: string
}

export interface FhirPaymentInput {
  id: number
  amount: number
  currency: string
  status: string
  createdAt: string
}

export interface FhirEncounterInput {
  id: string | number
  patientId: number
  patientName?: string
  doctorId?: number
  doctorName?: string
  date: string
  endDate?: string
  status?: string
  title?: string
  classCode?: 'AMB' | 'IMP' | 'EMER'
}

export interface FhirObservationInput {
  id: string | number
  patientId: number
  testName: string
  date: string
  status: string
  result?: string
  category?: string
  categoryCode?: 'laboratory' | 'vital-signs'
  components?: { code: string; value: number | string; unit?: string }[]
}

export interface FhirConditionInput {
  id: string | number
  patientId: number
  display: string
  code?: string
  status: string
  severity?: string
  onsetDate?: string
  resolvedDate?: string
  notes?: string
}

export interface FhirMedicationRequestInput {
  id: string | number
  patientId: number
  name: string
  dosage: string
  startDate: string
  endDate?: string
  status?: string
}

export function mapPatientToFhir(p: FhirPatientInput): Record<string, unknown> {
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

export function mapInvoiceToFhir(inv: FhirInvoiceInput): Record<string, unknown> {
  const total = inv.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
  const currency = inv.currency ?? 'USD'
  const statusMap: Record<string, string> = {
    unpaid: 'issued',
    partial: 'balanced',
    paid: 'balanced',
  }
  return {
    resourceType: 'Invoice',
    id: String(inv.id),
    status: statusMap[inv.status] ?? 'issued',
    subject: { reference: `Patient/${inv.patientId}`, display: inv.patientName },
    date: inv.date,
    lineItem: inv.items.map((item, idx) => ({
      sequence: idx + 1,
      chargeItemCodeableConcept: { text: item.description },
      priceComponent: [{
        type: 'base',
        amount: { value: item.unitPrice * item.quantity, currency },
      }],
    })),
    totalNet: { value: total, currency },
    totalGross: { value: total, currency },
    extension: [{
      url: 'https://dynex360.hospital/fhir/StructureDefinition/paid-amount',
      valueMoney: { value: inv.paidAmount, currency },
    }],
  }
}

export function mapAccountToFhir(
  patientId: number,
  patientName: string,
  invoices: FhirInvoiceInput[],
  payments: FhirPaymentInput[],
): Record<string, unknown> {
  const balance = invoices.reduce((sum, inv) => {
    const total = inv.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
    return sum + Math.max(0, total - inv.paidAmount)
  }, 0)
  const currency = invoices[0]?.currency ?? 'USD'
  return {
    resourceType: 'Account',
    id: `patient-${patientId}`,
    status: balance > 0 ? 'active' : 'inactive',
    name: `Statement — ${patientName}`,
    subject: [{ reference: `Patient/${patientId}`, display: patientName }],
    description: `Aggregated balance from ${invoices.length} invoice(s), ${payments.length} payment(s)`,
    extension: [{
      url: 'https://dynex360.hospital/fhir/StructureDefinition/account-balance',
      valueMoney: { value: balance, currency },
    }],
  }
}

export function mapEncounterToFhir(e: FhirEncounterInput): Record<string, unknown> {
  const statusMap: Record<string, string> = {
    confirmed: 'planned',
    pending: 'planned',
    completed: 'finished',
    cancelled: 'cancelled',
    admitted: 'in-progress',
    discharged: 'finished',
  }
  return {
    resourceType: 'Encounter',
    id: String(e.id),
    status: statusMap[e.status ?? ''] ?? (e.title ? 'finished' : 'planned'),
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: e.classCode ?? 'AMB',
      display: e.classCode === 'IMP' ? 'inpatient' : e.classCode === 'EMER' ? 'emergency' : 'ambulatory',
    },
    subject: {
      reference: `Patient/${e.patientId}`,
      display: e.patientName,
    },
    participant: e.doctorId
      ? [{
          individual: {
            reference: `Practitioner/${e.doctorId}`,
            display: e.doctorName,
          },
        }]
      : [],
    period: {
      start: e.date,
      ...(e.endDate ? { end: e.endDate } : {}),
    },
    reasonCode: e.title ? [{ text: e.title }] : [],
  }
}

export function mapObservationToFhir(o: FhirObservationInput): Record<string, unknown> {
  const statusMap: Record<string, string> = {
    ordered: 'registered',
    'in-progress': 'preliminary',
    completed: 'final',
    cancelled: 'cancelled',
    final: 'final',
  }
  const categoryCode = o.categoryCode ?? 'laboratory'
  return {
    resourceType: 'Observation',
    id: String(o.id),
    status: statusMap[o.status] ?? (o.components?.length ? 'final' : 'unknown'),
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/observation-category',
        code: categoryCode,
        display: o.category ?? (categoryCode === 'vital-signs' ? 'Vital Signs' : 'Laboratory'),
      }],
    }],
    code: { text: o.testName },
    subject: { reference: `Patient/${o.patientId}` },
    effectiveDateTime: o.date,
    ...(o.result != null ? { valueString: o.result } : {}),
    ...(o.components?.length
      ? {
          component: o.components.map((c) => ({
            code: { text: c.code },
            valueQuantity: c.unit
              ? { value: typeof c.value === 'number' ? c.value : Number(c.value), unit: c.unit }
              : undefined,
            valueString: c.unit ? undefined : String(c.value),
          })),
        }
      : {}),
  }
}

export function mapConditionToFhir(c: FhirConditionInput): Record<string, unknown> {
  const clinicalStatus =
    c.status === 'resolved' ? 'resolved' : c.status === 'inactive' ? 'inactive' : 'active'
  return {
    resourceType: 'Condition',
    id: String(c.id),
    clinicalStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
        code: clinicalStatus,
      }],
    },
    code: {
      text: c.display,
      ...(c.code
        ? {
            coding: [{
              system: 'http://hl7.org/fhir/sid/icd-10',
              code: c.code,
              display: c.display,
            }],
          }
        : {}),
    },
    subject: { reference: `Patient/${c.patientId}` },
    onsetDateTime: c.onsetDate,
    abatementDateTime: c.resolvedDate,
    severity: c.severity ? { text: c.severity } : undefined,
    note: c.notes ? [{ text: c.notes }] : undefined,
  }
}

export function mapVitalSignToFhirObservation(v: {
  id: number
  patientId: number
  recordedAt: string
  temperatureC?: number
  heartRate?: number
  respiratoryRate?: number
  systolicBp?: number
  diastolicBp?: number
  spo2?: number
  weightKg?: number
  heightCm?: number
}): Record<string, unknown> {
  const components: { code: string; value: number; unit: string }[] = []
  if (v.temperatureC != null) components.push({ code: 'Body temperature', value: v.temperatureC, unit: 'Cel' })
  if (v.heartRate != null) components.push({ code: 'Heart rate', value: v.heartRate, unit: '/min' })
  if (v.respiratoryRate != null) components.push({ code: 'Respiratory rate', value: v.respiratoryRate, unit: '/min' })
  if (v.systolicBp != null) components.push({ code: 'Systolic BP', value: v.systolicBp, unit: 'mmHg' })
  if (v.diastolicBp != null) components.push({ code: 'Diastolic BP', value: v.diastolicBp, unit: 'mmHg' })
  if (v.spo2 != null) components.push({ code: 'SpO2', value: v.spo2, unit: '%' })
  if (v.weightKg != null) components.push({ code: 'Body weight', value: v.weightKg, unit: 'kg' })
  if (v.heightCm != null) components.push({ code: 'Body height', value: v.heightCm, unit: 'cm' })
  return mapObservationToFhir({
    id: `vs-${v.id}`,
    patientId: v.patientId,
    testName: 'Vital signs panel',
    date: v.recordedAt,
    status: 'final',
    categoryCode: 'vital-signs',
    category: 'Vital Signs',
    components,
  })
}

export function mapMedicationRequestToFhir(m: FhirMedicationRequestInput): Record<string, unknown> {
  return {
    resourceType: 'MedicationRequest',
    id: String(m.id),
    status: m.status ?? 'active',
    intent: 'order',
    medicationCodeableConcept: { text: m.name },
    subject: { reference: `Patient/${m.patientId}` },
    authoredOn: m.startDate,
    dosageInstruction: [{ text: m.dosage }],
    ...(m.endDate
      ? {
          extension: [{
            url: 'https://dynex360.hospital/fhir/StructureDefinition/medication-end',
            valueDate: m.endDate,
          }],
        }
      : {}),
  }
}

export interface FhirServiceRequestInput {
  id: string | number
  patientId: number
  patientName?: string
  description: string
  code?: string
  status: string
  priority?: string
  orderType?: string
  orderedAt: string
  orderedBy?: string
  notes?: string
}

export function mapServiceRequestToFhir(o: FhirServiceRequestInput): Record<string, unknown> {
  const statusMap: Record<string, string> = {
    draft: 'draft',
    ordered: 'active',
    'in-progress': 'active',
    completed: 'completed',
    cancelled: 'revoked',
  }
  const priorityMap: Record<string, string> = {
    routine: 'routine',
    urgent: 'urgent',
    stat: 'stat',
  }
  return {
    resourceType: 'ServiceRequest',
    id: String(o.id),
    status: statusMap[o.status] ?? 'active',
    intent: 'order',
    priority: priorityMap[o.priority ?? ''] ?? 'routine',
    category: o.orderType
      ? [{ text: o.orderType }]
      : undefined,
    code: {
      text: o.description,
      ...(o.code ? { coding: [{ code: o.code, display: o.description }] } : {}),
    },
    subject: {
      reference: `Patient/${o.patientId}`,
      display: o.patientName,
    },
    authoredOn: o.orderedAt,
    requester: o.orderedBy ? { display: o.orderedBy } : undefined,
    note: o.notes ? [{ text: o.notes }] : undefined,
  }
}

export function capabilityStatement(): Record<string, unknown> {
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
