import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stethoscope, Star, Users, Plus } from 'lucide-react'
import { useDoctors, useAddDoctor } from '../lib/api'
import { useI18n } from '../i18n'
import AddDoctorModal from '../components/AddDoctorModal'
import type { Doctor } from '../types'

export default function Doctors() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { data: doctors = [] } = useDoctors()
  const addDoctorMutation = useAddDoctor()
  const [modalOpen, setModalOpen] = useState(false)

  const handleSave = (doc: Omit<Doctor, 'id'>) => {
    addDoctorMutation.mutate(doc)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('doctors')}</h2>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          {t('addDoctor')}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {doctors.map((doc) => (
          <div
            key={doc.id}
            onClick={() => navigate(`/doctors/${doc.id}`)}
            className="card flex flex-col items-center text-center hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-100 to-primary-50 dark:from-primary-900/50 dark:to-primary-900/20 flex items-center justify-center mb-4">
              <Stethoscope className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{doc.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{doc.specialty}</p>

            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" /> {doc.patients}
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 text-warning fill-current" /> {doc.rating}
              </span>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${doc.available
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
                }`}
            >
              {doc.available ? t('available') : t('busy')}
            </span>
          </div>
        ))}
      </div>

      <AddDoctorModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  )
}
