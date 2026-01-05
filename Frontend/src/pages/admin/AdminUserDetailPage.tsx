/**
 * 🛡️ HOLD Wallet - Admin User Detail Page
 * ========================================
 *
 * Página de detalhes e gestão de um usuário específico.
 * Integração real com a API do backend.
 */

import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  ShieldOff,
  Ban,
  CheckCircle,
  XCircle,
  Key,
  Smartphone,
  Wallet,
  History,
  AlertTriangle,
  RefreshCw,
  Edit,
  Trash2,
  Lock,
  Unlock,
} from 'lucide-react'
import {
  getUserById,
  blockUser,
  unblockUser,
  resetUserPassword,
  disable2FA,
  setAdminStatus,
} from '@/services/admin/adminService'
import { toast } from 'react-hot-toast'

interface UserDetail {
  id: string
  username: string
  email: string
  phone?: string | null
  is_active: boolean
  is_admin: boolean
  is_email_verified: boolean
  is_phone_verified?: boolean
  has_2fa: boolean
  created_at: string
  updated_at?: string | null
  last_login: string | null
  wallets_count?: number
  // Campos extras que podem vir do backend ou ser calculados
  total_trades?: number
  total_volume_usdt?: number
  kyc_status?: 'pending' | 'verified' | 'rejected'
}

interface UserActivity {
  id: string
  type: string
  description: string
  created_at: string
}

