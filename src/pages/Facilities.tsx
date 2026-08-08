import { useState } from 'react'
import { Building2 } from 'lucide-react'
import {
  useFacilities,
  useAddFacility,
  useFacilityMemberships,
  useAddFacilityMembership,
  useRemoveFacilityMembership,
} from '../lib/api'
import { useFacilityStore } from '../store/facilityStore'
import { useAuthStore } from '../store/authStore'
import { useI18n } from '../i18n'
import { usePermission } from '../auth/usePermission'
import { scimCreateUser, scimListUsers, scimDeactivateUser } from '../lib/scim'
import { toast } from 'sonner'
import type { FacilityMembership } from '../types'

const DEMO_STAFF = [
  { id: '1', label: 'admin@cityhospital.com' },
  { id: '2', label: 'doctor@cityhospital.com' },
  { id: '3', label: 'nurse@cityhospital.com' },
]

export default function Facilities() {
  const { t } = useI18n()
  const { can } = usePermission()
  const canEdit = can('facilities:edit')
  const user = useAuthStore((s) => s.user)
  const { data: facilities = [] } = useFacilities()
  const { data: memberships = [] } = useFacilityMemberships()
  const addFacility = useAddFacility()
  const addMembership = useAddFacilityMembership()
  const removeMembership = useRemoveFacilityMembership()
  const activeFacilityId = useFacilityStore((s) => s.activeFacilityId)
  const setActive = useFacilityStore((s) => s.setActiveFacilityId)

  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [city, setCity] = useState('Riyadh')
  const [scimLog, setScimLog] = useState('')
  const [memberUserId, setMemberUserId] = useState(DEMO_STAFF[1]?.id ?? '2')
  const [memberFacilityId, setMemberFacilityId] = useState('')
  const [memberRole, setMemberRole] = useState<FacilityMembership['role']>('doctor')

  const handleAdd = () => {
    if (!code.trim() || !name.trim()) return
    addFacility.mutate({
      code: code.trim(),
      name: name.trim(),
      city: city.trim() || undefined,
      timezone: 'Asia/Riyadh',
      active: true,
    })
    setCode('')
    setName('')
  }

  const handleAddMembership = () => {
    const facilityId = Number(memberFacilityId)
    if (!facilityId || !memberUserId) return
    addMembership.mutate({
      userId: memberUserId,
      facilityId,
      role: memberRole,
    })
  }

  const handleScimDemo = () => {
    const u = scimCreateUser({
      userName: 'scim.demo',
      displayName: 'SCIM Demo User',
      email: 'scim.demo@cityhospital.com',
      role: 'nurse',
      externalId: `ext-${Date.now()}`,
    })
    setScimLog(JSON.stringify({ created: u, list: scimListUsers() }, null, 2))
    toast.success('SCIM stub user created')
  }

  const handleScimOff = () => {
    const list = scimListUsers()
    const last = list.Resources[list.Resources.length - 1]
    if (!last) {
      toast.error('No SCIM users')
      return
    }
    const off = scimDeactivateUser(last.id)
    setScimLog(JSON.stringify({ deactivated: off, list: scimListUsers() }, null, 2))
  }

  const facilityName = (id: number) => facilities.find((f) => f.id === id)?.code ?? `#${id}`

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
          <Building2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('facilities')}</h2>
          <p className="text-sm text-gray-500">{t('facilitiesHint')}</p>
        </div>
      </div>

      {canEdit && (
      <div className="card p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">{t('newFacility')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="CODE"
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
          />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('facilityName')}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
          />
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={t('city')}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
          />
        </div>
        <button
          type="button"
          disabled={!code.trim() || !name.trim() || addFacility.isPending}
          onClick={handleAdd}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {t('addFacility')}
        </button>
      </div>
      )}

      <div className="space-y-3">
        {facilities.map((f) => (
          <div key={f.id} className="card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">
                {f.name} <span className="text-xs text-gray-400">({f.code})</span>
              </p>
              <p className="text-sm text-gray-500">
                {f.city || '—'} · {f.timezone} · {f.active ? t('active') : t('inactive')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActive(activeFacilityId === f.id ? null : f.id)}
              className={`px-3 py-1.5 text-sm rounded-lg border ${
                activeFacilityId === f.id
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'border-gray-200 dark:border-gray-600'
              }`}
            >
              {activeFacilityId === f.id ? t('facilityActive') : t('switchFacility')}
            </button>
          </div>
        ))}
      </div>

      {canEdit && (
      <div className="card p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">{t('facilityMemberships')}</h3>
        <p className="text-sm text-gray-500">{t('facilityMembershipsHint')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <select
            value={memberUserId}
            onChange={(e) => setMemberUserId(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
          >
            {DEMO_STAFF.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
            {user && !DEMO_STAFF.some((s) => s.id === user.id) && (
              <option value={user.id}>{user.email} (me)</option>
            )}
          </select>
          <select
            value={memberFacilityId}
            onChange={(e) => setMemberFacilityId(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
          >
            <option value="">—</option>
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>{f.code} — {f.name}</option>
            ))}
          </select>
          <select
            value={memberRole}
            onChange={(e) => setMemberRole(e.target.value as FacilityMembership['role'])}
            className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
          >
            {(['admin', 'doctor', 'nurse', 'staff'] as const).map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={!memberFacilityId || addMembership.isPending}
          onClick={handleAddMembership}
          className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {t('addMembership')}
        </button>
        <div className="space-y-2">
          {memberships.length === 0 && (
            <p className="text-sm text-gray-400">{t('noMemberships')}</p>
          )}
          {memberships.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-sm border border-gray-100 dark:border-gray-700 rounded-lg px-3 py-2">
              <span>
                user {m.userId} → {facilityName(m.facilityId)} ({m.role})
              </span>
              <button
                type="button"
                onClick={() => removeMembership.mutate(m.id)}
                className="text-red-600 text-xs"
              >
                {t('remove')}
              </button>
            </div>
          ))}
        </div>
      </div>
      )}

      {canEdit && (
      <div className="card p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">{t('scimProvisioning')}</h3>
        <p className="text-sm text-gray-500">{t('scimHint')}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleScimDemo} className="px-3 py-1.5 text-sm rounded-lg bg-slate-800 text-white">
            {t('scimCreateUser')}
          </button>
          <button type="button" onClick={handleScimOff} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600">
            {t('scimDeactivate')}
          </button>
        </div>
        {scimLog && (
          <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded-lg overflow-auto max-h-48">{scimLog}</pre>
        )}
      </div>
      )}
    </div>
  )
}
