/**
 * 🛡️ HOLD Wallet - Admin Settings Page
 * =====================================
 *
 * Página de configurações do sistema com integração real ao backend.
 * Usa React Query para cache e performance.
 */

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Settings,
  Save,
  DollarSign,
  Percent,
  Shield,
  Bell,
  Mail,
  Database,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Wallet,
  ArrowRightLeft,
  Users,
  Loader2,
} from 'lucide-react'
import { apiClient } from '@/services/api'

// Interfaces baseadas no backend
interface FeesSettings {
  otc_spread_percentage: number
  network_fee_percentage: number
  p2p_fee_percentage: number
}

interface LimitsSettings {
  daily_limit_brl: number
  transaction_limit_brl: number
  p2p_min_order_brl: number
  p2p_max_order_brl: number
}

interface LocalSettings {
  // Security
  require_2fa_for_withdrawals: boolean
  require_email_verification: boolean
  max_login_attempts: number
  session_timeout_minutes: number

  // Trading Toggles
  trading_enabled: boolean
  p2p_enabled: boolean
  escrow_timeout_hours: number
  max_open_orders_per_user: number

  // Notifications
  email_notifications_enabled: boolean
  admin_alert_email: string
}

// Fetch das taxas do backend
const fetchFees = async (): Promise<FeesSettings> => {
  const { data } = await apiClient.get('/admin/settings/fees')
  return data.data
}

// Fetch dos limites do backend
const fetchLimits = async (): Promise<LimitsSettings> => {
  const { data } = await apiClient.get('/admin/settings/limits')
  return data.data
}

// Atualizar taxas no backend
const updateFees = async (fees: Partial<FeesSettings>): Promise<void> => {
  await apiClient.put('/admin/settings/fees', fees)
}

// Atualizar limites no backend
const updateLimits = async (limits: Partial<LimitsSettings>): Promise<void> => {
  await apiClient.put('/admin/settings/limits', limits)
}

