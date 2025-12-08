import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  WalletIcon,
  PlusIcon,
  RotateCcwIcon,
  EyeIcon,
  EyeOffIcon,
  CopyIcon,
  CheckIcon,
  AlertTriangleIcon,
  ShieldIcon,
  InfoIcon,
  ArrowLeftIcon,
  DownloadIcon,
  PrinterIcon,
  CheckCircleIcon,
  XCircleIcon,
  SmartphoneIcon,
  RefreshCwIcon,
  PartyPopperIcon,
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

    const content = `HOLD Wallet - Backup da Frase de Recuperação
====================================

Nome da Carteira: ${createdWallet.name}
Tipo: Carteira Multi-Rede HD (Hierarchical Deterministic)
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
HOLD Wallet - Sua carteira P2P segura
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
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 py-4 sm:py-8'>
      <div className='max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8'>
        {/* Header */}
        <div className='flex items-center gap-2 sm:gap-4 mb-6 sm:mb-8'>
          <button
            onClick={() => navigate('/wallet')}
            className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
            title='Voltar para carteiras'
          >
            <ArrowLeftIcon className='w-4 h-4 sm:w-5 sm:h-5' />
          </button>
          <div className='flex-1 min-w-0'>
            <h1 className='text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white truncate'>
              {walletType === 'create'
                ? 'Criar Carteira Principal'
                : 'Restaurar Carteira Principal'}
            </h1>
            <p className='text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 line-clamp-2'>
              {walletType === 'create'
                ? 'Crie uma carteira HD que suporta múltiplas criptomoedas'
                : 'Recupere sua carteira HD com a frase de recuperação'}
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className='mb-6 sm:mb-8 overflow-x-auto'>{renderStepIndicator()}</div>

        {/* Content */}
        <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 lg:p-8'>
          {currentStep === 'choose' && (
            <div className='text-center space-y-6 sm:space-y-8'>
              <div>
                <WalletIcon className='w-12 h-12 sm:w-16 sm:h-16 text-blue-600 mx-auto mb-4' />
                <h2 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2'>
                  Como deseja prosseguir?
                </h2>
                <p className='text-sm sm:text-base text-gray-600 dark:text-gray-400 px-2'>
                  Escolha entre criar uma nova carteira ou restaurar uma existente
                </p>
              </div>

              <div className='grid grid-cols-1 gap-4 sm:gap-6 max-w-2xl mx-auto'>
                <button
                  onClick={() => {
                    setWalletType('create')
                    setCurrentStep('create-form')
                  }}
                  className='p-4 sm:p-6 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group'
                >
                  <PlusIcon className='w-10 h-10 sm:w-12 sm:h-12 text-blue-600 mx-auto mb-3 sm:mb-4 group-hover:scale-110 transition-transform' />
                  <h3 className='text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2'>
                    Criar Carteira Principal
                  </h3>
                  <p className='text-sm text-gray-600 dark:text-gray-400 px-2'>
                    Crie uma carteira HD que suporta todas as criptomoedas com uma única frase de
                    recuperação
                  </p>
                </button>

                <button
                  onClick={() => {
                    setWalletType('restore')
                    setCurrentStep('restore-form')
                  }}
                  className='p-4 sm:p-6 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group'
                >
                  <RotateCcwIcon className='w-10 h-10 sm:w-12 sm:h-12 text-blue-600 mx-auto mb-3 sm:mb-4 group-hover:scale-110 transition-transform' />
                  <h3 className='text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2'>
                    Restaurar Carteira Principal
                  </h3>
                  <p className='text-sm text-gray-600 dark:text-gray-400 px-2'>
                    Recupere sua carteira HD existente usando a frase de recuperação
                  </p>
                </button>
              </div>
            </div>
          )}

          {currentStep === 'create-form' && (
            <form onSubmit={handleCreateWallet} className='max-w-md mx-auto space-y-4 sm:space-y-6'>
              <div className='text-center mb-4 sm:mb-6'>
                <h2 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2'>
                  Configurar Nova Carteira
                </h2>
                <p className='text-sm sm:text-base text-gray-600 dark:text-gray-400 px-2'>
                  Uma carteira multi-rede que suporta Bitcoin, Ethereum e outras criptomoedas
                </p>
              </div>

              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                  Nome da Carteira
                </label>
                <input
                  type='text'
                  placeholder='Ex: Minha Carteira Principal'
                  value={createForm.name}
                  onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  className='w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base'
                  required
                />
                <p className='text-xs text-gray-600 dark:text-gray-400'>
                  Esta carteira poderá gerenciar múltiplas criptomoedas
                </p>
              </div>

              <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4'>
                <div className='flex'>
                  <InfoIcon className='h-4 w-4 sm:h-5 sm:w-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5' />
                  <div className='text-sm text-blue-800 dark:text-blue-200'>
                    <div className='flex items-center gap-2 mb-2'>
                      <SmartphoneIcon className='w-3 h-3 sm:w-4 sm:h-4' />
                      <p className='font-semibold text-xs sm:text-sm'>Carteira Multi-Rede</p>
                    </div>
                    <ul className='list-disc list-inside space-y-1 text-xs sm:text-sm'>
                      <li>Uma única frase de recuperação para todas as criptomoedas</li>
                      <li>Suporte a Bitcoin, Ethereum, e outras redes</li>
                      <li>Fácil gerenciamento de múltiplos ativos</li>
                      <li>Compatível com padrões HD Wallet (BIP32/BIP44)</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                  Passphrase (Opcional)
                </label>
                <input
                  type='password'
                  placeholder='Frase secreta adicional'
                  value={createForm.passphrase}
                  onChange={e => setCreateForm(prev => ({ ...prev, passphrase: e.target.value }))}
                  className='w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base'
                />
                <p className='text-xs text-gray-600 dark:text-gray-400'>
                  Adiciona uma camada extra de segurança (BIP39 passphrase)
                </p>
              </div>

              <div className='flex flex-col sm:flex-row gap-3 pt-4'>
                <button
                  type='button'
                  onClick={() => setCurrentStep('choose')}
                  className='flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm sm:text-base'
                >
                  Voltar
                </button>
                <button
                  type='submit'
                  disabled={isCreating}
                  className='flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm sm:text-base'
                >
                  {isCreating ? 'Criando...' : 'Criar Carteira'}
                </button>
              </div>
            </form>
          )}

          {currentStep === 'restore-form' && (
            <form onSubmit={handleRestoreWallet} className='max-w-md mx-auto space-y-6'>
              <div className='text-center mb-6'>
                <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
                  Restaurar Carteira
                </h2>
                <p className='text-gray-600 dark:text-gray-400'>
                  Use sua frase de recuperação para restaurar sua carteira multi-rede
                </p>
              </div>

              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                  Nome da Carteira
                </label>
                <input
                  type='text'
                  placeholder='Ex: Carteira Restaurada'
                  value={restoreForm.name}
                  onChange={e => setRestoreForm(prev => ({ ...prev, name: e.target.value }))}
                  className='w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                  required
                />
              </div>

              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                  Frase de Recuperação
                </label>
                <textarea
                  placeholder='Digite as 12 palavras da frase de recuperação separadas por espaços'
                  value={restoreForm.mnemonic}
                  onChange={e => setRestoreForm(prev => ({ ...prev, mnemonic: e.target.value }))}
                  rows={4}
                  className='w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                  required
                />
                <p className='text-xs text-gray-600 dark:text-gray-400'>
                  12 ou 24 palavras separadas por espaços
                </p>
              </div>

              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                  Passphrase (se usada)
                </label>
                <input
                  type='password'
                  placeholder='Frase secreta adicional (se definida)'
                  value={restoreForm.passphrase}
                  onChange={e => setRestoreForm(prev => ({ ...prev, passphrase: e.target.value }))}
                  className='w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                />
              </div>

              <div className='bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4'>
                <div className='flex'>
                  <InfoIcon className='h-5 w-5 text-green-400 mr-2 flex-shrink-0' />
                  <div className='text-sm text-green-800 dark:text-green-200'>
                    <div className='flex items-center gap-2 mb-2'>
                      <RefreshCwIcon className='w-4 h-4' />
                      <p className='font-semibold'>Restauração Multi-Rede</p>
                    </div>
                    <ul className='list-disc list-inside space-y-1'>
                      <li>Restaura acesso a todas as suas criptomoedas</li>
                      <li>Bitcoin, Ethereum, e outras redes automaticamente</li>
                      <li>Mantém o histórico de transações</li>
                      <li>Compatível com outras carteiras HD</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4'>
                <div className='flex'>
                  <AlertTriangleIcon className='h-5 w-5 text-yellow-400 mr-2 flex-shrink-0' />
                  <p className='text-sm text-yellow-800 dark:text-yellow-200'>
                    Certifique-se de que está inserindo a frase de recuperação correta. Frases
                    incorretas não conseguirão restaurar sua carteira.
                  </p>
                </div>
              </div>

              <div className='flex gap-3 pt-4'>
                <button
                  type='button'
                  onClick={() => setCurrentStep('choose')}
                  className='flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
                >
                  Voltar
                </button>
                <button
                  type='submit'
                  disabled={isCreating}
                  className='flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors'
                >
                  {isCreating ? 'Restaurando...' : 'Restaurar Carteira'}
                </button>
              </div>
            </form>
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
                      Tipo: Carteira Multi-Rede HD (Hierarchical Deterministic)
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
            <div className='text-center space-y-4 sm:space-y-6'>
              <div>
                <div className='flex items-center justify-center mb-4 sm:mb-6'>
                  <CheckCircleIcon className='w-16 h-16 sm:w-20 sm:h-20 text-green-500' />
                </div>
                <h2 className='text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2'>
                  Carteira Configurada!
                </h2>
                <p className='text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-6 sm:mb-8 px-4'>
                  {walletType === 'create'
                    ? 'Sua nova carteira foi criada e está pronta para usar'
                    : 'Sua carteira foi restaurada com sucesso'}
                </p>
              </div>

              <div className='bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 sm:p-6 text-left'>
                <h3 className='text-base sm:text-lg font-semibold text-green-800 dark:text-green-200 mb-3'>
                  Próximos Passos:
                </h3>
                <ul className='text-sm text-green-700 dark:text-green-300 space-y-2'>
                  <li>✅ Sua carteira está pronta para receber fundos</li>
                  <li>✅ Você pode começar a fazer transações P2P</li>
                  <li>✅ Explore os recursos da plataforma HOLD</li>
                  {walletType === 'create' && (
                    <li>✅ Sua frase de recuperação está salva em local seguro</li>
                  )}
                </ul>
              </div>

              <div className='flex flex-col sm:flex-row gap-3 justify-center'>
                <Link
                  to='/wallet'
                  className='px-6 py-2 sm:px-8 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base text-center'
                >
                  Ir para Carteira
                </Link>
                <Link
                  to='/dashboard'
                  className='px-6 py-2 sm:px-8 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium text-sm sm:text-base text-center'
                >
                  Voltar ao Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
