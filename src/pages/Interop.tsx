import { useState } from 'react'
import { Cable } from 'lucide-react'
import { encodeHl7, decodeHl7, hl7ToFhirHints, type Hl7MessageType } from '../lib/hl7v2'
import { encodeMllp, frameMllp } from '../lib/mllp'
import { fetchFhirResource } from '../lib/paymentsApi'
import { ingestMllpMessage, nphiesEligibility } from '../lib/interopApi'
import { useI18n } from '../i18n'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

const MSG_TYPES: Hl7MessageType[] = ['ADT^A01', 'ORM^O01', 'ORU^R01']

export default function Interop() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const [msgType, setMsgType] = useState<Hl7MessageType>('ADT^A01')
  const [patientId, setPatientId] = useState('101')
  const [patientName, setPatientName] = useState('Ahmed Mohamed')
  const [detail, setDetail] = useState('Lipid Panel')
  const [result, setResult] = useState('Cholesterol 210 mg/dL')
  const [hl7Out, setHl7Out] = useState('')
  const [hl7In, setHl7In] = useState('')
  const [decoded, setDecoded] = useState('')
  const [mllpOut, setMllpOut] = useState('')
  const [mllpAck, setMllpAck] = useState('')
  const [fhirType, setFhirType] = useState('Patient')
  const [fhirId, setFhirId] = useState('101')
  const [fhirJson, setFhirJson] = useState('')
  const [nationalId, setNationalId] = useState('1234567890')
  const [eligJson, setEligJson] = useState('')

  const handleEncode = () => {
    const msg = encodeHl7({
      messageType: msgType,
      patient: { id: patientId, name: patientName },
      detail,
      result,
      doctorName: 'Dr. Sarah',
    })
    setHl7Out(msg)
    setHl7In(msg)
    setMllpOut(frameMllp(msg))
  }

  const handleDecode = () => {
    try {
      const parsed = decodeHl7(hl7In)
      const hints = hl7ToFhirHints(parsed)
      setDecoded(JSON.stringify({ parsed, fhirHints: hints }, null, 2))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Decode failed')
    }
  }

  const handleMllpFrame = () => {
    const msg =
      hl7Out ||
      encodeHl7({
        messageType: msgType,
        patient: { id: patientId, name: patientName },
        detail,
        result,
      })
    const framed =
      msgType === 'ORU^R01'
        ? encodeMllp({
            messageType: 'ORU^R01',
            patient: { id: patientId, name: patientName },
            detail,
            result,
          })
        : frameMllp(msg)
    setMllpOut(framed)
    setHl7In(framed)
  }

  const handleMllpIngest = async () => {
    try {
      const payload = mllpOut || hl7In
      if (!payload.trim()) {
        toast.error('No MLLP/HL7 payload')
        return
      }
      const res = await ingestMllpMessage(payload)
      setMllpAck(res.ack)
      await queryClient.invalidateQueries({ queryKey: ['labTests'] })
      toast.success(
        res.labUpdated
          ? `ORU ingested · lab #${res.labUpdated}`
          : `ACK ${res.controlId} (no lab update)`,
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'MLLP ingest failed')
    }
  }

  const handleFhir = async () => {
    try {
      const body: { resourceType: string; id?: string | number; patientId?: number } = {
        resourceType: fhirType,
      }
      if (
        fhirType === 'Account' ||
        fhirType === 'Encounter' ||
        fhirType === 'Observation' ||
        fhirType === 'MedicationRequest' ||
        fhirType === 'Condition' ||
        fhirType === 'ServiceRequest'
      ) {
        body.patientId = Number(fhirId)
      } else {
        body.id = Number.isNaN(Number(fhirId)) ? fhirId : Number(fhirId)
      }
      if (fhirType === 'CapabilityStatement') {
        delete body.id
      }
      const data = await fetchFhirResource(body)
      setFhirJson(JSON.stringify(data, null, 2))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'FHIR fetch failed')
    }
  }

  const handleEligibility = async () => {
    try {
      const res = await nphiesEligibility({ nationalId })
      setEligJson(JSON.stringify(res, null, 2))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eligibility failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700">
          <Cable className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('interop')}</h2>
          <p className="text-sm text-gray-500">HL7 · MLLP · FHIR R4 · NPHIES stubs</p>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">{t('hl7Encode')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <label className="space-y-1">
            <span className="text-gray-500">{t('messageType')}</span>
            <select
              value={msgType}
              onChange={(e) => setMsgType(e.target.value as Hl7MessageType)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
            >
              {MSG_TYPES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-gray-500">Patient ID</span>
            <input value={patientId} onChange={(e) => setPatientId(e.target.value)} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2" />
          </label>
          <label className="space-y-1">
            <span className="text-gray-500">Name</span>
            <input value={patientName} onChange={(e) => setPatientName(e.target.value)} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2" />
          </label>
          <label className="space-y-1">
            <span className="text-gray-500">Detail / test</span>
            <input value={detail} onChange={(e) => setDetail(e.target.value)} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2" />
          </label>
        </div>
        {msgType === 'ORU^R01' && (
          <label className="text-sm space-y-1 block">
            <span className="text-gray-500">Result</span>
            <input value={result} onChange={(e) => setResult(e.target.value)} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2" />
          </label>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleEncode} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium">
            {t('hl7Encode')}
          </button>
          <button type="button" onClick={handleMllpFrame} className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium">
            {t('mllpFrame')}
          </button>
        </div>
        {hl7Out && (
          <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded-lg overflow-auto max-h-48 whitespace-pre-wrap">{hl7Out}</pre>
        )}
        {mllpOut && (
          <pre className="text-xs bg-cyan-50 dark:bg-cyan-950/40 p-3 rounded-lg overflow-auto max-h-32 whitespace-pre-wrap">
            MLLP len={mllpOut.length} (VT…FS CR)
          </pre>
        )}
      </div>

      <div className="card p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">{t('hl7Decode')} / {t('mllpIngest')}</h3>
        <textarea
          value={hl7In}
          onChange={(e) => setHl7In(e.target.value)}
          rows={5}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-mono"
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleDecode} className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium">
            {t('hl7Decode')}
          </button>
          <button type="button" onClick={() => void handleMllpIngest()} className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium">
            {t('mllpIngest')}
          </button>
        </div>
        {decoded && (
          <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded-lg overflow-auto max-h-64">{decoded}</pre>
        )}
        {mllpAck && (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('mllpAck')}</p>
            <pre className="text-xs bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-lg overflow-auto max-h-40 whitespace-pre-wrap">{mllpAck}</pre>
          </div>
        )}
      </div>

      <div className="card p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">{t('nphiesEligibility')}</h3>
        <label className="text-sm space-y-1 block max-w-sm">
          <span className="text-gray-500">{t('nationalId')}</span>
          <input
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
          />
        </label>
        <button type="button" onClick={() => void handleEligibility()} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium">
          {t('nphiesEligibility')}
        </button>
        {eligJson && (
          <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded-lg overflow-auto max-h-48">{eligJson}</pre>
        )}
      </div>

      <div className="card p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">{t('fhirFetch')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <label className="space-y-1">
            <span className="text-gray-500">resourceType</span>
            <select
              value={fhirType}
              onChange={(e) => setFhirType(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
            >
              {['CapabilityStatement', 'Patient', 'Invoice', 'Account', 'Encounter', 'Observation', 'Condition', 'ServiceRequest', 'MedicationRequest'].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-gray-500">id / patientId</span>
            <input value={fhirId} onChange={(e) => setFhirId(e.target.value)} className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2" />
          </label>
        </div>
        <button type="button" onClick={() => void handleFhir()} className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium">
          {t('fhirFetch')}
        </button>
        {fhirJson && (
          <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded-lg overflow-auto max-h-80">{fhirJson}</pre>
        )}
      </div>
    </div>
  )
}
