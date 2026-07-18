import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Stethoscope, Star, Users, CheckCircle2 } from 'lucide-react'
import { useI18n } from '../i18n'
import { useData } from '../DataContext'

export default function DoctorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, lang } = useI18n()
  const { doctors, updateDoctor } = useData()

  const doctor = doctors.find((d) => String(d.id) === id)

  if (!doctor) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500">{lang === 'ar' ? 'الطبيب غير موجود' : 'Doctor not found'}</p>
      </div>
    )
  }

  const toggleAvailability = () => {
    updateDoctor({ ...doctor, available: !doctor.available })
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/doctors')}
        className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
      >
        <ArrowRight className="w-4 h-4" />
        {t('doctors')}
      </button>

      <div className="card flex flex-col md:flex-row md:items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center text-primary-700 text-3xl font-bold">
          {doctor.name.charAt(0)}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">{doctor.name}</h2>
          <p className="text-primary-600 font-medium">{doctor.specialty}</p>
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-primary-500" />
              {t('patientsCount')}: {doctor.patients}
            </span>
            <span className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-warning fill-current" />
              {t('rating')}: {doctor.rating}
            </span>
            <span className={`flex items-center gap-1.5 ${doctor.available ? 'text-emerald-600' : 'text-gray-500'}`}>
              <CheckCircle2 className="w-4 h-4" />
              {doctor.available ? t('available') : t('busy')}
            </span>
          </div>
        </div>
        <button
          onClick={toggleAvailability}
          className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors self-start"
        >
          {t('toggleAvailability')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">{t('specialty')}</h3>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-50 text-primary-600">
              <Stethoscope className="w-5 h-5" />
            </div>
            <p className="text-gray-700">{doctor.specialty}</p>
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">{t('availability')}</h3>
          <p className={`text-sm font-medium ${doctor.available ? 'text-emerald-600' : 'text-gray-500'}`}>
            {doctor.available ? t('available') : t('busy')}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            {lang === 'ar'
              ? 'يمكن تغيير الحالة باستخدام زر تبديل التوفر أعلاه'
              : 'Change status using the toggle availability button above'}
          </p>
        </div>
      </div>
    </div>
  )
}
