import React from 'react'
import { Star, CheckCircle, Award, TrendingUp, Users, Shield } from 'lucide-react'
import { TraderProfile } from '@/services/traderProfileService'

interface TraderProfileCardProps {
  profile: TraderProfile
  onClick?: () => void
  showContact?: boolean
  onContact?: () => void
}

export function TraderProfileCard({
  profile,
  onClick,
  showContact = false,
  onContact,
}: TraderProfileCardProps) {
  const getVerificationBadge = () => {
    switch (profile.verification_level) {
      case 'premium':
        return <Shield className='w-4 h-4 text-yellow-500' />
      case 'advanced':
        return <CheckCircle className='w-4 h-4 text-blue-500' />
      case 'basic':
        return <CheckCircle className='w-4 h-4 text-gray-500' />
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
            className={`w-3 h-3 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-300 text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md dark:hover:shadow-gray-700' : ''
      }`}
    >
      {/* Header */}
      <div className='flex items-start justify-between mb-3'>
        <div className='flex items-center gap-2 flex-1'>
          {/* Avatar */}
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className='w-10 h-10 rounded-full object-cover'
            />
          ) : (
            <div className='w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold'>
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-1'>
              <h3 className='font-semibold text-gray-900 dark:text-white truncate'>
                {profile.display_name}
              </h3>
              {profile.is_verified && getVerificationBadge()}
            </div>
            <p className='text-xs text-gray-600 dark:text-gray-400'>
              ID: {profile.id.slice(0, 8)}...
            </p>
          </div>
        </div>
      </div>

      {/* Rating and Reviews */}
      <div className='flex items-center gap-2 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700'>
        <div className='flex items-center gap-1'>
          {renderStars(Math.round(profile.average_rating))}
        </div>
        <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
          {profile.average_rating.toFixed(1)}
        </span>
        <span className='text-xs text-gray-600 dark:text-gray-400'>({profile.total_reviews})</span>
      </div>

      {/* Stats Grid */}
      <div className='grid grid-cols-2 gap-3 mb-3'>
        {/* Success Rate */}
        <div className='flex items-center gap-2'>
          <TrendingUp className='w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0' />
          <div>
            <p className='text-xs text-gray-600 dark:text-gray-400'>Taxa de Sucesso</p>
            <p className='font-semibold text-gray-900 dark:text-white text-sm'>
              {profile.success_rate.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Trades */}
        <div className='flex items-center gap-2'>
          <Users className='w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0' />
          <div>
            <p className='text-xs text-gray-600 dark:text-gray-400'>Negociações</p>
            <p className='font-semibold text-gray-900 dark:text-white text-sm'>
              {profile.total_trades}
            </p>
          </div>
        </div>
      </div>

      {/* Bio Preview */}
      {profile.bio && (
        <p className='text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-3'>{profile.bio}</p>
      )}

      {/* Payment Methods */}
      {profile.accepted_payment_methods && (
        <div className='mb-3'>
          <p className='text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
            Métodos de Pagamento
          </p>
          <div className='flex flex-wrap gap-1'>
            {profile.accepted_payment_methods.split(',').map(method => (
              <span
                key={method.trim()}
                className='inline-block px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded'
              >
                {method.trim()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Order Limits */}
      {(profile.min_order_amount || profile.max_order_amount) && (
        <div className='mb-3 text-xs text-gray-600 dark:text-gray-400'>
          <p className='font-medium'>Limite de Ordem</p>
          <p>
            R$ {profile.min_order_amount?.toLocaleString() || '0'} - R${' '}
            {profile.max_order_amount?.toLocaleString() || 'Sem limite'}
          </p>
        </div>
      )}

      {/* Status Badge */}
      <div className='mb-3 pb-3 border-t border-gray-200 dark:border-gray-700 pt-3'>
        <div className='flex items-center gap-1'>
          <div
            className={`w-2 h-2 rounded-full ${profile.is_active ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span className='text-xs font-medium text-gray-700 dark:text-gray-300'>
            {profile.is_active ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </div>

      {/* Contact Button */}
      {showContact && (
        <button
          onClick={e => {
            e.stopPropagation()
            onContact?.()
          }}
          className='w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors'
        >
          Negociar com este Trader
        </button>
      )}
    </div>
  )
}
