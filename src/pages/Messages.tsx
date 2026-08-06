import { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import {
  usePatientMessages,
  useSendPatientMessage,
  useMarkMessageRead,
  usePatients,
} from '../lib/api'
import { useAuthStore } from '../store/authStore'
import { useI18n } from '../i18n'
import type { MessageSenderRole } from '../types'

export default function Messages() {
  const { t } = useI18n()
  const user = useAuthStore((s) => s.user)
  const isPatient = user?.role === 'patient'
  const linkedId = user?.linkedPatientId
  const { data: patients = [] } = usePatients()
  const { data: messages = [] } = usePatientMessages(isPatient ? linkedId : undefined)
  const send = useSendPatientMessage()
  const markRead = useMarkMessageRead()

  const [patientId, setPatientId] = useState(isPatient && linkedId ? String(linkedId) : '')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  const handleSend = () => {
    const pid = Number(patientId)
    if (!pid || !body.trim() || !user) return
    const patient = patients.find((p) => p.id === pid)
    const patientName = patient?.name || (isPatient ? user.name : `Patient ${pid}`)
    send.mutate({
      patientId: pid,
      patientName,
      subject: subject.trim() || '(no subject)',
      body: body.trim(),
      senderRole: user.role as MessageSenderRole,
      senderName: user.name,
    })
    setSubject('')
    setBody('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-900/30 text-violet-700">
          <MessageSquare className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('messages')}</h2>
      </div>

      <div className="card p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">{t('newMessage')}</h3>
        {!isPatient && (
          <label className="text-sm space-y-1 block">
            <span className="text-gray-500">{t('patients')}</span>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
            >
              <option value="">—</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name} (#{p.id})</option>
              ))}
            </select>
          </label>
        )}
        <label className="text-sm space-y-1 block">
          <span className="text-gray-500">{t('messageSubject')}</span>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
          />
        </label>
        <label className="text-sm space-y-1 block">
          <span className="text-gray-500">{t('messageBody')}</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
          />
        </label>
        <button
          type="button"
          disabled={!patientId || !body.trim() || send.isPending}
          onClick={handleSend}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {t('sendMessage')}
        </button>
      </div>

      <div className="space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 py-8">{t('noMessages')}</p>
        )}
        {messages.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              if (!m.readAt && m.senderRole !== user?.role) markRead.mutate(m.id)
            }}
            className="card p-4 text-start w-full hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {m.subject} · {m.patientName}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {m.senderRole === 'patient' ? t('fromPatient') : t('fromStaff')}: {m.senderName}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 whitespace-pre-wrap">{m.body}</p>
              </div>
              <span className="text-xs text-gray-400 shrink-0">
                {new Date(m.createdAt).toLocaleString()}
                {!m.readAt && m.senderRole !== user?.role ? ' · •' : ''}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
