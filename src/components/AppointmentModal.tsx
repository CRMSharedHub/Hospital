import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '../i18n'
import { buildAppointment, hasConflict, type AppointmentDraft } from '../lib/appointments'
import type { Appointment, Doctor, Patient } from '../types'

type FormState = Record<keyof AppointmentDraft, string>
type FormErrors = Partial<Record<keyof AppointmentDraft, string>>

const emptyForm: FormState = { patientId: '', doctorId: '', date: '', time: '' }

export interface AppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  doctors: Doctor[]
  patients: Patient[]
  existingAppointments: Appointment[]
  onSave: (appointment: Omit<Appointment, 'id'>) => void
}

export default function AppointmentModal({
  isOpen,
  onClose,
  doctors,
  patients,
  existingAppointments,
  onSave,
}: AppointmentModalProps) {
  const { t } = useI18n()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<FormErrors>({})
  const [conflict, setConflict] = useState('')

  if (!isOpen) return null

  const selectedPatient = patients.find((p) => String(p.id) === form.patientId)
  const selectedDoctor = doctors.find((d) => String(d.id) === form.doctorId)

  const validate = (): boolean => {
    const next: FormErrors = {}
    if (!selectedPatient) next.patientId = t('requiredField')
    if (!selectedDoctor) next.doctorId = t('requiredField')
    if (!form.date) next.date = t('requiredField')
    if (!form.time) next.time = t('requiredField')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validate() || !selectedPatient || !selectedDoctor) return

    const draft: AppointmentDraft = {
      patientId: selectedPatient.id,
      doctorId: selectedDoctor.id,
      date: form.date,
      time: form.time,
    }

    if (hasConflict(existingAppointments, draft)) {
      setConflict(t('conflictError'))
      return
    }
    setConflict('')

    onSave(buildAppointment(draft, selectedPatient, selectedDoctor))
    setForm(emptyForm)
    setErrors({})
    onClose()
  }

  const handleClose = () => {
    setForm(emptyForm)
    setErrors({})
    setConflict('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('newAppointment')}</h3>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {conflict && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm"
            >
              {conflict}
            </div>
          )}

          <div>
            <label
              htmlFor="appointment-patient"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('patientName')}
            </label>
            <select
              id="appointment-patient"
              value={form.patientId}
              onChange={(e) => setForm({ ...form, patientId: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.patientId ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'
                }`}
            >
              <option value="">--</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.patientId && <p className="text-xs text-red-600 mt-1">{errors.patientId}</p>}
          </div>

          <div>
            <label
              htmlFor="appointment-doctor"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('selectDoctor')}
            </label>
            <select
              id="appointment-doctor"
              value={form.doctorId}
              onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.doctorId ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'
                }`}
            >
              <option value="">--</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name} — {doc.specialty}
                </option>
              ))}
            </select>
            {errors.doctorId && <p className="text-xs text-red-600 mt-1">{errors.doctorId}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="appointment-date"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t('date')}
              </label>
              <input
                id="appointment-date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.date ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'
                  }`}
              />
              {errors.date && <p className="text-xs text-red-600 mt-1">{errors.date}</p>}
            </div>
            <div>
              <label
                htmlFor="appointment-time"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                {t('time')}
              </label>
              <input
                id="appointment-time"
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.time ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'
                  }`}
              />
              {errors.time && <p className="text-xs text-red-600 mt-1">{errors.time}</p>}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
            >
              {t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
