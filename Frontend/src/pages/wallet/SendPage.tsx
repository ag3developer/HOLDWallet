import { useState, useMemo, useEffect } from 'react'
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
  Fingerprint,
  Shield,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { CryptoIcon } from '@/components/CryptoIcon'
import { useWallets } from '@/hooks/useWallets'
import { useMultipleWalletBalances } from '@/hooks/useWallet'
import { useWalletAddresses } from '@/hooks/useWalletAddresses'
import { QRCodeScanner } from '@/components/QRCodeScanner'
import { transactionService } from '@/services/transactionService'
import { webAuthnService } from '@/services/webauthn'

export const SendPage = () => {
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
  const [show2FADialog, setShow2FADialog] = useState(false)
  const [twoFAToken, setTwoFAToken] = useState<string>('')
  const [pendingTransaction, setPendingTransaction] = useState<any>(null)
  const [authMethod, setAuthMethod] = useState<'biometric' | '2fa'>('biometric')
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)

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

  // Dados da API
  const { wallets: apiWallets } = useWallets()
  const walletIds = useMemo(() => apiWallets?.map((w: any) => String(w.id)) || [], [apiWallets])
  const balancesQueries = useMultipleWalletBalances(walletIds)

  // Buscar endereços específicos por rede (multi-wallet)
  const multiWallet = useMemo(() => apiWallets?.find(w => w.network === 'multi'), [apiWallets])
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
          const networkBalance = balanceQueryResult?.data?.[network]
          const balance = networkBalance?.balance ? Number(networkBalance.balance) : 0
          const balanceUSD = networkBalance?.balance_usd ? Number(networkBalance.balance_usd) : 0
          const address = networkAddresses[network] || '' // 🔑 Endereço específico por rede

          expandedWallets.push({
            walletId: wallet.id,
            symbol,
            network,
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

  const validateForm = (): boolean => {
    if (!toAddress.trim()) {
      setError('Endereço obrigatório')
      return false
    }

    if (!isValidEthereumAddress(toAddress)) {
      setError('Endereço inválido. Use um endereço Ethereum/EVM válido (0x...)')
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

  const isValidEthereumAddress = (address: string): boolean => {
    // Verifica se é um endereço Ethereum válido (começa com 0x e tem 42 caracteres)
    if (!/^0x[a-fA-F0-9]{40}$/.test(address.trim())) {
      return false
    }
    return true
  }

  const getAddressInputStyle = (): string => {
    if (toAddress.trim() === '') {
      return 'border-gray-300 dark:border-gray-600 focus:ring-blue-500'
    }
    if (isValidEthereumAddress(toAddress)) {
      return 'border-green-500 dark:border-green-400 focus:ring-green-500'
    }
    return 'border-red-500 dark:border-red-400 focus:ring-red-500'
  }

  const handleSend = async () => {
    if (!validateForm()) return
    try {
      setLoading(true)

      // Precisamos do endereço "from" - vamos usar a carteira do token selecionado
      const selectedWalletData = walletsWithAddresses.find(
        w => w.symbol === selectedToken && w.network === selectedNetwork
      )

      if (!selectedWalletData) {
        setError('Nenhuma carteira encontrada para este token')
        return
      }

      // Usar o endereço específico da rede (não o first_address genérico)
      if (!selectedWalletData.address) {
        setError('Endereço da carteira não disponível para esta rede')
        return
      }

      // Buscar a carteira completa para obter o ID
      const fullWallet = apiWallets?.find(w => String(w.id) === String(selectedWalletData.walletId))
      if (!fullWallet) {
        setError('Carteira não encontrada')
        return
      }

      console.log('📝 Iniciando transação...')
      console.log('Carteira ID:', fullWallet.id)
      console.log('De:', selectedWalletData.address) // 🔑 Endereço específico da rede
      console.log('Para:', toAddress)
      console.log('Valor:', amount)
      console.log('Rede:', selectedNetwork)

      // Estimar taxas ANTES de enviar
      console.log('💰 Estimando taxa de gás...')
      const feeEstimate = await transactionService.estimateFee({
        wallet_id: String(fullWallet.id),
        to_address: toAddress,
        amount: amount,
        network: selectedNetwork,
      })
      console.log('✅ Taxas estimadas:', feeEstimate)

      // Guardar os dados da transação pendente
      setPendingTransaction({
        wallet_id: String(fullWallet.id),
        to_address: toAddress,
        amount: amount,
        network: selectedNetwork,
        fee_preference: selectedFeeSpeed,
        token_symbol: selectedToken,
        memo: memo || undefined,
        feeEstimate: feeEstimate,
      })

      // Mostrar diálogo 2FA
      setShow2FADialog(true)
      setLoading(false)
    } catch (err: any) {
      console.error('❌ Erro ao preparar envio:', err)
      setError(err.message || 'Erro ao estimar taxa ou preparar transação')
      toast.error(err.message || 'Erro ao estimar taxa')
      setLoading(false)
    }
  }

  const handleSubmit2FA = async () => {
    if (!twoFAToken || twoFAToken.length < 6) {
      toast.error('Código 2FA inválido (mínimo 6 dígitos)')
      return
    }

    if (!pendingTransaction) {
      toast.error('Nenhuma transação pendente')
      return
    }

    try {
      setLoading(true)
      console.log('✍️ Enviando transação com 2FA...')
      console.log('Token 2FA:', twoFAToken)
      console.log('Transação pendente:', pendingTransaction)

      // Chamar o serviço que usa o novo endpoint /wallets/send
      const result = await transactionService.sendTransaction(
        {
          ...pendingTransaction,
        },
        undefined,
        twoFAToken // Passar o token 2FA
      )

      console.log('✅ Transação concluída:', result)
      setTxHash(result.txHash)
      setShowSuccess(true)
      toast.success('Transação enviada com sucesso!')

      // Limpar estado 2FA
      setShow2FADialog(false)
      setTwoFAToken('')
      setPendingTransaction(null)
    } catch (err: any) {
      console.error('❌ Erro ao enviar:', err)
      setError(err.message || 'Erro ao enviar transação')
      toast.error(err.message || 'Erro ao enviar transação')
    } finally {
      setLoading(false)
    }
  }

  // Handler for biometric authentication
  const handleBiometricAuth = async () => {
    if (!pendingTransaction) {
      toast.error('Nenhuma transação pendente')
      return
    }

    try {
      setBiometricLoading(true)
      console.log('🔐 Autenticando com biometria...')

      const success = await webAuthnService.authenticate()

      if (success) {
        console.log('✅ Biometria verificada!')

        // Send transaction with biometric token
        const result = await transactionService.sendTransaction(
          {
            ...pendingTransaction,
          },
          undefined,
          'biometric_verified' // Token especial para biometria
        )

        console.log('✅ Transação concluída:', result)
        setTxHash(result.txHash)
        setShowSuccess(true)
        toast.success('Transação enviada com sucesso!')

        // Limpar estado
        setShow2FADialog(false)
        setTwoFAToken('')
        setPendingTransaction(null)
      } else {
        toast.error('Falha na autenticação biométrica')
        setAuthMethod('2fa')
      }
    } catch (err: any) {
      console.error('❌ Erro na biometria:', err)
      toast.error('Biometria falhou. Use o código 2FA.')
      setAuthMethod('2fa')
    } finally {
      setBiometricLoading(false)
    }
  }

  const handleCancel2FA = () => {
    setShow2FADialog(false)
    setTwoFAToken('')
    setPendingTransaction(null)
    setError(null)
  }

  const resetForm = () => {
    setToAddress('')
    setAmount('')
    setMemo('')
    setError(null)
    setTxHash('')
    setShowSuccess(false)
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
      <div className='text-center space-y-6 py-8'>
        <div className='flex justify-center'>
          <div className='w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center'>
            <CheckCircle className='w-8 h-8 text-green-500' />
          </div>
        </div>

        <div>
          <h3 className='text-2xl font-bold text-gray-900 dark:text-white'>Enviado!</h3>
          <p className='text-gray-600 dark:text-gray-400 text-sm mt-2'>Transação confirmada</p>
        </div>

        {txHash && (
          <div className='bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700'>
            <p className='text-xs text-gray-600 dark:text-gray-400 mb-2'>Hash:</p>
            <div className='flex items-center gap-2'>
              <p className='font-mono text-xs text-gray-900 dark:text-white flex-1 truncate'>
                {txHash}
              </p>
              <button
                onClick={() => copyToClipboard(txHash)}
                className='p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors'
              >
                <Copy className='w-4 h-4 text-gray-600 dark:text-gray-400' />
              </button>
            </div>
          </div>
        )}

        <div className='flex gap-3'>
          <button
            onClick={resetForm}
            className='flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors'
          >
            Nova Transação
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-4 py-6'>
      {/* Header */}
      <div className='mb-6'>
        <h2 className='text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2'>
          <div className='w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center'>
            <Send className='w-5 h-5 text-white' />
          </div>
          Enviar
        </h2>
      </div>

      {/* Error Alert */}
      {error && (
        <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex gap-2'>
          <AlertCircle className='w-5 h-5 text-red-500 flex-shrink-0 mt-0.5' />
          <p className='text-red-800 dark:text-red-200 text-sm'>{error}</p>
        </div>
      )}

      {/* Form */}
      <div className='space-y-4'>
        {/* Token Selection */}
        <div>
          <label className='block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2'>
            Moeda
          </label>
          <div className='relative'>
            <button
              onClick={() => setShowTokenDropdown(!showTokenDropdown)}
              className='w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-between hover:border-blue-500 transition-colors'
            >
              <div className='flex items-center gap-2'>
                <CryptoIcon symbol={selectedToken} size={24} />
                <div className='text-left'>
                  <p className='font-semibold text-gray-900 dark:text-white text-sm'>
                    {selectedToken}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    {getSelectedTokenData()?.balance.toFixed(4)}
                  </p>
                </div>
              </div>
              <ChevronDown className='w-4 h-4 text-gray-600 dark:text-gray-400' />
            </button>

            {showTokenDropdown && (
              <div className='absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto'>
                {tokenList.map(token => (
                  <button
                    key={token.symbol}
                    onClick={() => handleTokenSelect(token)}
                    className='w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left border-b border-gray-200 dark:border-gray-700 last:border-b-0'
                  >
                    <CryptoIcon symbol={token.symbol} size={24} />
                    <div className='flex-1'>
                      <p className='font-semibold text-gray-900 dark:text-white text-sm'>
                        {token.symbol}
                      </p>
                      <p className='text-xs text-gray-500 dark:text-gray-400'>{token.name}</p>
                    </div>
                    <p className='text-xs font-semibold text-gray-900 dark:text-white'>
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
          <label className='block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2'>
            Rede
          </label>
          <div className='relative'>
            <button
              onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
              className='w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-between hover:border-blue-500 transition-colors'
            >
              <div className='flex items-center gap-2'>
                <CryptoIcon symbol={getSelectedNetworkData()?.symbol || 'CRYPTO'} size={24} />
                <p className='font-semibold text-gray-900 dark:text-white text-sm'>
                  {getSelectedNetworkData()?.name}
                </p>
              </div>
              <ChevronDown className='w-4 h-4 text-gray-600 dark:text-gray-400' />
            </button>

            {showNetworkDropdown && (
              <div className='absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto'>
                {networkList.map(network => (
                  <button
                    key={network.network}
                    onClick={() => handleNetworkSelect(network.network)}
                    className='w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left border-b border-gray-200 dark:border-gray-700 last:border-b-0'
                  >
                    <CryptoIcon symbol={network.symbol} size={24} />
                    <p className='font-semibold text-gray-900 dark:text-white text-sm flex-1'>
                      {network.name}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Address */}
        <div>
          <label className='block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2'>
            Endereço
          </label>
          <div className='flex gap-2'>
            <div className='flex-1 relative'>
              <input
                type='text'
                placeholder='Cole o endereço (0x...)'
                value={toAddress}
                onChange={e => setToAddress(e.target.value)}
                className={`w-full px-3 py-2 bg-white dark:bg-gray-800 border rounded-lg focus:ring-2 focus:border-transparent outline-none text-gray-900 dark:text-white text-sm transition-all ${getAddressInputStyle()}`}
              />
              {toAddress.trim() !== '' && (
                <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                  {isValidEthereumAddress(toAddress) ? (
                    <CheckCircle className='w-5 h-5 text-green-500' />
                  ) : (
                    <AlertCircle className='w-5 h-5 text-red-500' />
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowQRScanner(true)}
              className='px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors'
              title='Escanear QR'
            >
              <QrCode className='w-5 h-5 text-gray-600 dark:text-gray-400' />
            </button>
          </div>
          {toAddress.trim() !== '' && !isValidEthereumAddress(toAddress) && (
            <p className='text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1'>
              <AlertCircle className='w-3 h-3' />
              Endereço inválido. Use um endereço Ethereum válido (0x...)
            </p>
          )}
          {toAddress.trim() !== '' && isValidEthereumAddress(toAddress) && (
            <p className='text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1'>
              <CheckCircle className='w-3 h-3' />
              Endereço válido
            </p>
          )}
        </div>

        {/* Amount */}
        <div>
          <div className='flex items-center justify-between mb-2'>
            <label className='block text-xs font-semibold text-gray-700 dark:text-gray-300'>
              Valor
            </label>
            <button
              onClick={() => {
                const balance = getSelectedTokenData()?.balance || 0
                setAmount(balance.toString())
              }}
              className='text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded transition-colors font-semibold'
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
            className='w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-white text-sm'
          />
          {amount && (
            <p className='text-xs text-gray-600 dark:text-gray-400 mt-1'>
              ≈ $
              {(
                (Number(amount) * (getSelectedTokenData()?.balanceUSD || 0)) /
                (getSelectedTokenData()?.balance || 1)
              ).toFixed(2)}
            </p>
          )}
        </div>

        {/* Fee Speed */}
        <div>
          <label className='block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2'>
            Velocidade
          </label>
          <div className='grid grid-cols-3 gap-2'>
            {(['slow', 'standard', 'fast'] as const).map(speed => (
              <button
                key={speed}
                onClick={() => setSelectedFeeSpeed(speed)}
                className={`p-2 rounded-lg border-2 transition-all text-center ${
                  selectedFeeSpeed === speed
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                {speed === 'slow' && (
                  <Turtle className='w-5 h-5 mx-auto text-yellow-600 dark:text-yellow-400' />
                )}
                {speed === 'standard' && (
                  <Zap className='w-5 h-5 mx-auto text-blue-600 dark:text-blue-400' />
                )}
                {speed === 'fast' && (
                  <Rocket className='w-5 h-5 mx-auto text-orange-600 dark:text-orange-400' />
                )}
                <p className='text-xs text-gray-600 dark:text-gray-400 mt-1'>
                  {speed === 'slow' ? '5-10min' : speed === 'standard' ? '2-5min' : '<1min'}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Memo */}
        <div>
          <label className='block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2'>
            Memo (Opcional)
          </label>
          <input
            type='text'
            placeholder='Nota...'
            value={memo}
            onChange={e => setMemo(e.target.value)}
            className='w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-white text-sm'
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSend}
          disabled={loading || !toAddress || !amount}
          className='w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2'
        >
          {loading ? (
            <>
              <Loader2 className='w-5 h-5 animate-spin' />
              Enviando...
            </>
          ) : (
            <>
              <Send className='w-5 h-5' />
              Enviar
            </>
          )}
        </button>
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

      {/* 2FA Dialog Modal */}
      {show2FADialog && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full'>
            <div className='flex items-center gap-2 mb-2'>
              <Shield className='w-5 h-5 text-blue-500' />
              <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                Autenticação de Segurança
              </h3>
            </div>
            <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
              {biometricAvailable
                ? 'Use biometria ou código 2FA para confirmar a transação'
                : 'Digite o código de 6 dígitos do seu aplicativo autenticador'}
            </p>

            {error && (
              <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 flex gap-2'>
                <AlertCircle className='w-5 h-5 text-red-500 flex-shrink-0 mt-0.5' />
                <p className='text-red-800 dark:text-red-200 text-sm'>{error}</p>
              </div>
            )}

            {/* Auth Method Selection - Show if biometric available */}
            {biometricAvailable && (
              <div className='flex gap-2 mb-4'>
                <button
                  type='button'
                  onClick={() => setAuthMethod('biometric')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                    authMethod === 'biometric'
                      ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-300'
                  }`}
                >
                  <Fingerprint className='w-4 h-4' />
                  <span className='text-sm font-medium'>Biometria</span>
                </button>
                <button
                  type='button'
                  onClick={() => setAuthMethod('2fa')}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${
                    authMethod === '2fa'
                      ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                      : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-300'
                  }`}
                >
                  <Shield className='w-4 h-4' />
                  <span className='text-sm font-medium'>Código 2FA</span>
                </button>
              </div>
            )}

            {/* Exibir taxas estimadas */}
            {pendingTransaction?.feeEstimate && (
              <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4'>
                <div className='flex items-center gap-2 mb-3'>
                  <Zap className='w-4 h-4 text-blue-600 dark:text-blue-400' />
                  <p className='text-xs font-semibold text-blue-900 dark:text-blue-200'>
                    Taxa de Gás Estimada
                  </p>
                </div>
                <div className='grid grid-cols-3 gap-3 text-xs'>
                  <div className='bg-white dark:bg-gray-700 rounded p-2 text-center'>
                    <p className='text-gray-600 dark:text-gray-400 text-xs mb-1'>Slow</p>
                    <p className='font-mono font-semibold text-blue-700 dark:text-blue-300 text-sm break-words'>
                      {Number.parseFloat(
                        pendingTransaction.feeEstimate.fee_estimates.slow_fee
                      ).toFixed(8)}
                    </p>
                  </div>
                  <div className='bg-white dark:bg-gray-700 rounded p-2 text-center'>
                    <p className='text-gray-600 dark:text-gray-400 text-xs mb-1'>Standard</p>
                    <p className='font-mono font-semibold text-blue-700 dark:text-blue-300 text-sm break-words'>
                      {Number.parseFloat(
                        pendingTransaction.feeEstimate.fee_estimates.standard_fee
                      ).toFixed(8)}
                    </p>
                  </div>
                  <div className='bg-white dark:bg-gray-700 rounded p-2 text-center'>
                    <p className='text-gray-600 dark:text-gray-400 text-xs mb-1'>Fast</p>
                    <p className='font-mono font-semibold text-blue-700 dark:text-blue-300 text-sm break-words'>
                      {Number.parseFloat(
                        pendingTransaction.feeEstimate.fee_estimates.fast_fee
                      ).toFixed(8)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Biometric Auth Section */}
            {authMethod === 'biometric' && biometricAvailable ? (
              <div className='text-center py-6 mb-4'>
                <div className='w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4'>
                  <Fingerprint className='w-8 h-8 text-blue-600 dark:text-blue-400' />
                </div>
                <p className='text-sm text-gray-600 dark:text-gray-400 mb-2'>
                  Clique no botão abaixo para autenticar
                </p>
                <p className='text-xs text-green-600 dark:text-green-400'>
                  Face ID / Touch ID disponível
                </p>
              </div>
            ) : (
              /* 2FA Code Input */
              <div className='mb-6'>
                <label className='block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2'>
                  Código 2FA
                </label>
                <input
                  type='text'
                  placeholder='000000'
                  value={twoFAToken}
                  onChange={e => setTwoFAToken(e.target.value.replaceAll(/\D/g, '').slice(0, 8))}
                  maxLength={8}
                  className='w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 dark:text-white text-sm font-mono text-center text-2xl tracking-widest'
                />
                <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                  {twoFAToken.length}/6 dígitos
                </p>
              </div>
            )}

            <div className='flex gap-3'>
              <button
                onClick={handleCancel2FA}
                disabled={loading || biometricLoading}
                className='flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 text-gray-900 dark:text-white rounded-lg transition-colors text-sm font-medium'
              >
                Cancelar
              </button>
              <button
                onClick={
                  authMethod === 'biometric' && biometricAvailable
                    ? handleBiometricAuth
                    : handleSubmit2FA
                }
                disabled={
                  loading || biometricLoading || (authMethod === '2fa' && twoFAToken.length < 6)
                }
                className='flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2'
              >
                {loading || biometricLoading ? (
                  <>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    {biometricLoading ? 'Autenticando...' : 'Enviando...'}
                  </>
                ) : (
                  <>
                    {authMethod === 'biometric' && biometricAvailable ? (
                      <Fingerprint className='w-4 h-4' />
                    ) : (
                      <Send className='w-4 h-4' />
                    )}
                    {authMethod === 'biometric' && biometricAvailable ? 'Autenticar' : 'Enviar'}
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

export default SendPage
