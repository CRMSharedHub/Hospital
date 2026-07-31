import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, Mail, Lock } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useI18n } from '../i18n'

export default function Login() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [email, setEmail] = useState('admin@cityhospital.com')
  const [password, setPassword] = useState('admin123')
  const [error, setError] = useState('')

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (email === 'admin@cityhospital.com' && password === 'admin123') {
      login({
        id: '1',
        name: 'Admin User',
        email,
        role: 'admin',
      })
      navigate('/')
    } else {
      setError(lang === 'ar' ? 'بيانات الدخول غير صحيحة' : 'Invalid credentials')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="p-3 bg-primary-600 rounded-2xl shadow-lg">
            <Activity className="w-10 h-10 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          {t('appName')}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Sign in to access your dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-gray-100 dark:border-gray-700">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm text-center">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
