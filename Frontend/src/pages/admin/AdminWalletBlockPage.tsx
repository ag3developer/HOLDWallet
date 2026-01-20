/**
 * HOLD Wallet - Admin Wallet Block Page
 * ======================================
 *
 * Pagina dedicada para gerenciar bloqueios e restricoes de uma wallet.
 * Substituiu o modal anterior para melhor UX em dispositivos moveis.
 */

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  ArrowLeft,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Unlock,
  Ban,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Mail,
  RefreshCw,
  Loader2,
  TrendingUp,
  ArrowRightLeft,
  Repeat,
  Send,
  Download,
  Users,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Helper para obter token
const getAuthToken = () => {
  try {
    const stored = localStorage.getItem('hold-wallet-auth')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed?.state?.token
    }
  } catch {
    return null
  }
  return null
}

interface WalletRestrictions {
  wallet_id: string
  user_id: string
  user_email: string | null
  user_active: boolean | null
  blocking: {
    is_blocked: boolean
    blocked_at: string | null
    blocked_reason: string | null
    blocked_by: string | null
  }
  restrictions: {
    instant_trade: boolean
    deposits: boolean
    withdrawals: boolean
    p2p: boolean
    transfers: boolean
    swap: boolean
  }
  operations_allowed: {
    instant_trade: boolean
    deposits: boolean
    withdrawals: boolean
    p2p: boolean
    transfers: boolean
    swap: boolean
  }
}

interface RestrictionOption {
  key: keyof WalletRestrictions['restrictions']
  label: string
  description: string
  icon: React.ElementType
}

const RESTRICTION_OPTIONS: RestrictionOption[] = [
  {
    key: 'instant_trade',
    label: 'Trade Instantaneo (OTC)',
    description: 'Bloqueia criacao de trades OTC',
    icon: TrendingUp,
  },
  {
    key: 'deposits',
    label: 'Depositos',
    description: 'Sistema nao credita depositos na carteira',
    icon: Download,
  },
  {
    key: 'withdrawals',
    label: 'Saques / Envios',
    description: 'Nao pode sacar ou enviar crypto',
    icon: Send,
  },
  {
    key: 'p2p',
    label: 'P2P Marketplace',
    description: 'Nao pode criar ou aceitar ordens P2P',
    icon: Users,
  },
  {
    key: 'transfers',
    label: 'Transferencias Internas',
    description: 'Nao pode transferir para outros usuarios',
    icon: ArrowRightLeft,
  },
  {
    key: 'swap',
    label: 'Swap entre Cryptos',
    description: 'Nao pode fazer conversao entre criptomoedas',
    icon: Repeat,
  },
]

