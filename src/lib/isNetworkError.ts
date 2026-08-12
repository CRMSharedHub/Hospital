/** Detect likely network / connectivity failures from fetch or Supabase clients. */
export function isNetworkError(error: unknown): boolean {
  if (!error) return false
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true

  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error)

  const lower = msg.toLowerCase()
  return (
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('load failed') ||
    lower.includes('err_network') ||
    lower.includes('err_internet_disconnected') ||
    lower.includes('the internet connection appears to be offline') ||
    lower.includes('fetch failed') ||
    (error instanceof TypeError && lower.includes('fetch'))
  )
}

export function isLikelyOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}
