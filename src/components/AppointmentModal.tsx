import { useState } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '../i18n'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { appointmentSchema, type AppointmentFormValues } from '../lib/validation'
import { buildAppointment, hasConflict, type AppointmentDraft } from '../lib/appointments'
import type { Appointment, Doctor, Patient } from '../types'

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
  const [conflict, setConflict] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
  })

  if (!isOpen) return null

  const onSubmit = (data: AppointmentFormValues) => {
    const selectedPatient = patients.find((p) => String(p.id) === data.patientId)
    const selectedDoctor = doctors.find((d) => String(d.id) === data.doctorId)
    if (!selectedPatient || !selectedDoctor) return

    const draft: AppointmentDraft = {
      patientId: selectedPatient.id,
      doctorId: selectedDoctor.id,
      date: data.date,
      time: data.time,
    }

    if (hasConflict(existingAppointments, draft)) {
      setConflict(t('conflictError'))
      return
    }
    setConflict('')

    onSave(buildAppointment(draft, selectedPatient, selectedDoctor))
    reset()
    onClose()
  }

  const handleClose = () => {
    reset()
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

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
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
              {...register('patientId')}
              className={`w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.patientId ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'}`}
            >
              <option value="">--</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.patientId && <p className="text-xs text-red-600 mt-1">{errors.patientId.message}</p>}
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
              {...register('doctorId')}
              className={`w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.doctorId ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'}`}
            >
              <option value="">--</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name} — {doc.specialty}
                </option>
              ))}
            </select>
            {errors.doctorId && <p className="text-xs text-red-600 mt-1">{errors.doctorId.message}</p>}
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
                {...register('date')}
                className={`w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.date ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'}`}
              />
              {errors.date && <p className="text-xs text-red-600 mt-1">{errors.date.message}</p>}
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
                {...register('time')}
                className={`w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.time ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'}`}
              />
              {errors.time && <p className="text-xs text-red-600 mt-1">{errors.time.message}</p>}
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
