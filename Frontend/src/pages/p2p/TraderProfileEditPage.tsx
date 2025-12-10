import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle, Loader2, Save, Check } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { traderProfileService } from '@/services/traderProfileService'

export function TraderProfileEditPage() {
  const navigate = useNavigate()
  const { token } = useAuthStore()

  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    avatar_url: '',
    min_order_amount: '',
    max_order_amount: '',
    auto_accept_orders: false,
  })

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) {
        setError('Não autenticado')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const data = await traderProfileService.getMyProfile(token)
        setProfile(data)
        setFormData({
          display_name: data.display_name || '',
          bio: data.bio || '',
          avatar_url: data.avatar_url || '',
          min_order_amount: data.min_order_amount?.toString() || '',
          max_order_amount: data.max_order_amount?.toString() || '',
          auto_accept_orders: data.auto_accept_orders || false,
        })
      } catch {
        // Perfil não existe, é criação
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [token])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, type } = e.target
    const value = type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!formData.display_name.trim()) {
      setError('Nome do trader é obrigatório')
      return
    }

    if (!token) {
      setError('Token não disponível')
      return
    }

    try {
      setSubmitting(true)

      const profileData: any = {
        display_name: formData.display_name,
        auto_accept_orders: formData.auto_accept_orders,
      }

      if (formData.bio) profileData.bio = formData.bio
      if (formData.avatar_url) profileData.avatar_url = formData.avatar_url
      if (formData.min_order_amount)
        profileData.min_order_amount = Number.parseFloat(formData.min_order_amount)
      if (formData.max_order_amount)
        profileData.max_order_amount = Number.parseFloat(formData.max_order_amount)

      if (profile) {
        await traderProfileService.updateProfile(profileData, token)
      } else {
        await traderProfileService.createProfile(profileData, token)
      }

      setSuccess(true)
      setTimeout(() => {
        navigate('/profile?tab=trader')
      }, 1500)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar perfil'
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center'>
        <div className='flex flex-col items-center gap-4'>
          <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
          <p className='text-gray-600 dark:text-gray-400'>Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 py-8'>
      <div className='max-w-2xl mx-auto px-4'>
        <div className='mb-8'>
          <button
            onClick={() => navigate('/profile')}
            className='flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-4'
          >
            <ArrowLeft className='w-4 h-4' />
            Voltar
          </button>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
            {profile ? 'Editar Perfil de Trader' : 'Criar Perfil de Trader'}
          </h1>
        </div>

        {error && (
          <div className='mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3'>
            <AlertCircle className='w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5' />
            <div>
              <p className='font-medium text-red-700 dark:text-red-300'>Erro</p>
              <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className='mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3'>
            <Check className='w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5' />
            <div>
              <p className='font-medium text-green-700 dark:text-green-300'>Sucesso!</p>
              <p className='text-sm text-green-600 dark:text-green-400'>
                Perfil salvo com sucesso. Redirecionando...
              </p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className='space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6'
        >
          <div>
            <label className='block text-sm font-medium text-gray-900 dark:text-white mb-2'>
              Nome do Trader *
            </label>
            <input
              type='text'
              name='display_name'
              value={formData.display_name}
              onChange={handleInputChange}
              placeholder='Seu nome como trader'
              required
              className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-900 dark:text-white mb-2'>
              Descrição
            </label>
            <textarea
              name='bio'
              value={formData.bio}
              onChange={handleInputChange}
              placeholder='Descreva um pouco sobre você como trader'
              rows={4}
              className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-900 dark:text-white mb-2'>
              URL do Avatar
            </label>
            <input
              type='url'
              name='avatar_url'
              value={formData.avatar_url}
              onChange={handleInputChange}
              placeholder='https://exemplo.com/avatar.jpg'
              className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-900 dark:text-white mb-2'>
                Valor Mínimo (BRL)
              </label>
              <input
                type='number'
                name='min_order_amount'
                value={formData.min_order_amount}
                onChange={handleInputChange}
                placeholder='100'
                step='0.01'
                className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-900 dark:text-white mb-2'>
                Valor Máximo (BRL)
              </label>
              <input
                type='number'
                name='max_order_amount'
                value={formData.max_order_amount}
                onChange={handleInputChange}
                placeholder='10000'
                step='0.01'
                className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>
          </div>

          <div>
            <label className='flex items-center gap-3'>
              <input
                type='checkbox'
                name='auto_accept_orders'
                checked={formData.auto_accept_orders}
                onChange={handleInputChange}
                className='w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500'
              />
              <span className='text-sm text-gray-900 dark:text-white'>
                Aceitar automaticamente novas ordens
              </span>
            </label>
          </div>

          <div className='flex gap-3 pt-4'>
            <button
              type='submit'
              disabled={submitting}
              className='flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2'
            >
              {submitting ? (
                <>
                  <Loader2 className='w-4 h-4 animate-spin' />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className='w-4 h-4' />
                  Salvar Perfil
                </>
              )}
            </button>
            <button
              type='button'
              onClick={() => navigate('/profile')}
              className='px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium rounded-lg transition-colors'
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
