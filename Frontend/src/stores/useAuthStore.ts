import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { User, AuthState, LoginRequest, RegisterRequest, AuthResponse } from '@/types'
import { authService } from '@/services/auth'
import { APP_CONFIG } from '@/config/app'
import { safariSafeStorage } from '@/utils/safariStorage'
import { authStorage } from '@/utils/indexedDBStorage'
import { isTokenExpired } from '@/utils/jwt'

/**
 * Grava a sessão em TODOS os armazenamentos de uma vez (fonte única de verdade).
 * Antes, cada caminho de login gravava em lugares diferentes e o cliente HTTP
 * podia continuar enviando um token antigo/expirado do IndexedDB.
 */
function persistSessionStorages(token: string, user?: User | null, markLogin = false): void {
  authStorage.setToken(token)
  if (user) authStorage.setUser(user)
  try {
    sessionStorage.setItem('auth_token_backup', token)
    if (markLogin) sessionStorage.setItem('auth_token_timestamp', Date.now().toString())
  } catch {
    // sessionStorage indisponível (modo privado)
  }
}

/** Remove a sessão de todos os armazenamentos locais. */
export function clearSessionStorages(): void {
  authStorage.clearAll().catch(console.error)
  try {
    sessionStorage.removeItem('auth_token_backup')
    sessionStorage.removeItem('auth_token_timestamp')
  } catch {
    // ignore
  }
}

