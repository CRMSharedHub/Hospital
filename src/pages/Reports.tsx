import { DollarSign, Pill, FlaskConical, CalendarDays, TrendingUp, Download, FileJson } from 'lucide-react'
import { useI18n, type TranslationKey } from '../i18n'
import { useAppointments, useDoctors, useInvoices, useMedicines, usePharmacyOrders, useLabTests } from '../lib/api'
import {
  appointmentStatusBreakdown,
  doctorWorkload,
  billingSummary,
  pharmacySummary,
  labSummary,
  monthlyRevenueTrend,
} from '../lib/reports'
import { exportCSV, exportJSON, timestampedFilename } from '../lib/export'
import StatCard from '../components/StatCard'
import { BarChart } from '../components/charts/BarChart'
import { DonutChart } from '../components/charts/DonutChart'
import { ProgressBar } from '../components/charts/ProgressBar'

const statusColors: Record<string, string> = {
  confirmed: '#3b82f6',
  pending: '#f59e0b',
  completed: '#10b981',
  cancelled: '#ef4444',
}

export default function Reports() {
  const { t, lang } = useI18n()
  const { data: appointments = [] } = useAppointments()
  const { data: doctors = [] } = useDoctors()
  const { data: invoices = [] } = useInvoices()
  const { data: medicines = [] } = useMedicines()
  const { data: orders = [] } = usePharmacyOrders()
  const { data: labTests = [] } = useLabTests()

  const apptBreakdown = appointmentStatusBreakdown(appointments)
  const workload = doctorWorkload(appointments, doctors)
  const billing = billingSummary(invoices)
  const pharmacy = pharmacySummary(medicines, orders)
  const lab = labSummary(labTests)
  const revenueTrend = monthlyRevenueTrend(invoices)

  const monthFormatter = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-SA' : 'en-GB', { month: 'short' })

  const maxWorkload = Math.max(...workload.map((w) => w.appointmentCount), 1)

  const handleExportCSV = () => {
    const summary = [
      { metric: 'Total Appointments', value: appointments.length },
      { metric: 'Total Revenue', value: billing.totalRevenue },
      { metric: 'Outstanding', value: billing.outstanding },
      { metric: 'Paid Invoices', value: billing.paidCount },
      { metric: 'Unpaid Invoices', value: billing.unpaidCount },
      { metric: 'Total Medicines', value: pharmacy.totalMedicines },
      { metric: 'Out of Stock', value: pharmacy.outOfStock },
      { metric: 'Pending Orders', value: pharmacy.pendingOrders },
      { metric: 'Lab Completion Rate (%)', value: lab.completionRate },
      { metric: 'Lab Completed', value: lab.completed },
      { metric: 'Lab In Progress', value: lab.inProgress },
      { metric: 'Lab Ordered', value: lab.ordered },
    ]
    exportCSV(summary, timestampedFilename('hospital_report', 'csv'), ['metric', 'value'])
  }

  const handleExportJSON = () => {
    exportJSON(
      {
        exportedAt: new Date().toISOString(),
        appointments: appointments.length,
        billing: billing,
        pharmacy: pharmacy,
        lab: lab,
        doctorWorkload: workload,
        appointmentStatusBreakdown: apptBreakdown,
        revenueTrend: revenueTrend,
      },
      timestampedFilename('hospital_report', 'json'),
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('reports')}</h2>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
          <button
            onClick={handleExportJSON}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <FileJson className="w-4 h-4" /> JSON
          </button>
        </div>
      </div>

      {/* Top-level KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard icon={CalendarDays} label={t('totalAppointments')} value={String(appointments.length)} colorClass="bg-primary-500" />
        <StatCard icon={DollarSign} label={t('revenue')} value={`$${billing.totalRevenue.toLocaleString()}`} colorClass="bg-emerald-500" />
        <StatCard icon={Pill} label={t('medicines')} value={String(pharmacy.totalMedicines)} colorClass="bg-blue-500" />
        <StatCard icon={FlaskConical} label={t('completionRate')} value={`${lab.completionRate}%`} colorClass="bg-purple-500" />
      </div>

      {/* Appointment status donut + Doctor workload bars */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-6">{t('appointmentStatus')}</h3>
          {appointments.length > 0 ? (
            <DonutChart
              data={apptBreakdown.map((b) => ({
                label: t(b.status as TranslationKey),
                value: b.count,
                color: statusColors[b.status],
              }))}
              centerValue={String(appointments.length)}
              centerLabel={t('totalAppointments')}
            />
          ) : (
            <p className="text-center text-gray-400 py-12">{t('noData')}</p>
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-6">{t('doctorWorkload')}</h3>
          {workload.length > 0 ? (
            <div className="space-y-4">
              {workload.slice(0, 6).map((w) => (
                <ProgressBar
                  key={w.doctorId}
                  label={w.doctorName}
                  value={w.appointmentCount}
                  max={maxWorkload}
                  color="bg-primary-500"
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 py-12">{t('noData')}</p>
          )}
        </div>
      </div>

      {/* Revenue trend bar chart */}
      <div className="card">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">{t('revenueTrend')}</h3>
        </div>
        {revenueTrend.some((r) => r.revenue > 0) ? (
          <BarChart
            data={revenueTrend.map((r) => ({
              label: monthFormatter.format(new Date(`${r.month}-01T00:00:00`)),
              value: r.revenue,
            }))}
            height={220}
            formatValue={(v) => `$${v.toLocaleString()}`}
          />
        ) : (
          <p className="text-center text-gray-400 py-12">{t('noData')}</p>
        )}
      </div>

      {/* Module summaries */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Billing summary */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('billingSummary')}</h3>
          </div>
          <div className="space-y-3">
            <ProgressBar label={t('totalAmount')} value={billing.totalRevenue} max={Math.max(billing.totalRevenue + billing.outstanding, 1)} color="bg-emerald-500" formatValue={(v) => `$${v.toLocaleString()}`} />
            <ProgressBar label={t('remainingAmount')} value={billing.outstanding} max={Math.max(billing.totalRevenue + billing.outstanding, 1)} color="bg-red-500" formatValue={(v) => `$${v.toLocaleString()}`} />
            <div className="flex justify-between text-sm pt-2 border-t border-gray-100 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">{t('completed')}</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">{billing.paidCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">{t('unpaid')}</span>
              <span className="font-medium text-red-600 dark:text-red-400">{billing.unpaidCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">{t('partial')}</span>
              <span className="font-medium text-amber-600 dark:text-amber-400">{billing.partialCount}</span>
            </div>
          </div>
        </div>

        {/* Pharmacy summary */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Pill className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('pharmacySummary')}</h3>
          </div>
          <div className="space-y-3">
            <ProgressBar label={t('inStock')} value={pharmacy.totalMedicines - pharmacy.outOfStock} max={Math.max(pharmacy.totalMedicines, 1)} color="bg-emerald-500" />
            <ProgressBar label={t('lowStock')} value={pharmacy.lowStock} max={Math.max(pharmacy.totalMedicines, 1)} color="bg-amber-500" />
            <ProgressBar label={t('outOfStock')} value={pharmacy.outOfStock} max={Math.max(pharmacy.totalMedicines, 1)} color="bg-red-500" />
            <div className="flex justify-between text-sm pt-2 border-t border-gray-100 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">{t('pendingOrders')}</span>
              <span className="font-medium text-amber-600 dark:text-amber-400">{pharmacy.pendingOrders}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">{t('dispensedOrders')}</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">{pharmacy.dispensedOrders}</span>
            </div>
          </div>
        </div>

        {/* Lab summary */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <FlaskConical className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('labSummary')}</h3>
          </div>
          <div className="space-y-3">
            <ProgressBar label={t('completed')} value={lab.completed} max={Math.max(lab.total, 1)} color="bg-emerald-500" />
            <ProgressBar label={t('inProgress')} value={lab.inProgress} max={Math.max(lab.total, 1)} color="bg-amber-500" />
            <ProgressBar label={t('ordered')} value={lab.ordered} max={Math.max(lab.total, 1)} color="bg-blue-500" />
            <div className="flex justify-between text-sm pt-2 border-t border-gray-100 dark:border-gray-700">
              <span className="text-gray-500 dark:text-gray-400">{t('completionRate')}</span>
              <span className="font-medium text-purple-600 dark:text-purple-400">{lab.completionRate}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">{t('cancelled')}</span>
              <span className="font-medium text-red-600 dark:text-red-400">{lab.cancelled}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
