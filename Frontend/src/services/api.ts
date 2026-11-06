import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { APP_CONFIG } from '@/config/app'
import { useAuthStore, clearSessionStorages } from '@/stores/useAuthStore'
import { authStorage } from '@/utils/indexedDBStorage'
import { isTokenExpired, msUntilExpiry } from '@/utils/jwt'

// Renova a sessão quando faltar menos que isso para o token expirar (token dura 24h)
const PROACTIVE_REFRESH_WINDOW_MS = 12 * 60 * 60 * 1000
// Intervalo mínimo entre renovações proativas
const PROACTIVE_REFRESH_MIN_INTERVAL_MS = 10 * 60 * 1000

// Endpoints de autenticação: um 401 aqui é credencial inválida, não sessão expirada
const isAuthEndpoint = (url?: string): boolean =>
  !!url && /\/auth\/(login|signup|register|refresh|logout|2fa|verify|forgot|reset|webauthn)/.test(url)

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
  private isServerAvailable: boolean = true
  private lastServerCheck: number = 0
  private readonly SERVER_CHECK_INTERVAL = 5000 // 5 seconds

  constructor() {
    console.log('🌐 [API Client] Initializing with baseURL:', APP_CONFIG.api.baseUrl)
    console.log('🌐 [API Client] Environment:', import.meta.env.MODE)
    console.log('🌐 [API Client] VITE_API_URL:', import.meta.env.VITE_API_URL)

    this.client = axios.create({
      baseURL: APP_CONFIG.api.baseUrl,
      timeout: 30000, // 30 segundos - timeout padrão mais generoso
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()

    // Check server availability on init (background, non-blocking)
    setTimeout(() => this.checkServerAvailability(), 100)
  }

  /**
   * Quick health check for server availability
   */
  private async checkServerAvailability(): Promise<boolean> {
    const now = Date.now()

    // Don't check too frequently
    if (now - this.lastServerCheck < this.SERVER_CHECK_INTERVAL) {
      return this.isServerAvailable
    }

    this.lastServerCheck = now

    try {
      // Quick ping with short timeout
      await axios.get(`${APP_CONFIG.api.baseUrl}/health`, {
        timeout: 3000,
        validateStatus: () => true, // Accept any status
      })
      this.isServerAvailable = true
      return true
    } catch {
      this.isServerAvailable = false
      console.warn('[API] ⚠️ Server not available')
      return false
    }
  }

  /**
   * Mark server as available (called on successful requests)
   */
  private markServerAvailable(): void {
    this.isServerAvailable = true
    this.lastServerCheck = Date.now()
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

        // Sessão deslizante: renova em background antes de expirar
        if (token && !isAuthEndpoint(config.url)) {
          this.maybeRefreshProactively(token)
        }

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
        // Mark server as available on successful response
        this.markServerAvailable()
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

        // Handle 401 Unauthorized
        if (
          error.response?.status === 401 &&
          !originalRequest?._retry &&
          !isAuthEndpoint(originalRequest?.url)
        ) {
          originalRequest._retry = true
          const token = this.getStoredToken()

          if (token && !isTokenExpired(token)) {
            try {
              // Uma única renovação, compartilhada por todos os 401 simultâneos
              const newToken = await this.refreshSession(token)
              originalRequest.headers = originalRequest.headers || {}
              originalRequest.headers.Authorization = `Bearer ${newToken}`
              return this.client(originalRequest)
            } catch (refreshError: any) {
              // Só desloga se o servidor RECUSOU a sessão; falha de rede/timeout/5xx não
              const refreshStatus = refreshError?.response?.status
              if (refreshStatus === 401 || refreshStatus === 403) {
                this.handleAuthError()
              }
              throw this.handleApiError(error)
            }
          }

          // Sem token ou token já expirado: a sessão acabou de fato
          if (token) this.handleAuthError()
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

  /**
   * Token da sessão atual.
   * Fonte de verdade: o estado do auth store (atualizado no login/refresh).
   * Os armazenamentos persistentes só são usados enquanto o store ainda não
   * reidratou (Safari iOS). Tokens expirados são ignorados.
   */
  private getStoredToken(): string | null {
    try {
      const state = useAuthStore.getState()
      if (state.token) return state.token

      // Store vazio: pode estar reidratando (Safari) — tenta os backups
      const zustandKey = `${APP_CONFIG.storage.prefix}${APP_CONFIG.storage.keys.auth}`
      let sessionBackup: string | null = null
      try {
        sessionBackup = sessionStorage.getItem('auth_token_backup')
      } catch {
        // sessionStorage indisponível
      }
      const candidates = [
        authStorage.getToken(),
        this.extractTokenFromData(localStorage.getItem(zustandKey)),
        sessionBackup,
      ]
      for (const candidate of candidates) {
        if (candidate && !isTokenExpired(candidate)) return candidate
      }
      return null
    } catch (error) {
      console.error('[API] Error retrieving token:', error)
      return null
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

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
  }

  private refreshPromise: Promise<string> | null = null
  private lastRefreshAt = 0

  /**
   * Renova o token (single-flight) e grava o novo token no auth store e em
   * todos os armazenamentos. Antes o token novo só ia para o JSON do
   * localStorage e o cliente continuava usando o antigo.
   */
  private refreshSession(token: string): Promise<string> {
    if (this.refreshPromise) return this.refreshPromise

    this.refreshPromise = axios
      .post(
        `${APP_CONFIG.api.baseUrl}/auth/refresh`,
        {},
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          timeout: 20000,
        }
      )
      .then(response => {
        const newToken = response.data?.access_token as string | undefined
        if (!newToken) throw new Error('Refresh response without access_token')
        useAuthStore.getState().setToken(newToken)
        this.lastRefreshAt = Date.now()
        return newToken
      })
      .finally(() => {
        this.refreshPromise = null
      })

    return this.refreshPromise
  }

  private maybeRefreshProactively(token: string): void {
    if (this.refreshPromise) return
    if (Date.now() - this.lastRefreshAt < PROACTIVE_REFRESH_MIN_INTERVAL_MS) return
    const remaining = msUntilExpiry(token)
    if (remaining <= 0 || remaining > PROACTIVE_REFRESH_WINDOW_MS) return
    this.lastRefreshAt = Date.now()
    this.refreshSession(token).catch(err => {
      console.warn('[API] Proactive token refresh failed (will retry later):', err?.message)
    })
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

    // Clear all auth data (store em memória + todos os armazenamentos)
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false })
    localStorage.removeItem(`${APP_CONFIG.storage.prefix}${APP_CONFIG.storage.keys.auth}`)
    clearSessionStorages()

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
      const errorCode = error.code || ''

      // Mark server as potentially unavailable
      this.isServerAvailable = false

      // Check for specific error types
      if (errorMsg.includes('cors') || errorMsg.includes('blocked')) {
        const corsError = new Error(
          'CORS Error: The API server rejected the request. Please check if the backend is running and accessible.'
        )
        ;(corsError as any).code = 'CORS_ERROR'
        ;(corsError as any).originalError = error.message
        ;(corsError as any).isNetworkError = true
        return corsError
      }

      // Timeout error
      if (errorCode === 'ECONNABORTED' || errorMsg.includes('timeout')) {
        const timeoutError = new Error(
          'Request timeout: Server took too long to respond. Please try again.'
        )
        ;(timeoutError as any).code = 'TIMEOUT_ERROR'
        ;(timeoutError as any).isNetworkError = true
        ;(timeoutError as any).isRetryable = true
        return timeoutError
      }

      // Connection refused / server not running
      if (errorCode === 'ERR_NETWORK' || errorMsg.includes('network')) {
        const netError = new Error(
          'Connection error: Unable to reach the server. Please check if the API is running.'
        )
        ;(netError as any).code = 'ERR_NETWORK'
        ;(netError as any).isNetworkError = true
        ;(netError as any).isRetryable = true
        return netError
      }

      // Generic network error
      const netError = new Error(
        'Network error: No response from server. Please check your connection.'
      )
      ;(netError as any).code = 'NETWORK_ERROR'
      ;(netError as any).isNetworkError = true
      ;(netError as any).isRetryable = true
      ;(netError as any).originalError = error.message
      return netError
    } else {
      // Something else happened
      return new Error(`Request error: ${error.message}`)
    }
  }

  /**
   * Check if server is likely available
   */
  isServerLikelyAvailable(): boolean {
    return this.isServerAvailable
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
