import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import { useAuthStore } from '../store/authStore'

function LoginProbe() {
  const location = useLocation()
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
  return <div>login page{from ? ` from:${from}` : ''}</div>
}

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<LoginProbe />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div>dashboard</div>} />
          <Route path="/patients" element={<div>patients</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false })
  })

  it('redirects unauthenticated users to the login page', () => {
    renderAt('/')
    expect(screen.getByText(/login page/)).toBeInTheDocument()
    expect(screen.queryByText('dashboard')).not.toBeInTheDocument()
  })

  it('remembers the route the user was blocked from', () => {
    renderAt('/patients')
    expect(screen.getByText('login page from:/patients')).toBeInTheDocument()
  })

  it('renders the protected route once authenticated', () => {
    useAuthStore.setState({
      user: { id: '1', name: 'Admin User', email: 'admin@cityhospital.com', role: 'admin' },
      isAuthenticated: true,
    })
    renderAt('/patients')
    expect(screen.getByText('patients')).toBeInTheDocument()
  })

  it('blocks access again after logout', () => {
    useAuthStore.setState({
      user: { id: '1', name: 'Admin User', email: 'admin@cityhospital.com', role: 'admin' },
      isAuthenticated: true,
    })
    useAuthStore.getState().logout()
    renderAt('/')
    expect(screen.getByText(/login page/)).toBeInTheDocument()
  })
})
