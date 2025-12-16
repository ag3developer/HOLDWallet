import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Star,
  CheckCircle,
  Award,
  TrendingUp,
  Users,
  Shield,
  Loader2,
  AlertCircle,
  Edit2,
  Settings,
  ExternalLink,
} from 'lucide-react'
import { useMyTraderProfile } from '@/hooks/useTraderProfile'
import { TraderProfile } from '@/services/traderProfileService'

interface UserProfileSectionProps {
  readonly token?: string | null
  readonly onEdit?: () => void
  readonly showEditButton?: boolean
  readonly showProfileLink?: boolean
}

export function UserProfileSection({
  token,
  onEdit,
  showEditButton = true,
  showProfileLink = true,
}: Readonly<UserProfileSectionProps>) {
  const navigate = useNavigate()

  // Usar o novo hook com cache React Query + localStorage
  const { data: profile, isLoading: loading, error: queryError } = useMyTraderProfile()

  const error = queryError ? String(queryError) : null

  const getVerificationBadge = (profile: TraderProfile) => {
    switch (profile.verification_level) {
      case 'premium':
        return (
          <div className='flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-xs'>
            <Award className='w-3 h-3 text-yellow-600 dark:text-yellow-400' />
            <span className='font-medium text-yellow-700 dark:text-yellow-300'>Premium</span>
          </div>
        )
      case 'advanced':
        return (
          <div className='flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full text-xs'>
            <Shield className='w-3 h-3 text-blue-600 dark:text-blue-400' />
            <span className='font-medium text-blue-700 dark:text-blue-300'>Advanced</span>
          </div>
        )
      case 'basic':
        return (
          <div className='flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs'>
            <CheckCircle className='w-3 h-3 text-gray-600 dark:text-gray-400' />
            <span className='font-medium text-gray-700 dark:text-gray-300'>Verificado</span>
          </div>
        )
      default:
        return null
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className='flex gap-0.5'>
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= Math.round(rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-300 text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4'>
        <div className='flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400'>
          <Loader2 className='w-4 h-4 animate-spin' />
          Carregando seu perfil...
        </div>
      </div>
    )
  }

  if (!token) {
    console.log('[UserProfileSection] ❌ No token provided')
    return (
      <div className='bg-gray-50 dark:bg-gray-800 rounded-lg shadow p-4 text-center'>
        <p className='text-sm text-gray-600 dark:text-gray-400'>
          Faça login para visualizar seu perfil de trader
        </p>
      </div>
    )
  }

  if (error || !profile) {
    console.log('[UserProfileSection] ⚠️ Error or no profile:', { error, profile })
    return (
      <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4'>
        <div className='flex items-start gap-3'>
          <AlertCircle className='w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5' />
          <div className='flex-1'>
            <p className='text-sm font-medium text-yellow-800 dark:text-yellow-300'>
              {error ? 'Erro ao carregar perfil' : 'Perfil não configurado'}
            </p>
            <p className='text-xs text-yellow-700 dark:text-yellow-400 mt-1'>
              {error ? String(error) : 'Complete seu perfil de trader para criar ordens P2P'}
            </p>
            {onEdit && (
              <button
                onClick={onEdit}
                className='mt-3 w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-medium rounded-lg transition-colors'
              >
                {error ? 'Tentar Novamente' : 'Criar Perfil de Trader'}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  console.log('[UserProfileSection] ✅ Profile loaded:', profile)

  return (
    <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-4 sticky top-4'>
      {/* Header */}
      <div className='flex items-start justify-between mb-4'>
        <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>Seu Perfil</h4>
        {showEditButton && onEdit && (
          <button
            onClick={onEdit}
            className='p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            title='Editar perfil'
          >
            <Edit2 className='w-4 h-4' />
          </button>
        )}
      </div>

      {/* Avatar e Nome */}
      <div className='flex items-start gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700'>
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.display_name}
            className='w-12 h-12 rounded-full object-cover flex-shrink-0'
          />
        ) : (
          <div className='w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0'>
            {profile.display_name && profile.display_name.length > 0
              ? profile.display_name.charAt(0).toUpperCase()
              : '?'}
          </div>
        )}

        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 mb-1'>
            <h3 className='font-semibold text-gray-900 dark:text-white truncate'>
              {profile.display_name || 'Trader'}
            </h3>
            {profile.is_verified && (
              <CheckCircle className='w-4 h-4 text-green-500 flex-shrink-0' />
            )}
          </div>
          {profile.bio && (
            <p className='text-xs text-gray-600 dark:text-gray-400 line-clamp-2'>{profile.bio}</p>
          )}
        </div>
      </div>

      {/* Verification Badge */}
      {getVerificationBadge(profile) && <div className='mb-4'>{getVerificationBadge(profile)}</div>}

      {/* Rating Section */}
      <div className='mb-4 pb-4 border-b border-gray-200 dark:border-gray-700'>
        <div className='flex items-center gap-2 mb-2'>
          <div className='flex items-center gap-1'>{renderStars(profile.average_rating || 0)}</div>
          <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
            {(profile.average_rating || 0).toFixed(1)}
          </span>
          <span className='text-xs text-gray-600 dark:text-gray-400'>
            ({profile.total_reviews || 0} avaliações)
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className='grid grid-cols-2 gap-3 mb-4'>
        {/* Success Rate */}
        <div className='flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg'>
          <TrendingUp className='w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0' />
          <div>
            <p className='text-xs text-gray-600 dark:text-gray-400'>Taxa de Sucesso</p>
            <p className='text-sm font-semibold text-gray-900 dark:text-white'>
              {((profile.success_rate || 0) * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Total Trades */}
        <div className='flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg'>
          <Users className='w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0' />
          <div>
            <p className='text-xs text-gray-600 dark:text-gray-400'>Negociações</p>
            <p className='text-sm font-semibold text-gray-900 dark:text-white'>
              {profile.total_trades || 0}
            </p>
          </div>
        </div>

        {/* Completed Trades */}
        <div className='flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg'>
          <CheckCircle className='w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0' />
          <div>
            <p className='text-xs text-gray-600 dark:text-gray-400'>Concluídas</p>
            <p className='text-sm font-semibold text-gray-900 dark:text-white'>
              {profile.completed_trades || 0}
            </p>
          </div>
        </div>

        {/* Status */}
        <div className='flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg'>
          <div
            className={`w-2 h-2 rounded-full ${profile.is_active ? 'bg-green-500' : 'bg-gray-500'}`}
          />
          <div>
            <p className='text-xs text-gray-600 dark:text-gray-400'>Status</p>
            <p className='text-sm font-semibold text-gray-900 dark:text-white'>
              {profile.is_active ? 'Ativo' : 'Inativo'}
            </p>
          </div>
        </div>
      </div>

      {/* Order Limits */}
      {(profile.min_order_amount || profile.max_order_amount) && (
        <div className='pt-3 border-t border-gray-200 dark:border-gray-700'>
          <p className='text-xs font-medium text-gray-600 dark:text-gray-400 mb-2'>
            Limites de Ordem
          </p>
          <div className='space-y-1 text-xs'>
            {profile.min_order_amount && (
              <div className='flex justify-between text-gray-700 dark:text-gray-300'>
                <span>Mínimo:</span>
                <span className='font-medium'>
                  R${' '}
                  {profile.min_order_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {profile.max_order_amount && (
              <div className='flex justify-between text-gray-700 dark:text-gray-300'>
                <span>Máximo:</span>
                <span className='font-medium'>
                  R${' '}
                  {profile.max_order_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className='mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2'>
        {showProfileLink && (
          <button
            onClick={() => navigate('/profile')}
            className='w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-sm font-medium'
            title='Ir para perfil completo'
          >
            <Settings className='w-4 h-4' />
            Perfil Completo
          </button>
        )}

        {onEdit && showEditButton && (
          <button
            onClick={onEdit}
            className='w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors text-sm font-medium'
            title='Editar perfil de trader'
          >
            <Edit2 className='w-4 h-4' />
            Editar Trader
          </button>
        )}
      </div>
    </div>
  )
}

export default UserProfileSection
