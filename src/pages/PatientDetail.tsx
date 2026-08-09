import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  FileText,
  Pill,
  StickyNote,
  Paperclip,
  Activity,
  Plus,
  HeartPulse,
  ListChecks,
  ClipboardList,
  Syringe,
  Printer,
} from 'lucide-react'
import {
  usePatient,
  usePatientEHR,
  useAddClinicalVisit,
  useAddMedication,
  useAddClinicalNote,
  useAddVitalSign,
  useAddProblem,
  useUpdateProblemStatus,
  useClinicalOrders,
  useMarEntries,
} from '../lib/api'
import { useI18n, type TranslationKey } from '../i18n'
import CdsAlertCards from '../components/CdsAlertCards'
import { useState } from 'react'
import { visitSchema, medicationSchema, noteSchema, vitalSignSchema, problemSchema } from '../lib/validation'
import { formatBp, vitalWarnings } from '../lib/clinicalChart'
import { buildRxHtml, buildDischargeHtml, printClinicalHtml } from '../lib/clinicalDocs'
import { dal } from '../lib/dal'
import { toast } from 'sonner'
import type { LucideIcon } from 'lucide-react'
import { usePermission } from '../auth/usePermission'
import { useAuthStore } from '../store/authStore'

const tabs = ['vitals', 'problemList', 'orders', 'emar', 'medicalHistory', 'medications', 'notes', 'files'] as const
type Tab = (typeof tabs)[number]
const fieldClass =
  'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const tabIcons: Record<Tab, LucideIcon> = {
  vitals: HeartPulse,
  problemList: ListChecks,
  orders: ClipboardList,
  emar: Syringe,
  medicalHistory: FileText,
  medications: Pill,
  notes: StickyNote,
  files: Paperclip,
}

