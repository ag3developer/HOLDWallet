import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { useUserActivities } from '@/hooks/useUserActivities'
import useKYC from '@/hooks/useKYC'
import { useUserProfile } from '@/hooks/useUserProfile'
import { KYCStatus, KYCLevel, DocumentType, DocumentStatus } from '@/services/kyc'
import UserActivityService from '@/services/userActivityService'
import { UserProfileSection } from '@/components/trader/UserProfileSection'
import { toast } from 'react-hot-toast'
import {
  User,
  Settings,
  Shield,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Bell,
  CreditCard,
  History,
  Award,
  Star,
  Check,
  AlertCircle,
  TrendingUp,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Trophy,
  ClipboardList,
  Lightbulb,
} from 'lucide-react'

export const ProfilePage = () => {
  const navigate = useNavigate()
  const { user, token } = useAuthStore()

  // User Profile Hook - Dados reais do backend
  const {
    profile,
    isLoadingProfile,
    notificationSettings: backendNotifications,
    updateNotificationSettings,
    securitySettings: backendSecurity,
    isLoadingSecurity,
    changePassword,
    loadNotificationSettings,
    loadSecuritySettings,
  } = useUserProfile()

  // KYC Hook - Dados reais do backend
  const { verification, loading: kycLoading } = useKYC()

  // Activities Hook
  const { data: activitiesData, isLoading: isLoadingActivities } = useUserActivities({
    limit: 20,
    enabled: true,
  })

  const [activeTab, setActiveTab] = useState<
    'profile' | 'security' | 'notifications' | 'activity' | 'trader' | 'kyc'
  >('profile')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Load notification settings on tab change
  useEffect(() => {
    if (activeTab === 'notifications' && !backendNotifications) {
      loadNotificationSettings()
    }
    if (activeTab === 'security' && !backendSecurity) {
      loadSecuritySettings()
    }
  }, [
    activeTab,
    backendNotifications,
    backendSecurity,
    loadNotificationSettings,
    loadSecuritySettings,
  ])

  // Sync notification settings from backend
  useEffect(() => {
    if (backendNotifications) {
      setNotificationSettings({
        tradeAlerts: backendNotifications.trade_alerts,
        priceAlerts: backendNotifications.price_alerts,
        securityAlerts: backendNotifications.security_alerts,
        marketingEmails: backendNotifications.marketing_emails,
        weeklyReport: backendNotifications.weekly_report,
      })
    }
  }, [backendNotifications])

  // Sync security settings from backend
  useEffect(() => {
    if (backendSecurity) {
      setSecuritySettings(prev => ({
        ...prev,
        twoFactorEnabled: backendSecurity.two_factor_enabled,
      }))
    }
  }, [backendSecurity])

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: true,
    emailNotifications: true,
    smsNotifications: false,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [notificationSettings, setNotificationSettings] = useState({
    tradeAlerts: true,
    priceAlerts: true,
    securityAlerts: true,
    marketingEmails: false,
    weeklyReport: true,
  })

  const handleNotificationSettingChange = async (key: string, value: boolean) => {
    // Update local state immediately
    setNotificationSettings(prev => ({ ...prev, [key]: value }))

    // Map local keys to backend keys
    const keyMap: Record<string, string> = {
      tradeAlerts: 'trade_alerts',
      priceAlerts: 'price_alerts',
      securityAlerts: 'security_alerts',
      marketingEmails: 'marketing_emails',
      weeklyReport: 'weekly_report',
    }

    const backendKey = keyMap[key]
    if (backendKey) {
      await updateNotificationSettings({ [backendKey]: value })
    }
  }

  const handlePasswordChange = async () => {
    if (securitySettings.newPassword !== securitySettings.confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    const success = await changePassword({
      current_password: securitySettings.currentPassword,
      new_password: securitySettings.newPassword,
      confirm_password: securitySettings.confirmPassword,
    })

    if (success) {
      setSecuritySettings(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }))
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login':
        return <User className='w-4 h-4 text-blue-600' />
      case 'trade':
        return <CreditCard className='w-4 h-4 text-green-600' />
      case 'security':
        return <Shield className='w-4 h-4 text-red-600' />
      default:
        return <History className='w-4 h-4 text-gray-600' />
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'success':
        return {
          bg: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
          label: 'Sucesso',
        }
      case 'failed':
        return {
          bg: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
          label: 'Falha',
        }
      default:
        return {
          bg: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
          label: 'Pendente',
        }
    }
  }

  return (
    <div className='space-y-4 md:space-y-6 p-4 md:p-0'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4'>
        <div>
          <h1 className='text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 md:gap-3'>
            <div className='w-8 h-8 md:w-10 md:h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg md:rounded-xl flex items-center justify-center'>
              <User className='w-4 h-4 md:w-6 md:h-6 text-white' />
            </div>
            Meu Perfil
          </h1>
          <p className='text-sm md:text-base text-gray-600 dark:text-gray-300 mt-1'>
            Gerencie suas informações pessoais e configurações
          </p>
        </div>
      </div>

      {/* Tabs - Mobile Scrollable */}
      <div className='overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0'>
        <div className='flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg min-w-max md:min-w-0'>
          {[
            { id: 'profile', label: 'Perfil', icon: User },
            { id: 'trader', label: 'Trader', icon: TrendingUp },
            { id: 'kyc', label: 'KYC', icon: Lock },
            { id: 'security', label: 'Segurança', icon: Shield },
            { id: 'notifications', label: 'Notificações', icon: Bell },
            { id: 'activity', label: 'Atividade', icon: History },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center justify-center gap-1.5 md:gap-2 py-2 md:py-3 px-3 md:px-4 rounded-md font-medium transition-all text-xs md:text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <tab.icon className='w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0' />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Profile Tab - Dados Reais do Usuário */}
      {activeTab === 'profile' && (
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6'>
          {/* Loading Indicator */}
          {isLoadingProfile && (
            <div className='lg:col-span-3 flex items-center justify-center py-8'>
              <Loader2 className='w-8 h-8 animate-spin text-blue-600' />
              <span className='ml-2 text-gray-600 dark:text-gray-400'>Carregando perfil...</span>
            </div>
          )}

          {!isLoadingProfile && (
            <>
              {/* Card do Usuário */}
              <div className='lg:col-span-1 space-y-4'>
                {/* Avatar e Info Básica */}
                <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6'>
                  <div className='text-center'>
                    <div className='relative inline-block'>
                      <div className='w-24 h-24 md:w-32 md:h-32 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-2xl md:text-4xl font-bold text-white mb-3 md:mb-4'>
                        {(profile?.username || user?.username || 'U').substring(0, 2).toUpperCase()}
                      </div>
                    </div>

                    <h2 className='text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-1'>
                      @{profile?.username || user?.username || 'usuário'}
                    </h2>
                    <p className='text-sm text-gray-500 dark:text-gray-400 mb-3 break-all'>
                      {profile?.email || user?.email}
                    </p>

                    {/* Status da conta */}
                    <div className='flex items-center justify-center gap-2 text-xs md:text-sm'>
                      {profile?.is_active !== false ? (
                        <span className='flex items-center gap-1.5 text-green-600 dark:text-green-400'>
                          <Check className='w-3.5 h-3.5' />
                          Conta Ativa
                        </span>
                      ) : (
                        <span className='flex items-center gap-1.5 text-red-600 dark:text-red-400'>
                          <AlertCircle className='w-3.5 h-3.5' />
                          Conta Inativa
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status KYC Resumido */}
                <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4'>
                  <h4 className='text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2'>
                    <Shield className='w-4 h-4 text-blue-500' />
                    Verificação KYC
                  </h4>
                  {profile?.kyc_status ? (
                    <div className='space-y-2'>
                      <div className='flex items-center justify-between'>
                        <span className='text-sm text-gray-500'>Status</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            profile.kyc_status === 'approved'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : profile.kyc_status === 'pending' ||
                                  profile.kyc_status === 'submitted'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {profile.kyc_status === 'approved'
                            ? 'Aprovado'
                            : profile.kyc_status === 'pending'
                              ? 'Pendente'
                              : profile.kyc_status === 'submitted'
                                ? 'Em análise'
                                : profile.kyc_status}
                        </span>
                      </div>
                      {profile.kyc_level && (
                        <div className='flex items-center justify-between'>
                          <span className='text-sm text-gray-500'>Nível</span>
                          <span className='text-sm font-medium text-gray-900 dark:text-white capitalize'>
                            {profile.kyc_level}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className='text-center py-2'>
                      <p className='text-sm text-gray-500 mb-2'>KYC não iniciado</p>
                      <button
                        onClick={() => setActiveTab('kyc')}
                        className='text-xs text-blue-600 hover:text-blue-700 font-medium'
                      >
                        Completar verificação →
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Dados Pessoais (do KYC) */}
              <div className='lg:col-span-2 space-y-4'>
                {/* Card Principal de Dados */}
                <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6'>
                  <div className='flex items-center justify-between mb-4'>
                    <h3 className='text-base md:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
                      <User className='w-5 h-5 text-blue-500' />
                      Dados Pessoais
                    </h3>
                    {profile?.kyc_status === 'approved' && profile?.full_name && (
                      <span className='flex items-center gap-1 text-xs text-green-600 dark:text-green-400'>
                        <Check className='w-3.5 h-3.5' />
                        Verificado via KYC
                      </span>
                    )}
                  </div>

                  {/* Se tem dados KYC, mostra */}
                  {profile?.full_name ? (
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      <div className='space-y-1'>
                        <label className='text-xs text-gray-500 dark:text-gray-400'>
                          Nome Completo
                        </label>
                        <p className='text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2'>
                          <User className='w-4 h-4 text-gray-400' />
                          {profile.full_name}
                        </p>
                      </div>

                      <div className='space-y-1'>
                        <label className='text-xs text-gray-500 dark:text-gray-400'>Email</label>
                        <p className='text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2'>
                          <Mail className='w-4 h-4 text-gray-400' />
                          {profile.email}
                        </p>
                      </div>

                      {profile.phone && (
                        <div className='space-y-1'>
                          <label className='text-xs text-gray-500 dark:text-gray-400'>
                            Telefone
                          </label>
                          <p className='text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2'>
                            <Phone className='w-4 h-4 text-gray-400' />
                            {profile.phone}
                          </p>
                        </div>
                      )}

                      {(profile.city || profile.state || profile.country) && (
                        <div className='space-y-1'>
                          <label className='text-xs text-gray-500 dark:text-gray-400'>
                            Localização
                          </label>
                          <p className='text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2'>
                            <MapPin className='w-4 h-4 text-gray-400' />
                            {[profile.city, profile.state, profile.country]
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                        </div>
                      )}

                      {profile.birth_date && (
                        <div className='space-y-1'>
                          <label className='text-xs text-gray-500 dark:text-gray-400'>
                            Data de Nascimento
                          </label>
                          <p className='text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2'>
                            <Calendar className='w-4 h-4 text-gray-400' />
                            {new Date(profile.birth_date).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      )}

                      {profile.nationality && (
                        <div className='space-y-1'>
                          <label className='text-xs text-gray-500 dark:text-gray-400'>
                            Nacionalidade
                          </label>
                          <p className='text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2'>
                            <Globe className='w-4 h-4 text-gray-400' />
                            {profile.nationality === 'BR' ? 'Brasileiro(a)' : profile.nationality}
                          </p>
                        </div>
                      )}

                      {profile.occupation && (
                        <div className='space-y-1'>
                          <label className='text-xs text-gray-500 dark:text-gray-400'>
                            Profissão
                          </label>
                          <p className='text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2'>
                            <Award className='w-4 h-4 text-gray-400' />
                            {profile.occupation}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Se NÃO tem dados KYC */
                    <div className='text-center py-8'>
                      <div className='w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4'>
                        <FileText className='w-8 h-8 text-gray-400' />
                      </div>
                      <h4 className='text-lg font-medium text-gray-900 dark:text-white mb-2'>
                        Dados pessoais não preenchidos
                      </h4>
                      <p className='text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto'>
                        Complete sua verificação KYC para adicionar seus dados pessoais como nome
                        completo, telefone, endereço e documento.
                      </p>
                      <button
                        onClick={() => navigate('/kyc')}
                        className='inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
                      >
                        <Shield className='w-4 h-4' />
                        Completar KYC
                      </button>
                    </div>
                  )}
                </div>

                {/* Dados da Conta (sempre visíveis) */}
                <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6'>
                  <h3 className='text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
                    <Settings className='w-5 h-5 text-blue-500' />
                    Dados da Conta
                  </h3>

                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <div className='space-y-1'>
                      <label className='text-xs text-gray-500 dark:text-gray-400'>
                        Conta criada em
                      </label>
                      <p className='text-sm font-medium text-gray-900 dark:text-white'>
                        {profile?.created_at
                          ? new Date(profile.created_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })
                          : '-'}
                      </p>
                    </div>

                    <div className='space-y-1'>
                      <label className='text-xs text-gray-500 dark:text-gray-400'>
                        Último acesso
                      </label>
                      <p className='text-sm font-medium text-gray-900 dark:text-white'>
                        {profile?.last_login
                          ? new Date(profile.last_login).toLocaleString('pt-BR')
                          : 'Primeiro acesso'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* KYC Tab - Integrado com Backend */}
      {activeTab === 'kyc' && (
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          <div className='lg:col-span-2'>
            <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
                <Shield className='w-5 h-5 text-blue-600' />
                Verificação KYC (Know Your Customer)
              </h3>
              <p className='text-gray-600 dark:text-gray-400 mb-6'>
                Complete sua verificação de identidade para desbloquear funcionalidades avançadas e
                aumentar seus limites de transação.
              </p>

              {kycLoading ? (
                <div className='flex items-center justify-center py-12'>
                  <Loader2 className='w-8 h-8 text-blue-600 animate-spin' />
                  <span className='ml-3 text-gray-600 dark:text-gray-400'>
                    Carregando status KYC...
                  </span>
                </div>
              ) : (
                <div className='space-y-6'>
                  {/* Status Card Dinâmico */}
                  {verification ? (
                    <div
                      className={`p-4 rounded-lg border ${
                        verification.status === KYCStatus.APPROVED
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : verification.status === KYCStatus.REJECTED
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                            : verification.status === KYCStatus.UNDER_REVIEW
                              ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      <div className='flex items-start gap-3'>
                        {verification.status === KYCStatus.APPROVED ? (
                          <CheckCircle className='w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5' />
                        ) : verification.status === KYCStatus.REJECTED ? (
                          <XCircle className='w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5' />
                        ) : verification.status === KYCStatus.UNDER_REVIEW ? (
                          <Clock className='w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5' />
                        ) : (
                          <AlertCircle className='w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5' />
                        )}
                        <div>
                          <h4
                            className={`font-semibold ${
                              verification.status === KYCStatus.APPROVED
                                ? 'text-green-900 dark:text-green-200'
                                : verification.status === KYCStatus.REJECTED
                                  ? 'text-red-900 dark:text-red-200'
                                  : verification.status === KYCStatus.UNDER_REVIEW
                                    ? 'text-yellow-900 dark:text-yellow-200'
                                    : 'text-blue-900 dark:text-blue-200'
                            }`}
                          >
                            {verification.status === KYCStatus.APPROVED && (
                              <span className='flex items-center gap-1.5'>
                                <CheckCircle className='w-4 h-4' /> Verificação Aprovada
                              </span>
                            )}
                            {verification.status === KYCStatus.REJECTED && (
                              <span className='flex items-center gap-1.5'>
                                <XCircle className='w-4 h-4' /> Verificação Rejeitada
                              </span>
                            )}
                            {verification.status === KYCStatus.UNDER_REVIEW && (
                              <span className='flex items-center gap-1.5'>
                                <Clock className='w-4 h-4' /> Em Análise
                              </span>
                            )}
                            {verification.status === KYCStatus.SUBMITTED && (
                              <span className='flex items-center gap-1.5'>
                                <FileText className='w-4 h-4' /> Documentos Enviados
                              </span>
                            )}
                            {verification.status === KYCStatus.PENDING && (
                              <span className='flex items-center gap-1.5'>
                                <FileText className='w-4 h-4' /> Pendente
                              </span>
                            )}
                          </h4>
                          <p
                            className={`text-sm mt-1 ${
                              verification.status === KYCStatus.APPROVED
                                ? 'text-green-800 dark:text-green-300'
                                : verification.status === KYCStatus.REJECTED
                                  ? 'text-red-800 dark:text-red-300'
                                  : verification.status === KYCStatus.UNDER_REVIEW
                                    ? 'text-yellow-800 dark:text-yellow-300'
                                    : 'text-blue-800 dark:text-blue-300'
                            }`}
                          >
                            {verification.status === KYCStatus.APPROVED &&
                              `Nível: ${verification.level} - Você tem acesso completo!`}
                            {verification.status === KYCStatus.REJECTED &&
                              `Motivo: ${verification.rejection_reason || 'Documentos inválidos'}`}
                            {verification.status === KYCStatus.UNDER_REVIEW &&
                              'Sua documentação está sendo analisada. Normalmente em até 48h.'}
                            {verification.status === KYCStatus.SUBMITTED &&
                              'Seus documentos foram enviados para análise.'}
                            {verification.status === KYCStatus.PENDING &&
                              'Complete seus dados para iniciar a verificação.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className='p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg'>
                      <div className='flex items-start gap-3'>
                        <FileText className='w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5' />
                        <div>
                          <h4 className='font-semibold text-gray-900 dark:text-gray-200'>
                            Verificação não iniciada
                          </h4>
                          <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                            Inicie sua verificação KYC para desbloquear limites maiores.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Nível Atual e Limites */}
                  {verification && (
                    <div className='space-y-4'>
                      <h4 className='font-semibold text-gray-900 dark:text-white'>Seu Nível KYC</h4>
                      <div className='flex items-center gap-4'>
                        <div
                          className={`px-4 py-2 rounded-full font-medium ${
                            verification.level === KYCLevel.ADVANCED
                              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                              : verification.level === KYCLevel.INTERMEDIATE
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                : verification.level === KYCLevel.BASIC
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {verification.level === KYCLevel.ADVANCED && (
                            <span className='flex items-center gap-1.5'>
                              <Trophy className='w-4 h-4' /> Avançado
                            </span>
                          )}
                          {verification.level === KYCLevel.INTERMEDIATE && (
                            <span className='flex items-center gap-1.5'>
                              <Star className='w-4 h-4' /> Intermediário
                            </span>
                          )}
                          {verification.level === KYCLevel.BASIC && (
                            <span className='flex items-center gap-1.5'>
                              <Check className='w-4 h-4' /> Básico
                            </span>
                          )}
                          {verification.level === KYCLevel.NONE && 'Sem verificação'}
                        </div>
                        <span className='text-sm text-gray-500 dark:text-gray-400'>
                          {verification.level === KYCLevel.ADVANCED && 'Limites ilimitados'}
                          {verification.level === KYCLevel.INTERMEDIATE && 'Até R$ 50.000/tx'}
                          {verification.level === KYCLevel.BASIC && 'Até R$ 1.000/tx'}
                          {verification.level === KYCLevel.NONE && 'Limites mínimos'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Documentos Enviados */}
                  {verification?.documents && verification.documents.length > 0 && (
                    <div className='space-y-4'>
                      <h4 className='font-semibold text-gray-900 dark:text-white'>
                        Documentos Enviados
                      </h4>
                      <div className='space-y-3'>
                        {verification.documents.map(doc => (
                          <div
                            key={doc.id}
                            className='flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg'
                          >
                            <FileText className='w-5 h-5 text-gray-500' />
                            <div className='flex-1'>
                              <p className='font-medium text-gray-900 dark:text-white text-sm'>
                                {doc.document_type === DocumentType.RG_FRONT && 'RG (Frente)'}
                                {doc.document_type === DocumentType.RG_BACK && 'RG (Verso)'}
                                {doc.document_type === DocumentType.CNH_FRONT && 'CNH (Frente)'}
                                {doc.document_type === DocumentType.CNH_BACK && 'CNH (Verso)'}
                                {doc.document_type === DocumentType.PASSPORT && 'Passaporte'}
                                {doc.document_type === DocumentType.SELFIE_WITH_DOCUMENT &&
                                  'Selfie com Documento'}
                                {doc.document_type === DocumentType.PROOF_OF_ADDRESS &&
                                  'Comprovante de Endereço'}
                              </p>
                              <p className='text-xs text-gray-500 dark:text-gray-400'>
                                {new Date(doc.uploaded_at).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <div
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                doc.status === DocumentStatus.APPROVED
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : doc.status === DocumentStatus.REJECTED
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              }`}
                            >
                              {doc.status === DocumentStatus.APPROVED
                                ? 'Aprovado'
                                : doc.status === DocumentStatus.REJECTED
                                  ? 'Rejeitado'
                                  : 'Pendente'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Benefícios */}
                  <div className='space-y-4'>
                    <h4 className='font-semibold text-gray-900 dark:text-white'>
                      Benefícios da Verificação
                    </h4>
                    <div className='grid grid-cols-2 gap-4'>
                      {[
                        {
                          id: 'limits',
                          title: 'Limites Maiores',
                          desc: 'Aumente seus limites de transação',
                        },
                        {
                          id: 'reputation',
                          title: 'Melhor Reputação',
                          desc: 'Aumente confiança com parceiros',
                        },
                        {
                          id: 'access',
                          title: 'Acesso Completo',
                          desc: 'Desbloqueie todas as funcionalidades',
                        },
                        {
                          id: 'support',
                          title: 'Suporte Prioritário',
                          desc: 'Atendimento prioritário 24/7',
                        },
                      ].map(benefit => (
                        <div
                          key={benefit.id}
                          className='p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'
                        >
                          <p className='font-medium text-gray-900 dark:text-white text-sm'>
                            {benefit.title}
                          </p>
                          <p className='text-xs text-gray-600 dark:text-gray-400 mt-1'>
                            {benefit.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Botão de Ação */}
                  <button
                    onClick={() => navigate('/kyc')}
                    className='w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors'
                  >
                    {verification?.status === KYCStatus.APPROVED
                      ? 'Ver Detalhes'
                      : verification?.status === KYCStatus.UNDER_REVIEW
                        ? 'Ver Status'
                        : 'Iniciar Verificação'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className='lg:col-span-1 space-y-4'>
            <div className='bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4'>
              <h4 className='font-semibold text-green-900 dark:text-green-200 mb-3 flex items-center gap-2'>
                <Lock className='w-4 h-4' /> Segurança
              </h4>
              <p className='text-sm text-green-800 dark:text-green-300'>
                Seus dados são criptografados e protegidos com os mais altos padrões de segurança
                (AES-256).
              </p>
            </div>

            <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4'>
              <h4 className='font-semibold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2'>
                <ClipboardList className='w-4 h-4' /> LGPD
              </h4>
              <p className='text-sm text-blue-800 dark:text-blue-300'>
                Você pode exportar ou excluir seus dados a qualquer momento conforme a Lei Geral de
                Proteção de Dados.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className='space-y-6'>
          {/* Two-Factor Authentication */}
          <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
              Autenticação de Dois Fatores (2FA)
            </h3>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-gray-600 dark:text-gray-300'>
                  Adicione uma camada extra de segurança à sua conta
                </p>
                <div
                  className={`mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                    securitySettings.twoFactorEnabled
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  }`}
                >
                  {securitySettings.twoFactorEnabled ? (
                    <Check className='w-3 h-3' />
                  ) : (
                    <AlertCircle className='w-3 h-3' />
                  )}
                  {securitySettings.twoFactorEnabled ? 'Ativo' : 'Inativo'}
                </div>
              </div>
              <button className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'>
                {securitySettings.twoFactorEnabled ? 'Desativar' : 'Ativar'} 2FA
              </button>
            </div>
          </div>

          {/* Change Password */}
          <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
              Alterar Senha
            </h3>
            <div className='space-y-4 max-w-md'>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  Senha Atual
                </label>
                <div className='relative'>
                  <Lock className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={securitySettings.currentPassword}
                    onChange={e =>
                      setSecuritySettings(prev => ({ ...prev, currentPassword: e.target.value }))
                    }
                    aria-label='Senha atual'
                    placeholder='Digite sua senha atual'
                    className='w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                  />
                  <button
                    type='button'
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600'
                  >
                    {showCurrentPassword ? (
                      <EyeOff className='w-4 h-4' />
                    ) : (
                      <Eye className='w-4 h-4' />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  Nova Senha
                </label>
                <div className='relative'>
                  <Lock className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={securitySettings.newPassword}
                    onChange={e =>
                      setSecuritySettings(prev => ({ ...prev, newPassword: e.target.value }))
                    }
                    aria-label='Nova senha'
                    placeholder='Digite sua nova senha'
                    className='w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                  />
                  <button
                    type='button'
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600'
                  >
                    {showNewPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                  </button>
                </div>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  Confirmar Nova Senha
                </label>
                <div className='relative'>
                  <Lock className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                  <input
                    type='password'
                    value={securitySettings.confirmPassword}
                    onChange={e =>
                      setSecuritySettings(prev => ({ ...prev, confirmPassword: e.target.value }))
                    }
                    aria-label='Confirmar nova senha'
                    placeholder='Confirme sua nova senha'
                    className='w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                  />
                </div>
              </div>

              <button
                onClick={handlePasswordChange}
                disabled={
                  isLoadingSecurity ||
                  !securitySettings.currentPassword ||
                  !securitySettings.newPassword
                }
                className='w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
              >
                {isLoadingSecurity ? (
                  <>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    Alterando...
                  </>
                ) : (
                  'Alterar Senha'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-6'>
            Preferências de Notificação
          </h3>
          <div className='space-y-6'>
            {[
              {
                key: 'tradeAlerts',
                label: 'Alertas de Trading',
                description: 'Notificações sobre suas negociações P2P',
                icon: CreditCard,
              },
              {
                key: 'priceAlerts',
                label: 'Alertas de Preço',
                description: 'Mudanças significativas no preço das criptomoedas',
                icon: TrendingUp,
              },
              {
                key: 'securityAlerts',
                label: 'Alertas de Segurança',
                description: 'Atividades suspeitas na sua conta',
                icon: Shield,
              },
              {
                key: 'marketingEmails',
                label: 'Emails de Marketing',
                description: 'Promoções e novidades da plataforma',
                icon: Mail,
              },
              {
                key: 'weeklyReport',
                label: 'Relatório Semanal',
                description: 'Resumo das suas atividades da semana',
                icon: Calendar,
              },
            ].map(setting => (
              <div
                key={setting.key}
                className='flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700 last:border-0'
              >
                <div className='flex items-start gap-3'>
                  <div className='w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mt-1'>
                    <setting.icon className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                  </div>
                  <div>
                    <h4 className='font-medium text-gray-900 dark:text-white'>{setting.label}</h4>
                    <p className='text-sm text-gray-600 dark:text-gray-300'>
                      {setting.description}
                    </p>
                  </div>
                </div>
                <label className='relative inline-flex items-center cursor-pointer'>
                  <input
                    type='checkbox'
                    checked={notificationSettings[setting.key as keyof typeof notificationSettings]}
                    onChange={e => handleNotificationSettingChange(setting.key, e.target.checked)}
                    aria-label={setting.label}
                    className='sr-only peer'
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trader Tab */}
      {activeTab === 'trader' && (
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
          <div className='lg:col-span-2'>
            <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
                Perfil de Negociador
              </h3>
              <p className='text-gray-600 dark:text-gray-400 mb-6'>
                Configure e gerencie seu perfil como trader P2P
              </p>
              <UserProfileSection
                key={`trader-${token}`}
                token={token || null}
                onEdit={() => navigate('/p2p/trader-profile/edit')}
                showEditButton={true}
                showProfileLink={false}
              />
            </div>
          </div>

          <div className='lg:col-span-1'>
            <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4'>
              <h4 className='font-semibold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2'>
                <Lightbulb className='w-4 h-4' /> Dica
              </h4>
              <p className='text-sm text-blue-800 dark:text-blue-300'>
                Mantenha seu perfil de trader sempre atualizado para atrair mais clientes e melhorar
                sua reputação
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700'>
          <div className='p-6 border-b border-gray-200 dark:border-gray-700'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
              Atividade Recente
            </h3>
            <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
              {activitiesData?.total || 0} atividades registradas
            </p>
          </div>
          <div className='divide-y divide-gray-200 dark:divide-gray-700'>
            {isLoadingActivities ? (
              <div className='p-6 text-center text-gray-500'>Carregando atividades...</div>
            ) : activitiesData?.activities && activitiesData.activities.length > 0 ? (
              activitiesData.activities.map(activity => (
                <div key={activity.id} className='p-6'>
                  <div className='flex items-start gap-4'>
                    <div className='w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center'>
                      {getActivityIcon(activity.activity_type)}
                    </div>
                    <div className='flex-1'>
                      <p className='font-medium text-gray-900 dark:text-white'>
                        {activity.description}
                      </p>
                      <div className='flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400'>
                        <span>{UserActivityService.formatTimestamp(activity.timestamp)}</span>
                        {activity.ip_address && <span>IP: {activity.ip_address}</span>}
                        {activity.user_agent && (
                          <span>{UserActivityService.getDeviceInfo(activity)}</span>
                        )}
                      </div>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(activity.status).bg}`}
                    >
                      {getStatusStyle(activity.status).label}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className='p-6 text-center text-gray-500'>
                Nenhuma atividade registrada ainda
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
