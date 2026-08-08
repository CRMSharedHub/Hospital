import { useState } from 'react'
import { Search, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usePatients, useAddPatient } from '../lib/api'
import { useI18n } from '../i18n'
import { usePermission } from '../auth/usePermission'
import AddPatientModal from '../components/AddPatientModal'
import type { Patient } from '../types'

export default function Patients() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { can } = usePermission()
  const canEdit = can('patients:edit')
  const { data: patients = [], isLoading } = usePatients()
  const addPatientMutation = useAddPatient()
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const filtered = patients.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.condition.toLowerCase().includes(query.toLowerCase())
  )

  const handleSave = (data: Omit<Patient, 'id'>) => {
    addPatientMutation.mutate(data)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('patients')}</h2>
        {canEdit && (
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            {t('addPatient')}
          </button>
        )}
      </div>

      <div className="card p-4 flex items-center gap-3">
        <Search className="w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('search')}
          className="flex-1 bg-transparent focus:outline-none text-sm text-gray-900 dark:text-gray-100"
        />
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3 font-medium">{t('name')}</th>
                <th className="px-6 py-3 font-medium">{t('age')}</th>
                <th className="px-6 py-3 font-medium">{t('phone')}</th>
                <th className="px-6 py-3 font-medium">{t('condition')}</th>
                <th className="px-6 py-3 font-medium">{t('lastVisit')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">{t('loading')}</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">{t('noPatients')}</td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/patients/${p.id}`)}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 cursor-pointer"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{p.name}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{p.age}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{p.phone}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{p.condition}</td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{p.lastVisit}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddPatientModal
        isOpen={modalOpen && canEdit}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  )
}