interface AuthStore extends AuthState {
  // Actions
  login: (credentials: LoginRequest) => Promise<void>
  setAuthData: (user: User, token: string) => void
  /** Atualiza só o token (após refresh), mantendo o usuário */
  setToken: (token: string) => void
  register: (userData: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  updateUser: (user: Partial<User>) => void
  clearError: () => void
  initializeAuth: () => Promise<void>
  // Hydration state
  _hasHydrated: boolean
  setHasHydrated: (value: boolean) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      _hasHydrated: false,

      // Set hydration state
      setHasHydrated: (value: boolean) => {
        set({ _hasHydrated: value })
      },

      // Login action
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null })

        try {
          const response: AuthResponse = await authService.login(credentials)

          persistSessionStorages(response.access_token, response.user, true)

          set({
            user: response.user,
            token: response.access_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })

          // Notificar sobre login bem-sucedido
          try {
            const { appNotifications } = await import('@/services/appNotifications')
            const device = navigator.userAgent.includes('Mobile') ? 'Dispositivo Movel' : 'Desktop'
            appNotifications.newLogin('', device)
          } catch {
            // Notificacao nao e critica
          }

          console.log('[AuthStore] ✅ Login successful, token saved to all stores')
        } catch (error: any) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || 'Login failed',
          })
          throw error
        }
      },

      // Set auth data after successful login
      setAuthData: (user: User, token: string) => {
        // Grava em todos os armazenamentos (antes não atualizava o IndexedDB e o
        // cliente HTTP seguia enviando o token anterior → "sessão expirou" logo após o login)
        persistSessionStorages(token, user, true)

        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        })
      },

      setToken: (token: string) => {
        persistSessionStorages(token, get().user)
        set({ token, isAuthenticated: true, error: null })
      },

      // Register action
      register: async (userData: RegisterRequest) => {
        set({ isLoading: true, error: null })

        try {
          const response: AuthResponse = await authService.register(userData)
          persistSessionStorages(response.access_token, response.user, true)

          set({
            user: response.user,
            token: response.access_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch (error: any) {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || 'Registration failed',
          })
          throw error
        }
      },

      // Logout action
      logout: async () => {
        // Get token BEFORE clearing state
        const currentToken = get().token

        // Call logout service to invalidate token on server
        if (currentToken) {
          try {
            console.log('[AuthStore] 🚪 Calling logout service with token')
            await authService.logout()
            console.log('[AuthStore] ✅ Logout successful on server')
          } catch (error) {
            console.error(
              '[AuthStore] ⚠️ Logout request failed (will clear locally anyway):',
              error
            )
          }
        }

        clearSessionStorages()

        // Clear local state
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        })

        console.log('[AuthStore] ✅ Local state cleared from all stores')
      },

      // Refresh token action
      refreshToken: async () => {
        const currentToken = get().token

        if (!currentToken) {
          throw new Error('No token available')
        }

        try {
          const response: AuthResponse = await authService.refreshToken(currentToken)
          get().setToken(response.access_token)
        } catch (error: any) {
          // ✅ Check grace period before logging out (Safari iOS fix)
          let timeSinceLogin = Infinity
          try {
            const loginTimestamp = sessionStorage.getItem('auth_token_timestamp')
            if (loginTimestamp) {
              timeSinceLogin = Date.now() - Number.parseInt(loginTimestamp, 10)
            }
          } catch {
            // sessionStorage not available
          }

          // If user just logged in (within 15 seconds), don't logout
          if (timeSinceLogin < 15000) {
            console.warn('[AuthStore] 🛡️ Skipping logout on refresh fail - user just logged in')
            throw error
          }

          // If refresh fails, logout user
          get().logout()
          throw error
        }
      },

      // Update user action
      updateUser: (userUpdate: Partial<User>) => {
        const currentUser = get().user
        if (currentUser) {
          set({
            user: { ...currentUser, ...userUpdate },
          })
        }
      },

      // Clear error action
      clearError: () => {
        set({ error: null })
      },

      // Initialize auth on app start
      initializeAuth: async () => {
        let token = get().token

        // Token vencido guardado de uma sessão anterior: descarta já, em vez de
        // mostrar o usuário como logado e expulsá-lo segundos depois.
        const storedToken = token || authStorage.getToken()
        if (storedToken && isTokenExpired(storedToken)) {
          console.warn('[AuthStore] ⌛ Stored token is expired - clearing session')
          clearSessionStorages()
          set({ user: null, token: null, isAuthenticated: false, isLoading: false, error: null })
          return
        }

        // ✅ SAFARI iOS FIX: If no token in Zustand, try IndexedDB
        if (!token) {
          const indexedDBToken = authStorage.getToken()
          if (indexedDBToken) {
            console.log('[AuthStore] 🔄 Recovering token from IndexedDB')
            token = indexedDBToken
            // Also try to get user from IndexedDB
            const indexedDBUser = authStorage.getUser<User>()
            if (indexedDBUser) {
              set({
                user: indexedDBUser,
                token: indexedDBToken,
                isAuthenticated: true,
                isLoading: false,
              })
              console.log('[AuthStore] ✅ Auth recovered from IndexedDB')
              return
            }
          }
        }

        if (!token) {
          set({ isLoading: false })
          return
        }

        set({ isLoading: true })

        try {
          // Verify token and get current user
          const user = await authService.getCurrentUser(token)

          persistSessionStorages(token, user)

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch (error: any) {
          // ✅ Check IndexedDB grace period first
          if (authStorage.isWithinGracePeriod(15)) {
            console.warn('[AuthStore] 🛡️ Skipping logout - IndexedDB grace period active')
            set({ isLoading: false })
            return
          }

          // Also check sessionStorage grace period
          let timeSinceLogin = Infinity
          try {
            const loginTimestamp = sessionStorage.getItem('auth_token_timestamp')
            if (loginTimestamp) {
              timeSinceLogin = Date.now() - Number.parseInt(loginTimestamp, 10)
            }
          } catch {
            // sessionStorage not available
          }

          // If user just logged in (within 15 seconds), don't logout on validation error
          if (timeSinceLogin < 15000) {
            console.warn('[AuthStore] 🛡️ Skipping logout - user just logged in', {
              timeSinceLogin: `${timeSinceLogin}ms`,
              error: error.message,
            })
            // Keep the user authenticated with the data we have
            set({ isLoading: false })
            return
          }

          // ✅ NEW: Handle network/timeout errors gracefully
          // Don't logout on network errors - keep user authenticated with cached data
          const isNetworkError =
            error.code === 'ERR_NETWORK' ||
            error.code === 'TIMEOUT_ERROR' ||
            error.code === 'NETWORK_ERROR' ||
            error.isNetworkError === true ||
            error.message?.toLowerCase().includes('timeout') ||
            error.message?.toLowerCase().includes('network')

          if (isNetworkError) {
            console.warn(
              '[AuthStore] 🌐 Network/timeout error during token validation - keeping auth state',
              {
                error: error.message,
                code: error.code,
              }
            )

            // Try to use cached user data from IndexedDB
            const cachedUser = authStorage.getUser<User>()
            if (cachedUser && token) {
              set({
                user: cachedUser,
                token: token,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              })
              console.log('[AuthStore] ✅ Using cached user data due to network error')
              return
            }

            // If we have a token but no cached user, still keep authenticated
            // The user can retry later when network is available
            if (token) {
              const currentUser = get().user
              if (currentUser) {
                set({ isLoading: false })
                console.log('[AuthStore] ✅ Keeping existing auth state due to network error')
                return
              }
            }
          }

          // Token is invalid, clear auth state
          console.error('[AuthStore] Token validation failed:', error.message)
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          })
        }
      },
    }),
    {
      name: `${APP_CONFIG.storage.prefix}${APP_CONFIG.storage.keys.auth}`,
      storage: createJSONStorage(() => safariSafeStorage),
      partialize: state => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => state => {
        const isSafari =
          typeof navigator !== 'undefined' &&
          /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

        console.log('[AuthStore] Rehydration completed', {
          hasToken: !!state?.token,
          hasUser: !!state?.user,
          isAuthenticated: state?.isAuthenticated,
          isSafari,
        })

        // Mark as hydrated - IMPORTANT for Safari/iOS
        if (state) {
          state.setHasHydrated(true)

          // ✅ SAFARI iOS FIX: If we have a token, mark it as fresh to prevent logout
          if (state.token) {
            try {
              // Não marcar o token reidratado como "recém-logado": isso escondia
              // tokens expirados por 15s e depois expulsava o usuário.
              sessionStorage.setItem('auth_token_backup', state.token)
              console.log('[AuthStore] ✅ Token backed up to sessionStorage')
            } catch {
              // sessionStorage not available
            }
          }
        }

        // Verify stored auth state on rehydration (but don't logout immediately)
        if (state?.token && state?.user) {
          // Delay initializeAuth slightly on Safari to avoid race conditions
          if (isSafari) {
            setTimeout(() => {
              state.initializeAuth()
            }, 500)
          } else {
            state.initializeAuth()
          }
        }
      },
    }
  )
)
