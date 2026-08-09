import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { I18nProvider } from './i18n'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import { useRealtimeAll } from './lib/realtime'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Patients = lazy(() => import('./pages/Patients'))
const PatientDetail = lazy(() => import('./pages/PatientDetail'))
const Doctors = lazy(() => import('./pages/Doctors'))
const DoctorDetail = lazy(() => import('./pages/DoctorDetail'))
const Appointments = lazy(() => import('./pages/Appointments'))
const Billing = lazy(() => import('./pages/Billing'))
const Claims = lazy(() => import('./pages/Claims'))
const Portal = lazy(() => import('./pages/Portal'))
const Interop = lazy(() => import('./pages/Interop'))
const Messages = lazy(() => import('./pages/Messages'))
const Facilities = lazy(() => import('./pages/Facilities'))
const Compliance = lazy(() => import('./pages/Compliance'))
const Pharmacy = lazy(() => import('./pages/Pharmacy'))
const Lab = lazy(() => import('./pages/Lab'))
const Census = lazy(() => import('./pages/Census'))
const Orders = lazy(() => import('./pages/Orders'))
const Emar = lazy(() => import('./pages/Emar'))
const Reports = lazy(() => import('./pages/Reports'))
const Settings = lazy(() => import('./pages/Settings'))
const AuditLog = lazy(() => import('./pages/AuditLog'))
const CdsRules = lazy(() => import('./pages/CdsRules'))
const Login = lazy(() => import('./pages/Login'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  )
}

function App() {
  useRealtimeAll()

  return (
    <I18nProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="patients" element={<Patients />} />
              <Route path="patients/:id" element={<PatientDetail />} />
              <Route path="doctors" element={<Doctors />} />
              <Route path="doctors/:id" element={<DoctorDetail />} />
              <Route path="appointments" element={<Appointments />} />
              <Route path="billing" element={<Billing />} />
              <Route path="claims" element={<Claims />} />
              <Route path="portal" element={<Portal />} />
              <Route path="messages" element={<Messages />} />
              <Route path="interop" element={<Interop />} />
              <Route path="facilities" element={<Facilities />} />
              <Route path="compliance" element={<Compliance />} />
              <Route path="pharmacy" element={<Pharmacy />} />
              <Route path="lab" element={<Lab />} />
              <Route path="census" element={<Census />} />
              <Route path="orders" element={<Orders />} />
              <Route path="emar" element={<Emar />} />
              <Route path="reports" element={<Reports />} />
              <Route path="audit-log" element={<AuditLog />} />
              <Route path="cds-rules" element={<CdsRules />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </I18nProvider>
  )
}

export default App
