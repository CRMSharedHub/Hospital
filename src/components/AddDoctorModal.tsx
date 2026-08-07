import { X } from 'lucide-react'
import { useI18n } from '../i18n'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { doctorSchema } from '../lib/validation'
import type { Doctor } from '../types'

type DoctorFormInput = z.input<typeof doctorSchema>
type DoctorFormValues = z.output<typeof doctorSchema>

export interface AddDoctorModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (doctor: Omit<Doctor, 'id'>) => void
}

export default function AddDoctorModal({ isOpen, onClose, onSave }: AddDoctorModalProps) {
  const { t } = useI18n()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DoctorFormInput, unknown, DoctorFormValues>({
    resolver: zodResolver(doctorSchema),
  })

  if (!isOpen) return null

  const onSubmit = (data: DoctorFormValues) => {
    onSave({
      name: data.name,
      specialty: data.specialty,
      available: true,
      rating: data.rating,
      patients: data.patients,
    })
    reset()
    onClose()
  }

  const handleClose = () => {
    reset()
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

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('name')}</label>
            <input
              type="text"
              {...register('name')}
              className={`w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.name ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'}`}
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('specialty')}</label>
            <input
              type="text"
              {...register('specialty')}
              className={`w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.specialty ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'}`}
            />
            {errors.specialty && <p className="text-xs text-red-600 mt-1">{errors.specialty.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('rating')}</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                {...register('rating')}
                className={`w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.rating ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'}`}
              />
              {errors.rating && <p className="text-xs text-red-600 mt-1">{errors.rating.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('patientsCount')}</label>
              <input
                type="number"
                min="0"
                {...register('patients')}
                className={`w-full px-3 py-2 rounded-lg border text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.patients ? 'border-red-300' : 'border-gray-200 dark:border-gray-700'}`}
              />
              {errors.patients && <p className="text-xs text-red-600 mt-1">{errors.patients.message}</p>}
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
