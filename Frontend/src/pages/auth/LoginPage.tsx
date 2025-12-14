import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useLogin, useValidate2FA } from '@/hooks/useAuth'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { Eye, EyeOff, Mail, Lock, Shield } from 'lucide-react'

interface LoginForm {
  email: string
  password: string
  rememberMe: boolean
}

interface TwoFactorForm {
  code: string
}

export const LoginPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const loginMutation = useLogin()
  const validate2FAMutation = useValidate2FA()
  
  const [step, setStep] = useState<'login' | '2fa'>('login')
  const [tempToken, setTempToken] = useState<string>('')
  
  const [formData, setFormData] = useState<LoginForm>({
    email: '',
    password: '',
    rememberMe: false,
  })

  const [twoFactorData, setTwoFactorData] = useState<TwoFactorForm>({
    code: ''
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)

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
    if (password.length < 6) {
      return t('validation.passwordTooShort', 'Senha deve ter pelo menos 6 caracteres')
    }
    return ''
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    errors.email = validateEmail(formData.email)
    errors.password = validatePassword(formData.password)
    
    // Remove empty errors
    Object.keys(errors).forEach(key => {
      if (!errors[key]) delete errors[key]
    })
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    try {
      await loginMutation.mutateAsync({
        email: formData.email,
        password: formData.password,
        rememberMe: formData.rememberMe,
      })
      
      // Navigation is handled by the useLogin hook
    } catch (error: any) {
      // Error is handled by the mutation
      console.error('Login failed:', error)
    }
  }

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!twoFactorData.code) {
      setFormErrors({ code: t('validation.2faRequired', 'Código 2FA é obrigatório') })
      return
    }
    
    try {
      await validate2FAMutation.mutateAsync({
        token: tempToken,
        code: twoFactorData.code
      })
      
      // Successful 2FA validation, redirect to dashboard
      navigate('/dashboard')
    } catch (error: any) {
      setFormErrors({ code: t('validation.2faInvalid', 'Código 2FA inválido') })
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    
    // Clear specific field error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handle2FAChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target
    // Only allow numbers and limit to 6 digits
    const sanitizedValue = value.replace(/\D/g, '').slice(0, 6)
    setTwoFactorData({ code: sanitizedValue })
    
    // Clear error when user starts typing
    if (formErrors.code) {
      setFormErrors(prev => ({ ...prev, code: '' }))
    }
  }

  const isLoading = loginMutation.isPending || validate2FAMutation.isPending

  if (isLoading) {
    return <LoadingScreen message={
      step === 'login' 
        ? t('auth.loggingIn', 'Fazendo login...') 
        : t('auth.validating2FA', 'Validando código 2FA...')
    } />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 rounded-2xl bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center mb-6 p-3">
            <img 
              src="/images/logos/wn-icon.png" 
              alt="Wolknow Logo" 
              className="h-16 w-16 object-contain"
            />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {step === 'login' ? t('auth.login', 'Entrar') : t('auth.2fa', 'Autenticação de Dois Fatores')}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {step === 'login' 
              ? 'Entre na sua conta Wolknow'
              : 'Digite o código de 6 dígitos do seu app autenticador'
            }
          </p>
        </div>

        {/* Login Form */}
        {step === 'login' && (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-4">
              {/* Error Message */}
              {loginMutation.error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <div className="flex items-center">
                    <Shield className="w-4 h-4 text-red-400 mr-2" />
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {loginMutation.error.message || 'Erro no login'}
                    </p>
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
                {formErrors.email && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('auth.password', 'Senha')}
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className={`block w-full px-3 py-2 pr-10 border rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                      formErrors.password 
                        ? 'border-red-300 dark:border-red-600 focus:border-red-500' 
                        : 'border-gray-300 dark:border-gray-600 focus:border-primary-500'
                    }`}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
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
                {formErrors.password && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.password}</p>
                )}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="rememberMe"
                    name="rememberMe"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                  />
                  <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    {t('auth.rememberMe', 'Lembrar de mim')}
                  </label>
                </div>

                <Link
                  to="/forgot-password"
                  className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400"
                >
                  {t('auth.forgotPassword', 'Esqueci a senha')}
                </Link>
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
                    {t('auth.loggingIn', 'Entrando...')}
                  </>
                ) : (
                  t('auth.login', 'Entrar')
                )}
              </button>
            </div>

            {/* Register Link */}
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Não tem uma conta?{' '}
                <Link
                  to="/register"
                  className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
                >
                  {t('auth.register', 'Registre-se')}
                </Link>
              </p>
            </div>
          </form>
        )}

        {/* 2FA Form */}
        {step === '2fa' && (
          <form className="mt-8 space-y-6" onSubmit={handle2FASubmit}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-4">
              {/* Error Message */}
              {formErrors.code && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <div className="flex items-center">
                    <Shield className="w-4 h-4 text-red-400 mr-2" />
                    <p className="text-sm text-red-600 dark:text-red-400">{formErrors.code}</p>
                  </div>
                </div>
              )}

              {/* 2FA Code Field */}
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('auth.2faCode', 'Código de Verificação')}
                </label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  required
                  className={`mt-1 block w-full px-3 py-2 text-center text-2xl font-mono tracking-widest border rounded-lg shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    formErrors.code 
                      ? 'border-red-300 dark:border-red-600 focus:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600 focus:border-primary-500'
                  }`}
                  placeholder="000000"
                  value={twoFactorData.code}
                  onChange={handle2FAChange}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-center">
                  Digite o código de 6 dígitos do seu aplicativo autenticador
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || twoFactorData.code.length !== 6}
                className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('auth.validating', 'Validando...')}
                  </>
                ) : (
                  t('auth.verify', 'Verificar')
                )}
              </button>

              {/* Back to Login */}
              <button
                type="button"
                onClick={() => setStep('login')}
                className="w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                ← Voltar ao login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
