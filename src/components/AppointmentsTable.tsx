import { useI18n } from '../i18n'
import { MoreHorizontal } from 'lucide-react'

const statusStyles: Record<string, string> = {
  confirmed: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
}

export default function AppointmentsTable({ appointments }: { appointments: any[] }) {
  const { t } = useI18n()

  return (
    <div className="card overflow-hidden p-0">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white">{t('recentAppointments')}</h3>
        <button className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium">{t('viewAll')}</button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-6 py-3 font-medium">{t('patient')}</th>
              <th className="px-6 py-3 font-medium">{t('doctor')}</th>
              <th className="px-6 py-3 font-medium">{t('date')}</th>
              <th className="px-6 py-3 font-medium">{t('status')}</th>
              <th className="px-6 py-3 font-medium text-center">{t('action')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {appointments.map((appt) => (
              <tr key={appt.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{appt.patientName || appt.patient}</td>
                <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{appt.doctorName || appt.doctor}</td>
                <td className="px-6 py-4 text-gray-600 dark:text-gray-400">{appt.date} {appt.time}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusStyles[appt.status]}`}>
                    {t(appt.status)}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {appointments.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-gray-400">No appointments</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
