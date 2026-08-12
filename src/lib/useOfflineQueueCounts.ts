import { useCallback, useEffect, useState } from 'react'
import { getAppOfflineQueue, subscribeOfflineQueue } from './offlineQueueRuntime'

export function useOfflineQueueCounts() {
  const [counts, setCounts] = useState({
    pending: 0,
    conflict: 0,
    failed: 0,
    totalOpen: 0,
  })

  const refresh = useCallback(() => {
    void getAppOfflineQueue()
      .counts()
      .then(setCounts)
      .catch(() => {
        /* IndexedDB unavailable */
      })
  }, [])

  useEffect(() => {
    refresh()
    return subscribeOfflineQueue(refresh)
  }, [refresh])

  return { ...counts, refresh }
}
