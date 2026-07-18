import { useState } from 'react'
import { Plus, CalendarDays } from 'lucide-react'
import AppointmentModal from '../components/AppointmentModal'
import { useData } from '../DataContext'
import { useI18n } from '../i18n'

const statusStyles = {
  confirmed: 'bg-blue-50 text-blue-700',
  pending: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-red-50 text-red-700',
  completed: 'bg-emerald-50 text-emerald-700',
}

const filters = ['all', 'confirmed', 'pending', 'completed', 'cancelled']

export default function Appointments() {
  const { t, lang } = useI18n()
  const { appointments, patients, doctors, addAppointment } = useData()
  const [filter, setFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)

  const filtered =
    filter === 'all'
      ? appointments
      : appointments.filter((a) => a.status === filter)

  const handleSave = (newAppt) => {
    addAppointment(newAppt)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-900">{t('appointments')}</h2>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          {t('newAppointment')}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
          >
            {f === 'all' ? (lang === 'ar' ? 'الكل' : 'All') : t(f)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.map((appt) => (
          <div
            key={appt.id}
            className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-primary-50 text-primary-600">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{appt.patient}</h4>
                <p className="text-sm text-gray-500">
                  {t('doctor')}: {appt.doctor}
                </p>
                <p className="text-sm text-gray-400 mt-1">{appt.date}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium self-start sm:self-center ${statusStyles[appt.status]}`}>
              {t(appt.status)}
            </span>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-8">
            {lang === 'ar' ? 'لا توجد مواعيد' : 'No appointments found.'}
          </p>
        )}
      </div>

      <AppointmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        doctors={doctors}
        patients={patients}
        existingAppointments={appointments}
        onSave={handleSave}
      />
    </div>
  )
}
