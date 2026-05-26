/**
 * Admin Gateway - Saúde dos Webhooks
 * ===================================
 *
 * Visão agregada de entrega de webhooks por merchant.
 *
 * Para cada merchant com webhook_url configurada, mostra:
 * - Sent / Failed / Pending (na janela)
 * - Taxa de sucesso
 * - Último envio bem-sucedido
 * - Último erro (status code + mensagem)
 * - Botão para abrir a lista detalhada do merchant (onde é possível reenviar)
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  RefreshCw,
  Webhook,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  AlertTriangle,
  Activity,
  Filter,
  Building2,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  getWebhookHealth,
  type WebhookHealthMerchant,
  type WebhookHealthResponse,
} from '@/services/admin/adminGateway'

const formatDateTime = (iso?: string | null) => {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('pt-BR')
  } catch {
    return iso
  }
}

const formatRelative = (iso?: string | null) => {
  if (!iso) return 'Nunca'
  try {
    const ms = Date.now() - new Date(iso).getTime()
    const minutes = Math.floor(ms / 60000)
    if (minutes < 1) return 'Agora mesmo'
    if (minutes < 60) return `${minutes} min atrás`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h atrás`
    const days = Math.floor(hours / 24)
    return `${days}d atrás`
  } catch {
    return iso
  }
}

const getSuccessRateColor = (rate?: number | null) => {
  if (rate === null || rate === undefined) return 'text-gray-400'
  if (rate >= 95) return 'text-emerald-600 dark:text-emerald-400'
  if (rate >= 70) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-600 dark:text-red-400'
}

const AdminGatewayWebhooksHealthPage: React.FC = () => {
  const [data, setData] = useState<WebhookHealthResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [hoursBack, setHoursBack] = useState(168) // 7 dias por padrão
  const [hideHealthy, setHideHealthy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getWebhookHealth(hoursBack)
      setData(result)
    } catch (error) {
      console.error('Erro ao carregar saúde dos webhooks:', error)
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [hoursBack])

  useEffect(() => {
    load()
  }, [load])

  const merchants: WebhookHealthMerchant[] = (data?.merchants || []).filter(m =>
    hideHealthy ? m.total_failed > 0 || m.total_pending > 0 : true
  )

  return (
    <div className='p-6 max-w-7xl mx-auto'>
      {/* Header */}
      <div className='mb-6'>
        <div className='flex items-center justify-between mb-2'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2'>
              <Webhook className='w-6 h-6 text-indigo-600' />
              Saúde dos Webhooks
            </h1>
            <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
              Monitora a entrega de webhooks para cada merchant conectado
            </p>
          </div>
          <button
            type='button'
            onClick={load}
            disabled={loading}
            className='flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg transition-colors'
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
        {data && (
          <p className='text-xs text-gray-500 dark:text-gray-500'>
            Última verificação: {formatDateTime(data.checked_at)}
          </p>
        )}
      </div>

      {/* Summary */}
      {data && (
        <div className='grid grid-cols-2 md:grid-cols-5 gap-4 mb-6'>
          <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-lg'>
                <Building2 className='w-5 h-5 text-indigo-600 dark:text-indigo-400' />
              </div>
              <div>
                <p className='text-xs text-gray-600 dark:text-gray-400'>Merchants</p>
                <p className='text-xl font-bold text-gray-900 dark:text-white'>
                  {data.summary.total_merchants_with_webhook}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg'>
                <CheckCircle2 className='w-5 h-5 text-emerald-600 dark:text-emerald-400' />
              </div>
              <div>
                <p className='text-xs text-gray-600 dark:text-gray-400'>Entregues</p>
                <p className='text-xl font-bold text-gray-900 dark:text-white'>
                  {data.summary.total_sent}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-red-100 dark:bg-red-500/20 rounded-lg'>
                <XCircle className='w-5 h-5 text-red-600 dark:text-red-400' />
              </div>
              <div>
                <p className='text-xs text-gray-600 dark:text-gray-400'>Falhados</p>
                <p className='text-xl font-bold text-gray-900 dark:text-white'>
                  {data.summary.total_failed}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-yellow-100 dark:bg-yellow-500/20 rounded-lg'>
                <Clock className='w-5 h-5 text-yellow-600 dark:text-yellow-400' />
              </div>
              <div>
                <p className='text-xs text-gray-600 dark:text-gray-400'>Pendentes</p>
                <p className='text-xl font-bold text-gray-900 dark:text-white'>
                  {data.summary.total_pending}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4'>
            <div className='flex items-center gap-3'>
              <div className='p-2 bg-blue-100 dark:bg-blue-500/20 rounded-lg'>
                <Activity className='w-5 h-5 text-blue-600 dark:text-blue-400' />
              </div>
              <div>
                <p className='text-xs text-gray-600 dark:text-gray-400'>Taxa</p>
                <p
                  className={`text-xl font-bold ${getSuccessRateColor(data.summary.success_rate)}`}
                >
                  {data.summary.success_rate !== null && data.summary.success_rate !== undefined
                    ? `${data.summary.success_rate}%`
                    : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4'>
        <div className='flex flex-wrap gap-4 items-center'>
          <div className='flex items-center gap-2'>
            <Filter className='w-4 h-4 text-gray-500' />
            <label htmlFor='hoursBack' className='text-sm text-gray-700 dark:text-gray-300'>
              Janela:
            </label>
            <select
              id='hoursBack'
              value={hoursBack}
              onChange={e => setHoursBack(Number(e.target.value))}
              aria-label='Período de análise'
              className='px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
            >
              <option value={24}>24 horas</option>
              <option value={72}>3 dias</option>
              <option value={168}>7 dias</option>
              <option value={720}>30 dias</option>
            </select>
          </div>

          <label className='flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer'>
            <input
              type='checkbox'
              checked={hideHealthy}
              onChange={e => setHideHealthy(e.target.checked)}
              className='rounded'
            />
            Mostrar apenas com problemas
          </label>
        </div>
      </div>

      {/* Lista */}
      <div className='bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden'>
        {loading ? (
          <div className='p-12 text-center'>
            <RefreshCw className='w-8 h-8 animate-spin text-indigo-600 mx-auto mb-3' />
            <p className='text-gray-600 dark:text-gray-400'>Carregando...</p>
          </div>
        ) : merchants.length === 0 ? (
          <div className='p-12 text-center'>
            <CheckCircle2 className='w-12 h-12 text-emerald-500 mx-auto mb-3' />
            <p className='text-gray-700 dark:text-gray-300 font-medium'>
              {hideHealthy
                ? 'Nenhum merchant com problemas no momento!'
                : 'Nenhum merchant com webhook configurado.'}
            </p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead className='bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 text-left'>
                <tr>
                  <th className='px-4 py-3 font-medium'>Merchant</th>
                  <th className='px-4 py-3 font-medium'>URL</th>
                  <th className='px-4 py-3 font-medium text-center'>Entregues</th>
                  <th className='px-4 py-3 font-medium text-center'>Falhados</th>
                  <th className='px-4 py-3 font-medium text-center'>Pendentes</th>
                  <th className='px-4 py-3 font-medium text-center'>Taxa</th>
                  <th className='px-4 py-3 font-medium'>Último envio</th>
                  <th className='px-4 py-3 font-medium'>Último erro</th>
                  <th className='px-4 py-3 font-medium text-right'>Ações</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                {merchants.map(m => (
                  <tr key={m.merchant_id} className='hover:bg-gray-50 dark:hover:bg-gray-700/30'>
                    <td className='px-4 py-3'>
                      <div className='flex items-center gap-2'>
                        <Building2 className='w-4 h-4 text-gray-400' />
                        <div>
                          <p className='font-medium text-gray-900 dark:text-white'>
                            {m.merchant_name}
                          </p>
                          <p className='text-xs text-gray-500'>{m.merchant_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className='px-4 py-3'>
                      <span
                        className='text-xs text-gray-700 dark:text-gray-300 font-mono truncate max-w-[260px] inline-block'
                        title={m.webhook_url}
                      >
                        {m.webhook_url}
                      </span>
                    </td>
                    <td className='px-4 py-3 text-center'>
                      <span className='inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium'>
                        <CheckCircle2 className='w-3 h-3' />
                        {m.total_sent}
                      </span>
                    </td>
                    <td className='px-4 py-3 text-center'>
                      {m.total_failed > 0 ? (
                        <span className='inline-flex items-center gap-1 text-red-700 dark:text-red-400 font-medium'>
                          <XCircle className='w-3 h-3' />
                          {m.total_failed}
                        </span>
                      ) : (
                        <span className='text-gray-400'>0</span>
                      )}
                    </td>
                    <td className='px-4 py-3 text-center'>
                      {m.total_pending > 0 ? (
                        <span className='inline-flex items-center gap-1 text-yellow-700 dark:text-yellow-400 font-medium'>
                          <Clock className='w-3 h-3' />
                          {m.total_pending}
                        </span>
                      ) : (
                        <span className='text-gray-400'>0</span>
                      )}
                    </td>
                    <td className='px-4 py-3 text-center'>
                      <span className={`font-bold ${getSuccessRateColor(m.success_rate)}`}>
                        {m.success_rate !== null && m.success_rate !== undefined
                          ? `${m.success_rate}%`
                          : '-'}
                      </span>
                    </td>
                    <td className='px-4 py-3'>
                      <span className='text-xs text-gray-600 dark:text-gray-400'>
                        {formatRelative(m.last_sent_at)}
                      </span>
                    </td>
                    <td className='px-4 py-3'>
                      {m.last_error || m.last_error_code ? (
                        <div className='flex items-start gap-1'>
                          <AlertTriangle className='w-3 h-3 text-red-500 mt-0.5 flex-shrink-0' />
                          <div className='text-xs'>
                            {m.last_error_code && (
                              <span className='font-medium text-red-600 dark:text-red-400'>
                                HTTP {m.last_error_code}
                              </span>
                            )}
                            {m.last_error && (
                              <p
                                className='text-gray-500 truncate max-w-[200px]'
                                title={m.last_error}
                              >
                                {m.last_error}
                              </p>
                            )}
                            <p className='text-gray-400 text-[10px]'>
                              {formatRelative(m.last_failed_at)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className='text-gray-400 text-xs'>-</span>
                      )}
                    </td>
                    <td className='px-4 py-3 text-right'>
                      <Link
                        to={`/admin/gateway/merchant/${m.merchant_id}`}
                        className='inline-flex items-center gap-1 px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors'
                      >
                        <ExternalLink className='w-3 h-3' />
                        Detalhes
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className='mt-4 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-lg p-4'>
        <div className='flex gap-2'>
          <Webhook className='w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5' />
          <div className='text-sm text-indigo-800 dark:text-indigo-200'>
            <p className='font-medium mb-1'>Como funciona?</p>
            <ul className='list-disc list-inside space-y-0.5 text-indigo-700 dark:text-indigo-300'>
              <li>
                Um job automático <strong>reenvia webhooks FAILED a cada 60s</strong> com backoff
                exponencial (até 5 tentativas).
              </li>
              <li>
                A coluna <strong>Taxa</strong> mostra o percentual de webhooks entregues com sucesso
                na janela selecionada.
              </li>
              <li>
                Clique em <strong>Detalhes</strong> para ver o histórico individual de webhooks do
                merchant e reenviar manualmente.
              </li>
              <li>
                Se um merchant apresentar muitas falhas, verifique se a URL está correta e se eles
                estão validando a assinatura HMAC corretamente.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminGatewayWebhooksHealthPage
