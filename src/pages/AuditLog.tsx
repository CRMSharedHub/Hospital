import { useState, useMemo } from 'react'
import { ScrollText, Search, User, Activity, Database, Clock, FileText, Download, FileJson, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuditLog } from '../lib/api'
import { useI18n } from '../i18n'
import { isSupabaseConfigured } from '../lib/supabase'
import { exportCSV, exportJSON, timestampedFilename } from '../lib/export'

const PAGE_SIZE = 20

export default function AuditLog() {
  const { t } = useI18n()
  const { data: logs = [], isLoading } = useAuditLog(500)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(0)

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        !search ||
        log.userName?.toLowerCase().includes(search.toLowerCase()) ||
        log.tableName.toLowerCase().includes(search.toLowerCase()) ||
        log.recordId?.toLowerCase().includes(search.toLowerCase())
      const matchesAction = !actionFilter || log.action === actionFilter
      const matchesUser = !userFilter || log.userName === userFilter
      const logDate = log.createdAt.split('T')[0]
      const matchesDateFrom = !dateFrom || logDate >= dateFrom
      const matchesDateTo = !dateTo || logDate <= dateTo
      return matchesSearch && matchesAction && matchesUser && matchesDateFrom && matchesDateTo
    })
  }, [logs, search, actionFilter, userFilter, dateFrom, dateTo])

  const actions = useMemo(() => [...new Set(logs.map((l) => l.action))], [logs])
  const users = useMemo(() => [...new Set(logs.map((l) => l.userName).filter(Boolean))] as string[], [logs])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const currentPage = Math.min(page, Math.max(totalPages - 1, 0))
  const paginated = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts)
      return d.toLocaleString()
    } catch {
      return ts
    }
  }

  const formatDetails = (details: Record<string, unknown>) => {
    const entries = Object.entries(details)
    if (entries.length === 0) return '-'
    return entries.map(([k, v]) => `${k}: ${String(v)}`).join(', ')
  }

  const handleExportCSV = () => {
    const rows = filtered.map((l) => ({
      id: l.id,
      user: l.userName ?? '',
      action: l.action,
      table: l.tableName,
      recordId: l.recordId ?? '',
      details: formatDetails(l.details),
      timestamp: l.createdAt,
    }))
    exportCSV(rows, timestampedFilename('audit_log', 'csv'), ['id', 'user', 'action', 'table', 'recordId', 'details', 'timestamp'])
  }

  const handleExportJSON = () => {
    exportJSON(filtered, timestampedFilename('audit_log', 'json'))
  }

  const resetFilters = () => {
    setSearch('')
    setActionFilter('')
    setUserFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(0)
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('auditLog')}</h2>
        <div className="card p-8 text-center">
          <ScrollText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">{t('noAuditLogs')}</p>
          <p className="text-sm text-gray-400 mt-2">Supabase connection required for audit logging.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('auditLog')}</h2>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
          <button
            onClick={handleExportJSON}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <FileJson className="w-4 h-4" /> JSON
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              placeholder={t('search')}
              className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(0) }}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="">{t('all')} — {t('auditLogAction')}</option>
            {actions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select
            value={userFilter}
            onChange={(e) => { setUserFilter(e.target.value); setPage(0) }}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="">{t('all')} — {t('auditLogUser')}</option>
            {users.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('dateFrom')}</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(0) }}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('dateTo')}</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(0) }}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <button
            onClick={resetFilters}
            className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap"
          >
            {t('clearFilters')}
          </button>
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500">
          {filtered.length} {t('records')}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">{t('loading')}</div>
        ) : paginated.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">{t('noAuditLogs')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 text-start">
                  <th className="px-4 py-3 text-start font-medium text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5"><User className="w-4 h-4" />{t('auditLogUser')}</span>
                  </th>
                  <th className="px-4 py-3 text-start font-medium text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5"><Activity className="w-4 h-4" />{t('auditLogAction')}</span>
                  </th>
                  <th className="px-4 py-3 text-start font-medium text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5"><Database className="w-4 h-4" />{t('auditLogTable')}</span>
                  </th>
                  <th className="px-4 py-3 text-start font-medium text-gray-500 dark:text-gray-400">{t('auditLogRecordId')}</th>
                  <th className="px-4 py-3 text-start font-medium text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" />{t('auditLogDetails')}</span>
                  </th>
                  <th className="px-4 py-3 text-start font-medium text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{t('auditLogTime')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{log.userName ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${log.action.startsWith('create')
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : log.action.startsWith('update')
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-mono text-xs">{log.tableName}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-mono text-xs">{log.recordId ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs max-w-xs truncate">{formatDetails(log.details)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{formatTime(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} / {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(currentPage - 1, 0))}
                disabled={currentPage === 0}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-gray-600 dark:text-gray-400 px-2">
                {currentPage + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(currentPage + 1, totalPages - 1))}
                disabled={currentPage >= totalPages - 1}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
