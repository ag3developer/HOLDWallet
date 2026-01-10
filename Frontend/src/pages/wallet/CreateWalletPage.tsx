import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  WalletIcon,
  PlusIcon,
  PlusCircleIcon,
  RotateCcwIcon,
  EyeIcon,
  EyeOffIcon,
  CopyIcon,
  CheckIcon,
  AlertTriangleIcon,
  ShieldIcon,
  InfoIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  DownloadIcon,
  PrinterIcon,
  CheckCircleIcon,
  XCircleIcon,
  SmartphoneIcon,
  RefreshCwIcon,
  PartyPopperIcon,
  GlobeIcon,
  KeyIcon,
} from 'lucide-react'
import { useWallets } from '@/hooks/useWallets'
import { useAuthStore } from '@/stores/useAuthStore'
import { WalletCreate, WalletRestore, WalletWithMnemonic } from '@/services/walletService'

type Step =
  | 'choose'
  | 'create-form'
  | 'restore-form'
  | 'mnemonic-display'
  | 'mnemonic-confirm'
  | 'success'

export const CreateWalletPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { createWallet, restoreWallet, isCreating, getSupportedNetworks } = useWallets()
  const authState = useAuthStore()

  const [currentStep, setCurrentStep] = useState<Step>('choose')
  const [walletType, setWalletType] = useState<'create' | 'restore'>('create')
  const [showMnemonic, setShowMnemonic] = useState(false)
  const [copiedMnemonic, setCopiedMnemonic] = useState(false)
  const [createdWallet, setCreatedWallet] = useState<WalletWithMnemonic | null>(null)
  const [mnemonicConfirmed, setMnemonicConfirmed] = useState(false)
  const [confirmationWords, setConfirmationWords] = useState<{ [key: number]: string }>({})
  const [randomWordIndices, setRandomWordIndices] = useState<number[]>([])

  // Formulário para criar carteira
  const [createForm, setCreateForm] = useState<WalletCreate>({
    name: '',
    network: 'multi', // Carteira multi-rede por padrão
    passphrase: '',
  })

  // Formulário para restaurar carteira
  const [restoreForm, setRestoreForm] = useState<WalletRestore>({
    name: '',
    network: 'multi', // Carteira multi-rede por padrão
    mnemonic: '',
    passphrase: '',
  })

  const supportedNetworks = getSupportedNetworks()

  // Verificar autenticação ao carregar
  useEffect(() => {
    console.log('[CreateWalletPage] 🔐 Auth state:', {
      isAuthenticated: authState.isAuthenticated,
      hasUser: !!authState.user,
      hasToken: !!authState.token,
    })

    if (!authState.isAuthenticated) {
      console.warn('[CreateWalletPage] ⚠️ User not authenticated, redirecting to login')
      toast.error('Você precisa estar autenticado para criar uma carteira')
      navigate('/login', { replace: true })
    }
  }, [authState.isAuthenticated, authState.user, navigate])

  // Prevenir fechamento acidental quando há mnemonic não confirmada
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (createdWallet && !mnemonicConfirmed && currentStep !== 'success') {
        e.preventDefault()
        e.returnValue = 'Você tem uma frase de recuperação não salva. Tem certeza que deseja sair?'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [createdWallet, mnemonicConfirmed, currentStep])

  // Gerar índices aleatórios para confirmação da mnemonic
  const generateRandomIndices = (mnemonicArray: string[]) => {
    const indices: number[] = []
    while (indices.length < 3) {
      const randomIndex = Math.floor(Math.random() * mnemonicArray.length)
      if (!indices.includes(randomIndex)) {
        indices.push(randomIndex)
      }
    }
    return indices.sort((a, b) => a - b)
  }

  // Criar nova carteira
  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!createForm.name) {
      toast.error('Nome da carteira é obrigatório')
      return
    }

    // Pre-flight check: Ensure auth is ready
    const currentAuthState = useAuthStore.getState()
    console.log('[CreateWallet] 🎫 PRE-FLIGHT CHECK:', {
      isAuthenticated: currentAuthState.isAuthenticated,
      hasToken: !!currentAuthState.token,
      tokenPreview: currentAuthState.token
        ? currentAuthState.token.substring(0, 30) + '...'
        : '(null)',
      user: currentAuthState.user?.email,
    })

    if (!currentAuthState.isAuthenticated || !currentAuthState.token) {
      console.error('[CreateWallet] ❌ PRE-FLIGHT FAILED: Not authenticated')
      toast.error('Você precisa estar autenticado. Por favor, faça login novamente.')
      navigate('/login', { replace: true })
      return
    }

    try {
      console.log('[CreateWallet] 🎫 Starting wallet creation...')
      console.log('[CreateWallet] Calling createWallet with data:', createForm)
      const wallet = await createWallet(createForm)
      console.log('[CreateWallet] ✅ Wallet created successfully:', wallet)
      setCreatedWallet(wallet)

      // Gerar índices para confirmação
      if (wallet.mnemonic) {
        const words = wallet.mnemonic.split(' ')
        setRandomWordIndices(generateRandomIndices(words))
      }

      setCurrentStep('mnemonic-display')
      toast.success('Carteira criada com sucesso!')
    } catch (error: any) {
      console.error('[CreateWallet] ❌ Error creating wallet:', error)
      console.error('[CreateWallet] Error details:', {
        message: error.message,
        status: error.status,
        code: error.code,
        details: error.details,
      })
      toast.error(`Erro ao criar carteira: ${error.message}`)
    }
  }

  // Restaurar carteira existente
  const handleRestoreWallet = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!restoreForm.name || !restoreForm.mnemonic) {
      toast.error('Nome e frase de recuperação são obrigatórios')
      return
    }

    try {
      await restoreWallet(restoreForm)
      setCurrentStep('success')
      toast.success('Carteira restaurada com sucesso!')
    } catch (error: any) {
      toast.error(`Erro ao restaurar carteira: ${error.message}`)
    }
  }

  // Copiar frase mnemônica
  const copyMnemonic = async () => {
    if (!createdWallet?.mnemonic) return

    try {
      await navigator.clipboard.writeText(createdWallet.mnemonic)
      setCopiedMnemonic(true)
      toast.success('Frase de recuperação copiada!')
      setTimeout(() => setCopiedMnemonic(false), 2000)
    } catch (error) {
      toast.error('Não foi possível copiar a frase de recuperação')
    }
  }

  // Verificar confirmação da mnemonic
  const validateMnemonicConfirmation = () => {
    if (!createdWallet?.mnemonic) return false

    const words = createdWallet.mnemonic.split(' ')
    return randomWordIndices.every(index => {
      const userInput = confirmationWords[index]?.toLowerCase().trim()
      const correctWord = words[index]?.toLowerCase()
      return userInput === correctWord
    })
  }

  // Avançar para confirmação
  const proceedToConfirmation = () => {
    if (!showMnemonic) {
      toast.error('Você precisa visualizar a frase de recuperação antes de prosseguir')
      return
    }
    setCurrentStep('mnemonic-confirm')
  }

  // Confirmar e finalizar
  const confirmAndFinish = () => {
    if (!validateMnemonicConfirmation()) {
      toast.error('As palavras digitadas não conferem. Verifique e tente novamente.')
      return
    }

    setMnemonicConfirmed(true)
    setCurrentStep('success')
    toast.success('Carteira configurada com sucesso!')
  }

  // Baixar backup da mnemonic
  const downloadMnemonicBackup = () => {
    if (!createdWallet?.mnemonic) return

    const content = `WOLK NOW - Backup da Frase de Recuperação
====================================

Nome da Carteira: ${createdWallet.name}
Tipo: Carteira WOLK Multi Chain
Data de Criação: ${new Date().toLocaleString('pt-BR')}

FRASE DE RECUPERAÇÃO (12 palavras):
${createdWallet.mnemonic}

REDES SUPORTADAS:
- Bitcoin (BTC) - Derivation Path: m/44'/0'/0'
- Ethereum (ETH) - Derivation Path: m/44'/60'/0'
- Litecoin (LTC) - Derivation Path: m/44'/2'/0'
- E outras criptomoedas compatíveis com BIP44

INSTRUÇÕES DE SEGURANÇA:
- Esta frase de recuperação funciona para TODAS as criptomoedas
- Mantenha esta frase em local seguro e privado
- Nunca compartilhe com terceiros
- Use para recuperar sua carteira em qualquer dispositivo
- Exclua este arquivo após guardar a frase em local seguro

====================================
WOLK NOW - Sua plataforma P2P segura
`

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `HOLD_Wallet_Backup_${createdWallet.name.replace(/\s+/g, '_')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const renderStepIndicator = () => {
    const steps =
      walletType === 'create'
        ? ['Escolher Tipo', 'Formulário', 'Frase de Recuperação', 'Confirmar Frase', 'Concluído']
        : ['Escolher Tipo', 'Restaurar', 'Concluído']

    const currentStepIndex =
      walletType === 'create'
        ? ['choose', 'create-form', 'mnemonic-display', 'mnemonic-confirm', 'success'].indexOf(
            currentStep
          )
        : ['choose', 'restore-form', 'success'].indexOf(currentStep)

    return (
      <div className='flex items-center justify-center mb-6 sm:mb-8'>
        <div className='flex items-center overflow-x-auto min-w-max px-4'>
          {steps.map((step, index) => (
            <React.Fragment key={index}>
              <div
                className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full flex-shrink-0 ${
                  index <= currentStepIndex
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                {index < currentStepIndex ? (
                  <CheckCircleIcon className='w-3 h-3 sm:w-5 sm:h-5' />
                ) : (
                  <span className='text-xs sm:text-sm font-medium'>{index + 1}</span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-8 sm:w-12 h-0.5 sm:h-1 mx-1 sm:mx-2 flex-shrink-0 ${
                    index < currentStepIndex ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 py-4 sm:py-8 pb-24'>
      <div className='max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8'>
        {/* Premium Header */}
        <div className='flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6'>
          <button
            onClick={() => navigate('/wallet')}
            className='p-2 sm:p-2.5 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors border border-gray-200 dark:border-gray-700 shadow-sm'
            title='Voltar para carteiras'
          >
            <ArrowLeftIcon className='w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400' />
          </button>
          <div className='flex-1 min-w-0'>
            <h1 className='text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate'>
              {walletType === 'create'
                ? 'Criar Carteira Principal'
                : 'Restaurar Carteira Principal'}
            </h1>
            <p className='text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1'>
              {walletType === 'create'
                ? 'Crie sua Carteira WOLK Multi Chain'
                : 'Recupere sua Carteira WOLK com a frase de recuperação'}
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className='mb-4 sm:mb-6 overflow-x-auto'>{renderStepIndicator()}</div>

        {/* Content */}
        <div className='bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden'>
          {currentStep === 'choose' && (
            <div className='space-y-6 sm:space-y-8'>
              {/* Hero Section */}
              <div className='relative bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 p-4 sm:p-6 md:p-8'>
                {/* Animated Background Effects */}
                <div className='absolute inset-0 overflow-hidden'>
                  <div className='absolute top-0 left-0 w-32 h-32 sm:w-48 sm:h-48 bg-blue-500 rounded-full blur-3xl opacity-20' />
                  <div className='absolute bottom-0 right-0 w-40 h-40 sm:w-64 sm:h-64 bg-purple-500 rounded-full blur-3xl opacity-20' />
                </div>

                <div className='relative text-center'>
                  <div className='flex justify-center mb-4'>
                    <div className='w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl sm:rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/30'>
                      <WalletIcon className='w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-white' />
                    </div>
                  </div>
                  <h2 className='text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2'>
                    Como deseja prosseguir?
                  </h2>
                  <p className='text-sm sm:text-base text-blue-200/80 max-w-md mx-auto'>
                    Escolha entre criar uma nova carteira ou restaurar uma existente
                  </p>
                </div>
              </div>

              {/* Options */}
              <div className='p-4 sm:p-6 md:p-8 space-y-4'>
                {/* Create Option */}
                <button
                  onClick={() => {
                    setWalletType('create')
                    setCurrentStep('create-form')
                  }}
                  className='w-full p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-xl sm:rounded-2xl hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 transition-all group text-left'
                >
                  <div className='flex items-start gap-3 sm:gap-4'>
                    <div className='w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform'>
                      <PlusIcon className='w-6 h-6 sm:w-7 sm:h-7 text-white' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <h3 className='text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2'>
                        Criar Carteira Principal
                        <span className='px-2 py-0.5 bg-blue-500 text-white text-[10px] sm:text-xs font-semibold rounded-full'>
                          Recomendado
                        </span>
                      </h3>
                      <p className='text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed'>
                        Crie sua Carteira WOLK Multi Chain com uma única frase de recuperação
                      </p>
                      <div className='flex flex-wrap gap-2 mt-3'>
                        <span className='inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] sm:text-xs font-medium rounded-lg'>
                          <ShieldIcon className='w-3 h-3' />
                          100% Seguro
                        </span>
                        <span className='inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] sm:text-xs font-medium rounded-lg'>
                          <SmartphoneIcon className='w-3 h-3' />
                          13 Blockchains
                        </span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Restore Option */}
                <button
                  onClick={() => {
                    setWalletType('restore')
                    setCurrentStep('restore-form')
                  }}
                  className='w-full p-4 sm:p-6 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-2 border-emerald-200 dark:border-emerald-700 rounded-xl sm:rounded-2xl hover:border-emerald-400 dark:hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/10 transition-all group text-left'
                >
                  <div className='flex items-start gap-3 sm:gap-4'>
                    <div className='w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/25 group-hover:scale-105 transition-transform'>
                      <RotateCcwIcon className='w-6 h-6 sm:w-7 sm:h-7 text-white' />
                    </div>
                    <div className='flex-1 min-w-0'>
                      <h3 className='text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1'>
                        Restaurar Carteira Principal
                      </h3>
                      <p className='text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed'>
                        Recupere sua Carteira WOLK existente usando a frase de recuperação
                      </p>
                      <div className='flex flex-wrap gap-2 mt-3'>
                        <span className='inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] sm:text-xs font-medium rounded-lg'>
                          <RefreshCwIcon className='w-3 h-3' />
                          12 ou 24 palavras
                        </span>
                        <span className='inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] sm:text-xs font-medium rounded-lg'>
                          <CheckCircleIcon className='w-3 h-3' />
                          Compatível BIP39
                        </span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Info Box */}
                <div className='bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 sm:p-4'>
                  <div className='flex gap-3'>
                    <div className='w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0'>
                      <AlertTriangleIcon className='w-4 h-4 sm:w-5 sm:h-5 text-white' />
                    </div>
                    <div>
                      <h4 className='text-xs sm:text-sm font-semibold text-amber-900 dark:text-amber-300 mb-1'>
                        Importante sobre Segurança
                      </h4>
                      <p className='text-[10px] sm:text-xs text-amber-700 dark:text-amber-400 leading-relaxed'>
                        Ao criar uma carteira, você receberá uma frase de recuperação de 12
                        palavras.
                        <strong> Guarde-a em local seguro</strong> - ela é a única forma de
                        recuperar seus fundos.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 'create-form' && (
            <div className='space-y-6'>
              {/* Premium Header */}
              <div className='relative bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 p-6 sm:p-8 -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 overflow-hidden'>
                <div className='absolute inset-0'>
                  <div className='absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl' />
                  <div className='absolute bottom-0 left-0 w-40 h-40 bg-indigo-300/20 rounded-full blur-3xl' />
                </div>
                <div className='relative text-center'>
                  <div className='flex justify-center mb-4'>
                    <div className='w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center'>
                      <PlusCircleIcon className='w-8 h-8 sm:w-10 sm:h-10 text-white' />
                    </div>
                  </div>
                  <h2 className='text-xl sm:text-2xl font-bold text-white mb-2'>
                    Nova Carteira WOLK
                  </h2>
                  <p className='text-blue-100 text-sm sm:text-base max-w-md mx-auto'>
                    Configure sua carteira Multi Chain segura em poucos segundos
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateWallet} className='max-w-lg mx-auto space-y-5 p-4 sm:p-6'>
                {/* Progress Steps */}
                <div className='flex items-center justify-center gap-2 mb-6'>
                  <div className='flex items-center gap-2'>
                    <div className='w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold'>
                      1
                    </div>
                    <span className='text-xs font-medium text-gray-700 dark:text-gray-300 hidden sm:inline'>
                      Configurar
                    </span>
                  </div>
                  <div className='w-8 h-0.5 bg-gray-200 dark:bg-gray-700' />
                  <div className='flex items-center gap-2'>
                    <div className='w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-400 text-xs font-bold'>
                      2
                    </div>
                    <span className='text-xs text-gray-400 hidden sm:inline'>Backup</span>
                  </div>
                  <div className='w-8 h-0.5 bg-gray-200 dark:bg-gray-700' />
                  <div className='flex items-center gap-2'>
                    <div className='w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-400 text-xs font-bold'>
                      3
                    </div>
                    <span className='text-xs text-gray-400 hidden sm:inline'>Confirmar</span>
                  </div>
                </div>

                {/* Nome da Carteira */}
                <div className='space-y-2'>
                  <label className='flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300'>
                    <WalletIcon className='w-4 h-4 text-blue-500' />
                    Nome da Carteira
                  </label>
                  <input
                    type='text'
                    placeholder='Ex: Minha Carteira Principal'
                    value={createForm.name}
                    onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    className='w-full px-4 py-3.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-all'
                    required
                  />
                  <p className='text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1'>
                    <InfoIcon className='w-3 h-3' />
                    Escolha um nome para identificar sua carteira
                  </p>
                </div>

                {/* Features Grid */}
                <div className='grid grid-cols-2 gap-3'>
                  <div className='p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800'>
                    <div className='flex items-center gap-2 mb-2'>
                      <div className='w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center'>
                        <GlobeIcon className='w-4 h-4 text-white' />
                      </div>
                      <span className='text-xs font-semibold text-blue-700 dark:text-blue-300'>
                        Multi Chain
                      </span>
                    </div>
                    <p className='text-[10px] text-blue-600 dark:text-blue-400'>
                      Bitcoin, Ethereum, BNB e mais
                    </p>
                  </div>
                  <div className='p-3 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800'>
                    <div className='flex items-center gap-2 mb-2'>
                      <div className='w-7 h-7 bg-purple-500 rounded-lg flex items-center justify-center'>
                        <ShieldIcon className='w-4 h-4 text-white' />
                      </div>
                      <span className='text-xs font-semibold text-purple-700 dark:text-purple-300'>
                        Seguro
                      </span>
                    </div>
                    <p className='text-[10px] text-purple-600 dark:text-purple-400'>
                      Padrão BIP32/BIP44
                    </p>
                  </div>
                  <div className='p-3 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800'>
                    <div className='flex items-center gap-2 mb-2'>
                      <div className='w-7 h-7 bg-green-500 rounded-lg flex items-center justify-center'>
                        <KeyIcon className='w-4 h-4 text-white' />
                      </div>
                      <span className='text-xs font-semibold text-green-700 dark:text-green-300'>
                        Uma Frase
                      </span>
                    </div>
                    <p className='text-[10px] text-green-600 dark:text-green-400'>
                      12 palavras = todas redes
                    </p>
                  </div>
                  <div className='p-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-800'>
                    <div className='flex items-center gap-2 mb-2'>
                      <div className='w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center'>
                        <SmartphoneIcon className='w-4 h-4 text-white' />
                      </div>
                      <span className='text-xs font-semibold text-amber-700 dark:text-amber-300'>
                        Local
                      </span>
                    </div>
                    <p className='text-[10px] text-amber-600 dark:text-amber-400'>
                      Chaves no seu dispositivo
                    </p>
                  </div>
                </div>

                {/* Passphrase Opcional */}
                <div className='p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700'>
                  <div className='flex items-center justify-between mb-3'>
                    <label className='flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300'>
                      <EyeOffIcon className='w-4 h-4 text-gray-400' />
                      Passphrase Avançada
                    </label>
                    <span className='text-[10px] px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full font-medium'>
                      OPCIONAL
                    </span>
                  </div>
                  <input
                    type='password'
                    placeholder='Frase secreta adicional (experts)'
                    value={createForm.passphrase}
                    onChange={e => setCreateForm(prev => ({ ...prev, passphrase: e.target.value }))}
                    className='w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-all'
                  />
                  <p className='text-[10px] text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1'>
                    <AlertTriangleIcon className='w-3 h-3 text-amber-500' />
                    Se perder a passphrase, não poderá recuperar os fundos. Use apenas se souber o
                    que está fazendo.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className='flex flex-col sm:flex-row gap-3 pt-2'>
                  <button
                    type='button'
                    onClick={() => setCurrentStep('choose')}
                    className='flex-1 px-6 py-3.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold text-sm transition-all'
                  >
                    Voltar
                  </button>
                  <button
                    type='submit'
                    disabled={isCreating || !createForm.name}
                    className='flex-1 px-6 py-3.5 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2'
                  >
                    {isCreating ? (
                      <>
                        <RefreshCwIcon className='w-4 h-4 animate-spin' />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <ArrowRightIcon className='w-4 h-4' />
                        Continuar
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {currentStep === 'restore-form' && (
            <div className='space-y-6'>
              {/* Premium Header */}
              <div className='relative bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-6 sm:p-8 -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 overflow-hidden'>
                <div className='absolute inset-0'>
                  <div className='absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-2xl' />
                  <div className='absolute bottom-0 right-0 w-40 h-40 bg-teal-300/20 rounded-full blur-3xl' />
                </div>
                <div className='relative text-center'>
                  <div className='flex justify-center mb-4'>
                    <div className='w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center'>
                      <RotateCcwIcon className='w-8 h-8 sm:w-10 sm:h-10 text-white' />
                    </div>
                  </div>
                  <h2 className='text-xl sm:text-2xl font-bold text-white mb-2'>
                    Restaurar Carteira WOLK
                  </h2>
                  <p className='text-emerald-100 text-sm sm:text-base max-w-md mx-auto'>
                    Recupere acesso à sua carteira usando a frase de 12 ou 24 palavras
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleRestoreWallet}
                className='max-w-lg mx-auto space-y-5 p-4 sm:p-6'
              >
                {/* Nome da Carteira */}
                <div className='space-y-2'>
                  <label className='flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300'>
                    <WalletIcon className='w-4 h-4 text-emerald-500' />
                    Nome da Carteira
                  </label>
                  <input
                    type='text'
                    placeholder='Ex: Minha Carteira Restaurada'
                    value={restoreForm.name}
                    onChange={e => setRestoreForm(prev => ({ ...prev, name: e.target.value }))}
                    className='w-full px-4 py-3.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-all'
                    required
                  />
                </div>

                {/* Frase de Recuperação - Premium Style */}
                <div className='space-y-2'>
                  <label className='flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300'>
                    <ShieldIcon className='w-4 h-4 text-emerald-500' />
                    Frase de Recuperação
                  </label>
                  <div className='relative'>
                    <textarea
                      placeholder='Digite suas 12 ou 24 palavras separadas por espaços...'
                      value={restoreForm.mnemonic}
                      onChange={e =>
                        setRestoreForm(prev => ({ ...prev, mnemonic: e.target.value }))
                      }
                      rows={4}
                      className='w-full px-4 py-3.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-mono transition-all resize-none'
                      required
                    />
                    <div className='absolute bottom-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded-lg'>
                      <span className='text-[10px] font-medium text-gray-500 dark:text-gray-400'>
                        {restoreForm.mnemonic.trim().split(/\s+/).filter(Boolean).length} palavras
                      </span>
                    </div>
                  </div>
                  <p className='text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1'>
                    <InfoIcon className='w-3 h-3' />
                    Aceita frases de 12 ou 24 palavras (padrão BIP39)
                  </p>
                </div>

                {/* Passphrase Opcional */}
                <div className='space-y-2'>
                  <label className='flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300'>
                    <EyeOffIcon className='w-4 h-4 text-gray-400' />
                    Passphrase Adicional
                    <span className='text-xs font-normal text-gray-400'>(opcional)</span>
                  </label>
                  <input
                    type='password'
                    placeholder='Deixe em branco se não usou'
                    value={restoreForm.passphrase}
                    onChange={e =>
                      setRestoreForm(prev => ({ ...prev, passphrase: e.target.value }))
                    }
                    className='w-full px-4 py-3.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm transition-all'
                  />
                </div>

                {/* Info Cards */}
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  <div className='p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800'>
                    <div className='flex items-center gap-2 mb-2'>
                      <div className='w-6 h-6 bg-emerald-500 rounded-lg flex items-center justify-center'>
                        <CheckCircleIcon className='w-3.5 h-3.5 text-white' />
                      </div>
                      <span className='text-xs font-semibold text-emerald-700 dark:text-emerald-300'>
                        Multi Chain
                      </span>
                    </div>
                    <p className='text-[10px] text-emerald-600 dark:text-emerald-400'>
                      Restaura BTC, ETH, BNB e mais automaticamente
                    </p>
                  </div>
                  <div className='p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800'>
                    <div className='flex items-center gap-2 mb-2'>
                      <div className='w-6 h-6 bg-blue-500 rounded-lg flex items-center justify-center'>
                        <ShieldIcon className='w-3.5 h-3.5 text-white' />
                      </div>
                      <span className='text-xs font-semibold text-blue-700 dark:text-blue-300'>
                        100% Local
                      </span>
                    </div>
                    <p className='text-[10px] text-blue-600 dark:text-blue-400'>
                      Sua frase nunca é enviada para servidores
                    </p>
                  </div>
                </div>

                {/* Warning */}
                <div className='p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800'>
                  <div className='flex gap-3'>
                    <AlertTriangleIcon className='w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5' />
                    <div>
                      <p className='text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1'>
                        Importante
                      </p>
                      <p className='text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed'>
                        Certifique-se de digitar as palavras na ordem correta. Uma frase incorreta
                        gerará endereços diferentes e você não terá acesso aos seus fundos.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className='flex flex-col sm:flex-row gap-3 pt-2'>
                  <button
                    type='button'
                    onClick={() => setCurrentStep('choose')}
                    className='flex-1 px-6 py-3.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold text-sm transition-all'
                  >
                    Voltar
                  </button>
                  <button
                    type='submit'
                    disabled={isCreating || !restoreForm.name || !restoreForm.mnemonic}
                    className='flex-1 px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-xl font-semibold text-sm shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2'
                  >
                    {isCreating ? (
                      <>
                        <RefreshCwIcon className='w-4 h-4 animate-spin' />
                        Restaurando...
                      </>
                    ) : (
                      <>
                        <RotateCcwIcon className='w-4 h-4' />
                        Restaurar Carteira
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {currentStep === 'mnemonic-display' && createdWallet && (
            <div className='max-w-2xl mx-auto space-y-6 sm:space-y-8'>
              <div className='text-center'>
                <ShieldIcon className='w-12 h-12 sm:w-16 sm:h-16 text-green-600 mx-auto mb-4' />
                <h2 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2'>
                  Carteira Criada com Sucesso!
                </h2>
                <p className='text-sm sm:text-base text-gray-600 dark:text-gray-400 px-2'>
                  Agora você precisa salvar sua frase de recuperação
                </p>
              </div>

              <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4'>
                <div className='flex'>
                  <AlertTriangleIcon className='h-4 w-4 sm:h-5 sm:w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5' />
                  <div className='text-sm text-red-800 dark:text-red-200'>
                    <div className='flex items-center gap-2 mb-2'>
                      <AlertTriangleIcon className='w-3 h-3 sm:w-4 sm:h-4' />
                      <p className='font-semibold text-xs sm:text-sm'>ATENÇÃO - MUITO IMPORTANTE</p>
                    </div>
                    <ul className='list-disc list-inside space-y-1 text-xs sm:text-sm'>
                      <li>Esta frase de recuperação é a ÚNICA forma de recuperar sua carteira</li>
                      <li>Anote em local físico e seguro (papel, metal)</li>
                      <li>NUNCA compartilhe ou digite em sites suspeitos</li>
                      <li>Se perdê-la, você perderá acesso aos seus fundos PERMANENTEMENTE</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className='space-y-3 sm:space-y-4'>
                <div className='space-y-2'>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                    Nome da Carteira
                  </label>
                  <div className='p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border'>
                    <strong className='text-gray-900 dark:text-white'>{createdWallet.name}</strong>
                    <div className='text-sm text-gray-600 dark:text-gray-400'>
                      Tipo: Carteira WOLK Multi Chain
                    </div>
                    <div className='text-xs text-gray-500 dark:text-gray-500 mt-1'>
                      Suporta Bitcoin, Ethereum, e outras criptomoedas
                    </div>
                  </div>
                </div>

                <div className='space-y-2'>
                  <div className='flex items-center justify-between'>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                      Frase de Recuperação (12 palavras)
                    </label>
                    <button
                      type='button'
                      onClick={() => setShowMnemonic(!showMnemonic)}
                      className='flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors'
                    >
                      {showMnemonic ? (
                        <EyeOffIcon className='w-3 h-3 sm:w-4 sm:h-4' />
                      ) : (
                        <EyeIcon className='w-3 h-3 sm:w-4 sm:h-4' />
                      )}
                      <span className='hidden sm:inline'>
                        {showMnemonic ? 'Ocultar' : 'Mostrar'}
                      </span>
                    </button>
                  </div>

                  <div className='relative'>
                    <div className='p-3 sm:p-6 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 min-h-[120px] sm:min-h-[160px]'>
                      {showMnemonic ? (
                        <div className='grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4'>
                          {createdWallet.mnemonic?.split(' ').map((word, index) => (
                            <div
                              key={index}
                              className='flex items-center space-x-2 p-2 bg-white dark:bg-gray-800 rounded border'
                            >
                              <span className='text-gray-500 text-xs font-mono w-4 sm:w-6'>
                                {index + 1}.
                              </span>
                              <span className='font-mono text-xs sm:text-sm break-all'>{word}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className='text-center text-gray-500 py-8 sm:py-16'>
                          <EyeOffIcon className='w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2' />
                          <p className='text-sm sm:text-base'>
                            Clique em "Mostrar" para revelar a frase de recuperação
                          </p>
                        </div>
                      )}
                    </div>

                    {showMnemonic && (
                      <button
                        onClick={copyMnemonic}
                        className='absolute top-2 right-2 sm:top-4 sm:right-4 flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs sm:text-sm'
                      >
                        {copiedMnemonic ? (
                          <CheckIcon className='w-3 h-3 sm:w-4 sm:h-4 text-green-500' />
                        ) : (
                          <CopyIcon className='w-3 h-3 sm:w-4 sm:h-4' />
                        )}
                        <span className='hidden sm:inline'>
                          {copiedMnemonic ? 'Copiado!' : 'Copiar'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {showMnemonic && (
                <div className='flex flex-col sm:flex-row gap-3'>
                  <button
                    onClick={downloadMnemonicBackup}
                    className='flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm'
                  >
                    <DownloadIcon className='w-4 h-4' />
                    Baixar Backup
                  </button>

                  <button
                    onClick={() => window.print()}
                    className='flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm'
                  >
                    <PrinterIcon className='w-4 h-4' />
                    Imprimir
                  </button>
                </div>
              )}

              <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4'>
                <div className='flex'>
                  <InfoIcon className='h-4 w-4 sm:h-5 sm:w-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5' />
                  <div className='text-xs sm:text-sm text-blue-800 dark:text-blue-200'>
                    <p className='font-semibold mb-2'>Dicas de Segurança:</p>
                    <ul className='list-disc list-inside space-y-1 text-xs sm:text-sm'>
                      <li>Anote as palavras na ordem exata em papel</li>
                      <li>Guarde o papel em cofre ou local muito seguro</li>
                      <li>Considere fazer múltiplas cópias em locais diferentes</li>
                      <li>Nunca tire foto ou salve digitalmente</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className='text-center'>
                <button
                  onClick={proceedToConfirmation}
                  className='w-full sm:w-auto px-6 sm:px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base'
                >
                  Eu Salvei a Frase de Recuperação - Continuar
                </button>
                <p className='text-xs text-gray-500 mt-2'>
                  Você será solicitado a confirmar algumas palavras
                </p>
              </div>
            </div>
          )}

          {currentStep === 'mnemonic-confirm' && createdWallet && (
            <div className='max-w-md mx-auto space-y-4 sm:space-y-6'>
              <div className='text-center'>
                <CheckCircleIcon className='w-12 h-12 sm:w-16 sm:h-16 text-blue-600 mx-auto mb-4' />
                <h2 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2'>
                  Confirme a Frase de Recuperação
                </h2>
                <p className='text-sm sm:text-base text-gray-600 dark:text-gray-400 px-2'>
                  Digite as palavras solicitadas para confirmar que você salvou corretamente
                </p>
              </div>

              <div className='space-y-3 sm:space-y-4'>
                {randomWordIndices.map(wordIndex => (
                  <div key={wordIndex} className='space-y-2'>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                      Palavra #{wordIndex + 1}
                    </label>
                    <input
                      type='text'
                      placeholder={`Digite a ${wordIndex + 1}ª palavra`}
                      value={confirmationWords[wordIndex] || ''}
                      onChange={e =>
                        setConfirmationWords(prev => ({
                          ...prev,
                          [wordIndex]: e.target.value,
                        }))
                      }
                      className='w-full px-3 py-2 sm:px-4 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm'
                      autoComplete='off'
                    />
                  </div>
                ))}
              </div>

              <div className='flex flex-col sm:flex-row gap-3 pt-4'>
                <button
                  onClick={() => setCurrentStep('mnemonic-display')}
                  className='flex-1 px-4 py-2 sm:px-6 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm sm:text-base'
                >
                  Voltar
                </button>
                <button
                  onClick={confirmAndFinish}
                  className='flex-1 px-4 py-2 sm:px-6 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base'
                >
                  Confirmar e Finalizar
                </button>
              </div>
            </div>
          )}

          {currentStep === 'success' && (
            <div className='space-y-6 sm:space-y-8'>
              {/* Success Hero */}
              <div className='relative bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-6 sm:p-8 md:p-10 overflow-hidden'>
                {/* Confetti Effect */}
                <div className='absolute inset-0 overflow-hidden'>
                  <div className='absolute top-4 left-4 w-3 h-3 bg-yellow-300 rounded-full opacity-80 animate-bounce' />
                  <div
                    className='absolute top-8 right-8 w-2 h-2 bg-pink-300 rounded-full opacity-80 animate-bounce'
                    style={{ animationDelay: '0.2s' }}
                  />
                  <div
                    className='absolute top-16 left-1/4 w-2 h-2 bg-blue-300 rounded-full opacity-80 animate-bounce'
                    style={{ animationDelay: '0.4s' }}
                  />
                  <div
                    className='absolute top-6 right-1/4 w-3 h-3 bg-purple-300 rounded-full opacity-80 animate-bounce'
                    style={{ animationDelay: '0.1s' }}
                  />
                  <div
                    className='absolute bottom-8 left-8 w-2 h-2 bg-orange-300 rounded-full opacity-80 animate-bounce'
                    style={{ animationDelay: '0.3s' }}
                  />
                  <div
                    className='absolute bottom-4 right-4 w-2 h-2 bg-green-300 rounded-full opacity-80 animate-bounce'
                    style={{ animationDelay: '0.5s' }}
                  />
                </div>

                <div className='relative text-center'>
                  <div className='flex justify-center mb-4 sm:mb-6'>
                    <div className='relative'>
                      <div className='w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center shadow-2xl'>
                        <CheckCircleIcon className='w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 text-white' />
                      </div>
                      <div className='absolute -top-2 -right-2 sm:-top-3 sm:-right-3'>
                        <PartyPopperIcon className='w-6 h-6 sm:w-8 sm:h-8 text-yellow-300' />
                      </div>
                    </div>
                  </div>
                  <h2 className='text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-3 flex items-center justify-center gap-2'>
                    Parabéns!
                    <PartyPopperIcon className='w-6 h-6 sm:w-8 sm:h-8 text-yellow-300' />
                  </h2>
                  <p className='text-base sm:text-lg text-white/90 max-w-md mx-auto'>
                    {walletType === 'create'
                      ? 'Sua nova carteira foi criada com sucesso!'
                      : 'Sua carteira foi restaurada com sucesso!'}
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className='p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6'>
                {/* Next Steps */}
                <div className='bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl sm:rounded-2xl p-4 sm:p-6'>
                  <h3 className='text-sm sm:text-base font-bold text-emerald-900 dark:text-emerald-300 mb-3 sm:mb-4 flex items-center gap-2'>
                    <CheckCircleIcon className='w-4 h-4 sm:w-5 sm:h-5' />
                    Próximos Passos
                  </h3>
                  <div className='space-y-2 sm:space-y-3'>
                    <div className='flex items-start gap-3'>
                      <div className='w-6 h-6 sm:w-7 sm:h-7 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0'>
                        <span className='text-white text-xs font-bold'>1</span>
                      </div>
                      <div>
                        <p className='text-xs sm:text-sm font-medium text-gray-900 dark:text-white'>
                          Sua carteira está pronta para receber fundos
                        </p>
                        <p className='text-[10px] sm:text-xs text-gray-500 dark:text-gray-400'>
                          Envie criptomoedas para começar
                        </p>
                      </div>
                    </div>
                    <div className='flex items-start gap-3'>
                      <div className='w-6 h-6 sm:w-7 sm:h-7 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0'>
                        <span className='text-white text-xs font-bold'>2</span>
                      </div>
                      <div>
                        <p className='text-xs sm:text-sm font-medium text-gray-900 dark:text-white'>
                          Explore o P2P Marketplace
                        </p>
                        <p className='text-[10px] sm:text-xs text-gray-500 dark:text-gray-400'>
                          Compre e venda cripto com segurança
                        </p>
                      </div>
                    </div>
                    <div className='flex items-start gap-3'>
                      <div className='w-6 h-6 sm:w-7 sm:h-7 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0'>
                        <span className='text-white text-xs font-bold'>3</span>
                      </div>
                      <div>
                        <p className='text-xs sm:text-sm font-medium text-gray-900 dark:text-white'>
                          Ative a autenticação 2FA
                        </p>
                        <p className='text-[10px] sm:text-xs text-gray-500 dark:text-gray-400'>
                          Adicione uma camada extra de segurança
                        </p>
                      </div>
                    </div>
                    {walletType === 'create' && (
                      <div className='flex items-start gap-3'>
                        <div className='w-6 h-6 sm:w-7 sm:h-7 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0'>
                          <CheckCircleIcon className='w-3 h-3 sm:w-4 sm:h-4 text-white' />
                        </div>
                        <div>
                          <p className='text-xs sm:text-sm font-medium text-gray-900 dark:text-white'>
                            Frase de recuperação salva ✓
                          </p>
                          <p className='text-[10px] sm:text-xs text-gray-500 dark:text-gray-400'>
                            Guarde-a em local muito seguro
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Supported Assets Preview */}
                <div className='bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4'>
                  <h4 className='text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3'>
                    Ativos disponíveis na sua carteira
                  </h4>
                  <div className='flex flex-wrap gap-2'>
                    {['BTC', 'ETH', 'BNB', 'SOL', 'MATIC', 'TRX', 'USDT', 'USDC'].map(coin => (
                      <span
                        key={coin}
                        className='px-2 sm:px-3 py-1 sm:py-1.5 bg-white dark:bg-gray-800 rounded-lg text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                      >
                        {coin}
                      </span>
                    ))}
                    <span className='px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-[10px] sm:text-xs font-medium text-blue-700 dark:text-blue-300'>
                      +10 mais
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className='flex flex-col sm:flex-row gap-3'>
                  <Link
                    to='/wallet'
                    className='flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base shadow-lg shadow-purple-500/25 transition-all'
                  >
                    <WalletIcon className='w-4 h-4 sm:w-5 sm:h-5' />
                    Ir para Carteira
                  </Link>
                  <Link
                    to='/dashboard'
                    className='flex-1 flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base hover:bg-gray-50 dark:hover:bg-gray-600 transition-all'
                  >
                    Dashboard
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
