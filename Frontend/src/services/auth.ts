import { User, LoginRequest, RegisterRequest, AuthResponse } from '@/types'
import { apiClient } from './api'
import { apiConfig } from '@/config/api'

class AuthService {
  // Login user
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post(apiConfig.auth.login, credentials)
    return response.data
  }

  // Register new user
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post(apiConfig.auth.signup, userData)
    return response.data
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      console.log('[AuthService] 🚪 Sending logout request to server')
      const response = await apiClient.post(apiConfig.auth.logout)
      console.log('[AuthService] ✅ Logout response:', response.status)
    } catch (error: any) {
      // Log the error but don't throw - user will be logged out locally anyway
      console.warn('[AuthService] ⚠️ Logout request failed:', {
        status: error.response?.status,
        message: error.message,
      })
      // Don't re-throw, allow local logout to proceed
    }
  }

  // Refresh authentication token
  async refreshToken(token: string): Promise<AuthResponse> {
    const response = await apiClient.post(apiConfig.auth.refresh, { token })
    return response.data
  }

  // Get current user profile
  async getCurrentUser(token: string): Promise<User> {
    const response = await apiClient.get(apiConfig.user.profile, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    return response.data
  }

  // Update user profile
  async updateProfile(userData: Partial<User>): Promise<User> {
    const response = await apiClient.put(apiConfig.user.update, userData)
    return response.data
  }

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post(`${apiConfig.baseURL}/auth/change-password`, {
      currentPassword,
      newPassword,
    })
  }

  // Request password reset
  async forgotPassword(email: string): Promise<void> {
    await apiClient.post(`${apiConfig.baseURL}/auth/forgot-password`, { email })
  }

  // Reset password with token
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.post(`${apiConfig.baseURL}/auth/reset-password`, {
      token,
      newPassword,
    })
  }

  // Verify email
  async verifyEmail(token: string): Promise<void> {
    await apiClient.post(apiConfig.auth.verify, { token })
  }

  // Resend email verification
  async resendEmailVerification(email: string): Promise<void> {
    await apiClient.post(`${apiConfig.baseURL}/auth/resend-verification`, { email })
  }

  // Enable 2FA
  async enable2FA(): Promise<{ qr_code: string; backup_codes: string[]; secret: string }> {
    const response = await apiClient.post(`${apiConfig.baseURL}/auth/2fa/setup`)
    return response.data
  }

  // Verify 2FA setup
  async verify2FA(code: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`${apiConfig.baseURL}/auth/2fa/verify`, {
      token: code,
    })
    return response.data
  }

  // Disable 2FA
  async disable2FA(code: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(`${apiConfig.baseURL}/auth/2fa/disable`, {
      token: code,
    })
    return response.data
  }

  // Get 2FA status
  async get2FAStatus(): Promise<{
    enabled: boolean
    verified: boolean
    has_backup_codes: boolean
  }> {
    const response = await apiClient.get(`${apiConfig.baseURL}/auth/2fa/status`)
    return response.data
  }

  // Validate 2FA code during login
  async validate2FA(token: string, code: string): Promise<AuthResponse> {
    const response = await apiClient.post(`${apiConfig.baseURL}/auth/2fa/validate`, {
      token,
      code,
    })
    return response.data
  }
}

export const authService = new AuthService()
