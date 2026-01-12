/**
 * 🛡️ Admin KYC User Management Page
 * ==================================
 * Página avançada para gestão de KYC de usuários.
 * Permite editar níveis, definir limites e controlar acesso a serviços.
 *
 * Author: HOLD Wallet Team
 */

import React, { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Eye,
  Edit3,
  Users,
  ChevronLeft,
  ChevronRight,
  User,
  Loader2,
  X,
  AlertTriangle,
  Clock,
  Ban,
  Unlock,
  Save,
  RefreshCw,
  DollarSign,
  Sliders,
  Lock,
  Trash2,
} from 'lucide-react'
import { adminApi } from '@/services/admin/adminService'

// ============================================================
// TYPES
// ============================================================

interface UserKYCItem {
  user_id: string
  username: string
  email: string
  kyc_level: 'none' | 'basic' | 'intermediate' | 'advanced' | 'premium'
  kyc_status: string | null
  user_created_at: string
  has_custom_limits: boolean
  has_blocked_services: boolean
}

interface CustomLimit {
  id: string
  user_id: string
  service_name: string
  daily_limit: number | null
  monthly_limit: number | null
  per_operation_limit: number | null
  is_enabled: boolean
  requires_approval: boolean
  reason: string | null
  admin_notes: string | null
  expires_at: string | null
  created_at: string
}

interface ServiceAccess {
  id: string
  user_id: string
  service_name: string
  is_allowed: boolean
  reason: string | null
  admin_notes: string | null
  blocked_until: string | null
  created_at: string
}

interface EffectiveLimit {
  daily_limit: number | null
  monthly_limit: number | null
  per_operation_limit: number | null
  is_enabled: boolean
  requires_approval: boolean
  is_custom: boolean
  blocked_reason: string | null
}

interface UserKYCDetails {
  user_id: string
  username: string
  email: string
  user_created_at: string
  kyc_level: string
  kyc_status: string | null
  verification_id: string | null
  approved_at: string | null
  expiration_date: string | null
  custom_limits: CustomLimit[]
  service_access: ServiceAccess[]
  effective_limits: Record<string, EffectiveLimit>
}

// Service names mapping
const SERVICE_NAMES: Record<string, string> = {
  instant_trade: 'Instant Trade',
  p2p: 'P2P Trading',
  withdraw_crypto: 'Saque Crypto',
  deposit_crypto: 'Depósito Crypto',
  pix_withdraw: 'Saque PIX',
  pix_deposit: 'Depósito PIX',
  ted_withdraw: 'Saque TED',
  wolkpay: 'WolkPay',
  internal_transfer: 'Transferência Interna',
  swap: 'Swap',
}

