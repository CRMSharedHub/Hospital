import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Star, Users, CheckCircle2 } from 'lucide-react'
import { useI18n } from '../i18n'
import { useDoctor, useUpdateDoctor } from '../lib/api'

export default function DoctorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useI18n()

  const doctorId = Number(id)
  const { data: doctor, isLoading } = useDoctor(doctorId)
  const updateDoctorMutation = useUpdateDoctor()

  if (isLoading) return <div className="p-8 text-center">{t('loading')}</div>
  if (!doctor)
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">{t('doctorNotFound')}</p>
      </div>
    )

  const toggleAvailability = () => {
    updateDoctorMutation.mutate({ ...doctor, available: !doctor.available })
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/doctors')} className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium">
        <ArrowRight className="w-4 h-4" /> {t('doctors')}
      </button>

      <div className="card flex flex-col md:flex-row md:items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center text-primary-700 text-3xl font-bold">
          {doctor.name.charAt(0)}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{doctor.name}</h2>
          <p className="text-primary-600 font-medium">{doctor.specialty}</p>
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-primary-500" />{t('patientsCount')}: {doctor.patients}</span>
            <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-warning fill-current" />{t('rating')}: {doctor.rating}</span>
            <span className={`flex items-center gap-1.5 ${doctor.available ? 'text-emerald-600' : 'text-gray-500'}`}>
              <CheckCircle2 className="w-4 h-4" />{doctor.available ? t('available') : t('busy')}
            </span>
          </div>
        </div>
        <button onClick={toggleAvailability} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors self-start">
          {t('toggleAvailability')}
        </button>
      </div>
    </div>
  )
}
