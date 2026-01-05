import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  EyeIcon,
  EyeOffIcon,
  CopyIcon,
  CheckIcon,
  AlertTriangleIcon,
  ShieldIcon,
  ArrowLeftIcon,
  DownloadIcon,
  CheckCircleIcon,
  RefreshCwIcon,
  KeyIcon,
  ServerIcon,
  NetworkIcon,
  LockIcon,
} from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { apiClient } from '@/services/api'

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

export const AdminSystemWalletPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const [currentStep, setCurrentStep] = useState<Step>('info')
  const [showMnemonic, setShowMnemonic] = useState(false)
  const [copiedMnemonic, setCopiedMnemonic] = useState(false)
  const [walletData, setWalletData] = useState<SystemWalletData | null>(null)
  const [walletStatus, setWalletStatus] = useState<WalletStatus | null>(null)
  const [confirmationWords, setConfirmationWords] = useState<{ [key: number]: string }>({})
  const [randomWordIndices, setRandomWordIndices] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)

  // Verificar se já existe carteira do sistema
  useEffect(() => {
    checkWalletStatus()
  }, [])

  const checkWalletStatus = async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.get('/admin/system-blockchain-wallet/status')
      if (response.data.success) {
        setWalletStatus(response.data.data || { exists: false })
        if (response.data.data?.exists) {
          setCurrentStep('success')
        }
      } else {
        setWalletStatus({ exists: false })
      }
    } catch (error: any) {
      console.error('Erro ao verificar status:', error)
      setWalletStatus({ exists: false })
    } finally {
      setIsLoading(false)
    }
  }

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
          <p className='text-gray-600 dark:text-gray-400'>Verificando status da carteira...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 py-8'>
      <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='flex items-center gap-4 mb-8'>
          <button
            onClick={() => navigate('/admin')}
            className='p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
            title='Voltar ao painel admin'
            aria-label='Voltar ao painel admin'
          >
            <ArrowLeftIcon className='w-5 h-5' />
          </button>
          <div>
            <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
              Carteira Blockchain do Sistema
            </h1>
            <p className='text-gray-600 dark:text-gray-400 mt-1'>
              Carteira para receber taxas e comissões em 16 redes
            </p>
          </div>
        </div>
        {/* Step Indicator */}
        {!walletStatus?.exists && renderStepIndicator()}

        {/* Content */}
        <div className='bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 lg:p-8'>
          {/* Step: Info - Carteira já existe */}
          {walletStatus?.exists && currentStep === 'success' && (
            <div className='text-center space-y-6'>
              <div className='w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto'>
                <CheckCircleIcon className='w-12 h-12 text-green-600' />
              </div>

              <div>
                <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
                  Carteira do Sistema Configurada
                </h2>
                <p className='text-gray-600 dark:text-gray-400'>
                  A carteira blockchain do sistema já está ativa e pronta para receber taxas.
                </p>
              </div>

              <div className='bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 text-left'>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
                  Informações da Carteira
                </h3>
                <div className='space-y-3'>
                  <div className='flex justify-between'>
                    <span className='text-gray-500'>ID:</span>
                    <span className='text-gray-900 dark:text-white font-mono text-sm'>
                      {walletStatus.wallet_id?.slice(0, 8)}...
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-gray-500'>Nome:</span>
                    <span className='text-gray-900 dark:text-white'>{walletStatus.name}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-gray-500'>Redes Ativas:</span>
                    <span className='text-gray-900 dark:text-white'>
                      {walletStatus.networks_count} redes
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/admin/system-wallet/addresses')}
                className='w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors'
              >
                Ver Endereços e Saldos
              </button>
            </div>
          )}

          {/* Step: Info - Sem carteira */}
          {currentStep === 'info' && !walletStatus?.exists && (
            <div className='space-y-8'>
              <div className='text-center'>
                <div className='w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <ServerIcon className='w-12 h-12 text-blue-600' />
                </div>
                <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
                  Criar Carteira do Sistema
                </h2>
                <p className='text-gray-600 dark:text-gray-400'>
                  Crie a carteira blockchain para receber taxas e comissões da plataforma
                </p>
              </div>

              {/* Aviso de Segurança */}
              <div className='bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4'>
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
                <div className='bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4'>
                  <NetworkIcon className='w-8 h-8 text-blue-600 mb-2' />
                  <h4 className='font-semibold text-gray-900 dark:text-white'>
                    16 Redes Suportadas
                  </h4>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    Bitcoin, Ethereum, Polygon, BSC, Solana, Tron e mais
                  </p>
                </div>
                <div className='bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4'>
                  <KeyIcon className='w-8 h-8 text-green-600 mb-2' />
                  <h4 className='font-semibold text-gray-900 dark:text-white'>
                    12 Palavras (BIP39)
                  </h4>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    Mesmo padrão de segurança das carteiras dos clientes
                  </p>
                </div>
                <div className='bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4'>
                  <LockIcon className='w-8 h-8 text-purple-600 mb-2' />
                  <h4 className='font-semibold text-gray-900 dark:text-white'>Criptografia AES</h4>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    Chaves privadas criptografadas com segurança máxima
                  </p>
                </div>
                <div className='bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4'>
                  <ShieldIcon className='w-8 h-8 text-red-600 mb-2' />
                  <h4 className='font-semibold text-gray-900 dark:text-white'>Apenas Admins</h4>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
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
              <p className='text-gray-600 dark:text-gray-400'>
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
                <p className='text-gray-600 dark:text-gray-400'>
                  Estas 12 palavras são a ÚNICA forma de recuperar esta carteira
                </p>
              </div>

              {/* Aviso Crítico */}
              <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4'>
                <div className='flex gap-3'>
                  <AlertTriangleIcon className='w-6 h-6 text-red-600 flex-shrink-0' />
                  <div>
                    <h3 className='font-semibold text-red-800 dark:text-red-200'>
                      ⚠️ AVISO CRÍTICO
                    </h3>
                    <ul className='text-red-700 dark:text-red-300 text-sm mt-1 space-y-1'>
                      <li>• Esta frase será exibida APENAS AGORA</li>
                      <li>• Anote em papel e guarde em cofre físico</li>
                      <li>• NUNCA salve em computador ou nuvem</li>
                      <li>• Quem tiver a frase terá acesso aos fundos</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Mnemonic Display */}
              <div className='bg-gray-900 dark:bg-gray-950 rounded-xl p-6'>
                <div className='flex justify-between items-center mb-4'>
                  <span className='text-gray-400 text-sm'>Frase de Recuperação (12 palavras)</span>
                  <div className='flex gap-2'>
                    <button
                      onClick={() => setShowMnemonic(!showMnemonic)}
                      className='p-2 hover:bg-gray-800 rounded-lg transition-colors'
                      title={showMnemonic ? 'Ocultar' : 'Mostrar'}
                    >
                      {showMnemonic ? (
                        <EyeOffIcon className='w-5 h-5 text-gray-400' />
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
              <div className='bg-green-50 dark:bg-green-900/20 rounded-xl p-4'>
                <h3 className='font-semibold text-green-800 dark:text-green-200 mb-2'>
                  ✅ {walletData.networks_count} Endereços Criados
                </h3>
                <p className='text-green-700 dark:text-green-300 text-sm'>
                  Endereços gerados para: {Object.keys(walletData.addresses).join(', ')}
                </p>
              </div>

              {/* Botões de Ação */}
              <div className='flex flex-col sm:flex-row gap-4'>
                <button
                  onClick={downloadBackup}
                  className='flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2'
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
                <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
                  Confirme sua Frase de Recuperação
                </h2>
                <p className='text-gray-600 dark:text-gray-400'>
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
                      className='flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      placeholder={`Digite a palavra ${wordIndex + 1}`}
                    />
                  </div>
                ))}
              </div>

              <div className='flex gap-4'>
                <button
                  onClick={() => setCurrentStep('mnemonic-display')}
                  className='flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors'
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
              <div className='w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto'>
                <CheckCircleIcon className='w-12 h-12 text-green-600' />
              </div>

              <div>
                <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
                  🎉 Carteira Criada com Sucesso!
                </h2>
                <p className='text-gray-600 dark:text-gray-400'>
                  A carteira do sistema está pronta para receber taxas em 16 redes
                </p>
              </div>

              <div className='bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 text-left'>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>Resumo</h3>
                <div className='space-y-3'>
                  <div className='flex justify-between'>
                    <span className='text-gray-500'>ID da Carteira:</span>
                    <span className='text-gray-900 dark:text-white font-mono text-sm'>
                      {walletData.wallet_id.slice(0, 8)}...
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-gray-500'>Redes Ativas:</span>
                    <span className='text-gray-900 dark:text-white'>
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
                  className='flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors'
                >
                  Voltar ao Admin
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminSystemWalletPage
