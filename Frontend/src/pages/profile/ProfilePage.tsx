import { useState } from 'react'
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
  TrendingUp
} from 'lucide-react'

export const ProfilePage = () => {
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'activity'>('profile')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Mock user data
  const [userInfo, setUserInfo] = useState({
    name: 'João Silva',
    email: 'joao.silva@email.com',
    phone: '+55 (11) 99999-9999',
    location: 'São Paulo, SP',
    birthDate: '1990-05-15',
    bio: 'Investidor em criptomoedas há 5 anos. Especialista em trading P2P.',
    website: 'https://joaosilva.com',
    avatar: null as File | null
  })

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: true,
    emailNotifications: true,
    smsNotifications: false,
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [notificationSettings, setNotificationSettings] = useState({
    tradeAlerts: true,
    priceAlerts: true,
    securityAlerts: true,
    marketingEmails: false,
    weeklyReport: true
  })

  const recentActivity = [
    {
      id: 1,
      type: 'login',
      description: 'Login realizado com sucesso',
      timestamp: '2024-11-25 14:30',
      ip: '192.168.1.100',
      device: 'Chrome, Windows'
    },
    {
      id: 2,
      type: 'trade',
      description: 'Transação P2P completada - 0.001 BTC',
      timestamp: '2024-11-25 13:45',
      status: 'success'
    },
    {
      id: 3,
      type: 'security',
      description: 'Senha alterada',
      timestamp: '2024-11-24 10:20',
      status: 'success'
    }
  ]

  const handleSaveProfile = () => {
    // Aqui seria implementada a lógica de salvamento
    console.log('Salvando perfil:', userInfo)
    setIsEditing(false)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUserInfo(prev => ({ ...prev, avatar: file }))
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'login': return <User className="w-4 h-4 text-blue-600" />
      case 'trade': return <CreditCard className="w-4 h-4 text-green-600" />
      case 'security': return <Shield className="w-4 h-4 text-red-600" />
      default: return <History className="w-4 h-4 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            Meu Perfil
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Gerencie suas informações pessoais e configurações
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        {[
          { id: 'profile', label: 'Perfil', icon: User },
          { id: 'security', label: 'Segurança', icon: Shield },
          { id: 'notifications', label: 'Notificações', icon: Bell },
          { id: 'activity', label: 'Atividade', icon: History }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Avatar & Basic Info */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="text-center">
                <div className="relative inline-block">
                  <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-4xl font-bold text-white mb-4">
                    {userInfo.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <label className="absolute bottom-2 right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors">
                    <Camera className="w-4 h-4 text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      aria-label="Alterar foto do perfil"
                      className="hidden"
                    />
                  </label>
                </div>
                
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  {userInfo.name}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {userInfo.email}
                </p>
                
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <Star className="w-4 h-4 text-gray-300" />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">4.8/5</span>
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <Check className="w-4 h-4" />
                  Conta Verificada
                </div>
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Informações Pessoais
                </h3>
                <button
                  onClick={() => isEditing ? handleSaveProfile() : setIsEditing(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {isEditing ? (
                    <>
                      <Save className="w-4 h-4" />
                      Salvar
                    </>
                  ) : (
                    <>
                      <Edit3 className="w-4 h-4" />
                      Editar
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={userInfo.name}
                      onChange={(e) => setUserInfo(prev => ({ ...prev, name: e.target.value }))}
                      disabled={!isEditing}
                      aria-label="Nome completo"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="email"
                      value={userInfo.email}
                      onChange={(e) => setUserInfo(prev => ({ ...prev, email: e.target.value }))}
                      disabled={!isEditing}
                      aria-label="Endereço de email"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Telefone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="tel"
                      value={userInfo.phone}
                      onChange={(e) => setUserInfo(prev => ({ ...prev, phone: e.target.value }))}
                      disabled={!isEditing}
                      aria-label="Número de telefone"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Localização
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={userInfo.location}
                      onChange={(e) => setUserInfo(prev => ({ ...prev, location: e.target.value }))}
                      disabled={!isEditing}
                      aria-label="Localização"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Data de Nascimento
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="date"
                      value={userInfo.birthDate}
                      onChange={(e) => setUserInfo(prev => ({ ...prev, birthDate: e.target.value }))}
                      disabled={!isEditing}
                      aria-label="Data de nascimento"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Website
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="url"
                      value={userInfo.website}
                      onChange={(e) => setUserInfo(prev => ({ ...prev, website: e.target.value }))}
                      disabled={!isEditing}
                      aria-label="Website"
                      placeholder="https://exemplo.com"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Biografia
                </label>
                <textarea
                  value={userInfo.bio}
                  onChange={(e) => setUserInfo(prev => ({ ...prev, bio: e.target.value }))}
                  disabled={!isEditing}
                  rows={4}
                  placeholder="Conte um pouco sobre você e sua experiência com trading..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed resize-none"
                />
              </div>

              {isEditing && (
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleSaveProfile}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Salvar Alterações
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-6 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Two-Factor Authentication */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Autenticação de Dois Fatores (2FA)
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-300">
                  Adicione uma camada extra de segurança à sua conta
                </p>
                <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                  securitySettings.twoFactorEnabled
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}>
                  {securitySettings.twoFactorEnabled ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                  {securitySettings.twoFactorEnabled ? 'Ativo' : 'Inativo'}
                </div>
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                {securitySettings.twoFactorEnabled ? 'Desativar' : 'Ativar'} 2FA
              </button>
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Alterar Senha
            </h3>
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Senha Atual
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={securitySettings.currentPassword}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, currentPassword: e.target.value }))}
                    aria-label="Senha atual"
                    placeholder="Digite sua senha atual"
                    className="w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nova Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={securitySettings.newPassword}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, newPassword: e.target.value }))}
                    aria-label="Nova senha"
                    placeholder="Digite sua nova senha"
                    className="w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="password"
                    value={securitySettings.confirmPassword}
                    onChange={(e) => setSecuritySettings(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    aria-label="Confirmar nova senha"
                    placeholder="Confirme sua nova senha"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Alterar Senha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Preferências de Notificação
          </h3>
          <div className="space-y-6">
            {[
              { key: 'tradeAlerts', label: 'Alertas de Trading', description: 'Notificações sobre suas negociações P2P', icon: CreditCard },
              { key: 'priceAlerts', label: 'Alertas de Preço', description: 'Mudanças significativas no preço das criptomoedas', icon: TrendingUp },
              { key: 'securityAlerts', label: 'Alertas de Segurança', description: 'Atividades suspeitas na sua conta', icon: Shield },
              { key: 'marketingEmails', label: 'Emails de Marketing', description: 'Promoções e novidades da plataforma', icon: Mail },
              { key: 'weeklyReport', label: 'Relatório Semanal', description: 'Resumo das suas atividades da semana', icon: Calendar }
            ].map((setting) => (
              <div key={setting.key} className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-gray-700 last:border-0">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mt-1">
                    <setting.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">{setting.label}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{setting.description}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationSettings[setting.key as keyof typeof notificationSettings]}
                    onChange={(e) => setNotificationSettings(prev => ({ ...prev, [setting.key]: e.target.checked }))}
                    aria-label={setting.label}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Atividade Recente</h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                      <span>{activity.timestamp}</span>
                      {activity.ip && (
                        <span>IP: {activity.ip}</span>
                      )}
                      {activity.device && (
                        <span>{activity.device}</span>
                      )}
                    </div>
                  </div>
                  {activity.status && (
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      activity.status === 'success'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {activity.status === 'success' ? 'Sucesso' : 'Falha'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
