import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, AlertCircle, Loader2, Trash2, Upload } from 'lucide-react'
import { useTraderProfile } from '@/hooks/useTraderProfile'
import { useAuthStore } from '@/store/authStore'

export function TraderProfileEditPage() {
  const navigate = useNavigate()
  const { token } = useAuthStore()
  const { profile, loading, error, updateProfile, refetch } = useTraderProfile()

  const [formData, setFormData] = useState({
    display_name: '',
    bio: '',
    avatar_url: '',
    min_order_amount: '',
    max_order_amount: '',
    accepted_payment_methods: '',
    auto_accept_orders: false,
  })

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Preencher formulário com dados existentes
  useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || '',
        bio: profile.bio || '',
        avatar_url: profile.avatar_url || '',
        min_order_amount: profile.min_order_amount?.toString() || '',
        max_order_amount: profile.max_order_amount?.toString() || '',
        accepted_payment_methods: profile.accepted_payment_methods || '',
        auto_accept_orders: profile.auto_accept_orders || false,
      })
    }
  }, [profile])

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
    setSubmitError(null)
    setSuccess(false)

    if (!formData.display_name.trim()) {
      setSubmitError('Nome do negociador é obrigatório')
      return
    }

    try {
      setSubmitting(true)

      await updateProfile({
        display_name: formData.display_name,
        bio: formData.bio || undefined,
        avatar_url: formData.avatar_url || undefined,
        min_order_amount: formData.min_order_amount
          ? parseFloat(formData.min_order_amount)
          : undefined,
        max_order_amount: formData.max_order_amount
          ? parseFloat(formData.max_order_amount)
          : undefined,
        accepted_payment_methods: formData.accepted_payment_methods || undefined,
        auto_accept_orders: formData.auto_accept_orders,
      })

      setSuccess(true)
      setTimeout(() => {
        navigate(`/p2p/trader/${profile?.id}`)
      }, 1500)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar perfil'
      setSubmitError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteProfile = async () => {
    if (
      !window.confirm(
        'Tem certeza que deseja deletar seu perfil de negociador? Esta ação não pode ser desfeita.'
      )
    ) {
      return
    }

    try {
      setSubmitting(true)
      // TODO: Implementar endpoint de deleção
      // await traderProfileService.deleteProfile(token)
      // navigate('/p2p')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao deletar perfil'
      setSubmitError(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center'>
        <div className='flex flex-col items-center gap-4'>
          <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
          <p className='text-gray-600 dark:text-gray-400'>Carregando perfil...</p>
        </div>
      </div>
    )
  }

  if (error && !profile) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
        <div className='max-w-2xl mx-auto px-4 py-8'>
          <button
            onClick={() => navigate('/p2p')}
            className='flex items-center gap-2 mb-6 text-blue-600 hover:text-blue-700'
          >
            <ArrowLeft className='w-4 h-4' />
            Voltar
          </button>

          <div className='p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3'>
            <AlertCircle className='w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0' />
            <div>
              <p className='font-medium text-red-700 dark:text-red-300'>Erro</p>
              <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
        <div className='max-w-2xl mx-auto px-4 py-8'>
          <button
            onClick={() => navigate('/p2p/trader-setup')}
            className='flex items-center gap-2 mb-6 text-blue-600 hover:text-blue-700'
          >
            <ArrowLeft className='w-4 h-4' />
            Voltar
          </button>

          <div className='p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-center'>
            <p className='text-gray-600 dark:text-gray-400 mb-4'>
              Você ainda não tem um perfil de negociador
            </p>
            <button
              onClick={() => navigate('/p2p/trader-setup')}
              className='px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors'
            >
              Criar Perfil Agora
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      {/* Header */}
      <div className='bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10'>
        <div className='max-w-2xl mx-auto px-4 py-4'>
          <button
            onClick={() => navigate(`/p2p/trader/${profile.id}`)}
            className='flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
          >
            <ArrowLeft className='w-4 h-4' />
            Voltar
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className='max-w-2xl mx-auto px-4 py-8'>
        <h1 className='text-3xl font-bold text-gray-900 dark:text-white mb-8'>Editar Perfil</h1>

        {/* Success Message */}
        {success && (
          <div className='p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-6 flex items-center gap-3'>
            <div className='w-5 h-5 rounded-full bg-green-600 flex items-center justify-center text-white'>
              ✓
            </div>
            <div>
              <p className='font-medium text-green-700 dark:text-green-300'>Sucesso!</p>
              <p className='text-sm text-green-600 dark:text-green-400'>
                Perfil atualizado com sucesso
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {submitError && (
          <div className='p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-6 flex items-center gap-3'>
            <AlertCircle className='w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0' />
            <div>
              <p className='font-medium text-red-700 dark:text-red-300'>Erro</p>
              <p className='text-sm text-red-600 dark:text-red-400'>{submitError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* Basic Information Section */}
          <div className='bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700'>
            <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4'>
              Informações Básicas
            </h2>

            <div className='space-y-4'>
              {/* Display Name */}
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  Nome do Negociador *
                </label>
                <input
                  type='text'
                  name='display_name'
                  value={formData.display_name}
                  onChange={handleInputChange}
                  placeholder='Ex: João Silva'
                  className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
                  required
                />
              </div>

              {/* Bio */}
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  Descrição/Bio
                </label>
                <textarea
                  name='bio'
                  value={formData.bio}
                  onChange={handleInputChange}
                  placeholder='Descreva seu perfil como negociador (máx 500 caracteres)'
                  rows={4}
                  maxLength={500}
                  className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
                <p className='text-xs text-gray-600 dark:text-gray-400 mt-1'>
                  {formData.bio.length}/500 caracteres
                </p>
              </div>

              {/* Avatar URL */}
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  URL do Avatar
                </label>
                <div className='flex gap-2'>
                  <input
                    type='url'
                    name='avatar_url'
                    value={formData.avatar_url}
                    onChange={handleInputChange}
                    placeholder='https://example.com/avatar.jpg'
                    className='flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
                  />
                  <button
                    type='button'
                    className='px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors flex items-center gap-2'
                  >
                    <Upload className='w-4 h-4' />
                    Upload
                  </button>
                </div>
                {formData.avatar_url && (
                  <div className='mt-3'>
                    <p className='text-xs text-gray-600 dark:text-gray-400 mb-2'>
                      Pré-visualização:
                    </p>
                    <img
                      src={formData.avatar_url}
                      alt='Avatar'
                      className='w-20 h-20 rounded-full object-cover border-2 border-blue-500'
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Trading Preferences Section */}
          <div className='bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700'>
            <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-4'>
              Preferências de Negociação
            </h2>

            <div className='space-y-4'>
              {/* Min Order Amount */}
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  Valor Mínimo da Ordem (R$)
                </label>
                <input
                  type='number'
                  name='min_order_amount'
                  value={formData.min_order_amount}
                  onChange={handleInputChange}
                  placeholder='0'
                  step='0.01'
                  min='0'
                  className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>

              {/* Max Order Amount */}
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  Valor Máximo da Ordem (R$)
                </label>
                <input
                  type='number'
                  name='max_order_amount'
                  value={formData.max_order_amount}
                  onChange={handleInputChange}
                  placeholder='Deixar em branco para sem limite'
                  step='0.01'
                  min='0'
                  className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>

              {/* Payment Methods */}
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  Métodos de Pagamento Aceitos
                </label>
                <input
                  type='text'
                  name='accepted_payment_methods'
                  value={formData.accepted_payment_methods}
                  onChange={handleInputChange}
                  placeholder='Ex: PIX, TED, Transferência, Dinheiro'
                  className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
                <p className='text-xs text-gray-600 dark:text-gray-400 mt-1'>Separe por vírgula</p>
              </div>

              {/* Auto Accept */}
              <div className='flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                <input
                  type='checkbox'
                  name='auto_accept_orders'
                  checked={formData.auto_accept_orders}
                  onChange={handleInputChange}
                  id='auto_accept'
                  className='w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500'
                />
                <label
                  htmlFor='auto_accept'
                  className='flex-1 text-sm font-medium text-gray-700 dark:text-gray-300'
                >
                  Aceitar automaticamente ordens dentro dos meus limites
                </label>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className='bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border border-red-200 dark:border-red-800'>
            <h2 className='text-lg font-semibold text-red-700 dark:text-red-300 mb-4'>
              Zona Perigosa
            </h2>
            <p className='text-sm text-red-600 dark:text-red-400 mb-4'>
              Esta ação não pode ser desfeita. Seu perfil será permanentemente deletado.
            </p>
            <button
              type='button'
              onClick={handleDeleteProfile}
              disabled={submitting}
              className='px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
            >
              <Trash2 className='w-4 h-4' />
              Deletar Perfil
            </button>
          </div>

          {/* Form Actions */}
          <div className='sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 -mx-4 -mb-8 flex gap-3 justify-end'>
            <button
              type='button'
              onClick={() => navigate(`/p2p/trader/${profile.id}`)}
              className='px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
            >
              Cancelar
            </button>
            <button
              type='submit'
              disabled={submitting}
              className='px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
            >
              {submitting && <Loader2 className='w-4 h-4 animate-spin' />}
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
