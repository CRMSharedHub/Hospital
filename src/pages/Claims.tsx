import { useState } from 'react'
import { FileText, Banknote, Upload } from 'lucide-react'
import {
  useClaims,
  useAddClaim,
  useUpdateClaimStatus,
  useInvoices,
  usePostRemittance,
  usePostRemittancesFromEra,
  useRemittances,
} from '../lib/api'
import { invoiceTotal, formatMoney } from '../lib/billingMath'
import { encodeEra835, parseEra835, eraToRemittances } from '../lib/era835'
import { submitNphiesClaim } from '../lib/nphies'
import { useI18n, type TranslationKey } from '../i18n'
import type { ClaimStatus } from '../types'
import { toast } from 'sonner'

const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  submitted: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  accepted: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  rejected: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  paid: 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
}

export default function Claims() {
  const { t } = useI18n()
  const { data: claims = [] } = useClaims()
  const { data: invoices = [] } = useInvoices()
  const { data: remittances = [] } = useRemittances()
  const addClaim = useAddClaim()
  const updateStatus = useUpdateClaimStatus()
  const postRemittance = usePostRemittance()
  const importEra = usePostRemittancesFromEra()

  const [invoiceId, setInvoiceId] = useState('')
  const [payerName, setPayerName] = useState('Self-Pay International')
  const [icd10, setIcd10] = useState('I10')
  const [cpt, setCpt] = useState('99213')
  const [eraText, setEraText] = useState('')

  const handleCreate = () => {
    const id = Number(invoiceId)
    const inv = invoices.find((i) => i.id === id)
    if (!inv) return
    addClaim.mutate({
      invoiceId: inv.id,
      patientId: inv.patientId,
      payerName: payerName.trim() || 'Self-Pay',
      icd10Codes: icd10.split(/[\s,]+/).filter(Boolean),
      cptCodes: cpt.split(/[\s,]+/).filter(Boolean),
      total: invoiceTotal(inv),
      status: 'draft',
    })
    setInvoiceId('')
  }

  const statusLabel = (s: ClaimStatus): TranslationKey => {
    if (s === 'draft') return 'draft'
    if (s === 'submitted') return 'submitted'
    if (s === 'accepted') return 'accepted'
    if (s === 'rejected') return 'rejected'
    return 'paid'
  }

  const handleRemittance = (claimId: number, payer: string, total: number) => {
    postRemittance.mutate({
      claimId,
      payerName: payer,
      amountPaid: total,
      amountAdjusted: 0,
      currency: 'USD',
      status: 'posted',
      remittanceRef: `ERA-${claimId}-${Date.now()}`,
      notes: 'Simulated remittance advice',
    })
  }

  const handleImportEra = () => {
    try {
      const advice = parseEra835(eraText)
      const rows = eraToRemittances(advice)
      importEra.mutate(rows)
      setEraText('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'ERA parse failed')
    }
  }

  const fillSampleEra = () => {
    const open = claims.find((c) => c.status === 'accepted' || c.status === 'submitted')
    if (!open) {
      toast.error('Need a submitted/accepted claim first')
      return
    }
    setEraText(
      encodeEra835({
        remittanceRef: `ERA-SAMPLE-${open.id}`,
        payerName: open.payerName,
        currency: 'USD',
        claims: [
          {
            claimId: open.id,
            statusCode: '1',
            chargeAmount: open.total,
            paidAmount: open.total,
            adjustmentAmount: 0,
          },
        ],
      }),
    )
  }

  const handleNphies = (claim: (typeof claims)[0]) => {
    const res = submitNphiesClaim({
      claimId: claim.id,
      patientNationalId: '1234567890',
      icd10Codes: claim.icd10Codes,
      cptCodes: claim.cptCodes,
      total: claim.total,
    })
    if (res.status === 'accepted') {
      updateStatus.mutate({ id: claim.id, status: 'submitted', externalRef: res.externalRef })
      toast.success(res.message)
    } else {
      toast.error(res.message)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('claims')}</h2>

      <div className="card p-4 space-y-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">{t('newClaim')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-sm space-y-1">
            <span className="text-gray-500">{t('invoice')}</span>
            <select
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
            >
              <option value="">—</option>
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  #{inv.id} — {inv.patientName} ({formatMoney(invoiceTotal(inv), inv.currency)})
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm space-y-1">
            <span className="text-gray-500">{t('payerName')}</span>
            <input
              value={payerName}
              onChange={(e) => setPayerName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-gray-500">{t('icd10Codes')}</span>
            <input
              value={icd10}
              onChange={(e) => setIcd10(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="text-gray-500">{t('cptCodes')}</span>
            <input
              value={cpt}
              onChange={(e) => setCpt(e.target.value)}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={!invoiceId || addClaim.isPending}
          onClick={handleCreate}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {t('createClaimFromInvoice')}
        </button>
      </div>

      <div className="card p-4 space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">{t('importEra')}</h3>
        <p className="text-sm text-gray-500">{t('eraPaste')}</p>
        <textarea
          value={eraText}
          onChange={(e) => setEraText(e.target.value)}
          rows={6}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-mono"
          placeholder={'ISA*...~\nCLP*42*1*200.00*180.00*20.00*12*ERA-REF~'}
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={fillSampleEra}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600"
          >
            Sample ERA
          </button>
          <button
            type="button"
            disabled={!eraText.trim() || importEra.isPending}
            onClick={handleImportEra}
            className="inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {t('importEra')}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {claims.length === 0 && <p className="text-center text-gray-400 py-8">{t('noClaims')}</p>}
        {claims.map((claim) => (
          <div key={claim.id} className="card p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {t('claim')} #{claim.id} · {t('invoiceNumber')} #{claim.invoiceId}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {claim.payerName} · ICD-10: {claim.icd10Codes.join(', ') || '—'} · CPT:{' '}
                    {claim.cptCodes.join(', ') || '—'}
                    {claim.externalRef ? ` · ${claim.externalRef}` : ''}
                  </p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                    {formatMoney(claim.total)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-3 py-1.5 rounded-lg text-xs font-medium ${statusStyles[claim.status]}`}>
                  {t(statusLabel(claim.status))}
                </span>
                {claim.status === 'draft' && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        updateStatus.mutate({
                          id: claim.id,
                          status: 'submitted',
                          externalRef: `SIM-${claim.id}-${Date.now()}`,
                        })
                      }
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      {t('submitClaim')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNphies(claim)}
                      className="px-3 py-1.5 text-sm rounded-lg border border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400"
                    >
                      {t('nphiesSubmit')}
                    </button>
                  </>
                )}
                {claim.status === 'submitted' && (
                  <button
                    type="button"
                    onClick={() => updateStatus.mutate({ id: claim.id, status: 'accepted' })}
                    className="px-3 py-1.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {t('acceptClaim')}
                  </button>
                )}
                {(claim.status === 'accepted' || claim.status === 'submitted') && (
                  <button
                    type="button"
                    onClick={() => handleRemittance(claim.id, claim.payerName, claim.total)}
                    disabled={postRemittance.isPending}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    <Banknote className="w-4 h-4" />
                    {t('postRemittance')}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">{t('remittances')}</h3>
        {remittances.length === 0 && <p className="text-sm text-gray-400">{t('noPayments')}</p>}
        {remittances.map((r) => (
          <div key={r.id} className="card px-4 py-3 text-sm flex justify-between gap-3">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {t('claim')} #{r.claimId} · {r.payerName}
              </p>
              <p className="text-gray-500">
                {r.remittanceRef} · {r.status} · {new Date(r.postedAt).toLocaleString()}
              </p>
            </div>
            <span className="font-semibold text-emerald-600">
              {formatMoney(r.amountPaid, r.currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
