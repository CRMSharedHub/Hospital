import { useState } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '../i18n'

export default function AppointmentModal({ isOpen, onClose, doctors, patients, existingAppointments, onSave }) {
  const { t } = useI18n()
  const [form, setForm] = useState({
    patientId: '',
    doctorId: '',
    date: '',
    time: '',
  })

  const selectedPatient = patients.find((p) => String(p.id) === form.patientId)
  const [errors, setErrors] = useState({})
  const [conflict, setConflict] = useState('')

  if (!isOpen) return null

  const selectedDoctor = doctors.find((d) => String(d.id) === form.doctorId)

  const validate = () => {
    const next = {}
    if (!form.patientId) next.patientId = t('requiredField')
    if (!form.doctorId) next.doctorId = t('requiredField')
    if (!form.date) next.date = t('requiredField')
    if (!form.time) next.time = t('requiredField')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const checkConflict = () => {
    const doctorName = selectedDoctor?.name
    const dateTime = `${form.date} ${form.time}`
    const exists = existingAppointments.some(
      (a) => a.doctor === doctorName && a.date === dateTime
    )
    if (exists) {
      setConflict(t('conflictError'))
      return true
    }
    setConflict('')
    return false
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    if (checkConflict()) return

    onSave({
      id: Date.now(),
      patient: selectedPatient.name,
      doctor: selectedDoctor.name,
      date: `${form.date} ${form.time}`,
      status: 'pending',
    })
    setForm({ patientId: '', doctorId: '', date: '', time: '' })
    setErrors({})
    onClose()
  }

  const handleClose = () => {
    setForm({ patientId: '', doctorId: '', date: '', time: '' })
    setErrors({})
    setConflict('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{t('newAppointment')}</h3>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {conflict && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{conflict}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('patientName')}</label>
            <select
              value={form.patientId}
              onChange={(e) => setForm({ ...form, patientId: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.patientId ? 'border-red-300' : 'border-gray-200'
                }`}
            >
              <option value="">--</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.patientId && <p className="text-xs text-red-600 mt-1">{errors.patientId}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('selectDoctor')}</label>
            <select
              value={form.doctorId}
              onChange={(e) => setForm({ ...form, doctorId: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.doctorId ? 'border-red-300' : 'border-gray-200'
                }`}
            >
              <option value="">--</option>
              {doctors.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.name} — {doc.specialty}
                </option>
              ))}
            </select>
            {errors.doctorId && <p className="text-xs text-red-600 mt-1">{errors.doctorId}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('date')}</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.date ? 'border-red-300' : 'border-gray-200'
                  }`}
              />
              {errors.date && <p className="text-xs text-red-600 mt-1">{errors.date}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('time')}</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.time ? 'border-red-300' : 'border-gray-200'
                  }`}
              />
              {errors.time && <p className="text-xs text-red-600 mt-1">{errors.time}</p>}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50"
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
