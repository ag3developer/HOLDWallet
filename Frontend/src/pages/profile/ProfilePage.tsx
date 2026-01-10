import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { useUpdateProfile } from '@/hooks/useAuth'
import { useUserActivities } from '@/hooks/useUserActivities'
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
} from 'lucide-react'

export const ProfilePage = () => {
  const navigate = useNavigate()
  const { user, token } = useAuthStore()
  const updateProfileMutation = useUpdateProfile()

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
    <div className='space-y-3 sm:space-y-4 md:space-y-6 pb-24'>
      {/* Hero Header - Premium Design */}
      <div className='relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900'>
        {/* Background Pattern */}
        <div className='absolute inset-0 opacity-10'>
          <div className='absolute top-0 left-0 w-32 sm:w-40 h-32 sm:h-40 bg-blue-500 rounded-full blur-3xl' />
          <div className='absolute bottom-0 right-0 w-48 sm:w-60 h-48 sm:h-60 bg-purple-500 rounded-full blur-3xl' />
          <div className='absolute top-1/2 left-1/2 w-24 sm:w-32 h-24 sm:h-32 bg-cyan-500 rounded-full blur-2xl' />
        </div>

        <div className='relative p-3 sm:p-4 md:p-6'>
          <div className='flex items-center gap-2 sm:gap-3'>
            <div className='w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg'>
              <User className='w-5 h-5 sm:w-6 sm:h-6 text-white' />
            </div>
            <div>
              <h1 className='text-lg sm:text-xl md:text-2xl font-bold text-white'>Meu Perfil</h1>
              <p className='text-[10px] sm:text-xs md:text-sm text-blue-200'>
                Gerencie suas informações pessoais e configurações
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs - Mobile Scrollable */}
      <div className='overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0'>
        <div className='flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg sm:rounded-xl min-w-max'>
          {[
            { id: 'profile', label: 'Perfil', icon: User },
            { id: 'trader', label: 'Trader', icon: TrendingUp },
            { id: 'kyc', label: 'KYC', icon: Lock },
            { id: 'security', label: 'Segurança', icon: Shield },
            { id: 'notifications', label: 'Alertas', icon: Bell },
            { id: 'activity', label: 'Histórico', icon: History },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center justify-center gap-1 sm:gap-1.5 py-2 sm:py-2.5 px-2.5 sm:px-3 md:px-4 rounded-md sm:rounded-lg font-medium transition-all text-[10px] sm:text-xs md:text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <tab.icon className='w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 flex-shrink-0' />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6'>
          {/* Avatar & Basic Info */}
          <div className='lg:col-span-1'>
            <div className='bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 md:p-6'>
              <div className='text-center'>
                <div className='relative inline-block'>
                  <div className='w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 mx-auto bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl sm:rounded-3xl flex items-center justify-center text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 sm:mb-3 shadow-lg'>
                    {userInfo.name
                      .split(' ')
                      .map(n => n[0])
                      .join('')}
                  </div>
                  <label className='absolute -bottom-1 -right-1 sm:bottom-0 sm:right-0 w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors shadow-lg border-2 border-white dark:border-gray-800'>
                    <Camera className='w-3 h-3 sm:w-3.5 sm:h-3.5 text-white' />
                    <input
                      type='file'
                      accept='image/*'
                      onChange={handleAvatarChange}
                      aria-label='Alterar foto do perfil'
                      className='hidden'
                    />
                  </label>
                </div>

                <h2 className='text-sm sm:text-base md:text-lg font-bold text-gray-900 dark:text-white mb-0.5 sm:mb-1'>
                  {userInfo.name}
                </h2>
                <p className='text-[10px] sm:text-xs md:text-sm text-gray-500 dark:text-gray-400 mb-2 sm:mb-3 break-all'>
                  {userInfo.email}
                </p>

                <div className='flex items-center justify-center gap-1.5 sm:gap-2 mb-2 sm:mb-3'>
                  <div className='flex items-center gap-0.5'>
                    <Star className='w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 fill-amber-500' />
                    <Star className='w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 fill-amber-500' />
                    <Star className='w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 fill-amber-500' />
                    <Star className='w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 fill-amber-500' />
                    <Star className='w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-300 dark:text-gray-600' />
                  </div>
                  <span className='text-[10px] sm:text-xs text-gray-600 dark:text-gray-400'>
                    4.8/5
                  </span>
                </div>

                <div className='inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-[10px] sm:text-xs font-medium'>
                  <Check className='w-3 h-3 sm:w-3.5 sm:h-3.5' />
                  Conta Verificada
                </div>
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <div className='lg:col-span-2'>
            <div className='bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 md:p-6'>
              <div className='flex items-center justify-between mb-3 sm:mb-4 md:mb-6'>
                <h3 className='text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white'>
                  Informações Pessoais
                </h3>
                <button
                  onClick={() => (isEditing ? handleSaveProfile() : setIsEditing(true))}
                  className='inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium'
                >
                  {isEditing ? (
                    <>
                      <Save className='w-3 h-3 sm:w-3.5 sm:h-3.5' />
                      Salvar
                    </>
                  ) : (
                    <>
                      <Edit3 className='w-3 h-3 sm:w-3.5 sm:h-3.5' />
                      Editar
                    </>
                  )}
                </button>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4'>
                <div>
                  <label className='block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-1.5'>
                    Nome Completo
                  </label>
                  <div className='relative'>
                    <User className='absolute left-2 sm:left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-3.5 sm:h-3.5' />
                    <input
                      type='text'
                      value={userInfo.name}
                      onChange={e => setUserInfo(prev => ({ ...prev, name: e.target.value }))}
                      disabled={!isEditing}
                      aria-label='Nome completo'
                      className='w-full pl-7 sm:pl-8 pr-2 sm:pr-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed'
                    />
                  </div>
                </div>

                <div>
                  <label className='block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-1.5'>
                    Email
                  </label>
                  <div className='relative'>
                    <Mail className='absolute left-2 sm:left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-3.5 sm:h-3.5' />
                    <input
                      type='email'
                      value={userInfo.email}
                      onChange={e => setUserInfo(prev => ({ ...prev, email: e.target.value }))}
                      disabled={!isEditing}
                      aria-label='Endereço de email'
                      className='w-full pl-7 sm:pl-8 pr-2 sm:pr-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed'
                    />
                  </div>
                </div>

                <div>
                  <label className='block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-1.5'>
                    Telefone
                  </label>
                  <div className='relative'>
                    <Phone className='absolute left-2 sm:left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-3.5 sm:h-3.5' />
                    <input
                      type='tel'
                      value={userInfo.phone}
                      onChange={e => setUserInfo(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={!isEditing}
                      aria-label='Número de telefone'
                      className='w-full pl-7 sm:pl-8 pr-2 sm:pr-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed'
                    />
                  </div>
                </div>

                <div>
                  <label className='block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-1.5'>
                    Localização
                  </label>
                  <div className='relative'>
                    <MapPin className='absolute left-2 sm:left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-3.5 sm:h-3.5' />
                    <input
                      type='text'
                      value={userInfo.location}
                      onChange={e => setUserInfo(prev => ({ ...prev, location: e.target.value }))}
                      disabled={!isEditing}
                      aria-label='Localização'
                      className='w-full pl-7 sm:pl-8 pr-2 sm:pr-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed'
                    />
                  </div>
                </div>

                <div>
                  <label className='block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-1.5'>
                    Data de Nascimento
                  </label>
                  <div className='relative'>
                    <Calendar className='absolute left-2 sm:left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-3.5 sm:h-3.5' />
                    <input
                      type='date'
                      value={userInfo.birthDate}
                      onChange={e => setUserInfo(prev => ({ ...prev, birthDate: e.target.value }))}
                      disabled={!isEditing}
                      aria-label='Data de nascimento'
                      className='w-full pl-7 sm:pl-8 pr-2 sm:pr-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed'
                    />
                  </div>
                </div>

                <div>
                  <label className='block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-1.5'>
                    Website
                  </label>
                  <div className='relative'>
                    <Globe className='absolute left-2 sm:left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-3.5 sm:h-3.5' />
                    <input
                      type='url'
                      value={userInfo.website}
                      onChange={e => setUserInfo(prev => ({ ...prev, website: e.target.value }))}
                      disabled={!isEditing}
                      aria-label='Website'
                      placeholder='https://exemplo.com'
                      className='w-full pl-7 sm:pl-8 pr-2 sm:pr-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed'
                    />
                  </div>
                </div>
              </div>

              <div className='mt-3 sm:mt-4'>
                <label className='block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-1.5'>
                  Biografia
                </label>
                <textarea
                  value={userInfo.bio}
                  onChange={e => setUserInfo(prev => ({ ...prev, bio: e.target.value }))}
                  disabled={!isEditing}
                  rows={3}
                  placeholder='Conte um pouco sobre você e sua experiência com trading...'
                  className='w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed resize-none'
                />
              </div>

              {isEditing && (
                <div className='flex gap-2 mt-3 sm:mt-4'>
                  <button
                    onClick={handleSaveProfile}
                    className='flex-1 bg-blue-600 text-white py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium'
                  >
                    Salvar Alterações
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className='px-3 sm:px-4 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors'
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KYC Tab */}
      {activeTab === 'kyc' && (
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6'>
          <div className='lg:col-span-2'>
            <div className='bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 md:p-6'>
              <h3 className='text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3 md:mb-4 flex items-center gap-1.5 sm:gap-2'>
                <Lock className='w-4 h-4 sm:w-5 sm:h-5 text-blue-600' />
                Verificação KYC
              </h3>
              <p className='text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 md:mb-6'>
                Complete sua verificação de identidade para desbloquear funcionalidades avançadas e
                aumentar seus limites de transação.
              </p>

              <div className='space-y-3 sm:space-y-4 md:space-y-6'>
                {/* Verification Status */}
                <div className='p-2.5 sm:p-3 md:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg sm:rounded-xl'>
                  <div className='flex items-start gap-2 sm:gap-3'>
                    <AlertCircle className='w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5' />
                    <div>
                      <h4 className='text-xs sm:text-sm font-semibold text-blue-900 dark:text-blue-200'>
                        Aguardando Verificação
                      </h4>
                      <p className='text-[10px] sm:text-xs md:text-sm text-blue-800 dark:text-blue-300 mt-0.5 sm:mt-1'>
                        Sua documentação foi recebida. Normalmente analisamos em até 48 horas.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Verification Steps */}
                <div className='space-y-2 sm:space-y-3 md:space-y-4'>
                  <h4 className='text-xs sm:text-sm font-semibold text-gray-900 dark:text-white'>
                    Etapas de Verificação
                  </h4>

                  <div className='space-y-2 sm:space-y-3'>
                    {[
                      {
                        step: 1,
                        title: 'Documento de Identidade',
                        status: 'completed',
                        icon: Check,
                      },
                      { step: 2, title: 'Prova de Endereço', status: 'completed', icon: Check },
                      {
                        step: 3,
                        title: 'Verificação Facial',
                        status: 'pending',
                        icon: AlertCircle,
                      },
                    ].map(item => (
                      <div key={item.step} className='flex items-start gap-2 sm:gap-3'>
                        <div
                          className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            item.status === 'completed'
                              ? 'bg-green-100 dark:bg-green-900/30'
                              : 'bg-yellow-100 dark:bg-yellow-900/30'
                          }`}
                        >
                          <item.icon
                            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 ${
                              item.status === 'completed'
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-yellow-600 dark:text-yellow-400'
                            }`}
                          />
                        </div>
                        <div className='flex-1 min-w-0'>
                          <p className='text-xs sm:text-sm font-medium text-gray-900 dark:text-white'>
                            {item.title}
                          </p>
                          <p className='text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 mt-0.5'>
                            {item.status === 'completed'
                              ? 'Verificado com sucesso'
                              : 'Aguardando sua ação'}
                          </p>
                        </div>
                        <div
                          className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-xs font-medium flex-shrink-0 ${
                            item.status === 'completed'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          }`}
                        >
                          {item.status === 'completed' ? 'Completo' : 'Pendente'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verification Benefits */}
                <div className='space-y-2 sm:space-y-3'>
                  <h4 className='text-xs sm:text-sm font-semibold text-gray-900 dark:text-white'>
                    Benefícios da Verificação
                  </h4>
                  <div className='grid grid-cols-2 gap-2 sm:gap-3'>
                    {[
                      { title: 'Limites Maiores', desc: 'Aumente seus limites de transação' },
                      { title: 'Melhor Reputação', desc: 'Aumente confiança com parceiros' },
                      { title: 'Acesso Completo', desc: 'Desbloqueie todas as funcionalidades' },
                      { title: 'Suporte Prioritário', desc: 'Atendimento prioritário 24/7' },
                    ].map((benefit, idx) => (
                      <div key={idx} className='p-2 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                        <p className='text-[10px] sm:text-xs md:text-sm font-medium text-gray-900 dark:text-white'>
                          {benefit.title}
                        </p>
                        <p className='text-[9px] sm:text-xs text-gray-600 dark:text-gray-400 mt-0.5'>
                          {benefit.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => navigate('/kyc')}
                  className='w-full px-4 sm:px-6 py-2 sm:py-2.5 md:py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors'
                >
                  Continuar Verificação
                </button>
              </div>
            </div>
          </div>

          <div className='lg:col-span-1'>
            <div className='bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-3 sm:p-4'>
              <h4 className='text-xs sm:text-sm font-semibold text-green-900 dark:text-green-200 mb-1.5 sm:mb-2'>
                ✅ Segurança
              </h4>
              <p className='text-[10px] sm:text-xs text-green-800 dark:text-green-300'>
                Seus dados são criptografados e protegidos com os mais altos padrões de segurança.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className='space-y-3 sm:space-y-4 md:space-y-6'>
          {/* Two-Factor Authentication */}
          <div className='bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 md:p-6'>
            <h3 className='text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3 md:mb-4'>
              Autenticação de Dois Fatores (2FA)
            </h3>
            <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
              <div>
                <p className='text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-300'>
                  Adicione uma camada extra de segurança à sua conta
                </p>
                <div
                  className={`mt-1.5 sm:mt-2 inline-flex items-center gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs ${
                    securitySettings.twoFactorEnabled
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  }`}
                >
                  {securitySettings.twoFactorEnabled ? (
                    <Check className='w-2.5 h-2.5 sm:w-3 sm:h-3' />
                  ) : (
                    <AlertCircle className='w-2.5 h-2.5 sm:w-3 sm:h-3' />
                  )}
                  {securitySettings.twoFactorEnabled ? 'Ativo' : 'Inativo'}
                </div>
              </div>
              <button className='px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium'>
                {securitySettings.twoFactorEnabled ? 'Desativar' : 'Ativar'} 2FA
              </button>
            </div>
          </div>

          {/* Change Password */}
          <div className='bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 md:p-6'>
            <h3 className='text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3 md:mb-4'>
              Alterar Senha
            </h3>
            <div className='space-y-3 sm:space-y-4 max-w-md'>
              <div>
                <label className='block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-1.5'>
                  Senha Atual
                </label>
                <div className='relative'>
                  <Lock className='absolute left-2 sm:left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-3.5 sm:h-3.5' />
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={securitySettings.currentPassword}
                    onChange={e =>
                      setSecuritySettings(prev => ({ ...prev, currentPassword: e.target.value }))
                    }
                    aria-label='Senha atual'
                    placeholder='Digite sua senha atual'
                    className='w-full pl-7 sm:pl-8 pr-8 sm:pr-10 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                  />
                  <button
                    type='button'
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className='absolute right-2 sm:right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600'
                  >
                    {showCurrentPassword ? (
                      <EyeOff className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
                    ) : (
                      <Eye className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className='block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-1.5'>
                  Nova Senha
                </label>
                <div className='relative'>
                  <Lock className='absolute left-2 sm:left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-3.5 sm:h-3.5' />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={securitySettings.newPassword}
                    onChange={e =>
                      setSecuritySettings(prev => ({ ...prev, newPassword: e.target.value }))
                    }
                    aria-label='Nova senha'
                    placeholder='Digite sua nova senha'
                    className='w-full pl-7 sm:pl-8 pr-8 sm:pr-10 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                  />
                  <button
                    type='button'
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className='absolute right-2 sm:right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600'
                  >
                    {showNewPassword ? (
                      <EyeOff className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
                    ) : (
                      <Eye className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className='block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-1.5'>
                  Confirmar Nova Senha
                </label>
                <div className='relative'>
                  <Lock className='absolute left-2 sm:left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-3.5 sm:h-3.5' />
                  <input
                    type='password'
                    value={securitySettings.confirmPassword}
                    onChange={e =>
                      setSecuritySettings(prev => ({ ...prev, confirmPassword: e.target.value }))
                    }
                    aria-label='Confirmar nova senha'
                    placeholder='Confirme sua nova senha'
                    className='w-full pl-7 sm:pl-8 pr-2 sm:pr-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                  />
                </div>
              </div>

              <button className='w-full bg-blue-600 text-white py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium'>
                Alterar Senha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className='bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 md:p-6'>
          <h3 className='text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4 md:mb-6'>
            Preferências de Notificação
          </h3>
          <div className='space-y-3 sm:space-y-4 md:space-y-6'>
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
                className='flex items-center justify-between py-2 sm:py-3 md:py-4 border-b border-gray-200 dark:border-gray-700 last:border-0'
              >
                <div className='flex items-start gap-2 sm:gap-3 flex-1 min-w-0'>
                  <div className='w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mt-0.5 flex-shrink-0'>
                    <setting.icon className='w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400' />
                  </div>
                  <div className='min-w-0'>
                    <h4 className='text-xs sm:text-sm font-medium text-gray-900 dark:text-white'>
                      {setting.label}
                    </h4>
                    <p className='text-[10px] sm:text-xs text-gray-600 dark:text-gray-300'>
                      {setting.description}
                    </p>
                  </div>
                </div>
                <label className='relative inline-flex items-center cursor-pointer flex-shrink-0 ml-2'>
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
                  <div className="w-9 h-5 sm:w-11 sm:h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trader Tab */}
      {activeTab === 'trader' && (
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6'>
          <div className='lg:col-span-2'>
            <div className='bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 md:p-6'>
              <h3 className='text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3 md:mb-4'>
                Perfil de Negociador
              </h3>
              <p className='text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 md:mb-6'>
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
            <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3 sm:p-4'>
              <h4 className='text-xs sm:text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1.5 sm:mb-2'>
                💡 Dica
              </h4>
              <p className='text-[10px] sm:text-xs text-blue-800 dark:text-blue-300'>
                Mantenha seu perfil de trader sempre atualizado para atrair mais clientes e melhorar
                sua reputação
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className='bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700'>
          <div className='p-3 sm:p-4 md:p-6 border-b border-gray-200 dark:border-gray-700'>
            <h3 className='text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white'>
              Atividade Recente
            </h3>
            <p className='text-[10px] sm:text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1'>
              {activitiesData?.total || 0} atividades registradas
            </p>
          </div>
          <div className='divide-y divide-gray-200 dark:divide-gray-700'>
            {isLoadingActivities ? (
              <div className='p-4 sm:p-6 text-center text-[10px] sm:text-xs md:text-sm text-gray-500'>
                Carregando atividades...
              </div>
            ) : activitiesData && activitiesData.activities.length > 0 ? (
              activitiesData.activities.map(activity => (
                <div key={activity.id} className='p-3 sm:p-4 md:p-6'>
                  <div className='flex items-start gap-2 sm:gap-3 md:gap-4'>
                    <div className='w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0'>
                      {getActivityIcon(activity.activity_type)}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-xs sm:text-sm font-medium text-gray-900 dark:text-white'>
                        {activity.description}
                      </p>
                      <div className='flex flex-wrap items-center gap-2 sm:gap-3 md:gap-4 mt-0.5 sm:mt-1 text-[9px] sm:text-xs text-gray-500 dark:text-gray-400'>
                        <span>{UserActivityService.formatTimestamp(activity.timestamp)}</span>
                        {activity.ip_address && (
                          <span className='hidden sm:inline'>IP: {activity.ip_address}</span>
                        )}
                        {activity.user_agent && (
                          <span className='hidden md:inline'>
                            {UserActivityService.getDeviceInfo(activity)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div
                      className={`px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-xs font-medium flex-shrink-0 ${
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
              <div className='p-4 sm:p-6 text-center text-[10px] sm:text-xs md:text-sm text-gray-500'>
                Nenhuma atividade registrada ainda
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom CSS for scrollbar */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  )
}
