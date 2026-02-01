import { useState, useMemo, useEffect, useRef } from 'react'
import {
  Send,
  Loader2,
  AlertCircle,
  CheckCircle,
  QrCode,
  Copy,
  ChevronDown,
  Turtle,
  Zap,
  Rocket,
  ExternalLink,
  ArrowRight,
  Info,
  BookUser,
  X,
  Star,
  Search,
} from 'lucide-react'
import toast from 'react-hot-toast'
import notificationService from '@/services/notificationService'
import { appNotifications } from '@/services/appNotifications'
import { CryptoIcon } from '@/components/CryptoIcon'
import { useWallets, useMultipleWalletBalances } from '@/hooks/useWallet'
import { useWalletAddresses } from '@/hooks/useWalletAddresses'
import { QRCodeScanner } from '@/components/QRCodeScanner'
import { transactionService } from '@/services/transactionService'
import { webAuthnService } from '@/services/webauthn'
import { sendService } from '@/services/sendService'
import { apiClient } from '@/services/api'

// Timeline step types
type TimelineStep =
  | 'idle'
  | 'validating_address'
  | 'checking_balance'
  | 'estimating_gas'
  | 'awaiting_biometric'
  | 'sending'
  | 'success'
  | 'error'

// Tipo para entrada da agenda
interface AddressBookEntry {
  id: number
  name: string
  address: string
  network: string
  wallet_type: string
  wallet_category: string
  memo?: string
  notes?: string
  is_favorite: boolean
}

