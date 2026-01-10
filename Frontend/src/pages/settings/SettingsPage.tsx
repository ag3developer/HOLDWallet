import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  useCurrentUser,
  useChangePassword,
  useEnable2FA,
  useDisable2FA,
  useVerify2FA,
  use2FAStatus,
} from '@/hooks/useAuth'
import {
  usePaymentMethods,
  useCreatePaymentMethod,
  useUpdatePaymentMethod,
  useDeletePaymentMethod,
} from '@/hooks/usePaymentMethods'
import { useToast } from '@/hooks/useToast'
import { useCurrencyStore, type Currency } from '@/stores/useCurrencyStore'
import { ToastContainer } from '@/components/ui/Toast'
import { LanguageDemo } from '@/components/ui/LanguageDemo'
import {
  Settings,
  Shield,
  ShieldCheck,
  Key,
  User,
  Moon,
  Sun,
  Palette,
  DollarSign,
  LogOut,
  Clock,
  History,
  Smartphone,
  QrCode,
  AlertTriangle,
  CheckCircle,
  XCircle,
  CreditCard,
  Plus,
  Edit,
  Trash2,
  Building,
  Mail,
  Phone,
  Hash,
  Wallet,
  Bell,
} from 'lucide-react'

interface ChangePasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export const SettingsPage = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const { data: twoFAStatus, refetch: refetch2FAStatus } = use2FAStatus()
  const { data: paymentMethodsData, refetch: refetchPaymentMethods } = usePaymentMethods()
  const { currency, setCurrency } = useCurrencyStore()
  const changePasswordMutation = useChangePassword()
  const enable2FAMutation = useEnable2FA()
  const disable2FAMutation = useDisable2FA()
  const verify2FAMutation = useVerify2FA()
  const createPaymentMethodMutation = useCreatePaymentMethod()
  const updatePaymentMethodMutation = useUpdatePaymentMethod()
  const deletePaymentMethodMutation = useDeletePaymentMethod()
  const toast = useToast()

  // Check if user came from payment-methods route
  const initialTab = location.pathname.includes('/payment-methods') ? 'payment-methods' : 'general'
  const [activeTab, setActiveTab] = useState<
    'general' | 'security' | '2fa' | 'payment-methods' | 'notifications'
  >(initialTab)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [passwordData, setPasswordData] = useState<ChangePasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})
  const [show2FAQRCode, setShow2FAQRCode] = useState(false)
  const [qrCodeData, setQRCodeData] = useState<{
    qr_code: string
    backup_codes: string[]
    secret: string
  } | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [showPaymentMethodForm, setShowPaymentMethodForm] = useState(false)
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<any>(null)
  const [selectedPaymentType, setSelectedPaymentType] = useState('')

  // PIX specific fields
  const [pixData, setPixData] = useState({
    keyType: '',
    keyValue: '',
    holderName: '',
  })

  // Bank Transfer specific fields
  const [bankData, setBankData] = useState({
    bank: '',
    accountType: '',
    agency: '',
    account: '',
    holderName: '',
    holderDocument: '',
  })

  // Digital Wallet specific fields
  const [walletData, setWalletData] = useState({
    walletType: '',
    identifier: '',
    holderName: '',
  })

  // Use the 2FA status from the API
  const is2FAEnabled = twoFAStatus?.enabled || false

  useEffect(() => {
    // Refetch 2FA status when tab becomes active
    if (activeTab === '2fa') {
      refetch2FAStatus()
    }
    // Refetch payment methods when tab becomes active
    if (activeTab === 'payment-methods') {
      refetchPaymentMethods()
    }
  }, [activeTab, refetch2FAStatus, refetchPaymentMethods])

  const tabs = [
    { id: 'general', name: 'Geral', icon: Settings },
    { id: 'security', name: 'Segurança', icon: Shield },
    { id: '2fa', name: 'Autenticação 2FA', icon: ShieldCheck },
    { id: 'payment-methods', name: 'Métodos de Pagamento', icon: CreditCard },
    { id: 'notifications', name: 'Notificações', icon: Bell },
  ] as const

  // Password validation
  const validatePasswordForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Senha atual é obrigatória'
    }

    if (!passwordData.newPassword) {
      errors.newPassword = 'Nova senha é obrigatória'
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = 'Nova senha deve ter pelo menos 8 caracteres'
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Senhas não coincidem'
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      errors.newPassword = 'Nova senha deve ser diferente da atual'
    }

    setPasswordErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validatePasswordForm()) return

    try {
      await changePasswordMutation.mutateAsync({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      })

      // Reset form
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setShowChangePassword(false)
      toast.success('Senha alterada com sucesso!')
    } catch (error: any) {
      setPasswordErrors({ currentPassword: error.message || 'Erro ao alterar senha' })
      toast.error(error.message || 'Erro ao alterar senha')
    }
  }

  const handleEnable2FA = async () => {
    try {
      const result = await enable2FAMutation.mutateAsync()
      setQRCodeData(result)
      setShow2FAQRCode(true)
      toast.info('Escaneie o QR code com seu aplicativo autenticador')
    } catch (error: any) {
      toast.error('Erro ao habilitar 2FA: ' + error.message)
    }
  }

  const handleVerify2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.warning('Digite um código de 6 dígitos')
      return
    }

    try {
      await verify2FAMutation.mutateAsync(verificationCode)
      setVerificationCode('')
      setShow2FAQRCode(false)
      setQRCodeData(null)
      await refetch2FAStatus()
      toast.success('✅ 2FA ativado com sucesso! Sua conta está mais segura.')
    } catch (error: any) {
      toast.error('Código inválido: ' + error.message)
    }
  }

  const handleDisable2FA = async () => {
    if (!verificationCode) {
      toast.warning('Digite o código de verificação para desabilitar 2FA')
      return
    }

    try {
      await disable2FAMutation.mutateAsync(verificationCode)
      setVerificationCode('')
      await refetch2FAStatus()
      toast.success('2FA desabilitado com sucesso!')
    } catch (error: any) {
      toast.error('Código inválido: ' + error.message)
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setPasswordData(prev => ({ ...prev, [name]: value }))

    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  // Payment Methods Handlers
  const handleAddPaymentMethod = () => {
    setEditingPaymentMethod(null)
    setSelectedPaymentType('')
    setPixData({ keyType: '', keyValue: '', holderName: '' })
    setBankData({
      bank: '',
      accountType: '',
      agency: '',
      account: '',
      holderName: '',
      holderDocument: '',
    })
    setWalletData({ walletType: '', identifier: '', holderName: '' })
    setShowPaymentMethodForm(true)
  }

  const handleEditPaymentMethod = (method: any) => {
    setEditingPaymentMethod(method)
    setSelectedPaymentType(method.type)

    // Parse the details JSON
    try {
      const details = JSON.parse(method.details)

      if (method.type === 'PIX') {
        setPixData(details)
      } else if (method.type === 'Transferência Bancária') {
        setBankData(details)
      } else if (['PayPal', 'PicPay', 'Mercado Pago', 'PagSeguro'].includes(method.type)) {
        setWalletData(details)
      }
    } catch (error) {
      console.error('Error parsing payment method details:', error)
    }

    setShowPaymentMethodForm(true)
  }

  const handleSavePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPaymentType) {
      toast.warning('Selecione o tipo de pagamento')
      return
    }

    let details = {}

    // Validate and prepare data based on type
    if (selectedPaymentType === 'PIX') {
      if (!pixData.keyType || !pixData.keyValue || !pixData.holderName) {
        toast.warning('Preencha todos os campos do PIX')
        return
      }
      details = pixData
    } else if (selectedPaymentType === 'Transferência Bancária') {
      if (
        !bankData.bank ||
        !bankData.accountType ||
        !bankData.agency ||
        !bankData.account ||
        !bankData.holderName ||
        !bankData.holderDocument
      ) {
        toast.warning('Preencha todos os campos da transferência bancária')
        return
      }
      details = bankData
    } else {
      if (!walletData.walletType || !walletData.identifier || !walletData.holderName) {
        toast.warning('Preencha todos os campos da carteira digital')
        return
      }
      details = walletData
    }

    try {
      // Mapear tipo para o formato aceito pelo backend
      const typeMapping: Record<string, string> = {
        PIX: 'pix',
        'Transferência Bancária': 'bank_transfer',
        PayPal: 'paypal',
        PicPay: 'mercado_pago',
        'Mercado Pago': 'mercado_pago',
        PagSeguro: 'mercado_pago',
      }

      const paymentMethodData = {
        name: selectedPaymentType, // Nome amigável
        type: typeMapping[selectedPaymentType] || selectedPaymentType.toLowerCase(),
        details: details as Record<string, any>,
      }

      if (editingPaymentMethod) {
        await updatePaymentMethodMutation.mutateAsync({
          methodId: editingPaymentMethod.id,
          updates: paymentMethodData as any,
        })
        toast.success('Método de pagamento atualizado!')
      } else {
        await createPaymentMethodMutation.mutateAsync(paymentMethodData)
        toast.success('Método de pagamento adicionado!')
      }

      setShowPaymentMethodForm(false)
      setSelectedPaymentType('')
      setPixData({ keyType: '', keyValue: '', holderName: '' })
      setBankData({
        bank: '',
        accountType: '',
        agency: '',
        account: '',
        holderName: '',
        holderDocument: '',
      })
      setWalletData({ walletType: '', identifier: '', holderName: '' })
      setEditingPaymentMethod(null)
      refetchPaymentMethods()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar método de pagamento')
    }
  }

  const handleDeletePaymentMethod = async (id: string | number) => {
    if (!confirm('Tem certeza que deseja excluir este método de pagamento?')) {
      return
    }

    try {
      await deletePaymentMethodMutation.mutateAsync(String(id))
      toast.success('Método de pagamento excluído!')
      refetchPaymentMethods()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir método de pagamento')
    }
  }

  return (
    <div className='space-y-3 sm:space-y-4 md:space-y-6 pb-24'>
      {/* Hero Header - Similar to P2P */}
      <div className='relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900'>
        {/* Background Pattern */}
        <div className='absolute inset-0 opacity-10'>
          <div className='absolute top-0 left-0 w-32 h-32 bg-indigo-500 rounded-full blur-3xl' />
          <div className='absolute bottom-0 right-0 w-48 h-48 bg-purple-500 rounded-full blur-3xl' />
        </div>

        <div className='relative p-3 sm:p-4'>
          {/* Top Bar */}
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center gap-2 sm:gap-3'>
              <div className='w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg'>
                <Settings className='w-4 h-4 sm:w-5 sm:h-5 text-white' />
              </div>
              <div>
                <p className='text-[9px] sm:text-[10px] text-indigo-400 font-semibold uppercase tracking-wider'>
                  {t('settings.title', 'Configurações')}
                </p>
                <h1 className='text-base sm:text-lg font-bold text-white leading-tight'>
                  Preferências & Segurança
                </h1>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className='flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 scrollbar-hide'>
            <div className='flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 bg-emerald-500/20 backdrop-blur-sm rounded-lg border border-emerald-500/30 whitespace-nowrap flex-shrink-0'>
              <Shield className='w-3 h-3 text-emerald-400' />
              <span className='text-[9px] sm:text-[10px] text-emerald-300 font-medium'>
                {is2FAEnabled ? '2FA Ativo' : '2FA Inativo'}
              </span>
            </div>
            <div className='flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 bg-blue-500/20 backdrop-blur-sm rounded-lg border border-blue-500/30 whitespace-nowrap flex-shrink-0'>
              <User className='w-3 h-3 text-blue-400' />
              <span className='text-[9px] sm:text-[10px] text-blue-300 font-medium'>
                {user?.isVerified ? 'Verificado' : 'Não Verificado'}
              </span>
            </div>
            <div className='flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 bg-purple-500/20 backdrop-blur-sm rounded-lg border border-purple-500/30 whitespace-nowrap flex-shrink-0'>
              <DollarSign className='w-3 h-3 text-purple-400' />
              <span className='text-[9px] sm:text-[10px] text-purple-300 font-medium'>
                {currency}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs - Compact Pills Style */}
      <div className='bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden'>
        <div className='border-b border-gray-200 dark:border-gray-700'>
          <nav className='-mb-px flex overflow-x-auto gap-1 sm:gap-2 p-2 sm:p-3 scrollbar-hide'>
            {tabs.map(tab => {
              const IconComponent = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (tab.id === 'notifications') {
                      navigate('/settings/notifications')
                    } else {
                      setActiveTab(tab.id)
                    }
                  }}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <IconComponent className='w-3 h-3 sm:w-3.5 sm:h-3.5' />
                  <span className='hidden xs:inline sm:inline'>{tab.name}</span>
                </button>
              )
            })}
          </nav>
        </div>

        <div className='p-3 sm:p-4 md:p-6'>
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className='space-y-3 sm:space-y-4 md:space-y-6'>
              <div>
                <h3 className='text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3 md:mb-4'>
                  Configurações Gerais
                </h3>

                <div className='grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6'>
                  <LanguageDemo />

                  <div className='bg-gray-50 dark:bg-gray-700/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-100 dark:border-gray-600'>
                    <div className='flex items-center mb-2'>
                      <Palette className='w-4 h-4 sm:w-5 sm:h-5 mr-2 text-gray-700 dark:text-gray-300' />
                      <h4 className='text-xs sm:text-sm md:text-base font-medium text-gray-900 dark:text-white'>
                        Tema da Interface
                      </h4>
                    </div>
                    <p className='text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-300 mb-2 sm:mb-3'>
                      Escolha entre modo claro ou escuro
                    </p>
                    <div className='flex flex-wrap gap-1.5 sm:gap-2 md:gap-3'>
                      <button className='flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg'>
                        <Sun className='w-3 h-3 sm:w-4 sm:h-4 mr-1' />
                        Claro
                      </button>
                      <button className='flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm bg-gray-800 text-white border border-gray-600 rounded-lg'>
                        <Moon className='w-3 h-3 sm:w-4 sm:h-4 mr-1' />
                        Escuro
                      </button>
                      <button className='flex items-center justify-center px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs md:text-sm bg-blue-500 text-white rounded-lg'>
                        <Palette className='w-3 h-3 sm:w-4 sm:h-4 mr-1' />
                        Auto
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className='bg-gray-50 dark:bg-gray-700/50 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-100 dark:border-gray-600'>
                <div className='flex items-center mb-2'>
                  <DollarSign className='w-4 h-4 sm:w-5 sm:h-5 mr-2 text-gray-700 dark:text-gray-300' />
                  <h4 className='text-xs sm:text-sm md:text-base font-medium text-gray-900 dark:text-white'>
                    Moeda Preferencial
                  </h4>
                </div>
                <p className='text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-300 mb-2 sm:mb-3'>
                  Moeda usada para exibir valores
                </p>
                <label htmlFor='currency-select' className='sr-only'>
                  Selecionar moeda preferencial
                </label>
                <select
                  id='currency-select'
                  value={currency}
                  onChange={e => {
                    const newCurrency = e.target.value as Currency
                    setCurrency(newCurrency)
                    toast.success(`Moeda alterada para ${newCurrency}`)
                  }}
                  className='block w-full sm:w-48 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm md:text-base border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg text-gray-900 dark:text-white'
                >
                  <option value='BRL'>Real Brasileiro (BRL)</option>
                  <option value='USD'>Dólar Americano (USD)</option>
                  <option value='EUR'>Euro (EUR)</option>
                </select>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className='space-y-3 sm:space-y-4 md:space-y-6'>
              <div>
                <h3 className='text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3 md:mb-4'>
                  Configurações de Segurança
                </h3>

                {/* Account Info */}
                <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg sm:rounded-xl p-2.5 sm:p-3 md:p-4 mb-3 sm:mb-4 md:mb-6'>
                  <div className='flex items-start gap-2 sm:gap-3'>
                    <User className='w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 mt-0.5 text-blue-400 flex-shrink-0' />
                    <div className='flex-1 min-w-0'>
                      <h4 className='text-xs sm:text-sm md:text-base font-medium text-blue-900 dark:text-blue-100'>
                        Informações da Conta
                      </h4>
                      <p className='text-[10px] sm:text-xs md:text-sm text-blue-700 dark:text-blue-200 break-words'>
                        {user?.email} • Membro desde{' '}
                        {user?.createdAt
                          ? new Date(user.createdAt).toLocaleDateString('pt-BR')
                          : 'N/A'}
                      </p>
                      <p className='text-[10px] sm:text-xs md:text-sm text-blue-700 dark:text-blue-200 flex items-center mt-0.5'>
                        Status:{' '}
                        {user?.isVerified ? (
                          <>
                            <CheckCircle className='w-3 h-3 sm:w-4 sm:h-4 ml-1 mr-1 text-green-500' />
                            Verificado
                          </>
                        ) : (
                          <>
                            <AlertTriangle className='w-3 h-3 sm:w-4 sm:h-4 ml-1 mr-1 text-yellow-500' />
                            Não verificado
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Change Password */}
                <div className='border border-gray-200 dark:border-gray-600 rounded-lg sm:rounded-xl p-3 sm:p-4'>
                  <div className='flex items-center justify-between mb-3 sm:mb-4'>
                    <div>
                      <div className='flex items-center mb-1 sm:mb-2'>
                        <Key className='w-4 h-4 sm:w-5 sm:h-5 mr-2 text-gray-700 dark:text-gray-300' />
                        <h4 className='text-xs sm:text-sm font-medium text-gray-900 dark:text-white'>
                          Alterar Senha
                        </h4>
                      </div>
                      <p className='text-[10px] sm:text-xs text-gray-600 dark:text-gray-300'>
                        Atualize sua senha para manter sua conta segura
                      </p>
                    </div>
                    <button
                      onClick={() => setShowChangePassword(!showChangePassword)}
                      className='px-2 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400'
                    >
                      {showChangePassword ? 'Cancelar' : 'Alterar'}
                    </button>
                  </div>

                  {showChangePassword && (
                    <form onSubmit={handleChangePassword} className='space-y-3 sm:space-y-4'>
                      <div>
                        <label
                          htmlFor='current-password'
                          className='block text-[10px] sm:text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
                        >
                          Senha Atual
                        </label>
                        <input
                          type='password'
                          id='current-password'
                          name='currentPassword'
                          required
                          className='block w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                        />
                        {passwordErrors.currentPassword && (
                          <p className='mt-1 text-[10px] sm:text-xs text-red-600'>
                            {passwordErrors.currentPassword}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor='new-password'
                          className='block text-[10px] sm:text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
                        >
                          Nova Senha
                        </label>
                        <input
                          type='password'
                          id='new-password'
                          name='newPassword'
                          required
                          className='block w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                        />
                        {passwordErrors.newPassword && (
                          <p className='mt-1 text-[10px] sm:text-xs text-red-600'>
                            {passwordErrors.newPassword}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor='confirm-password'
                          className='block text-[10px] sm:text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'
                        >
                          Confirmar Nova Senha
                        </label>
                        <input
                          type='password'
                          id='confirm-password'
                          name='confirmPassword'
                          required
                          className='block w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                        />
                        {passwordErrors.confirmPassword && (
                          <p className='mt-1 text-[10px] sm:text-xs text-red-600'>
                            {passwordErrors.confirmPassword}
                          </p>
                        )}
                      </div>

                      <div className='flex flex-wrap gap-2 sm:gap-3'>
                        <button
                          type='submit'
                          disabled={changePasswordMutation.isPending}
                          className='px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50'
                        >
                          {changePasswordMutation.isPending ? 'Alterando...' : 'Alterar Senha'}
                        </button>
                        <button
                          type='button'
                          onClick={() => setShowChangePassword(false)}
                          className='px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Session Security */}
                <div className='border border-gray-200 dark:border-gray-600 rounded-lg sm:rounded-xl p-3 sm:p-4 mt-3 sm:mt-4'>
                  <div className='flex items-center mb-2'>
                    <Shield className='w-4 h-4 sm:w-5 sm:h-5 mr-2 text-gray-700 dark:text-gray-300' />
                    <h4 className='text-xs sm:text-sm font-medium text-gray-900 dark:text-white'>
                      Segurança de Sessão
                    </h4>
                  </div>
                  <div className='space-y-2 sm:space-y-3'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center'>
                        <Clock className='w-3 h-3 sm:w-4 sm:h-4 mr-2 text-gray-500' />
                        <span className='text-[10px] sm:text-xs text-gray-600 dark:text-gray-300'>
                          Timeout automático
                        </span>
                      </div>
                      <span className='text-[10px] sm:text-xs text-gray-900 dark:text-white font-medium'>
                        30 minutos
                      </span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center'>
                        <History className='w-3 h-3 sm:w-4 sm:h-4 mr-2 text-gray-500' />
                        <span className='text-[10px] sm:text-xs text-gray-600 dark:text-gray-300'>
                          Últimos logins
                        </span>
                      </div>
                      <button className='text-[10px] sm:text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400'>
                        Ver histórico
                      </button>
                    </div>
                    <button className='w-full flex items-center justify-center px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs bg-red-600 text-white rounded-lg hover:bg-red-700'>
                      <LogOut className='w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2' />
                      Encerrar todas as sessões
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2FA Tab */}
          {activeTab === '2fa' && (
            <div className='space-y-4 sm:space-y-6'>
              <div>
                <h3 className='text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-3 sm:mb-4'>
                  Autenticação de Dois Fatores (2FA)
                </h3>

                <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6'>
                  <div className='flex items-center'>
                    <ShieldCheck className='w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-yellow-400 flex-shrink-0' />
                    <div>
                      <h4 className='text-xs sm:text-sm font-medium text-yellow-900 dark:text-yellow-100 flex items-center flex-wrap gap-1'>
                        Status do 2FA:{' '}
                        {is2FAEnabled ? (
                          <>
                            <CheckCircle className='w-3 h-3 sm:w-4 sm:h-4 text-green-500' />
                            <span>Habilitado</span>
                          </>
                        ) : (
                          <>
                            <XCircle className='w-3 h-3 sm:w-4 sm:h-4 text-red-500' />
                            <span>Desabilitado</span>
                          </>
                        )}
                      </h4>
                      <p className='text-[10px] sm:text-xs text-yellow-700 dark:text-yellow-200 mt-0.5'>
                        A autenticação de dois fatores adiciona uma camada extra de segurança
                      </p>
                    </div>
                  </div>
                </div>

                {!is2FAEnabled ? (
                  <div className='border border-gray-200 dark:border-gray-600 rounded-lg sm:rounded-xl p-4 sm:p-6'>
                    <div className='flex items-center mb-3 sm:mb-4'>
                      <Smartphone className='w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-gray-700 dark:text-gray-300' />
                      <h4 className='text-sm sm:text-base font-medium text-gray-900 dark:text-white'>
                        Configurar 2FA
                      </h4>
                    </div>

                    <div className='space-y-3 sm:space-y-4'>
                      <div className='text-[10px] sm:text-xs md:text-sm text-gray-600 dark:text-gray-300'>
                        <p className='mb-1.5 sm:mb-2'>
                          Para configurar a autenticação de dois fatores:
                        </p>
                        <ol className='list-decimal list-inside space-y-0.5 sm:space-y-1 ml-2'>
                          <li>Baixe um app autenticador (Google Authenticator, Authy)</li>
                          <li>Clique em "Habilitar 2FA" para gerar o código QR</li>
                          <li>Escaneie o QR code com seu app autenticador</li>
                          <li>Digite o código de 6 dígitos para confirmar</li>
                        </ol>
                      </div>

                      {!show2FAQRCode ? (
                        <button
                          onClick={handleEnable2FA}
                          disabled={enable2FAMutation.isPending}
                          className='flex items-center px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50'
                        >
                          <CheckCircle className='w-4 h-4 sm:w-5 sm:h-5 mr-2' />
                          {enable2FAMutation.isPending ? 'Gerando QR...' : 'Habilitar 2FA'}
                        </button>
                      ) : (
                        <div className='space-y-3 sm:space-y-4'>
                          {qrCodeData && (
                            <>
                              <div className='text-center'>
                                <div className='inline-block p-3 sm:p-4 bg-white rounded-lg'>
                                  <img
                                    src={qrCodeData.qr_code}
                                    alt='QR Code 2FA'
                                    className='w-48 h-48 sm:w-64 sm:h-64 mx-auto'
                                  />
                                </div>
                                <p className='mt-2 text-[10px] sm:text-xs text-gray-600 dark:text-gray-300'>
                                  Escaneie este QR code com seu app autenticador
                                </p>
                                <p className='mt-1 sm:mt-2 text-[9px] sm:text-xs text-gray-500 dark:text-gray-400'>
                                  Ou digite:{' '}
                                  <span className='font-mono font-semibold'>
                                    {qrCodeData.secret}
                                  </span>
                                </p>
                              </div>

                              <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4'>
                                <div className='flex items-center mb-1.5 sm:mb-2'>
                                  <AlertTriangle className='w-4 h-4 sm:w-5 sm:h-5 mr-2 text-red-600' />
                                  <h5 className='text-xs sm:text-sm font-medium text-red-900 dark:text-red-100'>
                                    Códigos de Backup
                                  </h5>
                                </div>
                                <p className='text-[9px] sm:text-xs text-red-700 dark:text-red-200 mb-2'>
                                  Guarde estes códigos em lugar seguro:
                                </p>
                                <div className='bg-white dark:bg-gray-800 rounded p-2 sm:p-3 font-mono text-[10px] sm:text-xs grid grid-cols-2 gap-1 sm:gap-2'>
                                  {qrCodeData.backup_codes.map((code, index) => (
                                    <div key={index} className='text-gray-900 dark:text-gray-100'>
                                      {code}
                                    </div>
                                  ))}
                                </div>
                                <button
                                  onClick={() => {
                                    const text = qrCodeData.backup_codes.join('\n')
                                    navigator.clipboard.writeText(text)
                                    alert('Códigos copiados para a área de transferência!')
                                  }}
                                  className='mt-2 sm:mt-3 text-[10px] sm:text-xs text-red-700 dark:text-red-300 hover:underline'
                                >
                                  📋 Copiar códigos
                                </button>
                              </div>

                              <div>
                                <label
                                  htmlFor='verification-code'
                                  className='block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2'
                                >
                                  Digite o código de 6 dígitos para confirmar:
                                </label>
                                <div className='flex gap-2 sm:gap-3'>
                                  <input
                                    type='text'
                                    id='verification-code'
                                    maxLength={6}
                                    className='block w-24 sm:w-32 px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm sm:text-lg border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center font-mono'
                                    placeholder='000000'
                                    value={verificationCode}
                                    onChange={e =>
                                      setVerificationCode(e.target.value.replace(/\D/g, ''))
                                    }
                                  />
                                  <button
                                    onClick={handleVerify2FA}
                                    disabled={
                                      verify2FAMutation.isPending || verificationCode.length !== 6
                                    }
                                    className='px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50'
                                  >
                                    {verify2FAMutation.isPending ? 'Verificando...' : 'Confirmar'}
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className='border border-gray-200 dark:border-gray-600 rounded-lg sm:rounded-xl p-4 sm:p-6'>
                    <div className='flex items-center mb-3 sm:mb-4'>
                      <XCircle className='w-5 h-5 sm:w-6 sm:h-6 mr-2 sm:mr-3 text-red-600' />
                      <h4 className='text-sm sm:text-base font-medium text-gray-900 dark:text-white'>
                        Desabilitar 2FA
                      </h4>
                    </div>

                    <div className='space-y-3 sm:space-y-4'>
                      <p className='text-[10px] sm:text-xs text-gray-600 dark:text-gray-300'>
                        Para desabilitar, digite o código de verificação do seu app:
                      </p>

                      <div className='flex gap-2 sm:gap-3'>
                        <label htmlFor='disable-2fa-code' className='sr-only'>
                          Código de verificação para desabilitar 2FA
                        </label>
                        <input
                          type='text'
                          id='disable-2fa-code'
                          maxLength={6}
                          className='block w-24 sm:w-32 px-2.5 sm:px-3 py-1.5 sm:py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center font-mono'
                          placeholder='000000'
                          value={verificationCode}
                          onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                        />
                        <button
                          onClick={handleDisable2FA}
                          disabled={disable2FAMutation.isPending || verificationCode.length !== 6}
                          className='flex items-center px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50'
                        >
                          <XCircle className='w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2' />
                          {disable2FAMutation.isPending ? 'Desabilitando...' : 'Desabilitar'}
                        </button>
                      </div>

                      <div className='flex items-center text-[10px] sm:text-xs text-red-600 dark:text-red-400'>
                        <AlertTriangle className='w-3 h-3 sm:w-4 sm:h-4 mr-1' />
                        Desabilitar 2FA tornará sua conta menos segura
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment Methods Tab */}
          {activeTab === 'payment-methods' && (
            <div className='space-y-4 sm:space-y-6'>
              <div className='flex items-center justify-between mb-4 sm:mb-6'>
                <div>
                  <h3 className='text-sm sm:text-base md:text-lg font-semibold text-gray-900 dark:text-white'>
                    Métodos de Pagamento
                  </h3>
                  <p className='text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1'>
                    Gerencie suas formas de pagamento para P2P
                  </p>
                </div>
                <button
                  onClick={handleAddPaymentMethod}
                  className='flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
                >
                  <Plus className='w-3 h-3 sm:w-4 sm:h-4' />
                  <span className='hidden xs:inline'>Adicionar</span>
                  <span className='xs:hidden'>+</span>
                </button>
              </div>

              {/* Payment Method Form Modal */}
              {showPaymentMethodForm && (
                <div className='bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-4 sm:p-6 border-2 border-blue-500 dark:border-blue-400 shadow-lg'>
                  <h4 className='text-sm sm:text-base md:text-lg font-medium text-gray-900 dark:text-white mb-4 sm:mb-6'>
                    {editingPaymentMethod
                      ? 'Editar Método de Pagamento'
                      : 'Novo Método de Pagamento'}
                  </h4>

                  <form onSubmit={handleSavePaymentMethod} className='space-y-4 sm:space-y-6'>
                    {/* Payment Type Selection */}
                    <div>
                      <label className='block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 sm:mb-3'>
                        Tipo de Pagamento *
                      </label>
                      <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3'>
                        {[
                          { value: 'PIX', label: 'PIX', icon: QrCode },
                          {
                            value: 'Transferência Bancária',
                            label: 'TED',
                            icon: Building,
                          },
                          { value: 'PayPal', label: 'PayPal', icon: Wallet },
                          { value: 'PicPay', label: 'PicPay', icon: Wallet },
                          { value: 'Mercado Pago', label: 'MP', icon: Wallet },
                          { value: 'PagSeguro', label: 'PagSeg', icon: Wallet },
                        ].map(type => {
                          const IconComponent = type.icon
                          return (
                            <button
                              key={type.value}
                              type='button'
                              onClick={() => setSelectedPaymentType(type.value)}
                              className={`p-2 sm:p-4 border-2 rounded-lg transition-all ${
                                selectedPaymentType === type.value
                                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              <IconComponent className='w-4 h-4 sm:w-6 sm:h-6 mx-auto mb-1 sm:mb-2' />
                              <p className='text-[9px] sm:text-xs font-medium truncate'>
                                {type.label}
                              </p>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* PIX Form */}
                    {selectedPaymentType === 'PIX' && (
                      <div className='space-y-3 sm:space-y-4 bg-blue-50 dark:bg-blue-900/10 p-3 sm:p-4 rounded-lg border border-blue-200 dark:border-blue-800'>
                        <div className='flex items-center gap-2 mb-2 sm:mb-3'>
                          <QrCode className='w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400' />
                          <h5 className='text-xs sm:text-sm font-medium text-gray-900 dark:text-white'>
                            Dados do PIX
                          </h5>
                        </div>

                        <div>
                          <label className='block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2'>
                            Tipo de Chave PIX *
                          </label>
                          <select
                            aria-label='Tipo de chave PIX'
                            value={pixData.keyType}
                            onChange={e =>
                              setPixData(prev => ({ ...prev, keyType: e.target.value }))
                            }
                            className='w-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                            required
                          >
                            <option value=''>Selecione o tipo de chave</option>
                            <option value='CPF'>CPF</option>
                            <option value='CNPJ'>CNPJ</option>
                            <option value='E-mail'>E-mail</option>
                            <option value='Celular'>Celular</option>
                            <option value='Chave Aleatória'>Chave Aleatória</option>
                          </select>
                        </div>

                        <div>
                          <label className='block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2'>
                            Chave PIX *
                          </label>
                          <input
                            type='text'
                            value={pixData.keyValue}
                            onChange={e =>
                              setPixData(prev => ({ ...prev, keyValue: e.target.value }))
                            }
                            placeholder={
                              pixData.keyType === 'CPF'
                                ? '123.456.789-00'
                                : pixData.keyType === 'CNPJ'
                                  ? '12.345.678/0001-00'
                                  : pixData.keyType === 'E-mail'
                                    ? 'seu@email.com'
                                    : pixData.keyType === 'Celular'
                                      ? '(11) 98765-4321'
                                      : pixData.keyType === 'Chave Aleatória'
                                        ? 'cole sua chave aleatória'
                                        : 'Selecione o tipo de chave primeiro'
                            }
                            className='w-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                            required
                          />
                        </div>

                        <div>
                          <label className='block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2'>
                            Nome do Titular *
                          </label>
                          <input
                            type='text'
                            value={pixData.holderName}
                            onChange={e =>
                              setPixData(prev => ({ ...prev, holderName: e.target.value }))
                            }
                            placeholder='Nome completo do titular'
                            className='w-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                            required
                          />
                        </div>
                      </div>
                    )}

                    {/* Bank Transfer Form */}
                    {selectedPaymentType === 'Transferência Bancária' && (
                      <div className='space-y-3 sm:space-y-4 bg-green-50 dark:bg-green-900/10 p-3 sm:p-4 rounded-lg border border-green-200 dark:border-green-800'>
                        <div className='flex items-center gap-2 mb-2 sm:mb-3'>
                          <Building className='w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400' />
                          <h5 className='text-xs sm:text-sm font-medium text-gray-900 dark:text-white'>
                            Dados Bancários
                          </h5>
                        </div>

                        <div>
                          <label className='block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2'>
                            Banco *
                          </label>
                          <select
                            aria-label='Selecione o banco'
                            value={bankData.bank}
                            onChange={e => setBankData(prev => ({ ...prev, bank: e.target.value }))}
                            className='w-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                            required
                          >
                            <option value=''>Selecione o banco</option>
                            <option value='001 - Banco do Brasil'>001 - Banco do Brasil</option>
                            <option value='033 - Santander'>033 - Santander</option>
                            <option value='104 - Caixa Econômica'>104 - Caixa Econômica</option>
                            <option value='237 - Bradesco'>237 - Bradesco</option>
                            <option value='341 - Itaú'>341 - Itaú</option>
                            <option value='260 - Nubank'>260 - Nubank</option>
                            <option value='077 - Inter'>077 - Inter</option>
                            <option value='212 - Banco Original'>212 - Banco Original</option>
                            <option value='290 - PagSeguro'>290 - PagSeguro</option>
                            <option value='323 - Mercado Pago'>323 - Mercado Pago</option>
                            <option value='336 - C6 Bank'>336 - C6 Bank</option>
                            <option value='389 - Banco Mercantil'>389 - Banco Mercantil</option>
                            <option value='422 - Banco Safra'>422 - Banco Safra</option>
                            <option value='748 - Sicredi'>748 - Sicredi</option>
                            <option value='756 - Sicoob'>756 - Sicoob</option>
                            <option value='Outro'>Outro</option>
                          </select>
                        </div>

                        <div className='grid grid-cols-2 gap-2 sm:gap-4'>
                          <div>
                            <label className='block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2'>
                              Tipo de Conta *
                            </label>
                            <select
                              aria-label='Tipo de conta'
                              value={bankData.accountType}
                              onChange={e =>
                                setBankData(prev => ({ ...prev, accountType: e.target.value }))
                              }
                              className='w-full px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                              required
                            >
                              <option value=''>Selecione</option>
                              <option value='Conta Corrente'>Corrente</option>
                              <option value='Conta Poupança'>Poupança</option>
                              <option value='Conta Pagamento'>Pagamento</option>
                            </select>
                          </div>

                          <div>
                            <label className='block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2'>
                              Agência *
                            </label>
                            <input
                              type='text'
                              value={bankData.agency}
                              onChange={e =>
                                setBankData(prev => ({ ...prev, agency: e.target.value }))
                              }
                              placeholder='0001'
                              className='w-full px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                              required
                            />
                          </div>
                        </div>

                        <div>
                          <label className='block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2'>
                            Número da Conta *
                          </label>
                          <input
                            type='text'
                            value={bankData.account}
                            onChange={e =>
                              setBankData(prev => ({ ...prev, account: e.target.value }))
                            }
                            placeholder='12345-6'
                            className='w-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                            required
                          />
                        </div>

                        <div>
                          <label className='block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2'>
                            Nome do Titular *
                          </label>
                          <input
                            type='text'
                            value={bankData.holderName}
                            onChange={e =>
                              setBankData(prev => ({ ...prev, holderName: e.target.value }))
                            }
                            placeholder='Nome completo'
                            className='w-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                            required
                          />
                        </div>

                        <div>
                          <label className='block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2'>
                            CPF/CNPJ do Titular *
                          </label>
                          <input
                            type='text'
                            value={bankData.holderDocument}
                            onChange={e =>
                              setBankData(prev => ({ ...prev, holderDocument: e.target.value }))
                            }
                            placeholder='123.456.789-00'
                            className='w-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                            required
                          />
                        </div>
                      </div>
                    )}

                    {/* Digital Wallet Form (PayPal, PicPay, etc) */}
                    {['PayPal', 'PicPay', 'Mercado Pago', 'PagSeguro'].includes(
                      selectedPaymentType
                    ) && (
                      <div className='space-y-3 sm:space-y-4 bg-purple-50 dark:bg-purple-900/10 p-3 sm:p-4 rounded-lg border border-purple-200 dark:border-purple-800'>
                        <div className='flex items-center gap-2 mb-2 sm:mb-3'>
                          <Wallet className='w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400' />
                          <h5 className='text-xs sm:text-sm font-medium text-gray-900 dark:text-white'>
                            Dados da Carteira Digital
                          </h5>
                        </div>

                        <div>
                          <label className='block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2'>
                            Tipo de Identificador *
                          </label>
                          <select
                            aria-label='Tipo de identificador'
                            value={walletData.walletType}
                            onChange={e =>
                              setWalletData(prev => ({ ...prev, walletType: e.target.value }))
                            }
                            className='w-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                            required
                          >
                            <option value=''>Selecione o tipo</option>
                            <option value='E-mail'>E-mail</option>
                            <option value='Telefone'>Telefone</option>
                            <option value='CPF'>CPF</option>
                            <option value='ID da Conta'>ID da Conta</option>
                          </select>
                        </div>

                        <div>
                          <label className='block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2'>
                            {walletData.walletType || 'Identificador'} *
                          </label>
                          <input
                            type='text'
                            value={walletData.identifier}
                            onChange={e =>
                              setWalletData(prev => ({ ...prev, identifier: e.target.value }))
                            }
                            placeholder={
                              walletData.walletType === 'E-mail'
                                ? 'seu@email.com'
                                : walletData.walletType === 'Telefone'
                                  ? '(11) 98765-4321'
                                  : walletData.walletType === 'CPF'
                                    ? '123.456.789-00'
                                    : 'Digite'
                            }
                            className='w-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                            required
                          />
                        </div>

                        <div>
                          <label className='block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2'>
                            Nome do Titular *
                          </label>
                          <input
                            type='text'
                            value={walletData.holderName}
                            onChange={e =>
                              setWalletData(prev => ({ ...prev, holderName: e.target.value }))
                            }
                            placeholder='Nome completo'
                            className='w-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                            required
                          />
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className='flex gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700'>
                      <button
                        type='submit'
                        disabled={
                          createPaymentMethodMutation.isPending ||
                          updatePaymentMethodMutation.isPending
                        }
                        className='flex-1 px-4 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium'
                      >
                        {createPaymentMethodMutation.isPending ||
                        updatePaymentMethodMutation.isPending
                          ? 'Salvando...'
                          : editingPaymentMethod
                            ? 'Atualizar'
                            : 'Adicionar'}
                      </button>
                      <button
                        type='button'
                        onClick={() => {
                          setShowPaymentMethodForm(false)
                          setSelectedPaymentType('')
                          setPixData({ keyType: '', keyValue: '', holderName: '' })
                          setBankData({
                            bank: '',
                            accountType: '',
                            agency: '',
                            account: '',
                            holderName: '',
                            holderDocument: '',
                          })
                          setWalletData({ walletType: '', identifier: '', holderName: '' })
                          setEditingPaymentMethod(null)
                        }}
                        className='px-4 sm:px-6 py-2 sm:py-3 text-[10px] sm:text-xs border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium'
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Payment Methods List */}
              {paymentMethodsData && paymentMethodsData.length > 0 ? (
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4'>
                  {paymentMethodsData.map((method: any) => {
                    // Details is already an object from backend, no need to parse
                    const detailsObj =
                      typeof method.details === 'string'
                        ? JSON.parse(method.details)
                        : method.details

                    // Determine icon based on type (case-insensitive)
                    const typeUpper = method.type?.toUpperCase() || ''
                    const getIcon = () => {
                      if (typeUpper === 'PIX') return QrCode
                      if (typeUpper.includes('BANC') || typeUpper === 'BANK') return Building
                      if (typeUpper.includes('MERCADO')) return Wallet
                      return Wallet
                    }
                    const IconComponent = getIcon()

                    // Determine color scheme
                    const getColorScheme = () => {
                      if (typeUpper === 'PIX')
                        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                      if (typeUpper.includes('BANC') || typeUpper === 'BANK')
                        return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
                      return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800'
                    }

                    return (
                      <div
                        key={method.id}
                        className='bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-lg sm:rounded-xl overflow-hidden hover:shadow-lg transition-all'
                      >
                        {/* Header */}
                        <div className={`px-3 sm:px-4 py-2 sm:py-3 border-b ${getColorScheme()}`}>
                          <div className='flex items-center gap-2 sm:gap-3'>
                            <div className='p-1.5 sm:p-2 bg-white/50 dark:bg-gray-900/30 rounded-lg'>
                              <IconComponent className='w-4 h-4 sm:w-5 sm:h-5' />
                            </div>
                            <div className='flex-1 min-w-0'>
                              <h4 className='text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate'>
                                {method.type}
                              </h4>
                              <p className='text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 truncate'>
                                {detailsObj.holderName || 'Titular não informado'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Details Body */}
                        <div className='px-3 sm:px-4 py-2.5 sm:py-4 space-y-1.5 sm:space-y-2'>
                          {/* PIX Details */}
                          {method.type === 'PIX' && (
                            <>
                              <div className='flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs'>
                                <span className='text-gray-500 dark:text-gray-400 font-medium'>
                                  Tipo:
                                </span>
                                <span className='text-gray-900 dark:text-white'>
                                  {detailsObj.keyType}
                                </span>
                              </div>
                              <div className='flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs'>
                                <span className='text-gray-500 dark:text-gray-400 font-medium'>
                                  Chave:
                                </span>
                                <span className='text-gray-900 dark:text-white font-mono truncate'>
                                  {detailsObj.keyValue}
                                </span>
                              </div>
                            </>
                          )}

                          {/* Bank Transfer Details */}
                          {method.type === 'Transferência Bancária' && (
                            <>
                              <div className='flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs'>
                                <span className='text-gray-500 dark:text-gray-400 font-medium'>
                                  Banco:
                                </span>
                                <span className='text-gray-900 dark:text-white truncate'>
                                  {detailsObj.bank}
                                </span>
                              </div>
                              <div className='grid grid-cols-2 gap-1.5 sm:gap-2 text-[10px] sm:text-xs'>
                                <div>
                                  <span className='text-gray-500 dark:text-gray-400 font-medium'>
                                    Ag:
                                  </span>
                                  <span className='ml-1 text-gray-900 dark:text-white font-mono'>
                                    {detailsObj.agency}
                                  </span>
                                </div>
                                <div>
                                  <span className='text-gray-500 dark:text-gray-400 font-medium'>
                                    Conta:
                                  </span>
                                  <span className='ml-1 text-gray-900 dark:text-white font-mono'>
                                    {detailsObj.account}
                                  </span>
                                </div>
                              </div>
                              <div className='flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs'>
                                <span className='text-gray-500 dark:text-gray-400 font-medium'>
                                  CPF/CNPJ:
                                </span>
                                <span className='text-gray-900 dark:text-white font-mono'>
                                  {detailsObj.holderDocument}
                                </span>
                              </div>
                            </>
                          )}

                          {/* Digital Wallet Details */}
                          {['PayPal', 'PicPay', 'Mercado Pago', 'PagSeguro'].includes(
                            method.type
                          ) && (
                            <>
                              <div className='flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs'>
                                <span className='text-gray-500 dark:text-gray-400 font-medium'>
                                  Tipo:
                                </span>
                                <span className='text-gray-900 dark:text-white'>
                                  {detailsObj.walletType}
                                </span>
                              </div>
                              <div className='flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs'>
                                <span className='text-gray-500 dark:text-gray-400 font-medium'>
                                  Identificador:
                                </span>
                                <span className='text-gray-900 dark:text-white font-mono truncate'>
                                  {detailsObj.identifier}
                                </span>
                              </div>
                            </>
                          )}

                          {/* Fallback for unknown format */}
                          {detailsObj.raw && (
                            <p className='text-[10px] sm:text-xs text-gray-600 dark:text-gray-400'>
                              {detailsObj.raw}
                            </p>
                          )}
                        </div>

                        {/* Actions Footer */}
                        <div className='px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600 flex gap-2'>
                          <button
                            onClick={() => handleEditPaymentMethod(method)}
                            className='flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors'
                          >
                            <Edit className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeletePaymentMethod(method.id)}
                            disabled={deletePaymentMethodMutation.isPending}
                            className='flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50'
                          >
                            <Trash2 className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
                            Excluir
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className='text-center py-6 sm:py-8 md:py-12 bg-gray-50 dark:bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600'>
                  <CreditCard className='w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 mx-auto text-gray-400 mb-2 sm:mb-4' />
                  <p className='text-xs sm:text-sm md:text-base text-gray-600 dark:text-gray-400 mb-2 sm:mb-4 px-4'>
                    Você ainda não tem métodos de pagamento cadastrados
                  </p>
                  <button
                    onClick={handleAddPaymentMethod}
                    className='inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
                  >
                    <Plus className='w-3.5 h-3.5 sm:w-4 sm:h-4' />
                    Adicionar Primeiro Método
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />

      {/* Custom CSS for hiding scrollbar */}
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
