import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, FileText, Pill, StickyNote, Paperclip, Activity } from 'lucide-react'
import { useData } from '../DataContext'
import { useI18n } from '../i18n'
import { useState } from 'react'

const tabs = ['medicalHistory', 'medications', 'notes', 'files']

const tabIcons = {
  medicalHistory: FileText,
  medications: Pill,
  notes: StickyNote,
  files: Paperclip,
}

export default function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, lang } = useI18n()
  const { patients, patientRecords } = useData()
  const [activeTab, setActiveTab] = useState('medicalHistory')

  const patient = patients.find((p) => String(p.id) === id)
  const record = patientRecords[patient?.id] || null

  if (!patient) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500">{lang === 'ar' ? 'المريض غير موجود' : 'Patient not found'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/patients')}
        className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
      >
        <ArrowRight className="w-4 h-4" />
        {t('patients')}
      </button>

      <div className="card flex flex-col md:flex-row md:items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-2xl font-bold">
          {patient.name.charAt(0)}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">{patient.name}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('bloodType')}: {record?.bloodType || '-'} · {t('age')}: {patient.age}
          </p>
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600">
            <span className="flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-primary-500" />
              {patient.condition}
            </span>
            <span>{t('contact')}: {patient.phone}</span>
            <span>
              {t('allergies')}: {record?.allergies?.length ? record.allergies.join(', ') : t('noRecords')}
            </span>
          </div>
        </div>
      </div>

      <div className="card p-2 overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tabIcons[tab]
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {t(tab)}
              </button>
            )
          })}
        </div>

        <div className="p-6 min-h-[240px]">
          {activeTab === 'medicalHistory' && (
            <ul className="space-y-4">
              {record?.history?.length ? (
                record.history.map((item, idx) => (
                  <li key={idx} className="border-l-4 border-primary-500 pl-4 py-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h4 className="font-semibold text-gray-900">{item.title}</h4>
                      <span className="text-xs text-gray-400">{item.date}</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{t('doctor')}: {item.doctor}</p>
                    <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                  </li>
                ))
              ) : (
                <p className="text-gray-400 text-center py-8">{t('noRecords')}</p>
              )}
            </ul>
          )}

          {activeTab === 'medications' && (
            <ul className="space-y-3">
              {record?.medications?.length ? (
                record.medications.map((med, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-4 rounded-xl bg-gray-50">
                    <Pill className="w-5 h-5 text-primary-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-gray-900">{med.name}</h4>
                      <p className="text-sm text-gray-500">{med.dosage} · {t('date')}: {med.startDate}</p>
                    </div>
                  </li>
                ))
              ) : (
                <p className="text-gray-400 text-center py-8">{t('noRecords')}</p>
              )}
            </ul>
          )}

          {activeTab === 'notes' && (
            <ul className="space-y-3">
              {record?.notes?.length ? (
                record.notes.map((note, idx) => (
                  <li key={idx} className="p-4 rounded-xl bg-amber-50 text-amber-900">
                    <span className="text-xs text-amber-700/70 font-medium block mb-1">{note.date}</span>
                    {note.text}
                  </li>
                ))
              ) : (
                <p className="text-gray-400 text-center py-8">{t('noRecords')}</p>
              )}
            </ul>
          )}

          {activeTab === 'files' && (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {record?.files?.length ? (
                record.files.map((file, idx) => (
                  <li key={idx} className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-primary-300 transition-colors">
                    <Paperclip className="w-5 h-5 text-primary-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                      <p className="text-xs text-gray-400">{file.date}</p>
                    </div>
                  </li>
                ))
              ) : (
                <p className="text-gray-400 text-center py-8 col-span-full">{t('noRecords')}</p>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
