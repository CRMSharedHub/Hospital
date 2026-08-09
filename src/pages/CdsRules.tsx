import { useState } from 'react'
import { Plus, ShieldAlert } from 'lucide-react'
import {
  useCdsAllergyRules,
  useCdsDrugInteractions,
  useSetCdsAllergyRuleActive,
  useSetCdsDrugInteractionActive,
  useUpsertCdsAllergyRule,
  useUpsertCdsDrugInteraction,
} from '../lib/api'
import { useI18n } from '../i18n'
import { usePermission } from '../auth/usePermission'
import type { CdsAllergyRule, CdsDrugInteractionRule, CdsSeverity } from '../lib/cdsTypes'

type Tab = 'ddi' | 'allergy'

const emptyDdi = (): CdsDrugInteractionRule => ({
  drugA: '',
  drugB: '',
  severity: 'major',
  category: 'bleeding',
  messageEn: '',
  messageAr: '',
  actionEn: '',
  actionAr: '',
  active: true,
})

const emptyAllergy = (): CdsAllergyRule => ({
  allergyKey: '',
  drugMatchers: [],
  severity: 'major',
  category: 'allergy',
  messageEn: '',
  messageAr: '',
  actionEn: '',
  actionAr: '',
  active: true,
})

export default function CdsRules() {
  const { t, lang } = useI18n()
  const { can } = usePermission()
  const canEdit = can('cdsRules:edit')

  const [tab, setTab] = useState<Tab>('ddi')
  const [editingDdi, setEditingDdi] = useState<CdsDrugInteractionRule | null>(null)
  const [editingAllergy, setEditingAllergy] = useState<CdsAllergyRule | null>(null)
  const [matchersText, setMatchersText] = useState('')

  const { data: ddiRules = [], isLoading: ddiLoading } = useCdsDrugInteractions()
  const { data: allergyRules = [], isLoading: allergyLoading } = useCdsAllergyRules()
  const upsertDdi = useUpsertCdsDrugInteraction()
  const upsertAllergy = useUpsertCdsAllergyRule()
  const setDdiActive = useSetCdsDrugInteractionActive()
  const setAllergyActive = useSetCdsAllergyRuleActive()

  const preview = (en: string, ar: string) => (lang === 'ar' ? ar || en : en || ar)

  const severityLabel = (s: CdsSeverity) =>
    s === 'major' ? t('cdsSeverityMajor') : t('cdsSeverityModerate')

  const openNew = () => {
    if (!canEdit) return
    if (tab === 'ddi') {
      setEditingDdi(emptyDdi())
      setEditingAllergy(null)
    } else {
      setEditingAllergy(emptyAllergy())
      setMatchersText('')
      setEditingDdi(null)
    }
  }

  const openEditDdi = (rule: CdsDrugInteractionRule) => {
    if (!canEdit) return
    setEditingDdi({ ...rule })
    setEditingAllergy(null)
  }

  const openEditAllergy = (rule: CdsAllergyRule) => {
    if (!canEdit) return
    setEditingAllergy({ ...rule })
    setMatchersText(rule.drugMatchers.join(', '))
    setEditingDdi(null)
  }

  const closeModal = () => {
    setEditingDdi(null)
    setEditingAllergy(null)
    setMatchersText('')
  }

  const saveDdi = () => {
    if (!editingDdi || !canEdit) return
    if (!editingDdi.drugA.trim() || !editingDdi.drugB.trim()) return
    upsertDdi.mutate(editingDdi, { onSuccess: closeModal })
  }

  const saveAllergy = () => {
    if (!editingAllergy || !canEdit) return
    if (!editingAllergy.allergyKey.trim()) return
    const drugMatchers = matchersText
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
    upsertAllergy.mutate({ ...editingAllergy, drugMatchers }, { onSuccess: closeModal })
  }

  const inputClass =
    'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('cdsRules')}</h2>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            {t('cdsNewRule')}
          </button>
        )}
      </div>

      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 w-fit">
        <button
          type="button"
          onClick={() => setTab('ddi')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'ddi'
              ? 'bg-white dark:bg-gray-700 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          {t('cdsRulesDdiTab')}
        </button>
        <button
          type="button"
          onClick={() => setTab('allergy')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'allergy'
              ? 'bg-white dark:bg-gray-700 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          {t('cdsRulesAllergyTab')}
        </button>
      </div>

      {tab === 'ddi' ? (
        <div className="card overflow-x-auto">
          {ddiLoading ? (
            <p className="p-6 text-sm text-gray-500">{t('loading')}</p>
          ) : ddiRules.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">{t('noData')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  <th className="text-start font-medium py-3 px-2">{t('cdsRuleActive')}</th>
                  <th className="text-start font-medium py-3 px-2">{t('cdsSeverity')}</th>
                  <th className="text-start font-medium py-3 px-2">{t('cdsCategory')}</th>
                  <th className="text-start font-medium py-3 px-2">{t('cdsMatchKeys')}</th>
                  <th className="text-start font-medium py-3 px-2">{t('cdsMessagePreview')}</th>
                  {canEdit && <th className="text-end font-medium py-3 px-2">{t('edit')}</th>}
                </tr>
              </thead>
              <tbody>
                {ddiRules.map((rule) => (
                  <tr
                    key={rule.id ?? `${rule.drugA}-${rule.drugB}`}
                    className="border-b border-gray-50 dark:border-gray-800"
                  >
                    <td className="py-3 px-2">
                      {canEdit && rule.id != null ? (
                        <button
                          type="button"
                          disabled={setDdiActive.isPending}
                          onClick={() => setDdiActive.mutate({ id: rule.id!, active: !rule.active })}
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            rule.active
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {rule.active ? t('cdsDeactivate') : t('cdsActivate')}
                        </button>
                      ) : (
                        <span className="text-xs">{rule.active ? t('active') : t('inactive')}</span>
                      )}
                    </td>
                    <td className="py-3 px-2">{severityLabel(rule.severity)}</td>
                    <td className="py-3 px-2">{rule.category}</td>
                    <td className="py-3 px-2 font-mono text-xs">
                      {rule.drugA} ↔ {rule.drugB}
                    </td>
                    <td className="py-3 px-2 max-w-xs truncate">
                      {preview(rule.messageEn, rule.messageAr)}
                    </td>
                    {canEdit && (
                      <td className="py-3 px-2 text-end">
                        <button
                          type="button"
                          onClick={() => openEditDdi(rule)}
                          className="text-primary-600 hover:underline text-xs"
                        >
                          {t('edit')}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="card overflow-x-auto">
          {allergyLoading ? (
            <p className="p-6 text-sm text-gray-500">{t('loading')}</p>
          ) : allergyRules.length === 0 ? (
            <p className="p-6 text-sm text-gray-500">{t('noData')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                  <th className="text-start font-medium py-3 px-2">{t('cdsRuleActive')}</th>
                  <th className="text-start font-medium py-3 px-2">{t('cdsSeverity')}</th>
                  <th className="text-start font-medium py-3 px-2">{t('cdsCategory')}</th>
                  <th className="text-start font-medium py-3 px-2">{t('cdsMatchKeys')}</th>
                  <th className="text-start font-medium py-3 px-2">{t('cdsMessagePreview')}</th>
                  {canEdit && <th className="text-end font-medium py-3 px-2">{t('edit')}</th>}
                </tr>
              </thead>
              <tbody>
                {allergyRules.map((rule) => (
                  <tr
                    key={rule.id ?? rule.allergyKey}
                    className="border-b border-gray-50 dark:border-gray-800"
                  >
                    <td className="py-3 px-2">
                      {canEdit && rule.id != null ? (
                        <button
                          type="button"
                          disabled={setAllergyActive.isPending}
                          onClick={() =>
                            setAllergyActive.mutate({ id: rule.id!, active: !rule.active })
                          }
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            rule.active
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {rule.active ? t('cdsDeactivate') : t('cdsActivate')}
                        </button>
                      ) : (
                        <span className="text-xs">{rule.active ? t('active') : t('inactive')}</span>
                      )}
                    </td>
                    <td className="py-3 px-2">{severityLabel(rule.severity)}</td>
                    <td className="py-3 px-2">{rule.category}</td>
                    <td className="py-3 px-2 font-mono text-xs">
                      {rule.allergyKey}: {rule.drugMatchers.join(', ')}
                    </td>
                    <td className="py-3 px-2 max-w-xs truncate">
                      {preview(rule.messageEn, rule.messageAr)}
                    </td>
                    {canEdit && (
                      <td className="py-3 px-2 text-end">
                        <button
                          type="button"
                          onClick={() => openEditAllergy(rule)}
                          className="text-primary-600 hover:underline text-xs"
                        >
                          {t('edit')}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {(editingDdi || editingAllergy) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="card w-full max-w-lg p-5 space-y-4 bg-white dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
              {editingDdi?.id != null || editingAllergy?.id != null
                ? t('cdsEditRule')
                : t('cdsNewRule')}
            </h3>

            {editingDdi && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <label className="block space-y-1">
                  <span className="text-gray-500">{t('cdsDrugA')}</span>
                  <input
                    value={editingDdi.drugA}
                    onChange={(e) => setEditingDdi({ ...editingDdi, drugA: e.target.value })}
                    className={inputClass}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-gray-500">{t('cdsDrugB')}</span>
                  <input
                    value={editingDdi.drugB}
                    onChange={(e) => setEditingDdi({ ...editingDdi, drugB: e.target.value })}
                    className={inputClass}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-gray-500">{t('cdsSeverity')}</span>
                  <select
                    value={editingDdi.severity}
                    onChange={(e) =>
                      setEditingDdi({ ...editingDdi, severity: e.target.value as CdsSeverity })
                    }
                    className={inputClass}
                  >
                    <option value="major">{t('cdsSeverityMajor')}</option>
                    <option value="moderate">{t('cdsSeverityModerate')}</option>
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-gray-500">{t('cdsCategory')}</span>
                  <input
                    value={editingDdi.category}
                    onChange={(e) => setEditingDdi({ ...editingDdi, category: e.target.value })}
                    className={inputClass}
                  />
                </label>
                <label className="block space-y-1 sm:col-span-2">
                  <span className="text-gray-500">EN message</span>
                  <input
                    value={editingDdi.messageEn}
                    onChange={(e) => setEditingDdi({ ...editingDdi, messageEn: e.target.value })}
                    className={inputClass}
                  />
                </label>
                <label className="block space-y-1 sm:col-span-2">
                  <span className="text-gray-500">AR message</span>
                  <input
                    value={editingDdi.messageAr}
                    onChange={(e) => setEditingDdi({ ...editingDdi, messageAr: e.target.value })}
                    className={inputClass}
                  />
                </label>
                <label className="block space-y-1 sm:col-span-2">
                  <span className="text-gray-500">EN action</span>
                  <input
                    value={editingDdi.actionEn}
                    onChange={(e) => setEditingDdi({ ...editingDdi, actionEn: e.target.value })}
                    className={inputClass}
                  />
                </label>
                <label className="block space-y-1 sm:col-span-2">
                  <span className="text-gray-500">AR action</span>
                  <input
                    value={editingDdi.actionAr}
                    onChange={(e) => setEditingDdi({ ...editingDdi, actionAr: e.target.value })}
                    className={inputClass}
                  />
                </label>
              </div>
            )}

            {editingAllergy && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <label className="block space-y-1 sm:col-span-2">
                  <span className="text-gray-500">{t('cdsAllergyKey')}</span>
                  <input
                    value={editingAllergy.allergyKey}
                    onChange={(e) =>
                      setEditingAllergy({ ...editingAllergy, allergyKey: e.target.value })
                    }
                    className={inputClass}
                  />
                </label>
                <label className="block space-y-1 sm:col-span-2">
                  <span className="text-gray-500">{t('cdsDrugMatchers')}</span>
                  <input
                    value={matchersText}
                    onChange={(e) => setMatchersText(e.target.value)}
                    placeholder="penicillin, amoxicillin"
                    className={inputClass}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-gray-500">{t('cdsSeverity')}</span>
                  <select
                    value={editingAllergy.severity}
                    onChange={(e) =>
                      setEditingAllergy({
                        ...editingAllergy,
                        severity: e.target.value as CdsSeverity,
                      })
                    }
                    className={inputClass}
                  >
                    <option value="major">{t('cdsSeverityMajor')}</option>
                    <option value="moderate">{t('cdsSeverityModerate')}</option>
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="text-gray-500">{t('cdsCategory')}</span>
                  <input
                    value={editingAllergy.category}
                    onChange={(e) =>
                      setEditingAllergy({ ...editingAllergy, category: e.target.value })
                    }
                    className={inputClass}
                  />
                </label>
                <label className="block space-y-1 sm:col-span-2">
                  <span className="text-gray-500">EN message</span>
                  <input
                    value={editingAllergy.messageEn}
                    onChange={(e) =>
                      setEditingAllergy({ ...editingAllergy, messageEn: e.target.value })
                    }
                    className={inputClass}
                  />
                </label>
                <label className="block space-y-1 sm:col-span-2">
                  <span className="text-gray-500">AR message</span>
                  <input
                    value={editingAllergy.messageAr}
                    onChange={(e) =>
                      setEditingAllergy({ ...editingAllergy, messageAr: e.target.value })
                    }
                    className={inputClass}
                  />
                </label>
                <label className="block space-y-1 sm:col-span-2">
                  <span className="text-gray-500">EN action</span>
                  <input
                    value={editingAllergy.actionEn}
                    onChange={(e) =>
                      setEditingAllergy({ ...editingAllergy, actionEn: e.target.value })
                    }
                    className={inputClass}
                  />
                </label>
                <label className="block space-y-1 sm:col-span-2">
                  <span className="text-gray-500">AR action</span>
                  <input
                    value={editingAllergy.actionAr}
                    onChange={(e) =>
                      setEditingAllergy({ ...editingAllergy, actionAr: e.target.value })
                    }
                    className={inputClass}
                  />
                </label>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="px-3 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-700"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={editingDdi ? saveDdi : saveAllergy}
                disabled={
                  editingDdi
                    ? upsertDdi.isPending || !editingDdi.drugA.trim() || !editingDdi.drugB.trim()
                    : upsertAllergy.isPending || !editingAllergy?.allergyKey.trim()
                }
                className="px-3 py-2 rounded-lg text-sm bg-primary-600 text-white disabled:opacity-50"
              >
                {t('cdsSaveRule')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
