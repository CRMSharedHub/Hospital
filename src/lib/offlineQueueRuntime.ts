import { db } from './db'
import {
  createOfflineQueue,
  type OfflineOp,
  type OfflineQueueExecutor,
  type OfflineQueueStore,
  type QueuedMutation,
} from './offlineQueue'
import { dal } from './dal'
import { isSupabaseConfigured } from './supabase'
import { isLikelyOffline, isNetworkError } from './isNetworkError'

export const dexieOfflineQueueStore: OfflineQueueStore = {
  async add(item) {
    await db.mutationQueue.put(item)
  },
  async list() {
    const rows = await db.mutationQueue.toArray()
    return rows.sort((a, b) => a.createdAt - b.createdAt)
  },
  async update(id, patch) {
    await db.mutationQueue.update(id, patch)
  },
  async remove(id) {
    await db.mutationQueue.delete(id)
  },
}

let appQueue = createOfflineQueue(dexieOfflineQueueStore)

export function getAppOfflineQueue() {
  return appQueue
}

/** Test helper */
export function _resetAppOfflineQueueForTests(store?: OfflineQueueStore) {
  appQueue = createOfflineQueue(store ?? dexieOfflineQueueStore)
}

type QueueListener = () => void
const listeners = new Set<QueueListener>()

export function subscribeOfflineQueue(listener: QueueListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function notifyOfflineQueueChanged(): void {
  for (const listener of listeners) listener()
}

export async function requestBackgroundSync(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  try {
    const reg = await navigator.serviceWorker.ready
    const syncManager = (
      reg as ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> }
      }
    ).sync
    if (syncManager?.register) {
      await syncManager.register('retry-mutations')
    }
  } catch {
    // Background Sync optional
  }
}

export function createDalExecutor(): OfflineQueueExecutor {
  return {
    async readCurrent(op: OfflineOp) {
      switch (op.type) {
        case 'updateAppointmentStatus': {
          const row = (await dal.getAppointments()).find((a) => a.id === op.id)
          return { status: row?.status ?? null }
        }
        case 'updateInvoiceStatus': {
          const row = (await dal.getInvoices()).find((i) => i.id === op.id)
          return { status: row?.status ?? null }
        }
        case 'updateLabTestStatus': {
          const row = (await dal.getLabTests()).find((t) => t.id === op.id)
          return { status: row?.status ?? null }
        }
        case 'updatePharmacyOrderStatus': {
          const row = (await dal.getPharmacyOrders()).find((o) => o.id === op.id)
          return { status: row?.status ?? null }
        }
        default:
          return { status: null }
      }
    },
    async apply(op: OfflineOp) {
      switch (op.type) {
        case 'updateAppointmentStatus':
          await dal.updateAppointmentStatus(op.id, op.status)
          return
        case 'updateInvoiceStatus':
          await dal.updateInvoiceStatus(op.id, op.status, op.paidAmount)
          return
        case 'updateLabTestStatus':
          await dal.updateLabTestStatus(op.id, op.status, op.result)
          return
        case 'updatePharmacyOrderStatus': {
          const orders = await dal.getPharmacyOrders()
          const order = orders.find((o) => o.id === op.id)
          if (order && op.status === 'dispensed' && order.status !== 'dispensed') {
            const medicines = await dal.getMedicines()
            const med = medicines.find((m) => m.id === order.medicineId)
            if (med) {
              await dal.updateMedicineStock(
                order.medicineId,
                Math.max(0, med.stock - order.quantity),
              )
            }
          }
          await dal.updatePharmacyOrderStatus(op.id, op.status)
          return
        }
        default:
          return
      }
    },
  }
}

export type RunOrEnqueueResult = { queued: boolean }

/** Stash pre-optimistic status so mutationFn can enqueue with server-wins expectedStatus. */
const expectedStatusStash = new Map<string, string | undefined>()

export function stashOfflineExpected(key: string, status: string | undefined): void {
  expectedStatusStash.set(key, status)
}

export function takeOfflineExpected(key: string): string | undefined {
  const value = expectedStatusStash.get(key)
  expectedStatusStash.delete(key)
  return value
}

/**
 * Execute a Supabase-backed write, or durable-queue it when offline / network fails.
 * Demo (Dexie) mode always executes immediately.
 */
export async function runOrEnqueue(
  op: OfflineOp,
  execute: () => Promise<void>,
): Promise<RunOrEnqueueResult> {
  if (!isSupabaseConfigured) {
    await execute()
    return { queued: false }
  }

  if (isLikelyOffline()) {
    await getAppOfflineQueue().enqueue(op)
    await requestBackgroundSync()
    notifyOfflineQueueChanged()
    return { queued: true }
  }

  try {
    await execute()
    return { queued: false }
  } catch (error) {
    if (isNetworkError(error)) {
      await getAppOfflineQueue().enqueue(op)
      await requestBackgroundSync()
      notifyOfflineQueueChanged()
      return { queued: true }
    }
    throw error
  }
}

export async function flushOfflineMutationQueue(): Promise<{
  synced: number
  conflicts: number
  failed: number
}> {
  if (!isSupabaseConfigured) {
    return { synced: 0, conflicts: 0, failed: 0 }
  }
  if (isLikelyOffline()) {
    return { synced: 0, conflicts: 0, failed: 0 }
  }

  const result = await getAppOfflineQueue().flushAll(createDalExecutor())
  notifyOfflineQueueChanged()
  return result
}

export type { QueuedMutation, OfflineOp }
