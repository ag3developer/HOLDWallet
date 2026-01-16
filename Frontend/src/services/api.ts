import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { APP_CONFIG } from '@/config/app'
import { useAuthStore } from '@/stores/useAuthStore'
import { authStorage } from '@/utils/indexedDBStorage'

// 🔧 Endpoints que precisam de trailing slash para evitar redirect 307
// Safari iOS perde o Authorization header em redirects
// NOTA: O backend está configurado com redirect_slashes=False, então não é mais necessário
const ENDPOINTS_NEEDING_TRAILING_SLASH = [
  '/wallets',
  '/users',
  '/transactions',
  '/addresses',
  // Removido: '/p2p/offers', '/p2p/orders' - backend não redireciona mais
  '/admin/users',
  '/admin/wallets',
  '/admin/transactions',
]

class ApiClient {
  private readonly client: AxiosInstance

  constructor() {
    console.log('🌐 [API Client] Initializing with baseURL:', APP_CONFIG.api.baseUrl)
    console.log('🌐 [API Client] Environment:', import.meta.env.MODE)
    console.log('🌐 [API Client] VITE_API_URL:', import.meta.env.VITE_API_URL)

    this.client = axios.create({
      baseURL: APP_CONFIG.api.baseUrl,
      timeout: 60000, // Aumentado para 60 segundos para operações mais complexas
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  /**
   * 🔧 Normaliza URL para evitar redirects 307 que perdem headers no Safari iOS
   * Adiciona trailing slash em endpoints de coleção
   */
  private normalizeUrl(url: string): string {
    // Não modificar URLs com query params ou que já terminam com /
    if (url.includes('?') || url.endsWith('/')) {
      return url
    }

    // Verificar se é um endpoint de coleção que precisa de trailing slash
    for (const endpoint of ENDPOINTS_NEEDING_TRAILING_SLASH) {
      // Match exato: /wallets mas não /wallets/123 ou /wallets/create
      if (url === endpoint) {
        console.log(`[API] 🔧 Adding trailing slash to: ${url} -> ${url}/`)
        return url + '/'
      }
    }

    return url
  }

  private debugLogRequest(config: any, token: string | null): void {
    const requestLog = {
      url: config.url,
      method: config.method,
      hasToken: !!token,
      token: token ? token.substring(0, 20) + '...' : 'NO TOKEN',
      timestamp: new Date().toISOString(),
      storageKey: `${APP_CONFIG.storage.prefix}${APP_CONFIG.storage.keys.auth}`,
    }
    console.log('[API] 📤 Request:', requestLog)

    // Special debug for wallet/create
    if (config.url?.includes('/wallets/create')) {
      console.log('[API] 🎫 Wallet creation request detected')
    }
  }

  private debugCheckStorageToken(): void {
    const storageKey = `${APP_CONFIG.storage.prefix}${APP_CONFIG.storage.keys.auth}`
    console.warn('[API] Checking localStorage for key:', storageKey)
    const storedData = localStorage.getItem(storageKey)
    console.warn('[API] Raw localStorage data:', storedData ? '(exists)' : '(NOT FOUND)')
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData)
        console.warn('[API] Parsed storage structure:', Object.keys(parsed))
        if (parsed.state) {
          console.warn('[API] State keys:', Object.keys(parsed.state))
          console.warn('[API] Has token in state?', !!parsed.state.token)
        }
      } catch (e) {
        console.warn('[API] Failed to parse localStorage:', e)
      }
    }
  }

