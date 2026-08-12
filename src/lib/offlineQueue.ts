export type OfflineOp =
  | {
      type: 'updateAppointmentStatus'
      id: number
      status: 'confirmed' | 'pending' | 'cancelled' | 'completed'
      expectedStatus?: string | null
    }
  | {
      type: 'updateInvoiceStatus'
      id: number
      status: 'unpaid' | 'partial' | 'paid'
      paidAmount?: number
      expectedStatus?: string | null
    }
  | {
      type: 'updateLabTestStatus'
      id: number
      status: 'ordered' | 'in-progress' | 'completed' | 'cancelled'
      result?: string
      expectedStatus?: string | null
    }
  | {
      type: 'updatePharmacyOrderStatus'
      id: number
      status: 'pending' | 'dispensed' | 'cancelled'
      expectedStatus?: string | null
    }

export type QueuedMutationStatus = 'pending' | 'conflict' | 'failed'

export interface QueuedMutation {
  id: string
  createdAt: number
  op: OfflineOp
  status: QueuedMutationStatus
  attempts: number
  lastError?: string
}

export interface OfflineQueueStore {
  add(item: QueuedMutation): Promise<void>
  list(): Promise<QueuedMutation[]>
  update(id: string, patch: Partial<QueuedMutation>): Promise<void>
  remove(id: string): Promise<void>
}

export interface OfflineQueueExecutor {
  /** Current server status for the target row (status field as string). */
  readCurrent(op: OfflineOp): Promise<{ status: string | null }>
  apply(op: OfflineOp): Promise<void>
}

export interface FlushResult {
  synced: number
  conflicts: number
  failed: number
}

export interface OfflineQueueClock {
  now: () => number
  newId: () => string
}

function desiredStatus(op: OfflineOp): string {
  return op.status
}

function expectedStatus(op: OfflineOp): string | null | undefined {
  return op.expectedStatus
}

export function createOfflineQueue(store: OfflineQueueStore, clock?: Partial<OfflineQueueClock>) {
  const now = clock?.now ?? (() => Date.now())
  const newId =
    clock?.newId ??
    (() =>
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `q-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`)

  async function enqueue(op: OfflineOp): Promise<QueuedMutation> {
    const item: QueuedMutation = {
      id: newId(),
      createdAt: now(),
      op,
      status: 'pending',
      attempts: 0,
    }
    await store.add(item)
    return item
  }

  async function list(): Promise<QueuedMutation[]> {
    return store.list()
  }

  async function counts(): Promise<{
    pending: number
    conflict: number
    failed: number
    totalOpen: number
  }> {
    const all = await store.list()
    const pending = all.filter((m) => m.status === 'pending').length
    const conflict = all.filter((m) => m.status === 'conflict').length
    const failed = all.filter((m) => m.status === 'failed').length
    return { pending, conflict, failed, totalOpen: pending + conflict + failed }
  }

  async function flushAll(executor: OfflineQueueExecutor): Promise<FlushResult> {
    const result: FlushResult = { synced: 0, conflicts: 0, failed: 0 }
    const items = (await store.list()).filter((m) => m.status === 'pending' || m.status === 'failed')

    for (const item of items) {
      const desired = desiredStatus(item.op)
      const expected = expectedStatus(item.op)

      try {
        const current = await executor.readCurrent(item.op)
        const serverStatus = current.status

        if (serverStatus === desired) {
          await store.remove(item.id)
          result.synced += 1
          continue
        }

        if (
          expected != null &&
          expected !== '' &&
          serverStatus != null &&
          serverStatus !== expected
        ) {
          await store.update(item.id, {
            status: 'conflict',
            lastError: `Server has "${serverStatus}", expected "${expected}" (server-wins)`,
          })
          result.conflicts += 1
          continue
        }

        await executor.apply(item.op)
        await store.remove(item.id)
        result.synced += 1
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        await store.update(item.id, {
          status: 'failed',
          attempts: item.attempts + 1,
          lastError: message,
        })
        result.failed += 1
      }
    }

    return result
  }

  return { enqueue, list, counts, flushAll }
}

export type OfflineQueue = ReturnType<typeof createOfflineQueue>
