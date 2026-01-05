/**
 * 🛡️ HOLD Wallet - Admin Settings Page
 * =====================================
 *
 * Página de configurações do sistema.
 */

import React, { useEffect, useState } from 'react'
import {
  Settings,
  Save,
  RefreshCw,
  DollarSign,
  Percent,
  Shield,
  Bell,
  Mail,
  Database,
  Clock,
  AlertTriangle,
  CheckCircle,
  ToggleLeft,
} from 'lucide-react'

interface SystemSettings {
  // Trading
  trading_enabled: boolean
  min_trade_amount: number
  max_trade_amount: number
  trading_fee_percent: number

  // P2P
  p2p_enabled: boolean
  p2p_fee_percent: number
  escrow_timeout_hours: number
  max_open_orders_per_user: number

  // Security
  require_2fa_for_withdrawals: boolean
  require_email_verification: boolean
  max_login_attempts: number
  session_timeout_minutes: number

  // Notifications
  email_notifications_enabled: boolean
  admin_alert_email: string
}

export const AdminSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>({
    trading_enabled: true,
    min_trade_amount: 10,
    max_trade_amount: 50000,
    trading_fee_percent: 0.5,
    p2p_enabled: true,
    p2p_fee_percent: 0.3,
    escrow_timeout_hours: 24,
    max_open_orders_per_user: 5,
    require_2fa_for_withdrawals: true,
    require_email_verification: true,
    max_login_attempts: 5,
    session_timeout_minutes: 30,
    email_notifications_enabled: true,
    admin_alert_email: 'admin@holdwallet.com',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fetchSettings = async () => {
    try {
      setLoading(true)
      // API call here - mock data já está no state inicial
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch {
      console.error('Erro ao buscar configurações')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSave = async () => {
    try {
      setSaving(true)
      // API call here
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      console.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center'>
        <div className='text-center'>
          <RefreshCw className='w-8 h-8 animate-spin text-blue-500 mx-auto mb-4' />
          <p className='text-gray-600 dark:text-gray-400'>Carregando configurações...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-6'>
      {/* Header */}
      <div className='flex items-start justify-between mb-8'>
        <div>
          <div className='flex items-center gap-3 mb-2'>
            <Settings className='w-8 h-8 text-gray-600' />
            <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
              Configurações do Sistema
            </h1>
          </div>
          <p className='text-gray-600 dark:text-gray-400'>
            Gerencie as configurações globais da plataforma
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className='px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2'
        >
          {saving ? (
            <RefreshCw className='w-4 h-4 animate-spin' />
          ) : saved ? (
            <CheckCircle className='w-4 h-4' />
          ) : (
            <Save className='w-4 h-4' />
          )}
          {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar Alterações'}
        </button>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Trading Settings */}
        <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2'>
            <DollarSign className='w-5 h-5 text-green-600' />
            Configurações de Trading OTC
          </h2>
          <div className='space-y-6'>
            <div className='flex items-center justify-between'>
              <div>
                <span className='text-gray-900 dark:text-white font-medium'>Trading Ativo</span>
                <p className='text-sm text-gray-500'>Habilita/desabilita o trading OTC</p>
              </div>
              <button
                onClick={() => updateSetting('trading_enabled', !settings.trading_enabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.trading_enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.trading_enabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div>
              <label className='block text-sm text-gray-700 dark:text-gray-300 mb-2'>
                Valor Mínimo (USDT)
              </label>
              <input
                type='number'
                value={settings.min_trade_amount}
                onChange={e => updateSetting('min_trade_amount', Number(e.target.value))}
                className='w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white'
              />
            </div>
            <div>
              <label className='block text-sm text-gray-700 dark:text-gray-300 mb-2'>
                Valor Máximo (USDT)
              </label>
              <input
                type='number'
                value={settings.max_trade_amount}
                onChange={e => updateSetting('max_trade_amount', Number(e.target.value))}
                className='w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white'
              />
            </div>
            <div>
              <label className='block text-sm text-gray-700 dark:text-gray-300 mb-2'>
                Taxa de Trading (%)
              </label>
              <div className='relative'>
                <input
                  type='number'
                  step='0.1'
                  value={settings.trading_fee_percent}
                  onChange={e => updateSetting('trading_fee_percent', Number(e.target.value))}
                  className='w-full px-4 py-2 pr-10 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white'
                />
                <Percent className='absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
              </div>
            </div>
          </div>
        </div>

        {/* P2P Settings */}
        <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2'>
            <ToggleLeft className='w-5 h-5 text-purple-600' />
            Configurações P2P
          </h2>
          <div className='space-y-6'>
            <div className='flex items-center justify-between'>
              <div>
                <span className='text-gray-900 dark:text-white font-medium'>P2P Ativo</span>
                <p className='text-sm text-gray-500'>Habilita/desabilita o trading P2P</p>
              </div>
              <button
                onClick={() => updateSetting('p2p_enabled', !settings.p2p_enabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.p2p_enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.p2p_enabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <div>
              <label className='block text-sm text-gray-700 dark:text-gray-300 mb-2'>
                Taxa P2P (%)
              </label>
              <div className='relative'>
                <input
                  type='number'
                  step='0.1'
                  value={settings.p2p_fee_percent}
                  onChange={e => updateSetting('p2p_fee_percent', Number(e.target.value))}
                  className='w-full px-4 py-2 pr-10 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white'
                />
                <Percent className='absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
              </div>
            </div>
            <div>
              <label className='block text-sm text-gray-700 dark:text-gray-300 mb-2'>
                Timeout do Escrow (horas)
              </label>
              <div className='relative'>
                <input
                  type='number'
                  value={settings.escrow_timeout_hours}
                  onChange={e => updateSetting('escrow_timeout_hours', Number(e.target.value))}
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
                value={settings.max_open_orders_per_user}
                onChange={e => updateSetting('max_open_orders_per_user', Number(e.target.value))}
                className='w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white'
              />
            </div>
          </div>
        </div>

        {/* Security Settings */}
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
                  updateSetting(
                    'require_2fa_for_withdrawals',
                    !settings.require_2fa_for_withdrawals
                  )
                }
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.require_2fa_for_withdrawals
                    ? 'bg-green-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.require_2fa_for_withdrawals ? 'translate-x-7' : 'translate-x-1'
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
                  updateSetting('require_email_verification', !settings.require_email_verification)
                }
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.require_email_verification
                    ? 'bg-green-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.require_email_verification ? 'translate-x-7' : 'translate-x-1'
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
                value={settings.max_login_attempts}
                onChange={e => updateSetting('max_login_attempts', Number(e.target.value))}
                className='w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white'
              />
            </div>
            <div>
              <label className='block text-sm text-gray-700 dark:text-gray-300 mb-2'>
                Timeout da Sessão (minutos)
              </label>
              <input
                type='number'
                value={settings.session_timeout_minutes}
                onChange={e => updateSetting('session_timeout_minutes', Number(e.target.value))}
                className='w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white'
              />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2'>
            <Bell className='w-5 h-5 text-yellow-600' />
            Configurações de Notificações
          </h2>
          <div className='space-y-6'>
            <div className='flex items-center justify-between'>
              <div>
                <span className='text-gray-900 dark:text-white font-medium'>
                  Notificações por Email
                </span>
                <p className='text-sm text-gray-500'>Envia alertas por email</p>
              </div>
              <button
                onClick={() =>
                  updateSetting(
                    'email_notifications_enabled',
                    !settings.email_notifications_enabled
                  )
                }
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.email_notifications_enabled
                    ? 'bg-green-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.email_notifications_enabled ? 'translate-x-7' : 'translate-x-1'
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
                  value={settings.admin_alert_email}
                  onChange={e => updateSetting('admin_alert_email', e.target.value)}
                  className='w-full px-4 py-2 pl-10 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white'
                />
                <Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className='mt-6 bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
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
            <p className='text-lg font-semibold text-gray-900 dark:text-white'>04/01/2026</p>
          </div>
          <div className='p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
            <p className='text-sm text-gray-500'>Uptime</p>
            <p className='text-lg font-semibold text-gray-900 dark:text-white'>99.9%</p>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className='mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4'>
        <div className='flex items-start gap-3'>
          <AlertTriangle className='w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5' />
          <div>
            <h4 className='text-sm font-medium text-yellow-800 dark:text-yellow-200'>Atenção</h4>
            <p className='text-sm text-yellow-700 dark:text-yellow-300'>
              Alterações nas configurações podem afetar o funcionamento da plataforma. Tenha certeza
              antes de salvar as mudanças.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
