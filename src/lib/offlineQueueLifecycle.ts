import { toast } from 'sonner'
import {
  flushOfflineMutationQueue,
  notifyOfflineQueueChanged,
} from './offlineQueueRuntime'
import type { QueryClient } from '@tanstack/react-query'

let started = false

function invalidateAfterFlush(queryClient?: QueryClient) {
  if (!queryClient) return
  void queryClient.invalidateQueries({ queryKey: ['appointments'] })
  void queryClient.invalidateQueries({ queryKey: ['invoices'] })
  void queryClient.invalidateQueries({ queryKey: ['labTests'] })
  void queryClient.invalidateQueries({ queryKey: ['pharmacyOrders'] })
  void queryClient.invalidateQueries({ queryKey: ['medicines'] })
}

/**
 * Listen for browser online + service worker background-sync messages and flush the queue.
 */
export function startOfflineQueueLifecycle(queryClient?: QueryClient): () => void {
  if (typeof window === 'undefined') return () => {}
  if (started) return () => {}
  started = true

  const flush = () => {
    void flushOfflineMutationQueue().then((result) => {
      if (result.synced > 0) {
        toast.success(
          result.synced === 1
            ? '1 offline change synced'
            : `${result.synced} offline changes synced`,
        )
        invalidateAfterFlush(queryClient)
      }
      if (result.conflicts > 0) {
        toast.warning(
          result.conflicts === 1
            ? '1 offline change conflicted (server kept)'
            : `${result.conflicts} offline changes conflicted (server kept)`,
        )
        invalidateAfterFlush(queryClient)
      }
      if (result.failed > 0) {
        toast.error(
          result.failed === 1
            ? '1 offline change failed to sync'
            : `${result.failed} offline changes failed to sync`,
        )
      }
      notifyOfflineQueueChanged()
    })
  }

  const onOnline = () => flush()
  window.addEventListener('online', onOnline)

  const onMessage = (event: MessageEvent) => {
    if (event.data?.type === 'background-sync') flush()
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', onMessage)
  }

  // Attempt once on start (e.g. app reopened while online with leftover queue)
  flush()

  return () => {
    started = false
    window.removeEventListener('online', onOnline)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', onMessage)
    }
  }
}