  private setupInterceptors() {
    // Request interceptor to add auth token and normalize URLs
    this.client.interceptors.request.use(
      config => {
        // 🔧 Fix Safari iOS redirect issue: ensure trailing slash on collection endpoints
        // Safari iOS loses Authorization header on 307 redirects
        if (config.url) {
          config.url = this.normalizeUrl(config.url)
        }

        // Get token from localStorage (or from auth store)
        const token = this.getStoredToken()

        // Debug logging
        this.debugLogRequest(config, token)

        if (token) {
          config.headers.Authorization = `Bearer ${token}`
          console.log('[API] ✅ Authorization header set with token')
        } else {
          console.warn('[API] ⚠️ No token found for request to:', config.url)
          this.debugCheckStorageToken()
        }

        // Add request ID for debugging
        config.headers['X-Request-ID'] = this.generateRequestId()

        return config
      },
      error => {
        console.error('[API] Request interceptor error:', error)
        return Promise.reject(error)
      }
    )

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response
      },
      async error => {
        // Identificar tipo de erro
        const isTimeoutError = error.code === 'ECONNABORTED' || error.message?.includes('timeout')
        const isNetworkError =
          !error.response && (error.code === 'ERR_NETWORK' || error.message?.includes('Network'))
        const isCancelled = error.code === 'ERR_CANCELED' || axios.isCancel(error)

        // Não logar erros cancelados (navegação do usuário)
        if (isCancelled) {
          console.debug('[API] Request cancelled:', error.config?.url?.substring(0, 50))
          throw error
        }

        // Log apropriado baseado no tipo de erro
        if (isTimeoutError) {
          console.warn(
            `[API] ⏱️ Timeout (${error.config?.timeout}ms):`,
            error.config?.url?.substring(0, 60)
          )
        } else if (isNetworkError) {
          // Log silencioso para erros de rede (muito comum quando backend está offline)
          console.warn('[API] 🌐 Network error:', error.config?.url?.substring(0, 50))
        } else if (error.response) {
          // Apenas log detalhado para erros não-comuns com resposta
          console.error('[API] Response error:', {
            url: error.config?.url,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message,
            code: error.code,
          })
        } else {
          console.warn('[API] ⚠️ No response - backend may be unavailable')
        }

        const originalRequest = error.config

        // ========================================
        // 🔴 ARQUITETURA PROFISSIONAL DE ERROS
        // ========================================
        // Importar funções de erro padronizadas
        const { parseErrorResponse, requiresLogout, requiresReauth } = await import(
          './errors/ErrorCodes'
        )

        // Tentar parsear resposta padronizada
        const parsedError = parseErrorResponse(error)

        // Handle 401 Unauthorized - SEMPRE é sessão expirada
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true

          try {
            // Try to refresh token
            const token = this.getStoredToken()
            if (token) {
              await this.refreshToken(token)
              // Retry original request with new token
              return this.client(originalRequest)
            }
          } catch (refreshError) {
            // Refresh failed, logout user
            this.handleAuthError()
            throw refreshError
          }
        }

        // Handle 403 Forbidden - Decisão baseada no código de erro
        if (error.response?.status === 403) {
          // Log para debug
          console.warn('[API] 🚫 403 Forbidden:', {
            url: error.config?.url,
            code: parsedError?.code,
            requires_logout: parsedError?.requires_logout,
            requires_reauth: parsedError?.requires_reauth,
          })

          // Usar flags do backend se disponíveis, senão inferir do código
          if (parsedError) {
            if (parsedError.requires_logout) {
              console.warn('[API] 🔐 Server requested logout')
              this.handleAuthError()
            } else if (parsedError.requires_reauth) {
              // 2FA/Biometric expired - NÃO fazer logout
              // UI deve mostrar modal de reautenticação
              console.warn('[API] 🔄 Requires re-authentication (2FA/biometric)')
            } else {
              // Erro de negócio/validação - NÃO fazer logout
              console.warn('[API] ℹ️ Business/validation error, not logging out')
            }
          } else {
            // Formato legacy - verificar pelo detail string
            const errorDetail = error.response?.data?.detail

            // Só fazer logout se não tem token
            const token = this.getStoredToken()
            if (!token) {
              console.warn('[API] ⚠️ No token found - user needs to login again')
              this.handleAuthError()
            }
            // Para outros 403, NÃO fazer logout - deixar a UI tratar
          }
        }

