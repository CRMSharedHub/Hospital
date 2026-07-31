import { X } from 'lucide-react'
import { useI18n } from '../i18n'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

const patientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  age: z.coerce.number().min(0).max(150),
  phone: z.string().min(5, 'Valid phone required'),
  condition: z.string().min(2, 'Condition required'),
  bloodType: z.string().optional(),
  allergies: z.string().optional(),
})

type PatientFormValues = z.infer<typeof patientSchema>

export default function AddPatientModal({ isOpen, onClose, onSave }: { isOpen: boolean; onClose: () => void; onSave: (data: any) => void }) {
  const { t } = useI18n()
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
  })

  if (!isOpen) return null

  const onSubmit = (data: PatientFormValues) => {
    const today = new Date().toISOString().split('T')[0]
    onSave({
      id: Date.now(),
      name: data.name,
      age: data.age,
      phone: data.phone,
      condition: data.condition,
      lastVisit: today,
      bloodType: data.bloodType || '-',
      allergies: data.allergies ? data.allergies.split(',').map(s=>s.trim()) : [],
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('addPatient')}</h3>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('name')}</label>
            <input
              type="text"
              {...register('name')}
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 dark:text-white ${errors.name ? 'border-red-300' : 'border-gray-200 dark:border-gray-600'}`}
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('age')}</label>
              <input
                type="number"
                {...register('age')}
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 dark:text-white ${errors.age ? 'border-red-300' : 'border-gray-200 dark:border-gray-600'}`}
              />
              {errors.age && <p className="text-xs text-red-600 mt-1">{errors.age.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('bloodType')}</label>
              <input
                type="text"
                {...register('bloodType')}
                placeholder="A+"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('phone')}</label>
            <input
              type="text"
              {...register('phone')}
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 dark:text-white ${errors.phone ? 'border-red-300' : 'border-gray-200 dark:border-gray-600'}`}
            />
            {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('condition')}</label>
            <input
              type="text"
              {...register('condition')}
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 dark:text-white ${errors.condition ? 'border-red-300' : 'border-gray-200 dark:border-gray-600'}`}
            />
            {errors.condition && <p className="text-xs text-red-600 mt-1">{errors.condition.message}</p>}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700 transition-colors"
            >
              {t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
