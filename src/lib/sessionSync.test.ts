import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '../store/authStore'

const getSession = vi.fn()
const from = vi.fn()

vi.mock('./supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: () => getSession(),
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn(),
    },
    from: () => from(),
  },
}))

// Import AFTER mock so sessionSync sees mocked supabase
const { syncAuthWithServerSession, assertServerSession, requiresServerSession } =
  await import('./sessionSync')

describe('syncAuthWithServerSession', () => {
  beforeEach(() => {
    getSession.mockReset()
    from.mockReset()
    from.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({
              data: {
                id: 'uuid-1',
                name: 'Server User',
                email: 'server@test.com',
                role: 'admin',
                avatar: null,
                linked_patient_id: null,
              },
            }),
        }),
      }),
    })
    useAuthStore.setState({
      user: { id: 'forged', name: 'Forged', email: 'x@y.com', role: 'admin' },
      isAuthenticated: true,
      sessionReady: false,
      sessionBound: false,
      mfaVerified: false,
    })
  })

  it('requires a server session when Supabase is mocked as configured', () => {
    expect(requiresServerSession()).toBe(true)
  })

  it('clears forged local auth when Supabase has no session', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null })
    await syncAuthWithServerSession()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.sessionBound).toBe(false)
    expect(state.sessionReady).toBe(true)
  })

  it('binds auth from server session and profile', async () => {
    getSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'uuid-1' },
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
      error: null,
    })
    await syncAuthWithServerSession()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.sessionBound).toBe(true)
    expect(state.user?.email).toBe('server@test.com')
    expect(state.user?.id).toBe('uuid-1')
  })

  it('assertServerSession returns false and clears store without session', async () => {
    getSession.mockResolvedValue({ data: { session: null }, error: null })
    const ok = await assertServerSession()
    expect(ok).toBe(false)
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })
})
