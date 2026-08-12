import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  runOrEnqueue,
  _resetAppOfflineQueueForTests,
  getAppOfflineQueue,
} from './offlineQueueRuntime'
import type { OfflineQueueStore, QueuedMutation } from './offlineQueue'

vi.mock('./supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {},
}))

function memoryStore(): OfflineQueueStore {
  const rows = new Map<string, QueuedMutation>()
  return {
    async add(item) {
      rows.set(item.id, structuredClone(item))
    },
    async list() {
      return [...rows.values()].sort((a, b) => a.createdAt - b.createdAt)
    },
    async update(id, patch) {
      const cur = rows.get(id)
      if (!cur) return
      rows.set(id, { ...cur, ...patch })
    },
    async remove(id) {
      rows.delete(id)
    },
  }
}

describe('runOrEnqueue', () => {
  const originalOnline = navigator.onLine

  beforeEach(() => {
    _resetAppOfflineQueueForTests(memoryStore())
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: originalOnline })
  })

  it('queues when navigator reports offline', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
    const execute = vi.fn()
    const result = await runOrEnqueue(
      {
        type: 'updateAppointmentStatus',
        id: 1,
        status: 'completed',
        expectedStatus: 'confirmed',
      },
      execute,
    )
    expect(result.queued).toBe(true)
    expect(execute).not.toHaveBeenCalled()
    expect(await getAppOfflineQueue().list()).toHaveLength(1)
  })

  it('executes when online and execute succeeds', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
    const execute = vi.fn().mockResolvedValue(undefined)
    const result = await runOrEnqueue(
      {
        type: 'updateAppointmentStatus',
        id: 1,
        status: 'completed',
        expectedStatus: 'confirmed',
      },
      execute,
    )
    expect(result.queued).toBe(false)
    expect(execute).toHaveBeenCalledOnce()
    expect(await getAppOfflineQueue().list()).toHaveLength(0)
  })

  it('queues when execute throws a network error', async () => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
    const execute = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const result = await runOrEnqueue(
      {
        type: 'updateInvoiceStatus',
        id: 2,
        status: 'paid',
        expectedStatus: 'unpaid',
      },
      execute,
    )
    expect(result.queued).toBe(true)
    expect(await getAppOfflineQueue().list()).toHaveLength(1)
  })
})