export default function AdminWalletBlockPage() {
  const { walletId } = useParams<{ walletId: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [restrictions, setRestrictions] = useState<WalletRestrictions | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [blockType, setBlockType] = useState<'full' | 'partial'>('partial')
  const [reason, setReason] = useState('')
  const [freezeBalance, setFreezeBalance] = useState(false)
  const [selectedRestrictions, setSelectedRestrictions] = useState<Record<string, boolean>>({
    instant_trade: false,
    deposits: false,
    withdrawals: false,
    p2p: false,
    transfers: false,
    swap: false,
  })

  // Carregar restricoes atuais
  const fetchRestrictions = async () => {
    if (!walletId) return

    setLoading(true)
    setError(null)

    try {
      const token = getAuthToken()
      const response = await fetch(`${API_URL}/admin/wallets/${walletId}/restrictions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Falha ao carregar restricoes')
      }

      const data = await response.json()
      setRestrictions(data)

      // Preencher form com valores atuais
      if (data.blocking?.is_blocked) {
        setBlockType('full')
      } else if (Object.values(data.restrictions || {}).some(v => v)) {
        setBlockType('partial')
      }

      setSelectedRestrictions(data.restrictions || {})
      setReason(data.blocking?.blocked_reason || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      toast.error('Erro ao carregar dados da wallet')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRestrictions()
  }, [walletId])

  // Toggle uma restricao especifica
  const toggleRestriction = (key: string) => {
    setSelectedRestrictions(prev => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  // Selecionar/Deselecionar todas
  const selectAllRestrictions = () => {
    const allSelected = Object.values(selectedRestrictions).every(v => v)
    const newValue = !allSelected
    setSelectedRestrictions({
      instant_trade: newValue,
      deposits: newValue,
      withdrawals: newValue,
      p2p: newValue,
      transfers: newValue,
      swap: newValue,
    })
  }

  // Aplicar bloqueio
  const handleBlock = async () => {
    if (!walletId) return
    if (!reason.trim()) {
      toast.error('Informe o motivo do bloqueio')
      return
    }

    setSaving(true)

    try {
      const token = getAuthToken()
      const response = await fetch(`${API_URL}/admin/wallets/${walletId}/block`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason,
          freeze_balance: freezeBalance,
          block_type: blockType,
          restrict_instant_trade: selectedRestrictions.instant_trade,
          restrict_deposits: selectedRestrictions.deposits,
          restrict_withdrawals: selectedRestrictions.withdrawals,
          restrict_p2p: selectedRestrictions.p2p,
          restrict_transfers: selectedRestrictions.transfers,
          restrict_swap: selectedRestrictions.swap,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Erro ao bloquear wallet')
      }

      toast.success('Wallet bloqueada com sucesso')
      fetchRestrictions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao bloquear')
    } finally {
      setSaving(false)
    }
  }

  // Desbloquear completamente
  const handleUnblock = async () => {
    if (!walletId) return

    if (!confirm('Tem certeza que deseja desbloquear esta wallet e remover todas as restricoes?')) {
      return
    }

    setSaving(true)

    try {
      const token = getAuthToken()
      const response = await fetch(`${API_URL}/admin/wallets/${walletId}/unblock`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Erro ao desbloquear wallet')
      }

      toast.success('Wallet desbloqueada com sucesso')
      fetchRestrictions()
      setReason('')
      setFreezeBalance(false)
      setSelectedRestrictions({
        instant_trade: false,
        deposits: false,
        withdrawals: false,
        p2p: false,
        transfers: false,
        swap: false,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao desbloquear')
    } finally {
      setSaving(false)
    }
  }

  // Verificar se tem alguma restricao ativa
  const hasActiveRestrictions =
    restrictions?.blocking?.is_blocked ||
    Object.values(restrictions?.restrictions || {}).some(v => v)

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-[400px]'>
        <Loader2 className='w-8 h-8 animate-spin text-primary' />
      </div>
    )
  }

  if (error) {
    return (
      <div className='p-6'>
        <div className='bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3'>
          <AlertTriangle className='w-5 h-5 text-red-400' />
          <span className='text-red-400'>{error}</span>
          <button
            onClick={fetchRestrictions}
            className='ml-auto px-3 py-1 bg-red-500/20 rounded text-red-400 hover:bg-red-500/30'
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='p-6 space-y-6'>
      {/* Header */}
      <div className='flex items-center gap-4'>
        <button
          onClick={() => navigate('/admin/wallets')}
          className='p-2 hover:bg-dark-700 rounded-lg transition-colors'
          title='Voltar'
        >
          <ArrowLeft className='w-5 h-5' />
        </button>
        <div>
          <h1 className='text-2xl font-bold flex items-center gap-2'>
            <Shield className='w-6 h-6 text-primary' />
            Gerenciar Bloqueios
          </h1>
          <p className='text-sm text-gray-400'>Wallet ID: {walletId}</p>
        </div>
        <button
          onClick={fetchRestrictions}
          className='ml-auto p-2 hover:bg-dark-700 rounded-lg transition-colors'
          title='Atualizar'
        >
          <RefreshCw className='w-5 h-5' />
        </button>
      </div>

      {/* Info do Usuario */}
      {restrictions && (
        <div className='bg-dark-800 rounded-xl p-4 border border-dark-700'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div className='flex items-center gap-3'>
              <User className='w-5 h-5 text-gray-400' />
              <div>
                <p className='text-xs text-gray-500'>Usuario</p>
                <p className='font-medium'>{restrictions.user_id?.slice(0, 8)}...</p>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              <Mail className='w-5 h-5 text-gray-400' />
              <div>
                <p className='text-xs text-gray-500'>Email</p>
                <p className='font-medium'>{restrictions.user_email || 'N/A'}</p>
              </div>
            </div>
            <div className='flex items-center gap-3'>
              {restrictions.user_active ? (
                <CheckCircle className='w-5 h-5 text-green-400' />
              ) : (
                <XCircle className='w-5 h-5 text-red-400' />
              )}
              <div>
                <p className='text-xs text-gray-500'>Status da Conta</p>
                <p
                  className={`font-medium ${restrictions.user_active ? 'text-green-400' : 'text-red-400'}`}
                >
                  {restrictions.user_active ? 'Ativa' : 'Desativada'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Atual */}
      <div className='bg-dark-800 rounded-xl p-4 border border-dark-700'>
        <h2 className='text-lg font-semibold mb-4 flex items-center gap-2'>
          {hasActiveRestrictions ? (
            <ShieldAlert className='w-5 h-5 text-red-400' />
          ) : (
            <ShieldCheck className='w-5 h-5 text-green-400' />
          )}
          Status Atual
        </h2>

        {restrictions?.blocking?.is_blocked ? (
          <div className='bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4'>
            <div className='flex items-center gap-2 text-red-400 font-medium mb-2'>
              <Ban className='w-5 h-5' />
              Wallet BLOQUEADA TOTALMENTE
            </div>
            {restrictions.blocking.blocked_reason && (
              <p className='text-sm text-gray-400'>
                Motivo: {restrictions.blocking.blocked_reason}
              </p>
            )}
            {restrictions.blocking.blocked_at && (
              <p className='text-xs text-gray-500 mt-1'>
                Bloqueada em: {new Date(restrictions.blocking.blocked_at).toLocaleString()}
              </p>
            )}
          </div>
        ) : hasActiveRestrictions ? (
          <div className='bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4'>
            <div className='flex items-center gap-2 text-yellow-400 font-medium mb-2'>
              <ShieldAlert className='w-5 h-5' />
              Wallet com Restricoes Parciais
            </div>
            {restrictions?.blocking?.blocked_reason && (
              <p className='text-sm text-gray-400'>
                Motivo: {restrictions.blocking.blocked_reason}
              </p>
            )}
          </div>
        ) : (
          <div className='bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4'>
            <div className='flex items-center gap-2 text-green-400 font-medium'>
              <ShieldCheck className='w-5 h-5' />
              Wallet Operando Normalmente
            </div>
          </div>
        )}

        {/* Grid de operacoes permitidas */}
        <div className='grid grid-cols-2 md:grid-cols-3 gap-3'>
          {RESTRICTION_OPTIONS.map(option => {
            const isAllowed = restrictions?.operations_allowed?.[option.key] ?? true
            const Icon = option.icon
            return (
              <div
                key={option.key}
                className={`p-3 rounded-lg border ${
                  isAllowed
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-red-500/5 border-red-500/20'
                }`}
              >
                <div className='flex items-center gap-2 mb-1'>
                  <Icon className={`w-4 h-4 ${isAllowed ? 'text-green-400' : 'text-red-400'}`} />
                  <span className='text-sm font-medium'>{option.label}</span>
                </div>
                <div className='flex items-center gap-1'>
                  {isAllowed ? (
                    <>
                      <CheckCircle className='w-3 h-3 text-green-400' />
                      <span className='text-xs text-green-400'>Permitido</span>
                    </>
                  ) : (
                    <>
                      <XCircle className='w-3 h-3 text-red-400' />
                      <span className='text-xs text-red-400'>Bloqueado</span>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Formulario de Bloqueio */}
      <div className='bg-dark-800 rounded-xl p-4 border border-dark-700'>
        <h2 className='text-lg font-semibold mb-4 flex items-center gap-2'>
          <Lock className='w-5 h-5 text-primary' />
          Aplicar Bloqueio
        </h2>

        {/* Tipo de Bloqueio */}
        <div className='mb-4'>
          <label className='block text-sm font-medium mb-2'>Tipo de Bloqueio</label>
          <div className='flex gap-4'>
            <label className='flex items-center gap-2 cursor-pointer'>
              <input
                type='radio'
                name='blockType'
                value='full'
                checked={blockType === 'full'}
                onChange={() => setBlockType('full')}
                className='w-4 h-4 text-primary'
              />
              <span>Bloqueio Total</span>
            </label>
            <label className='flex items-center gap-2 cursor-pointer'>
              <input
                type='radio'
                name='blockType'
                value='partial'
                checked={blockType === 'partial'}
                onChange={() => setBlockType('partial')}
                className='w-4 h-4 text-primary'
              />
              <span>Bloqueio Parcial</span>
            </label>
          </div>
          <p className='text-xs text-gray-500 mt-1'>
            {blockType === 'full'
              ? 'Bloqueia todas as operacoes da wallet'
              : 'Selecione quais operacoes bloquear'}
          </p>
        </div>

        {/* Restricoes (apenas para bloqueio parcial) */}
        {blockType === 'partial' && (
          <div className='mb-4'>
            <div className='flex items-center justify-between mb-2'>
              <label className='block text-sm font-medium'>Restricoes</label>
              <button
                onClick={selectAllRestrictions}
                className='text-xs text-primary hover:underline'
              >
                {Object.values(selectedRestrictions).every(v => v)
                  ? 'Desmarcar Todas'
                  : 'Selecionar Todas'}
              </button>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
              {RESTRICTION_OPTIONS.map(option => {
                const Icon = option.icon
                const isSelected = selectedRestrictions[option.key]
                return (
                  <button
                    key={option.key}
                    onClick={() => toggleRestriction(option.key)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-dark-700 border-dark-600 hover:border-dark-500'
                    }`}
                  >
                    <div className='flex items-center gap-2'>
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center ${
                          isSelected ? 'bg-red-500 border-red-500' : 'border-gray-500'
                        }`}
                      >
                        {isSelected && <CheckCircle className='w-3 h-3 text-white' />}
                      </div>
                      <Icon
                        className={`w-4 h-4 ${isSelected ? 'text-red-400' : 'text-gray-400'}`}
                      />
                      <span className='font-medium'>{option.label}</span>
                    </div>
                    <p className='text-xs text-gray-500 mt-1 ml-7'>{option.description}</p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Motivo */}
        <div className='mb-4'>
          <label className='block text-sm font-medium mb-2'>
            Motivo do Bloqueio <span className='text-red-400'>*</span>
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder='Descreva o motivo do bloqueio...'
            className='w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-lg focus:outline-none focus:border-primary resize-none'
            rows={3}
          />
        </div>

        {/* Congelar Saldo */}
        <div className='mb-6'>
          <label className='flex items-center gap-3 cursor-pointer'>
            <input
              type='checkbox'
              checked={freezeBalance}
              onChange={e => setFreezeBalance(e.target.checked)}
              className='w-5 h-5 rounded text-primary'
            />
            <div>
              <span className='font-medium'>Congelar Saldo</span>
              <p className='text-xs text-gray-500'>
                Move o saldo disponivel para locked (nao pode ser usado)
              </p>
            </div>
          </label>
        </div>

        {/* Botoes de Acao */}
        <div className='flex flex-col sm:flex-row gap-3'>
          <button
            onClick={handleBlock}
            disabled={saving || !reason.trim()}
            className='flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium flex items-center justify-center gap-2 transition-colors'
          >
            {saving ? <Loader2 className='w-5 h-5 animate-spin' /> : <Lock className='w-5 h-5' />}
            Aplicar Bloqueio
          </button>

          {hasActiveRestrictions && (
            <button
              onClick={handleUnblock}
              disabled={saving}
              className='flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors'
            >
              {saving ? (
                <Loader2 className='w-5 h-5 animate-spin' />
              ) : (
                <Unlock className='w-5 h-5' />
              )}
              Desbloquear Tudo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
