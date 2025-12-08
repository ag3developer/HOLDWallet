import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Info, AlertCircle } from 'lucide-react'
import { useP2POrder, useUpdateP2POrder } from '@/hooks/useP2POrders'
import { usePaymentMethods } from '@/hooks/usePaymentMethods'
import { toast } from 'react-hot-toast'

export const EditOrderPage = () => {
  const navigate = useNavigate()
  const { orderId } = useParams<{ orderId: string }>()

  const { data: orderData, isLoading: orderLoading } = useP2POrder(orderId!)
  const updateOrderMutation = useUpdateP2POrder()
  const { data: paymentMethodsData } = usePaymentMethods()

  // Form state
  const [price, setPrice] = useState('')
  const [amount, setAmount] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [timeLimit, setTimeLimit] = useState('30')
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<string[]>([])
  const [terms, setTerms] = useState('')
  const [autoReply, setAutoReply] = useState('')

  // Populate form with order data
  useEffect(() => {
    if (orderData) {
      setPrice(orderData.price || '')
      setAmount(orderData.amount?.toString() || '')
      setMinAmount(orderData.minAmount?.toString() || '')
      setMaxAmount(orderData.maxAmount?.toString() || '')
      setTimeLimit(orderData.timeLimit?.toString() || '30')
      setTerms(orderData.terms || '')
      setAutoReply(orderData.autoReply || '')
    }
  }, [orderData])

  const handlePaymentMethodToggle = (methodId: string) => {
    setSelectedPaymentMethods(prev =>
      prev.includes(methodId) ? prev.filter(id => id !== methodId) : [...prev, methodId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!price || !amount || !minAmount || !maxAmount) {
      toast.error('Por favor, preencha todos os campos obrigatórios')
      return
    }

    if (selectedPaymentMethods.length === 0) {
      toast.error('Selecione pelo menos um método de pagamento')
      return
    }

    try {
      const orderUpdate = {
        price,
        amount,
        min_amount: minAmount,
        max_amount: maxAmount,
        payment_methods: selectedPaymentMethods,
        time_limit: Number.parseInt(timeLimit),
        terms: terms || undefined,
        auto_reply: autoReply || undefined,
      }

      await updateOrderMutation.mutateAsync({ orderId: orderId!, updates: orderUpdate })

      toast.success('Ordem atualizada com sucesso!')
      navigate('/p2p/my-orders')
    } catch (error) {
      console.error('Error updating order:', error)
      toast.error('Erro ao atualizar ordem')
    }
  }

  if (orderLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4'></div>
          <p className='text-gray-600 dark:text-gray-400'>Carregando ordem...</p>
        </div>
      </div>
    )
  }

  if (!orderData) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <div className='text-center'>
          <AlertCircle className='w-12 h-12 text-red-600 mx-auto mb-4' />
          <p className='text-gray-600 dark:text-gray-400'>Ordem não encontrada</p>
          <button
            onClick={() => navigate('/p2p/my-orders')}
            className='mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
          >
            Voltar às Minhas Ordens
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 py-8'>
      <div className='max-w-2xl mx-auto px-4'>
        {/* Header */}
        <div className='flex items-center gap-4 mb-6'>
          <button
            onClick={() => navigate('/p2p/my-orders')}
            title='Voltar'
            className='p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition'
          >
            <ArrowLeft className='w-6 h-6' />
          </button>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>Editar Ordem</h1>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 space-y-6'
        >
          {/* Info Alert */}
          <div className='flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800'>
            <Info className='w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5' />
            <p className='text-sm text-blue-700 dark:text-blue-300'>
              Você está editando a ordem <strong>{orderData?.coin}</strong> criada em{' '}
              {new Date(orderData?.createdAt || '').toLocaleDateString('pt-BR')}
            </p>
          </div>

          {/* Preço */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              Preço ({orderData?.fiatCurrency || 'BRL'})
            </label>
            <input
              type='number'
              step='0.01'
              value={price}
              onChange={e => setPrice(e.target.value)}
              className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              placeholder='Preço por unidade'
            />
          </div>

          {/* Quantidade */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              Quantidade ({orderData?.coin || 'BTC'})
            </label>
            <input
              type='number'
              step='0.00000001'
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              placeholder='Quantidade total'
            />
          </div>

          {/* Limites Min/Max */}
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Valor Mínimo ({orderData?.fiatCurrency || 'BRL'})
              </label>
              <input
                type='number'
                step='0.01'
                value={minAmount}
                onChange={e => setMinAmount(e.target.value)}
                className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                placeholder='0.00'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Valor Máximo ({orderData?.fiatCurrency || 'BRL'})
              </label>
              <input
                type='number'
                step='0.01'
                value={maxAmount}
                onChange={e => setMaxAmount(e.target.value)}
                className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                placeholder='0.00'
              />
            </div>
          </div>

          {/* Tempo Limite */}
          <div>
            <label
              htmlFor='timeLimit'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
            >
              Tempo Limite (minutos)
            </label>
            <select
              id='timeLimit'
              title='Selecione o tempo limite'
              value={timeLimit}
              onChange={e => setTimeLimit(e.target.value)}
              className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
            >
              <option value='15'>15 minutos</option>
              <option value='30'>30 minutos</option>
              <option value='45'>45 minutos</option>
              <option value='60'>1 hora</option>
              <option value='120'>2 horas</option>
            </select>
          </div>

          {/* Métodos de Pagamento */}
          <div>
            <label
              htmlFor='paymentMethods'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'
            >
              Métodos de Pagamento
            </label>
            <div id='paymentMethods' className='space-y-2'>
              {paymentMethodsData?.map((method: any) => (
                <label
                  key={method.id}
                  className='flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer'
                >
                  <input
                    type='checkbox'
                    checked={selectedPaymentMethods.includes(method.id.toString())}
                    onChange={() => handlePaymentMethodToggle(method.id.toString())}
                    className='w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500'
                  />
                  <span className='font-medium text-gray-900 dark:text-white uppercase'>
                    {method.type}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Termos */}
          <div>
            <label
              htmlFor='terms'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
            >
              Termos (opcional)
            </label>
            <textarea
              id='terms'
              value={terms}
              onChange={e => setTerms(e.target.value)}
              className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              placeholder='Ex: Não compre se for revender. Eu não aceito contas novas.'
              rows={3}
            />
          </div>

          {/* Resposta Automática */}
          <div>
            <label
              htmlFor='autoReply'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'
            >
              Resposta Automática (opcional)
            </label>
            <textarea
              id='autoReply'
              value={autoReply}
              onChange={e => setAutoReply(e.target.value)}
              className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              placeholder='Mensagem automática para compradores'
              rows={3}
            />
          </div>

          {/* Buttons */}
          <div className='flex gap-4'>
            <button
              type='button'
              onClick={() => navigate('/p2p/my-orders')}
              className='flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition'
            >
              Cancelar
            </button>
            <button
              type='submit'
              disabled={updateOrderMutation.isPending}
              className='flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {updateOrderMutation.isPending ? 'Salvando...' : 'Atualizar Ordem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
