import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '../i18n'
import type { Doctor } from '../types'

type FormState = { name: string; specialty: string; rating: string; patients: string }
type FormErrors = Partial<Record<keyof FormState, string>>

const emptyForm: FormState = { name: '', specialty: '', rating: '', patients: '' }

export interface AddDoctorModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (doctor: Omit<Doctor, 'id'>) => void
}

export default function AddDoctorModal({ isOpen, onClose, onSave }: AddDoctorModalProps) {
  const { t } = useI18n()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<FormErrors>({})

  if (!isOpen) return null

  const validate = (): boolean => {
    const next: FormErrors = {}
    if (!form.name.trim()) next.name = t('requiredField')
    if (!form.specialty.trim()) next.specialty = t('requiredField')
    if (!form.rating) next.rating = t('requiredField')
    if (!form.patients) next.patients = t('requiredField')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!validate()) return
    onSave({
      name: form.name,
      specialty: form.specialty,
      available: true,
      rating: Number(form.rating),
      patients: Number(form.patients),
    })
    setForm(emptyForm)
    setErrors({})
    onClose()
  }

  const handleClose = () => {
    setForm(emptyForm)
    setErrors({})
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('newDoctor')}</h3>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('name')}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.name ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'}`}
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('specialty')}</label>
            <input
              type="text"
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.specialty ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'}`}
            />
            {errors.specialty && <p className="text-xs text-red-600 mt-1">{errors.specialty}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('rating')}</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.rating ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'}`}
              />
              {errors.rating && <p className="text-xs text-red-600 mt-1">{errors.rating}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('patientsCount')}</label>
              <input
                type="number"
                min="0"
                value={form.patients}
                onChange={(e) => setForm({ ...form, patients: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.patients ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'}`}
              />
              {errors.patients && <p className="text-xs text-red-600 mt-1">{errors.patients}</p>}
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
