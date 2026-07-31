import { Routes, Route } from 'react-router-dom'
import { I18nProvider } from './i18n'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import PatientDetail from './pages/PatientDetail'
import Doctors from './pages/Doctors'
import DoctorDetail from './pages/DoctorDetail'
import Appointments from './pages/Appointments'
import Settings from './pages/Settings'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <I18nProvider>
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
            <Route path="settings" element={<Settings />} />
          </Route>
        </Route>
      </Routes>
    </I18nProvider>
  )
}

export default App
