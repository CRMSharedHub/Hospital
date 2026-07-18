import { useState } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '../i18n'

export default function AddPatientModal({ isOpen, onClose, onSave }) {
  const { t } = useI18n()
  const [form, setForm] = useState({
    name: '',
    age: '',
    phone: '',
    condition: '',
    bloodType: '',
    allergies: '',
  })
  const [errors, setErrors] = useState({})

  if (!isOpen) return null

  const validate = () => {
    const next = {}
    if (!form.name.trim()) next.name = t('requiredField')
    if (!form.age) next.age = t('requiredField')
    if (!form.phone.trim()) next.phone = t('requiredField')
    if (!form.condition.trim()) next.condition = t('requiredField')
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    const today = new Date().toISOString().split('T')[0]
    onSave({
      id: Date.now(),
      name: form.name,
      age: Number(form.age),
      phone: form.phone,
      condition: form.condition,
      lastVisit: today,
      bloodType: form.bloodType,
      allergies: form.allergies,
    })
    setForm({ name: '', age: '', phone: '', condition: '', bloodType: '', allergies: '' })
    setErrors({})
    onClose()
  }

  const handleClose = () => {
    setForm({ name: '', age: '', phone: '', condition: '', bloodType: '', allergies: '' })
    setErrors({})
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{t('addPatient')}</h3>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('name')}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.name ? 'border-red-300' : 'border-gray-200'}`}
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('age')}</label>
              <input
                type="number"
                min="0"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.age ? 'border-red-300' : 'border-gray-200'}`}
              />
              {errors.age && <p className="text-xs text-red-600 mt-1">{errors.age}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('bloodType')}</label>
              <input
                type="text"
                value={form.bloodType}
                onChange={(e) => setForm({ ...form, bloodType: e.target.value })}
                placeholder="A+"
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('phone')}</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.phone ? 'border-red-300' : 'border-gray-200'}`}
            />
            {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('condition')}</label>
            <input
              type="text"
              value={form.condition}
              onChange={(e) => setForm({ ...form, condition: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.condition ? 'border-red-300' : 'border-gray-200'}`}
            />
            {errors.condition && <p className="text-xs text-red-600 mt-1">{errors.condition}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('allergies')}</label>
            <input
              type="text"
              value={form.allergies}
              onChange={(e) => setForm({ ...form, allergies: e.target.value })}
              placeholder={t('search')}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
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
