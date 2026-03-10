/**
 * WolkPay Gateway - Página de Login de Merchant
 * Login dedicado para o portal de merchants
 */

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CreditCard, Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'

export default function GatewayLoginPage() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !password) {
      setError('Preencha todos os campos')
      return
    }

    try {
      setLoading(true)
      setError(null)

      console.log('[GatewayLogin] Attempting login for:', email)
      await login({ email, password })
      console.log('[GatewayLogin] ✅ Login successful, navigating to dashboard')
      navigate('/dashboard')
    } catch (err: unknown) {
      console.error('Erro ao fazer login:', err)
      if (err instanceof Error) {
        setError(err.message || 'Email ou senha incorretos')
      } else {
        setError('Email ou senha incorretos')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center p-4'>
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />

      <div className='relative w-full max-w-md'>
        {/* Back Link */}
        <Link
          to='/'
          className='inline-flex items-center gap-2 text-indigo-300 hover:text-white transition-colors mb-8'
        >
          <ArrowLeft className='w-4 h-4' />
          Voltar para o início
        </Link>

        {/* Login Card */}
        <div className='bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8'>
          {/* Header */}
          <div className='text-center mb-8'>
            <div className='w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4'>
              <CreditCard className='w-8 h-8 text-white' />
            </div>
            <h1 className='text-2xl font-bold text-slate-900 dark:text-white'>WolkPay Gateway</h1>
            <p className='text-slate-500 dark:text-slate-400 mt-2'>Acesse sua conta de merchant</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className='space-y-5'>
            <div>
              <label
                htmlFor='email'
                className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'
              >
                Email
              </label>
              <div className='relative'>
                <Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400' />
                <input
                  id='email'
                  type='email'
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder='seu@email.com'
                  className='w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                  autoComplete='email'
                />
              </div>
            </div>

            <div>
              <label
                htmlFor='password'
                className='block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2'
              >
                Senha
              </label>
              <div className='relative'>
                <Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400' />
                <input
                  id='password'
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder='••••••••'
                  className='w-full pl-10 pr-12 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                  autoComplete='current-password'
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? <EyeOff className='w-5 h-5' /> : <Eye className='w-5 h-5' />}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className='flex justify-end'>
              <Link
                to='/forgot-password'
                className='text-sm text-indigo-600 dark:text-indigo-400 hover:underline'
              >
                Esqueceu a senha?
              </Link>
            </div>

            {/* Error Message */}
            {error && (
              <div className='p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm'>
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type='submit'
              disabled={loading}
              className='w-full py-3.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2'
            >
              {loading ? (
                <>
                  <Loader2 className='w-5 h-5 animate-spin' />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className='relative my-8'>
            <div className='absolute inset-0 flex items-center'>
              <div className='w-full border-t border-slate-200 dark:border-slate-700' />
            </div>
            <div className='relative flex justify-center text-sm'>
              <span className='px-4 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400'>
                Não tem uma conta?
              </span>
            </div>
          </div>

          {/* Register Link */}
          <Link
            to='/register'
            className='block w-full py-3.5 text-center border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-semibold hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors'
          >
            Criar conta de merchant
          </Link>
        </div>

        {/* Footer */}
        <p className='text-center text-sm text-indigo-200/60 mt-8'>
          Protegido por criptografia de ponta a ponta
        </p>
      </div>
    </div>
  )
}
