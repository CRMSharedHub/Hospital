import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './authStore'

describe('authStore', () => {
  beforeEach(() => {
    // Reset state before each test
    useAuthStore.setState({ user: null, isAuthenticated: false })
  })

  it('should have initial state', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('should login user correctly', () => {
    const user = {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin' as const,
    }

    useAuthStore.getState().login(user)
    
    const state = useAuthStore.getState()
    expect(state.user).toEqual(user)
    expect(state.isAuthenticated).toBe(true)
  })

  it('should logout user correctly', () => {
    const user = {
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
      role: 'admin' as const,
    }

    useAuthStore.getState().login(user)
    useAuthStore.getState().logout()
    
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })
})
