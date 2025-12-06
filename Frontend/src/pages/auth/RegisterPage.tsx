import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useRegister } from '@/hooks/useAuth'
import { Eye, EyeOff, Mail, User, Phone, Lock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

interface RegisterForm {
  email: string
  username: string
  password: string
  confirmPassword: string
  acceptTerms: boolean
  acceptPrivacy: boolean
  acceptMarketing: boolean
}

export const RegisterPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const registerMutation = useRegister()
  
  const [formData, setFormData] = useState<RegisterForm>({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false,
    acceptPrivacy: false,
    acceptMarketing: false,
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)

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
    
    let strength = 0
    if (/[a-z]/.test(password)) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++
    if (password.length >= 12) strength++
    
    setPasswordStrength(strength)
    
    if (strength < 3) {
      return t('validation.passwordWeak', 'Senha muito fraca. Use maiúscula, minúscula, número e símbolo')
    }
    return ''
  }

  const validateUsername = (username: string): string => {
    if (!username) return t('validation.usernameRequired', 'Nome de usuário é obrigatório')
    if (username.length < 3) return t('validation.usernameTooShort', 'Nome de usuário deve ter pelo menos 3 caracteres')
    if (username.length > 50) return t('validation.usernameTooLong', 'Nome de usuário deve ter menos de 50 caracteres')
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return t('validation.usernameInvalid', 'Nome de usuário pode conter apenas letras, números, hífens e underscores')
    }
    return ''
  }

  const validateName = (name: string, field: string): string => {
    if (!name) return t(`validation.${field}Required`, `${field} é obrigatório`)
    if (name.length < 2) return t(`validation.${field}TooShort`, `${field} deve ter pelo menos 2 caracteres`)
    if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(name)) {
      return t(`validation.${field}Invalid`, `${field} deve conter apenas letras`)
    }
    return ''
  }

  const validatePhone = (phone: string): string => {
    if (!phone) return '' // Phone is optional
    if (!/^\+?[\d\s\-()]+$/.test(phone)) {
      return t('validation.phoneInvalid', 'Formato de telefone inválido')
    }
    return ''
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    errors.email = validateEmail(formData.email)
    errors.username = validateUsername(formData.username)
    errors.password = validatePassword(formData.password)
    
    if (!formData.confirmPassword) {
      errors.confirmPassword = t('validation.confirmPasswordRequired', 'Confirmação de senha é obrigatória')
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = t('validation.passwordMismatch', 'Senhas não coincidem')
    }
    
    if (!formData.acceptTerms) {
      errors.acceptTerms = t('validation.termsRequired', 'Você deve aceitar os termos de uso')
    }
    
    if (!formData.acceptPrivacy) {
      errors.acceptPrivacy = t('validation.privacyRequired', 'Você deve aceitar a política de privacidade')
    }
    
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
      await registerMutation.mutateAsync({
        email: formData.email,
        username: formData.username,
        password: formData.password,
      })
      
      // Successful registration, redirect to dashboard
      navigate('/dashboard')
    } catch (error: any) {
      // Error is handled by the mutation
      console.error('Registration failed:', error)
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
    
    // Update password strength in real time
    if (name === 'password') {
      validatePassword(value)
    }
  }

  const getPasswordStrengthLabel = (strength: number): { label: string; color: string } => {
    switch (strength) {
      case 0:
      case 1:
        return { label: 'Muito fraca', color: 'text-red-500' }
      case 2:
        return { label: 'Fraca', color: 'text-orange-500' }
      case 3:
        return { label: 'Média', color: 'text-yellow-500' }
      case 4:
        return { label: 'Forte', color: 'text-green-500' }
      case 5:
        return { label: 'Muito forte', color: 'text-green-600' }
      default:
        return { label: '', color: '' }
    }
  }

  const isLoading = registerMutation.isPending

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-20 w-20 rounded-2xl bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center mb-6 p-3">
            <img 
              src="/images/logos/hw-icon.png" 
              alt="HOLD Wallet Logo" 
              className="h-16 w-16 object-contain"
            />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('auth.register', 'Criar Conta')}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Registre-se na HOLD Wallet e comece a negociar
          </p>
        </div>

        {/* Register Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-4">
            {/* Error Message */}
            {registerMutation.error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <div className="flex items-center">
                  <span className="text-red-400 mr-2">⚠️</span>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {registerMutation.error.message || 'Erro no registro'}
                  </p>
                </div>
              </div>
            )}

            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('auth.username', 'Nome de usuário')}
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className={`mt-1 block w-full px-3 py-2 border rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  formErrors.username 
                    ? 'border-red-300 dark:border-red-600 focus:border-red-500' 
                    : 'border-gray-300 dark:border-gray-600 focus:border-primary-500'
                }`}
                placeholder="joaosilva"
                value={formData.username}
                onChange={handleChange}
              />
              {formErrors.username && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.username}</p>
              )}
            </div>

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
                placeholder="joao@exemplo.com"
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
                  autoComplete="new-password"
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
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          passwordStrength <= 2 ? 'bg-red-500' :
                          passwordStrength <= 3 ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}
                        {...{
                          style: { width: `${Math.min((passwordStrength / 5) * 100, 100)}%` }
                        }}
                      />
                    </div>
                    <span className={`text-xs font-medium ${getPasswordStrengthLabel(passwordStrength).color}`}>
                      {getPasswordStrengthLabel(passwordStrength).label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Use maiúscula, minúscula, número e símbolos
                  </p>
                </div>
              )}
              
              {formErrors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.password}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('auth.confirmPassword', 'Confirmar Senha')}
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className={`block w-full px-3 py-2 pr-10 border rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                    formErrors.confirmPassword 
                      ? 'border-red-300 dark:border-red-600 focus:border-red-500' 
                      : 'border-gray-300 dark:border-gray-600 focus:border-primary-500'
                  }`}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
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
              {formErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.confirmPassword}</p>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-3">
              <div className="flex items-start">
                <input
                  id="acceptTerms"
                  name="acceptTerms"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-1"
                  checked={formData.acceptTerms}
                  onChange={handleChange}
                />
                <label htmlFor="acceptTerms" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Eu aceito os{' '}
                  <Link to="/terms" className="text-primary-600 hover:text-primary-500" target="_blank">
                    Termos de Uso
                  </Link>
                  {' '}*
                </label>
              </div>
              {formErrors.acceptTerms && (
                <p className="text-sm text-red-600 dark:text-red-400">{formErrors.acceptTerms}</p>
              )}

              <div className="flex items-start">
                <input
                  id="acceptPrivacy"
                  name="acceptPrivacy"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-1"
                  checked={formData.acceptPrivacy}
                  onChange={handleChange}
                />
                <label htmlFor="acceptPrivacy" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Eu aceito a{' '}
                  <Link to="/privacy" className="text-primary-600 hover:text-primary-500" target="_blank">
                    Política de Privacidade
                  </Link>
                  {' '}*
                </label>
              </div>
              {formErrors.acceptPrivacy && (
                <p className="text-sm text-red-600 dark:text-red-400">{formErrors.acceptPrivacy}</p>
              )}

              <div className="flex items-start">
                <input
                  id="acceptMarketing"
                  name="acceptMarketing"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-1"
                  checked={formData.acceptMarketing}
                  onChange={handleChange}
                />
                <label htmlFor="acceptMarketing" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Desejo receber e-mails promocionais e newsletters <span className="text-gray-400">(opcional)</span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('auth.registering', 'Criando conta...')}
                </>
              ) : (
                t('auth.register', 'Criar Conta')
              )}
            </button>
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Já tem uma conta?{' '}
              <Link
                to="/login"
                className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
              >
                {t('auth.login', 'Entrar')}
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
