import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  EyeIcon,
  EyeOffIcon,
  CopyIcon,
  CheckIcon,
  AlertTriangleIcon,
  ShieldIcon,
  DownloadIcon,
  CheckCircleIcon,
  RefreshCwIcon,
  KeyIcon,
  ServerIcon,
  NetworkIcon,
  LockIcon,
  WalletIcon,
  GlobeIcon,
  DollarSignIcon,
  ActivityIcon,
  TrendingUpIcon,
  CoinsIcon,
  ExternalLinkIcon,
  ZapIcon,
  ArrowUpRightIcon,
  ArrowDownLeftIcon,
  SettingsIcon,
  DatabaseIcon,
} from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { apiClient } from '@/services/api'
import trayLogo from '@/assets/crypto-icons/tray.png'

type Step = 'info' | 'creating' | 'mnemonic-display' | 'mnemonic-confirm' | 'success'

interface SystemWalletData {
  wallet_id: string
  name: string
  mnemonic: string
  mnemonic_word_count: number
  addresses: Record<
    string,
    {
      address: string
      network: string
      cryptocurrency: string
      derivation_path: string
      label: string
    }
  >
  networks_count: number
  total_networks: number
  is_new: boolean
}

interface WalletStatus {
  exists: boolean
  wallet_id?: string
  name?: string
  networks_count?: number
  cached_balances?: Record<string, number>
}

interface ExportKeyData {
  success: boolean
  private_key?: string
  address?: string
  network?: string
  instructions?: string[]
}

// Função para buscar status da carteira
const fetchWalletStatus = async (): Promise<WalletStatus> => {
  const response = await apiClient.get('/admin/system-blockchain-wallet/status')
  if (response.data.success) {
    return response.data.data || { exists: false }
  }
  return { exists: false }
}

// Função para exportar private key
const exportPrivateKey = async (network: string): Promise<ExportKeyData> => {
  const response = await apiClient.get(
    `/admin/system-blockchain-wallet/export-private-key/${network}`
  )
  return response.data
}

