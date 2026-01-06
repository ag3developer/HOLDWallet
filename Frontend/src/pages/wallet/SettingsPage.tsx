import { useState, useEffect } from 'react'
import {
  Settings,
  Check,
  Coins,
  Shield,
  Download,
  AlertTriangle,
  Lock,
  Database,
  Info,
  ShieldCheck,
  Smartphone,
  ArrowLeftRight,
  Building2,
  BarChart3,
  Globe,
  Briefcase,
  RefreshCw,
  TrendingUp,
  Mail,
  MessageCircle,
  BookOpen,
  Activity,
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import { seedVerificationService } from '../../services/seed-verification-service'
import { CryptoIcon } from '../../components/CryptoIcon'
import { BiometricSettings } from '../../components/security/BiometricSettings'
import {
  TwitterIcon,
  TelegramIcon,
  DiscordIcon,
  InstagramIcon,
  LinkedInIcon,
  YouTubeIcon,
} from '../../components/icons/SocialIcons'

// Import dos logos das moedas
import bitcoinLogo from '../../assets/crypto-icons/btc.svg'
import ethereumLogo from '../../assets/crypto-icons/eth.svg'
import polygonLogo from '../../assets/crypto-icons/matic.svg'
import bnbLogo from '../../assets/crypto-icons/bnb.svg'
import tronLogo from '../../assets/crypto-icons/trx.svg'
import solanLogo from '../../assets/crypto-icons/sol.svg'
import litecoinLogo from '../../assets/crypto-icons/ltc.svg'
import dogecoinLogo from '../../assets/crypto-icons/doge.svg'
import cardanoLogo from '../../assets/crypto-icons/ada.svg'
import avalancheLogo from '../../assets/crypto-icons/avax.svg'
import polkadotLogo from '../../assets/crypto-icons/dot.svg'
import chainlinkLogo from '../../assets/crypto-icons/link.svg'
import shibaLogo from '../../assets/crypto-icons/sib.svg'
import xrpLogo from '../../assets/crypto-icons/xrp.svg'

interface NetworkPreferences {
  bitcoin: boolean
  ethereum: boolean
  polygon: boolean
  bsc: boolean
  tron: boolean
  base: boolean
  solana: boolean
  litecoin: boolean
  dogecoin: boolean
  cardano: boolean
  avalanche: boolean
  polkadot: boolean
  chainlink: boolean
  shiba: boolean
  xrp: boolean
}

interface TokenPreferences {
  usdt: boolean
  usdc: boolean
}

export const SettingsPage = () => {
  const [showAllNetworks, setShowAllNetworks] = useState(true)
  const [activeTab, setActiveTab] = useState<
    'networks' | 'security' | 'backup' | 'privacy' | 'about'
  >('networks')
  const [lockTimeout, setLockTimeout] = useState<string>('15 minutos')
  const [requirePassword, setRequirePassword] = useState(false)
  const [hideSensitiveData, setHideSensitiveData] = useState(false)
  const [showSeedPhraseModal, setShowSeedPhraseModal] = useState(false)
  const [seedPhraseVerified, setSeedPhraseVerified] = useState(false)
  const [selectedWords, setSelectedWords] = useState<number[]>([])
  const [requiredPositions, setRequiredPositions] = useState<number[]>([])
  const [verificationMessage, setVerificationMessage] = useState('')
  const [isLoadingVerification, setIsLoadingVerification] = useState(false)
  const [seedPhraseData, setSeedPhraseData] = useState<string>('')

  // Exemplo de seed phrase (em produção vem do backend seguro)
  // REMOVIDO: Não mais usando mock seed phrase
  // Agora vem do backend após verificação bem-sucedida
  const [networkPreferences, setNetworkPreferences] = useState<NetworkPreferences>({
    bitcoin: true,
    ethereum: true,
    polygon: true,
    bsc: true,
    tron: true,
    base: true,
    solana: true,
    litecoin: true,
    dogecoin: true,
    cardano: true,
    avalanche: true,
    polkadot: true,
    chainlink: true,
    shiba: true,
    xrp: true,
  })

  const [tokenPreferences, setTokenPreferences] = useState<TokenPreferences>({
    usdt: true,
    usdc: true,
  })

  // Carregar preferências do localStorage
  useEffect(() => {
    const savedPreferences = localStorage.getItem('wallet_network_preferences')
    const savedShowAll = localStorage.getItem('wallet_show_all_networks')
    const savedTokenPrefs = localStorage.getItem('wallet_token_preferences')
    const savedLockTimeout = localStorage.getItem('wallet_lock_timeout')
    const savedRequirePassword = localStorage.getItem('wallet_require_password')
    const savedHideSensitive = localStorage.getItem('wallet_hide_sensitive_data')

    if (savedPreferences) {
      setNetworkPreferences(JSON.parse(savedPreferences))
    }
    if (savedShowAll !== null) {
      setShowAllNetworks(savedShowAll === 'true')
    }
    if (savedTokenPrefs) {
      setTokenPreferences(JSON.parse(savedTokenPrefs))
    }
    if (savedLockTimeout) {
      setLockTimeout(savedLockTimeout)
    }
    if (savedRequirePassword !== null) {
      setRequirePassword(savedRequirePassword === 'true')
    }
    if (savedHideSensitive !== null) {
      setHideSensitiveData(savedHideSensitive === 'true')
    }
  }, [])

  const handleToggleNetwork = (network: keyof NetworkPreferences) => {
    const newPreferences = {
      ...networkPreferences,
      [network]: !networkPreferences[network],
    }
    setNetworkPreferences(newPreferences)
    localStorage.setItem('wallet_network_preferences', JSON.stringify(newPreferences))
    toast.success(
      `Rede ${network.toUpperCase()} ${newPreferences[network] ? 'ativada' : 'desativada'}`,
      {
        duration: 2000,
        position: 'bottom-center',
      }
    )
  }

  const handleToggleToken = (token: keyof TokenPreferences) => {
    const newPreferences = {
      ...tokenPreferences,
      [token]: !tokenPreferences[token],
    }
    setTokenPreferences(newPreferences)
    localStorage.setItem('wallet_token_preferences', JSON.stringify(newPreferences))
    toast.success(
      `Token ${token.toUpperCase()} ${newPreferences[token] ? 'ativado' : 'desativado'}`,
      {
        duration: 2000,
        position: 'bottom-center',
      }
    )
  }

  const handleToggleShowAll = () => {
    const newValue = !showAllNetworks
    setShowAllNetworks(newValue)
    localStorage.setItem('wallet_show_all_networks', newValue.toString())
    toast.success(newValue ? 'Mostrando todas as redes' : 'Mostrando apenas redes selecionadas', {
      duration: 2000,
      position: 'bottom-center',
    })
  }

  const handleSelectAll = () => {
    const allEnabled: NetworkPreferences = {
      bitcoin: true,
      ethereum: true,
      polygon: true,
      bsc: true,
      tron: true,
      base: true,
      solana: true,
      litecoin: true,
      dogecoin: true,
      cardano: true,
      avalanche: true,
      polkadot: true,
      chainlink: true,
      shiba: true,
      xrp: true,
    }
    setNetworkPreferences(allEnabled)
    localStorage.setItem('wallet_network_preferences', JSON.stringify(allEnabled))
    toast.success('Todas as redes ativadas', {
      duration: 2000,
      position: 'bottom-center',
    })
  }

  const handleDeselectAll = () => {
    const allDisabled: NetworkPreferences = {
      bitcoin: false,
      ethereum: false,
      polygon: false,
      bsc: false,
      tron: false,
      base: false,
      solana: false,
      litecoin: false,
      dogecoin: false,
      cardano: false,
      avalanche: false,
      polkadot: false,
      chainlink: false,
      shiba: false,
      xrp: false,
    }
    setNetworkPreferences(allDisabled)
    localStorage.setItem('wallet_network_preferences', JSON.stringify(allDisabled))
    toast.success('Todas as redes desativadas', {
      duration: 2000,
      position: 'bottom-center',
    })
  }

  const handleLockTimeoutChange = (value: string) => {
    setLockTimeout(value)
    localStorage.setItem('wallet_lock_timeout', value)
    toast.success(`Bloqueio automático definido para ${value}`, {
      duration: 2000,
      position: 'bottom-center',
    })
  }

  const handleToggleRequirePassword = () => {
    const newValue = !requirePassword
    setRequirePassword(newValue)
    localStorage.setItem('wallet_require_password', String(newValue))
    toast.success(newValue ? 'Confirmação por senha ativada' : 'Confirmação por senha desativada', {
      duration: 2000,
      position: 'bottom-center',
    })
  }

  const handleClearCache = () => {
    // Simular limpeza de cache
    localStorage.removeItem('wallet_cache_data')
    sessionStorage.clear()
    toast.success('Cache limpo com sucesso', {
      duration: 2000,
      position: 'bottom-center',
    })
  }

  const handleToggleHideSensitive = () => {
    const newValue = !hideSensitiveData
    setHideSensitiveData(newValue)
    localStorage.setItem('wallet_hide_sensitive_data', String(newValue))
    toast.success(newValue ? 'Dados sensíveis ocultados' : 'Dados sensíveis visíveis', {
      duration: 2000,
      position: 'bottom-center',
    })
  }

  const handleExportSeedPhrase = async () => {
    // Obter ID da carteira (deve vir do contexto/props)
    // Por enquanto, usando hardcoded para demo
    const walletId = 'default-wallet'

    try {
      setIsLoadingVerification(true)

      // Chamar backend para obter posições aleatórias
      const response = await seedVerificationService.startSeedVerification(walletId)

      setRequiredPositions(response.required_positions)
      setSelectedWords([])
      setSeedPhraseVerified(false)
      setVerificationMessage('')
      setShowSeedPhraseModal(true)

      toast.success('Posições geradas. Verifique sua seed escrita em papel.', {
        duration: 2000,
        position: 'bottom-center',
      })
    } catch (error) {
      toast.error('Erro ao iniciar verificação de seed', {
        duration: 2000,
        position: 'bottom-center',
      })
      console.error('Error starting seed verification:', error)
    } finally {
      setIsLoadingVerification(false)
    }
  }

  const handleVerifySeedWords = async (position: number) => {
    const walletId = 'default-wallet'

    if (selectedWords.includes(position)) {
      // Desselecionar se já foi clicado
      setSelectedWords(selectedWords.filter(p => p !== position))
    } else {
      // Selecionar palavra
      const newSelected = [...selectedWords, position]
      setSelectedWords(newSelected)

      // Verificar se todas as 3 palavras foram selecionadas
      if (newSelected.length === 3) {
        try {
          setIsLoadingVerification(true)

          // Enviar ao backend para validação
          const response = await seedVerificationService.verifySeedWords(walletId, newSelected)

          if (response.verified) {
            setSeedPhraseVerified(true)
            setVerificationMessage('')

            // Obter a seed phrase completa
            const seedResponse = await seedVerificationService.exportSeedPhrase(walletId)
            setSeedPhraseData(seedResponse.seed_phrase)

            toast.success('Verificação bem-sucedida! Seed desbloqueada.', {
              duration: 2000,
              position: 'bottom-center',
            })
          } else {
            setSelectedWords([])
            setVerificationMessage(
              '❌ Seleção incorreta. Verifique sua seed phrase no papel e tente novamente.'
            )
            toast.error('Palavras não correspondem à sua seed phrase.', {
              duration: 2000,
              position: 'bottom-center',
            })
          }
        } catch (error) {
          setSelectedWords([])
          setVerificationMessage('❌ Erro na verificação. Tente novamente.')
          toast.error('Erro ao verificar seed phrase', {
            duration: 2000,
            position: 'bottom-center',
          })
          console.error('Error verifying seed:', error)
        } finally {
          setIsLoadingVerification(false)
        }
      }
    }
  }

  const handleCloseSeedPhraseModal = () => {
    setShowSeedPhraseModal(false)
    setSeedPhraseVerified(false)
    setSelectedWords([])
    setRequiredPositions([])
    setVerificationMessage('')
  }

  const handleExportPrivateKeys = () => {
    toast.success('Abrir modal para exportar chaves privadas', {
      duration: 2000,
      position: 'bottom-center',
    })
    // TODO: Implementar modal para exportação de chaves
  }

  const handleDownloadBackup = () => {
    toast.success('Iniciando download do backup criptografado', {
      duration: 2000,
      position: 'bottom-center',
    })
    // TODO: Implementar download de backup
  }

  const handleManageHistory = () => {
    toast.success('Gerenciador de histórico em desenvolvimento', {
      duration: 2000,
      position: 'bottom-center',
    })
  }

  const networks = [
    {
      key: 'bitcoin' as const,
      name: 'Bitcoin',
      symbol: 'BTC',
      logo: bitcoinLogo,
      color: 'bg-orange-500',
    },
    {
      key: 'ethereum' as const,
      name: 'Ethereum',
      symbol: 'ETH',
      logo: ethereumLogo,
      color: 'bg-blue-500',
    },
    {
      key: 'polygon' as const,
      name: 'Polygon',
      symbol: 'MATIC',
      logo: polygonLogo,
      color: 'bg-purple-500',
    },
    {
      key: 'bsc' as const,
      name: 'BNB Smart Chain',
      symbol: 'BNB',
      logo: bnbLogo,
      color: 'bg-yellow-500',
    },
    {
      key: 'tron' as const,
      name: 'Tron',
      symbol: 'TRX',
      logo: tronLogo,
      color: 'bg-red-500',
    },
    {
      key: 'base' as const,
      name: 'Base',
      symbol: 'BASE',
      logo: null, // Usar CryptoIcon component
      color: 'bg-blue-600',
    },
    {
      key: 'solana' as const,
      name: 'Solana',
      symbol: 'SOL',
      logo: solanLogo,
      color: 'bg-purple-600',
    },
    {
      key: 'litecoin' as const,
      name: 'Litecoin',
      symbol: 'LTC',
      logo: litecoinLogo,
      color: 'bg-gray-500',
    },
    {
      key: 'dogecoin' as const,
      name: 'Dogecoin',
      symbol: 'DOGE',
      logo: dogecoinLogo,
      color: 'bg-yellow-400',
    },
    {
      key: 'cardano' as const,
      name: 'Cardano',
      symbol: 'ADA',
      logo: cardanoLogo,
      color: 'bg-blue-700',
    },
    {
      key: 'avalanche' as const,
      name: 'Avalanche',
      symbol: 'AVAX',
      logo: avalancheLogo,
      color: 'bg-red-600',
    },
    {
      key: 'polkadot' as const,
      name: 'Polkadot',
      symbol: 'DOT',
      logo: polkadotLogo,
      color: 'bg-pink-600',
    },
    {
      key: 'chainlink' as const,
      name: 'Chainlink',
      symbol: 'LINK',
      logo: chainlinkLogo,
      color: 'bg-blue-700',
    },
    {
      key: 'shiba' as const,
      name: 'Shiba Inu',
      symbol: 'SHIB',
      logo: shibaLogo,
      color: 'bg-orange-600',
    },
    {
      key: 'xrp' as const,
      name: 'XRP (Ripple)',
      symbol: 'XRP',
      logo: xrpLogo,
      color: 'bg-gray-700',
    },
  ]

  // Mapa de estilos de cores para cada rede
  const networkColorStyles: Record<keyof NetworkPreferences, string> = {
    bitcoin: 'bg-orange-500 ring-orange-400',
    ethereum: 'bg-blue-500 ring-blue-400',
    polygon: 'bg-purple-500 ring-purple-400',
    bsc: 'bg-yellow-500 ring-yellow-400',
    tron: 'bg-red-500 ring-red-400',
    base: 'bg-blue-600 ring-blue-500',
    solana: 'bg-purple-600 ring-purple-500',
    litecoin: 'bg-gray-500 ring-gray-400',
    dogecoin: 'bg-yellow-400 ring-yellow-300',
    cardano: 'bg-blue-700 ring-blue-600',
    avalanche: 'bg-red-600 ring-red-500',
    polkadot: 'bg-pink-600 ring-pink-500',
    chainlink: 'bg-blue-700 ring-blue-600',
    shiba: 'bg-orange-600 ring-orange-500',
    xrp: 'bg-gray-700 ring-gray-600',
  }

  return (
    <div className='space-y-6 max-w-5xl mx-auto'>
      <Toaster />

      {/* Header */}
      <div className='flex items-center gap-3'>
        <div className='w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center'>
          <Settings className='w-6 h-6 text-white' />
        </div>
        <div>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-white'>
            Configurações de Carteira
          </h1>
          <p className='text-gray-600 dark:text-gray-300 mt-1'>
            Gerencie suas redes, backup e privacidade
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden'>
        <div className='flex space-x-1 p-1 bg-gray-100 dark:bg-gray-700/50'>
          {[
            { id: 'networks', label: 'Redes', icon: Coins },
            { id: 'security', label: 'Segurança', icon: Shield },
            { id: 'backup', label: 'Backup', icon: Download },
            { id: 'privacy', label: 'Privacidade', icon: Lock },
            { id: 'about', label: 'Sobre', icon: Info },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <tab.icon className='w-4 h-4' />
              <span className='hidden sm:inline'>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className='space-y-6'>
        {/* NETWORKS TAB */}
        {activeTab === 'networks' && (
          <>
            {/* Show All Networks Toggle */}
            <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
              <div className='flex items-center justify-between'>
                <div>
                  <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-1'>
                    Modo de Visualização
                  </h3>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    {showAllNetworks
                      ? 'Mostrando endereço multi geral para todas as redes'
                      : 'Mostrando apenas redes selecionadas abaixo'}
                  </p>
                </div>
                <button
                  title='Alternar modo de visualização'
                  onClick={handleToggleShowAll}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    showAllNetworks ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      showAllNetworks ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Network Selection */}
            <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
              <div className='flex items-center justify-between mb-6'>
                <div>
                  <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-1'>
                    Redes Suportadas
                  </h3>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    Selecione quais redes você deseja visualizar na sua carteira
                  </p>
                </div>
                <div className='flex gap-2'>
                  <button
                    title='Selecionar todas as redes'
                    onClick={handleSelectAll}
                    className='px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
                  >
                    Selecionar Todas
                  </button>
                  <button
                    title='Desmarcar todas as redes'
                    onClick={handleDeselectAll}
                    className='px-3 py-2 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors'
                  >
                    Desmarcar Todas
                  </button>
                </div>
              </div>

              <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3'>
                {networks.map(network => (
                  <button
                    key={network.key}
                    onClick={() => handleToggleNetwork(network.key)}
                    className={`relative flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer transition-all duration-200 transform hover:scale-105 ${
                      networkPreferences[network.key]
                        ? `${networkColorStyles[network.key]} text-white shadow-lg ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900`
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    title={network.name}
                  >
                    {/* Logo da Moeda */}
                    {network.logo ? (
                      <img
                        src={network.logo}
                        alt={network.name}
                        className='w-8 h-8 mb-2 object-contain'
                      />
                    ) : (
                      <CryptoIcon symbol={network.symbol} size={32} className='mb-2' />
                    )}

                    {/* Símbolo */}
                    <p className='text-xs font-semibold text-center'>{network.symbol}</p>

                    {/* Checkmark */}
                    {networkPreferences[network.key] && (
                      <div className='absolute top-1 right-1 w-5 h-5 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center'>
                        <Check className='w-3 h-3 text-green-600' />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Info Card */}
            <div className='bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800'>
              <div className='flex gap-3'>
                <div className='flex-shrink-0'>
                  <div className='w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center'>
                    <Settings className='w-5 h-5 text-white' />
                  </div>
                </div>
                <div>
                  <h4 className='font-semibold text-blue-900 dark:text-blue-200 mb-2'>
                    💡 Sobre as Configurações
                  </h4>
                  <ul className='text-sm text-blue-800 dark:text-blue-300 space-y-1'>
                    <li>
                      • <strong>Modo Geral:</strong> Mostra um endereço multi para todas as redes
                      EVM (ETH, MATIC, BNB, etc.)
                    </li>
                    <li>
                      • <strong>Modo Customizado:</strong> Mostra apenas as redes que você
                      selecionou
                    </li>
                    <li>
                      • <strong>Endereços EVM:</strong> Ethereum, Polygon, BSC e Base compartilham o
                      mesmo endereço
                    </li>
                    <li>
                      • <strong>Redes Independentes:</strong> Bitcoin e Tron têm endereços únicos
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Stablecoin Token Preferences */}
            <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
              <div className='flex items-center justify-between mb-6'>
                <div>
                  <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-1'>
                    Preferências de Stablecoins
                  </h3>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    Escolha quais stablecoins você deseja visualizar
                  </p>
                </div>
              </div>

              <div className='space-y-3'>
                {[
                  {
                    key: 'usdt' as const,
                    name: 'USDT (Tether)',
                    description: 'Disponível em Ethereum, Polygon, BSC, Tron, Base e mais',
                    color: 'from-green-400 to-green-600',
                  },
                  {
                    key: 'usdc' as const,
                    name: 'USDC (USD Coin)',
                    description: 'Disponível em Ethereum, Polygon, Arbitrum, Optimism, Base',
                    color: 'from-blue-400 to-blue-600',
                  },
                ].map(token => (
                  <button
                    key={token.key}
                    onClick={() => handleToggleToken(token.key)}
                    className={`w-full relative flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      tokenPreferences[token.key]
                        ? 'bg-gradient-to-r ' +
                          token.color +
                          ' border-transparent text-white shadow-lg'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className='text-left'>
                      <h4 className='font-semibold'>{token.name}</h4>
                      <p
                        className={`text-sm mt-1 ${
                          tokenPreferences[token.key]
                            ? 'text-white/90'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {token.description}
                      </p>
                    </div>
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                        tokenPreferences[token.key]
                          ? 'bg-white border-white'
                          : 'border-gray-300 dark:border-gray-500'
                      }`}
                    >
                      {tokenPreferences[token.key] && <Check className='w-4 h-4 text-green-600' />}
                    </div>
                  </button>
                ))}
              </div>

              <div className='mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg'>
                <p className='text-sm text-amber-800 dark:text-amber-200'>
                  💡 <strong>Dica:</strong> Os stablecoins aparecem em vários blockchains.
                  Ativar/desativar aqui irá mostrar ou esconder todos os pares nos diferentes
                  blockchains.
                </p>
              </div>
            </div>

            {/* Token Standards Info */}
            <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
                Padrões de Tokens Suportados
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <div className='p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                  <h4 className='font-medium text-gray-900 dark:text-white mb-2'>ERC-20</h4>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    Tokens na rede Ethereum
                  </p>
                </div>
                <div className='p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                  <h4 className='font-medium text-gray-900 dark:text-white mb-2'>BEP-20</h4>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    Tokens na BNB Smart Chain
                  </p>
                </div>
                <div className='p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                  <h4 className='font-medium text-gray-900 dark:text-white mb-2'>TRC-20</h4>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>Tokens na rede Tron</p>
                </div>
                <div className='p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                  <h4 className='font-medium text-gray-900 dark:text-white mb-2'>Polygon (POL)</h4>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>Tokens na rede Polygon</p>
                </div>
                <div className='p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                  <h4 className='font-medium text-gray-900 dark:text-white mb-2'>Base</h4>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    Tokens na rede Base (L2)
                  </p>
                </div>
                <div className='p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                  <h4 className='font-medium text-gray-900 dark:text-white mb-2'>Bitcoin</h4>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>BTC nativo</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Security Section */}
        {activeTab === 'security' && (
          <div className='space-y-6'>
            {/* Biometric Authentication */}
            <BiometricSettings />

            {/* Other Security Settings */}
            <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
              <div className='flex items-center gap-3 mb-6'>
                <div className='w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center'>
                  <Shield className='w-5 h-5 text-blue-600' />
                </div>
                <div>
                  <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                    Segurança da Carteira
                  </h3>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    Configurações específicas de segurança da carteira
                  </p>
                </div>
              </div>

              <div className='space-y-4'>
                {/* Lock Timeout */}
                <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                  <div className='flex items-center gap-3'>
                    <Lock className='w-5 h-5 text-purple-600' />
                    <div>
                      <h4 className='font-medium text-gray-900 dark:text-white'>
                        Tempo de Bloqueio Automático
                      </h4>
                      <p className='text-sm text-gray-600 dark:text-gray-400'>
                        Bloqueie a carteira após inatividade
                      </p>
                    </div>
                  </div>
                  <select
                    title='Selecione o tempo de bloqueio'
                    value={lockTimeout}
                    onChange={e => handleLockTimeoutChange(e.target.value)}
                    className='px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg text-gray-900 dark:text-white'
                  >
                    <option>5 minutos</option>
                    <option>10 minutos</option>
                    <option>15 minutos</option>
                    <option>30 minutos</option>
                    <option>1 hora</option>
                    <option>Nunca</option>
                  </select>
                </div>

                {/* Require Password for Transactions */}
                <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                  <div className='flex items-center gap-3'>
                    <Lock className='w-5 h-5 text-orange-600' />
                    <div>
                      <h4 className='font-medium text-gray-900 dark:text-white'>
                        Confirmar com Senha
                      </h4>
                      <p className='text-sm text-gray-600 dark:text-gray-400'>
                        Solicitar senha para transações acima de um valor
                      </p>
                    </div>
                  </div>
                  <button
                    title='Ativar confirmação por senha para transações'
                    onClick={handleToggleRequirePassword}
                    className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                      requirePassword ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                        requirePassword ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            <div className='mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg'>
              <p className='text-sm text-blue-800 dark:text-blue-200'>
                💡 <strong>Para 2FA e mais segurança:</strong> Acesse{' '}
                <a href='/settings' className='underline hover:no-underline'>
                  Configurações de Conta
                </a>{' '}
                para habilitar autenticação de dois fatores.
              </p>
            </div>
          </div>
        )}

        {/* Backup & Recovery Section */}
        {activeTab === 'backup' && (
          <div className='space-y-4'>
            {/* Seed Phrase */}
            <div className='p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg'>
              <div className='flex items-start justify-between mb-3'>
                <div className='flex items-start gap-3'>
                  <AlertTriangle className='w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5' />
                  <div>
                    <h4 className='font-semibold text-amber-900 dark:text-amber-200'>
                      Frase de Recuperação (Seed Phrase)
                    </h4>
                    <p className='text-sm text-amber-800 dark:text-amber-300 mt-1'>
                      Guarde sua frase de 12 ou 24 palavras em um local seguro. Quem tiver acesso a
                      ela poderá acessar toda a sua carteira.
                    </p>
                  </div>
                </div>
              </div>
              <button
                title='Ver frase de recuperação da carteira'
                onClick={handleExportSeedPhrase}
                className='w-full px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium'
              >
                Ver Frase de Recuperação
              </button>
            </div>

            {/* Private Keys Backup */}
            <div className='p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
              <div className='flex items-start justify-between mb-3'>
                <div className='flex items-start gap-3'>
                  <AlertTriangle className='w-5 h-5 text-red-600 flex-shrink-0 mt-0.5' />
                  <div>
                    <h4 className='font-semibold text-red-900 dark:text-red-200'>
                      Chaves Privadas
                    </h4>
                    <p className='text-sm text-red-800 dark:text-red-300 mt-1'>
                      Exporte suas chaves privadas de forma segura. Nunca compartilhe com ninguém.
                    </p>
                  </div>
                </div>
              </div>
              <button
                title='Exportar chaves privadas da carteira'
                onClick={handleExportPrivateKeys}
                className='w-full px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium'
              >
                Exportar Chaves Privadas
              </button>
            </div>

            {/* Encrypted Backup */}
            <div className='p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg'>
              <div className='flex items-start justify-between mb-3'>
                <div className='flex items-start gap-3'>
                  <Database className='w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5' />
                  <div>
                    <h4 className='font-semibold text-blue-900 dark:text-blue-200'>
                      Backup Criptografado
                    </h4>
                    <p className='text-sm text-blue-800 dark:text-blue-300 mt-1'>
                      Faça download de um arquivo de backup criptografado de toda sua carteira.
                    </p>
                  </div>
                </div>
              </div>
              <button
                title='Fazer download de backup criptografado'
                onClick={handleDownloadBackup}
                className='w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium'
              >
                Fazer Download do Backup
              </button>
            </div>
          </div>
        )}

        {/* Privacy & Data Section */}
        {activeTab === 'privacy' && (
          <div className='bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
              Privacidade e Dados
            </h3>

            <div className='space-y-4'>
              {/* Clear Cache */}
              <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                <div>
                  <h4 className='font-medium text-gray-900 dark:text-white'>Limpar Cache</h4>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    Limpar dados temporários da carteira
                  </p>
                </div>
                <button
                  title='Limpar cache da carteira'
                  onClick={handleClearCache}
                  className='px-4 py-2 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 transition-colors'
                >
                  Limpar
                </button>
              </div>

              {/* Hide Sensitive Data */}
              <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                <div>
                  <h4 className='font-medium text-gray-900 dark:text-white'>
                    Ocultar Dados Sensíveis
                  </h4>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    Ocultar saldos e endereços por padrão
                  </p>
                </div>
                <button
                  title='Alternar ocultação de dados sensíveis'
                  onClick={handleToggleHideSensitive}
                  className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                    hideSensitiveData ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                      hideSensitiveData ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Transaction History */}
              <div className='flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg'>
                <div>
                  <h4 className='font-medium text-gray-900 dark:text-white'>
                    Histórico de Transações
                  </h4>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    Gerenciar histórico de transações
                  </p>
                </div>
                <button
                  title='Gerenciar histórico de transações'
                  onClick={handleManageHistory}
                  className='px-4 py-2 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 transition-colors'
                >
                  Gerenciar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* About Section */}
        {activeTab === 'about' && (
          <div className='space-y-6'>
            {/* Header Card com Logo */}
            <div className='bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 rounded-xl p-6 text-white relative overflow-hidden'>
              {/* Background Pattern */}
              <div className='absolute inset-0 opacity-10'>
                <div className='absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2' />
                <div className='absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2' />
              </div>

              <div className='relative z-10'>
                <div className='flex items-center gap-4 mb-6'>
                  {/* Logo Placeholder - Substitua pela sua logo real */}
                  <div className='w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-lg'>
                    <svg viewBox='0 0 100 100' className='w-14 h-14'>
                      <defs>
                        <linearGradient id='logoGradient' x1='0%' y1='0%' x2='100%' y2='100%'>
                          <stop offset='0%' stopColor='#3B82F6' />
                          <stop offset='100%' stopColor='#8B5CF6' />
                        </linearGradient>
                      </defs>
                      <circle cx='50' cy='50' r='45' fill='url(#logoGradient)' />
                      <text
                        x='50'
                        y='65'
                        textAnchor='middle'
                        fill='white'
                        fontSize='40'
                        fontWeight='bold'
                        fontFamily='system-ui'
                      >
                        W
                      </text>
                    </svg>
                  </div>
                  <div>
                    <h2 className='text-3xl font-bold tracking-tight'>Wolk Now</h2>
                    <p className='text-blue-200 text-sm'>Trading OTC • Desde 2017</p>
                  </div>
                </div>

                {/* Tagline */}
                <div className='bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4'>
                  <p className='text-lg font-medium text-white leading-relaxed'>
                    Mais de <span className='text-yellow-300 font-bold'>9 anos</span> de experiência
                    em operações OTC para o mercado institucional.
                  </p>
                </div>

                {/* Stats */}
                <div className='grid grid-cols-3 gap-4'>
                  <div className='text-center'>
                    <p className='text-3xl font-bold text-white'>9+</p>
                    <p className='text-xs text-blue-200'>Anos no Mercado</p>
                  </div>
                  <div className='text-center'>
                    <p className='text-3xl font-bold text-white'>R$ 2B+</p>
                    <p className='text-xs text-blue-200'>Volume Negociado</p>
                  </div>
                  <div className='text-center'>
                    <p className='text-3xl font-bold text-white'>500+</p>
                    <p className='text-xs text-blue-200'>Clientes Ativos</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Nossa História */}
            <div className='bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-6'>
              <div className='flex items-start gap-4'>
                <div className='w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center flex-shrink-0'>
                  <TrendingUp className='w-6 h-6 text-amber-600 dark:text-amber-400' />
                </div>
                <div>
                  <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-3'>
                    Nossa História
                  </h3>
                  <div className='space-y-3 text-sm text-gray-700 dark:text-gray-300 leading-relaxed'>
                    <p>
                      A <strong className='text-amber-700 dark:text-amber-400'>Wolk Now</strong>{' '}
                      nasceu em <strong>2017</strong> com uma missão clara: oferecer operações OTC
                      (Over-The-Counter) de criptomoedas com a segurança e profissionalismo que o
                      mercado institucional exige.
                    </p>
                    <p>
                      Durante quase <strong>uma década</strong>, construímos uma reputação sólida
                      atendendo <strong>empresas, fundos de investimento e family offices</strong>,
                      movimentando bilhões em operações com total transparência e compliance.
                    </p>
                    <p>
                      Somos uma <strong>wallet descentralizada</strong> que oferece serviços
                      financeiros através de parceiros regulamentados, garantindo segurança e
                      conformidade em todas as operações.
                    </p>
                    <p className='bg-white dark:bg-gray-800 p-3 rounded-lg border-l-4 border-amber-500'>
                      <strong className='text-amber-700 dark:text-amber-400'>Novidade 2026:</strong>{' '}
                      Agora estamos expandindo nosso portfólio para atender também{' '}
                      <strong>pessoas físicas</strong>, trazendo toda nossa expertise institucional
                      para investidores individuais.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
                Nossa Trajetória
              </h3>
              <div className='space-y-4'>
                {[
                  {
                    year: '2017',
                    title: 'Fundação',
                    desc: 'Início das operações OTC para clientes institucionais',
                    color: 'bg-blue-500',
                  },
                  {
                    year: '2020',
                    title: 'Expansão',
                    desc: 'Primeiro bilhão em volume negociado',
                    color: 'bg-green-500',
                  },
                  {
                    year: '2022',
                    title: 'Consolidação',
                    desc: '500+ empresas atendidas com sucesso',
                    color: 'bg-purple-500',
                  },
                  {
                    year: '2024',
                    title: 'Inovação',
                    desc: 'Lançamento da plataforma digital integrada',
                    color: 'bg-orange-500',
                  },
                  {
                    year: '2026',
                    title: 'Nova Era',
                    desc: 'Abertura para pessoas físicas - Você está aqui!',
                    color: 'bg-amber-500',
                  },
                ].map((item, idx) => (
                  <div key={item.year} className='flex items-start gap-4'>
                    <div className='flex flex-col items-center'>
                      <div
                        className={`w-10 h-10 ${item.color} rounded-full flex items-center justify-center text-white text-xs font-bold`}
                      >
                        {item.year.slice(2)}
                      </div>
                      {idx < 4 && <div className='w-0.5 h-8 bg-gray-200 dark:bg-gray-700 mt-2' />}
                    </div>
                    <div className='flex-1 pb-4'>
                      <div className='flex items-center gap-2'>
                        <span className='text-sm font-bold text-gray-900 dark:text-white'>
                          {item.year}
                        </span>
                        <span className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                          • {item.title}
                        </span>
                      </div>
                      <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* App Info Grid */}
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700'>
                <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Versão</p>
                <p className='text-lg font-bold text-gray-900 dark:text-white'>1.0.0</p>
                <p className='text-xs text-gray-400 dark:text-gray-500'>Build 2026.01.06</p>
              </div>
              <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700'>
                <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Status</p>
                <div className='flex items-center gap-2'>
                  <div className='w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse'></div>
                  <p className='text-lg font-bold text-green-600 dark:text-green-400'>Online</p>
                </div>
                <p className='text-xs text-gray-400 dark:text-gray-500'>Operacional</p>
              </div>
              <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700'>
                <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Redes</p>
                <p className='text-lg font-bold text-gray-900 dark:text-white'>15+</p>
                <p className='text-xs text-gray-400 dark:text-gray-500'>Blockchains</p>
              </div>
              <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700'>
                <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Tokens</p>
                <p className='text-lg font-bold text-gray-900 dark:text-white'>50+</p>
                <p className='text-xs text-gray-400 dark:text-gray-500'>Suportados</p>
              </div>
            </div>

            {/* Features Section */}
            <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
                <Check className='w-5 h-5 text-green-500' />
                Principais Recursos
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                {[
                  {
                    id: '2fa',
                    Icon: ShieldCheck,
                    text: 'Autenticação 2FA',
                    color: 'text-blue-500',
                  },
                  {
                    id: 'crypto',
                    Icon: Lock,
                    text: 'Criptografia de ponta a ponta',
                    color: 'text-green-500',
                  },
                  {
                    id: 'biometric',
                    Icon: Smartphone,
                    text: 'Biometria (Face ID / Touch ID)',
                    color: 'text-purple-500',
                  },
                  {
                    id: 'otc',
                    Icon: ArrowLeftRight,
                    text: 'Trading OTC instantâneo',
                    color: 'text-orange-500',
                  },
                  {
                    id: 'pix',
                    Icon: Building2,
                    text: 'PIX e TED integrados',
                    color: 'text-cyan-500',
                  },
                  {
                    id: 'quotes',
                    Icon: BarChart3,
                    text: 'Cotações em tempo real',
                    color: 'text-indigo-500',
                  },
                  {
                    id: 'multichain',
                    Icon: Globe,
                    text: 'Multi-rede (15+ blockchains)',
                    color: 'text-teal-500',
                  },
                  { id: 'p2p', Icon: Briefcase, text: 'P2P Marketplace', color: 'text-amber-500' },
                  {
                    id: 'swap',
                    Icon: RefreshCw,
                    text: 'Swap entre criptos',
                    color: 'text-pink-500',
                  },
                  {
                    id: 'history',
                    Icon: TrendingUp,
                    text: 'Histórico completo',
                    color: 'text-emerald-500',
                  },
                ].map(feature => (
                  <div
                    key={feature.id}
                    className='flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50'
                  >
                    <feature.Icon className={`w-5 h-5 ${feature.color}`} />
                    <span className='text-sm text-gray-700 dark:text-gray-300'>{feature.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Security & Compliance */}
            <div className='bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800 p-6'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
                <Shield className='w-5 h-5 text-green-600' />
                Segurança & Conformidade
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <div className='text-center p-4 bg-white dark:bg-gray-800 rounded-lg'>
                  <div className='w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-2'>
                    <Lock className='w-6 h-6 text-green-600 dark:text-green-400' />
                  </div>
                  <p className='text-sm font-medium text-gray-900 dark:text-white'>AES-256</p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>Criptografia</p>
                </div>
                <div className='text-center p-4 bg-white dark:bg-gray-800 rounded-lg'>
                  <div className='w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-2'>
                    <Database className='w-6 h-6 text-blue-600 dark:text-blue-400' />
                  </div>
                  <p className='text-sm font-medium text-gray-900 dark:text-white'>LGPD</p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>Conformidade</p>
                </div>
                <div className='text-center p-4 bg-white dark:bg-gray-800 rounded-lg'>
                  <div className='w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-2'>
                    <Shield className='w-6 h-6 text-purple-600 dark:text-purple-400' />
                  </div>
                  <p className='text-sm font-medium text-gray-900 dark:text-white'>KYC/AML</p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>Verificação</p>
                </div>
              </div>
            </div>

            {/* Contact & Support */}
            <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
                <Info className='w-5 h-5 text-blue-500' />
                Contato & Suporte
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <a
                  href='mailto:suporte@wolknow.com'
                  className='flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
                >
                  <div className='w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center'>
                    <Mail className='w-5 h-5 text-blue-600 dark:text-blue-400' />
                  </div>
                  <div>
                    <p className='text-sm font-medium text-gray-900 dark:text-white'>E-mail</p>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>suporte@wolknow.com</p>
                  </div>
                </a>
                <a
                  href='https://wa.me/5511999999999'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
                >
                  <div className='w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center'>
                    <MessageCircle className='w-5 h-5 text-green-600 dark:text-green-400' />
                  </div>
                  <div>
                    <p className='text-sm font-medium text-gray-900 dark:text-white'>WhatsApp</p>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>Atendimento 24/7</p>
                  </div>
                </a>
                <a
                  href='https://help.wolknow.com'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
                >
                  <div className='w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center'>
                    <BookOpen className='w-5 h-5 text-purple-600 dark:text-purple-400' />
                  </div>
                  <div>
                    <p className='text-sm font-medium text-gray-900 dark:text-white'>
                      Central de Ajuda
                    </p>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>Tutoriais e FAQs</p>
                  </div>
                </a>
                <a
                  href='https://status.wolknow.com'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors'
                >
                  <div className='w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center'>
                    <Activity className='w-5 h-5 text-amber-600 dark:text-amber-400' />
                  </div>
                  <div>
                    <p className='text-sm font-medium text-gray-900 dark:text-white'>
                      Status da Plataforma
                    </p>
                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                      Monitoramento em tempo real
                    </p>
                  </div>
                </a>
              </div>
            </div>

            {/* Social Media */}
            <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
                Siga-nos nas Redes Sociais
              </h3>
              <div className='flex flex-wrap gap-3'>
                {[
                  {
                    id: 'twitter',
                    name: 'X (Twitter)',
                    Icon: TwitterIcon,
                    url: 'https://twitter.com/wolknow',
                    color: 'bg-black hover:bg-gray-800',
                  },
                  {
                    id: 'telegram',
                    name: 'Telegram',
                    Icon: TelegramIcon,
                    url: 'https://t.me/wolknow',
                    color: 'bg-[#26A5E4] hover:bg-[#1d8bc5]',
                  },
                  {
                    id: 'discord',
                    name: 'Discord',
                    Icon: DiscordIcon,
                    url: 'https://discord.gg/wolknow',
                    color: 'bg-[#5865F2] hover:bg-[#4752c4]',
                  },
                  {
                    id: 'instagram',
                    name: 'Instagram',
                    Icon: InstagramIcon,
                    url: 'https://instagram.com/wolknow',
                    color:
                      'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-90',
                  },
                  {
                    id: 'linkedin',
                    name: 'LinkedIn',
                    Icon: LinkedInIcon,
                    url: 'https://linkedin.com/company/wolknow',
                    color: 'bg-[#0A66C2] hover:bg-[#084c91]',
                  },
                  {
                    id: 'youtube',
                    name: 'YouTube',
                    Icon: YouTubeIcon,
                    url: 'https://youtube.com/@wolknow',
                    color: 'bg-[#FF0000] hover:bg-[#cc0000]',
                  },
                ].map(social => (
                  <a
                    key={social.id}
                    href={social.url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className={`${social.color} text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all`}
                  >
                    <social.Icon className='w-4 h-4' size={16} />
                    <span className='text-sm font-medium'>{social.name}</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Legal Links */}
            <div className='bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
                Documentos Legais
              </h3>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
                {[
                  { id: 'terms', name: 'Termos de Uso', url: '/terms' },
                  { id: 'privacy', name: 'Política de Privacidade', url: '/privacy' },
                  { id: 'cookies', name: 'Política de Cookies', url: '/cookies' },
                  { id: 'aml', name: 'Política AML/KYC', url: '/aml-kyc' },
                ].map(link => (
                  <a
                    key={link.id}
                    href={link.url}
                    className='text-sm text-blue-600 dark:text-blue-400 hover:underline p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors'
                  >
                    {link.name}
                  </a>
                ))}
              </div>
            </div>

            {/* Footer Info */}
            <div className='text-center py-4 border-t border-gray-200 dark:border-gray-700'>
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                © 2017-2026 Wolk Now. Todos os direitos reservados.
              </p>
              <p className='text-xs text-gray-400 dark:text-gray-500 mt-1'>
                Wallet descentralizada • Serviços via parceiros regulamentados
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Seed Phrase Verification Modal */}
      {showSeedPhraseModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
            {/* Header */}
            <div className='sticky top-0 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 p-6 border-b border-amber-200 dark:border-amber-800'>
              <div className='flex items-start justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 bg-amber-600 rounded-lg flex items-center justify-center'>
                    <AlertTriangle className='w-5 h-5 text-white' />
                  </div>
                  <div>
                    <h2 className='text-xl font-bold text-gray-900 dark:text-white'>
                      Frase de Recuperação
                    </h2>
                    <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                      Verifique sua identidade para acessar
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseSeedPhraseModal}
                  className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  title='Fechar modal'
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content */}
            <div className='p-6'>
              {seedPhraseVerified ? (
                /* Verified State - Show Full Seed Phrase */
                <div className='space-y-4'>
                  <div className='bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4'>
                    <p className='text-sm text-green-800 dark:text-green-200'>
                      ✅ Verificação concluída com sucesso! Sua frase de recuperação está segura.
                    </p>
                  </div>

                  <div>
                    <div className='text-sm font-semibold text-gray-900 dark:text-white mb-3'>
                      Sua Frase de Recuperação (12 palavras)
                    </div>
                    <div className='bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-200 dark:border-gray-600 rounded-lg p-4'>
                      <div className='grid grid-cols-3 sm:grid-cols-4 gap-3'>
                        {seedPhraseData.split(' ').map((word, index) => (
                          <div
                            key={`seed-${index}-${word}`}
                            className='bg-white dark:bg-gray-700 p-3 rounded-lg text-center border border-gray-200 dark:border-gray-600'
                          >
                            <span className='text-xs text-gray-500 dark:text-gray-400 block mb-1'>
                              #{index + 1}
                            </span>
                            <span className='font-mono font-semibold text-gray-900 dark:text-white'>
                              {word}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className='mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg'>
                      <p className='text-xs text-amber-800 dark:text-amber-200'>
                        ⚠️ <strong>Aviso Importante:</strong> Guarde esta frase de forma segura.
                        Nunca compartilhe com ninguém. Quem tiver acesso a ela pode acessar todas as
                        suas criptomoedas.
                      </p>
                    </div>

                    {/* Copy Button */}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(seedPhraseData)
                        toast.success('Seed phrase copiada para a área de transferência!', {
                          duration: 2000,
                          position: 'bottom-center',
                        })
                      }}
                      className='w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium'
                      title='Copiar seed phrase'
                    >
                      📋 Copiar Frase
                    </button>
                  </div>
                </div>
              ) : (
                /* Verification Required State - Sem dicas visuais */
                <div className='space-y-6'>
                  {/* Critical Security Instructions */}
                  <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4'>
                    <p className='text-sm text-red-900 dark:text-red-200'>
                      <strong>� Verificação de Identidade:</strong> Você precisa ter sua frase de
                      recuperação escrita em um local seguro. Clique em 3 palavras específicas da
                      sua seed para confirmar que você realmente a possui.
                    </p>
                  </div>

                  {/* Error/Success Message */}
                  {verificationMessage && (
                    <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4'>
                      <p className='text-sm text-red-800 dark:text-red-200'>
                        {verificationMessage}
                      </p>
                    </div>
                  )}

                  {/* Word Selection Grid - NO HINTS */}
                  <div>
                    <div className='text-sm font-semibold text-gray-900 dark:text-white mb-4'>
                      Selecione 3 palavras da sua seed phrase:
                    </div>
                    <div className='grid grid-cols-3 sm:grid-cols-4 gap-2'>
                      {seedPhraseData &&
                        seedPhraseData.split(' ').map((word, index) => {
                          const isSelected = selectedWords.includes(index)

                          return (
                            <button
                              key={`word-${index}-${word}`}
                              onClick={() => handleVerifySeedWords(index)}
                              className={`relative p-3 rounded-lg font-mono text-sm font-semibold transition-all border-2 ${
                                isSelected
                                  ? 'bg-green-600 text-white border-green-600 shadow-lg scale-105'
                                  : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                              }`}
                              disabled={
                                (selectedWords.length === 3 && !isSelected) || isLoadingVerification
                              }
                              type='button'
                              title={`Palavra ${index + 1}`}
                            >
                              <span className='text-xs opacity-70 block mb-0.5'>#{index + 1}</span>
                              {word}
                            </button>
                          )
                        })}
                    </div>
                  </div>

                  {/* Progress Counter */}
                  <div className='text-center'>
                    <span className='text-lg font-bold text-gray-700 dark:text-gray-300'>
                      Palavras selecionadas:{' '}
                      <span className='text-blue-600'>{selectedWords.length}</span>/3
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className='sticky bottom-0 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 p-6'>
              <button
                onClick={handleCloseSeedPhraseModal}
                className='w-full px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors font-medium'
                type='button'
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
