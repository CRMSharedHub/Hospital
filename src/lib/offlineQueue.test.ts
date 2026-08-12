import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createOfflineQueue,
  type OfflineQueueStore,
  type QueuedMutation,
  type OfflineOp,
} from './offlineQueue'
import type { OfflineQueueExecutor } from './offlineQueue'

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

describe('offlineQueue', () => {
  let store: OfflineQueueStore
  let queue: ReturnType<typeof createOfflineQueue>
  let idSeq: number

  beforeEach(() => {
    store = memoryStore()
    idSeq = 0
    queue = createOfflineQueue(store, {
      now: () => 1_700_000_000_000 + idSeq * 10,
      newId: () => `m-${++idSeq}`,
    })
  })

  it('enqueues a pending mutation and lists FIFO', async () => {
    const op: OfflineOp = {
      type: 'updateAppointmentStatus',
      id: 1,
      status: 'completed',
      expectedStatus: 'confirmed',
    }
    await queue.enqueue(op)
    await queue.enqueue({
      type: 'updateInvoiceStatus',
      id: 2,
      status: 'paid',
      expectedStatus: 'unpaid',
    })
    const list = await queue.list()
    expect(list).toHaveLength(2)
    expect(list[0].op.type).toBe('updateAppointmentStatus')
    expect(list[1].op.type).toBe('updateInvoiceStatus')
    expect(list.every((m) => m.status === 'pending')).toBe(true)
  })

  it('flushes FIFO and removes successful ops', async () => {
    await queue.enqueue({
      type: 'updateAppointmentStatus',
      id: 1,
      status: 'completed',
      expectedStatus: 'confirmed',
    })
    await queue.enqueue({
      type: 'updateLabTestStatus',
      id: 9,
      status: 'completed',
      expectedStatus: 'in-progress',
    })

    const applied: string[] = []
    const executor: OfflineQueueExecutor = {
      async readCurrent(op) {
        if (op.type === 'updateAppointmentStatus') return { status: 'confirmed' }
        if (op.type === 'updateLabTestStatus') return { status: 'in-progress' }
        return { status: null }
      },
      async apply(op) {
        applied.push(op.type)
      },
    }

    const result = await queue.flushAll(executor)
    expect(applied).toEqual(['updateAppointmentStatus', 'updateLabTestStatus'])
    expect(result.synced).toBe(2)
    expect(result.conflicts).toBe(0)
    expect(await queue.list()).toHaveLength(0)
  })

  it('server-wins: marks conflict when server status differs from expected and desired', async () => {
    await queue.enqueue({
      type: 'updateAppointmentStatus',
      id: 1,
      status: 'completed',
      expectedStatus: 'confirmed',
    })

    const apply = vi.fn()
    const result = await queue.flushAll({
      async readCurrent() {
        return { status: 'cancelled' }
      },
      apply,
    })

    expect(apply).not.toHaveBeenCalled()
    expect(result.conflicts).toBe(1)
    expect(result.synced).toBe(0)
    const list = await queue.list()
    expect(list).toHaveLength(1)
    expect(list[0].status).toBe('conflict')
  })

  it('idempotent: removes op when server already has desired status', async () => {
    await queue.enqueue({
      type: 'updatePharmacyOrderStatus',
      id: 3,
      status: 'dispensed',
      expectedStatus: 'pending',
    })

    const apply = vi.fn()
    const result = await queue.flushAll({
      async readCurrent() {
        return { status: 'dispensed' }
      },
      apply,
    })

    expect(apply).not.toHaveBeenCalled()
    expect(result.synced).toBe(1)
    expect(await queue.list()).toHaveLength(0)
  })

  it('marks failed and keeps pending when apply throws a non-network error', async () => {
    await queue.enqueue({
      type: 'updateInvoiceStatus',
      id: 4,
      status: 'paid',
      expectedStatus: 'unpaid',
    })

    const result = await queue.flushAll({
      async readCurrent() {
        return { status: 'unpaid' }
      },
      async apply() {
        throw new Error('RLS denied')
      },
    })

    expect(result.failed).toBe(1)
    const list = await queue.list()
    expect(list[0].status).toBe('failed')
    expect(list[0].lastError).toMatch(/RLS/)
    expect(list[0].attempts).toBe(1)
  })

  it('counts pending and conflict for UI', async () => {
    await queue.enqueue({
      type: 'updateAppointmentStatus',
      id: 1,
      status: 'completed',
      expectedStatus: 'confirmed',
    })
    await queue.enqueue({
      type: 'updateAppointmentStatus',
      id: 2,
      status: 'cancelled',
      expectedStatus: 'pending',
    })
    await queue.flushAll({
      async readCurrent(op) {
        if (op.type === 'updateAppointmentStatus' && op.id === 1) return { status: 'cancelled' }
        return { status: 'pending' }
      },
      async apply() {},
    })
    const counts = await queue.counts()
    expect(counts.pending).toBe(0)
    expect(counts.conflict).toBe(1)
    expect(counts.failed).toBe(0)
    expect(counts.totalOpen).toBe(1)
  })
})
