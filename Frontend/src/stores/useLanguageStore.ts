import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { safariSafeStorage } from '@/utils/safariStorage'

export type Language = 'pt' | 'en' | 'es'

interface LanguageStore {
  language: Language
  setLanguage: (language: Language) => void
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    set => ({
      language: 'pt',
      setLanguage: (language: Language) => {
        set({ language })
      },
    }),
    {
      name: 'language-store',
      storage: createJSONStorage(() => safariSafeStorage),
    }
  )
)