export const SendPage = () => {
  // Ref para prevenir double-submit (mais confiável que state)
  const isSubmittingRef = useRef(false)

  // Estados principais
  const [showSuccess, setShowSuccess] = useState(false)
  const [selectedToken, setSelectedToken] = useState<string>('USDT')
  const [selectedNetwork, setSelectedNetwork] = useState<string>('polygon')
  const [toAddress, setToAddress] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [memo, setMemo] = useState<string>('')
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [txHash, setTxHash] = useState<string>('')
  const [showTokenDropdown, setShowTokenDropdown] = useState(false)
  const [showNetworkDropdown, setShowNetworkDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFeeSpeed, setSelectedFeeSpeed] = useState<'slow' | 'standard' | 'fast'>('standard')
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)

  // Estados para Address Book
  const [showAddressBook, setShowAddressBook] = useState(false)
  const [addressBookEntries, setAddressBookEntries] = useState<AddressBookEntry[]>([])
  const [addressBookLoading, setAddressBookLoading] = useState(false)
  const [addressBookSearch, setAddressBookSearch] = useState('')

  // Timeline state (novo fluxo simplificado)
  const [timelineStep, setTimelineStep] = useState<TimelineStep>('idle')
  const [validationData, setValidationData] = useState<{
    balance?: string
    gasEstimate?: string
    totalRequired?: string
  }>({})

  // Estado para detalhes da transação enviada (para tela de sucesso)
  const [sentTransaction, setSentTransaction] = useState<{
    txHash: string
    fromAddress: string
    toAddress: string
    amount: string
    token: string
    network: string
    transactionId: string
    timestamp: Date
    fee?: string
  } | null>(null)

  // Check if biometric is available on mount
  useEffect(() => {
    const checkBiometric = async () => {
      try {
        const supported = webAuthnService.isSupported()
        if (supported) {
          // Check if user has registered biometric credentials
          const status = await webAuthnService.getStatus()
          setBiometricAvailable(status.has_biometric && status.credentials.length > 0)
        }
      } catch (error) {
        console.log('Biometric not available:', error)
        setBiometricAvailable(false)
      }
    }
    checkBiometric()
  }, [])

  // Função para carregar a agenda de endereços
  const loadAddressBook = async (search?: string) => {
    try {
      setAddressBookLoading(true)
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      const response = await apiClient.get(`/address-book/?${params.toString()}`)
      setAddressBookEntries(response.data.addresses || [])
    } catch (error) {
      console.error('Erro ao carregar agenda:', error)
      toast.error('Erro ao carregar agenda de endereços')
    } finally {
      setAddressBookLoading(false)
    }
  }

  // Função para selecionar um endereço da agenda
  const handleSelectFromAddressBook = (entry: AddressBookEntry) => {
    setToAddress(entry.address)
    if (entry.memo) setMemo(entry.memo)

    // Se a entrada tem uma rede definida, tentar usar
    if (entry.network) {
      // Mapear rede da agenda para a rede do seletor
      const networkMap: Record<string, string> = {
        ethereum: 'ethereum',
        polygon: 'polygon',
        bsc: 'bsc',
        bitcoin: 'bitcoin',
        tron: 'tron',
        solana: 'solana',
        base: 'base',
        arbitrum: 'arbitrum',
        optimism: 'optimism',
      }
      const mappedNetwork = networkMap[entry.network.toLowerCase()]
      if (mappedNetwork) {
        setSelectedNetwork(mappedNetwork)
      }
    }

    setShowAddressBook(false)
    setAddressBookSearch('')
    toast.success(`Endereço de "${entry.name}" selecionado`)
  }

  // Dados da API - useWallets retorna { data, isLoading, etc }
  const { data: apiWallets, isLoading: isWalletsLoading } = useWallets()
  const walletIds = useMemo(() => apiWallets?.map((w: any) => String(w.id)) || [], [apiWallets])
  const balancesQueries = useMultipleWalletBalances(walletIds)

  // Buscar endereços específicos por rede (multi-wallet)
  const multiWallet = useMemo(
    () => apiWallets?.find((w: any) => w.network === 'multi'),
    [apiWallets]
  )
  const networksList = [
    'bitcoin',
    'ethereum',
    'polygon',
    'bsc',
    'tron',
    'base',
    'solana',
    'litecoin',
    'dogecoin',
    'cardano',
    'avalanche',
    'polkadot',
    'chainlink',
    'shiba',
    'xrp',
  ]
  const { addresses: networkAddresses } = useWalletAddresses(
    multiWallet?.id?.toString(),
    networksList
  )

  // Preferências de rede
  const [networkPreferences] = useState(() => {
    const saved = localStorage.getItem('wallet_network_preferences')
    const defaultPreferences = {
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
    if (saved) {
      const savedPrefs = JSON.parse(saved)
      return { ...defaultPreferences, ...savedPrefs }
    }
    return defaultPreferences
  })

  // Preferências de tokens
  const [tokenPreferences] = useState(() => {
    const saved = localStorage.getItem('wallet_token_preferences')
    const defaultTokenPrefs = {
      usdt: true,
      usdc: true,
      tray: true,
    }
    if (saved) {
      const savedPrefs = JSON.parse(saved)
      return { ...defaultTokenPrefs, ...savedPrefs }
    }
    return defaultTokenPrefs
  })

  // Carteiras expandidas
  const walletsWithAddresses = useMemo(() => {
    if (!apiWallets || !balancesQueries) return []

    const expandedWallets: any[] = []

    apiWallets.forEach((wallet: any, walletIndex: number) => {
      const balanceQueryResult = balancesQueries[walletIndex]

      if (wallet.network === 'multi') {
        const supportedNetworks = [
          { network: 'bitcoin', symbol: 'BTC' },
          { network: 'ethereum', symbol: 'ETH' },
          { network: 'polygon', symbol: 'MATIC' },
          { network: 'bsc', symbol: 'BNB' },
          { network: 'tron', symbol: 'TRX' },
          { network: 'base', symbol: 'BASE' },
          { network: 'tray', symbol: 'TRAY' },
          { network: 'solana', symbol: 'SOL' },
          { network: 'litecoin', symbol: 'LTC' },
          { network: 'dogecoin', symbol: 'DOGE' },
          { network: 'cardano', symbol: 'ADA' },
          { network: 'avalanche', symbol: 'AVAX' },
          { network: 'polkadot', symbol: 'DOT' },
          { network: 'chainlink', symbol: 'LINK' },
          { network: 'shiba', symbol: 'SHIB' },
          { network: 'xrp', symbol: 'XRP' },
        ]

        supportedNetworks.forEach(({ network, symbol }) => {
          // TRAY é um token na Polygon, buscar de polygon_tray
          let networkBalance
          let address

          if (network === 'tray') {
            networkBalance =
              balanceQueryResult?.data?.['polygon_tray'] ||
              balanceQueryResult?.data?.['polygon_TRAY']
            address = networkAddresses['polygon'] || '' // Usa endereço Polygon
          } else {
            networkBalance = balanceQueryResult?.data?.[network]
            address = networkAddresses[network] || '' // 🔑 Endereço específico por rede
          }

          const balance = networkBalance?.balance ? Number(networkBalance.balance) : 0
          const balanceUSD = networkBalance?.balance_usd ? Number(networkBalance.balance_usd) : 0

          expandedWallets.push({
            walletId: wallet.id,
            symbol,
            network: network === 'tray' ? 'polygon' : network, // TRAY mostra polygon como rede
            address, // 🔑 Agora com endereço específico por rede
            balance,
            balanceUSD,
          })
        })

        // 🪙 TAMBÉM PROCESSAR TOKENS (USDT, USDC, etc)
        if (balanceQueryResult?.data) {
          const balancesData = balanceQueryResult.data as Record<string, any>
          console.log('🔍 [DEBUG] Token processing - balancesData keys:', Object.keys(balancesData))
          console.log('🔍 [DEBUG] balanceQueryResult:', balanceQueryResult)

          // Procurar por chaves de tokens (polygon_usdt, polygon_usdc, etc)
          // NOTA: TRAY já é processado no loop de supportedNetworks, não incluir aqui para evitar duplicação
          for (const [key, value] of Object.entries(balancesData)) {
            console.log(`🔍 [DEBUG] Checking key: "${key}" against token pattern`)
            // Detectar se é uma chave de token (rede_token) - mais flexível
            const keyLower = String(key).toLowerCase()
            const tokenMatch = keyLower.match(/^([a-z0-9]+)_(usdt|usdc)$/)

            if (tokenMatch && tokenMatch.length >= 3) {
              const networkKey = tokenMatch[1]
              const tokenSymbol = tokenMatch[2] as string
              const tokenName = tokenSymbol.toUpperCase()

              // 🔍 FILTRAR POR PREFERÊNCIAS DE TOKEN
              if (tokenName === 'USDT' && !tokenPreferences.usdt) {
                continue // Skip USDT se desativado
              }
              if (tokenName === 'USDC' && !tokenPreferences.usdc) {
                continue // Skip USDC se desativado
              }
              // NOTA: TRAY é processado no loop de supportedNetworks, não aqui

              const balance = value?.balance ? Number(value.balance) : 0
              const balanceUSD = value?.balance_usd ? Number(value.balance_usd) : 0
              const address = networkAddresses[networkKey as keyof typeof networkAddresses] || ''

              console.log(
                `✅ [DEBUG] Token found: ${tokenName} on ${networkKey}, balance: ${balance}, address: ${address}`
              )

              // Adicionar SEMPRE se tiver valor (mesmo que 0, para debug)
              expandedWallets.push({
                walletId: wallet.id,
                symbol: tokenName,
                network: networkKey, // Network base (polygon, ethereum, etc)
                address,
                balance,
                balanceUSD,
              })
            }
          }
        }
      } else {
        const balancesData = (balanceQueryResult?.data as any) || {}
        const allNetworks = Object.keys(balancesData)
        const firstNetworkBalance =
          allNetworks.length > 0 ? balancesData[allNetworks[0] as any] : null
        const balance = firstNetworkBalance?.balance ? Number(firstNetworkBalance.balance) : 0
        const balanceUSD = firstNetworkBalance?.balance_usd
          ? Number(firstNetworkBalance.balance_usd)
          : 0

        expandedWallets.push({
          walletId: wallet.id,
          symbol: wallet.symbol || wallet.network.toUpperCase(),
          network: wallet.network,
          balance,
          balanceUSD,
        })
      }
    })

    console.log('📦 [DEBUG] expandedWallets FINAL:', expandedWallets)
    return expandedWallets.sort((a: any, b: any) => Number(b.balance) - Number(a.balance))
  }, [apiWallets, balancesQueries, networkAddresses, tokenPreferences])

  // Tokens dinâmicos
  const tokenList = useMemo(() => {
    const uniqueTokens = new Map<string, any>()

    walletsWithAddresses.forEach(wallet => {
      if (networkPreferences[wallet.network as keyof typeof networkPreferences]) {
        const tokenNames: Record<string, { name: string; isStablecoin: boolean }> = {
          USDT: { name: 'Tether', isStablecoin: true },
          USDC: { name: 'USD Coin', isStablecoin: true },
          TRAY: { name: 'Trayon', isStablecoin: false },
          BTC: { name: 'Bitcoin', isStablecoin: false },
          ETH: { name: 'Ethereum', isStablecoin: false },
          BNB: { name: 'Binance', isStablecoin: false },
          MATIC: { name: 'Polygon', isStablecoin: false },
          TRX: { name: 'Tron', isStablecoin: false },
          ADA: { name: 'Cardano', isStablecoin: false },
          SOL: { name: 'Solana', isStablecoin: false },
          LINK: { name: 'Chainlink', isStablecoin: false },
          LTC: { name: 'Litecoin', isStablecoin: false },
          DOGE: { name: 'Dogecoin', isStablecoin: false },
          BASE: { name: 'Base', isStablecoin: false },
          AVAX: { name: 'Avalanche', isStablecoin: false },
          DOT: { name: 'Polkadot', isStablecoin: false },
          SHIB: { name: 'Shiba Inu', isStablecoin: false },
          XRP: { name: 'XRP', isStablecoin: false },
        }

        const info = tokenNames[wallet.symbol] || { name: wallet.symbol, isStablecoin: false }

        // Aplicar filtro de preferências de tokens stablecoin
        if (wallet.symbol === 'USDT' && !tokenPreferences.usdt) {
          return // Skip USDT se desativado
        }
        if (wallet.symbol === 'USDC' && !tokenPreferences.usdc) {
          return // Skip USDC se desativado
        }
        if (wallet.symbol === 'TRAY' && !tokenPreferences.tray) {
          return // Skip TRAY se desativado
        }

        if (uniqueTokens.has(wallet.symbol)) {
          const existing = uniqueTokens.get(wallet.symbol)!
          existing.balance += wallet.balance
          existing.balanceUSD += wallet.balanceUSD
          existing.networks = [...(existing.networks || []), wallet.network]
        } else {
          uniqueTokens.set(wallet.symbol, {
            symbol: wallet.symbol,
            network: wallet.network,
            networks: [wallet.network],
            balance: wallet.balance,
            balanceUSD: wallet.balanceUSD,
            ...info,
          })
        }
      }
    })

    console.log('💎 [DEBUG] tokenList FINAL:', Array.from(uniqueTokens.values()))
    return Array.from(uniqueTokens.values()).sort((a: any, b: any) => (a.isStablecoin ? -1 : 1))
  }, [walletsWithAddresses, networkPreferences, tokenPreferences])

  // Redes dinâmicas
  const networkList = useMemo(() => {
    const uniqueNetworks = new Map<string, any>()

    walletsWithAddresses.forEach(wallet => {
      if (networkPreferences[wallet.network as keyof typeof networkPreferences]) {
        if (!uniqueNetworks.has(wallet.network)) {
          const networkInfo: Record<string, { name: string; symbol: string }> = {
            polygon: { name: 'Polygon', symbol: 'MATIC' },
            tron: { name: 'Tron (TRC-20)', symbol: 'TRX' },
            base: { name: 'Base (L2)', symbol: 'BASE' },
            bsc: { name: 'BSC (BEP-20)', symbol: 'BNB' },
            ethereum: { name: 'Ethereum (ERC-20)', symbol: 'ETH' },
            bitcoin: { name: 'Bitcoin', symbol: 'BTC' },
            cardano: { name: 'Cardano', symbol: 'ADA' },
            solana: { name: 'Solana', symbol: 'SOL' },
            litecoin: { name: 'Litecoin', symbol: 'LTC' },
            dogecoin: { name: 'Dogecoin', symbol: 'DOGE' },
            avalanche: { name: 'Avalanche', symbol: 'AVAX' },
            polkadot: { name: 'Polkadot', symbol: 'DOT' },
            chainlink: { name: 'Chainlink', symbol: 'LINK' },
            shiba: { name: 'Shiba Inu', symbol: 'SHIB' },
            xrp: { name: 'XRP', symbol: 'XRP' },
          }

          const info = networkInfo[wallet.network] || {
            name: wallet.network,
            symbol: wallet.symbol,
          }
          uniqueNetworks.set(wallet.network, {
            network: wallet.network,
            ...info,
          })
        }
      }
    })

    return Array.from(uniqueNetworks.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [walletsWithAddresses, networkPreferences])

  const getSelectedTokenData = () => tokenList.find(t => t.symbol === selectedToken)
  const getSelectedNetworkData = () => networkList.find(n => n.network === selectedNetwork)

  const handleTokenSelect = (token: any) => {
    setSelectedToken(token.symbol)
    const firstNetwork = token.networks?.[0] || token.network
    setSelectedNetwork(firstNetwork)
    setShowTokenDropdown(false)
  }

  const handleNetworkSelect = (network: string) => {
    setSelectedNetwork(network)
    setShowNetworkDropdown(false)
  }

  const handleQRScan = (address: string) => {
    setToAddress(address)
    setShowQRScanner(false)
    toast.success('Endereço capturado!')
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success('Copiado!'))
      .catch(() => toast.error('Erro ao copiar'))
  }

  // Gerar ID numérico único para suporte interno (baseado no hash)
  const generateTransactionId = (hash: string): string => {
    // Pegar os primeiros 8 caracteres hexadecimais do hash e converter para número
    const hexPart = hash.replace('0x', '').substring(0, 8)
    const numId = Number.parseInt(hexPart, 16) % 100000000 // Número de até 8 dígitos
    return numId.toString().padStart(8, '0')
  }

  // Nome amigável da rede
  const getNetworkDisplayName = (network: string): string => {
    const names: Record<string, string> = {
      polygon: 'Polygon',
      ethereum: 'Ethereum',
      bsc: 'BNB Smart Chain',
      base: 'Base',
      arbitrum: 'Arbitrum',
      optimism: 'Optimism',
      avalanche: 'Avalanche',
      tron: 'TRON',
      bitcoin: 'Bitcoin',
      solana: 'Solana',
    }
    return names[network.toLowerCase()] || network.charAt(0).toUpperCase() + network.slice(1)
  }

  // URL do explorer para a transação
  const getExplorerUrl = (network: string, hash: string): string => {
    const explorers: Record<string, string> = {
      polygon: `https://polygonscan.com/tx/${hash}`,
      ethereum: `https://etherscan.io/tx/${hash}`,
      bsc: `https://bscscan.com/tx/${hash}`,
      base: `https://basescan.org/tx/${hash}`,
      arbitrum: `https://arbiscan.io/tx/${hash}`,
      optimism: `https://optimistic.etherscan.io/tx/${hash}`,
      avalanche: `https://snowtrace.io/tx/${hash}`,
    }
    return explorers[network.toLowerCase()] || ''
  }

  // Truncar endereço para exibição
  const truncateAddress = (address: string, chars: number = 6): string => {
    if (!address) return ''
    return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`
  }

  const validateForm = (): boolean => {
    if (!toAddress.trim()) {
      setError('Endereço obrigatório')
      return false
    }

    if (!isValidAddress(toAddress, selectedNetwork)) {
      setError(getAddressErrorMessage(selectedNetwork))
      return false
    }

    if (!amount.trim()) {
      setError('Valor obrigatório')
      return false
    }

    const amountNum = Number.parseFloat(amount)
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      setError('Valor inválido')
      return false
    }

    const tokenData = getSelectedTokenData()
    if (tokenData && amountNum > tokenData.balance) {
      setError('Saldo insuficiente')
      return false
    }

    setError(null)
    return true
  }

  // Validação de endereço específica para cada blockchain
  const isValidAddress = (address: string, network: string): boolean => {
    const trimmedAddress = address.trim()
    if (!trimmedAddress) return false

    const networkLower = network.toLowerCase()

    // Bitcoin - múltiplos formatos
    if (networkLower === 'bitcoin') {
      // Legacy (P2PKH) - começa com 1
      const p2pkh = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/
      // Script Hash (P2SH) - começa com 3
      const p2sh = /^3[a-km-zA-HJ-NP-Z1-9]{25,34}$/
      // SegWit v0 (Bech32) - começa com bc1q
      const bech32 = /^bc1[a-z0-9]{39,59}$/
      // Taproot (Bech32m) - começa com bc1p
      const taproot = /^bc1p[a-z0-9]{58}$/

      return (
        p2pkh.test(trimmedAddress) ||
        p2sh.test(trimmedAddress) ||
        bech32.test(trimmedAddress) ||
        taproot.test(trimmedAddress)
      )
    }

    // TRON - começa com T
    if (networkLower === 'tron') {
      return /^T[a-zA-Z0-9]{33}$/.test(trimmedAddress)
    }

    // Solana - base58, 32-44 caracteres
    if (networkLower === 'solana') {
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmedAddress)
    }

    // XRP/Ripple - começa com r
    if (networkLower === 'xrp' || networkLower === 'ripple') {
      return /^r[0-9a-zA-Z]{24,34}$/.test(trimmedAddress)
    }

    // Litecoin - similar ao Bitcoin mas com prefixos diferentes
    if (networkLower === 'litecoin') {
      // Legacy - começa com L ou M
      const legacy = /^[LM][a-km-zA-HJ-NP-Z1-9]{26,33}$/
      // SegWit - começa com ltc1
      const segwit = /^ltc1[a-z0-9]{39,59}$/
      return legacy.test(trimmedAddress) || segwit.test(trimmedAddress)
    }

    // Dogecoin - começa com D
    if (networkLower === 'dogecoin') {
      return /^D[5-9A-HJ-NP-U][a-km-zA-HJ-NP-Z1-9]{32}$/.test(trimmedAddress)
    }

    // Cardano - começa com addr1
    if (networkLower === 'cardano') {
      return /^addr1[a-z0-9]{98,}$/.test(trimmedAddress)
    }

    // Polkadot - começa com 1
    if (networkLower === 'polkadot') {
      return /^1[a-zA-Z0-9]{47}$/.test(trimmedAddress)
    }

    // EVM chains (Ethereum, Polygon, BSC, Base, Avalanche, Arbitrum, Optimism, etc)
    // Começa com 0x e tem 42 caracteres
    return /^0x[a-fA-F0-9]{40}$/.test(trimmedAddress)
  }

  // Mensagem de erro específica para cada rede
  const getAddressErrorMessage = (network: string): string => {
    const networkLower = network.toLowerCase()

    if (networkLower === 'bitcoin') {
      return 'Endereço inválido. Use um endereço Bitcoin válido (1..., 3..., bc1q..., ou bc1p...)'
    }
    if (networkLower === 'tron') {
      return 'Endereço inválido. Use um endereço TRON válido (T...)'
    }
    if (networkLower === 'solana') {
      return 'Endereço inválido. Use um endereço Solana válido'
    }
    if (networkLower === 'xrp' || networkLower === 'ripple') {
      return 'Endereço inválido. Use um endereço XRP válido (r...)'
    }
    if (networkLower === 'litecoin') {
      return 'Endereço inválido. Use um endereço Litecoin válido (L..., M..., ou ltc1...)'
    }
    if (networkLower === 'dogecoin') {
      return 'Endereço inválido. Use um endereço Dogecoin válido (D...)'
    }
    if (networkLower === 'cardano') {
      return 'Endereço inválido. Use um endereço Cardano válido (addr1...)'
    }
    if (networkLower === 'polkadot') {
      return 'Endereço inválido. Use um endereço Polkadot válido'
    }

    return 'Endereço inválido. Use um endereço Ethereum/EVM válido (0x...)'
  }

  // Placeholder dinâmico para o campo de endereço
  const getAddressPlaceholder = (network: string): string => {
    const networkLower = network.toLowerCase()

    if (networkLower === 'bitcoin') {
      return 'Cole o endereço (1..., 3..., bc1...)'
    }
    if (networkLower === 'tron') {
      return 'Cole o endereço (T...)'
    }
    if (networkLower === 'solana') {
      return 'Cole o endereço Solana'
    }
    if (networkLower === 'xrp' || networkLower === 'ripple') {
      return 'Cole o endereço (r...)'
    }
    if (networkLower === 'litecoin') {
      return 'Cole o endereço (L..., M..., ltc1...)'
    }
    if (networkLower === 'dogecoin') {
      return 'Cole o endereço (D...)'
    }
    if (networkLower === 'cardano') {
      return 'Cole o endereço (addr1...)'
    }

    return 'Cole o endereço (0x...)'
  }

  const getAddressInputStyle = (): string => {
    if (toAddress.trim() === '') {
      return 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
    }
    if (isValidAddress(toAddress, selectedNetwork)) {
      return 'border-green-500 dark:border-green-400 focus:ring-green-500'
    }
    return 'border-red-500 dark:border-red-400 focus:ring-red-500'
  }

  const handleSend = async () => {
    if (!validateForm()) return

    // Prevenir double-submit
    if (isSubmittingRef.current || loading) return
    isSubmittingRef.current = true

    try {
      setLoading(true)
      setError(null)
      setTimelineStep('validating_address')

      // Buscar carteira
      const selectedWalletData = walletsWithAddresses.find(
        w => w.symbol === selectedToken && w.network === selectedNetwork
      )

      if (!selectedWalletData) {
        setError('Nenhuma carteira encontrada para este token')
        setTimelineStep('error')
        setLoading(false)
        isSubmittingRef.current = false
        return
      }

      if (!selectedWalletData.address) {
        setError('Endereço da carteira não disponível para esta rede')
        setTimelineStep('error')
        setLoading(false)
        isSubmittingRef.current = false
        return
      }

      const fullWallet = apiWallets?.find(w => String(w.id) === String(selectedWalletData.walletId))
      if (!fullWallet) {
        setError('Carteira não encontrada')
        setTimelineStep('error')
        setLoading(false)
        isSubmittingRef.current = false
        return
      }

      // STEP 1: Validar endereço e saldo na blockchain
      setTimelineStep('checking_balance')
      // Tokens ERC20 suportados (USDT, USDC, TRAY, etc)
      const erc20Tokens = ['USDT', 'USDC', 'TRAY', 'DAI', 'SHIB', 'LINK', 'UNI', 'PEPE', 'WBTC']
      const isToken = erc20Tokens.includes(selectedToken.toUpperCase())

      const validation = await sendService.validateSend({
        wallet_id: String(fullWallet.id),
        to_address: toAddress,
        amount: amount,
        network: selectedNetwork,
        token_symbol: isToken ? selectedToken : undefined,
      })

      if (!validation.valid) {
        let errorMsg = validation.message || 'Transação não pode ser realizada'
        if (validation.error === 'INSUFFICIENT_BALANCE') {
          errorMsg = `Saldo insuficiente. Disponível: ${validation.balance || '0'}`
        } else if (validation.error === 'INSUFFICIENT_TOKEN_BALANCE') {
          errorMsg = `Saldo de ${selectedToken} insuficiente. Disponível: ${validation.balance || '0'}`
        } else if (validation.error === 'INSUFFICIENT_GAS') {
          errorMsg = 'Saldo insuficiente para pagar a taxa de rede (gas)'
        } else if (validation.error === 'INVALID_TO_ADDRESS') {
          errorMsg = 'Endereço de destino inválido'
        }
        setError(errorMsg)
        setTimelineStep('error')
        setLoading(false)
        isSubmittingRef.current = false
        return
      }

      setValidationData({
        ...(validation.balance ? { balance: validation.balance } : {}),
        ...(validation.gas_estimate ? { gasEstimate: validation.gas_estimate } : {}),
        ...(validation.total_required ? { totalRequired: validation.total_required } : {}),
      })

      // STEP 2: Estimar gas
      setTimelineStep('estimating_gas')
      const feeEstimate = await transactionService.estimateFee({
        wallet_id: String(fullWallet.id),
        to_address: toAddress,
        amount: amount,
        network: selectedNetwork,
      })

      let biometricToken: string | undefined

      // STEP 3: Verificar se biometria está disponível e ativada
      if (biometricAvailable) {
        setTimelineStep('awaiting_biometric')

        try {
          setBiometricLoading(true)
          const bioResult = await webAuthnService.authenticate()
          biometricToken = bioResult || undefined
        } catch (error_) {
          console.log('Biometria falhou, enviando sem autenticação extra:', error_)
          // Continua para enviar sem biometria
        } finally {
          setBiometricLoading(false)
        }
      }

      // STEP 4: Enviar transação
      setTimelineStep('sending')
      const memoValue = memo || undefined
      const result = await transactionService.sendTransaction(
        {
          wallet_id: String(fullWallet.id),
          to_address: toAddress,
          amount: amount,
          network: selectedNetwork,
          fee_preference: selectedFeeSpeed === 'slow' ? 'standard' : selectedFeeSpeed,
          token_symbol: selectedToken,
          ...(memoValue ? { memo: memoValue } : {}),
        },
        undefined,
        biometricToken // Pode ser undefined se biometria não disponível/falhou
      )

      // Sucesso!
      const tokenData = getSelectedTokenData()
      const feeValue = feeEstimate?.fee_estimates?.standard_fee
      setSentTransaction({
        txHash: result.txHash,
        fromAddress: selectedWalletData.address || tokenData?.address || '',
        toAddress: toAddress,
        amount: amount,
        token: selectedToken,
        network: selectedNetwork,
        transactionId: generateTransactionId(result.txHash),
        timestamp: new Date(),
        ...(feeValue ? { fee: feeValue } : {}),
      })

      setTxHash(result.txHash)
      setTimelineStep('success')
      setShowSuccess(true)
      notificationService.showSuccess('Transação enviada com sucesso!')

      appNotifications.transactionSent(
        result.txHash,
        Number.parseFloat(amount),
        selectedToken,
        toAddress
      )
    } catch (err: any) {
      console.error('Erro ao enviar:', err)
      setError(err.message || 'Erro ao enviar transação')
      setTimelineStep('error')
      notificationService.showError(err, 'Erro ao enviar transação')
    } finally {
      setLoading(false)
      setBiometricLoading(false)
      isSubmittingRef.current = false
    }
  }

  // Cancelar envio e resetar timeline
  const handleCancelSend = () => {
    setTimelineStep('idle')
    setError(null)
    setLoading(false)
    setBiometricLoading(false)
    isSubmittingRef.current = false
  }

  const resetForm = () => {
    setToAddress('')
    setAmount('')
    setMemo('')
    setError(null)
    setTxHash('')
    setShowSuccess(false)
    setSentTransaction(null)
    setTimelineStep('idle')
    setValidationData({})
  }

  if (walletsWithAddresses.length === 0) {
    return (
      <div className='text-center py-12'>
        <Send className='w-12 h-12 text-gray-400 mx-auto mb-3' />
        <p className='text-gray-500 dark:text-gray-400'>Nenhuma carteira disponível</p>
      </div>
    )
  }

  if (showSuccess) {
    return (
      <div className='space-y-3'>
        {/* Success Header - Compacto */}
        <div className='text-center py-4'>
          <div className='flex justify-center mb-3'>
            <div className='w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30'>
              <CheckCircle className='w-8 h-8 text-white' />
            </div>
          </div>
          <h3 className='text-xl font-bold text-gray-900 dark:text-white mb-1'>
            Enviado com Sucesso!
          </h3>
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            Transação enviada para a blockchain
          </p>
        </div>

        {/* Transaction ID + Details em Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-3'>
          {/* Transaction ID */}
          {sentTransaction && (
            <div className='bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-xs text-blue-600 dark:text-blue-400 font-medium'>
                    ID (Suporte)
                  </p>
                  <p className='text-xl font-bold text-blue-700 dark:text-blue-300 font-mono'>
                    #{sentTransaction.transactionId}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(sentTransaction.transactionId)}
                  className='p-2 bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 rounded-lg'
                  title='Copiar'
                >
                  <Copy className='w-4 h-4 text-blue-600 dark:text-blue-400' />
                </button>
              </div>
            </div>
          )}

          {/* Amount Card */}
          <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3'>
            <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Valor Enviado</p>
            <div className='flex items-center gap-2'>
              <CryptoIcon symbol={sentTransaction?.token || selectedToken} size={20} />
              <span className='text-lg font-bold text-gray-900 dark:text-white'>
                {sentTransaction?.amount || amount} {sentTransaction?.token || selectedToken}
              </span>
            </div>
          </div>

          {/* Network Card */}
          <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3'>
            <p className='text-xs text-gray-500 dark:text-gray-400 mb-1'>Rede</p>
            <span className='px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-semibold'>
              {getNetworkDisplayName(sentTransaction?.network || selectedNetwork)}
            </span>
          </div>
        </div>

        {/* Addresses Row */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
          {/* From */}
          <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3'>
            <div className='flex items-center justify-between mb-1'>
              <span className='text-xs text-gray-500 dark:text-gray-400'>De (Sua Carteira)</span>
              <button
                onClick={() => copyToClipboard(sentTransaction?.fromAddress || '')}
                className='p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded'
                title='Copiar'
              >
                <Copy className='w-3 h-3 text-gray-400' />
              </button>
            </div>
            <p className='font-mono text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-2 rounded truncate'>
              {sentTransaction?.fromAddress || 'N/A'}
            </p>
          </div>
          {/* To */}
          <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3'>
            <div className='flex items-center justify-between mb-1'>
              <span className='text-xs text-gray-500 dark:text-gray-400'>Para (Destino)</span>
              <button
                onClick={() => copyToClipboard(sentTransaction?.toAddress || toAddress)}
                className='p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded'
                title='Copiar'
              >
                <Copy className='w-3 h-3 text-gray-400' />
              </button>
            </div>
            <p className='font-mono text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-2 rounded truncate'>
              {sentTransaction?.toAddress || toAddress}
            </p>
          </div>
        </div>

        {/* Hash + Meta Row */}
        <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-3'>
          <div className='flex items-center justify-between mb-1'>
            <span className='text-xs text-gray-500 dark:text-gray-400'>Hash da Transação</span>
            <div className='flex items-center gap-3 text-xs text-gray-500'>
              {sentTransaction?.fee && <span>Taxa: ~${sentTransaction.fee}</span>}
              <span>
                {sentTransaction?.timestamp.toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <button
                onClick={() => copyToClipboard(txHash)}
                className='p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded'
                title='Copiar'
              >
                <Copy className='w-3 h-3 text-gray-400' />
              </button>
            </div>
          </div>
          <p className='font-mono text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-2 rounded break-all'>
            {txHash}
          </p>
        </div>

        {/* Action Buttons Row */}
        <div className='flex gap-3'>
          {txHash && getExplorerUrl(sentTransaction?.network || selectedNetwork, txHash) && (
            <a
              href={getExplorerUrl(sentTransaction?.network || selectedNetwork, txHash)}
              target='_blank'
              rel='noopener noreferrer'
              className='flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg text-sm'
            >
              <ExternalLink className='w-4 h-4' />
              Ver no Explorer
            </a>
          )}
          <button
            onClick={resetForm}
            className='flex-1 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-lg text-sm flex items-center justify-center gap-2'
          >
            <Send className='w-4 h-4' />
            Nova Transação
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-3'>
      {/* Header Compacto */}
      <div className='flex items-center gap-3'>
        <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-md'>
          <Send className='w-5 h-5 text-white' />
        </div>
        <div>
          <h2 className='text-lg font-bold text-gray-900 dark:text-white'>Enviar</h2>
          <p className='text-xs text-gray-500 dark:text-gray-400'>Transfira crypto com segurança</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2.5 flex gap-2'>
          <AlertCircle className='w-4 h-4 text-red-500 flex-shrink-0 mt-0.5' />
          <p className='text-red-800 dark:text-red-200 text-xs'>{error}</p>
        </div>
      )}

      {/* Main Form Card - Compacto */}
      <div className='bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700'>
        <div className='p-4 space-y-3'>
          {/* Token + Network em Row no Desktop */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
            {/* Token Selection */}
            <div>
              <label className='block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1'>
                Moeda
              </label>
              <div className='relative'>
                <button
                  onClick={() => setShowTokenDropdown(!showTokenDropdown)}
                  className='w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-between hover:border-blue-400 transition-all'
                >
                  <div className='flex items-center gap-2'>
                    <CryptoIcon symbol={selectedToken} size={24} />
                    <div className='text-left'>
                      <p className='font-semibold text-sm text-gray-900 dark:text-white'>
                        {selectedToken}
                      </p>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>
                        Saldo: {getSelectedTokenData()?.balance.toFixed(4)}
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${showTokenDropdown ? 'rotate-180' : ''}`}
                  />
                </button>

                {showTokenDropdown && (
                  <div className='absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto'>
                    {tokenList.map(token => (
                      <button
                        key={token.symbol}
                        onClick={() => handleTokenSelect(token)}
                        className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${selectedToken === token.symbol ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}
                      >
                        <CryptoIcon symbol={token.symbol} size={20} />
                        <div className='flex-1 text-left'>
                          <p className='font-medium text-sm text-gray-900 dark:text-white'>
                            {token.symbol}
                          </p>
                        </div>
                        <p className='text-xs font-medium text-gray-600 dark:text-gray-400'>
                          {token.balance.toFixed(4)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Network Selection */}
            <div>
              <label className='block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1'>
                Rede
              </label>
              <div className='relative'>
                <button
                  onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
                  className='w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg flex items-center justify-between hover:border-blue-400 transition-all'
                >
                  <div className='flex items-center gap-2'>
                    <CryptoIcon symbol={getSelectedNetworkData()?.symbol || 'CRYPTO'} size={20} />
                    <p className='font-semibold text-sm text-gray-900 dark:text-white'>
                      {getSelectedNetworkData()?.name}
                    </p>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform ${showNetworkDropdown ? 'rotate-180' : ''}`}
                  />
                </button>

                {showNetworkDropdown && (
                  <div className='absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto'>
                    {networkList.map(network => (
                      <button
                        key={network.network}
                        onClick={() => handleNetworkSelect(network.network)}
                        className={`w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${selectedNetwork === network.network ? 'bg-green-50 dark:bg-green-900/30' : ''}`}
                      >
                        <CryptoIcon symbol={network.symbol} size={20} />
                        <p className='font-medium text-sm text-gray-900 dark:text-white flex-1 text-left'>
                          {network.name}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Address Input */}
          <div>
            <label className='block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1'>
              Endereço de Destino
            </label>
            <div className='flex gap-2'>
              <div className='flex-1 relative'>
                <input
                  type='text'
                  placeholder={getAddressPlaceholder(selectedNetwork)}
                  value={toAddress}
                  onChange={e => setToAddress(e.target.value)}
                  className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border rounded-lg focus:ring-2 focus:border-transparent outline-none text-gray-900 dark:text-white text-sm pr-10 ${getAddressInputStyle()}`}
                />
                {toAddress.trim() !== '' && (
                  <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                    {isValidAddress(toAddress, selectedNetwork) ? (
                      <CheckCircle className='w-4 h-4 text-green-500' />
                    ) : (
                      <AlertCircle className='w-4 h-4 text-red-500' />
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  loadAddressBook()
                  setShowAddressBook(true)
                }}
                className='px-3 py-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-800/50 rounded-lg'
                title='Agenda de Endereços'
              >
                <BookUser className='w-4 h-4 text-blue-600 dark:text-blue-400' />
              </button>
              <button
                onClick={() => setShowQRScanner(true)}
                className='px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg'
                title='Escanear QR'
              >
                <QrCode className='w-4 h-4 text-gray-600 dark:text-gray-400' />
              </button>
            </div>
            {toAddress.trim() !== '' && !isValidAddress(toAddress, selectedNetwork) && (
              <p className='text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1'>
                <AlertCircle className='w-3 h-3' />
                {getAddressErrorMessage(selectedNetwork)}
              </p>
            )}
          </div>

          {/* Amount + Fee Speed em Row */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-3'>
            {/* Amount Input */}
            <div>
              <div className='flex items-center justify-between mb-1'>
                <label className='block text-xs font-semibold text-gray-700 dark:text-gray-300'>
                  Valor
                </label>
                <button
                  onClick={() => {
                    const balance = getSelectedTokenData()?.balance || 0
                    setAmount(balance.toString())
                  }}
                  className='text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 text-blue-700 dark:text-blue-300 rounded font-semibold'
                >
                  MAX
                </button>
              </div>
              <input
                type='number'
                placeholder='0.00'
                value={amount}
                onChange={e => setAmount(e.target.value)}
                step='0.01'
                min='0'
                className='w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white text-sm font-semibold'
              />
              {amount && (
                <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                  ≈ $
                  {(
                    (Number(amount) * (getSelectedTokenData()?.balanceUSD || 0)) /
                    (getSelectedTokenData()?.balance || 1)
                  ).toFixed(2)}{' '}
                  USD
                </p>
              )}
            </div>

            {/* Fee Speed Selection - Compacto */}
            <div>
              <label className='block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1'>
                Velocidade
              </label>
              <div className='grid grid-cols-3 gap-1.5'>
                {(
                  [
                    { id: 'slow', icon: Turtle, label: 'Lento', color: 'yellow' },
                    { id: 'standard', icon: Zap, label: 'Padrão', color: 'blue' },
                    { id: 'fast', icon: Rocket, label: 'Rápido', color: 'orange' },
                  ] as const
                ).map(speed => (
                  <button
                    key={speed.id}
                    onClick={() => setSelectedFeeSpeed(speed.id)}
                    className={`p-2 rounded-lg border transition-all text-center ${
                      selectedFeeSpeed === speed.id
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <speed.icon
                      className={`w-4 h-4 mx-auto ${
                        speed.color === 'yellow'
                          ? 'text-yellow-600'
                          : speed.color === 'blue'
                            ? 'text-blue-600'
                            : 'text-orange-600'
                      }`}
                    />
                    <p className='text-xs text-gray-700 dark:text-gray-300 mt-0.5'>{speed.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Memo - Opcional */}
          <div>
            <label className='block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1'>
              Memo (Opcional)
            </label>
            <input
              type='text'
              placeholder='Nota...'
              value={memo}
              onChange={e => setMemo(e.target.value)}
              className='w-full px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white text-sm'
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className='p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700'>
          <button
            onClick={handleSend}
            disabled={loading || !toAddress || !amount}
            className='w-full py-2.5 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all shadow-md flex items-center justify-center gap-2 text-sm'
          >
            {loading ? (
              <>
                <Loader2 className='w-4 h-4 animate-spin' />
                Processando...
              </>
            ) : (
              <>
                <Send className='w-4 h-4' />
                Enviar {selectedToken}
                <ArrowRight className='w-4 h-4' />
              </>
            )}
          </button>

          {/* Timeline de Progresso - Aparece durante o envio */}
          {timelineStep !== 'idle' && timelineStep !== 'success' && (
            <div className='mt-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700'>
              <div className='space-y-3'>
                {/* Step: Validando endereço */}
                <div className='flex items-center gap-3'>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      timelineStep === 'validating_address'
                        ? 'bg-blue-100 dark:bg-blue-900/50'
                        : [
                              'checking_balance',
                              'estimating_gas',
                              'awaiting_biometric',
                              'sending',
                            ].includes(timelineStep)
                          ? 'bg-green-100 dark:bg-green-900/50'
                          : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    {timelineStep === 'validating_address' ? (
                      <Loader2 className='w-4 h-4 text-blue-600 animate-spin' />
                    ) : [
                        'checking_balance',
                        'estimating_gas',
                        'awaiting_biometric',
                        'sending',
                      ].includes(timelineStep) ? (
                      <CheckCircle className='w-4 h-4 text-green-600' />
                    ) : (
                      <div className='w-2 h-2 bg-gray-400 rounded-full' />
                    )}
                  </div>
                  <span
                    className={`text-sm ${
                      [
                        'checking_balance',
                        'estimating_gas',
                        'awaiting_biometric',
                        'sending',
                      ].includes(timelineStep)
                        ? 'text-green-700 dark:text-green-300'
                        : timelineStep === 'validating_address'
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-gray-400'
                    }`}
                  >
                    Validando endereço
                  </span>
                </div>

                {/* Step: Verificando saldo */}
                <div className='flex items-center gap-3'>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      timelineStep === 'checking_balance'
                        ? 'bg-blue-100 dark:bg-blue-900/50'
                        : ['estimating_gas', 'awaiting_biometric', 'sending'].includes(timelineStep)
                          ? 'bg-green-100 dark:bg-green-900/50'
                          : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    {timelineStep === 'checking_balance' ? (
                      <Loader2 className='w-4 h-4 text-blue-600 animate-spin' />
                    ) : ['estimating_gas', 'awaiting_biometric', 'sending'].includes(
                        timelineStep
                      ) ? (
                      <CheckCircle className='w-4 h-4 text-green-600' />
                    ) : (
                      <div className='w-2 h-2 bg-gray-400 rounded-full' />
                    )}
                  </div>
                  <div className='flex-1'>
                    <span
                      className={`text-sm ${
                        ['estimating_gas', 'awaiting_biometric', 'sending'].includes(timelineStep)
                          ? 'text-green-700 dark:text-green-300'
                          : timelineStep === 'checking_balance'
                            ? 'text-blue-700 dark:text-blue-300'
                            : 'text-gray-400'
                      }`}
                    >
                      Verificando saldo
                    </span>
                    {validationData.balance &&
                      ['estimating_gas', 'awaiting_biometric', 'sending'].includes(
                        timelineStep
                      ) && (
                        <p className='text-xs text-gray-500'>
                          Disponível: {validationData.balance}
                        </p>
                      )}
                  </div>
                </div>

                {/* Step: Estimando taxa */}
                <div className='flex items-center gap-3'>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      timelineStep === 'estimating_gas'
                        ? 'bg-blue-100 dark:bg-blue-900/50'
                        : ['awaiting_biometric', 'sending'].includes(timelineStep)
                          ? 'bg-green-100 dark:bg-green-900/50'
                          : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    {timelineStep === 'estimating_gas' ? (
                      <Loader2 className='w-4 h-4 text-blue-600 animate-spin' />
                    ) : ['awaiting_biometric', 'sending'].includes(timelineStep) ? (
                      <CheckCircle className='w-4 h-4 text-green-600' />
                    ) : (
                      <div className='w-2 h-2 bg-gray-400 rounded-full' />
                    )}
                  </div>
                  <span
                    className={`text-sm ${
                      ['awaiting_biometric', 'sending'].includes(timelineStep)
                        ? 'text-green-700 dark:text-green-300'
                        : timelineStep === 'estimating_gas'
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-gray-400'
                    }`}
                  >
                    Estimando taxa de rede
                  </span>
                </div>

                {/* Step: Biometria (só aparece se disponível) */}
                {biometricAvailable && (
                  <div className='flex items-center gap-3'>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        timelineStep === 'awaiting_biometric'
                          ? 'bg-blue-100 dark:bg-blue-900/50'
                          : timelineStep === 'sending'
                            ? 'bg-green-100 dark:bg-green-900/50'
                            : 'bg-gray-100 dark:bg-gray-700'
                      }`}
                    >
                      {timelineStep === 'awaiting_biometric' ? (
                        <Loader2 className='w-4 h-4 text-blue-600 animate-spin' />
                      ) : timelineStep === 'sending' ? (
                        <CheckCircle className='w-4 h-4 text-green-600' />
                      ) : (
                        <div className='w-2 h-2 bg-gray-400 rounded-full' />
                      )}
                    </div>
                    <span
                      className={`text-sm ${
                        timelineStep === 'sending'
                          ? 'text-green-700 dark:text-green-300'
                          : timelineStep === 'awaiting_biometric'
                            ? 'text-blue-700 dark:text-blue-300'
                            : 'text-gray-400'
                      }`}
                    >
                      Confirmando biometria
                    </span>
                  </div>
                )}

                {/* Step: Enviando */}
                <div className='flex items-center gap-3'>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      timelineStep === 'sending'
                        ? 'bg-blue-100 dark:bg-blue-900/50'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    {timelineStep === 'sending' ? (
                      <Loader2 className='w-4 h-4 text-blue-600 animate-spin' />
                    ) : (
                      <div className='w-2 h-2 bg-gray-400 rounded-full' />
                    )}
                  </div>
                  <span
                    className={`text-sm ${
                      timelineStep === 'sending'
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-gray-400'
                    }`}
                  >
                    Enviando para blockchain
                  </span>
                </div>
              </div>

              {/* Erro inline */}
              {timelineStep === 'error' && error && (
                <div className='mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg'>
                  <div className='flex items-center gap-2 text-red-700 dark:text-red-300'>
                    <AlertCircle className='w-4 h-4' />
                    <span className='text-sm font-medium'>Erro</span>
                  </div>
                  <p className='text-xs text-red-600 dark:text-red-400 mt-1'>{error}</p>
                  <button
                    onClick={handleCancelSend}
                    className='mt-2 text-xs text-red-600 hover:text-red-700 underline'
                  >
                    Tentar novamente
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Info Card - Compacto */}
      <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2.5 flex gap-2'>
        <Info className='w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5' />
        <p className='text-xs text-blue-700 dark:text-blue-300'>
          <strong>Dica:</strong> Verifique o endereço duas vezes. Transações são irreversíveis.
        </p>
      </div>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
              Escanear QR
            </h3>
            <QRCodeScanner
              isOpen={showQRScanner}
              onScan={handleQRScan}
              onClose={() => setShowQRScanner(false)}
            />
            <button
              onClick={() => setShowQRScanner(false)}
              className='w-full mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors text-sm font-medium'
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Address Book Modal */}
      {showAddressBook && (
        <div className='fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col'>
            {/* Header */}
            <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center'>
                    <BookUser className='w-5 h-5 text-white' />
                  </div>
                  <div>
                    <h2 className='text-lg font-bold text-gray-900 dark:text-white'>
                      Agenda de Endereços
                    </h2>
                    <p className='text-xs text-gray-500'>Selecione um endereço salvo</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAddressBook(false)
                    setAddressBookSearch('')
                  }}
                  className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg'
                >
                  <X className='w-5 h-5 text-gray-500' />
                </button>
              </div>

              {/* Search */}
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
                <input
                  type='text'
                  placeholder='Buscar por nome ou endereço...'
                  value={addressBookSearch}
                  onChange={e => {
                    setAddressBookSearch(e.target.value)
                    loadAddressBook(e.target.value)
                  }}
                  className='w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl text-sm focus:ring-2 focus:ring-blue-500'
                />
              </div>
            </div>

            {/* Lista de Endereços */}
            <div className='flex-1 overflow-y-auto p-4 space-y-2'>
              {addressBookLoading ? (
                <div className='flex items-center justify-center py-8'>
                  <Loader2 className='w-6 h-6 text-blue-500 animate-spin' />
                </div>
              ) : addressBookEntries.length === 0 ? (
                <div className='text-center py-8'>
                  <BookUser className='w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3' />
                  <p className='text-sm text-gray-500'>
                    {addressBookSearch
                      ? 'Nenhum endereço encontrado'
                      : 'Nenhum endereço salvo na agenda'}
                  </p>
                </div>
              ) : (
                addressBookEntries.map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => handleSelectFromAddressBook(entry)}
                    className='w-full p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl border border-gray-200 dark:border-gray-600 transition-colors text-left'
                  >
                    <div className='flex items-start gap-3'>
                      {/* Icon */}
                      <div className='w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-600 flex items-center justify-center flex-shrink-0'>
                        <CryptoIcon symbol={entry.network} size={20} />
                      </div>

                      <div className='flex-1 min-w-0'>
                        {/* Name & Favorite */}
                        <div className='flex items-center gap-2 mb-1'>
                          <h3 className='font-semibold text-gray-900 dark:text-white truncate'>
                            {entry.name}
                          </h3>
                          {entry.is_favorite && (
                            <Star className='w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0' />
                          )}
                        </div>

                        {/* Address */}
                        <p className='text-xs text-gray-500 font-mono truncate'>
                          {entry.address.slice(0, 10)}...{entry.address.slice(-8)}
                        </p>

                        {/* Tags */}
                        <div className='flex items-center gap-2 mt-1.5'>
                          <span className='inline-flex items-center gap-1 px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded-full text-xs text-gray-600 dark:text-gray-300'>
                            {entry.network.toUpperCase()}
                          </span>
                          {entry.memo && (
                            <span className='text-xs text-gray-400 truncate'>
                              Memo: {entry.memo}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Arrow */}
                      <ArrowRight className='w-4 h-4 text-gray-400 flex-shrink-0 mt-2' />
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className='p-4 border-t border-gray-200 dark:border-gray-700'>
              <button
                onClick={() => {
                  setShowAddressBook(false)
                  setAddressBookSearch('')
                }}
                className='w-full py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium text-sm transition-colors'
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SendPage
