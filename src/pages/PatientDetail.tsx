import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, FileText, Pill, StickyNote, Paperclip, Activity, Plus } from 'lucide-react'
import { usePatient, usePatientEHR, useAddClinicalVisit, useAddMedication, useAddClinicalNote, useUploadMedicalFile } from '../lib/api'
import { useI18n } from '../i18n'
import { useState } from 'react'

const tabs = ['medicalHistory', 'medications', 'notes', 'files']
const tabIcons: any = { medicalHistory: FileText, medications: Pill, notes: StickyNote, files: Paperclip }

export default function PatientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, lang } = useI18n()
  
  const patientId = Number(id)
  const { data: patient, isLoading: isPatientLoading } = usePatient(patientId)
  const { visits, medications, notes, files } = usePatientEHR(patientId)
  
  const [activeTab, setActiveTab] = useState('medicalHistory')

  // Forms states
  const [showForm, setShowForm] = useState(false)
  const [formText, setFormText] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formDate, setFormDate] = useState('')
  
  const addVisitMutation = useAddClinicalVisit()
  const addNoteMutation = useAddClinicalNote()
  const addMedMutation = useAddMedication()

  if (isPatientLoading) return <div className="p-8 text-center">Loading...</div>
  if (!patient) return <div className="card text-center py-12"><p className="text-gray-500">Patient not found</p></div>

  const handleSaveVisit = () => {
    addVisitMutation.mutate({ id: crypto.randomUUID(), patientId, doctorId: 1, date: formDate, title: formTitle, notes: formText })
    setShowForm(false)
    setFormText(''); setFormTitle(''); setFormDate('')
  }

  const handleSaveNote = () => {
    addNoteMutation.mutate({ id: crypto.randomUUID(), patientId, date: new Date().toISOString().split('T')[0], text: formText })
    setShowForm(false)
    setFormText('')
  }

  const handleSaveMed = () => {
    addMedMutation.mutate({ id: crypto.randomUUID(), patientId, name: formTitle, dosage: formText, startDate: formDate })
    setShowForm(false)
    setFormText(''); setFormTitle(''); setFormDate('')
  }

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/patients')} className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium">
        <ArrowRight className="w-4 h-4" /> {t('patients')}
      </button>

      <div className="card flex flex-col md:flex-row md:items-center gap-6">
        <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-2xl font-bold">
          {patient.name.charAt(0)}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">{patient.name}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('bloodType')}: {patient.bloodType || '-'} · {t('age')}: {patient.age}
          </p>
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600">
            <span className="flex items-center gap-1.5"><Activity className="w-4 h-4 text-primary-500" />{patient.condition}</span>
            <span>{t('contact')}: {patient.phone}</span>
            <span>{t('allergies')}: {patient.allergies?.length ? patient.allergies.join(', ') : t('noRecords')}</span>
          </div>
        </div>
      </div>

      <div className="card p-2 overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto justify-between pr-4">
          <div className="flex">
            {tabs.map((tab) => {
              const Icon = tabIcons[tab]
              return (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setShowForm(false) }}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  <Icon className="w-4 h-4" /> {t(tab)}
                </button>
              )
            })}
          </div>
          <button onClick={() => setShowForm(!showForm)} className="self-center px-3 py-1.5 bg-primary-50 text-primary-600 text-sm font-medium rounded-lg hover:bg-primary-100 flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add Record
          </button>
        </div>

        <div className="p-6 min-h-[240px]">
          {/* Medical History */}
          {activeTab === 'medicalHistory' && (
            <div className="space-y-4">
              {showForm && (
                <div className="p-4 bg-gray-50 rounded-xl space-y-3 mb-6">
                  <input type="text" placeholder="Visit Title" value={formTitle} onChange={e=>setFormTitle(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm" />
                  <input type="date" value={formDate} onChange={e=>setFormDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm" />
                  <textarea placeholder="Clinical notes..." value={formText} onChange={e=>setFormText(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm h-20" />
                  <button onClick={handleSaveVisit} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">Save Visit</button>
                </div>
              )}
              {visits.data?.length ? visits.data.map((item) => (
                <div key={item.id} className="border-l-4 border-primary-500 pl-4 py-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h4 className="font-semibold text-gray-900">{item.title}</h4>
                    <span className="text-xs text-gray-400">{item.date}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                </div>
              )) : <p className="text-gray-400 text-center py-8">{t('noRecords')}</p>}
            </div>
          )}

          {/* Medications */}
          {activeTab === 'medications' && (
            <div className="space-y-3">
              {showForm && (
                <div className="p-4 bg-gray-50 rounded-xl space-y-3 mb-6">
                  <input type="text" placeholder="Medication Name" value={formTitle} onChange={e=>setFormTitle(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm" />
                  <input type="text" placeholder="Dosage" value={formText} onChange={e=>setFormText(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm" />
                  <input type="date" value={formDate} onChange={e=>setFormDate(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm" />
                  <button onClick={handleSaveMed} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">Save Medication</button>
                </div>
              )}
              {medications.data?.length ? medications.data.map((med) => (
                <div key={med.id} className="flex items-start gap-3 p-4 rounded-xl bg-gray-50">
                  <Pill className="w-5 h-5 text-primary-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">{med.name}</h4>
                    <p className="text-sm text-gray-500">{med.dosage} · Start: {med.startDate}</p>
                  </div>
                </div>
              )) : <p className="text-gray-400 text-center py-8">{t('noRecords')}</p>}
            </div>
          )}

          {/* Notes */}
          {activeTab === 'notes' && (
            <div className="space-y-3">
              {showForm && (
                <div className="p-4 bg-gray-50 rounded-xl space-y-3 mb-6">
                  <textarea placeholder="Write a note..." value={formText} onChange={e=>setFormText(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm h-24" />
                  <button onClick={handleSaveNote} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm">Save Note</button>
                </div>
              )}
              {notes.data?.length ? notes.data.map((note) => (
                <div key={note.id} className="p-4 rounded-xl bg-amber-50 text-amber-900">
                  <span className="text-xs text-amber-700/70 font-medium block mb-1">{note.date}</span>
                  {note.text}
                </div>
              )) : <p className="text-gray-400 text-center py-8">{t('noRecords')}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
