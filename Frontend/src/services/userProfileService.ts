/**
 * User Profile Service
 * ====================
 *
 * Service for user profile management.
 * Includes profile data, notification settings, password change, and security settings.
 *
 * @author HOLD Wallet Team
 */

import { apiClient } from './api'

// ============================================
// TYPES
// ============================================

export interface UserProfile {
  // User data
  id: string
  email: string
  username: string
  is_active: boolean
  is_admin: boolean
  created_at: string
  last_login?: string | null

  // Profile data (from KYC)
  full_name?: string | null
  phone?: string | null
  bio?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  birth_date?: string | null
  website?: string | null
  avatar_url?: string | null
  social_links?: Record<string, string> | null

  // KYC specific fields
  kyc_status?: string | null
  kyc_level?: string | null
  occupation?: string | null
  document_type?: string | null
  nationality?: string | null
}

export interface UserProfileUpdate {
  full_name?: string | null
  phone?: string | null
  bio?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  birth_date?: string | null
  website?: string | null
  avatar_url?: string | null
  social_links?: Record<string, string> | null
}

export interface NotificationSettings {
  id: string
  user_id: string
  trade_alerts: boolean
  price_alerts: boolean
  security_alerts: boolean
  marketing_emails: boolean
  weekly_report: boolean
  push_enabled: boolean
  push_trade_alerts: boolean
  push_price_alerts: boolean
  push_security_alerts: boolean
  email_enabled: boolean
  created_at: string
  updated_at?: string | null
}

export interface NotificationSettingsUpdate {
  trade_alerts?: boolean
  price_alerts?: boolean
  security_alerts?: boolean
  marketing_emails?: boolean
  weekly_report?: boolean
  push_enabled?: boolean
  push_trade_alerts?: boolean
  push_price_alerts?: boolean
  push_security_alerts?: boolean
  email_enabled?: boolean
}

export interface PasswordChangeRequest {
  current_password: string
  new_password: string
  confirm_password: string
}

export interface PasswordChangeResponse {
  success: boolean
  message: string
}

export interface SecuritySettings {
  two_factor_enabled: boolean
  two_factor_method?: string | null
  last_password_change?: string | null
  active_sessions: number
  login_notifications: boolean
}

export interface TwoFactorStatus {
  enabled: boolean
  method?: string | null
  verified: boolean
  backup_codes_remaining: number
}

// ============================================
// SERVICE CLASS
// ============================================

class UserProfileService {
  private readonly baseUrl = '/users'

  /**
   * Get current user's full profile
   */
  async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get<UserProfile>(`${this.baseUrl}/me/profile`)
    return response.data
  }

  /**
   * Update current user's profile
   */
  async updateProfile(data: UserProfileUpdate): Promise<UserProfile> {
    const response = await apiClient.put<UserProfile>(`${this.baseUrl}/me/profile`, data)
    return response.data
  }

  /**
   * Get notification settings
   */
  async getNotificationSettings(): Promise<NotificationSettings> {
    const response = await apiClient.get<NotificationSettings>(`${this.baseUrl}/me/notifications`)
    return response.data
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(
    data: NotificationSettingsUpdate
  ): Promise<NotificationSettings> {
    const response = await apiClient.put<NotificationSettings>(
      `${this.baseUrl}/me/notifications`,
      data
    )
    return response.data
  }

  /**
   * Change password
   */
  async changePassword(data: PasswordChangeRequest): Promise<PasswordChangeResponse> {
    const response = await apiClient.post<PasswordChangeResponse>(
      `${this.baseUrl}/me/password`,
      data
    )
    return response.data
  }

  /**
   * Get security settings
   */
  async getSecuritySettings(): Promise<SecuritySettings> {
    const response = await apiClient.get<SecuritySettings>(`${this.baseUrl}/me/security`)
    return response.data
  }

  /**
   * Get 2FA status
   */
  async get2FAStatus(): Promise<TwoFactorStatus> {
    const response = await apiClient.get<TwoFactorStatus>(`${this.baseUrl}/me/2fa/status`)
    return response.data
  }

  /**
   * Format location string from profile data
   */
  formatLocation(profile: UserProfile): string {
    const parts = [profile.city, profile.state, profile.country].filter(Boolean)
    return parts.join(', ')
  }

  /**
   * Parse location string to profile fields
   */
  parseLocation(location: string): {
    city: string | undefined
    state: string | undefined
    country: string | undefined
  } {
    const parts = location
      .split(',')
      .map(p => p.trim())
      .filter(Boolean)
    return {
      city: parts[0] || undefined,
      state: parts[1] || undefined,
      country: parts[2] || undefined,
    }
  }

  /**
   * Format birth date for display
   */
  formatBirthDate(date: string | null | undefined): string {
    if (!date) return ''
    try {
      return new Date(date).toLocaleDateString('pt-BR')
    } catch {
      return ''
    }
  }

  /**
   * Format date for API (YYYY-MM-DD)
   */
  formatDateForApi(date: string): string | null {
    if (!date) return null
    try {
      // Try to parse various formats
      const parsed = new Date(date)
      if (Number.isNaN(parsed.getTime())) return null
      const isoDate = parsed.toISOString().split('T')[0]
      return isoDate ?? null
    } catch {
      return null
    }
  }
}

// Export singleton instance
export const userProfileService = new UserProfileService()
export default userProfileService
