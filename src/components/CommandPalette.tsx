import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users, Stethoscope, CalendarDays, X } from 'lucide-react'
import { usePatients, useDoctors, useAppointments } from '../lib/api'
import { useI18n } from '../i18n'

export const OPEN_COMMAND_PALETTE_EVENT = 'hospital:open-command-palette'

export default function CommandPalette() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')

  const { data: patients = [] } = usePatients()
  const { data: doctors = [] } = useDoctors()
  const { data: appointments = [] } = useAppointments()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((v) => !v)
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }
    const handleOpen = () => setIsOpen(true)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, handleOpen)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, handleOpen)
    }
  }, [])

  if (!isOpen) return null

  const q = query.toLowerCase()
  const filteredPatients = patients.filter((p) => p.name.toLowerCase().includes(q) || p.phone.includes(q)).slice(0, 3)
  const filteredDoctors = doctors.filter((d) => d.name.toLowerCase().includes(q) || d.specialty.toLowerCase().includes(q)).slice(0, 3)
  const filteredAppts = appointments.filter((a) => a.patientName.toLowerCase().includes(q) || a.doctorName.toLowerCase().includes(q)).slice(0, 3)

  const handleSelect = (path: string) => {
    navigate(path)
    setIsOpen(false)
    setQuery('')
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={t('search')} onClick={() => setIsOpen(false)}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            aria-label={t('search')}
            className="flex-1 bg-transparent border-0 focus:ring-0 text-base text-gray-900 dark:text-white px-3 py-1 outline-none"
          />
          <button onClick={() => setIsOpen(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" aria-label={t('closeMenu')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.trim() === '' ? (
            <p className="text-center text-sm text-gray-500 py-8">
              {t('commandPaletteHint')}
            </p>
          ) : (
            <div className="space-y-4 py-2">
              {filteredPatients.length > 0 && (
                <div>
                  <h4 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('patients')}</h4>
                  {filteredPatients.map((p) => (
                    <button key={p.id} onClick={() => handleSelect(`/patients/${p.id}`)} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left">
                      <Users className="w-4 h-4 text-primary-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.phone} • {p.condition}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {filteredDoctors.length > 0 && (
                <div>
                  <h4 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('doctors')}</h4>
                  {filteredDoctors.map((d) => (
                    <button key={d.id} onClick={() => handleSelect(`/doctors/${d.id}`)} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left">
                      <Stethoscope className="w-4 h-4 text-accent-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{d.name}</p>
                        <p className="text-xs text-gray-500">{d.specialty}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {filteredAppts.length > 0 && (
                <div>
                  <h4 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{t('appointments')}</h4>
                  {filteredAppts.map((a) => (
                    <button key={a.id} onClick={() => handleSelect(`/appointments`)} className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left">
                      <CalendarDays className="w-4 h-4 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {a.patientName} — {a.doctorName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {a.date} {a.time}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {filteredPatients.length === 0 && filteredDoctors.length === 0 && filteredAppts.length === 0 && (
                <p className="text-center text-sm text-gray-500 py-8">{t('noResults')}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
