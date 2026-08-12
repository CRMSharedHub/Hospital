import { describe, it, expect } from 'vitest'
import { isNetworkError, isLikelyOffline } from './isNetworkError'

describe('isNetworkError', () => {
  it('detects Failed to fetch', () => {
    expect(isNetworkError(new TypeError('Failed to fetch'))).toBe(true)
  })

  it('does not treat RLS / validation as network', () => {
    expect(isNetworkError(new Error('RLS denied'))).toBe(false)
    expect(isNetworkError(new Error('new row violates row-level security'))).toBe(false)
  })
})

describe('isLikelyOffline', () => {
  it('reflects navigator.onLine when available', () => {
    const original = navigator.onLine
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false })
    expect(isLikelyOffline()).toBe(true)
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: original })
  })
})
