import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authService } from '@/services'
import { useAuthStore } from '@/stores/useAuthStore'
import type { LoginRequest, RegisterRequest, User } from '@/types'

// Query keys
export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
}

// Get current user
export function useCurrentUser() {
  const { token, isAuthenticated } = useAuthStore()

  return useQuery({
    queryKey: authKeys.user(),
    queryFn: () => authService.getCurrentUser(token!),
    enabled: isAuthenticated && !!token,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 401 errors (token expired)
      if (error?.status === 401) return false
      return failureCount < 3
    },
  })
}

// Login mutation
export function useLogin() {
  const navigate = useNavigate()
  const { setAuthData } = useAuthStore()

  return useMutation({
    mutationFn: (credentials: LoginRequest) => authService.login(credentials),
    onSuccess: data => {
      console.log('🔐 Login success - User data:', data.user)
      console.log('🔐 is_admin:', data.user.is_admin)

      setAuthData(data.user, data.access_token)

      // Redirecionar admin para painel administrativo
      if (data.user.is_admin) {
        console.log('🛡️ Redirecting to /admin')
        navigate('/admin')
      } else {
        console.log('👤 Redirecting to /dashboard')
        navigate('/dashboard')
      }
    },
    onError: error => {
      console.error('Login error:', error)
    },
  })
}

// Register mutation
export function useRegister() {
  const navigate = useNavigate()
  const { setAuthData } = useAuthStore()

  return useMutation({
    mutationFn: (userData: RegisterRequest) => authService.register(userData),
    onSuccess: data => {
      setAuthData(data.user, data.access_token)
      navigate('/dashboard')
    },
  })
}

// Logout mutation
export function useLogout() {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      // Clear all cached data
      queryClient.clear()
      logout()
      navigate('/login')
    },
  })
}

// Update profile mutation
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userData: Partial<User>) => authService.updateProfile(userData),
    onSuccess: updatedUser => {
      // Update cached user data
      queryClient.setQueryData(authKeys.user(), updatedUser)

      // Update auth store
      const { user, updateUser } = useAuthStore.getState()
      if (user) {
        updateUser({ ...user, ...updatedUser })
      }
    },
  })
}

// Change password mutation
export function useChangePassword() {
  return useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string
      newPassword: string
    }) => authService.changePassword(currentPassword, newPassword),
  })
}

// Forgot password mutation
export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
  })
}

// Reset password mutation
export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) =>
      authService.resetPassword(token, newPassword),
  })
}

// Verify email mutation
export function useVerifyEmail() {
  return useMutation({
    mutationFn: (token: string) => authService.verifyEmail(token),
  })
}

// Resend email verification mutation
export function useResendEmailVerification() {
  return useMutation({
    mutationFn: (email: string) => authService.resendEmailVerification(email),
  })
}

// 2FA hooks
export function use2FAStatus() {
  const { isAuthenticated } = useAuthStore()

  return useQuery({
    queryKey: [...authKeys.all, '2fa-status'],
    queryFn: () => authService.get2FAStatus(),
    enabled: isAuthenticated,
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

export function useEnable2FA() {
  return useMutation({
    mutationFn: () => authService.enable2FA(),
  })
}

export function useVerify2FA() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (code: string) => authService.verify2FA(code),
    onSuccess: () => {
      // Invalidate 2FA status to refetch
      queryClient.invalidateQueries({ queryKey: [...authKeys.all, '2fa-status'] })
    },
  })
}

export function useDisable2FA() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (code: string) => authService.disable2FA(code),
    onSuccess: () => {
      // Invalidate 2FA status to refetch
      queryClient.invalidateQueries({ queryKey: [...authKeys.all, '2fa-status'] })
    },
  })
}

export function useValidate2FA() {
  return useMutation({
    mutationFn: ({ token, code }: { token: string; code: string }) =>
      authService.validate2FA(token, code),
  })
}
