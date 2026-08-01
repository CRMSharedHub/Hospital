import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applyTheme, readStoredTheme, resolveInitialTheme, useThemeStore } from './themeStore'

const setMatchMedia = (matches: boolean) => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches,
      media: '(prefers-color-scheme: dark)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  )
}

describe('themeStore', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    setMatchMedia(false)
    useThemeStore.setState({ theme: 'light' })
  })

  it('reads a stored theme', () => {
    localStorage.setItem('theme', 'dark')
    expect(readStoredTheme()).toBe('dark')
  })

  it('ignores an invalid stored theme', () => {
    localStorage.setItem('theme', 'neon')
    expect(readStoredTheme()).toBeNull()
  })

  it('falls back to the system preference when nothing is stored', () => {
    setMatchMedia(true)
    expect(resolveInitialTheme()).toBe('dark')
    setMatchMedia(false)
    expect(resolveInitialTheme()).toBe('light')
  })

  it('prefers the stored theme over the system preference', () => {
    setMatchMedia(true)
    localStorage.setItem('theme', 'light')
    expect(resolveInitialTheme()).toBe('light')
  })

  it('applies the theme to the document root and persists it', () => {
    applyTheme('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')

    applyTheme('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('theme')).toBe('light')
  })

  it('toggles between light and dark', () => {
    useThemeStore.getState().toggleTheme()
    expect(useThemeStore.getState().theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    useThemeStore.getState().toggleTheme()
    expect(useThemeStore.getState().theme).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
