import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForgotPassword, useResetPassword } from '@/hooks/useAuth'
import { Eye, EyeOff, Mail, CheckCircle, ArrowRight, Lock, AlertTriangle } from 'lucide-react'

interface ForgotPasswordForm {
  email: string
}

interface ResetPasswordForm {
  token: string
  newPassword: string
  confirmPassword: string
}

export const ForgotPasswordPage = () => {
  const { t } = useTranslation()
  const forgotPasswordMutation = useForgotPassword()
  const resetPasswordMutation = useResetPassword()
  
  const [step, setStep] = useState<'request' | 'reset' | 'success'>('request')
  const [formData, setFormData] = useState<ForgotPasswordForm>({
    email: ''
  })
  
  const [resetData, setResetData] = useState<ResetPasswordForm>({
    token: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Get token from URL if present
  const urlParams = new URLSearchParams(window.location.search)
  const tokenFromUrl = urlParams.get('token')
  
  // If token is in URL, switch to reset step
  useState(() => {
    if (tokenFromUrl) {
      setResetData(prev => ({ ...prev, token: tokenFromUrl }))
      setStep('reset')
    }
  })

  // Validation functions
  const validateEmail = (email: string): string => {
    if (!email) return t('validation.emailRequired', 'E-mail é obrigatório')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return t('validation.emailInvalid', 'E-mail inválido')
    }
    return ''
  }

  const validatePassword = (password: string): string => {
    if (!password) return t('validation.passwordRequired', 'Senha é obrigatória')
    if (password.length < 8) {
      return t('validation.passwordTooShort', 'Senha deve ter pelo menos 8 caracteres')
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return t('validation.passwordWeak', 'Senha deve conter maiúscula, minúscula e número')
    }
    return ''
  }

  const validateForgotPasswordForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    errors.email = validateEmail(formData.email)
    
    Object.keys(errors).forEach(key => {
      if (!errors[key]) delete errors[key]
    })
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateResetPasswordForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    if (!resetData.token) {
      errors.token = t('validation.tokenRequired', 'Token de recuperação é obrigatório')
    }
    
    errors.newPassword = validatePassword(resetData.newPassword)
    
    if (!resetData.confirmPassword) {
      errors.confirmPassword = t('validation.confirmPasswordRequired', 'Confirmação de senha é obrigatória')
    } else if (resetData.newPassword !== resetData.confirmPassword) {
      errors.confirmPassword = t('validation.passwordMismatch', 'Senhas não coincidem')
    }
    
    Object.keys(errors).forEach(key => {
      if (!errors[key]) delete errors[key]
    })
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForgotPasswordForm()) return
    
    try {
      await forgotPasswordMutation.mutateAsync(formData.email)
      setStep('success')
    } catch (error: any) {
      setFormErrors({ email: error.message || 'Erro ao enviar e-mail de recuperação' })
    }
  }

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateResetPasswordForm()) return
    
    try {
      await resetPasswordMutation.mutateAsync({
        token: resetData.token,
        newPassword: resetData.newPassword
      })
      setStep('success')
    } catch (error: any) {
      setFormErrors({ token: error.message || 'Token inválido ou expirado' })
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleResetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setResetData(prev => ({ ...prev, [name]: value }))
    
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const isLoading = forgotPasswordMutation.isPending || resetPasswordMutation.isPending

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center mb-4">
            {step === 'success' && <CheckCircle className="h-8 w-8 text-white" />}
            {step === 'reset' && <Lock className="h-8 w-8 text-white" />}
            {step === 'request' && <ArrowRight className="h-8 w-8 text-white" />}
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {step === 'request' && t('auth.forgotPassword', 'Recuperar Senha')}
            {step === 'reset' && t('auth.resetPassword', 'Redefinir Senha')}
            {step === 'success' && t('auth.success', 'Sucesso!')}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {step === 'request' && 'Digite seu e-mail para receber instruções de recuperação'}
            {step === 'reset' && 'Digite sua nova senha'}
            {step === 'success' && 'Operação realizada com sucesso'}
          </p>
        </div>

        {/* Request Reset Form */}
        {step === 'request' && (
          <form className="mt-8 space-y-6" onSubmit={handleForgotPasswordSubmit}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-4">
              {/* Error Message */}
              {formErrors.email && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <div className="flex items-center">
                    <AlertTriangle className="w-4 h-4 text-red-400 mr-2" />
                    <p className="text-sm text-red-600 dark:text-red-400">{formErrors.email}</p>
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('auth.email', 'E-mail')}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    formErrors.email 
                      ? 'border-red-300 dark:border-red-600 focus:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600 focus:border-primary-500'
                  }`}
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enviando...
                  </>
                ) : (
                  'Enviar E-mail de Recuperação'
                )}
              </button>
            </div>

            {/* Back to Login */}
            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400"
              >
                ← Voltar ao login
              </Link>
            </div>
          </form>
        )}

        {/* Reset Password Form */}
        {step === 'reset' && (
          <form className="mt-8 space-y-6" onSubmit={handleResetPasswordSubmit}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-4">
              {/* Error Message */}
              {(formErrors.token || formErrors.newPassword || formErrors.confirmPassword) && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <div className="flex items-center">
                    <AlertTriangle className="w-4 h-4 text-red-400 mr-2" />
                    <div className="text-sm text-red-600 dark:text-red-400">
                      {formErrors.token || formErrors.newPassword || formErrors.confirmPassword}
                    </div>
                  </div>
                </div>
              )}

              {/* Token Field (if not from URL) */}
              {!tokenFromUrl && (
                <div>
                  <label htmlFor="token" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Token de Recuperação
                  </label>
                  <input
                    id="token"
                    name="token"
                    type="text"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Token do e-mail"
                    value={resetData.token}
                    onChange={handleResetChange}
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Verifique seu e-mail pelo token de recuperação
                  </p>
                </div>
              )}

              {/* New Password Field */}
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nova Senha
                </label>
                <div className="mt-1 relative">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="••••••••"
                    value={resetData.newPassword}
                    onChange={handleResetChange}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? 
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" /> : 
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    }
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Mínimo 8 caracteres com maiúscula, minúscula e número
                </p>
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirmar Nova Senha
                </label>
                <div className="mt-1 relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    className="block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="••••••••"
                    value={resetData.confirmPassword}
                    onChange={handleResetChange}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? 
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" /> : 
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    }
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Redefinindo...
                  </>
                ) : (
                  'Redefinir Senha'
                )}
              </button>
            </div>

            {/* Back to Login */}
            <div className="text-center">
              <Link
                to="/login"
                className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400"
              >
                ← Voltar ao login
              </Link>
            </div>
          </form>
        )}

        {/* Success State */}
        {step === 'success' && (
          <div className="mt-8 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-4 text-center">
              <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              
              {step === 'success' && forgotPasswordMutation.isSuccess && (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    E-mail Enviado!
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Verifique sua caixa de entrada e clique no link para redefinir sua senha.
                  </p>
                </>
              )}
              
              {step === 'success' && resetPasswordMutation.isSuccess && (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Senha Redefinida!
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Sua senha foi alterada com sucesso. Você pode fazer login com sua nova senha.
                  </p>
                </>
              )}

              <Link
                to="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Fazer Login
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
