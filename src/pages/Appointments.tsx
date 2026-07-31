import { useState } from 'react'
import { Plus, CalendarDays, List, Calendar as CalendarIcon } from 'lucide-react'
import AppointmentModal from '../components/AppointmentModal'
import { useAppointments, useAddAppointment, useUpdateAppointmentStatus, useDoctors, usePatients } from '../lib/api'
import { useI18n } from '../i18n'
import type { Appointment } from '../types'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'

const statusStyles: Record<string, string> = {
  confirmed: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
}

const statusColors: Record<string, string> = {
  confirmed: '#3b82f6',
  pending: '#f59e0b',
  cancelled: '#ef4444',
  completed: '#10b981',
}

const filters = ['all', 'confirmed', 'pending', 'completed', 'cancelled']

export default function Appointments() {
  const { t, lang } = useI18n()
  const { data: appointments = [] } = useAppointments()
  const { data: doctors = [] } = useDoctors()
  const { data: patients = [] } = usePatients()
  const addAppointmentMutation = useAddAppointment()
  const updateStatusMutation = useUpdateAppointmentStatus()

  const [filter, setFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

  const filtered = filter === 'all'
    ? appointments
    : appointments.filter((a) => a.status === filter)

  const calendarEvents = filtered.map(a => {
    return {
      id: String(a.id),
      title: `${a.patientName} (${a.doctorName})`,
      start: `${a.date}T${a.time}`,
      backgroundColor: statusColors[a.status],
      borderColor: statusColors[a.status],
    }
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('appointments')}</h2>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-1.5 rounded-md ${viewMode === 'calendar' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'}`}
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            {t('newAppointment')}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f
              ? 'bg-primary-600 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              }`}
          >
            {f === 'all' ? (lang === 'ar' ? 'الكل' : 'All') : t(f)}
          </button>
        ))}
      </div>

      {viewMode === 'list' ? (
        <div className="grid grid-cols-1 gap-4">
          {filtered.map((appt) => (
            <div
              key={appt.id}
              className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">{appt.patientName}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('doctor')}: {appt.doctorName}
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{appt.date} {appt.time}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-center">
                <select
                  value={appt.status}
                  onChange={(e) =>
                    updateStatusMutation.mutate({
                      id: appt.id,
                      status: e.target.value as Appointment['status'],
                    })
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer border border-transparent outline-none ${statusStyles[appt.status]}`}
                >
                  <option value="pending" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">{t('pending')}</option>
                  <option value="confirmed" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">{t('confirmed')}</option>
                  <option value="completed" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">{t('completed')}</option>
                  <option value="cancelled" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">{t('cancelled')}</option>
                </select>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 py-8">
              {lang === 'ar' ? 'لا توجد مواعيد' : 'No appointments found.'}
            </p>
          )}
        </div>
      ) : (
        <div className="card p-4 overflow-hidden">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={calendarEvents}
            height="700px"
            slotMinTime="08:00:00"
            slotMaxTime="20:00:00"
            allDaySlot={false}
          />
        </div>
      )}

      <AppointmentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        doctors={doctors}
        patients={patients}
        existingAppointments={appointments}
        onSave={(newAppt) => addAppointmentMutation.mutate(newAppt)}
      />
    </div>
  )
}
