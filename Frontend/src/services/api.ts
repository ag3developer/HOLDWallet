import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { APP_CONFIG } from '@/config/app'
import { useAuthStore } from '@/stores/useAuthStore'

class ApiClient {
  private readonly client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: APP_CONFIG.api.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
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
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      config => {
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
        console.error('[API] Response error:', {
          url: error.config?.url,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
        })

        const originalRequest = error.config

        // Handle 401 Unauthorized - token expired
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

        // Handle 403 Forbidden - missing or invalid token
        if (error.response?.status === 403) {
          console.warn('[API] 403 Forbidden - Token may be invalid or missing')
          // Check if we have a token
          const token = this.getStoredToken()
          if (!token) {
            console.warn('[API] No token found - redirecting to login')
            this.handleAuthError()
          }
        }

        // Handle other errors
        throw this.handleApiError(error)
      }
    )
  }

  private getStoredToken(): string | null {
    try {
      // First, try the in-memory Zustand store (fastest and most reliable)
      const zustandToken = useAuthStore.getState().token
      if (zustandToken) {
        console.log('[API] ✅ Token found in Zustand store (in-memory)')
        return zustandToken
      }

      // Fallback: Try the Zustand persist format from localStorage
      const zustandKey = `${APP_CONFIG.storage.prefix}${APP_CONFIG.storage.keys.auth}`
      const authData = localStorage.getItem(zustandKey)
      const token = this.extractTokenFromData(authData)

      if (token) {
        console.log('[API] ✅ Token found in localStorage (Zustand format)')
        // Also restore to in-memory store
        const parsed = JSON.parse(authData || '{}')
        if (parsed.state?.user) {
          useAuthStore.getState().setAuthData(parsed.state.user, token)
        }
        return token
      }

      // Last fallback: Check all localStorage keys for token
      return this.findTokenInAllKeys()
    } catch (error) {
      console.error('[API] ❌ Error retrieving token:', error)
      return null
    }
  }

  private extractTokenFromData(data: string | null): string | null {
    if (!data) return null
    try {
      const parsed = JSON.parse(data)
      return parsed.state?.token || parsed.token || null
    } catch {
      return null
    }
  }

  private findTokenInAllKeys(): string | null {
    console.warn('[API] ⚠️ Token not found in standard location, checking all keys...')

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.includes('auth')) {
        const data = localStorage.getItem(key)
        const token = this.extractTokenFromData(data)
        if (token) {
          console.log(`[API] ✅ Token found in fallback key: ${key}`)
          return token
        }
      }
    }

    console.error('[API] ❌ No token found in any localStorage location')
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

  private handleAuthError(): void {
    // Clear stored auth data
    localStorage.removeItem(`${APP_CONFIG.storage.prefix}${APP_CONFIG.storage.keys.auth}`)

    // Redirect to login page
    if (globalThis.window !== undefined) {
      globalThis.window.location.href = '/login'
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
      return new Error('Network error: No response from server')
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
