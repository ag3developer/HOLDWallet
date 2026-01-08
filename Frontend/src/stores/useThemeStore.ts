import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { APP_CONFIG } from '@/config/app'
import { safariSafeStorage } from '@/utils/safariStorage'

type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  systemTheme: 'light' | 'dark'
  isDark: boolean
}

interface ThemeStore extends ThemeState {
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  initializeTheme: () => void
}

// Função para detectar tema do sistema
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// Função para calcular se deve usar tema escuro
const calculateIsDark = (theme: Theme, systemTheme: 'light' | 'dark'): boolean => {
  if (theme === 'system') {
    return systemTheme === 'dark'
  }
  return theme === 'dark'
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      // Initial state
      theme: 'system',
      systemTheme: 'light',
      isDark: false,

      // Set theme action
      setTheme: (theme: Theme) => {
        const systemTheme = get().systemTheme
        const isDark = calculateIsDark(theme, systemTheme)

        set({ theme, isDark })

        // Apply theme to document
        if (isDark) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }
      },

      // Toggle between light and dark (ignoring system)
      toggleTheme: () => {
        const currentTheme = get().theme
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark'
        get().setTheme(newTheme)
      },

      // Initialize theme on app start
      initializeTheme: () => {
        const theme = get().theme
        const systemTheme = getSystemTheme()
        const isDark = calculateIsDark(theme, systemTheme)

        set({ systemTheme, isDark })

        // Apply initial theme to document
        if (isDark) {
          document.documentElement.classList.add('dark')
        } else {
          document.documentElement.classList.remove('dark')
        }

        // Listen for system theme changes
        if (typeof window !== 'undefined') {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

          const handleChange = (e: MediaQueryListEvent) => {
            const newSystemTheme = e.matches ? 'dark' : 'light'
            const currentTheme = get().theme
            const newIsDark = calculateIsDark(currentTheme, newSystemTheme)

            set({ systemTheme: newSystemTheme, isDark: newIsDark })

            // Only apply if using system theme
            if (currentTheme === 'system') {
              if (newIsDark) {
                document.documentElement.classList.add('dark')
              } else {
                document.documentElement.classList.remove('dark')
              }
            }
          }

          mediaQuery.addEventListener('change', handleChange)

          // Cleanup function
          return () => mediaQuery.removeEventListener('change', handleChange)
        }
      },
    }),
    {
      name: `${APP_CONFIG.storage.prefix}${APP_CONFIG.storage.keys.theme}`,
      storage: createJSONStorage(() => safariSafeStorage),
      partialize: state => ({
        theme: state.theme,
      }),
      onRehydrateStorage: () => state => {
        // Re-initialize theme on rehydration
        if (state) {
          setTimeout(() => state.initializeTheme(), 0)
        }
      },
    }
  )
)
