import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { ar, type TranslationKey } from './ar'
import { en } from './en'

export type Language = 'ar' | 'en'
export type { TranslationKey }

const dictionaries: Record<Language, Record<TranslationKey, string>> = { ar, en }

const LANG_STORAGE_KEY = 'lang'

export interface I18nValue {
  lang: Language
  t: (key: TranslationKey) => string
  toggleLang: () => void
  setLang: (lang: Language) => void
}

function readStoredLang(): Language {
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY)
    return stored === 'en' || stored === 'ar' ? stored : 'ar'
  } catch {
    return 'ar'
  }
}

const I18nContext = createContext<I18nValue>({
  lang: 'ar',
  t: (key) => dictionaries.ar[key],
  toggleLang: () => {},
  setLang: () => {},
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(readStoredLang)

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang)
    } catch {
      // storage unavailable — language simply will not persist
    }
  }, [lang])

  const t = useCallback((key: TranslationKey) => dictionaries[lang][key], [lang])
  const toggleLang = useCallback(() => setLang((prev) => (prev === 'ar' ? 'en' : 'ar')), [])

  return (
    <I18nContext.Provider value={{ lang, t, toggleLang, setLang }}>{children}</I18nContext.Provider>
  )
}

export const useI18n = () => useContext(I18nContext)
