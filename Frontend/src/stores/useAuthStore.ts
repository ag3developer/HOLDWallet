import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, AuthState, LoginRequest, RegisterRequest, AuthResponse } from '@/types'
import { authService } from '@/services/auth'
import { APP_CONFIG } from '@/config/app'

interface AuthStore extends AuthState {
  // Actions
  login: (credentials: LoginRequest) => Promise<void>
  setAuthData: (user: User, token: string) => void
  register: (userData: RegisterRequest) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
  updateUser: (user: Partial<User>) => void
  clearError: () => void
  initializeAuth: () => Promise<void>
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

      // Login action
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null })
        
        try {
          const response: AuthResponse = await authService.login(credentials)
          
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
            error: error.message || 'Login failed',
          })
          throw error
        }
      },

      // Set auth data after successful login
      setAuthData: (user: User, token: string) => {
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        })
      },

      // Register action
      register: async (userData: RegisterRequest) => {
        set({ isLoading: true, error: null })
        
        try {
          const response: AuthResponse = await authService.register(userData)
          
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
      logout: () => {
        // Call logout service to invalidate token on server
        if (get().token) {
          authService.logout().catch(console.error)
        }

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        })
      },

      // Refresh token action
      refreshToken: async () => {
        const currentToken = get().token
        
        if (!currentToken) {
          throw new Error('No token available')
        }

        try {
          const response: AuthResponse = await authService.refreshToken(currentToken)
          
          set({
            user: response.user,
            token: response.access_token,
            isAuthenticated: true,
            error: null,
          })
        } catch (error: any) {
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
        const token = get().token
        
        if (!token) {
          set({ isLoading: false })
          return
        }

        set({ isLoading: true })

        try {
          // Verify token and get current user
          const user = await authService.getCurrentUser(token)
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch (error: any) {
          // Token is invalid, clear auth state
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
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Verify stored auth state on rehydration
        if (state?.token && state?.user) {
          state.initializeAuth()
        }
      },
    }
  )
)
