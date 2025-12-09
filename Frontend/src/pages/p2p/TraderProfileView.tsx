import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { UUID } from 'node:crypto'
import {
  ArrowLeft,
  Star,
  TrendingUp,
  Users,
  Clock,
  MessageSquare,
  Shield,
  Loader2,
  AlertCircle,
  Award,
} from 'lucide-react'
import { traderProfileService, TraderProfile, TraderStats } from '@/services/traderProfileService'

export function TraderProfileView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<TraderProfile | null>(null)
  const [stats, setStats] = useState<TraderStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'stats'>('overview')

  useEffect(() => {
    const fetchProfile = async () => {
      if (!id) return

      try {
        setLoading(true)
        setError(null)
        const profileData = await traderProfileService.getPublicProfile(id as UUID)
        setProfile(profileData)

        // Fetch stats
        const statsData = await traderProfileService.getTraderStats(id as UUID, 30)
        setStats(statsData)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erro ao carregar perfil'
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [id])

  if (loading) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center'>
        <div className='flex flex-col items-center gap-4'>
          <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
          <p className='text-gray-600 dark:text-gray-400'>Carregando perfil...</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
        <div className='max-w-4xl mx-auto px-4 py-8'>
          <button
            onClick={() => navigate('/p2p')}
            className='flex items-center gap-2 mb-6 text-blue-600 hover:text-blue-700'
          >
            <ArrowLeft className='w-4 h-4' />
            Voltar
          </button>

          <div className='p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3'>
            <AlertCircle className='w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0' />
            <div>
              <p className='font-medium text-red-700 dark:text-red-300'>Erro</p>
              <p className='text-sm text-red-600 dark:text-red-400'>
                {error || 'Perfil não encontrado'}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const getVerificationBadge = () => {
    switch (profile.verification_level) {
      case 'premium':
        return (
          <div className='flex items-center gap-1 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 rounded-full'>
            <Award className='w-4 h-4 text-yellow-600 dark:text-yellow-400' />
            <span className='text-sm font-medium text-yellow-700 dark:text-yellow-300'>
              Premium
            </span>
          </div>
        )
      case 'advanced':
        return (
          <div className='flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full'>
            <Shield className='w-4 h-4 text-blue-600 dark:text-blue-400' />
            <span className='text-sm font-medium text-blue-700 dark:text-blue-300'>Advanced</span>
          </div>
        )
      case 'basic':
        return (
          <div className='flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full'>
            <Shield className='w-4 h-4 text-gray-600 dark:text-gray-400' />
            <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>Verificado</span>
          </div>
        )
      default:
        return null
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className='flex gap-1'>
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= Math.round(rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'fill-gray-300 text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      {/* Header */}
      <div className='bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10'>
        <div className='max-w-4xl mx-auto px-4 py-4'>
          <button
            onClick={() => navigate('/p2p')}
            className='flex items-center gap-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mb-4'
          >
            <ArrowLeft className='w-4 h-4' />
            Voltar
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className='max-w-4xl mx-auto px-4 py-8'>
        {/* Profile Header */}
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-6'>
          <div className='flex flex-col md:flex-row gap-6 mb-6'>
            {/* Avatar */}
            <div className='flex-shrink-0'>
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className='w-32 h-32 rounded-full object-cover border-4 border-blue-500'
                />
              ) : (
                <div className='w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-5xl border-4 border-blue-500'>
                  {profile.display_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className='mt-3'>{getVerificationBadge()}</div>
            </div>

            {/* Info */}
            <div className='flex-1'>
              <h1 className='text-3xl font-bold text-gray-900 dark:text-white mb-2'>
                {profile.display_name}
              </h1>

              {/* Rating */}
              <div className='flex items-center gap-3 mb-4'>
                <div className='flex items-center gap-1'>{renderStars(profile.average_rating)}</div>
                <span className='text-xl font-semibold text-gray-900 dark:text-white'>
                  {profile.average_rating.toFixed(1)}
                </span>
                <span className='text-gray-600 dark:text-gray-400'>
                  ({profile.total_reviews} avaliações)
                </span>
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className='text-gray-700 dark:text-gray-300 mb-4'>{profile.bio}</p>
              )}

              {/* Status */}
              <div className='flex items-center gap-2'>
                <div
                  className={`w-3 h-3 rounded-full ${
                    profile.is_active ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className='font-medium text-gray-700 dark:text-gray-300'>
                  {profile.is_active ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-gray-200 dark:border-gray-700'>
            <div>
              <p className='text-sm text-gray-600 dark:text-gray-400 mb-1'>Taxa de Sucesso</p>
              <div className='flex items-center gap-2'>
                <TrendingUp className='w-5 h-5 text-green-600' />
                <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                  {profile.success_rate.toFixed(1)}%
                </p>
              </div>
            </div>

            <div>
              <p className='text-sm text-gray-600 dark:text-gray-400 mb-1'>Total de Negociações</p>
              <div className='flex items-center gap-2'>
                <Users className='w-5 h-5 text-blue-600' />
                <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                  {profile.total_trades}
                </p>
              </div>
            </div>

            <div>
              <p className='text-sm text-gray-600 dark:text-gray-400 mb-1'>Completadas</p>
              <div className='flex items-center gap-2'>
                <Award className='w-5 h-5 text-purple-600' />
                <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                  {profile.completed_trades}
                </p>
              </div>
            </div>

            <div>
              <p className='text-sm text-gray-600 dark:text-gray-400 mb-1'>Tempo de Resposta</p>
              <div className='flex items-center gap-2'>
                <Clock className='w-5 h-5 text-orange-600' />
                <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                  {profile.average_response_time
                    ? `${(profile.average_response_time / 60).toFixed(0)}m`
                    : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Details Sections */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          {/* Left Column */}
          <div className='lg:col-span-2 space-y-6'>
            {/* Tabs */}
            <div className='flex gap-4 border-b border-gray-200 dark:border-gray-700'>
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                Visão Geral
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'stats'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                Estatísticas
              </button>
            </div>

            {activeTab === 'overview' && (
              <div className='space-y-4'>
                {/* Payment Methods */}
                {profile.accepted_payment_methods && (
                  <div className='bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700'>
                    <h3 className='font-semibold text-gray-900 dark:text-white mb-3'>
                      Métodos de Pagamento Aceitos
                    </h3>
                    <div className='flex flex-wrap gap-2'>
                      {profile.accepted_payment_methods.split(',').map(method => (
                        <span
                          key={method.trim()}
                          className='px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium'
                        >
                          {method.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Order Limits */}
                {(profile.min_order_amount || profile.max_order_amount) && (
                  <div className='bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700'>
                    <h3 className='font-semibold text-gray-900 dark:text-white mb-3'>
                      Limites de Ordem
                    </h3>
                    <div className='space-y-2'>
                      <div className='flex justify-between'>
                        <span className='text-gray-600 dark:text-gray-400'>Mínimo:</span>
                        <span className='font-medium text-gray-900 dark:text-white'>
                          R$ {profile.min_order_amount?.toLocaleString('pt-BR') || '0'}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-gray-600 dark:text-gray-400'>Máximo:</span>
                        <span className='font-medium text-gray-900 dark:text-white'>
                          R$ {profile.max_order_amount?.toLocaleString('pt-BR') || 'Sem limite'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Member Since */}
                <div className='bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700'>
                  <h3 className='font-semibold text-gray-900 dark:text-white mb-3'>Informações</h3>
                  <div className='space-y-2'>
                    <div className='flex justify-between'>
                      <span className='text-gray-600 dark:text-gray-400'>Membro desde:</span>
                      <span className='font-medium text-gray-900 dark:text-white'>
                        {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-gray-600 dark:text-gray-400'>Última atualização:</span>
                      <span className='font-medium text-gray-900 dark:text-white'>
                        {new Date(profile.updated_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'stats' && (
              <div className='bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700'>
                {stats.length > 0 ? (
                  <div className='space-y-4'>
                    {stats.map(stat => (
                      <div
                        key={stat.id}
                        className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg'
                      >
                        <div>
                          <p className='text-sm font-medium text-gray-900 dark:text-white'>
                            {new Date(stat.date).toLocaleDateString('pt-BR')}
                          </p>
                          <p className='text-xs text-gray-600 dark:text-gray-400'>
                            {stat.trades_completed} negociações
                          </p>
                        </div>
                        <div className='text-right'>
                          <p className='text-sm font-medium text-green-600 dark:text-green-400'>
                            {stat.success_rate.toFixed(1)}%
                          </p>
                          <p className='text-xs text-gray-600 dark:text-gray-400'>
                            R$ {stat.total_volume_brl.toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className='text-center text-gray-600 dark:text-gray-400'>
                    Sem dados de estatísticas ainda
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className='space-y-4'>
            {/* Contact Card */}
            <div className='bg-blue-600 dark:bg-blue-700 rounded-lg p-6 text-white'>
              <h3 className='text-lg font-semibold mb-4'>Pronto para Negociar?</h3>
              <p className='text-blue-100 mb-4 text-sm'>
                Entre em contato com {profile.display_name} e comece sua negociação agora mesmo.
              </p>
              <button className='w-full py-2 px-4 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2'>
                <MessageSquare className='w-4 h-4' />
                Abrir Chat
              </button>
            </div>

            {/* Quick Info */}
            <div className='bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-3'>
              <div className='flex items-center gap-2'>
                <div className='w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center'>
                  <div className='w-2 h-2 rounded-full bg-green-600 dark:bg-green-400' />
                </div>
                <span className='text-sm text-gray-700 dark:text-gray-300'>Atualmente Ativo</span>
              </div>

              <div className='flex items-center gap-2'>
                <div className='w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center'>
                  <TrendingUp className='w-4 h-4 text-blue-600 dark:text-blue-400' />
                </div>
                <div>
                  <p className='text-xs text-gray-600 dark:text-gray-400'>Taxa de Sucesso</p>
                  <p className='text-sm font-semibold text-gray-900 dark:text-white'>
                    {profile.success_rate.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className='flex items-center gap-2'>
                <div className='w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center'>
                  <Users className='w-4 h-4 text-purple-600 dark:text-purple-400' />
                </div>
                <div>
                  <p className='text-xs text-gray-600 dark:text-gray-400'>Total Negociações</p>
                  <p className='text-sm font-semibold text-gray-900 dark:text-white'>
                    {profile.total_trades}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
