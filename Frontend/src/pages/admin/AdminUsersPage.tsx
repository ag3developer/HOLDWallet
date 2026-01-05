/**
 * 🛡️ HOLD Wallet - Admin Users Page
 * ==================================
 *
 * Página de listagem e gestão de usuários.
 * Usa React Query para cache de dados.
 */

import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Ban,
  CheckCircle,
  Shield,
  RefreshCw,
  XCircle,
  MoreVertical,
  LogIn,
} from 'lucide-react'
import { useUsers, useBlockUser, useUnblockUser } from '@/hooks/admin/useAdminUsers'
import { toast } from 'react-hot-toast'

export const AdminUsersPage: React.FC = () => {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'admin'>('all')
  const [page, setPage] = useState(1)
  const limit = 20

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1) // Reset page when search changes
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  // Reset page on filter change
  React.useEffect(() => {
    setPage(1)
  }, [filter])

  // Parâmetros para a query
  const queryParams = useMemo(() => {
    const params: {
      skip: number
      limit: number
      search?: string
      is_active?: boolean
      is_admin?: boolean
    } = {
      skip: (page - 1) * limit,
      limit,
    }

    if (debouncedSearch) {
      params.search = debouncedSearch
    }

    // Aplicar filtros
    if (filter === 'active') {
      params.is_active = true
    } else if (filter === 'inactive') {
      params.is_active = false
    } else if (filter === 'admin') {
      params.is_admin = true
    }

    return params
  }, [page, debouncedSearch, filter])

  // Query com cache
  const { data, isLoading: loading, error, refetch, isFetching } = useUsers(queryParams)

  // Mutations
  const blockUserMutation = useBlockUser()
  const unblockUserMutation = useUnblockUser()

  const users = data?.users ?? []
  const total = data?.total ?? 0

  const handleBlockUser = async (userId: string, username: string, isActive: boolean) => {
    const action = isActive ? 'bloquear' : 'desbloquear'
    if (!confirm(`Deseja ${action} o usuário ${username}?`)) return

    try {
      if (isActive) {
        await blockUserMutation.mutateAsync({ userId, reason: 'Bloqueado pelo administrador' })
        toast.success(`Usuário ${username} bloqueado`)
      } else {
        await unblockUserMutation.mutateAsync(userId)
        toast.success(`Usuário ${username} desbloqueado`)
      }
    } catch (err) {
      console.error('Erro ao alterar status:', err)
      toast.error(`Erro ao ${action} usuário`)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-6'>
      {/* Header */}
      <div className='mb-8'>
        <div className='flex items-center gap-3 mb-2'>
          <Users className='w-8 h-8 text-blue-600' />
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>Gestão de Usuários</h1>
        </div>
        <p className='text-gray-600 dark:text-gray-400'>Gerencie todos os usuários da plataforma</p>
      </div>

      {/* Filters */}
      <div className='bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm mb-6'>
        <div className='flex flex-col md:flex-row gap-4'>
          {/* Search */}
          <div className='flex-1 relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400' />
            <input
              type='text'
              placeholder='Buscar por email, username...'
              value={search}
              onChange={e => setSearch(e.target.value)}
              className='w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500'
            />
          </div>

          {/* Filter Buttons */}
          <div className='flex gap-2'>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'active'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Ativos
            </button>
            <button
              onClick={() => setFilter('inactive')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'inactive'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Inativos
            </button>
            <button
              onClick={() => setFilter('admin')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'admin'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Admins
            </button>
          </div>

          <button
            onClick={() => refetch()}
            className={`p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 ${isFetching ? 'opacity-50' : ''}`}
            title='Atualizar lista'
            disabled={isFetching}
          >
            <RefreshCw
              className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${isFetching ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden'>
        {loading ? (
          <div className='p-8 text-center'>
            <RefreshCw className='w-8 h-8 animate-spin text-blue-500 mx-auto mb-4' />
            <p className='text-gray-600 dark:text-gray-400'>Carregando usuários...</p>
          </div>
        ) : error ? (
          <div className='p-8 text-center'>
            <XCircle className='w-8 h-8 text-red-500 mx-auto mb-4' />
            <p className='text-red-600 dark:text-red-400 mb-4'>
              {error instanceof Error ? error.message : 'Erro ao carregar usuários'}
            </p>
            <button
              onClick={() => refetch()}
              className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
            >
              Tentar novamente
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className='p-8 text-center'>
            <Users className='w-8 h-8 text-gray-400 mx-auto mb-4' />
            <p className='text-gray-600 dark:text-gray-400'>Nenhum usuário encontrado</p>
          </div>
        ) : (
          <>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-gray-50 dark:bg-gray-700'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Usuário
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Status
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Verificação
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Criado em
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Último Login
                    </th>
                    <th className='px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                  {users.map(user => (
                    <tr key={user.id} className='hover:bg-gray-50 dark:hover:bg-gray-700/50'>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='flex items-center'>
                          <div className='w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center'>
                            <span className='text-blue-600 dark:text-blue-400 font-medium'>
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className='ml-4'>
                            <div className='flex items-center gap-2'>
                              <span className='text-sm font-medium text-gray-900 dark:text-white'>
                                {user.username}
                              </span>
                              {user.is_admin && <Shield className='w-4 h-4 text-purple-500' />}
                            </div>
                            <span className='text-sm text-gray-500'>{user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        {user.is_active ? (
                          <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'>
                            <CheckCircle className='w-3 h-3' />
                            Ativo
                          </span>
                        ) : (
                          <span className='inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'>
                            <XCircle className='w-3 h-3' />
                            Inativo
                          </span>
                        )}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        {user.is_email_verified ? (
                          <span className='text-green-600 dark:text-green-400 text-sm'>
                            Email verificado
                          </span>
                        ) : (
                          <span className='text-yellow-600 dark:text-yellow-400 text-sm'>
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400'>
                        {formatDate(user.created_at)}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400'>
                        {user.last_login ? formatDate(user.last_login) : 'Nunca'}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-right'>
                        <div className='flex items-center justify-end gap-2'>
                          <button
                            onClick={() => navigate(`/admin/users/${user.id}`)}
                            className='p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg'
                            title='Ver detalhes'
                          >
                            <Eye className='w-4 h-4' />
                          </button>
                          {!user.is_admin && (
                            <>
                              <button
                                className='p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg'
                                title='Acessar como este usuário'
                                onClick={() => {
                                  console.log('Acessar como:', user.username)
                                  toast.success(
                                    `Funcionalidade em desenvolvimento: Acessar como ${user.username}`
                                  )
                                }}
                              >
                                <LogIn className='w-4 h-4' />
                              </button>
                              <button
                                className={`p-2 rounded-lg ${
                                  blockUserMutation.isPending || unblockUserMutation.isPending
                                    ? 'opacity-50 cursor-not-allowed'
                                    : user.is_active
                                      ? 'text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30'
                                      : 'text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30'
                                }`}
                                title={user.is_active ? 'Bloquear usuário' : 'Desbloquear usuário'}
                                onClick={() =>
                                  handleBlockUser(user.id, user.username, user.is_active)
                                }
                                disabled={
                                  blockUserMutation.isPending || unblockUserMutation.isPending
                                }
                              >
                                {blockUserMutation.isPending || unblockUserMutation.isPending ? (
                                  <RefreshCw className='w-4 h-4 animate-spin' />
                                ) : (
                                  <Ban className='w-4 h-4' />
                                )}
                              </button>
                            </>
                          )}
                          <button
                            className='p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg'
                            title='Mais opções'
                          >
                            <MoreVertical className='w-4 h-4' />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className='px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between'>
              <span className='text-sm text-gray-500 dark:text-gray-400'>
                Mostrando {(page - 1) * limit + 1} - {Math.min(page * limit, total)} de {total}{' '}
                usuários
              </span>
              <div className='flex items-center gap-2'>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className='p-2 rounded-lg bg-gray-100 dark:bg-gray-700 disabled:opacity-50'
                  title='Página anterior'
                >
                  <ChevronLeft className='w-4 h-4' />
                </button>
                <span className='px-3 py-1 text-sm text-gray-700 dark:text-gray-300'>
                  Página {page} de {totalPages || 1}
                </span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages}
                  className='p-2 rounded-lg bg-gray-100 dark:bg-gray-700 disabled:opacity-50'
                  title='Próxima página'
                >
                  <ChevronRight className='w-4 h-4' />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