function numOrEmpty(v: string): number | undefined {
  if (v.trim() === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

export default function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, lang } = useI18n()
  const { can } = usePermission()
  const canEdit = can('patients:edit')
  const userName = useAuthStore((s) => s.user?.name)

  const patientId = Number(id)
  const { data: patient, isLoading: isPatientLoading } = usePatient(patientId)
  const { visits, medications, notes, files, vitals, problems } = usePatientEHR(patientId)
  const { data: patientOrders = [] } = useClinicalOrders({ patientId })
  const { data: marEntries = [] } = useMarEntries({ patientId })

  const [activeTab, setActiveTab] = useState<Tab>('vitals')
  const [showForm, setShowForm] = useState(false)
  const [formText, setFormText] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formErrors, setFormErrors] = useState<{ title?: string; date?: string; text?: string }>({})

  const [temp, setTemp] = useState('')
  const [hr, setHr] = useState('')
  const [rr, setRr] = useState('')
  const [sbp, setSbp] = useState('')
  const [dbp, setDbp] = useState('')
  const [spo2, setSpo2] = useState('')
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [vitalNotes, setVitalNotes] = useState('')
  const [vitalError, setVitalError] = useState('')
  const [vitalWarn, setVitalWarn] = useState<string[]>([])

  const [probCode, setProbCode] = useState('')
  const [probSeverity, setProbSeverity] = useState<'mild' | 'moderate' | 'severe' | ''>('')
  const [probOnset, setProbOnset] = useState('')

  const addVisitMutation = useAddClinicalVisit()
  const addNoteMutation = useAddClinicalNote()
  const addMedMutation = useAddMedication()
  const addVitalMutation = useAddVitalSign()
  const addProblemMutation = useAddProblem()
  const updateProblemMutation = useUpdateProblemStatus()

  if (isPatientLoading) return <div className="p-8 text-center">{t('loading')}</div>
  if (!patient)
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">{t('patientNotFound')}</p>
      </div>
    )

  const resetCommonForm = () => {
    setShowForm(false)
    setFormText('')
    setFormTitle('')
    setFormDate('')
    setFormErrors({})
    setTemp(''); setHr(''); setRr(''); setSbp(''); setDbp(''); setSpo2(''); setWeight(''); setHeight('')
    setVitalNotes(''); setVitalError(''); setVitalWarn([])
    setProbCode(''); setProbSeverity(''); setProbOnset('')
  }

  const handleSaveVisit = () => {
    const result = visitSchema.safeParse({ title: formTitle, date: formDate, notes: formText })
    if (!result.success) {
      const errs: { title?: string; date?: string; text?: string } = {}
      for (const issue of result.error.issues) {
        if (issue.path[0] === 'title') errs.title = issue.message
        if (issue.path[0] === 'date') errs.date = issue.message
        if (issue.path[0] === 'notes') errs.text = issue.message
      }
      setFormErrors(errs)
      return
    }
    addVisitMutation.mutate({ id: crypto.randomUUID(), patientId, doctorId: 1, date: formDate, title: formTitle, notes: formText })
    resetCommonForm()
  }

  const handleSaveNote = () => {
    const result = noteSchema.safeParse({ text: formText })
    if (!result.success) {
      setFormErrors({ text: result.error.issues[0]?.message })
      return
    }
    addNoteMutation.mutate({ id: crypto.randomUUID(), patientId, date: new Date().toISOString().split('T')[0], text: formText })
    resetCommonForm()
  }

  const handleSaveMed = () => {
    const result = medicationSchema.safeParse({ name: formTitle, dosage: formText, startDate: formDate })
    if (!result.success) {
      const errs: { title?: string; date?: string; text?: string } = {}
      for (const issue of result.error.issues) {
        if (issue.path[0] === 'name') errs.title = issue.message
        if (issue.path[0] === 'dosage') errs.text = issue.message
        if (issue.path[0] === 'startDate') errs.date = issue.message
      }
      setFormErrors(errs)
      return
    }
    addMedMutation.mutate({ id: crypto.randomUUID(), patientId, name: formTitle, dosage: formText, startDate: formDate })
    resetCommonForm()
  }

  const handleSaveVitals = () => {
    const payload = {
      temperatureC: numOrEmpty(temp),
      heartRate: numOrEmpty(hr),
      respiratoryRate: numOrEmpty(rr),
      systolicBp: numOrEmpty(sbp),
      diastolicBp: numOrEmpty(dbp),
      spo2: numOrEmpty(spo2),
      weightKg: numOrEmpty(weight),
      heightCm: numOrEmpty(height),
      notes: vitalNotes || undefined,
    }
    const result = vitalSignSchema.safeParse(payload)
    if (!result.success) {
      setVitalError(result.error.issues[0]?.message ?? 'Invalid vitals')
      return
    }
    const warnings = vitalWarnings(result.data)
    setVitalWarn(warnings)
    setVitalError('')
    addVitalMutation.mutate({
      patientId,
      recordedAt: new Date().toISOString(),
      recordedBy: userName,
      ...result.data,
    })
    resetCommonForm()
  }

  const handleSaveProblem = () => {
    const result = problemSchema.safeParse({
      display: formTitle,
      code: probCode || undefined,
      severity: probSeverity || undefined,
      onsetDate: probOnset || undefined,
      notes: formText || undefined,
    })
    if (!result.success) {
      setFormErrors({ title: result.error.issues[0]?.message })
      return
    }
    addProblemMutation.mutate({
      patientId,
      display: result.data.display,
      code: result.data.code,
      severity: result.data.severity,
      onsetDate: result.data.onsetDate,
      notes: result.data.notes,
      status: 'active',
      recordedBy: userName,
    })
    resetCommonForm()
  }

  const showAdd = canEdit && activeTab !== 'files' && activeTab !== 'orders' && activeTab !== 'emar'

  const handlePrintRx = () => {
    try {
      const lines = (medications.data ?? []).map((m) => ({
        medicineName: m.name,
        dose: m.dosage,
      }))
      if (lines.length === 0) {
        toast.error(t('noRecords'))
        return
      }
      printClinicalHtml(
        buildRxHtml({
          patientName: patient.name,
          patientId,
          age: patient.age,
          allergies: patient.allergies,
          prescribedBy: userName,
          lines,
        }),
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Print failed')
    }
  }

  const handlePrintDischarge = () => {
    try {
      const latestVital = vitals.data?.[0]
      const vitalsSummary = latestVital
        ? `T ${latestVital.temperatureC ?? '—'} · HR ${latestVital.heartRate ?? '—'} · BP ${formatBp(latestVital)} · SpO₂ ${latestVital.spo2 ?? '—'}`
        : undefined
      printClinicalHtml(
        buildDischargeHtml({
          patientName: patient.name,
          patientId,
          age: patient.age,
          problems: (problems.data ?? []).map((p) => ({
            display: p.display,
            code: p.code,
            status: p.status,
          })),
          medications: (medications.data ?? []).map((m) => ({ name: m.name, dosage: m.dosage })),
          vitalsSummary,
          signedBy: userName,
        }),
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Print failed')
    }
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/patients')} className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium">
        <ArrowRight className="w-4 h-4" /> {t('patients')}
      </button>

      <div className="card flex flex-col md:flex-row md:items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center text-primary-700 dark:text-primary-300 text-2xl font-bold">
          {patient.name.charAt(0)}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{patient.name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('bloodType')}: {patient.bloodType || '-'} · {t('age')}: {patient.age}
          </p>
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1.5"><Activity className="w-4 h-4 text-primary-500" />{patient.condition}</span>
            <span>{t('contact')}: {patient.phone}</span>
            <span>{t('allergies')}: {patient.allergies?.length ? patient.allergies.join(', ') : t('noRecords')}</span>
          </div>
          {canEdit && (
            <div className="flex flex-wrap gap-2 mt-4 print:hidden">
              <button type="button" onClick={handlePrintRx} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600">
                <Printer className="w-4 h-4" /> {t('printRx')}
              </button>
              <button type="button" onClick={handlePrintDischarge} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600">
                <Printer className="w-4 h-4" /> {t('printDischarge')}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card p-2 overflow-hidden">
        <div className="flex border-b border-gray-100 dark:border-gray-700 overflow-x-auto justify-between pr-4">
          <div className="flex">
            {tabs.map((tab) => {
              const Icon = tabIcons[tab]
              return (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setShowForm(false) }}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? 'border-primary-600 text-primary-700 dark:text-primary-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                >
                  <Icon className="w-4 h-4" /> {t(tab as TranslationKey)}
                </button>
              )
            })}
          </div>
          {showAdd && (
            <button onClick={() => setShowForm(!showForm)} className="self-center px-3 py-1.5 bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm font-medium rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/50 flex items-center gap-1">
              <Plus className="w-4 h-4" /> {t('addRecord')}
            </button>
          )}
        </div>

        <div className="p-6 min-h-[240px]">
          {activeTab === 'vitals' && (
            <div className="space-y-4">
              {showForm && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-xl space-y-3 mb-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <label className="text-xs space-y-1"><span className="text-gray-500">{t('temperatureC')}</span><input value={temp} onChange={(e) => setTemp(e.target.value)} className={fieldClass} inputMode="decimal" /></label>
                    <label className="text-xs space-y-1"><span className="text-gray-500">{t('heartRate')}</span><input value={hr} onChange={(e) => setHr(e.target.value)} className={fieldClass} inputMode="numeric" /></label>
                    <label className="text-xs space-y-1"><span className="text-gray-500">{t('respiratoryRate')}</span><input value={rr} onChange={(e) => setRr(e.target.value)} className={fieldClass} inputMode="numeric" /></label>
                    <label className="text-xs space-y-1"><span className="text-gray-500">{t('spo2')}</span><input value={spo2} onChange={(e) => setSpo2(e.target.value)} className={fieldClass} inputMode="numeric" /></label>
                    <label className="text-xs space-y-1"><span className="text-gray-500">{t('systolicBp')}</span><input value={sbp} onChange={(e) => setSbp(e.target.value)} className={fieldClass} inputMode="numeric" /></label>
                    <label className="text-xs space-y-1"><span className="text-gray-500">{t('diastolicBp')}</span><input value={dbp} onChange={(e) => setDbp(e.target.value)} className={fieldClass} inputMode="numeric" /></label>
                    <label className="text-xs space-y-1"><span className="text-gray-500">{t('weightKg')}</span><input value={weight} onChange={(e) => setWeight(e.target.value)} className={fieldClass} inputMode="decimal" /></label>
                    <label className="text-xs space-y-1"><span className="text-gray-500">{t('heightCm')}</span><input value={height} onChange={(e) => setHeight(e.target.value)} className={fieldClass} inputMode="decimal" /></label>
                  </div>
                  <textarea placeholder={t('clinicalNotes')} value={vitalNotes} onChange={(e) => setVitalNotes(e.target.value)} className={`${fieldClass} h-16`} />
                  {vitalError && <p className="text-xs text-red-600">{vitalError}</p>}
                  {vitalWarn.map((w) => <p key={w} className="text-xs text-amber-600">{w}</p>)}
                  <button onClick={handleSaveVitals} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">{t('saveVitals')}</button>
                </div>
              )}
              {vitals.data?.length ? vitals.data.map((v) => (
                <div key={v.id} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/40 space-y-2">
                  <div className="flex justify-between gap-2 text-xs text-gray-500">
                    <span>{new Date(v.recordedAt).toLocaleString()}</span>
                    <span>{v.recordedBy}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm text-gray-800 dark:text-gray-100">
                    <span>{t('temperatureC')}: {v.temperatureC ?? '—'}</span>
                    <span>{t('heartRate')}: {v.heartRate ?? '—'}</span>
                    <span>{t('bloodPressure')}: {formatBp(v)}</span>
                    <span>{t('spo2')}: {v.spo2 != null ? `${v.spo2}%` : '—'}</span>
                    <span>{t('respiratoryRate')}: {v.respiratoryRate ?? '—'}</span>
                    <span>{t('weightKg')}: {v.weightKg ?? '—'}</span>
                    <span>{t('heightCm')}: {v.heightCm ?? '—'}</span>
                  </div>
                  {v.notes && <p className="text-sm text-gray-600 dark:text-gray-400">{v.notes}</p>}
                </div>
              )) : <p className="text-gray-400 text-center py-8">{t('noRecords')}</p>}
            </div>
          )}

          {activeTab === 'problemList' && (
            <div className="space-y-3">
              {showForm && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-xl space-y-3 mb-6">
                  <input type="text" placeholder={t('problemName')} value={formTitle} onChange={(e) => { setFormTitle(e.target.value); setFormErrors({}) }} className={`${fieldClass} ${formErrors.title ? 'border-red-300' : ''}`} />
                  {formErrors.title && <p className="text-xs text-red-600">{formErrors.title}</p>}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input type="text" placeholder={t('icd10Code')} value={probCode} onChange={(e) => setProbCode(e.target.value)} className={fieldClass} />
                    <select value={probSeverity} onChange={(e) => setProbSeverity(e.target.value as typeof probSeverity)} className={fieldClass}>
                      <option value="">{t('severity')}</option>
                      <option value="mild">{t('mild')}</option>
                      <option value="moderate">{t('moderate')}</option>
                      <option value="severe">{t('severe')}</option>
                    </select>
                    <input type="date" value={probOnset} onChange={(e) => setProbOnset(e.target.value)} className={fieldClass} />
                  </div>
                  <textarea placeholder={t('clinicalNotes')} value={formText} onChange={(e) => setFormText(e.target.value)} className={`${fieldClass} h-16`} />
                  <button onClick={handleSaveProblem} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">{t('saveProblem')}</button>
                </div>
              )}
              {problems.data?.length ? problems.data.map((p) => (
                <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">
                      {p.display}
                      {p.code && <span className="ms-2 text-xs text-gray-500">{p.code}</span>}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {t(p.status as TranslationKey)}
                      {p.severity ? ` · ${t(p.severity as TranslationKey)}` : ''}
                      {p.onsetDate ? ` · ${p.onsetDate}` : ''}
                    </p>
                  </div>
                  {canEdit && p.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => updateProblemMutation.mutate({ id: p.id, patientId, status: 'resolved' })}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      {t('resolveProblem')}
                    </button>
                  )}
                </div>
              )) : <p className="text-gray-400 text-center py-8">{t('noRecords')}</p>}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate('/orders')}
                  className="text-sm text-primary-600 font-medium"
                >
                  {t('orders')} →
                </button>
              </div>
              {patientOrders.length ? patientOrders.map((o) => (
                <div key={o.id} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{o.description}</h4>
                    <span className="text-xs text-gray-500">{t(o.orderType as TranslationKey)}</span>
                    <span className="text-xs text-gray-500">{t(o.status as TranslationKey)}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{new Date(o.orderedAt).toLocaleString()}</p>
                  {o.allergyAlert && <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{o.allergyAlert}</p>}
                  {o.cdsOverrideReason && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t('cdsOverrideReason')}: {o.cdsOverrideReason}
                    </p>
                  )}
                  {o.cdsAlerts?.length ? (
                    <div className="mt-2 scale-[0.95] origin-top">
                      <CdsAlertCards alerts={o.cdsAlerts} locale={lang} />
                    </div>
                  ) : null}
                </div>
              )) : <p className="text-gray-400 text-center py-8">{t('noOrders')}</p>}
            </div>
          )}

          {activeTab === 'emar' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button type="button" onClick={() => navigate('/emar')} className="text-sm text-primary-600 font-medium">
                  {t('emar')} →
                </button>
              </div>
              {marEntries.length ? marEntries.map((e) => (
                <div key={e.id} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">{e.medicineName}</h4>
                  <p className="text-sm text-gray-500">
                    {e.dose} · {t(e.status as TranslationKey)} · {new Date(e.scheduledAt).toLocaleString()}
                  </p>
                </div>
              )) : <p className="text-gray-400 text-center py-8">{t('noMar')}</p>}
            </div>
          )}

          {activeTab === 'medicalHistory' && (
            <div className="space-y-4">
              {showForm && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-xl space-y-3 mb-6">
                  <input type="text" placeholder={t('visitTitle')} value={formTitle} onChange={e => { setFormTitle(e.target.value); setFormErrors({}) }} className={`${fieldClass} ${formErrors.title ? 'border-red-300' : ''}`} />
                  {formErrors.title && <p className="text-xs text-red-600">{formErrors.title}</p>}
                  <input type="date" value={formDate} onChange={e => { setFormDate(e.target.value); setFormErrors({}) }} className={`${fieldClass} ${formErrors.date ? 'border-red-300' : ''}`} />
                  {formErrors.date && <p className="text-xs text-red-600">{formErrors.date}</p>}
                  <textarea placeholder={t('clinicalNotes')} value={formText} onChange={e => { setFormText(e.target.value); setFormErrors({}) }} className={`${fieldClass} h-20 ${formErrors.text ? 'border-red-300' : ''}`} />
                  {formErrors.text && <p className="text-xs text-red-600">{formErrors.text}</p>}
                  <button onClick={handleSaveVisit} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">{t('saveVisit')}</button>
                </div>
              )}
              {visits.data?.length ? visits.data.map((item) => (
                <div key={item.id} className="border-l-4 border-primary-500 pl-4 py-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100">{item.title}</h4>
                    <span className="text-xs text-gray-400">{item.date}</span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.notes}</p>
                </div>
              )) : <p className="text-gray-400 text-center py-8">{t('noRecords')}</p>}
            </div>
          )}

          {activeTab === 'medications' && (
            <div className="space-y-3">
              {showForm && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-xl space-y-3 mb-6">
                  <input type="text" placeholder={t('medicationName')} value={formTitle} onChange={e => { setFormTitle(e.target.value); setFormErrors({}) }} className={`${fieldClass} ${formErrors.title ? 'border-red-300' : ''}`} />
                  {formErrors.title && <p className="text-xs text-red-600">{formErrors.title}</p>}
                  <input type="text" placeholder={t('dosage')} value={formText} onChange={e => { setFormText(e.target.value); setFormErrors({}) }} className={`${fieldClass} ${formErrors.text ? 'border-red-300' : ''}`} />
                  {formErrors.text && <p className="text-xs text-red-600">{formErrors.text}</p>}
                  <input type="date" value={formDate} onChange={e => { setFormDate(e.target.value); setFormErrors({}) }} className={`${fieldClass} ${formErrors.date ? 'border-red-300' : ''}`} />
                  {formErrors.date && <p className="text-xs text-red-600">{formErrors.date}</p>}
                  <button onClick={handleSaveMed} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">{t('saveMedication')}</button>
                </div>
              )}
              {medications.data?.length ? medications.data.map((med) => (
                <div key={med.id} className="flex items-start gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                  <Pill className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{med.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {med.dosage} · {t('startDate')}: {med.startDate}
                    </p>
                  </div>
                </div>
              )) : <p className="text-gray-400 text-center py-8">{t('noRecords')}</p>}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-3">
              {showForm && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-xl space-y-3 mb-6">
                  <textarea placeholder={t('writeNote')} value={formText} onChange={e => { setFormText(e.target.value); setFormErrors({}) }} className={`${fieldClass} h-24 ${formErrors.text ? 'border-red-300' : ''}`} />
                  {formErrors.text && <p className="text-xs text-red-600">{formErrors.text}</p>}
                  <button onClick={handleSaveNote} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">{t('saveNote')}</button>
                </div>
              )}
              {notes.data?.length ? notes.data.map((note) => (
                <div key={note.id} className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200">
                  <span className="text-xs text-amber-700/70 dark:text-amber-400/80 font-medium block mb-1">{note.date}</span>
                  {note.text}
                </div>
              )) : <p className="text-gray-400 text-center py-8">{t('noRecords')}</p>}
            </div>
          )}

          {activeTab === 'files' && (
            <div className="space-y-3">
              {files.data?.length ? (
                files.data.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-700/40">
                    <Paperclip className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">{file.name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {file.date} · {formatFileSize(file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const accessUrl = await dal.getMedicalFileAccessUrl(file.url)
                          const a = document.createElement('a')
                          a.href = accessUrl
                          a.download = file.name
                          a.rel = 'noopener'
                          a.target = '_blank'
                          a.click()
                        } catch {
                          toast.error(t('download') + ' failed')
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {t('download')}
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center py-8">{t('noFiles')}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