export const AdminSettingsPage: React.FC = () => {
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(false)
  const [savingFees, setSavingFees] = useState(false)
  const [savingLimits, setSavingLimits] = useState(false)

  // Local settings (não vão ao backend por enquanto)
  const [localSettings, setLocalSettings] = useState<LocalSettings>({
    require_2fa_for_withdrawals: true,
    require_email_verification: true,
    max_login_attempts: 5,
    session_timeout_minutes: 30,
    trading_enabled: true,
    p2p_enabled: true,
    escrow_timeout_hours: 24,
    max_open_orders_per_user: 5,
    email_notifications_enabled: true,
    admin_alert_email: 'admin@holdwallet.com',
  })

  // Query para taxas com cache
  const {
    data: fees,
    isLoading: loadingFees,
    error: feesError,
  } = useQuery({
    queryKey: ['admin-settings-fees'],
    queryFn: fetchFees,
    staleTime: 60000, // 1 minuto
    gcTime: 300000, // 5 minutos
    retry: 2,
  })

  // Query para limites com cache
  const {
    data: limits,
    isLoading: loadingLimits,
    error: limitsError,
  } = useQuery({
    queryKey: ['admin-settings-limits'],
    queryFn: fetchLimits,
    staleTime: 60000,
    gcTime: 300000,
    retry: 2,
  })

  // Estado local para edição de taxas
  const [editedFees, setEditedFees] = useState<FeesSettings | null>(null)
  const [editedLimits, setEditedLimits] = useState<LimitsSettings | null>(null)

  // Atualiza estado local quando os dados do servidor chegam
  useEffect(() => {
    if (fees && !editedFees) {
      setEditedFees(fees)
    }
  }, [fees, editedFees])

  useEffect(() => {
    if (limits && !editedLimits) {
      setEditedLimits(limits)
    }
  }, [limits, editedLimits])

  // Mutations para salvar
  const feesMutation = useMutation({
    mutationFn: updateFees,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings-fees'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const limitsMutation = useMutation({
    mutationFn: updateLimits,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings-limits'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  // Handler para salvar taxas
  const handleSaveFees = async () => {
    if (!editedFees) return
    setSavingFees(true)
    try {
      await feesMutation.mutateAsync(editedFees)
    } finally {
      setSavingFees(false)
    }
  }

  // Handler para salvar limites
  const handleSaveLimits = async () => {
    if (!editedLimits) return
    setSavingLimits(true)
    try {
      await limitsMutation.mutateAsync(editedLimits)
    } finally {
      setSavingLimits(false)
    }
  }

  // Handler para salvar tudo
  const handleSaveAll = async () => {
    await Promise.all([editedFees && handleSaveFees(), editedLimits && handleSaveLimits()])
  }

  const updateFeeField = (field: keyof FeesSettings, value: number) => {
    setEditedFees(prev => (prev ? { ...prev, [field]: value } : null))
  }

  const updateLimitField = (field: keyof LimitsSettings, value: number) => {
    setEditedLimits(prev => (prev ? { ...prev, [field]: value } : null))
  }

  const updateLocalSetting = <K extends keyof LocalSettings>(key: K, value: LocalSettings[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
  }

  const loading = loadingFees || loadingLimits

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center'>
        <div className='text-center'>
          <Loader2 className='w-8 h-8 animate-spin text-blue-500 mx-auto mb-4' />
          <p className='text-gray-600 dark:text-gray-400'>Carregando configurações...</p>
        </div>
      </div>
    )
  }

  if (feesError || limitsError) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center'>
        <div className='text-center'>
          <AlertTriangle className='w-8 h-8 text-red-500 mx-auto mb-4' />
          <p className='text-red-600 dark:text-red-400'>Erro ao carregar configurações</p>
          <button
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['admin-settings-fees'] })
              queryClient.invalidateQueries({ queryKey: ['admin-settings-limits'] })
            }}
            className='mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen'>
      {/* Header */}
      <div className='flex items-start justify-between'>
        <div>
          <div className='flex items-center gap-3 mb-2'>
            <Settings className='w-8 h-8 text-gray-600' />
            <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
              Configurações do Sistema
            </h1>
          </div>
          <p className='text-gray-600 dark:text-gray-400'>
            Gerencie taxas, limites e configurações globais da plataforma
          </p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={savingFees || savingLimits}
          className='px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2'
        >
          {savingFees || savingLimits ? (
            <Loader2 className='w-4 h-4 animate-spin' />
          ) : saved ? (
            <CheckCircle className='w-4 h-4' />
          ) : (
            <Save className='w-4 h-4' />
          )}
          {savingFees || savingLimits ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar Tudo'}
        </button>
      </div>

      {/* Fees Summary Cards */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <div className='bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-white/20 rounded-lg'>
              <TrendingUp className='w-5 h-5' />
            </div>
            <div>
              <p className='text-sm text-green-100'>OTC Spread</p>
              <p className='text-2xl font-bold'>{editedFees?.otc_spread_percentage || 0}%</p>
            </div>
          </div>
        </div>
        <div className='bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-white/20 rounded-lg'>
              <Users className='w-5 h-5' />
            </div>
            <div>
              <p className='text-sm text-blue-100'>Taxa P2P</p>
              <p className='text-2xl font-bold'>{editedFees?.p2p_fee_percentage || 0}%</p>
            </div>
          </div>
        </div>
        <div className='bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white'>
          <div className='flex items-center gap-3'>
            <div className='p-2 bg-white/20 rounded-lg'>
              <Wallet className='w-5 h-5' />
            </div>
            <div>
              <p className='text-sm text-purple-100'>Taxa de Rede</p>
              <p className='text-2xl font-bold'>{editedFees?.network_fee_percentage || 0}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* ========== TAXAS DO SISTEMA ========== */}
        <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
              <Percent className='w-5 h-5 text-green-600' />
              Taxas do Sistema
            </h2>
            <button
              onClick={handleSaveFees}
              disabled={savingFees}
              className='px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1'
            >
              {savingFees ? (
                <Loader2 className='w-3 h-3 animate-spin' />
              ) : (
                <Save className='w-3 h-3' />
              )}
              Salvar Taxas
            </button>
          </div>

          <div className='space-y-5'>
            {/* OTC Spread */}
            <div className='p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800'>
              <label className='block text-sm font-medium text-green-800 dark:text-green-300 mb-2'>
                OTC Spread (%)
              </label>
              <p className='text-xs text-green-600 dark:text-green-400 mb-2'>
                Spread aplicado nas transações OTC (compra/venda de cripto). Padrão: 3%
              </p>
              <div className='relative'>
                <input
                  type='number'
                  step='0.1'
                  min='0'
                  max='10'
                  value={editedFees?.otc_spread_percentage || 0}
                  onChange={e => updateFeeField('otc_spread_percentage', Number(e.target.value))}
                  className='w-full px-4 py-2 pr-10 border border-green-300 dark:border-green-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white'
                />
                <Percent className='absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500' />
              </div>
            </div>

            {/* P2P Fee */}
            <div className='p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800'>
              <label className='block text-sm font-medium text-blue-800 dark:text-blue-300 mb-2'>
                Taxa P2P (%)
              </label>
              <p className='text-xs text-blue-600 dark:text-blue-400 mb-2'>
                Comissão cobrada em cada transação P2P concluída. Padrão: 0.5%
              </p>
              <div className='relative'>
                <input
                  type='number'
                  step='0.1'
                  min='0'
                  max='5'
                  value={editedFees?.p2p_fee_percentage || 0}
                  onChange={e => updateFeeField('p2p_fee_percentage', Number(e.target.value))}
                  className='w-full px-4 py-2 pr-10 border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white'
                />
                <Percent className='absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500' />
              </div>
            </div>

            {/* Network Fee */}
            <div className='p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800'>
              <label className='block text-sm font-medium text-purple-800 dark:text-purple-300 mb-2'>
                Taxa de Rede/Saque (%)
              </label>
              <p className='text-xs text-purple-600 dark:text-purple-400 mb-2'>
                Taxa cobrada em saques e transferências de rede. Padrão: 0.25%
              </p>
              <div className='relative'>
                <input
                  type='number'
                  step='0.05'
                  min='0'
                  max='5'
                  value={editedFees?.network_fee_percentage || 0}
                  onChange={e => updateFeeField('network_fee_percentage', Number(e.target.value))}
                  className='w-full px-4 py-2 pr-10 border border-purple-300 dark:border-purple-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white'
                />
                <Percent className='absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500' />
              </div>
            </div>
          </div>
        </div>

        {/* ========== LIMITES ========== */}
        <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
          <div className='flex items-center justify-between mb-6'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
              <DollarSign className='w-5 h-5 text-yellow-600' />
              Limites de Transação
            </h2>
            <button
              onClick={handleSaveLimits}
              disabled={savingLimits}
              className='px-3 py-1.5 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center gap-1'
            >
              {savingLimits ? (
                <Loader2 className='w-3 h-3 animate-spin' />
              ) : (
                <Save className='w-3 h-3' />
              )}
              Salvar Limites
            </button>
          </div>

          <div className='space-y-5'>
            {/* Daily Limit */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Limite Diário (BRL)
              </label>
              <p className='text-xs text-gray-500 mb-2'>
                Valor máximo que um usuário pode transacionar por dia
              </p>
              <div className='relative'>
                <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-500'>R$</span>
                <input
                  type='number'
                  step='1000'
                  min='0'
                  value={editedLimits?.daily_limit_brl || 0}
                  onChange={e => updateLimitField('daily_limit_brl', Number(e.target.value))}
                  className='w-full px-4 py-2 pl-10 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white'
                />
              </div>
            </div>

            {/* Transaction Limit */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Limite por Transação (BRL)
              </label>
              <p className='text-xs text-gray-500 mb-2'>
                Valor máximo permitido em uma única transação
              </p>
              <div className='relative'>
                <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-500'>R$</span>
                <input
                  type='number'
                  step='500'
                  min='0'
                  value={editedLimits?.transaction_limit_brl || 0}
                  onChange={e => updateLimitField('transaction_limit_brl', Number(e.target.value))}
                  className='w-full px-4 py-2 pl-10 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white'
                />
              </div>
            </div>

            {/* P2P Min Order */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Ordem P2P Mínima (BRL)
              </label>
              <p className='text-xs text-gray-500 mb-2'>Valor mínimo para criar uma ordem P2P</p>
              <div className='relative'>
                <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-500'>R$</span>
                <input
                  type='number'
                  step='10'
                  min='0'
                  value={editedLimits?.p2p_min_order_brl || 0}
                  onChange={e => updateLimitField('p2p_min_order_brl', Number(e.target.value))}
                  className='w-full px-4 py-2 pl-10 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white'
                />
              </div>
            </div>

            {/* P2P Max Order */}
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Ordem P2P Máxima (BRL)
              </label>
              <p className='text-xs text-gray-500 mb-2'>Valor máximo permitido em uma ordem P2P</p>
              <div className='relative'>
                <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-500'>R$</span>
                <input
                  type='number'
                  step='1000'
                  min='0'
                  value={editedLimits?.p2p_max_order_brl || 0}
                  onChange={e => updateLimitField('p2p_max_order_brl', Number(e.target.value))}
                  className='w-full px-4 py-2 pl-10 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white'
                />
              </div>
            </div>
          </div>
        </div>

        {/* ========== CONFIGURAÇÕES DE TRADING ========== */}
        <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2'>
            <ArrowRightLeft className='w-5 h-5 text-indigo-600' />
            Configurações de Trading
          </h2>
          <div className='space-y-6'>
            <div className='flex items-center justify-between'>
              <div>
                <span className='text-gray-900 dark:text-white font-medium'>Trading OTC Ativo</span>
                <p className='text-sm text-gray-500'>Habilita/desabilita o trading OTC</p>
              </div>
              <button
                onClick={() =>
                  updateLocalSetting('trading_enabled', !localSettings.trading_enabled)
                }
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  localSettings.trading_enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    localSettings.trading_enabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className='flex items-center justify-between'>
              <div>
                <span className='text-gray-900 dark:text-white font-medium'>P2P Ativo</span>
                <p className='text-sm text-gray-500'>Habilita/desabilita o trading P2P</p>
              </div>
              <button
                onClick={() => updateLocalSetting('p2p_enabled', !localSettings.p2p_enabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  localSettings.p2p_enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    localSettings.p2p_enabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div>
              <label className='block text-sm text-gray-700 dark:text-gray-300 mb-2'>
                Timeout do Escrow (horas)
              </label>
              <div className='relative'>
                <input
                  type='number'
                  value={localSettings.escrow_timeout_hours}
                  onChange={e => updateLocalSetting('escrow_timeout_hours', Number(e.target.value))}
                  className='w-full px-4 py-2 pr-10 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white'
                />
                <Clock className='absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
              </div>
            </div>
            <div>
              <label className='block text-sm text-gray-700 dark:text-gray-300 mb-2'>
                Máximo de Ordens Abertas por Usuário
              </label>
              <input
                type='number'
                value={localSettings.max_open_orders_per_user}
                onChange={e =>
                  updateLocalSetting('max_open_orders_per_user', Number(e.target.value))
                }
                className='w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white'
              />
            </div>
          </div>
        </div>

        {/* ========== SEGURANÇA ========== */}
        <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2'>
            <Shield className='w-5 h-5 text-red-600' />
            Configurações de Segurança
          </h2>
          <div className='space-y-6'>
            <div className='flex items-center justify-between'>
              <div>
                <span className='text-gray-900 dark:text-white font-medium'>
                  2FA Obrigatório para Saques
                </span>
                <p className='text-sm text-gray-500'>Exige 2FA para todas as retiradas</p>
              </div>
              <button
                onClick={() =>
                  updateLocalSetting(
                    'require_2fa_for_withdrawals',
                    !localSettings.require_2fa_for_withdrawals
                  )
                }
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  localSettings.require_2fa_for_withdrawals
                    ? 'bg-green-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    localSettings.require_2fa_for_withdrawals ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div className='flex items-center justify-between'>
              <div>
                <span className='text-gray-900 dark:text-white font-medium'>
                  Verificação de Email
                </span>
                <p className='text-sm text-gray-500'>Obriga verificação de email no registro</p>
              </div>
              <button
                onClick={() =>
                  updateLocalSetting(
                    'require_email_verification',
                    !localSettings.require_email_verification
                  )
                }
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  localSettings.require_email_verification
                    ? 'bg-green-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    localSettings.require_email_verification ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div>
              <label className='block text-sm text-gray-700 dark:text-gray-300 mb-2'>
                Máximo de Tentativas de Login
              </label>
              <input
                type='number'
                value={localSettings.max_login_attempts}
                onChange={e => updateLocalSetting('max_login_attempts', Number(e.target.value))}
                className='w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white'
              />
            </div>
            <div>
              <label className='block text-sm text-gray-700 dark:text-gray-300 mb-2'>
                Timeout da Sessão (minutos)
              </label>
              <input
                type='number'
                value={localSettings.session_timeout_minutes}
                onChange={e =>
                  updateLocalSetting('session_timeout_minutes', Number(e.target.value))
                }
                className='w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white'
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========== NOTIFICAÇÕES ========== */}
      <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
        <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2'>
          <Bell className='w-5 h-5 text-yellow-600' />
          Configurações de Notificações
        </h2>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div className='flex items-center justify-between'>
            <div>
              <span className='text-gray-900 dark:text-white font-medium'>
                Notificações por Email
              </span>
              <p className='text-sm text-gray-500'>Envia alertas por email</p>
            </div>
            <button
              onClick={() =>
                updateLocalSetting(
                  'email_notifications_enabled',
                  !localSettings.email_notifications_enabled
                )
              }
              className={`relative w-12 h-6 rounded-full transition-colors ${
                localSettings.email_notifications_enabled
                  ? 'bg-green-500'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  localSettings.email_notifications_enabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          <div>
            <label className='block text-sm text-gray-700 dark:text-gray-300 mb-2'>
              Email de Alertas do Admin
            </label>
            <div className='relative'>
              <input
                type='email'
                value={localSettings.admin_alert_email}
                onChange={e => updateLocalSetting('admin_alert_email', e.target.value)}
                className='w-full px-4 py-2 pl-10 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white'
              />
              <Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
            </div>
          </div>
        </div>
      </div>

      {/* ========== INFO DO SISTEMA ========== */}
      <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
        <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2'>
          <Database className='w-5 h-5 text-blue-600' />
          Informações do Sistema
        </h2>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
          <div className='p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
            <p className='text-sm text-gray-500'>Versão</p>
            <p className='text-lg font-semibold text-gray-900 dark:text-white'>1.0.0</p>
          </div>
          <div className='p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
            <p className='text-sm text-gray-500'>Ambiente</p>
            <p className='text-lg font-semibold text-green-600'>Produção</p>
          </div>
          <div className='p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
            <p className='text-sm text-gray-500'>Última Atualização</p>
            <p className='text-lg font-semibold text-gray-900 dark:text-white'>
              {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>
          <div className='p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
            <p className='text-sm text-gray-500'>Uptime</p>
            <p className='text-lg font-semibold text-gray-900 dark:text-white'>99.9%</p>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4'>
        <div className='flex items-start gap-3'>
          <AlertTriangle className='w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5' />
          <div>
            <h4 className='text-sm font-medium text-yellow-800 dark:text-yellow-200'>Atenção</h4>
            <p className='text-sm text-yellow-700 dark:text-yellow-300'>
              Alterações nas taxas e limites afetam imediatamente todos os usuários da plataforma.
              As taxas são aplicadas em novas transações. Certifique-se antes de salvar.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
