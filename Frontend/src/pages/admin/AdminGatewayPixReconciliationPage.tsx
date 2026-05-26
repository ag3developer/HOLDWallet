/**
 * Admin Gateway - Reconciliação PIX
 * ==================================
 *
 * Página para o admin Wolknow forçar a reconciliação de pagamentos PIX
 * que ficaram pendurados (webhook do BB falhou, demorou, etc).
 *
 * Recursos:
 * - Lista todos os PIX pendentes (PENDING/PROCESSING) de todos os merchants
 * - Mostra idade do pagamento, status, valor
 * - Botão "Reconciliar" para verificar status no BB e atualizar
 * - Botão "Reconciliar Tudo" que dispara uma rodada do job em batch
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Search,
  PlayCircle,
  Filter,
  Hourglass,
  Building2,
  Copy,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  getPendingPixPayments,
  forceReconcilePix,
  triggerPixReconciliationBatch,
  type PendingPixPayment,
} from '@/services/admin/adminGateway'

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)

const formatDateTime = (iso?: string) => {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('pt-BR')
  } catch {
    return iso
  }
}

const formatAge = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours < 24) return `${hours}h ${mins}min`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}

const AdminGatewayPixReconciliationPage: React.FC = () => {
  const [payments, setPayments] = useState<PendingPixPayment[]>([])
  const [loading, setLoading] = useState(false)
  const [batchRunning, setBatchRunning] = useState(false)
  const [reconcilingId, setReconcilingId] = useState<string | null>(null)
  const [hoursBack, setHoursBack] = useState(24)
  const [onlyOverdue, setOnlyOverdue] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [lastChecked, setLastChecked] = useState<string | null>(null)

  const loadPending = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPendingPixPayments({
        hours_back: hoursBack,
        only_overdue: onlyOverdue,
      })
      setPayments(data.items)
      setLastChecked(data.checked_at)
    } catch (error) {
      console.error('Erro ao carregar PIX pendentes:', error)
      toast.error('Erro ao carregar pagamentos pendentes')
    } finally {
      setLoading(false)
    }
  }, [hoursBack, onlyOverdue])

  useEffect(() => {
    loadPending()
  }, [loadPending])

  const handleReconcileOne = async (payment: PendingPixPayment) => {
    setReconcilingId(payment.payment_id)
    try {
      const result = await forceReconcilePix(payment.payment_id)

      if (result.success) {
        toast.success(`Pagamento confirmado! Novo status: ${result.new_status || 'CONFIRMED'}`)
        // Remove da lista (já foi confirmado)
        setPayments(prev => prev.filter(p => p.payment_id !== payment.payment_id))
      } else if (result.bb_pago === false) {
        toast(
          `Banco do Brasil ainda não confirma o pagamento. Status BB: ${
            result.bb_status || 'desconhecido'
          }`,
          { icon: 'ℹ️' }
        )
      } else {
        toast(result.message || 'Não foi possível reconciliar', { icon: '⚠️' })
      }
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Erro ao reconciliar pagamento'
      toast.error(msg)
    } finally {
      setReconcilingId(null)
    }
  }

  const handleReconcileBatch = async () => {
    if (
      !globalThis.confirm(
        'Disparar reconciliação em lote de TODOS os PIX pendentes? Isso pode demorar alguns segundos.'
      )
    ) {
      return
    }

    setBatchRunning(true)
    try {
      const result = await triggerPixReconciliationBatch()
      const { stats } = result
      toast.success(
        `Reconciliação concluída: ${stats.confirmed} confirmados, ${stats.checked} verificados, ${stats.errors} erros`
      )
      // Recarrega a lista
      await loadPending()
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Erro na reconciliação em lote'
      toast.error(msg)
    } finally {
      setBatchRunning(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copiado!')
  }

  const filteredPayments = payments.filter(p => {
    if (!searchTerm) return true
    const q = searchTerm.toLowerCase()
    return (
      p.payment_id.toLowerCase().includes(q) ||
      p.merchant_name?.toLowerCase().includes(q) ||
      p.merchant_code?.toLowerCase().includes(q) ||
      p.customer_email?.toLowerCase().includes(q) ||
      p.pix_txid?.toLowerCase().includes(q)
    )
  })

  const overdueCount = payments.filter(p => p.age_minutes > 30).length
  const expiredCount = payments.filter(p => p.is_expired).length

  return (
    <div className='p-6 max-w-7xl mx-auto'>
      {/* Header */}
      <div className='mb-6'>
        <div className='flex items-center justify-between mb-2'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2'>
              <RefreshCw className='w-6 h-6 text-blue-600' />
              Reconciliação PIX
            </h1>
            <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
              Verifica manualmente pagamentos PIX no Banco do Brasil quando o webhook falha
            </p>
          </div>
          <button
            onClick={handleReconcileBatch}
            disabled={batchRunning || loading}
            className='flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors'
          >
            {batchRunning ? (
              <>
                <RefreshCw className='w-4 h-4 animate-spin' />
                Executando...
              </>
            ) : (
              <>
                <PlayCircle className='w-4 h-4' />
                Reconciliar Todos
              </>
            )}
          </button>
        </div>
        {lastChecked && (
          <p className='text-xs text-gray-500 dark:text-gray-500'>
            Última verificação: {formatDateTime(lastChecked)}
          </p>
        )}
      </div>

      {/* Summary cards */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'>
        <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg'>
              <Clock className='w-5 h-5 text-blue-600 dark:text-blue-400' />
            </div>
            <div>
              <p className='text-sm text-gray-600 dark:text-gray-400'>Total Pendentes</p>
              <p className='text-2xl font-bold text-gray-900 dark:text-white'>{payments.length}</p>
            </div>
          </div>
        </div>

        <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-orange-100 dark:bg-orange-500/20 rounded-lg'>
              <Hourglass className='w-5 h-5 text-orange-600 dark:text-orange-400' />
            </div>
            <div>
              <p className='text-sm text-gray-600 dark:text-gray-400'>Atrasados (&gt; 30min)</p>
              <p className='text-2xl font-bold text-gray-900 dark:text-white'>{overdueCount}</p>
            </div>
          </div>
        </div>

        <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-red-100 dark:bg-red-500/20 rounded-lg'>
              <AlertCircle className='w-5 h-5 text-red-600 dark:text-red-400' />
            </div>
            <div>
              <p className='text-sm text-gray-600 dark:text-gray-400'>Já Expirados</p>
              <p className='text-2xl font-bold text-gray-900 dark:text-white'>{expiredCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4'>
        <div className='flex flex-wrap gap-3 items-center'>
          <div className='flex items-center gap-2'>
            <Filter className='w-4 h-4 text-gray-500' />
            <label className='text-sm text-gray-700 dark:text-gray-300'>Últimas</label>
            <select
              value={hoursBack}
              onChange={e => setHoursBack(Number(e.target.value))}
              title='Período de análise'
              aria-label='Período de análise'
              className='px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
            >
              <option value={1}>1 hora</option>
              <option value={6}>6 horas</option>
              <option value={24}>24 horas</option>
              <option value={72}>3 dias</option>
              <option value={168}>7 dias</option>
            </select>
          </div>

          <label className='flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer'>
            <input
              type='checkbox'
              checked={onlyOverdue}
              onChange={e => setOnlyOverdue(e.target.checked)}
              className='rounded'
            />
            Apenas atrasados (&gt; 30 min)
          </label>

          <div className='flex-1 min-w-[200px] relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
            <input
              type='text'
              placeholder='Buscar por ID, merchant, email, TXID...'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className='w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
            />
          </div>

          <button
            onClick={loadPending}
            disabled={loading}
            className='flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden'>
        {loading ? (
          <div className='p-12 text-center'>
            <RefreshCw className='w-8 h-8 animate-spin text-blue-600 mx-auto mb-3' />
            <p className='text-gray-600 dark:text-gray-400'>Carregando...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className='p-12 text-center'>
            <CheckCircle2 className='w-12 h-12 text-emerald-500 mx-auto mb-3' />
            <p className='text-gray-700 dark:text-gray-300 font-medium'>Nenhum PIX pendente!</p>
            <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
              Todos os pagamentos PIX recentes foram confirmados.
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead className='bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 text-left'>
                <tr>
                  <th className='px-4 py-3 font-medium'>Merchant</th>
                  <th className='px-4 py-3 font-medium'>Payment ID</th>
                  <th className='px-4 py-3 font-medium'>Cliente</th>
                  <th className='px-4 py-3 font-medium text-right'>Valor</th>
                  <th className='px-4 py-3 font-medium'>Idade</th>
                  <th className='px-4 py-3 font-medium'>Status</th>
                  <th className='px-4 py-3 font-medium text-right'>Ações</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                {filteredPayments.map(payment => (
                  <tr
                    key={payment.payment_id}
                    className='hover:bg-gray-50 dark:hover:bg-gray-700/30'
                  >
                    <td className='px-4 py-3'>
                      <div className='flex items-center gap-2'>
                        <Building2 className='w-4 h-4 text-gray-400' />
                        <div>
                          <p className='font-medium text-gray-900 dark:text-white'>
                            {payment.merchant_name}
                          </p>
                          <p className='text-xs text-gray-500'>{payment.merchant_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className='px-4 py-3'>
                      <div className='flex items-center gap-1'>
                        <code className='text-xs text-gray-700 dark:text-gray-300'>
                          {payment.payment_id.slice(0, 12)}...
                        </code>
                        <button
                          onClick={() => copyToClipboard(payment.payment_id)}
                          className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                          title='Copiar ID completo'
                        >
                          <Copy className='w-3 h-3' />
                        </button>
                      </div>
                      {payment.pix_txid && (
                        <p className='text-xs text-gray-500 mt-0.5'>
                          TXID: {payment.pix_txid.slice(0, 10)}...
                        </p>
                      )}
                    </td>
                    <td className='px-4 py-3'>
                      <p className='text-gray-900 dark:text-white'>
                        {payment.customer_name || '-'}
                      </p>
                      {payment.customer_email && (
                        <p className='text-xs text-gray-500'>{payment.customer_email}</p>
                      )}
                    </td>
                    <td className='px-4 py-3 text-right font-medium text-gray-900 dark:text-white'>
                      {formatBRL(payment.amount)}
                    </td>
                    <td className='px-4 py-3'>
                      <span
                        className={`inline-flex items-center gap-1 text-xs ${
                          payment.age_minutes > 30
                            ? 'text-orange-600 dark:text-orange-400 font-medium'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <Clock className='w-3 h-3' />
                        {formatAge(payment.age_minutes)}
                      </span>
                    </td>
                    <td className='px-4 py-3'>
                      {payment.is_expired ? (
                        <span className='inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'>
                          <AlertCircle className='w-3 h-3' />
                          Expirado
                        </span>
                      ) : (
                        <span className='inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'>
                          <Clock className='w-3 h-3' />
                          {payment.status}
                        </span>
                      )}
                    </td>
                    <td className='px-4 py-3 text-right'>
                      <button
                        onClick={() => handleReconcileOne(payment)}
                        disabled={reconcilingId === payment.payment_id || !payment.pix_txid}
                        className='inline-flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded transition-colors'
                      >
                        {reconcilingId === payment.payment_id ? (
                          <>
                            <RefreshCw className='w-3 h-3 animate-spin' />
                            Verificando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className='w-3 h-3' />
                            Reconciliar
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className='mt-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4'>
        <div className='flex gap-2'>
          <AlertCircle className='w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5' />
          <div className='text-sm text-blue-800 dark:text-blue-200'>
            <p className='font-medium mb-1'>Como funciona?</p>
            <ul className='list-disc list-inside space-y-0.5 text-blue-700 dark:text-blue-300'>
              <li>
                Um job automático roda a cada 2 minutos verificando todos os PIX pendentes no Banco
                do Brasil.
              </li>
              <li>
                Use <strong>Reconciliar</strong> para forçar a verificação imediata de um pagamento
                específico.
              </li>
              <li>
                Use <strong>Reconciliar Todos</strong> para disparar uma rodada completa do job
                manualmente.
              </li>
              <li>
                Pagamentos já confirmados pelo BB são automaticamente movidos para o status{' '}
                <code>CONFIRMED</code> e <code>COMPLETED</code>.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminGatewayPixReconciliationPage
