import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, Loader2, AlertCircle } from 'lucide-react'
import { useTraderProfile } from '@/hooks/useTraderProfile'
import { TraderProfileCreate } from '@/services/traderProfileService'

export function TraderSetupPage() {
  const navigate = useNavigate()
  const { createProfile, loading, error } = useTraderProfile()
  const [formData, setFormData] = useState<TraderProfileCreate>({
    display_name: '',
    bio: '',
    avatar_url: '',
    min_order_amount: 100,
    max_order_amount: 50000,
    accepted_payment_methods: 'PIX,TED',
    auto_accept_orders: false,
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createProfile(formData)
      navigate('/p2p/trader-profile/edit')
    } catch (err) {
      console.error('Failed to create trader profile:', err)
    }
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      {/* Header */}
      <div className='bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10'>
        <div className='max-w-2xl mx-auto px-4 py-4 flex items-center gap-4'>
          <button
            onClick={() => navigate('/p2p')}
            className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
          >
            <ArrowLeft className='w-5 h-5 text-gray-700 dark:text-gray-300' />
          </button>
          <div>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
              Criar Perfil de Negociador
            </h1>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              Configure seu perfil profissional para começar a negociar
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className='max-w-2xl mx-auto px-4 py-8'>
        {/* Error Alert */}
        {error && (
          <div className='mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3'>
            <AlertCircle className='w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0' />
            <div>
              <p className='font-medium text-red-700 dark:text-red-300'>Erro</p>
              <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className='space-y-6'>
          {/* Basic Information */}
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
              Informações Básicas
            </h2>

            {/* Display Name */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Nome Profissional *
              </label>
              <input
                type='text'
                name='display_name'
                value={formData.display_name}
                onChange={handleInputChange}
                placeholder='Ex: João Trader'
                required
                className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>

            {/* Bio */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Bio / Descrição
              </label>
              <textarea
                name='bio'
                value={formData.bio}
                onChange={handleInputChange}
                placeholder='Fale um pouco sobre você e sua experiência...'
                rows={4}
                className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>

            {/* Avatar URL */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Foto / Avatar
              </label>
              <div className='flex gap-3'>
                <input
                  type='url'
                  name='avatar_url'
                  value={formData.avatar_url}
                  onChange={handleInputChange}
                  placeholder='https://exemplo.com/avatar.jpg'
                  className='flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
                <button
                  type='button'
                  className='px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2'
                >
                  <Upload className='w-4 h-4' />
                  Upload
                </button>
              </div>
            </div>
          </div>

          {/* Trading Preferences */}
          <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
              Preferências de Negociação
            </h2>

            {/* Order Limits */}
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  Pedido Mínimo (BRL)
                </label>
                <input
                  type='number'
                  name='min_order_amount'
                  value={formData.min_order_amount}
                  onChange={handleInputChange}
                  min='0'
                  className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  Pedido Máximo (BRL)
                </label>
                <input
                  type='number'
                  name='max_order_amount'
                  value={formData.max_order_amount}
                  onChange={handleInputChange}
                  min='0'
                  className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
            </div>

            {/* Payment Methods */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Métodos de Pagamento Aceitos *
              </label>
              <p className='text-xs text-gray-600 dark:text-gray-400 mb-3'>
                Separados por vírgula (ex: PIX,TED,DOC)
              </p>
              <input
                type='text'
                name='accepted_payment_methods'
                value={formData.accepted_payment_methods}
                onChange={handleInputChange}
                placeholder='PIX,TED,DOC'
                className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>

            {/* Auto Accept Orders */}
            <div className='flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg'>
              <input
                type='checkbox'
                name='auto_accept_orders'
                checked={formData.auto_accept_orders}
                onChange={handleInputChange}
                id='auto_accept'
                className='w-4 h-4 text-blue-600 rounded'
              />
              <label htmlFor='auto_accept' className='text-sm text-gray-700 dark:text-gray-300'>
                Auto-aceitar novos pedidos (quando seus limites forem atingidos)
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className='flex gap-3 sticky bottom-0 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg'>
            <button
              type='button'
              onClick={() => navigate('/p2p')}
              className='flex-1 px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
            >
              Cancelar
            </button>
            <button
              type='submit'
              disabled={loading}
              className='flex-1 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2'
            >
              {loading && <Loader2 className='w-4 h-4 animate-spin' />}
              {loading ? 'Criando...' : 'Criar Perfil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
