import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './authStore'

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      sessionReady: true,
      sessionBound: false,
      mfaVerified: false,
    })
  })

  it('should have initial state', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('does not auto-authenticate anyone by default', () => {
    const initial = useAuthStore.getInitialState()
    expect(initial.user).toBeNull()
    expect(initial.isAuthenticated).toBe(false)
    expect(initial.sessionBound).toBe(false)
    expect(initial.mfaVerified).toBe(false)
  })

  it('should login user correctly', () => {
    const user = {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin' as const,
    }

    useAuthStore.getState().login(user, { mfaVerified: true })

    const state = useAuthStore.getState()
    expect(state.user).toEqual(user)
    expect(state.isAuthenticated).toBe(true)
    expect(state.sessionBound).toBe(true)
    expect(state.mfaVerified).toBe(true)
  })

  it('clearLocalAuth drops user without requiring signOut', () => {
    useAuthStore.getState().login({
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin',
    }, { mfaVerified: true })
    useAuthStore.getState().clearLocalAuth()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().sessionBound).toBe(false)
    expect(useAuthStore.getState().mfaVerified).toBe(false)
  })

  it('should logout user correctly', async () => {
    const user = {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin' as const,
    }

    useAuthStore.getState().login(user)
    await useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.sessionBound).toBe(false)
  })
})