const KYC_LEVELS: Record<string, { label: string; color: string; bg: string }> = {
  none: { label: 'Nenhum', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
  basic: { label: 'Básico', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  intermediate: {
    label: 'Intermediário',
    color: 'text-purple-600',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
  },
  advanced: {
    label: 'Avançado',
    color: 'text-orange-600',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
  },
  premium: {
    label: 'Premium',
    color: 'text-yellow-600',
    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
}

// ============================================================
// COMPONENTS
// ============================================================

// Badge de nível KYC
const LevelBadge: React.FC<{ level: string }> = ({ level }) => {
  const config = KYC_LEVELS[level] ?? KYC_LEVELS.none
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
      {config.label}
    </span>
  )
}

// Modal de edição de nível
const EditLevelModal: React.FC<{
  user: UserKYCDetails | null
  isOpen: boolean
  onClose: () => void
  onSave: (level: string, reason: string) => Promise<void>
}> = ({ user, isOpen, onClose, onSave }) => {
  const [selectedLevel, setSelectedLevel] = useState(user?.kyc_level || 'none')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setSelectedLevel(user.kyc_level)
      setReason('')
    }
  }, [user])

  if (!isOpen || !user) return null

  const handleSave = async () => {
    if (reason.length < 10) {
      alert('Motivo deve ter pelo menos 10 caracteres')
      return
    }
    setSaving(true)
    try {
      await onSave(selectedLevel, reason)
      onClose()
    } catch (err) {
      console.error('Erro ao salvar:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'>
      <div className='bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>Alterar Nível KYC</h3>
          <button onClick={onClose} className='text-gray-400 hover:text-gray-600'>
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='mb-4'>
          <p className='text-sm text-gray-600 dark:text-gray-400'>
            Usuário: <strong>{user.username}</strong> ({user.email})
          </p>
          <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
            Nível atual: <LevelBadge level={user.kyc_level} />
          </p>
        </div>

        <div className='mb-4'>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
            Novo Nível
          </label>
          <select
            value={selectedLevel}
            onChange={e => setSelectedLevel(e.target.value)}
            className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
          >
            {Object.entries(KYC_LEVELS).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className='mb-4'>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
            Motivo da alteração *
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder='Descreva o motivo da alteração (mínimo 10 caracteres)'
            rows={3}
            className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none'
          />
          <p className='text-xs text-gray-500 mt-1'>{reason.length}/500 caracteres</p>
        </div>

        <div className='flex gap-3'>
          <button
            onClick={onClose}
            className='flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || reason.length < 10}
            className='flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
          >
            {saving ? <Loader2 className='w-4 h-4 animate-spin' /> : <Save className='w-4 h-4' />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

// Modal de limites personalizados
const EditLimitsModal: React.FC<{
  user: UserKYCDetails | null
  isOpen: boolean
  onClose: () => void
  onSave: (service: string, limits: any) => Promise<void>
  onDelete: (service: string) => Promise<void>
}> = ({ user, isOpen, onClose, onSave, onDelete }) => {
  const [selectedService, setSelectedService] = useState('')
  const [dailyLimit, setDailyLimit] = useState<string>('')
  const [monthlyLimit, setMonthlyLimit] = useState<string>('')
  const [perOpLimit, setPerOpLimit] = useState<string>('')
  const [isEnabled, setIsEnabled] = useState(true)
  const [requiresApproval, setRequiresApproval] = useState(false)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (selectedService && user) {
      const existing = user.custom_limits.find(l => l.service_name === selectedService)
      if (existing) {
        setDailyLimit(existing.daily_limit?.toString() || '')
        setMonthlyLimit(existing.monthly_limit?.toString() || '')
        setPerOpLimit(existing.per_operation_limit?.toString() || '')
        setIsEnabled(existing.is_enabled)
        setRequiresApproval(existing.requires_approval)
        setReason(existing.reason || '')
      } else {
        setDailyLimit('')
        setMonthlyLimit('')
        setPerOpLimit('')
        setIsEnabled(true)
        setRequiresApproval(false)
        setReason('')
      }
    }
  }, [selectedService, user])

  if (!isOpen || !user) return null

  const handleSave = async () => {
    if (!selectedService) {
      alert('Selecione um serviço')
      return
    }
    setSaving(true)
    try {
      await onSave(selectedService, {
        daily_limit: dailyLimit ? parseFloat(dailyLimit) : null,
        monthly_limit: monthlyLimit ? parseFloat(monthlyLimit) : null,
        per_operation_limit: perOpLimit ? parseFloat(perOpLimit) : null,
        is_enabled: isEnabled,
        requires_approval: requiresApproval,
        reason: reason || null,
      })
      onClose()
    } catch (err) {
      console.error('Erro ao salvar:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedService) return
    if (!confirm(`Remover limite personalizado de ${SERVICE_NAMES[selectedService]}?`)) return
    setSaving(true)
    try {
      await onDelete(selectedService)
      onClose()
    } catch (err) {
      console.error('Erro ao remover:', err)
    } finally {
      setSaving(false)
    }
  }

  const hasCustomLimit = user.custom_limits.some(l => l.service_name === selectedService)

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'>
      <div className='bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
            Limites Personalizados
          </h3>
          <button onClick={onClose} className='text-gray-400 hover:text-gray-600'>
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='mb-4'>
          <p className='text-sm text-gray-600 dark:text-gray-400'>
            Usuário: <strong>{user.username}</strong>
          </p>
        </div>

        <div className='mb-4'>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
            Serviço
          </label>
          <select
            value={selectedService}
            onChange={e => setSelectedService(e.target.value)}
            className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
          >
            <option value=''>Selecione um serviço</option>
            {Object.entries(SERVICE_NAMES).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
                {user.custom_limits.some(l => l.service_name === key) ? ' ⚙️' : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedService && (
          <>
            <div className='grid grid-cols-3 gap-3 mb-4'>
              <div>
                <label className='block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'>
                  Limite Diário (R$)
                </label>
                <input
                  type='number'
                  value={dailyLimit}
                  onChange={e => setDailyLimit(e.target.value)}
                  placeholder='Sem limite'
                  className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                />
              </div>
              <div>
                <label className='block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'>
                  Limite Mensal (R$)
                </label>
                <input
                  type='number'
                  value={monthlyLimit}
                  onChange={e => setMonthlyLimit(e.target.value)}
                  placeholder='Sem limite'
                  className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                />
              </div>
              <div>
                <label className='block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'>
                  Por Operação (R$)
                </label>
                <input
                  type='number'
                  value={perOpLimit}
                  onChange={e => setPerOpLimit(e.target.value)}
                  placeholder='Sem limite'
                  className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                />
              </div>
            </div>

            <div className='flex flex-col gap-3 mb-4'>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={isEnabled}
                  onChange={e => setIsEnabled(e.target.checked)}
                  className='w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                />
                <span className='text-sm text-gray-700 dark:text-gray-300'>Serviço habilitado</span>
              </label>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={requiresApproval}
                  onChange={e => setRequiresApproval(e.target.checked)}
                  className='w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                />
                <span className='text-sm text-gray-700 dark:text-gray-300'>
                  Requer aprovação manual
                </span>
              </label>
            </div>

            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Motivo/Observação
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder='Motivo da personalização (opcional)'
                rows={2}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none text-sm'
              />
            </div>

            <div className='flex gap-3'>
              {hasCustomLimit && (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className='px-4 py-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center gap-2'
                >
                  <Trash2 className='w-4 h-4' />
                  Remover
                </button>
              )}
              <button
                onClick={onClose}
                className='flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className='flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2'
              >
                {saving ? (
                  <Loader2 className='w-4 h-4 animate-spin' />
                ) : (
                  <Save className='w-4 h-4' />
                )}
                Salvar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Modal de acesso a serviços
const EditAccessModal: React.FC<{
  user: UserKYCDetails | null
  isOpen: boolean
  onClose: () => void
  onSave: (service: string, access: any) => Promise<void>
  onDelete: (service: string) => Promise<void>
}> = ({ user, isOpen, onClose, onSave, onDelete }) => {
  const [selectedService, setSelectedService] = useState('')
  const [isAllowed, setIsAllowed] = useState(true)
  const [reason, setReason] = useState('')
  const [blockedUntil, setBlockedUntil] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (selectedService && user) {
      const existing = user.service_access.find(a => a.service_name === selectedService)
      if (existing) {
        setIsAllowed(existing.is_allowed)
        setReason(existing.reason || '')
        setBlockedUntil(existing.blocked_until?.split('T')[0] || '')
      } else {
        setIsAllowed(true)
        setReason('')
        setBlockedUntil('')
      }
    }
  }, [selectedService, user])

  if (!isOpen || !user) return null

  const handleSave = async () => {
    if (!selectedService) {
      alert('Selecione um serviço')
      return
    }
    if (!isAllowed && !reason) {
      alert('Informe o motivo do bloqueio')
      return
    }
    setSaving(true)
    try {
      await onSave(selectedService, {
        is_allowed: isAllowed,
        reason: reason || null,
        blocked_until: blockedUntil ? new Date(blockedUntil).toISOString() : null,
      })
      onClose()
    } catch (err) {
      console.error('Erro ao salvar:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedService) return
    if (!confirm(`Remover configuração de acesso de ${SERVICE_NAMES[selectedService]}?`)) return
    setSaving(true)
    try {
      await onDelete(selectedService)
      onClose()
    } catch (err) {
      console.error('Erro ao remover:', err)
    } finally {
      setSaving(false)
    }
  }

  const hasCustomAccess = user.service_access.some(a => a.service_name === selectedService)

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'>
      <div className='bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 p-6'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
            Controle de Acesso
          </h3>
          <button onClick={onClose} className='text-gray-400 hover:text-gray-600'>
            <X className='w-5 h-5' />
          </button>
        </div>

        <div className='mb-4'>
          <p className='text-sm text-gray-600 dark:text-gray-400'>
            Usuário: <strong>{user.username}</strong>
          </p>
        </div>

        <div className='mb-4'>
          <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
            Serviço
          </label>
          <select
            value={selectedService}
            onChange={e => setSelectedService(e.target.value)}
            className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
          >
            <option value=''>Selecione um serviço</option>
            {Object.entries(SERVICE_NAMES).map(([key, name]) => {
              const access = user.service_access.find(a => a.service_name === key)
              const isBlocked = access && !access.is_allowed
              return (
                <option key={key} value={key}>
                  {name} {isBlocked ? '🚫' : access ? '✓' : ''}
                </option>
              )
            })}
          </select>
        </div>

        {selectedService && (
          <>
            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                Status de Acesso
              </label>
              <div className='flex gap-4'>
                <label className='flex items-center gap-2 cursor-pointer'>
                  <input
                    type='radio'
                    checked={isAllowed}
                    onChange={() => setIsAllowed(true)}
                    className='w-4 h-4 text-green-600 focus:ring-green-500'
                  />
                  <span className='text-sm text-green-600 flex items-center gap-1'>
                    <Unlock className='w-4 h-4' /> Permitido
                  </span>
                </label>
                <label className='flex items-center gap-2 cursor-pointer'>
                  <input
                    type='radio'
                    checked={!isAllowed}
                    onChange={() => setIsAllowed(false)}
                    className='w-4 h-4 text-red-600 focus:ring-red-500'
                  />
                  <span className='text-sm text-red-600 flex items-center gap-1'>
                    <Lock className='w-4 h-4' /> Bloqueado
                  </span>
                </label>
              </div>
            </div>

            {!isAllowed && (
              <>
                <div className='mb-4'>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    Motivo do bloqueio *
                  </label>
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder='Informe o motivo do bloqueio'
                    rows={2}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none text-sm'
                  />
                </div>

                <div className='mb-4'>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    Bloqueado até (opcional)
                  </label>
                  <input
                    type='date'
                    value={blockedUntil}
                    onChange={e => setBlockedUntil(e.target.value)}
                    className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm'
                  />
                  <p className='text-xs text-gray-500 mt-1'>Deixe vazio para bloqueio permanente</p>
                </div>
              </>
            )}

            <div className='flex gap-3'>
              {hasCustomAccess && (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className='px-4 py-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center gap-2'
                >
                  <Trash2 className='w-4 h-4' />
                </button>
              )}
              <button
                onClick={onClose}
                className='flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className='flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2'
              >
                {saving ? (
                  <Loader2 className='w-4 h-4 animate-spin' />
                ) : (
                  <Save className='w-4 h-4' />
                )}
                Salvar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ============================================================
// MAIN COMPONENT
// ============================================================

const AdminKYCUsersPage: React.FC = () => {
  // State
  const [users, setUsers] = useState<UserKYCItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const itemsPerPage = 20

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [customLimitsFilter, setCustomLimitsFilter] = useState<string>('all')
  const [blockedFilter, setBlockedFilter] = useState<string>('all')

  // Selected user for editing
  const [selectedUser, setSelectedUser] = useState<UserKYCDetails | null>(null)
  const [loadingUser, setLoadingUser] = useState(false)

  // Modals
  const [editLevelModal, setEditLevelModal] = useState(false)
  const [editLimitsModal, setEditLimitsModal] = useState(false)
  const [editAccessModal, setEditAccessModal] = useState(false)
  const [detailsPanel, setDetailsPanel] = useState(false)

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params: Record<string, string> = {
        page: String(currentPage),
        per_page: String(itemsPerPage),
      }

      if (searchTerm) params.search = searchTerm
      if (levelFilter !== 'all') params.kyc_level = levelFilter
      if (customLimitsFilter === 'yes') params.has_custom_limits = 'true'
      if (customLimitsFilter === 'no') params.has_custom_limits = 'false'
      if (blockedFilter === 'yes') params.has_blocked_services = 'true'
      if (blockedFilter === 'no') params.has_blocked_services = 'false'

      const response = await adminApi.get('/kyc/users', { params })
      const data = response.data

      setUsers(data.items || [])
      setTotal(data.total || 0)
      setTotalPages(data.pages || 1)
    } catch (err: any) {
      console.error('Erro ao carregar usuários:', err)
      // Handle Pydantic validation errors (array of objects) or string errors
      const detail = err?.response?.data?.detail
      if (Array.isArray(detail)) {
        // Pydantic validation errors
        const messages = detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ')
        setError(messages || 'Erro de validação')
      } else if (typeof detail === 'object' && detail !== null) {
        setError(detail.msg || detail.message || JSON.stringify(detail))
      } else {
        setError(detail || 'Erro ao carregar usuários')
      }
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchTerm, levelFilter, customLimitsFilter, blockedFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // Load user details
  const loadUserDetails = async (userId: string) => {
    setLoadingUser(true)
    try {
      const response = await adminApi.get(`/kyc/users/${userId}`)
      setSelectedUser(response.data)
      setDetailsPanel(true)
    } catch (err: any) {
      console.error('Erro ao carregar detalhes:', err)
      alert('Erro ao carregar detalhes do usuário')
    } finally {
      setLoadingUser(false)
    }
  }

  // Update user level
  const handleUpdateLevel = async (level: string, reason: string) => {
    if (!selectedUser) return
    await adminApi.put(`/kyc/users/${selectedUser.user_id}/level`, {
      kyc_level: level,
      reason,
    })
    await loadUserDetails(selectedUser.user_id)
    fetchUsers()
  }

  // Update custom limits
  const handleUpdateLimits = async (service: string, limits: any) => {
    if (!selectedUser) return
    await adminApi.post(`/kyc/users/${selectedUser.user_id}/limits`, {
      service_name: service,
      ...limits,
    })
    await loadUserDetails(selectedUser.user_id)
    fetchUsers()
  }

  // Delete custom limit
  const handleDeleteLimit = async (service: string) => {
    if (!selectedUser) return
    await adminApi.delete(`/kyc/users/${selectedUser.user_id}/limits/${service}`)
    await loadUserDetails(selectedUser.user_id)
    fetchUsers()
  }

  // Update service access
  const handleUpdateAccess = async (service: string, access: any) => {
    if (!selectedUser) return
    await adminApi.post(`/kyc/users/${selectedUser.user_id}/access`, {
      service_name: service,
      ...access,
    })
    await loadUserDetails(selectedUser.user_id)
    fetchUsers()
  }

  // Delete service access
  const handleDeleteAccess = async (service: string) => {
    if (!selectedUser) return
    await adminApi.delete(`/kyc/users/${selectedUser.user_id}/access/${service}`)
    await loadUserDetails(selectedUser.user_id)
    fetchUsers()
  }

  // Format currency
  const formatBRL = (value: number | null) => {
    if (value === null) return 'Sem limite'
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6'>
      {/* Header */}
      <div className='mb-6'>
        <div className='flex items-center gap-3 mb-2'>
          <div className='p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg'>
            <Users className='w-6 h-6 text-blue-600 dark:text-blue-400' />
          </div>
          <div>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
              Gestão de KYC por Usuário
            </h1>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              Edite níveis, limites e acesso a serviços
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6'>
        <div className='flex flex-wrap gap-4'>
          {/* Search */}
          <div className='flex-1 min-w-[200px]'>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400' />
              <input
                type='text'
                placeholder='Buscar por email ou username...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm'
              />
            </div>
          </div>

          {/* Level Filter */}
          <select
            value={levelFilter}
            onChange={e => setLevelFilter(e.target.value)}
            className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm'
          >
            <option value='all'>Todos os níveis</option>
            {Object.entries(KYC_LEVELS).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          {/* Custom Limits Filter */}
          <select
            value={customLimitsFilter}
            onChange={e => setCustomLimitsFilter(e.target.value)}
            className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm'
          >
            <option value='all'>Limites personalizados</option>
            <option value='yes'>Com limites custom</option>
            <option value='no'>Sem limites custom</option>
          </select>

          {/* Blocked Filter */}
          <select
            value={blockedFilter}
            onChange={e => setBlockedFilter(e.target.value)}
            className='px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm'
          >
            <option value='all'>Serviços bloqueados</option>
            <option value='yes'>Com bloqueios</option>
            <option value='no'>Sem bloqueios</option>
          </select>

          {/* Refresh */}
          <button
            onClick={() => fetchUsers()}
            className='p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg'
          >
            <RefreshCw className='w-5 h-5' />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className='bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6'>
          <div className='flex items-center gap-2 text-red-600 dark:text-red-400'>
            <AlertTriangle className='w-5 h-5' />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden'>
        {loading ? (
          <div className='flex items-center justify-center py-12'>
            <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
          </div>
        ) : users.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12 text-gray-500'>
            <Users className='w-12 h-12 mb-4 opacity-50' />
            <p>Nenhum usuário encontrado</p>
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-gray-50 dark:bg-gray-700/50'>
                <tr>
                  <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    Usuário
                  </th>
                  <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    Nível KYC
                  </th>
                  <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    Status
                  </th>
                  <th className='px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    Custom
                  </th>
                  <th className='px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    Bloqueios
                  </th>
                  <th className='px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                {users.map(user => (
                  <tr
                    key={user.user_id}
                    className='hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer'
                    onClick={() => loadUserDetails(user.user_id)}
                  >
                    <td className='px-4 py-3'>
                      <div>
                        <p className='font-medium text-gray-900 dark:text-white'>{user.username}</p>
                        <p className='text-sm text-gray-500 dark:text-gray-400'>{user.email}</p>
                      </div>
                    </td>
                    <td className='px-4 py-3'>
                      <LevelBadge level={user.kyc_level} />
                    </td>
                    <td className='px-4 py-3'>
                      {user.kyc_status ? (
                        <span
                          className={`text-sm ${
                            user.kyc_status === 'approved'
                              ? 'text-green-600'
                              : user.kyc_status === 'pending'
                                ? 'text-yellow-600'
                                : user.kyc_status === 'rejected'
                                  ? 'text-red-600'
                                  : 'text-gray-500'
                          }`}
                        >
                          {user.kyc_status === 'approved'
                            ? 'Aprovado'
                            : user.kyc_status === 'pending'
                              ? 'Pendente'
                              : user.kyc_status === 'submitted'
                                ? 'Enviado'
                                : user.kyc_status === 'rejected'
                                  ? 'Rejeitado'
                                  : user.kyc_status}
                        </span>
                      ) : (
                        <span className='text-sm text-gray-400'>-</span>
                      )}
                    </td>
                    <td className='px-4 py-3 text-center'>
                      {user.has_custom_limits ? (
                        <span title='Limites personalizados'>
                          <Sliders className='w-4 h-4 text-purple-500 mx-auto' />
                        </span>
                      ) : (
                        <span className='text-gray-300'>-</span>
                      )}
                    </td>
                    <td className='px-4 py-3 text-center'>
                      {user.has_blocked_services ? (
                        <span title='Serviços bloqueados'>
                          <Ban className='w-4 h-4 text-red-500 mx-auto' />
                        </span>
                      ) : (
                        <span className='text-gray-300'>-</span>
                      )}
                    </td>
                    <td className='px-4 py-3 text-right'>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          loadUserDetails(user.user_id)
                        }}
                        className='p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded'
                      >
                        <Eye className='w-4 h-4' />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className='flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700'>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              Mostrando {(currentPage - 1) * itemsPerPage + 1} a{' '}
              {Math.min(currentPage * itemsPerPage, total)} de {total}
            </p>
            <div className='flex gap-2'>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className='p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50'
              >
                <ChevronLeft className='w-5 h-5' />
              </button>
              <span className='px-4 py-2 text-sm text-gray-600 dark:text-gray-400'>
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className='p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50'
              >
                <ChevronRight className='w-5 h-5' />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Panel */}
      {detailsPanel && selectedUser && (
        <div className='fixed inset-y-0 right-0 w-full md:w-[500px] bg-white dark:bg-gray-800 shadow-xl z-40 overflow-y-auto'>
          <div className='sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4'>
            <div className='flex items-center justify-between'>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>
                Detalhes do Usuário
              </h2>
              <button
                onClick={() => setDetailsPanel(false)}
                className='p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded'
              >
                <X className='w-5 h-5' />
              </button>
            </div>
          </div>

          {loadingUser ? (
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
            </div>
          ) : (
            <div className='p-4 space-y-6'>
              {/* User Info */}
              <div className='bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4'>
                <div className='flex items-center gap-3 mb-3'>
                  <div className='w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center'>
                    <User className='w-6 h-6 text-blue-600 dark:text-blue-400' />
                  </div>
                  <div>
                    <p className='font-medium text-gray-900 dark:text-white'>
                      {selectedUser.username}
                    </p>
                    <p className='text-sm text-gray-500'>{selectedUser.email}</p>
                  </div>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <LevelBadge level={selectedUser.kyc_level} />
                  {selectedUser.kyc_status && (
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        selectedUser.kyc_status === 'approved'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {selectedUser.kyc_status}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className='grid grid-cols-3 gap-3'>
                <button
                  onClick={() => setEditLevelModal(true)}
                  className='flex flex-col items-center gap-1 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors'
                >
                  <Edit3 className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                  <span className='text-xs text-blue-600 dark:text-blue-400'>Nível</span>
                </button>
                <button
                  onClick={() => setEditLimitsModal(true)}
                  className='flex flex-col items-center gap-1 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors'
                >
                  <Sliders className='w-5 h-5 text-purple-600 dark:text-purple-400' />
                  <span className='text-xs text-purple-600 dark:text-purple-400'>Limites</span>
                </button>
                <button
                  onClick={() => setEditAccessModal(true)}
                  className='flex flex-col items-center gap-1 p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors'
                >
                  <Lock className='w-5 h-5 text-orange-600 dark:text-orange-400' />
                  <span className='text-xs text-orange-600 dark:text-orange-400'>Acesso</span>
                </button>
              </div>

              {/* Effective Limits */}
              <div>
                <h3 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2'>
                  <DollarSign className='w-4 h-4' />
                  Limites Efetivos
                </h3>
                <div className='space-y-2'>
                  {Object.entries(selectedUser.effective_limits).map(([service, limits]) => (
                    <div
                      key={service}
                      className={`p-3 rounded-lg border ${
                        !limits.is_enabled
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                          : limits.is_custom
                            ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
                            : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <div className='flex items-center justify-between mb-2'>
                        <span className='font-medium text-sm text-gray-900 dark:text-white'>
                          {SERVICE_NAMES[service] || service}
                        </span>
                        <div className='flex items-center gap-2'>
                          {limits.is_custom && (
                            <span className='text-xs bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded'>
                              Custom
                            </span>
                          )}
                          {!limits.is_enabled && <Ban className='w-4 h-4 text-red-500' />}
                          {limits.requires_approval && (
                            <span title='Requer aprovação'>
                              <Clock className='w-4 h-4 text-yellow-500' />
                            </span>
                          )}
                        </div>
                      </div>
                      {limits.is_enabled ? (
                        <div className='grid grid-cols-3 gap-2 text-xs'>
                          <div>
                            <span className='text-gray-500'>Diário:</span>
                            <p className='font-medium text-gray-700 dark:text-gray-300'>
                              {formatBRL(limits.daily_limit)}
                            </p>
                          </div>
                          <div>
                            <span className='text-gray-500'>Mensal:</span>
                            <p className='font-medium text-gray-700 dark:text-gray-300'>
                              {formatBRL(limits.monthly_limit)}
                            </p>
                          </div>
                          <div>
                            <span className='text-gray-500'>Por Op:</span>
                            <p className='font-medium text-gray-700 dark:text-gray-300'>
                              {formatBRL(limits.per_operation_limit)}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className='text-xs text-red-600 dark:text-red-400'>
                          {limits.blocked_reason || 'Serviço bloqueado'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Limits Summary */}
              {selectedUser.custom_limits.length > 0 && (
                <div>
                  <h3 className='text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2'>
                    <Sliders className='w-4 h-4' />
                    Limites Personalizados ({selectedUser.custom_limits.length})
                  </h3>
                  <div className='space-y-2 text-xs text-gray-600 dark:text-gray-400'>
                    {selectedUser.custom_limits.map(limit => (
                      <div key={limit.id} className='flex justify-between'>
                        <span>{SERVICE_NAMES[limit.service_name] || limit.service_name}</span>
                        <span>{limit.reason ? `(${limit.reason})` : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Blocked Services */}
              {selectedUser.service_access.filter(a => !a.is_allowed).length > 0 && (
                <div>
                  <h3 className='text-sm font-medium text-red-600 dark:text-red-400 mb-3 flex items-center gap-2'>
                    <Ban className='w-4 h-4' />
                    Serviços Bloqueados
                  </h3>
                  <div className='space-y-2'>
                    {selectedUser.service_access
                      .filter(a => !a.is_allowed)
                      .map(access => (
                        <div
                          key={access.id}
                          className='p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm'
                        >
                          <p className='font-medium text-red-700 dark:text-red-400'>
                            {SERVICE_NAMES[access.service_name] || access.service_name}
                          </p>
                          {access.reason && (
                            <p className='text-xs text-red-600 dark:text-red-400'>
                              {access.reason}
                            </p>
                          )}
                          {access.blocked_until && (
                            <p className='text-xs text-gray-500'>
                              Até: {new Date(access.blocked_until).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <EditLevelModal
        user={selectedUser}
        isOpen={editLevelModal}
        onClose={() => setEditLevelModal(false)}
        onSave={handleUpdateLevel}
      />

      <EditLimitsModal
        user={selectedUser}
        isOpen={editLimitsModal}
        onClose={() => setEditLimitsModal(false)}
        onSave={handleUpdateLimits}
        onDelete={handleDeleteLimit}
      />

      <EditAccessModal
        user={selectedUser}
        isOpen={editAccessModal}
        onClose={() => setEditAccessModal(false)}
        onSave={handleUpdateAccess}
        onDelete={handleDeleteAccess}
      />

      {/* Overlay when details panel is open on mobile */}
      {detailsPanel && (
        <div
          className='fixed inset-0 bg-black/50 z-30 md:hidden'
          onClick={() => setDetailsPanel(false)}
        />
      )}
    </div>
  )
}

export default AdminKYCUsersPage