export const AdminSystemWalletPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // React Query para cache automático
  const {
    data: walletStatus,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['admin-system-wallet-status'],
    queryFn: fetchWalletStatus,
    staleTime: 60000, // 1 minuto - dados ficam "frescos" por 1 minuto
    gcTime: 300000, // 5 minutos - mantém em cache por 5 minutos
  })

  const [currentStep, setCurrentStep] = useState<Step>('info')
  const [showMnemonic, setShowMnemonic] = useState(false)
  const [copiedMnemonic, setCopiedMnemonic] = useState(false)
  const [walletData, setWalletData] = useState<SystemWalletData | null>(null)
  const [confirmationWords, setConfirmationWords] = useState<{ [key: number]: string }>({})
  const [randomWordIndices, setRandomWordIndices] = useState<number[]>([])
  const [isCreating, setIsCreating] = useState(false)

  // Estado para modal de exportação de private key
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportKeyData, setExportKeyData] = useState<ExportKeyData | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [copiedPrivateKey, setCopiedPrivateKey] = useState(false)
  const [isRefreshingBalances, setIsRefreshingBalances] = useState(false)

  // Função para atualizar saldos da blockchain
  const handleRefreshBalances = async () => {
    try {
      setIsRefreshingBalances(true)
      const response = await apiClient.post('/admin/system-blockchain-wallet/refresh-balances')
      if (response.data.success) {
        toast.success('Saldos atualizados com sucesso!')
        refetch() // Recarrega os dados
      } else {
        throw new Error(response.data.message || 'Erro ao atualizar saldos')
      }
    } catch (error: any) {
      console.error('Erro ao atualizar saldos:', error)
      toast.error(error.response?.data?.detail || error.message || 'Erro ao atualizar saldos')
    } finally {
      setIsRefreshingBalances(false)
    }
  }

  // Atualiza o step quando wallet status muda
  useEffect(() => {
    if (walletStatus?.exists) {
      setCurrentStep('success')
    }
  }, [walletStatus])

  // Gerar índices aleatórios para confirmação
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

  // Criar carteira do sistema
  const handleCreateWallet = async () => {
    try {
      setIsCreating(true)
      setCurrentStep('creating')

      const response = await apiClient.post('/admin/system-blockchain-wallet/create')

      if (response.data.success && response.data.data) {
        const data = response.data.data
        setWalletData(data)

        if (data.mnemonic) {
          const words = data.mnemonic.split(' ')
          setRandomWordIndices(generateRandomIndices(words))
        }

        setCurrentStep('mnemonic-display')
        toast.success('Carteira do sistema criada com sucesso!')
      } else {
        throw new Error(response.data.message || 'Erro ao criar carteira')
      }
    } catch (error: any) {
      console.error('Erro ao criar carteira:', error)
      toast.error(error.response?.data?.detail || error.message || 'Erro ao criar carteira')
      setCurrentStep('info')
    } finally {
      setIsCreating(false)
    }
  }

  // Copiar mnemonic
  const copyMnemonic = async () => {
    if (!walletData?.mnemonic) return

    try {
      await navigator.clipboard.writeText(walletData.mnemonic)
      setCopiedMnemonic(true)
      toast.success('Frase de recuperação copiada!')
      setTimeout(() => setCopiedMnemonic(false), 2000)
    } catch {
      toast.error('Não foi possível copiar')
    }
  }

  // Baixar backup
  const downloadBackup = () => {
    if (!walletData?.mnemonic) return

    const addressList = Object.entries(walletData.addresses)
      .map(
        ([network, data]) => `- ${network.toUpperCase()} (${data.cryptocurrency}): ${data.address}`
      )
      .join('\n')

    const content = `HOLD Wallet - Backup da Carteira do Sistema
============================================

ATENÇÃO: DOCUMENTO CONFIDENCIAL
Este arquivo contém a frase de recuperação da carteira do sistema.
Guarde em local EXTREMAMENTE seguro (cofre, papel offline).

Nome: ${walletData.name}
ID: ${walletData.wallet_id}
Data de Criação: ${new Date().toLocaleString('pt-BR')}
Criado por: ${user?.email || 'Admin'}

FRASE DE RECUPERAÇÃO (12 palavras):
============================================
${walletData.mnemonic}
============================================

ENDEREÇOS GERADOS (${walletData.networks_count} redes):
${addressList}

INSTRUÇÕES DE SEGURANÇA:
1. Imprima este documento e guarde em cofre físico
2. NÃO armazene em computadores ou nuvem
3. NÃO compartilhe com ninguém
4. A frase de recuperação dá acesso TOTAL aos fundos
5. Exclua este arquivo após guardar em local seguro

============================================
HOLD Wallet - Sistema de Taxas e Comissões
`

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `HOLD_SYSTEM_WALLET_BACKUP_${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)

    toast.success('Backup baixado! Guarde em local seguro.')
  }

  // Exportar private key para configurar no .env
  const handleExportPrivateKey = async () => {
    try {
      setIsExporting(true)
      setShowPrivateKey(false)
      setCopiedPrivateKey(false)

      const result = await exportPrivateKey('polygon')

      if (result.success) {
        setExportKeyData(result)
        setShowExportModal(true)
      } else {
        toast.error('Erro ao exportar chave privada')
      }
    } catch (error: any) {
      console.error('Erro ao exportar private key:', error)
      toast.error(error.response?.data?.detail || 'Erro ao exportar chave privada')
    } finally {
      setIsExporting(false)
    }
  }

  // Copiar private key
  const copyPrivateKey = async () => {
    if (!exportKeyData?.private_key) return

    try {
      await navigator.clipboard.writeText(exportKeyData.private_key)
      setCopiedPrivateKey(true)
      toast.success('Private key copiada!')
      setTimeout(() => setCopiedPrivateKey(false), 2000)
    } catch {
      toast.error('Não foi possível copiar')
    }
  }

  // Validar confirmação
  const validateMnemonicConfirmation = () => {
    if (!walletData?.mnemonic) return false

    const words = walletData.mnemonic.split(' ')
    return randomWordIndices.every(index => {
      const userInput = confirmationWords[index]?.toLowerCase().trim()
      const correctWord = words[index]?.toLowerCase()
      return userInput === correctWord
    })
  }

  // Confirmar e finalizar
  const confirmAndFinish = () => {
    if (!validateMnemonicConfirmation()) {
      toast.error('As palavras digitadas não conferem. Verifique e tente novamente.')
      return
    }

    setCurrentStep('success')
    toast.success('Carteira do sistema configurada com sucesso!')
  }

  // Renderizar indicador de etapas
  const renderStepIndicator = () => {
    const steps = ['Informações', 'Criação', 'Frase de Recuperação', 'Confirmar', 'Concluído']
    const stepKeys: Step[] = ['info', 'creating', 'mnemonic-display', 'mnemonic-confirm', 'success']
    const currentStepIndex = stepKeys.indexOf(currentStep)

    return (
      <div className='flex items-center justify-center mb-8'>
        <div className='flex items-center'>
          {steps.map((step, index) => (
            <React.Fragment key={`step-${step}-${index}`}>
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  index <= currentStepIndex
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}
              >
                {index < currentStepIndex ? (
                  <CheckCircleIcon className='w-5 h-5' />
                ) : (
                  <span className='text-sm font-medium'>{index + 1}</span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-12 h-1 mx-2 ${
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

  if (isLoading) {
    return (
      <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center'>
        <div className='text-center'>
          <RefreshCwIcon className='w-12 h-12 text-blue-600 animate-spin mx-auto mb-4' />
          <p className='text-gray-500 dark:text-gray-400'>Verificando status da carteira...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='p-6 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen'>
      {/* Header */}
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2'>
            <WalletIcon className='w-7 h-7 text-green-600 dark:text-green-400' />
            Carteira Blockchain do Sistema
          </h1>
          <p className='text-gray-500 dark:text-gray-400'>
            Carteira para receber taxas e comissões em 16 redes
          </p>
        </div>
        {walletStatus?.exists && (
          <div className='flex gap-3'>
            <button
              onClick={() => refetch()}
              className='flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors'
            >
              <RefreshCwIcon className='w-4 h-4' />
              Atualizar
            </button>
            <button
              onClick={() => navigate('/admin/system-wallet/addresses')}
              className='flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors'
            >
              <GlobeIcon className='w-4 h-4' />
              Ver Endereços
            </button>
          </div>
        )}
      </div>

      {/* Step Indicator */}
      {!walletStatus?.exists && renderStepIndicator()}

      {/* Content - Carteira já existe */}
      {walletStatus?.exists && currentStep === 'success' && (
        <>
          {/* Stats Cards */}
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
            {/* Card: Redes Ativas */}
            <div className='bg-gradient-to-br from-blue-100 dark:from-blue-900/30 to-blue-50 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700/30 rounded-xl p-4 hover:border-blue-400 dark:hover:border-blue-600/50 transition-all'>
              <div className='flex items-center justify-between'>
                <div className='p-2.5 bg-blue-500/20 rounded-lg'>
                  <NetworkIcon className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                </div>
                <p className='text-2xl font-bold text-gray-900 dark:text-white'>
                  {walletStatus.networks_count || 16}
                </p>
              </div>
              <p className='text-sm text-gray-500 dark:text-gray-400 mt-3'>Redes Ativas</p>
              <p className='text-xs text-gray-400 dark:text-gray-500'>Blockchains configuradas</p>
            </div>

            {/* Card: Total Stablecoins */}
            <div className='bg-gradient-to-br from-green-100 dark:from-green-900/30 to-green-50 dark:to-green-800/20 border border-green-200 dark:border-green-700/30 rounded-xl p-4 hover:border-green-400 dark:hover:border-green-600/50 transition-all'>
              <div className='flex items-center justify-between'>
                <p className='text-sm text-gray-500 dark:text-gray-400'>Stablecoins</p>
                <p className='text-xl font-bold text-green-600 dark:text-green-400'>
                  $
                  {(
                    (walletStatus.cached_balances?.USDT || 0) +
                    (walletStatus.cached_balances?.USDC || 0)
                  ).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className='flex items-center gap-4 mt-3'>
                <div className='flex items-center gap-2 bg-black/10 dark:bg-black/20 px-2 py-1 rounded-lg'>
                  <img
                    src='https://cryptologos.cc/logos/tether-usdt-logo.png'
                    alt='USDT'
                    className='w-4 h-4'
                  />
                  <span className='text-xs text-gray-700 dark:text-gray-300 font-medium'>
                    ${(walletStatus.cached_balances?.USDT || 0).toFixed(2)}
                  </span>
                </div>
                <div className='flex items-center gap-2 bg-black/10 dark:bg-black/20 px-2 py-1 rounded-lg'>
                  <img
                    src='https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
                    alt='USDC'
                    className='w-4 h-4'
                  />
                  <span className='text-xs text-gray-700 dark:text-gray-300 font-medium'>
                    ${(walletStatus.cached_balances?.USDC || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Card: Gas Fees (Nativos) */}
            <div className='bg-gradient-to-br from-purple-100 dark:from-purple-900/30 to-purple-50 dark:to-purple-800/20 border border-purple-200 dark:border-purple-700/30 rounded-xl p-4 hover:border-purple-400 dark:hover:border-purple-600/50 transition-all'>
              <p className='text-sm text-gray-500 dark:text-gray-400 mb-3'>Gas Fees</p>
              <div className='space-y-2'>
                <div className='flex items-center justify-between bg-black/10 dark:bg-black/20 px-2 py-1.5 rounded-lg'>
                  <div className='flex items-center gap-2'>
                    <img
                      src='https://cryptologos.cc/logos/ethereum-eth-logo.png'
                      alt='ETH'
                      className='w-4 h-4'
                    />
                    <span className='text-xs text-gray-500 dark:text-gray-400'>ETH</span>
                  </div>
                  <span className='text-xs text-gray-900 dark:text-white font-medium'>
                    {(
                      walletStatus.cached_balances?.ETHEREUM ||
                      walletStatus.cached_balances?.ETH ||
                      0
                    ).toFixed(4)}
                  </span>
                </div>
                <div className='flex items-center justify-between bg-black/10 dark:bg-black/20 px-2 py-1.5 rounded-lg'>
                  <div className='flex items-center gap-2'>
                    <img
                      src='https://cryptologos.cc/logos/polygon-matic-logo.png'
                      alt='MATIC'
                      className='w-4 h-4'
                    />
                    <span className='text-xs text-gray-500 dark:text-gray-400'>MATIC</span>
                  </div>
                  <span className='text-xs text-gray-900 dark:text-white font-medium'>
                    {(
                      walletStatus.cached_balances?.POLYGON ||
                      walletStatus.cached_balances?.MATIC ||
                      0
                    ).toFixed(4)}
                  </span>
                </div>
                <div className='flex items-center justify-between bg-black/10 dark:bg-black/20 px-2 py-1.5 rounded-lg'>
                  <div className='flex items-center gap-2'>
                    <img
                      src='https://cryptologos.cc/logos/bnb-bnb-logo.png'
                      alt='BNB'
                      className='w-4 h-4'
                    />
                    <span className='text-xs text-gray-500 dark:text-gray-400'>BNB</span>
                  </div>
                  <span className='text-xs text-gray-900 dark:text-white font-medium'>
                    {(
                      walletStatus.cached_balances?.BSC ||
                      walletStatus.cached_balances?.BNB ||
                      0
                    ).toFixed(4)}
                  </span>
                </div>
              </div>
            </div>

            {/* Card: Status */}
            <div className='bg-gradient-to-br from-emerald-100 dark:from-emerald-900/30 to-emerald-50 dark:to-emerald-800/20 border border-emerald-200 dark:border-emerald-700/30 rounded-xl p-4 hover:border-emerald-400 dark:hover:border-emerald-600/50 transition-all'>
              <div className='flex items-center justify-between'>
                <div className='p-2.5 bg-emerald-500/20 rounded-lg'>
                  <ActivityIcon className='w-5 h-5 text-emerald-600 dark:text-emerald-400' />
                </div>
                <div className='flex items-center gap-2'>
                  <span className='w-2 h-2 bg-emerald-500 rounded-full animate-pulse' />
                  <span className='text-lg font-bold text-emerald-600 dark:text-emerald-400'>
                    Ativa
                  </span>
                </div>
              </div>
              <p className='text-sm text-gray-500 dark:text-gray-400 mt-3'>Status do Sistema</p>
              <p className='text-xs text-emerald-600/80 dark:text-emerald-500/80'>
                100% operacional
              </p>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
            {/* Coluna Principal - Informações da Carteira */}
            <div className='lg:col-span-2 space-y-6'>
              {/* Card: Status da Carteira */}
              <div className='bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700'>
                <div className='flex items-center justify-between mb-6'>
                  <div className='flex items-center gap-3'>
                    <div className='w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center'>
                      <WalletIcon className='w-6 h-6 text-white' />
                    </div>
                    <div>
                      <h2 className='text-xl font-bold text-gray-900 dark:text-white'>
                        Carteira do Sistema
                      </h2>
                      <div className='flex items-center gap-2 mt-1'>
                        <span className='flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-xs font-medium'>
                          <span className='w-2 h-2 bg-green-500 rounded-full animate-pulse' /> Ativa
                        </span>
                        <span className='text-gray-500 text-sm'>{walletStatus.name}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(walletStatus.wallet_id || '')
                      toast.success('ID copiado!')
                    }}
                    className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
                    title='Copiar ID'
                  >
                    <CopyIcon className='w-5 h-5 text-gray-500 dark:text-gray-400' />
                  </button>
                </div>

                {/* Detalhes */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='bg-gray-100 dark:bg-gray-700/30 rounded-lg p-4'>
                    <div className='flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1'>
                      <DatabaseIcon className='w-4 h-4' />
                      ID da Carteira
                    </div>
                    <p className='text-gray-900 dark:text-white font-mono text-sm'>
                      {walletStatus.wallet_id?.slice(0, 16)}...
                    </p>
                  </div>
                  <div className='bg-gray-100 dark:bg-gray-700/30 rounded-lg p-4'>
                    <div className='flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1'>
                      <NetworkIcon className='w-4 h-4' />
                      Redes Configuradas
                    </div>
                    <p className='text-gray-900 dark:text-white font-semibold'>
                      {walletStatus.networks_count} redes
                    </p>
                  </div>
                  <div className='bg-gray-100 dark:bg-gray-700/30 rounded-lg p-4'>
                    <div className='flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1'>
                      <ShieldIcon className='w-4 h-4' />
                      Segurança
                    </div>
                    <p className='text-green-600 dark:text-green-400 font-semibold flex items-center gap-1'>
                      <CheckCircleIcon className='w-4 h-4' />
                      AES-256 Encrypted
                    </p>
                  </div>
                  <div className='bg-gray-100 dark:bg-gray-700/30 rounded-lg p-4'>
                    <div className='flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1'>
                      <KeyIcon className='w-4 h-4' />
                      Tipo
                    </div>
                    <p className='text-gray-900 dark:text-white font-semibold'>HD Wallet (BIP39)</p>
                  </div>
                </div>
              </div>

              {/* Card: Saldos em Cache */}
              {walletStatus.cached_balances &&
                Object.keys(walletStatus.cached_balances).length > 0 && (
                  <div className='bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700'>
                    <div className='flex items-center justify-between mb-4'>
                      <h3 className='text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
                        <TrendingUpIcon className='w-5 h-5 text-green-600 dark:text-green-400' />
                        Saldos em Cache
                      </h3>
                      <span className='text-xs text-gray-400 dark:text-gray-500'>
                        Última sincronização: agora
                      </span>
                    </div>
                    <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'>
                      {Object.entries(walletStatus.cached_balances)
                        .filter(([_, val]) => val > 0)
                        .sort((a, b) => {
                          const isStableA = a[0].includes('USD') ? 1 : 0
                          const isStableB = b[0].includes('USD') ? 1 : 0
                          if (isStableA !== isStableB) return isStableB - isStableA
                          return b[1] - a[1]
                        })
                        .map(([symbol, balance]) => {
                          const logoMap: Record<string, string> = {
                            USDT: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
                            USDC: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
                            DAI: 'https://cryptologos.cc/logos/multi-collateral-dai-dai-logo.png',
                            ETH: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
                            ETHEREUM: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
                            MATIC: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
                            POLYGON: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
                            BNB: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
                            BSC: 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
                            BTC: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
                            BITCOIN: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
                            SOL: 'https://cryptologos.cc/logos/solana-sol-logo.png',
                            SOLANA: 'https://cryptologos.cc/logos/solana-sol-logo.png',
                            AVAX: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
                            AVALANCHE: 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
                            TRX: 'https://cryptologos.cc/logos/tron-trx-logo.png',
                            TRON: 'https://cryptologos.cc/logos/tron-trx-logo.png',
                            LTC: 'https://cryptologos.cc/logos/litecoin-ltc-logo.png',
                            LITECOIN: 'https://cryptologos.cc/logos/litecoin-ltc-logo.png',
                            DOGE: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png',
                            DOGECOIN: 'https://cryptologos.cc/logos/dogecoin-doge-logo.png',
                            XRP: 'https://cryptologos.cc/logos/xrp-xrp-logo.png',
                            BASE: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
                            ARBITRUM: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
                            TRAY: trayLogo,
                          }
                          const logo = logoMap[symbol.toUpperCase()]
                          return (
                            <div
                              key={symbol}
                              className='bg-gray-100 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600/50 hover:border-gray-300 dark:hover:border-gray-500/50 transition-all'
                            >
                              <div className='flex items-center gap-2 mb-1'>
                                {logo && <img src={logo} alt={symbol} className='w-5 h-5' />}
                                <span className='text-xs text-gray-500 dark:text-gray-400'>
                                  {symbol}
                                </span>
                              </div>
                              <div className='text-lg font-bold text-gray-900 dark:text-white'>
                                {symbol.includes('USD') && '$'}
                                {balance.toLocaleString('en-US', {
                                  minimumFractionDigits: symbol.includes('USD') ? 2 : 4,
                                  maximumFractionDigits: symbol.includes('USD') ? 2 : 4,
                                })}
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}

              {/* Card: Fluxo de Taxas */}
              <div className='bg-gradient-to-br from-amber-100 dark:from-amber-900/20 to-orange-100 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700/30 rounded-xl p-6'>
                <h3 className='text-lg font-semibold text-amber-800 dark:text-amber-200 mb-4 flex items-center gap-2'>
                  <TrendingUpIcon className='w-5 h-5' />
                  Como as Taxas são Coletadas
                </h3>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  <div className='bg-black/10 dark:bg-black/20 rounded-lg p-4'>
                    <div className='flex items-center gap-2 mb-2'>
                      <ArrowDownLeftIcon className='w-5 h-5 text-green-600 dark:text-green-400' />
                      <span className='font-semibold text-gray-900 dark:text-white'>Trade P2P</span>
                    </div>
                    <div className='text-2xl font-bold text-green-600 dark:text-green-400'>
                      0.5%
                    </div>
                    <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                      Por transação completa
                    </div>
                  </div>
                  <div className='bg-black/10 dark:bg-black/20 rounded-lg p-4'>
                    <div className='flex items-center gap-2 mb-2'>
                      <ArrowUpRightIcon className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                      <span className='font-semibold text-gray-900 dark:text-white'>Trade OTC</span>
                    </div>
                    <div className='text-2xl font-bold text-blue-600 dark:text-blue-400'>3%</div>
                    <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                      Spread embutido
                    </div>
                  </div>
                  <div className='bg-black/10 dark:bg-black/20 rounded-lg p-4'>
                    <div className='flex items-center gap-2 mb-2'>
                      <ZapIcon className='w-5 h-5 text-purple-600 dark:text-purple-400' />
                      <span className='font-semibold text-gray-900 dark:text-white'>
                        Taxa de Rede
                      </span>
                    </div>
                    <div className='text-2xl font-bold text-purple-600 dark:text-purple-400'>
                      0.25%
                    </div>
                    <div className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                      Saques externos
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna Lateral - Ações Rápidas */}
            <div className='space-y-6'>
              {/* Card: Ações Rápidas */}
              <div className='bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700'>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
                  <SettingsIcon className='w-5 h-5 text-gray-500 dark:text-gray-400' />
                  Ações Rápidas
                </h3>
                <div className='space-y-3'>
                  <button
                    onClick={() => navigate('/admin/system-wallet/addresses')}
                    className='w-full flex items-center gap-3 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors'
                  >
                    <GlobeIcon className='w-5 h-5' />
                    <div className='text-left'>
                      <div className='font-semibold'>Ver Endereços</div>
                      <div className='text-xs text-blue-200'>
                        Todas as {walletStatus.networks_count} redes
                      </div>
                    </div>
                    <ExternalLinkIcon className='w-4 h-4 ml-auto' />
                  </button>

                  <button
                    onClick={() => navigate('/admin/fees')}
                    className='w-full flex items-center gap-3 p-4 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors'
                  >
                    <DollarSignIcon className='w-5 h-5' />
                    <div className='text-left'>
                      <div className='font-semibold'>Dashboard de Taxas</div>
                      <div className='text-xs text-green-200'>Receitas coletadas</div>
                    </div>
                    <ExternalLinkIcon className='w-4 h-4 ml-auto' />
                  </button>

                  <button
                    onClick={handleRefreshBalances}
                    disabled={isRefreshingBalances}
                    className='w-full flex items-center gap-3 p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors disabled:opacity-50'
                  >
                    <RefreshCwIcon
                      className={`w-5 h-5 ${isRefreshingBalances ? 'animate-spin' : ''}`}
                    />
                    <div className='text-left'>
                      <div className='font-semibold'>Sincronizar Saldos</div>
                      <div className='text-xs text-purple-200'>Atualizar blockchain</div>
                    </div>
                    {!isRefreshingBalances && <ExternalLinkIcon className='w-4 h-4 ml-auto' />}
                  </button>

                  <button
                    onClick={handleExportPrivateKey}
                    disabled={isExporting}
                    className='w-full flex items-center gap-3 p-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition-colors disabled:opacity-50'
                  >
                    {isExporting ? (
                      <RefreshCwIcon className='w-5 h-5 animate-spin' />
                    ) : (
                      <KeyIcon className='w-5 h-5' />
                    )}
                    <div className='text-left'>
                      <div className='font-semibold'>Exportar Private Key</div>
                      <div className='text-xs text-amber-200'>Para configurar .env</div>
                    </div>
                    <ExternalLinkIcon className='w-4 h-4 ml-auto' />
                  </button>
                </div>
              </div>

              {/* Card: Informações Técnicas */}
              <div className='bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700'>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
                  <ServerIcon className='w-5 h-5 text-gray-500 dark:text-gray-400' />
                  Informações Técnicas
                </h3>
                <div className='space-y-3 text-sm'>
                  <div className='flex justify-between py-2 border-b border-gray-200 dark:border-gray-700'>
                    <span className='text-gray-500 dark:text-gray-400'>Propósito</span>
                    <span className='text-blue-600 dark:text-blue-400'>Taxas & Comissões</span>
                  </div>
                  <div className='flex justify-between py-2 border-b border-gray-200 dark:border-gray-700'>
                    <span className='text-gray-500 dark:text-gray-400'>Criptografia</span>
                    <span className='text-gray-900 dark:text-white'>AES-256</span>
                  </div>
                  <div className='flex justify-between py-2 border-b border-gray-200 dark:border-gray-700'>
                    <span className='text-gray-500 dark:text-gray-400'>Derivação</span>
                    <span className='text-gray-900 dark:text-white'>BIP39/BIP44</span>
                  </div>
                  <div className='flex justify-between py-2'>
                    <span className='text-gray-500 dark:text-gray-400'>Backup</span>
                    <span className='text-green-600 dark:text-green-400 flex items-center gap-1'>
                      <CheckCircleIcon className='w-4 h-4' />
                      Configurado
                    </span>
                  </div>
                </div>
              </div>

              {/* Card: Aviso de Segurança */}
              <div className='bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 rounded-xl p-4'>
                <div className='flex gap-3'>
                  <AlertTriangleIcon className='w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5' />
                  <div>
                    <h4 className='font-semibold text-amber-800 dark:text-amber-200 text-sm'>
                      Segurança
                    </h4>
                    <p className='text-amber-700/70 dark:text-amber-300/70 text-xs mt-1'>
                      A frase de recuperação desta carteira deve estar guardada em local seguro.
                      Nunca compartilhe ou armazene digitalmente.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Content - Carteira não existe */}
      {!walletStatus?.exists && (
        <div className='bg-white dark:bg-gray-800 rounded-xl p-6 lg:p-8 border border-gray-200 dark:border-transparent'>
          {/* Step: Info - Sem carteira */}
          {currentStep === 'info' && (
            <div className='space-y-8'>
              <div className='text-center'>
                <div className='w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <ServerIcon className='w-12 h-12 text-blue-600' />
                </div>
                <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
                  Criar Carteira do Sistema
                </h2>
                <p className='text-gray-500 dark:text-gray-400'>
                  Crie a carteira blockchain para receber taxas e comissões da plataforma
                </p>
              </div>

              {/* Aviso de Segurança */}
              <div className='bg-amber-100 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4'>
                <div className='flex gap-3'>
                  <AlertTriangleIcon className='w-6 h-6 text-amber-600 flex-shrink-0' />
                  <div>
                    <h3 className='font-semibold text-amber-800 dark:text-amber-200'>
                      Atenção: Operação Crítica
                    </h3>
                    <p className='text-amber-700 dark:text-amber-300 text-sm mt-1'>
                      Esta carteira armazenará todas as taxas coletadas. A frase de recuperação de{' '}
                      <strong>12 palavras</strong> será exibida <strong>apenas uma vez</strong>.
                      Você DEVE salvá-la em local seguro antes de continuar.
                    </p>
                  </div>
                </div>
              </div>

              {/* Recursos */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='bg-gray-100 dark:bg-gray-700/50 rounded-xl p-4'>
                  <NetworkIcon className='w-8 h-8 text-blue-600 mb-2' />
                  <h4 className='font-semibold text-gray-900 dark:text-white'>
                    16 Redes Suportadas
                  </h4>
                  <p className='text-sm text-gray-500 dark:text-gray-400'>
                    Bitcoin, Ethereum, Polygon, BSC, Solana, Tron e mais
                  </p>
                </div>
                <div className='bg-gray-100 dark:bg-gray-700/50 rounded-xl p-4'>
                  <KeyIcon className='w-8 h-8 text-green-600 mb-2' />
                  <h4 className='font-semibold text-gray-900 dark:text-white'>
                    12 Palavras (BIP39)
                  </h4>
                  <p className='text-sm text-gray-500 dark:text-gray-400'>
                    Mesmo padrão de segurança das carteiras dos clientes
                  </p>
                </div>
                <div className='bg-gray-100 dark:bg-gray-700/50 rounded-xl p-4'>
                  <LockIcon className='w-8 h-8 text-purple-600 mb-2' />
                  <h4 className='font-semibold text-gray-900 dark:text-white'>Criptografia AES</h4>
                  <p className='text-sm text-gray-500 dark:text-gray-400'>
                    Chaves privadas criptografadas com segurança máxima
                  </p>
                </div>
                <div className='bg-gray-100 dark:bg-gray-700/50 rounded-xl p-4'>
                  <ShieldIcon className='w-8 h-8 text-red-600 mb-2' />
                  <h4 className='font-semibold text-gray-900 dark:text-white'>Apenas Admins</h4>
                  <p className='text-sm text-gray-500 dark:text-gray-400'>
                    Somente administradores têm acesso a esta carteira
                  </p>
                </div>
              </div>

              <button
                onClick={handleCreateWallet}
                disabled={isCreating}
                className='w-full py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 font-semibold text-lg'
              >
                {isCreating ? (
                  <span className='flex items-center justify-center gap-2'>
                    <RefreshCwIcon className='w-5 h-5 animate-spin' />
                    Criando Carteira...
                  </span>
                ) : (
                  'Criar Carteira do Sistema'
                )}
              </button>
            </div>
          )}

          {/* Step: Creating */}
          {currentStep === 'creating' && (
            <div className='text-center py-12'>
              <RefreshCwIcon className='w-16 h-16 text-blue-600 animate-spin mx-auto mb-6' />
              <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
                Criando Carteira do Sistema
              </h2>
              <p className='text-gray-500 dark:text-gray-400'>
                Gerando chaves seguras para 16 redes...
              </p>
            </div>
          )}

          {/* Step: Mnemonic Display */}
          {currentStep === 'mnemonic-display' && walletData && (
            <div className='space-y-6'>
              <div className='text-center'>
                <div className='w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <KeyIcon className='w-10 h-10 text-amber-600' />
                </div>
                <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
                  Sua Frase de Recuperação
                </h2>
                <p className='text-gray-500 dark:text-gray-400'>
                  Estas 12 palavras são a ÚNICA forma de recuperar esta carteira
                </p>
              </div>

              {/* Aviso Crítico */}
              <div className='bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4'>
                <div className='flex gap-3'>
                  <AlertTriangleIcon className='w-6 h-6 text-red-600 flex-shrink-0' />
                  <div>
                    <h3 className='font-semibold text-red-700 dark:text-red-200'>
                      ⚠️ AVISO CRÍTICO
                    </h3>
                    <ul className='text-red-600 dark:text-red-300 text-sm mt-1 space-y-1'>
                      <li>• Esta frase será exibida APENAS AGORA</li>
                      <li>• Anote em papel e guarde em cofre físico</li>
                      <li>• NUNCA salve em computador ou nuvem</li>
                      <li>• Quem tiver a frase terá acesso aos fundos</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Mnemonic Display */}
              <div className='bg-gray-100 dark:bg-gray-950 rounded-xl p-6'>
                <div className='flex justify-between items-center mb-4'>
                  <span className='text-gray-500 dark:text-gray-400 text-sm'>
                    Frase de Recuperação (12 palavras)
                  </span>
                  <div className='flex gap-2'>
                    <button
                      onClick={() => setShowMnemonic(!showMnemonic)}
                      className='p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors'
                      title={showMnemonic ? 'Ocultar' : 'Mostrar'}
                    >
                      {showMnemonic ? (
                        <EyeOffIcon className='w-5 h-5 text-gray-500 dark:text-gray-400' />
                      ) : (
                        <EyeIcon className='w-5 h-5 text-gray-400' />
                      )}
                    </button>
                    <button
                      onClick={copyMnemonic}
                      className='p-2 hover:bg-gray-800 rounded-lg transition-colors'
                      title='Copiar'
                    >
                      {copiedMnemonic ? (
                        <CheckIcon className='w-5 h-5 text-green-500' />
                      ) : (
                        <CopyIcon className='w-5 h-5 text-gray-400' />
                      )}
                    </button>
                  </div>
                </div>

                {showMnemonic ? (
                  <div className='grid grid-cols-3 sm:grid-cols-4 gap-3'>
                    {walletData.mnemonic.split(' ').map((word, index) => (
                      <div
                        key={`word-${word}-${index}`}
                        className='bg-gray-800 rounded-lg p-3 text-center'
                      >
                        <span className='text-gray-500 text-xs'>{index + 1}</span>
                        <p className='text-white font-mono font-semibold'>{word}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-8'>
                    <EyeOffIcon className='w-12 h-12 text-gray-600 mx-auto mb-2' />
                    <p className='text-gray-400'>Clique no ícone do olho para visualizar</p>
                  </div>
                )}
              </div>

              {/* Redes Criadas */}
              <div className='bg-green-900/20 rounded-xl p-4'>
                <h3 className='font-semibold text-green-200 mb-2'>
                  ✅ {walletData.networks_count} Endereços Criados
                </h3>
                <p className='text-green-300 text-sm'>
                  Endereços gerados para: {Object.keys(walletData.addresses).join(', ')}
                </p>
              </div>

              {/* Botões de Ação */}
              <div className='flex flex-col sm:flex-row gap-4'>
                <button
                  onClick={downloadBackup}
                  className='flex-1 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors flex items-center justify-center gap-2'
                >
                  <DownloadIcon className='w-5 h-5' />
                  Baixar Backup
                </button>
                <button
                  onClick={() => setCurrentStep('mnemonic-confirm')}
                  disabled={!showMnemonic}
                  className='flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50'
                >
                  Já Salvei, Continuar
                </button>
              </div>
            </div>
          )}

          {/* Step: Mnemonic Confirm */}
          {currentStep === 'mnemonic-confirm' && walletData && (
            <div className='space-y-6'>
              <div className='text-center'>
                <h2 className='text-2xl font-bold text-white mb-2'>
                  Confirme sua Frase de Recuperação
                </h2>
                <p className='text-gray-400'>
                  Digite as palavras nas posições indicadas para confirmar
                </p>
              </div>

              <div className='space-y-4'>
                {randomWordIndices.map(wordIndex => (
                  <div key={wordIndex} className='flex items-center gap-4'>
                    <span className='w-24 text-gray-500 text-sm'>Palavra #{wordIndex + 1}:</span>
                    <input
                      type='text'
                      value={confirmationWords[wordIndex] || ''}
                      onChange={e =>
                        setConfirmationWords({
                          ...confirmationWords,
                          [wordIndex]: e.target.value,
                        })
                      }
                      className='flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white'
                      placeholder={`Digite a palavra ${wordIndex + 1}`}
                    />
                  </div>
                ))}
              </div>

              <div className='flex gap-4'>
                <button
                  onClick={() => setCurrentStep('mnemonic-display')}
                  className='flex-1 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors'
                >
                  Voltar
                </button>
                <button
                  onClick={confirmAndFinish}
                  className='flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors'
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}

          {/* Step: Success (após criação) */}
          {currentStep === 'success' && walletData && !walletStatus?.exists && (
            <div className='text-center space-y-6'>
              <div className='w-20 h-20 bg-green-900/30 rounded-full flex items-center justify-center mx-auto'>
                <CheckCircleIcon className='w-12 h-12 text-green-600' />
              </div>

              <div>
                <h2 className='text-2xl font-bold text-white mb-2'>
                  🎉 Carteira Criada com Sucesso!
                </h2>
                <p className='text-gray-400'>
                  A carteira do sistema está pronta para receber taxas em 16 redes
                </p>
              </div>

              <div className='bg-gray-700/50 rounded-xl p-6 text-left'>
                <h3 className='text-lg font-semibold text-white mb-4'>Resumo</h3>
                <div className='space-y-3'>
                  <div className='flex justify-between'>
                    <span className='text-gray-500'>ID da Carteira:</span>
                    <span className='text-white font-mono text-sm'>
                      {walletData.wallet_id.slice(0, 8)}...
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-gray-500'>Redes Ativas:</span>
                    <span className='text-white'>
                      {walletData.networks_count} de {walletData.total_networks}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-gray-500'>Frase Confirmada:</span>
                    <span className='text-green-600'>✓ Sim</span>
                  </div>
                </div>
              </div>

              <div className='flex flex-col sm:flex-row gap-4'>
                <button
                  onClick={() => navigate('/admin/system-wallet/addresses')}
                  className='flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors'
                >
                  Ver Endereços
                </button>
                <button
                  onClick={() => navigate('/admin')}
                  className='flex-1 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors'
                >
                  Voltar ao Admin
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Exportar Private Key */}
      {showExportModal && exportKeyData && (
        <div className='fixed inset-0 z-50 flex items-center justify-center'>
          {/* Backdrop */}
          <div
            className='absolute inset-0 bg-black/70 backdrop-blur-sm'
            onClick={() => setShowExportModal(false)}
          />

          {/* Modal */}
          <div className='relative w-full max-w-xl mx-4 bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 max-h-[90vh] overflow-hidden flex flex-col'>
            {/* Header */}
            <div className='px-6 py-4 border-b border-gray-700'>
              <div className='flex items-center gap-3'>
                <div className='p-2 bg-amber-500/20 rounded-lg'>
                  <KeyIcon className='w-6 h-6 text-amber-500' />
                </div>
                <div>
                  <h3 className='text-lg font-bold text-white'>Exportar Private Key</h3>
                  <p className='text-sm text-gray-400'>
                    Para configurar PLATFORM_WALLET_PRIVATE_KEY
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className='p-6 space-y-4 overflow-y-auto flex-1'>
              {/* Warning */}
              <div className='bg-red-900/30 border border-red-800 rounded-lg p-4'>
                <div className='flex gap-3'>
                  <AlertTriangleIcon className='w-5 h-5 text-red-400 flex-shrink-0 mt-0.5' />
                  <div className='text-sm text-red-200'>
                    <strong>⚠️ ATENÇÃO:</strong> Esta chave privada dá acesso total aos fundos da
                    carteira do sistema. Guarde com segurança máxima!
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className='bg-gray-700/50 rounded-lg p-4 overflow-hidden'>
                <div className='text-xs text-gray-400 mb-1'>Endereço (Polygon/EVM)</div>
                <div className='flex items-start gap-2'>
                  <code className='text-sm text-white font-mono break-all flex-1 min-w-0'>
                    {exportKeyData.address}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(exportKeyData.address || '')
                      toast.success('Endereço copiado!')
                    }}
                    className='p-1.5 hover:bg-gray-600 rounded transition-colors flex-shrink-0'
                    title='Copiar endereço'
                    aria-label='Copiar endereço'
                  >
                    <CopyIcon className='w-4 h-4 text-gray-400' />
                  </button>
                </div>
              </div>

              {/* Private Key */}
              <div className='bg-gray-700/50 rounded-lg p-4 overflow-hidden'>
                <div className='flex items-center justify-between mb-2'>
                  <div className='text-xs text-gray-400'>Private Key</div>
                  <button
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    className='text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1'
                  >
                    {showPrivateKey ? (
                      <>
                        <EyeOffIcon className='w-4 h-4' />
                        Ocultar
                      </>
                    ) : (
                      <>
                        <EyeIcon className='w-4 h-4' />
                        Mostrar
                      </>
                    )}
                  </button>
                </div>
                <div className='flex items-start gap-2'>
                  <code className='text-sm text-white font-mono break-all flex-1 min-w-0'>
                    {showPrivateKey
                      ? exportKeyData.private_key
                      : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                  </code>
                  <button
                    onClick={copyPrivateKey}
                    className='p-1.5 hover:bg-gray-600 rounded transition-colors flex-shrink-0'
                    title='Copiar'
                  >
                    {copiedPrivateKey ? (
                      <CheckIcon className='w-4 h-4 text-green-400' />
                    ) : (
                      <CopyIcon className='w-4 h-4 text-gray-400' />
                    )}
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className='bg-blue-900/30 border border-blue-800 rounded-lg p-4 overflow-hidden'>
                <div className='text-sm font-semibold text-blue-200 mb-2'>📋 Instruções:</div>
                <ol className='text-sm text-blue-100 space-y-2 list-decimal list-inside'>
                  {exportKeyData.instructions?.map((instruction, idx) => (
                    <li key={idx} className='break-all leading-relaxed'>
                      <span className='break-all'>{instruction}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Footer */}
            <div className='px-6 py-4 border-t border-gray-700 flex justify-end gap-3'>
              <button
                onClick={() => setShowExportModal(false)}
                className='px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors'
              >
                Fechar
              </button>
              <button
                onClick={copyPrivateKey}
                className='px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2'
              >
                {copiedPrivateKey ? (
                  <>
                    <CheckIcon className='w-4 h-4' />
                    Copiado!
                  </>
                ) : (
                  <>
                    <CopyIcon className='w-4 h-4' />
                    Copiar Private Key
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminSystemWalletPage
