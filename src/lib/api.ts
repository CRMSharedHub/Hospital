import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dal } from './dal'
import { useFacilityStore } from '../store/facilityStore'
import type {
  Patient,
  Doctor,
  Appointment,
  ClinicalVisit,
  Medication,
  ClinicalNote,
  Invoice,
  Medicine,
  PharmacyOrder,
  LabTest,
  Claim,
  Payment,
} from '../types'
import { toast } from 'sonner'
import { CdsAckRequiredError } from './cdsEngine'

function onErrorHandler(error: unknown, fallbackMsg: string) {
  const msg = error instanceof Error ? error.message : fallbackMsg
  toast.error(msg)
}

function isCdsAckRequiredError(error: unknown): error is CdsAckRequiredError {
  return (
    error instanceof CdsAckRequiredError ||
    (error instanceof Error && error.name === 'CdsAckRequiredError')
  )
}

// Patients
export const usePatients = () => {
  const facilityId = useFacilityStore((s) => s.activeFacilityId)
  return useQuery({
    queryKey: ['patients', facilityId],
    queryFn: () => dal.getPatients(facilityId),
  })
}

export const usePatient = (id: number) => {
  return useQuery({
    queryKey: ['patients', id],
    queryFn: () => dal.getPatient(id),
    enabled: !!id,
  })
}

export const useAddPatient = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patient: Omit<Patient, 'id'>) => dal.addPatient(patient),
    onMutate: async (newPatient) => {
      await queryClient.cancelQueries({ queryKey: ['patients'] })
      const previous = queryClient.getQueryData<Patient[]>(['patients'])
      queryClient.setQueryData<Patient[]>(['patients'], (old = []) => [
        ...old,
        { ...newPatient, id: Date.now() } as Patient,
      ])
      return { previous }
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['patients'], ctx.previous)
      onErrorHandler(_e, 'Failed to add patient')
    },
    onSuccess: async (_, patient) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] })
      toast.success('Patient added successfully')
      await dal.logAudit('create', 'patients', undefined, { name: patient.name })
    },
  })
}

// Doctors
export const useDoctors = () => {
  return useQuery({
    queryKey: ['doctors'],
    queryFn: () => dal.getDoctors(),
  })
}

export const useDoctor = (id: number) => {
  return useQuery({
    queryKey: ['doctors', id],
    queryFn: () => dal.getDoctor(id),
    enabled: !!id,
  })
}

export const useAddDoctor = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (doctor: Omit<Doctor, 'id'>) => dal.addDoctor(doctor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      toast.success('Doctor added successfully')
    },
    onError: (e) => onErrorHandler(e, 'Failed to add doctor'),
  })
}

export const useUpdateDoctor = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (doctor: Doctor) => dal.updateDoctor(doctor),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['doctors'] })
      queryClient.invalidateQueries({ queryKey: ['doctors', variables.id] })
    },
    onError: (e) => onErrorHandler(e, 'Failed to update doctor'),
  })
}

// Appointments
export const useAppointments = () => {
  return useQuery({
    queryKey: ['appointments'],
    queryFn: () => dal.getAppointments(),
  })
}

export const useAddAppointment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (appointment: Omit<Appointment, 'id'>) => dal.addAppointment(appointment),
    onSuccess: async (_, appt) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast.success('Appointment booked successfully')
      await dal.logAudit('create', 'appointments', undefined, { patientId: appt.patientId, doctorId: appt.doctorId })
    },
    onError: (e) => onErrorHandler(e, 'Failed to book appointment'),
  })
}

export const useUpdateAppointmentStatus = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: Appointment['status'] }) =>
      dal.updateAppointmentStatus(id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['appointments'] })
      const previous = queryClient.getQueryData<Appointment[]>(['appointments'])
      queryClient.setQueryData<Appointment[]>(['appointments'], (old = []) =>
        old.map((a) => (a.id === id ? { ...a, status } : a)),
      )
      return { previous }
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['appointments'], ctx.previous)
      onErrorHandler(_e, 'Failed to update appointment')
    },
    onSuccess: async (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast.success('Appointment status updated')
      await dal.logAudit('update_status', 'appointments', vars.id, { status: vars.status })
    },
  })
}

// EHR Modules
export const usePatientEHR = (patientId: number) => {
  const visits = useQuery({ queryKey: ['visits', patientId], queryFn: () => dal.getVisits(patientId) })
  const medications = useQuery({ queryKey: ['medications', patientId], queryFn: () => dal.getMedications(patientId) })
  const notes = useQuery({ queryKey: ['notes', patientId], queryFn: () => dal.getNotes(patientId) })
  const files = useQuery({ queryKey: ['files', patientId], queryFn: () => dal.getFiles(patientId) })
  const vitals = useQuery({ queryKey: ['vitalSigns', patientId], queryFn: () => dal.getVitalSigns(patientId) })
  const problems = useQuery({ queryKey: ['problems', patientId], queryFn: () => dal.getProblems(patientId) })

  return { visits, medications, notes, files, vitals, problems }
}

export const useAddVitalSign = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<import('../types').VitalSign, 'id'>) => dal.addVitalSign(input),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['vitalSigns', vars.patientId] })
      toast.success('Vitals recorded')
    },
    onError: (e) => onErrorHandler(e, 'Failed to record vitals'),
  })
}

export const useAddProblem = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<import('../types').Problem, 'id'>) => dal.addProblem(input),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['problems', vars.patientId] })
      toast.success('Problem added')
    },
    onError: (e) => onErrorHandler(e, 'Failed to add problem'),
  })
}

export const useUpdateProblemStatus = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      patientId: _patientId,
      status,
    }: {
      id: number
      patientId: number
      status: import('../types').Problem['status']
    }) => dal.updateProblemStatus(id, status),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['problems', vars.patientId] })
      toast.success('Problem updated')
    },
    onError: (e) => onErrorHandler(e, 'Failed to update problem'),
  })
}

export const usePatientVitalSigns = (patientId: number | undefined) => {
  return useQuery({
    queryKey: ['vitalSigns', patientId],
    queryFn: () => dal.getVitalSigns(patientId!),
    enabled: !!patientId,
  })
}

export const usePatientProblems = (patientId: number | undefined) => {
  return useQuery({
    queryKey: ['problems', patientId],
    queryFn: () => dal.getProblems(patientId!),
    enabled: !!patientId,
  })
}

export const useClinicalOrders = (opts?: {
  patientId?: number
  status?: import('../types').ClinicalOrder['status']
  orderType?: import('../types').ClinicalOrder['orderType']
}) => {
  return useQuery({
    queryKey: ['clinicalOrders', opts],
    queryFn: () => dal.getClinicalOrders(opts),
  })
}

export const usePlaceClinicalOrder = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Parameters<typeof dal.placeClinicalOrder>[0]) => dal.placeClinicalOrder(input),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['clinicalOrders'] })
      await queryClient.invalidateQueries({ queryKey: ['labTests'] })
      await queryClient.invalidateQueries({ queryKey: ['pharmacyOrders'] })
      await queryClient.invalidateQueries({ queryKey: ['mar'] })
      if (result.allergyAlert) {
        toast.warning(result.allergyAlert)
      } else {
        toast.success('Order placed')
      }
    },
    onError: (e) => {
      if (isCdsAckRequiredError(e)) return
      const msg = e instanceof Error ? e.message : ''
      if (msg.startsWith('Possible allergy conflict')) return
      onErrorHandler(e, 'Failed to place order')
    },
  })
}

export const useUpdateClinicalOrderStatus = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: import('../types').ClinicalOrder['status'] }) =>
      dal.updateClinicalOrderStatus(id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['clinicalOrders'] })
      toast.success('Order updated')
    },
    onError: (e) => onErrorHandler(e, 'Failed to update order'),
  })
}

export const useMarEntries = (opts?: {
  patientId?: number
  status?: import('../types').MedicationAdministration['status']
}) => {
  return useQuery({
    queryKey: ['mar', opts],
    queryFn: () => dal.getMarEntries(opts),
  })
}

export const useScheduleMar = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<import('../types').MedicationAdministration, 'id' | 'status'> & {
      status?: import('../types').MedicationAdministration['status']
    }) => dal.scheduleMar(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mar'] })
      toast.success('Dose scheduled')
    },
    onError: (e) => onErrorHandler(e, 'Failed to schedule dose'),
  })
}

export const useUpdateMarStatus = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
      administeredBy,
      notes,
    }: {
      id: number
      status: import('../types').MedicationAdministration['status']
      administeredBy?: string
      notes?: string
    }) => dal.updateMarStatus(id, status, administeredBy, notes),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['mar'] })
      toast.success('MAR updated')
    },
    onError: (e) => onErrorHandler(e, 'Failed to update MAR'),
  })
}

export const useAddClinicalVisit = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (visit: ClinicalVisit) => dal.addVisit(visit),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['visits', vars.patientId] })
      toast.success('Visit record added')
    },
    onError: (e) => onErrorHandler(e, 'Failed to add visit'),
  })
}

export const useAddMedication = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (med: Medication) => dal.addMedication(med),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['medications', vars.patientId] })
      toast.success('Medication added')
    },
    onError: (e) => onErrorHandler(e, 'Failed to add medication'),
  })
}

export const useAddClinicalNote = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (note: ClinicalNote) => dal.addNote(note),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['notes', vars.patientId] })
      toast.success('Clinical note saved')
    },
    onError: (e) => onErrorHandler(e, 'Failed to save note'),
  })
}

export const useUploadMedicalFile = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      patientId,
      file,
    }: {
      patientId: number
      file: File
    }) => {
      const fileId = crypto.randomUUID()
      const { url, size } = await dal.uploadMedicalFile(patientId, file, fileId)
      await dal.addFile({
        id: fileId,
        patientId,
        name: file.name,
        url,
        date: new Date().toISOString().split('T')[0],
        size,
      })
      return fileId
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['files', vars.patientId] })
      toast.success('File uploaded successfully')
    },
    onError: (e) => onErrorHandler(e, 'Failed to upload file'),
  })
}

// ── Billing ──────────────────────────────────────────────
export const useInvoices = () => {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: () => dal.getInvoices(),
  })
}

export const useAddInvoice = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invoice: Omit<Invoice, 'id'>) => dal.addInvoice(invoice),
    onSuccess: async (_, inv) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Invoice created successfully')
      await dal.logAudit('create', 'invoices', undefined, { patientId: inv.patientId, amount: inv.paidAmount })
    },
    onError: (e) => onErrorHandler(e, 'Failed to create invoice'),
  })
}

export const useUpdateInvoiceStatus = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, paidAmount }: { id: number; status: Invoice['status']; paidAmount?: number }) =>
      dal.updateInvoiceStatus(id, status, paidAmount),
    onMutate: async ({ id, status, paidAmount }) => {
      await queryClient.cancelQueries({ queryKey: ['invoices'] })
      const previous = queryClient.getQueryData<Invoice[]>(['invoices'])
      queryClient.setQueryData<Invoice[]>(['invoices'], (old = []) =>
        old.map((inv) =>
          inv.id === id ? { ...inv, status, paidAmount: paidAmount ?? inv.paidAmount } : inv,
        ),
      )
      return { previous }
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['invoices'], ctx.previous)
      onErrorHandler(_e, 'Failed to update invoice')
    },
    onSuccess: async (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Invoice updated')
      await dal.logAudit('update_status', 'invoices', vars.id, { status: vars.status, paidAmount: vars.paidAmount })
    },
  })
}

export const usePatientInvoices = (patientId: number | undefined) => {
  return useQuery({
    queryKey: ['invoices', 'patient', patientId],
    queryFn: () => dal.getInvoicesByPatient(patientId!),
    enabled: !!patientId,
  })
}

export const usePayments = (filters?: { patientId?: number; invoiceId?: number }) => {
  return useQuery({
    queryKey: ['payments', filters],
    queryFn: () => dal.getPayments(filters),
  })
}

export const useClaims = () => {
  return useQuery({
    queryKey: ['claims'],
    queryFn: () => dal.getClaims(),
  })
}

export const useAddClaim = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (claim: Omit<Claim, 'id' | 'createdAt' | 'updatedAt'>) => dal.addClaim(claim),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] })
      toast.success('Claim draft created')
    },
    onError: (e) => onErrorHandler(e, 'Failed to create claim'),
  })
}

export const useUpdateClaimStatus = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, externalRef }: { id: number; status: Claim['status']; externalRef?: string }) =>
      dal.updateClaimStatus(id, status, externalRef),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['claims'] })
      toast.success('Claim updated')
    },
    onError: (e) => onErrorHandler(e, 'Failed to update claim'),
  })
}

export const useRemittances = (claimId?: number) => {
  return useQuery({
    queryKey: ['remittances', claimId],
    queryFn: () => dal.getRemittances(claimId),
  })
}

export const usePostRemittance = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<import('../types').Remittance, 'id' | 'postedAt'>) => dal.postRemittance(input),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['remittances'] })
      queryClient.invalidateQueries({ queryKey: ['claims'] })
      toast.success('Remittance posted')
    },
    onError: (e) => onErrorHandler(e, 'Failed to post remittance'),
  })
}

export const usePostRemittancesFromEra = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (inputs: Omit<import('../types').Remittance, 'id' | 'postedAt'>[]) =>
      dal.postRemittancesFromEra(inputs),
    onSuccess: async (_ids, inputs) => {
      queryClient.invalidateQueries({ queryKey: ['remittances'] })
      queryClient.invalidateQueries({ queryKey: ['claims'] })
      toast.success(`Imported ${inputs.length} ERA remittance(s)`)
    },
    onError: (e) => onErrorHandler(e, 'Failed to import ERA'),
  })
}

export const usePatientMessages = (patientId?: number) => {
  return useQuery({
    queryKey: ['patientMessages', patientId],
    queryFn: () => dal.getPatientMessages(patientId),
  })
}

export const useSendPatientMessage = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<import('../types').PatientMessage, 'id' | 'createdAt' | 'readAt'>) =>
      dal.sendPatientMessage(input),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['patientMessages'] })
      toast.success('Message sent')
    },
    onError: (e) => onErrorHandler(e, 'Failed to send message'),
  })
}

export const useMarkMessageRead = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => dal.markMessageRead(id),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['patientMessages'] })
    },
  })
}

export const usePatientAppointments = (patientId: number | undefined) => {
  return useQuery({
    queryKey: ['appointments', 'patient', patientId],
    queryFn: () => dal.getAppointmentsByPatient(patientId!),
    enabled: !!patientId,
  })
}

export const usePatientLabTests = (patientId: number | undefined) => {
  return useQuery({
    queryKey: ['labTests', 'patient', patientId],
    queryFn: () => dal.getLabTestsByPatient(patientId!),
    enabled: !!patientId,
  })
}

export const usePatientMedications = (patientId: number | undefined) => {
  return useQuery({
    queryKey: ['medications', patientId],
    queryFn: () => dal.getMedications(patientId!),
    enabled: !!patientId,
  })
}

export type { Payment }

// ── Pharmacy ─────────────────────────────────────────────
export const useMedicines = () => {
  return useQuery({
    queryKey: ['medicines'],
    queryFn: () => dal.getMedicines(),
  })
}

export const useAddMedicine = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (medicine: Omit<Medicine, 'id'>) => dal.addMedicine(medicine),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] })
      toast.success('Medicine added successfully')
    },
    onError: (e) => onErrorHandler(e, 'Failed to add medicine'),
  })
}

export const usePharmacyOrders = () => {
  return useQuery({
    queryKey: ['pharmacyOrders'],
    queryFn: () => dal.getPharmacyOrders(),
  })
}

export const useAddPharmacyOrder = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (order: Omit<PharmacyOrder, 'id'>) => {
      const id = await dal.addPharmacyOrder(order)
      if (order.status === 'dispensed') {
        const medicines = await dal.getMedicines()
        const med = medicines.find((m) => m.id === order.medicineId)
        if (med) {
          await dal.updateMedicineStock(order.medicineId, Math.max(0, med.stock - order.quantity))
        }
      }
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacyOrders'] })
      queryClient.invalidateQueries({ queryKey: ['medicines'] })
      toast.success('Pharmacy order created')
    },
    onError: (e) => onErrorHandler(e, 'Failed to create pharmacy order'),
  })
}

export const useUpdatePharmacyOrderStatus = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: PharmacyOrder['status'] }) => {
      const orders = await dal.getPharmacyOrders()
      const order = orders.find((o) => o.id === id)
      if (order && status === 'dispensed' && order.status !== 'dispensed') {
        const medicines = await dal.getMedicines()
        const med = medicines.find((m) => m.id === order.medicineId)
        if (med) {
          await dal.updateMedicineStock(order.medicineId, Math.max(0, med.stock - order.quantity))
        }
      }
      return dal.updatePharmacyOrderStatus(id, status)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacyOrders'] })
      queryClient.invalidateQueries({ queryKey: ['medicines'] })
      toast.success('Order status updated')
    },
    onError: (e) => onErrorHandler(e, 'Failed to update order status'),
  })
}

// ── Lab ──────────────────────────────────────────────────
export const useLabTests = () => {
  return useQuery({
    queryKey: ['labTests'],
    queryFn: () => dal.getLabTests(),
  })
}

export const useAddLabTest = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (test: Omit<LabTest, 'id'>) => dal.addLabTest(test),
    onSuccess: async (_, t) => {
      queryClient.invalidateQueries({ queryKey: ['labTests'] })
      toast.success('Lab test ordered successfully')
      await dal.logAudit('create', 'lab_tests', undefined, { patientId: t.patientId, testName: t.testName })
    },
    onError: (e) => onErrorHandler(e, 'Failed to order lab test'),
  })
}

export const useUpdateLabTestStatus = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, result }: { id: number; status: LabTest['status']; result?: string }) =>
      dal.updateLabTestStatus(id, status, result),
    onMutate: async ({ id, status, result }) => {
      await queryClient.cancelQueries({ queryKey: ['labTests'] })
      const previous = queryClient.getQueryData<LabTest[]>(['labTests'])
      queryClient.setQueryData<LabTest[]>(['labTests'], (old = []) =>
        old.map((t) =>
          t.id === id ? { ...t, status, result: result ?? t.result } : t,
        ),
      )
      return { previous }
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['labTests'], ctx.previous)
      onErrorHandler(_e, 'Failed to update lab test')
    },
    onSuccess: async (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['labTests'] })
      toast.success('Lab test updated')
      await dal.logAudit('update_status', 'lab_tests', vars.id, { status: vars.status, hasResult: !!vars.result })
    },
  })
}

// ── ADT / Census ─────────────────────────────────────────
export const useWards = () => {
  return useQuery({
    queryKey: ['wards'],
    queryFn: () => dal.getWards(),
  })
}

export const useBeds = () => {
  return useQuery({
    queryKey: ['beds'],
    queryFn: () => dal.getBeds(),
  })
}

export const useAdmissions = (status?: import('../types').Admission['status']) => {
  return useQuery({
    queryKey: ['admissions', status],
    queryFn: () => dal.getAdmissions(status),
  })
}

export const useAdmitPatient = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      patientId: number
      patientName: string
      bedId: number
      wardId: number
      attendingDoctorId?: number
      attendingDoctorName?: string
      admitReason?: string
    }) => dal.admitPatient(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admissions'] })
      await queryClient.invalidateQueries({ queryKey: ['beds'] })
      toast.success('Patient admitted')
    },
    onError: (e) => onErrorHandler(e, 'Failed to admit patient'),
  })
}

export const useTransferAdmission = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      admissionId,
      newBedId,
      newWardId,
    }: {
      admissionId: number
      newBedId: number
      newWardId: number
    }) => dal.transferAdmission(admissionId, newBedId, newWardId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admissions'] })
      await queryClient.invalidateQueries({ queryKey: ['beds'] })
      toast.success('Patient transferred')
    },
    onError: (e) => onErrorHandler(e, 'Failed to transfer'),
  })
}

export const useDischargeAdmission = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (admissionId: number) => dal.dischargeAdmission(admissionId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admissions'] })
      await queryClient.invalidateQueries({ queryKey: ['beds'] })
      toast.success('Patient discharged')
    },
    onError: (e) => onErrorHandler(e, 'Failed to discharge'),
  })
}

export const useMarkBedAvailable = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (bedId: number) => dal.markBedAvailable(bedId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['beds'] })
      toast.success('Bed marked available')
    },
    onError: (e) => onErrorHandler(e, 'Failed to update bed'),
  })
}

// ── Audit Log ────────────────────────────────────────────
export const useAuditLog = (limit = 50) => {
  return useQuery({
    queryKey: ['auditLog', limit],
    queryFn: () => dal.getAuditLog(limit),
  })
}

// ── Phase D — Facilities / Compliance ────────────────────
export const useFacilities = () => {
  return useQuery({
    queryKey: ['facilities'],
    queryFn: () => dal.getFacilities(),
  })
}

export const useAddFacility = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<import('../types').Facility, 'id'>) => dal.addFacility(input),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['facilities'] })
      toast.success('Facility added')
    },
    onError: (e) => onErrorHandler(e, 'Failed to add facility'),
  })
}

export const useFacilityMemberships = () => {
  return useQuery({
    queryKey: ['facilityMemberships'],
    queryFn: () => dal.getFacilityMemberships(),
  })
}

export const useAddFacilityMembership = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<import('../types').FacilityMembership, 'id'>) =>
      dal.addFacilityMembership(input),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['facilityMemberships'] })
      toast.success('Membership added')
    },
    onError: (e) => onErrorHandler(e, 'Failed to add membership'),
  })
}

export const useRemoveFacilityMembership = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => dal.removeFacilityMembership(id),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['facilityMemberships'] })
      toast.success('Membership removed')
    },
    onError: (e) => onErrorHandler(e, 'Failed to remove membership'),
  })
}

export const useComplianceAttestations = () => {
  return useQuery({
    queryKey: ['compliance'],
    queryFn: () => dal.getComplianceAttestations(),
  })
}

export const useUpdateCompliance = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
      notes,
    }: {
      id: number
      status: import('../types').ComplianceStatus
      notes?: string
    }) => dal.updateComplianceAttestation(id, status, notes),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['compliance'] })
      toast.success('Compliance updated')
    },
    onError: (e) => onErrorHandler(e, 'Failed to update compliance'),
  })
}