export const AdminUserDetailPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [activities, setActivities] = useState<UserActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchUser = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)
      console.log('📡 Buscando usuário:', userId)

      const response = await getUserById(userId)
      console.log('✅ Resposta:', response)

      // A API retorna { success: true, data: {...} }
      const userData: any = response.data || response

      setUser({
        id: userData.id,
        username: userData.username,
        email: userData.email,
        phone: userData.phone || null,
        is_active: userData.is_active,
        is_admin: userData.is_admin,
        is_email_verified: userData.is_email_verified || false,
        is_phone_verified: userData.is_phone_verified || false,
        has_2fa: userData.has_2fa || false,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
        last_login: userData.last_login,
        wallets_count: userData.wallets_count || 0,
        // Esses campos podem não existir ainda na API
        total_trades: userData.total_trades || 0,
        total_volume_usdt: userData.total_volume_usdt || 0,
        kyc_status: userData.kyc_status || 'pending',
      })

      // Atividades mockadas por enquanto (pode ser integrado depois)
      setActivities([
        {
          id: '1',
          type: 'login',
          description: 'Login realizado',
          created_at: userData.last_login || userData.created_at,
        },
      ])
    } catch (err: any) {
      console.error('❌ Erro ao buscar usuário:', err)
      setError(err.response?.data?.detail || 'Erro ao carregar dados do usuário')
      toast.error('Erro ao carregar dados do usuário')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleAction = async (action: string) => {
    if (!userId || !user) return

    try {
      setActionLoading(action)

      switch (action) {
        case 'block':
          if (confirm(`Deseja bloquear o usuário ${user.username}?`)) {
            await blockUser(userId, 'Bloqueado pelo administrador')
            toast.success('Usuário bloqueado com sucesso')
          }
          break

        case 'unblock':
          if (confirm(`Deseja desbloquear o usuário ${user.username}?`)) {
            await unblockUser(userId)
            toast.success('Usuário desbloqueado com sucesso')
          }
          break

        case 'reset_password':
          if (confirm(`Deseja resetar a senha do usuário ${user.username}?`)) {
            await resetUserPassword(userId)
            toast.success('Email de reset de senha enviado')
          }
          break

        case 'disable_2fa':
          if (confirm(`Deseja desativar 2FA do usuário ${user.username}?`)) {
            await disable2FA(userId)
            toast.success('2FA desativado com sucesso')
          }
          break

        case 'make_admin':
          if (confirm(`Deseja tornar ${user.username} um administrador?`)) {
            await setAdminStatus(userId, true)
            toast.success('Usuário agora é administrador')
          }
          break

        case 'remove_admin':
          if (confirm(`Deseja remover privilégios de admin de ${user.username}?`)) {
            await setAdminStatus(userId, false)
            toast.success('Privilégios de admin removidos')
          }
          break

        default:
          console.log(`Action: ${action} for user ${userId}`)
      }

      await fetchUser()
    } catch (err: any) {
      console.error('Erro na ação:', err)
      toast.error(err.response?.data?.detail || 'Erro ao executar ação')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center'>
        <div className='text-center'>
          <RefreshCw className='w-8 h-8 animate-spin text-blue-500 mx-auto mb-4' />
          <p className='text-gray-600 dark:text-gray-400'>Carregando dados do usuário...</p>
        </div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center'>
        <div className='text-center'>
          <AlertTriangle className='w-12 h-12 text-yellow-500 mx-auto mb-4' />
          <h2 className='text-xl font-bold text-gray-900 dark:text-white mb-2'>
            {error || 'Usuário não encontrado'}
          </h2>
          <button
            onClick={() => navigate('/admin/users')}
            className='text-blue-600 hover:underline'
          >
            Voltar para lista
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-6'>
      {/* Header */}
      <div className='mb-8'>
        <button
          onClick={() => navigate('/admin/users')}
          className='flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4'
        >
          <ArrowLeft className='w-4 h-4' />
          Voltar
        </button>

        <div className='flex items-start justify-between'>
          <div className='flex items-center gap-4'>
            <div className='w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center'>
              <span className='text-2xl font-bold text-blue-600 dark:text-blue-400'>
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className='flex items-center gap-3'>
                <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>
                  {user.username}
                </h1>
                {user.is_admin && (
                  <span className='px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded-full text-xs font-medium'>
                    Admin
                  </span>
                )}
                {user.is_active ? (
                  <span className='px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-medium'>
                    Ativo
                  </span>
                ) : (
                  <span className='px-2 py-1 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 rounded-full text-xs font-medium'>
                    Bloqueado
                  </span>
                )}
              </div>
              <p className='text-gray-600 dark:text-gray-400'>ID: {user.id}</p>
            </div>
          </div>

          {/* Actions */}
          <div className='flex gap-2'>
            <button
              onClick={() => navigate(`/admin/users/${userId}/edit`)}
              disabled={!!actionLoading}
              className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50'
            >
              <Edit className='w-4 h-4' />
              Editar
            </button>
            {user.is_active ? (
              <button
                onClick={() => handleAction('block')}
                disabled={!!actionLoading}
                className='px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 disabled:opacity-50'
              >
                {actionLoading === 'block' ? (
                  <RefreshCw className='w-4 h-4 animate-spin' />
                ) : (
                  <Ban className='w-4 h-4' />
                )}
                Bloquear
              </button>
            ) : (
              <button
                onClick={() => handleAction('unblock')}
                disabled={!!actionLoading}
                className='px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50'
              >
                {actionLoading === 'unblock' ? (
                  <RefreshCw className='w-4 h-4 animate-spin' />
                ) : (
                  <Unlock className='w-4 h-4' />
                )}
                Desbloquear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* User Info */}
        <div className='lg:col-span-2 space-y-6'>
          {/* Basic Info */}
          <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
              <User className='w-5 h-5' />
              Informações Básicas
            </h2>
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <span className='text-sm text-gray-500 dark:text-gray-400'>Email</span>
                <div className='flex items-center gap-2 mt-1'>
                  <Mail className='w-4 h-4 text-gray-400' />
                  <span className='text-gray-900 dark:text-white'>{user.email}</span>
                  {user.is_email_verified ? (
                    <CheckCircle className='w-4 h-4 text-green-500' />
                  ) : (
                    <XCircle className='w-4 h-4 text-red-500' />
                  )}
                </div>
              </div>
              <div>
                <span className='text-sm text-gray-500 dark:text-gray-400'>Telefone</span>
                <div className='flex items-center gap-2 mt-1'>
                  <Phone className='w-4 h-4 text-gray-400' />
                  <span className='text-gray-900 dark:text-white'>
                    {user.phone || 'Não informado'}
                  </span>
                  {user.is_phone_verified && <CheckCircle className='w-4 h-4 text-green-500' />}
                </div>
              </div>
              <div>
                <span className='text-sm text-gray-500 dark:text-gray-400'>Criado em</span>
                <div className='flex items-center gap-2 mt-1'>
                  <Calendar className='w-4 h-4 text-gray-400' />
                  <span className='text-gray-900 dark:text-white'>
                    {formatDate(user.created_at)}
                  </span>
                </div>
              </div>
              <div>
                <span className='text-sm text-gray-500 dark:text-gray-400'>Último Login</span>
                <div className='flex items-center gap-2 mt-1'>
                  <History className='w-4 h-4 text-gray-400' />
                  <span className='text-gray-900 dark:text-white'>
                    {user.last_login ? formatDate(user.last_login) : 'Nunca'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
              <Shield className='w-5 h-5' />
              Segurança
            </h2>
            <div className='space-y-4'>
              <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                <div className='flex items-center gap-3'>
                  <Smartphone className='w-5 h-5 text-gray-400' />
                  <div>
                    <span className='text-gray-900 dark:text-white font-medium'>
                      Autenticação 2FA
                    </span>
                    <p className='text-sm text-gray-500'>Google Authenticator</p>
                  </div>
                </div>
                {user.has_2fa ? (
                  <div className='flex items-center gap-2'>
                    <span className='text-green-600 dark:text-green-400 text-sm'>Ativo</span>
                    <button
                      onClick={() => handleAction('disable_2fa')}
                      className='px-3 py-1 text-sm bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200'
                    >
                      Desativar
                    </button>
                  </div>
                ) : (
                  <span className='text-gray-500 text-sm'>Inativo</span>
                )}
              </div>
              <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                <div className='flex items-center gap-3'>
                  <Key className='w-5 h-5 text-gray-400' />
                  <div>
                    <span className='text-gray-900 dark:text-white font-medium'>Senha</span>
                    <p className='text-sm text-gray-500'>Última alteração há 30 dias</p>
                  </div>
                </div>
                <button
                  onClick={() => handleAction('reset_password')}
                  className='px-3 py-1 text-sm bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg hover:bg-blue-200'
                >
                  Resetar
                </button>
              </div>
              <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg'>
                <div className='flex items-center gap-3'>
                  {user.is_admin ? (
                    <Shield className='w-5 h-5 text-purple-500' />
                  ) : (
                    <ShieldOff className='w-5 h-5 text-gray-400' />
                  )}
                  <div>
                    <span className='text-gray-900 dark:text-white font-medium'>
                      Privilégios Admin
                    </span>
                    <p className='text-sm text-gray-500'>Acesso ao painel administrativo</p>
                  </div>
                </div>
                {user.is_admin ? (
                  <button
                    onClick={() => handleAction('remove_admin')}
                    className='px-3 py-1 text-sm bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-200'
                  >
                    Remover Admin
                  </button>
                ) : (
                  <button
                    onClick={() => handleAction('make_admin')}
                    className='px-3 py-1 text-sm bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-lg hover:bg-purple-200'
                  >
                    Tornar Admin
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Trading Stats */}
          <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
              <Wallet className='w-5 h-5' />
              Estatísticas de Trading
            </h2>
            <div className='grid grid-cols-3 gap-4'>
              <div className='p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center'>
                <div className='text-2xl font-bold text-blue-600'>{user.total_trades || 0}</div>
                <div className='text-sm text-gray-500'>Trades Totais</div>
              </div>
              <div className='p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center'>
                <div className='text-2xl font-bold text-green-600'>
                  ${(user.total_volume_usdt || 0).toLocaleString()}
                </div>
                <div className='text-sm text-gray-500'>Volume Total</div>
              </div>
              <div className='p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center'>
                <div className='text-2xl font-bold text-purple-600'>
                  {user.kyc_status === 'verified' ? 'Sim' : 'Não'}
                </div>
                <div className='text-sm text-gray-500'>KYC Verificado</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className='space-y-6'>
          {/* Quick Actions */}
          <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
              Ações Rápidas
            </h3>
            <div className='space-y-3'>
              <button className='w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2 text-left'>
                <Wallet className='w-4 h-4' />
                Ver Carteiras
              </button>
              <button className='w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2 text-left'>
                <History className='w-4 h-4' />
                Ver Transações
              </button>
              <button className='w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2 text-left'>
                <Lock className='w-4 h-4' />
                Logs de Acesso
              </button>
              <button className='w-full px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 flex items-center gap-2 text-left'>
                <Trash2 className='w-4 h-4' />
                Excluir Conta
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className='bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
              Atividade Recente
            </h3>
            <div className='space-y-4'>
              {activities.map(activity => (
                <div key={activity.id} className='flex items-start gap-3'>
                  <div className='w-2 h-2 bg-blue-500 rounded-full mt-2' />
                  <div className='flex-1'>
                    <p className='text-sm text-gray-900 dark:text-white'>{activity.description}</p>
                    <p className='text-xs text-gray-500'>{formatDate(activity.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
