import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { APP_CONFIG } from '@/config/app'

class ApiClient {
  private client: AxiosInstance

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

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        // Get token from localStorage (or from auth store)
        const token = this.getStoredToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        
        // Add request ID for debugging
        config.headers['X-Request-ID'] = this.generateRequestId()
        
        // Debug log for send transaction
        if (config.url?.includes('/wallets/send')) {
          console.log('[API] Sending transaction request:', {
            url: config.url,
            method: config.method,
            data: config.data,
            hasToken: !!token
          });
        }
        
        return config
      },
      (error) => {
        console.error('[API] Request interceptor error:', error);
        return Promise.reject(error)
      }
    )

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response
      },
      async (error) => {
        console.error('[API] Response error:', {
          url: error.config?.url,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });
        
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
            return Promise.reject(refreshError)
          }
        }

        // Handle other errors
        return Promise.reject(this.handleApiError(error))
      }
    )
  }

  private getStoredToken(): string | null {
    try {
      const authData = localStorage.getItem(`${APP_CONFIG.storage.prefix}${APP_CONFIG.storage.keys.auth}`)
      if (authData) {
        const parsed = JSON.parse(authData)
        return parsed.state?.token || null
      }
      return null
    } catch {
      return null
    }
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private async refreshToken(token: string): Promise<void> {
    try {
      const response = await axios.post(`${APP_CONFIG.api.baseUrl}/auth/refresh`, { token })
      const newToken = response.data.access_token
      
      // Update stored token
      this.updateStoredToken(newToken)
    } catch (error) {
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
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
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

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.post(url, data, config)
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.put(url, data, config)
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.patch(url, data, config)
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.client.delete(url, config)
  }

  // File upload helper
  async uploadFile<T = any>(url: string, file: File, onProgress?: (progress: number) => void): Promise<AxiosResponse<T>> {
    const formData = new FormData()
    formData.append('file', file)

    return this.client.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
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
