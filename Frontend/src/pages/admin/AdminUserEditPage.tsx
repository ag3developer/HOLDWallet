/**
 * 🛡️ HOLD Wallet - Admin User Edit Page
 * ======================================
 *
 * Página dedicada para edição de dados do usuário.
 */

import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  Mail,
  Save,
  Shield,
  ShieldOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react'
import { getUserById, updateUser } from '@/services/admin/adminService'
import { toast } from 'react-hot-toast'

interface UserFormData {
  username: string
  email: string
  is_active: boolean
  is_admin: boolean
  is_email_verified: boolean
}

export const AdminUserEditPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [originalData, setOriginalData] = useState<UserFormData | null>(null)
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    is_active: true,
    is_admin: false,
    is_email_verified: false,
  })

  const fetchUser = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      setError(null)

      const response = await getUserById(userId)
      const userData: any = response.data || response

      const data: UserFormData = {
        username: userData.username || '',
        email: userData.email || '',
        is_active: userData.is_active ?? true,
        is_admin: userData.is_admin ?? false,
        is_email_verified: userData.is_email_verified ?? false,
      }

      setFormData(data)
      setOriginalData(data)
    } catch (err: any) {
      console.error('Erro ao buscar usuário:', err)
      setError(err.response?.data?.detail || 'Erro ao carregar dados do usuário')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  const handleChange = (field: keyof UserFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const hasChanges = () => {
    if (!originalData) return false
    return (
      formData.username !== originalData.username ||
      formData.email !== originalData.email ||
      formData.is_active !== originalData.is_active ||
      formData.is_admin !== originalData.is_admin ||
      formData.is_email_verified !== originalData.is_email_verified
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userId) return
    if (!hasChanges()) {
      toast.error('Nenhuma alteração foi feita')
      return
    }

    try {
      setSaving(true)

      await updateUser(userId, {
        username: formData.username,
        email: formData.email,
        is_active: formData.is_active,
        is_admin: formData.is_admin,
        is_email_verified: formData.is_email_verified,
      })

      toast.success('Usuário atualizado com sucesso!')
      navigate(`/admin/users/${userId}`)
    } catch (err: any) {
      console.error('Erro ao atualizar usuário:', err)
      toast.error(err.response?.data?.detail || 'Erro ao atualizar usuário')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (hasChanges()) {
      if (confirm('Você tem alterações não salvas. Deseja realmente sair?')) {
        navigate(`/admin/users/${userId}`)
      }
    } else {
      navigate(`/admin/users/${userId}`)
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

  if (error) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center'>
        <div className='text-center'>
          <AlertTriangle className='w-12 h-12 text-yellow-500 mx-auto mb-4' />
          <h2 className='text-xl font-bold text-gray-900 dark:text-white mb-2'>{error}</h2>
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
          onClick={handleCancel}
          className='flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4'
        >
          <ArrowLeft className='w-5 h-5' />
          Voltar
        </button>

        <div className='flex items-center gap-3'>
          <div className='w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center'>
            <User className='w-6 h-6 text-blue-600' />
          </div>
          <div>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>Editar Usuário</h1>
            <p className='text-gray-600 dark:text-gray-400'>ID: {userId}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className='max-w-2xl'>
        <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-6'>
          {/* Username */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              <User className='w-4 h-4 inline mr-2' />
              Nome de Usuário
            </label>
            <input
              type='text'
              value={formData.username}
              onChange={e => handleChange('username', e.target.value)}
              className='w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              placeholder='Nome de usuário'
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
              <Mail className='w-4 h-4 inline mr-2' />
              Email
            </label>
            <input
              type='email'
              value={formData.email}
              onChange={e => handleChange('email', e.target.value)}
              className='w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              placeholder='email@exemplo.com'
              required
            />
          </div>

          {/* Divider */}
          <hr className='border-gray-200 dark:border-gray-700' />

          {/* Status Toggles */}
          <div className='space-y-4'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
              Status e Permissões
            </h3>

            {/* Is Active */}
            <label className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer'>
              <div className='flex items-center gap-3'>
                <CheckCircle
                  className={`w-5 h-5 ${formData.is_active ? 'text-green-500' : 'text-gray-400'}`}
                />
                <div>
                  <p className='font-medium text-gray-900 dark:text-white'>Conta Ativa</p>
                  <p className='text-sm text-gray-500'>Permite que o usuário faça login</p>
                </div>
              </div>
              <input
                type='checkbox'
                checked={formData.is_active}
                onChange={e => handleChange('is_active', e.target.checked)}
                className='w-5 h-5 text-blue-600 rounded focus:ring-blue-500'
              />
            </label>

            {/* Is Admin */}
            <label className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer'>
              <div className='flex items-center gap-3'>
                {formData.is_admin ? (
                  <Shield className='w-5 h-5 text-purple-500' />
                ) : (
                  <ShieldOff className='w-5 h-5 text-gray-400' />
                )}
                <div>
                  <p className='font-medium text-gray-900 dark:text-white'>Administrador</p>
                  <p className='text-sm text-gray-500'>Acesso ao painel administrativo</p>
                </div>
              </div>
              <input
                type='checkbox'
                checked={formData.is_admin}
                onChange={e => handleChange('is_admin', e.target.checked)}
                className='w-5 h-5 text-purple-600 rounded focus:ring-purple-500'
              />
            </label>

            {/* Email Verified */}
            <label className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer'>
              <div className='flex items-center gap-3'>
                <Mail
                  className={`w-5 h-5 ${formData.is_email_verified ? 'text-green-500' : 'text-gray-400'}`}
                />
                <div>
                  <p className='font-medium text-gray-900 dark:text-white'>Email Verificado</p>
                  <p className='text-sm text-gray-500'>Marcar email como verificado</p>
                </div>
              </div>
              <input
                type='checkbox'
                checked={formData.is_email_verified}
                onChange={e => handleChange('is_email_verified', e.target.checked)}
                className='w-5 h-5 text-green-600 rounded focus:ring-green-500'
              />
            </label>
          </div>

          {/* Actions */}
          <div className='flex items-center gap-4 pt-4'>
            <button
              type='submit'
              disabled={saving || !hasChanges()}
              className='flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              {saving ? (
                <>
                  <RefreshCw className='w-5 h-5 animate-spin' />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className='w-5 h-5' />
                  Salvar Alterações
                </>
              )}
            </button>

            <button
              type='button'
              onClick={handleCancel}
              disabled={saving}
              className='px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors'
            >
              Cancelar
            </button>
          </div>

          {/* Changes indicator */}
          {hasChanges() && (
            <div className='flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm'>
              <AlertTriangle className='w-4 h-4' />
              Você tem alterações não salvas
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
