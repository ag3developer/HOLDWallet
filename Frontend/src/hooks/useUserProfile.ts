/**
 * useUserProfile Hook
 * ===================
 *
 * React hook for user profile management.
 * Provides loading states, error handling, and caching.
 *
 * @author HOLD Wallet Team
 */

import { useState, useEffect, useCallback } from 'react'
import {
  userProfileService,
  UserProfile,
  UserProfileUpdate,
  NotificationSettings,
  NotificationSettingsUpdate,
  SecuritySettings,
  PasswordChangeRequest,
  TwoFactorStatus,
} from '@/services/userProfileService'
import { useAuthStore } from '@/stores/useAuthStore'
import { toast } from 'react-hot-toast'

interface UseUserProfileResult {
  // Profile data
  profile: UserProfile | null
  isLoadingProfile: boolean
  profileError: string | null

  // Notification settings
  notificationSettings: NotificationSettings | null
  isLoadingNotifications: boolean
  notificationsError: string | null

  // Security settings
  securitySettings: SecuritySettings | null
  twoFactorStatus: TwoFactorStatus | null
  isLoadingSecurity: boolean
  securityError: string | null

  // Actions
  loadProfile: () => Promise<void>
  updateProfile: (data: UserProfileUpdate) => Promise<boolean>
  loadNotificationSettings: () => Promise<void>
  updateNotificationSettings: (data: NotificationSettingsUpdate) => Promise<boolean>
  loadSecuritySettings: () => Promise<void>
  changePassword: (data: PasswordChangeRequest) => Promise<boolean>
  load2FAStatus: () => Promise<void>

  // Helper functions
  formatLocation: (profile: UserProfile) => string
  parseLocation: (location: string) => {
    city: string | undefined
    state: string | undefined
    country: string | undefined
  }
}

export function useUserProfile(): UseUserProfileResult {
  const { token, isAuthenticated } = useAuthStore()

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(
    null
  )
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)
  const [notificationsError, setNotificationsError] = useState<string | null>(null)

  // Security settings state
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings | null>(null)
  const [twoFactorStatus, setTwoFactorStatus] = useState<TwoFactorStatus | null>(null)
  const [isLoadingSecurity, setIsLoadingSecurity] = useState(false)
  const [securityError, setSecurityError] = useState<string | null>(null)

  /**
   * Load user profile
   */
  const loadProfile = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setProfileError('Não autenticado')
      return
    }

    setIsLoadingProfile(true)
    setProfileError(null)

    try {
      const data = await userProfileService.getProfile()
      console.log('Profile API response:', data)
      setProfile(data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar perfil'
      setProfileError(message)
      console.error('Erro ao carregar perfil:', error)
    } finally {
      setIsLoadingProfile(false)
    }
  }, [isAuthenticated, token])

  /**
   * Update user profile
   */
  const updateProfile = useCallback(
    async (data: UserProfileUpdate): Promise<boolean> => {
      if (!isAuthenticated || !token) {
        toast.error('Não autenticado')
        return false
      }

      setIsLoadingProfile(true)

      try {
        const updated = await userProfileService.updateProfile(data)
        setProfile(updated)
        toast.success('Perfil atualizado com sucesso!')
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao atualizar perfil'
        toast.error(message)
        console.error('Erro ao atualizar perfil:', error)
        return false
      } finally {
        setIsLoadingProfile(false)
      }
    },
    [isAuthenticated, token]
  )

  /**
   * Load notification settings
   */
  const loadNotificationSettings = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setNotificationsError('Não autenticado')
      return
    }

    setIsLoadingNotifications(true)
    setNotificationsError(null)

    try {
      const data = await userProfileService.getNotificationSettings()
      setNotificationSettings(data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar configurações'
      setNotificationsError(message)
      console.error('Erro ao carregar configurações de notificação:', error)
    } finally {
      setIsLoadingNotifications(false)
    }
  }, [isAuthenticated, token])

  /**
   * Update notification settings
   */
  const updateNotificationSettings = useCallback(
    async (data: NotificationSettingsUpdate): Promise<boolean> => {
      if (!isAuthenticated || !token) {
        toast.error('Não autenticado')
        return false
      }

      setIsLoadingNotifications(true)

      try {
        const updated = await userProfileService.updateNotificationSettings(data)
        setNotificationSettings(updated)
        toast.success('Configurações atualizadas!')
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao atualizar configurações'
        toast.error(message)
        console.error('Erro ao atualizar configurações de notificação:', error)
        return false
      } finally {
        setIsLoadingNotifications(false)
      }
    },
    [isAuthenticated, token]
  )

  /**
   * Load security settings
   */
  const loadSecuritySettings = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setSecurityError('Não autenticado')
      return
    }

    setIsLoadingSecurity(true)
    setSecurityError(null)

    try {
      const data = await userProfileService.getSecuritySettings()
      setSecuritySettings(data)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao carregar configurações de segurança'
      setSecurityError(message)
      console.error('Erro ao carregar configurações de segurança:', error)
    } finally {
      setIsLoadingSecurity(false)
    }
  }, [isAuthenticated, token])

  /**
   * Change password
   */
  const changePassword = useCallback(
    async (data: PasswordChangeRequest): Promise<boolean> => {
      if (!isAuthenticated || !token) {
        toast.error('Não autenticado')
        return false
      }

      setIsLoadingSecurity(true)

      try {
        const result = await userProfileService.changePassword(data)
        if (result.success) {
          toast.success(result.message)
          return true
        } else {
          toast.error(result.message)
          return false
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao alterar senha'
        toast.error(message)
        console.error('Erro ao alterar senha:', error)
        return false
      } finally {
        setIsLoadingSecurity(false)
      }
    },
    [isAuthenticated, token]
  )

  /**
   * Load 2FA status
   */
  const load2FAStatus = useCallback(async () => {
    if (!isAuthenticated || !token) {
      return
    }

    try {
      const data = await userProfileService.get2FAStatus()
      setTwoFactorStatus(data)
    } catch (error) {
      console.error('Erro ao carregar status 2FA:', error)
    }
  }, [isAuthenticated, token])

  /**
   * Helper: Format location
   */
  const formatLocation = useCallback((profileData: UserProfile): string => {
    return userProfileService.formatLocation(profileData)
  }, [])

  /**
   * Helper: Parse location
   */
  const parseLocation = useCallback((location: string) => {
    return userProfileService.parseLocation(location)
  }, [])

  // Auto-load profile on mount when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      loadProfile()
    }
  }, [isAuthenticated, token, loadProfile])

  return {
    // Profile data
    profile,
    isLoadingProfile,
    profileError,

    // Notification settings
    notificationSettings,
    isLoadingNotifications,
    notificationsError,

    // Security settings
    securitySettings,
    twoFactorStatus,
    isLoadingSecurity,
    securityError,

    // Actions
    loadProfile,
    updateProfile,
    loadNotificationSettings,
    updateNotificationSettings,
    loadSecuritySettings,
    changePassword,
    load2FAStatus,

    // Helper functions
    formatLocation,
    parseLocation,
  }
}

export default useUserProfile
