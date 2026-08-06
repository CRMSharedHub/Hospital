import { useMemo, useState } from 'react'
import { BedDouble, Users, DoorOpen, Sparkles } from 'lucide-react'
import {
  useWards,
  useBeds,
  useAdmissions,
  usePatients,
  useDoctors,
  useAdmitPatient,
  useTransferAdmission,
  useDischargeAdmission,
  useMarkBedAvailable,
} from '../lib/api'
import { computeCensusStats } from '../lib/adt'
import { useI18n, type TranslationKey } from '../i18n'
import { usePermission } from '../auth/usePermission'
import type { Bed, Admission } from '../types'
import StatCard from '../components/StatCard'

const bedStyles: Record<string, string> = {
  available: 'border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300',
  occupied: 'border-primary-300 bg-primary-50 dark:bg-primary-900/20 text-primary-800 dark:text-primary-300',
  cleaning: 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300',
  blocked: 'border-gray-300 bg-gray-100 dark:bg-gray-800 text-gray-500',
}

type ModalMode = 'admit' | 'transfer' | null

export default function Census() {
  const { t } = useI18n()
  const { can } = usePermission()
  const canEdit = can('census:edit')

  const { data: wards = [] } = useWards()
  const { data: beds = [] } = useBeds()
  const { data: admissions = [] } = useAdmissions()
  const { data: patients = [] } = usePatients()
  const { data: doctors = [] } = useDoctors()

  const admit = useAdmitPatient()
  const transfer = useTransferAdmission()
  const discharge = useDischargeAdmission()
  const markAvailable = useMarkBedAvailable()

  const active = useMemo(() => admissions.filter((a) => a.status === 'admitted'), [admissions])
  const stats = useMemo(() => computeCensusStats(beds, admissions), [beds, admissions])

  const admissionByBed = useMemo(() => {
    const m = new Map<number, Admission>()
    for (const a of active) m.set(a.bedId, a)
    return m
  }, [active])

  const [modal, setModal] = useState<ModalMode>(null)
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null)
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null)
  const [patientId, setPatientId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [reason, setReason] = useState('')
  const [targetBedId, setTargetBedId] = useState('')

  const openAdmit = (bed: Bed) => {
    if (!canEdit || bed.status !== 'available') return
    setSelectedBed(bed)
    setSelectedAdmission(null)
    setPatientId('')
    setDoctorId('')
    setReason('')
    setModal('admit')
  }

  const openTransfer = (adm: Admission) => {
    if (!canEdit) return
    setSelectedAdmission(adm)
    setSelectedBed(null)
    setTargetBedId('')
    setModal('transfer')
  }

  const handleAdmit = () => {
    if (!selectedBed || !patientId) return
    const patient = patients.find((p) => p.id === Number(patientId))
    if (!patient) return
    const doctor = doctors.find((d) => d.id === Number(doctorId))
    admit.mutate({
      patientId: patient.id,
      patientName: patient.name,
      bedId: selectedBed.id,
      wardId: selectedBed.wardId,
      attendingDoctorId: doctor?.id,
      attendingDoctorName: doctor?.name,
      admitReason: reason.trim() || undefined,
    })
    setModal(null)
  }

  const handleTransfer = () => {
    if (!selectedAdmission || !targetBedId) return
    const bed = beds.find((b) => b.id === Number(targetBedId))
    if (!bed) return
    transfer.mutate({
      admissionId: selectedAdmission.id,
      newBedId: bed.id,
      newWardId: bed.wardId,
    })
    setModal(null)
  }

  const availableTargets = beds.filter((b) => b.status === 'available')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('census')}</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BedDouble} label={t('totalBeds')} value={String(stats.totalBeds)} colorClass="bg-primary-500" />
        <StatCard icon={DoorOpen} label={t('availableBeds')} value={String(stats.available)} colorClass="bg-emerald-500" />
        <StatCard icon={Users} label={t('occupiedBeds')} value={String(stats.occupied)} colorClass="bg-amber-500" />
        <StatCard
          icon={Sparkles}
          label={t('occupancyRate')}
          value={`${stats.occupancyRate}%`}
          colorClass="bg-blue-500"
        />
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400">
        {(['available', 'occupied', 'cleaning', 'blocked'] as const).map((s) => (
          <span key={s} className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border ${bedStyles[s]}`}>
            {t(s as TranslationKey)}
          </span>
        ))}
      </div>

      <div className="space-y-6">
        {wards.map((ward) => {
          const wardBeds = beds.filter((b) => b.wardId === ward.id)
          return (
            <section key={ward.id} className="card p-4 space-y-3">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {ward.name}
                  <span className="ms-2 text-sm font-normal text-gray-500">
                    {ward.code}
                    {ward.floor ? ` · ${t('floor')} ${ward.floor}` : ''}
                  </span>
                </h3>
                <span className="text-sm text-gray-500">
                  {wardBeds.filter((b) => b.status === 'occupied').length}/{wardBeds.length}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {wardBeds.map((bed) => {
                  const adm = admissionByBed.get(bed.id)
                  return (
                    <div
                      key={bed.id}
                      className={`rounded-xl border-2 p-3 min-h-[7rem] flex flex-col justify-between ${bedStyles[bed.status]}`}
                    >
                      <div>
                        <div className="font-semibold text-sm">
                          {t('bed')} {bed.label}
                        </div>
                        {adm ? (
                          <div className="mt-1 text-xs space-y-0.5">
                            <div className="font-medium truncate">{adm.patientName}</div>
                            {adm.admitReason && <div className="opacity-80 truncate">{adm.admitReason}</div>}
                          </div>
                        ) : (
                          <div className="mt-1 text-xs opacity-70">{t(bed.status as TranslationKey)}</div>
                        )}
                      </div>
                      {canEdit && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {bed.status === 'available' && (
                            <button
                              type="button"
                              onClick={() => openAdmit(bed)}
                              className="text-xs px-2 py-1 rounded bg-white/80 dark:bg-gray-900/40 hover:bg-white font-medium"
                            >
                              {t('admit')}
                            </button>
                          )}
                          {adm && (
                            <>
                              <button
                                type="button"
                                onClick={() => openTransfer(adm)}
                                className="text-xs px-2 py-1 rounded bg-white/80 dark:bg-gray-900/40 hover:bg-white font-medium"
                              >
                                {t('transfer')}
                              </button>
                              <button
                                type="button"
                                onClick={() => discharge.mutate(adm.id)}
                                className="text-xs px-2 py-1 rounded bg-white/80 dark:bg-gray-900/40 hover:bg-white font-medium"
                              >
                                {t('discharge')}
                              </button>
                            </>
                          )}
                          {bed.status === 'cleaning' && (
                            <button
                              type="button"
                              onClick={() => markAvailable.mutate(bed.id)}
                              className="text-xs px-2 py-1 rounded bg-white/80 dark:bg-gray-900/40 hover:bg-white font-medium"
                            >
                              {t('markAvailable')}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="card w-full max-w-md p-5 space-y-4 bg-white dark:bg-gray-900">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
              {modal === 'admit' ? t('admitPatient') : t('transferPatient')}
            </h3>

            {modal === 'admit' && selectedBed && (
              <>
                <p className="text-sm text-gray-500">
                  {t('bed')} {selectedBed.label} · {wards.find((w) => w.id === selectedBed.wardId)?.name}
                </p>
                <label className="block text-sm space-y-1">
                  <span className="text-gray-500">{t('patients')}</span>
                  <select
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
                  >
                    <option value="">—</option>
                    {patients
                      .filter((p) => !active.some((a) => a.patientId === p.id))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="block text-sm space-y-1">
                  <span className="text-gray-500">{t('doctors')}</span>
                  <select
                    value={doctorId}
                    onChange={(e) => setDoctorId(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
                  >
                    <option value="">—</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm space-y-1">
                  <span className="text-gray-500">{t('admitReason')}</span>
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
                  />
                </label>
              </>
            )}

            {modal === 'transfer' && selectedAdmission && (
              <>
                <p className="text-sm text-gray-500">{selectedAdmission.patientName}</p>
                <label className="block text-sm space-y-1">
                  <span className="text-gray-500">{t('targetBed')}</span>
                  <select
                    value={targetBedId}
                    onChange={(e) => setTargetBedId(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
                  >
                    <option value="">—</option>
                    {availableTargets.map((b) => {
                      const w = wards.find((x) => x.id === b.wardId)
                      return (
                        <option key={b.id} value={b.id}>
                          {w?.code} · {t('bed')} {b.label}
                        </option>
                      )
                    })}
                  </select>
                </label>
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-700"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={modal === 'admit' ? handleAdmit : handleTransfer}
                disabled={modal === 'admit' ? !patientId || admit.isPending : !targetBedId || transfer.isPending}
                className="px-3 py-2 rounded-lg text-sm bg-primary-600 text-white disabled:opacity-50"
              >
                {modal === 'admit' ? t('admit') : t('transfer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