        // Handle other errors
        throw this.handleApiError(error)
      }
    )
  }

  private getStoredToken(): string | null {
    try {
      // 🗄️ Strategy 0: IndexedDB (most reliable for Safari iOS)
      const indexedDBToken = authStorage.getToken()
      if (indexedDBToken) {
        console.log('[API] ✅ Token from IndexedDB')
        return indexedDBToken
      }

      // Strategy 1: Check in-memory Zustand store (fastest)
      const zustandToken = useAuthStore.getState().token
      if (zustandToken) {
        // Save to IndexedDB for iOS
        authStorage.setToken(zustandToken)
        this.backupTokenToSession(zustandToken)
        return zustandToken
      }

      // ⚠️ SAFARI iOS FIX: Check if Zustand is still hydrating
      const hasHydrated = useAuthStore.getState()._hasHydrated
      if (!hasHydrated) {
        console.log('[API] ⏳ Zustand still hydrating, checking storage directly...')
      }

      // Strategy 2: Try the Zustand persist format from localStorage
      const zustandKey = `${APP_CONFIG.storage.prefix}${APP_CONFIG.storage.keys.auth}`
      const authData = localStorage.getItem(zustandKey)

      if (authData) {
        const token = this.extractTokenFromData(authData)
        if (token) {
          console.log('[API] ✅ Token recovered from localStorage (Zustand format)')
          // Save to IndexedDB for iOS
          authStorage.setToken(token)
          this.backupTokenToSession(token)
          return token
        }
      }

      // Strategy 3: Check sessionStorage backup (Safari PWA fallback)
      try {
        const sessionToken = sessionStorage.getItem('auth_token_backup')
        if (sessionToken) {
          console.log('[API] ✅ Token recovered from sessionStorage backup')
          authStorage.setToken(sessionToken)
          return sessionToken
        }
      } catch {
        // sessionStorage not available
      }

      // Strategy 4: Check all localStorage keys (comprehensive fallback)
      const foundToken = this.findTokenInAllKeys()
      if (foundToken) {
        authStorage.setToken(foundToken)
        this.backupTokenToSession(foundToken)
        return foundToken
      }

      console.warn('[API] ⚠️ No token found - user not logged in or session expired')
      return null
    } catch (error) {
      console.error('[API] Error retrieving token:', error)
      return null
    }
  }

  // Backup token to sessionStorage for Safari iOS recovery
  private backupTokenToSession(token: string): void {
    try {
      sessionStorage.setItem('auth_token_backup', token)
      sessionStorage.setItem('auth_token_timestamp', Date.now().toString())
    } catch {
      // sessionStorage not available (private mode)
    }
  }

  private extractTokenFromData(data: string | null): string | null {
    if (!data) return null

    // Check if data is already a JWT token (starts with 'eyJ')
    if (data.startsWith('eyJ') && data.split('.').length === 3) {
      console.log('[API] ✅ Data is already a JWT token')
      return data
    }

    try {
      const parsed = JSON.parse(data)
      // Handle Zustand persist: { state: { token: '...' } }
      if (parsed.state?.token && typeof parsed.state.token === 'string') {
        return parsed.state.token
      }
      // Handle direct format: { token: '...' }
      if (parsed.token && typeof parsed.token === 'string') {
        return parsed.token
      }
      // Handle access_token format: { access_token: '...' }
      if (parsed.access_token && typeof parsed.access_token === 'string') {
        return parsed.access_token
      }
      return null
    } catch (e) {
      // If JSON.parse fails and data looks like a token, return it
      if (typeof data === 'string' && data.length > 20) {
        console.log('[API] ℹ️ Data is not JSON, checking if it could be a token')
        // Check if it might be a raw token string
        if (data.startsWith('eyJ')) {
          return data
        }
      }
      console.warn('[API] Failed to parse token data:', e)
      return null
    }
  }

  private findTokenInAllKeys(): string | null {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key) continue

        // Look for keys that likely contain auth data
        if (key.includes('auth') || key.includes('token')) {
          const data = localStorage.getItem(key)
          if (!data) continue

          const token = this.extractTokenFromData(data)
          // Validate token (should be a non-empty string)
          if (token && token.length > 10) {
            console.log(`[API] ✅ Token found in fallback key: ${key}`)
            return token
          }
        }
      }
    } catch (e) {
      console.warn('[API] Error searching localStorage:', e)
    }

    return null
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
  }

  private async refreshToken(token: string): Promise<void> {
    try {
      const response = await axios.post(`${APP_CONFIG.api.baseUrl}/auth/refresh`, { token })
      const newToken = response.data.access_token

      // Update stored token
      this.updateStoredToken(newToken)
    } catch (error) {
      console.error('[API] Token refresh failed:', error)
      throw error
    }
  }

  private updateStoredToken(token: string): void {
    try {
      const authKey = `${APP_CONFIG.storage.prefix}${APP_CONFIG.storage.keys.auth}`
      const authData = localStorage.getItem(authKey)
      if (authData) {
        const parsed = JSON.parse(authData)
        if (parsed.state) {
          parsed.state.token = token
          localStorage.setItem(authKey, JSON.stringify(parsed))
        }
      }
    } catch (error) {
      console.error('Failed to update stored token:', error)
    }
  }

  // Track if we're already handling an auth error to prevent duplicate logouts
  private isHandlingAuthError = false
  private lastLoginTimestamp = 0

  private handleAuthError(): void {
    // ⚠️ SAFARI iOS FIX: Check IndexedDB grace period first
    if (authStorage.isWithinGracePeriod(15)) {
      console.warn('[API] 🛡️ Preventing logout - IndexedDB grace period active')
      return
    }

    // Also check sessionStorage grace period
    const now = Date.now()
    const loginTimestamp = this.getLoginTimestamp()
    const timeSinceLogin = now - loginTimestamp

    if (timeSinceLogin < 15000) {
      // 15 seconds grace period after login
      console.warn('[API] 🛡️ Preventing logout - user just logged in', {
        timeSinceLogin: `${timeSinceLogin}ms`,
        threshold: '15000ms',
      })
      return
    }

    // Prevent duplicate logout handling
    if (this.isHandlingAuthError) {
      console.warn('[API] 🛡️ Already handling auth error, skipping duplicate')
      return
    }

    this.isHandlingAuthError = true

    // Importar dinamicamente para evitar circular dependency
    import('./notificationService')
      .then(({ default: notificationService }) => {
        notificationService.showWarning('Sua sessão expirou. Por favor, faça login novamente.')
      })
      .catch(() => {
        // Fallback se o import falhar
        console.warn('Session expired - redirecting to login')
      })

    // Clear all auth data
    localStorage.removeItem(`${APP_CONFIG.storage.prefix}${APP_CONFIG.storage.keys.auth}`)

    // Clear IndexedDB
    authStorage.clearAll().catch(console.error)

    // Also clear sessionStorage backup
    try {
      sessionStorage.removeItem('auth_token_backup')
      sessionStorage.removeItem('auth_token_timestamp')
    } catch {
      // sessionStorage not available
    }

    // Aguardar um pouco para o usuário ver a notificação
    setTimeout(() => {
      this.isHandlingAuthError = false
      // Redirect to login page
      if (globalThis.window !== undefined) {
        globalThis.window.location.href = '/login'
      }
    }, 2000)
  }

  // Get timestamp of last login
  private getLoginTimestamp(): number {
    try {
      const timestamp = sessionStorage.getItem('auth_token_timestamp')
      return timestamp ? parseInt(timestamp, 10) : 0
    } catch {
      return 0
    }
  }

  // Call this after successful login
  public markLoginTime(): void {
    try {
      sessionStorage.setItem('auth_token_timestamp', Date.now().toString())
      this.lastLoginTimestamp = Date.now()
    } catch {
      // sessionStorage not available
    }
  }

  private handleApiError(error: any): Error {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response
      const message = data?.message || `Request failed with status ${status}`

      const apiError = new Error(message)
      ;(apiError as any).status = status
      ;(apiError as any).code = data?.code
      ;(apiError as any).details = data?.details

      return apiError
    } else if (error.request) {
      // Request was made but no response received
      const errorMsg = error.message?.toLowerCase() || ''

      // Check for CORS or network issues
      if (errorMsg.includes('cors') || errorMsg.includes('blocked')) {
        const corsError = new Error(
          'CORS Error: The API server rejected the request. Please check if the backend is running and accessible.'
        )
        ;(corsError as any).code = 'CORS_ERROR'
        ;(corsError as any).originalError = error.message
        return corsError
      }

      // Generic network error
      const netError = new Error(
        'Network error: No response from server. Please check your connection and ensure the API server is running.'
      )
      ;(netError as any).originalError = error.message
      return netError
    } else {
      // Something else happened
      return new Error(`Request error: ${error.message}`)
    }
  }

  // Public HTTP methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.get(url, config)
  }

  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.client.post(url, data, config)
  }

  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.client.put(url, data, config)
  }

  async patch<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse<T>> {
    return this.client.patch(url, data, config)
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete(url, config)
  }

  // File upload helper
  async uploadFile<T = any>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<AxiosResponse<T>> {
    const formData = new FormData()
    formData.append('file', file)

    return this.client.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: progressEvent => {
        if (onProgress && progressEvent.total) {
          const progress = (progressEvent.loaded / progressEvent.total) * 100
          onProgress(Math.round(progress))
        }
      },
    })
  }

  // Get instance for custom operations
  getInstance(): AxiosInstance {
    return this.client
  }
}

export const apiClient = new ApiClient()
