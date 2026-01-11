import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { useUpdateProfile } from '@/hooks/useAuth'
import { useUserActivities } from '@/hooks/useUserActivities'
import useKYC from '@/hooks/useKYC'
import { KYCStatus, KYCLevel, DocumentType, DocumentStatus } from '@/services/kyc'
import UserActivityService from '@/services/userActivityService'
import { UserProfileSection } from '@/components/trader/UserProfileSection'
import {
  User,
  Settings,
  Shield,
  Camera,
  Edit3,
  Save,
  X,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Globe,
  Lock,
  Eye,
  EyeOff,
  Bell,
  Smartphone,
  CreditCard,
  History,
  Award,
  Star,
  Check,
  AlertCircle,
  Upload,
  Download,
  Trash2,
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
  const updateProfileMutation = useUpdateProfile()

  // KYC Hook - Dados reais do backend
  const { verification, loading: kycLoading, loadStatus: loadKYCStatus } = useKYC()

  // ⚠️ Desabilitado até endpoint /users/me/activities ser implementado no backend
  const { data: activitiesData, isLoading: isLoadingActivities } = useUserActivities({
    limit: 20,
    enabled: false, // ✅ Desabilitado temporariamente
  })

  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<
    'profile' | 'security' | 'notifications' | 'activity' | 'trader' | 'kyc'
  >('profile')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Initialize user data from store
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    birthDate: '',
    bio: '',
    website: '',
    avatar: null as File | null,
  })

  // Load user data when component mounts or user changes
  useEffect(() => {
    if (user) {
      setUserInfo({
        name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || '',
        email: user.email || '',
        phone: user.phoneNumber || '',
        location: '',
        birthDate: '',
        bio: '',
        website: '',
        avatar: null,
      })
    }
  }, [user])

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

  const handleSaveProfile = async () => {
    try {
      // Parse name into firstName and lastName
      const nameParts = userInfo.name.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      const updateData = {
        firstName,
        lastName,
        email: userInfo.email,
        phoneNumber: userInfo.phone,
      }

      updateProfileMutation.mutate(updateData, {
        onSuccess: () => {
          setIsEditing(false)
          // Show success toast or notification
        },
        onError: error => {
          console.error('Erro ao salvar perfil:', error)
          // Show error toast or notification
        },
      })
    } catch (error) {
      console.error('Erro ao processar formulário:', error)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUserInfo(prev => ({ ...prev, avatar: file }))
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

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6'>
          {/* Avatar & Basic Info */}
          <div className='lg:col-span-1'>
            <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6'>
              <div className='text-center'>
                <div className='relative inline-block'>
                  <div className='w-24 h-24 md:w-32 md:h-32 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-2xl md:text-4xl font-bold text-white mb-3 md:mb-4'>
                    {userInfo.name
                      .split(' ')
                      .map(n => n[0])
                      .join('')}
                  </div>
                  <label className='absolute bottom-1 right-1 md:bottom-2 md:right-2 w-7 h-7 md:w-8 md:h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors'>
                    <Camera className='w-3.5 h-3.5 md:w-4 md:h-4 text-white' />
                    <input
                      type='file'
                      accept='image/*'
                      onChange={handleAvatarChange}
                      aria-label='Alterar foto do perfil'
                      className='hidden'
                    />
                  </label>
                </div>

                <h2 className='text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-1'>
                  {userInfo.name}
                </h2>
                <p className='text-sm md:text-base text-gray-500 dark:text-gray-400 mb-3 md:mb-4 break-all'>
                  {userInfo.email}
                </p>

                <div className='flex items-center justify-center gap-2 mb-3 md:mb-4'>
                  <div className='flex items-center gap-1'>
                    <Star className='w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-500 fill-current' />
                    <Star className='w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-500 fill-current' />
                    <Star className='w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-500 fill-current' />
                    <Star className='w-3.5 h-3.5 md:w-4 md:h-4 text-yellow-500 fill-current' />
                    <Star className='w-3.5 h-3.5 md:w-4 md:h-4 text-gray-300' />
                  </div>
                  <span className='text-xs md:text-sm text-gray-600 dark:text-gray-400'>4.8/5</span>
                </div>

                <div className='flex items-center justify-center gap-2 text-xs md:text-sm text-green-600 dark:text-green-400'>
                  <Check className='w-3.5 h-3.5 md:w-4 md:h-4' />
                  Conta Verificada
                </div>
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <div className='lg:col-span-2'>
            <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6'>
              <div className='flex items-center justify-between mb-4 md:mb-6'>
                <h3 className='text-base md:text-lg font-semibold text-gray-900 dark:text-white'>
                  Informações Pessoais
                </h3>
                <button
                  onClick={() => (isEditing ? handleSaveProfile() : setIsEditing(true))}
                  className='inline-flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 text-sm md:text-base bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
                >
                  {isEditing ? (
                    <>
                      <Save className='w-3.5 h-3.5 md:w-4 md:h-4' />
                      Salvar
                    </>
                  ) : (
                    <>
                      <Edit3 className='w-3.5 h-3.5 md:w-4 md:h-4' />
                      Editar
                    </>
                  )}
                </button>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6'>
                <div>
                  <label className='block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 md:mb-2'>
                    Nome Completo
                  </label>
                  <div className='relative'>
                    <User className='absolute left-2.5 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 md:w-4 md:h-4' />
                    <input
                      type='text'
                      value={userInfo.name}
                      onChange={e => setUserInfo(prev => ({ ...prev, name: e.target.value }))}
                      disabled={!isEditing}
                      aria-label='Nome completo'
                      className='w-full pl-8 md:pl-10 pr-3 md:pr-4 py-2 text-sm md:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed'
                    />
                  </div>
                </div>

                <div>
                  <label className='block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 md:mb-2'>
                    Email
                  </label>
                  <div className='relative'>
                    <Mail className='absolute left-2.5 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 md:w-4 md:h-4' />
                    <input
                      type='email'
                      value={userInfo.email}
                      onChange={e => setUserInfo(prev => ({ ...prev, email: e.target.value }))}
                      disabled={!isEditing}
                      aria-label='Endereço de email'
                      className='w-full pl-8 md:pl-10 pr-3 md:pr-4 py-2 text-sm md:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed'
                    />
                  </div>
                </div>

                <div>
                  <label className='block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 md:mb-2'>
                    Telefone
                  </label>
                  <div className='relative'>
                    <Phone className='absolute left-2.5 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 md:w-4 md:h-4' />
                    <input
                      type='tel'
                      value={userInfo.phone}
                      onChange={e => setUserInfo(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={!isEditing}
                      aria-label='Número de telefone'
                      className='w-full pl-8 md:pl-10 pr-3 md:pr-4 py-2 text-sm md:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed'
                    />
                  </div>
                </div>

                <div>
                  <label className='block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 md:mb-2'>
                    Localização
                  </label>
                  <div className='relative'>
                    <MapPin className='absolute left-2.5 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 md:w-4 md:h-4' />
                    <input
                      type='text'
                      value={userInfo.location}
                      onChange={e => setUserInfo(prev => ({ ...prev, location: e.target.value }))}
                      disabled={!isEditing}
                      aria-label='Localização'
                      className='w-full pl-8 md:pl-10 pr-3 md:pr-4 py-2 text-sm md:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed'
                    />
                  </div>
                </div>

                <div>
                  <label className='block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 md:mb-2'>
                    Data de Nascimento
                  </label>
                  <div className='relative'>
                    <Calendar className='absolute left-2.5 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 md:w-4 md:h-4' />
                    <input
                      type='date'
                      value={userInfo.birthDate}
                      onChange={e => setUserInfo(prev => ({ ...prev, birthDate: e.target.value }))}
                      disabled={!isEditing}
                      aria-label='Data de nascimento'
                      className='w-full pl-8 md:pl-10 pr-3 md:pr-4 py-2 text-sm md:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed'
                    />
                  </div>
                </div>

                <div>
                  <label className='block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 md:mb-2'>
                    Website
                  </label>
                  <div className='relative'>
                    <Globe className='absolute left-2.5 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5 md:w-4 md:h-4' />
                    <input
                      type='url'
                      value={userInfo.website}
                      onChange={e => setUserInfo(prev => ({ ...prev, website: e.target.value }))}
                      disabled={!isEditing}
                      aria-label='Website'
                      placeholder='https://exemplo.com'
                      className='w-full pl-8 md:pl-10 pr-3 md:pr-4 py-2 text-sm md:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed'
                    />
                  </div>
                </div>
              </div>

              <div className='mt-4 md:mt-6'>
                <label className='block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 md:mb-2'>
                  Biografia
                </label>
                <textarea
                  value={userInfo.bio}
                  onChange={e => setUserInfo(prev => ({ ...prev, bio: e.target.value }))}
                  disabled={!isEditing}
                  rows={4}
                  placeholder='Conte um pouco sobre você e sua experiência com trading...'
                  className='w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed resize-none'
                />
              </div>

              {isEditing && (
                <div className='flex gap-2 md:gap-3 mt-4 md:mt-6'>
                  <button
                    onClick={handleSaveProfile}
                    className='flex-1 bg-blue-600 text-white py-2 text-sm md:text-base rounded-lg hover:bg-blue-700 transition-colors'
                  >
                    Salvar Alterações
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className='px-4 md:px-6 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 text-sm md:text-base rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors'
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
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

              <button className='w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors'>
                Alterar Senha
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
                    onChange={e =>
                      setNotificationSettings(prev => ({
                        ...prev,
                        [setting.key]: e.target.checked,
                      }))
                    }
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
            ) : activitiesData && activitiesData.activities.length > 0 ? (
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
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        activity.status === 'success'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : activity.status === 'failed'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                      }`}
                    >
                      {activity.status === 'success'
                        ? 'Sucesso'
                        : activity.status === 'failed'
                          ? 'Falha'
                          : 'Pendente'}
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
