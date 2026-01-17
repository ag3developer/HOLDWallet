import { useState, useMemo, useEffect } from 'react'
import { Download, AlertCircle, QrCode, Copy, Shield, Sparkles, Share2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import { CryptoIcon } from '@/components/CryptoIcon'
import { useWallets, useMultipleWalletBalances } from '@/hooks/useWallet'
import { useWalletAddresses } from '@/hooks/useWalletAddresses'

// Redes válidas onde cada stablecoin existe
const STABLECOIN_VALID_NETWORKS: Record<string, string[]> = {
  USDT: ['polygon', 'ethereum', 'bsc', 'tron', 'avalanche', 'base', 'arbitrum', 'optimism'],
  USDC: ['polygon', 'ethereum', 'bsc', 'solana', 'avalanche', 'base', 'arbitrum', 'optimism'],
  DAI: ['polygon', 'ethereum', 'bsc'],
  TRAY: ['polygon'], // TRAY está apenas na Polygon
}

// Rede padrão recomendada para cada token (taxas mais baixas)
const DEFAULT_NETWORK_FOR_TOKEN: Record<string, string> = {
  USDT: 'polygon', // Polygon tem taxas mínimas
  USDC: 'polygon',
  DAI: 'polygon',
  TRAY: 'polygon', // TRAY é um token na Polygon
  BTC: 'bitcoin',
  ETH: 'ethereum',
  BNB: 'bsc',
  MATIC: 'polygon',
  TRX: 'tron',
  SOL: 'solana',
  LTC: 'litecoin',
  DOGE: 'dogecoin',
  ADA: 'cardano',
  AVAX: 'avalanche',
  DOT: 'polkadot',
  LINK: 'ethereum', // LINK é um token ERC-20
  SHIB: 'ethereum', // SHIB é um token ERC-20
  XRP: 'xrp',
  BASE: 'base',
}

// Função para verificar se um token pode existir em uma rede
const isValidNetworkForToken = (token: string, network: string): boolean => {
  // Stablecoins e tokens específicos têm redes específicas
  if (STABLECOIN_VALID_NETWORKS[token]) {
    return STABLECOIN_VALID_NETWORKS[token].includes(network)
  }
  // Tokens nativos só existem em suas próprias redes
  const nativeTokenNetworks: Record<string, string> = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    BNB: 'bsc',
    MATIC: 'polygon',
    TRX: 'tron',
    SOL: 'solana',
    LTC: 'litecoin',
    DOGE: 'dogecoin',
    ADA: 'cardano',
    AVAX: 'avalanche',
    DOT: 'polkadot',
    XRP: 'xrp',
    BASE: 'base',
    LINK: 'ethereum',
    SHIB: 'ethereum',
    TRAY: 'polygon', // TRAY é um token na Polygon
  }
  return nativeTokenNetworks[token] === network
}

export const ReceivePage = () => {
  const [selectedToken, setSelectedToken] = useState<string>('USDT')
  const [selectedNetwork, setSelectedNetwork] = useState<string>('polygon')
  const [selectedWalletIndex, setSelectedWalletIndex] = useState<number>(0)

  // Carregar preferências de moedas selecionadas do localStorage (como no WalletPage)
  const [networkPreferences] = useState(() => {
    const saved = localStorage.getItem('wallet_network_preferences')
    const defaultPreferences = {
      bitcoin: true,
      ethereum: true,
      polygon: true,
      bsc: true,
      tron: true,
      base: true,
      tray: true,
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

  // Dados da API - useWallets retorna { data, isLoading, etc }
  const { data: apiWallets, isLoading: isWalletsLoading } = useWallets()
  const walletIds = useMemo(() => apiWallets?.map((w: any) => String(w.id)) || [], [apiWallets])
  const balancesQueries = useMultipleWalletBalances(walletIds)

  // Buscar endereços de todas as redes (se for carteira multi)
  // Priorizar a rede selecionada para carregamento mais rápido
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
  const { addresses: networkAddresses, isPriorityLoaded } = useWalletAddresses(
    multiWallet?.id?.toString(),
    networksList,
    selectedNetwork // Rede prioritária - será carregada primeiro
  )

  // Debug: Log wallet and address loading
  useEffect(() => {
    console.log('[ReceivePage] 📝 Wallet/Address Status:', {
      hasMultiWallet: !!multiWallet,
      multiWalletId: multiWallet?.id,
      networksList,
      loadedNetworks: Object.keys(networkAddresses),
      addresses: networkAddresses,
    })
  }, [multiWallet, networkAddresses])

  // Carteiras com endereços
  const walletsWithAddresses = useMemo(() => {
    if (!apiWallets || !balancesQueries) return []

    const expandedWallets: any[] = []

    apiWallets.forEach((wallet: any, walletIndex: number) => {
      const balanceData = balancesQueries[walletIndex]

      if (wallet.network === 'multi') {
        // Para carteiras multi, criar entradas para cada rede (15 blockchains)
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
          // TRAY usa endereço Polygon
          const address =
            network === 'tray' ? networkAddresses['polygon'] || '' : networkAddresses[network] || ''

          expandedWallets.push({
            id: `${wallet.id}-${network}`,
            walletId: wallet.id,
            symbol,
            network: network === 'tray' ? 'polygon' : network, // TRAY mostra polygon como rede
            address,
            balance: balanceData?.data?.balance ? Number(balanceData.data.balance) : 0,
            balanceUSD: balanceData?.data?.balance_usd ? Number(balanceData.data.balance_usd) : 0,
          })
        })
      } else {
        // Para carteiras específicas
        expandedWallets.push({
          id: wallet.id,
          walletId: wallet.id,
          symbol: wallet.symbol || wallet.network.toUpperCase(),
          network: wallet.network,
          address: wallet.address || '',
          balance: balanceData?.data?.balance ? Number(balanceData.data.balance) : 0,
          balanceUSD: balanceData?.data?.balance_usd ? Number(balanceData.data.balance_usd) : 0,
        })
      }
    })

    return expandedWallets.sort((a: any, b: any) => Number(b.balance) - Number(a.balance))
  }, [apiWallets, balancesQueries, networkAddresses])

  // Inicializar com a rede correta quando as carteiras carregarem
  useEffect(() => {
    if (walletsWithAddresses.length > 0) {
      // Verificar se a rede atual é válida para o token selecionado
      const isCurrentNetworkValid = isValidNetworkForToken(selectedToken, selectedNetwork)

      if (isCurrentNetworkValid) {
        // Apenas atualizar o índice se necessário
        const walletIndex = Math.max(
          walletsWithAddresses.findIndex(w => w.network === selectedNetwork),
          0
        )
        if (walletIndex !== selectedWalletIndex) {
          setSelectedWalletIndex(walletIndex)
        }
      } else {
        // Encontrar rede válida para o token
        const validNetwork =
          DEFAULT_NETWORK_FOR_TOKEN[selectedToken] ||
          STABLECOIN_VALID_NETWORKS[selectedToken]?.[0] ||
          selectedNetwork

        setSelectedNetwork(validNetwork)

        const walletIndex = Math.max(
          walletsWithAddresses.findIndex(w => w.network === validNetwork),
          0
        )
        setSelectedWalletIndex(walletIndex)
        console.log(
          `[ReceivePage] Auto-correção: ${selectedToken} mudou de ${selectedNetwork} para ${validNetwork}`
        )
      }
    }
  }, [walletsWithAddresses, selectedToken])

  // Sincronizar selectedWalletIndex quando selectedNetwork muda
  useEffect(() => {
    if (walletsWithAddresses.length > 0) {
      const walletIndex = Math.max(
        walletsWithAddresses.findIndex(w => w.network === selectedNetwork),
        0
      )
      if (walletIndex !== selectedWalletIndex) {
        setSelectedWalletIndex(walletIndex)
      }
    }
  }, [selectedNetwork, walletsWithAddresses])

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(message))
      .catch(() => toast.error('Erro ao copiar'))
  }

  const getFeeColor = (fee: string): string => {
    if (fee === 'Alta') return 'text-xs text-yellow-600 dark:text-opacity-80'
    if (fee === 'Mínima') return 'text-xs text-green-600 dark:text-opacity-80'
    return 'text-xs text-gray-600 dark:text-opacity-80'
  }

  // Obter endereço atual - priorizar endereço direto do networkAddresses para carregamento rápido
  const currentAddress = useMemo(() => {
    // Primeiro tentar obter diretamente do cache de endereços (mais rápido)
    const directAddress = networkAddresses[selectedNetwork]
    if (directAddress) return directAddress

    // Fallback para endereço da carteira selecionada
    return walletsWithAddresses[selectedWalletIndex]?.address || ''
  }, [networkAddresses, selectedNetwork, walletsWithAddresses, selectedWalletIndex])

  // Estado de carregamento do endereço
  const isAddressLoading = !currentAddress && !isPriorityLoaded

  // Gerar lista de tokens dinamicamente a partir das carteiras disponíveis
  const tokenList = useMemo(() => {
    const uniqueTokens = new Map<string, any>()

    walletsWithAddresses.forEach(wallet => {
      // Apenas incluir tokens das redes que o usuário selecionou
      if (networkPreferences[wallet.network as keyof typeof networkPreferences]) {
        if (!uniqueTokens.has(wallet.symbol)) {
          const tokenInfo: any = {
            symbol: wallet.symbol,
            network: wallet.network,
          }

          // Adicionar nome e categoria baseado no símbolo
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

          uniqueTokens.set(wallet.symbol, {
            ...tokenInfo,
            ...info,
          })
        }
      }
    })

    return Array.from(uniqueTokens.values())
  }, [walletsWithAddresses, networkPreferences, tokenPreferences])

  // Lista de redes filtrada para mostrar apenas redes válidas para o token selecionado
  const networkList = useMemo(() => {
    const uniqueNetworks = new Map<string, any>()

    walletsWithAddresses.forEach(wallet => {
      // Apenas incluir redes que o usuário selecionou nas preferências
      if (networkPreferences[wallet.network as keyof typeof networkPreferences]) {
        // Filtrar apenas redes válidas para o token selecionado
        if (!isValidNetworkForToken(selectedToken, wallet.network)) {
          return // Pular redes inválidas para este token
        }

        if (!uniqueNetworks.has(wallet.network)) {
          const networkInfo: Record<string, { name: string; icon: string; fee: string }> = {
            polygon: { name: 'Polygon', icon: 'MATIC', fee: 'Mínima' },
            tron: { name: 'Tron (TRC-20)', icon: 'TRX', fee: 'Mínima' },
            base: { name: 'Base (L2)', icon: 'ETH', fee: 'Mínima' },
            bsc: { name: 'BSC (BEP-20)', icon: 'BNB', fee: 'Baixa' },
            ethereum: { name: 'Ethereum (ERC-20)', icon: 'ETH', fee: 'Alta' },
            bitcoin: { name: 'Bitcoin', icon: 'BTC', fee: 'Variável' },
            cardano: { name: 'Cardano', icon: 'ADA', fee: 'Mínima' },
            solana: { name: 'Solana', icon: 'SOL', fee: 'Mínima' },
            litecoin: { name: 'Litecoin', icon: 'LTC', fee: 'Variável' },
            dogecoin: { name: 'Dogecoin', icon: 'DOGE', fee: 'Variável' },
            avalanche: { name: 'Avalanche', icon: 'AVAX', fee: 'Baixa' },
            polkadot: { name: 'Polkadot', icon: 'DOT', fee: 'Variável' },
            chainlink: { name: 'Chainlink', icon: 'LINK', fee: 'Alta' },
            shiba: { name: 'Shiba Inu', icon: 'SHIB', fee: 'Variável' },
            xrp: { name: 'XRP', icon: 'XRP', fee: 'Mínima' },
          }

          const info = networkInfo[wallet.network] || {
            name: wallet.network,
            icon: wallet.symbol,
            fee: 'Desconhecida',
          }
          uniqueNetworks.set(wallet.network, {
            network: wallet.network,
            ...info,
          })
        }
      }
    })

    // Ordenar redes: recomendadas primeiro (taxas mínimas/baixas), depois as outras
    const sortedNetworks = Array.from(uniqueNetworks.values()).sort((a, b) => {
      const feeOrder = { Mínima: 0, Baixa: 1, Variável: 2, Alta: 3, Desconhecida: 4 }
      return (
        (feeOrder[a.fee as keyof typeof feeOrder] || 4) -
        (feeOrder[b.fee as keyof typeof feeOrder] || 4)
      )
    })

    return sortedNetworks
  }, [walletsWithAddresses, networkPreferences, selectedToken])

  const handleTokenSelect = (token: any) => {
    setSelectedToken(token.symbol)

    // Usar rede padrão recomendada para o token (com taxas mais baixas)
    const defaultNetwork = DEFAULT_NETWORK_FOR_TOKEN[token.symbol] || token.network

    // Verificar se a rede padrão é válida para este token
    const validNetwork = isValidNetworkForToken(token.symbol, defaultNetwork)
      ? defaultNetwork
      : STABLECOIN_VALID_NETWORKS[token.symbol]?.[0] || token.network

    setSelectedNetwork(validNetwork)

    // Encontrar a carteira correta para este token/rede
    const walletIndex = Math.max(
      walletsWithAddresses.findIndex(w => w.network === validNetwork),
      0
    )
    console.log('Token selecionado:', token.symbol, 'Rede:', validNetwork, 'Index:', walletIndex)
    console.log('Carteiras disponíveis:', walletsWithAddresses)
    setSelectedWalletIndex(walletIndex)
  }

  const handleNetworkSelect = (network: string) => {
    setSelectedNetwork(network)
    // Encontrar a carteira correta para esta rede
    const walletIndex = Math.max(
      walletsWithAddresses.findIndex(w => w.network === network),
      0
    )
    console.log('Rede selecionada:', network, 'Index:', walletIndex)
    console.log('Carteiras disponíveis:', walletsWithAddresses)
    setSelectedWalletIndex(walletIndex)
  }

  if (walletsWithAddresses.length === 0) {
    return (
      <div className='text-center py-12'>
        <div className='w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4'>
          <QrCode className='w-10 h-10 text-gray-400' />
        </div>
        <p className='text-gray-500 dark:text-gray-400 text-lg'>Nenhuma carteira disponível</p>
      </div>
    )
  }

  // Debug info
  console.log('🔍 Estado ReceivePage:', {
    selectedToken,
    selectedNetwork,
    selectedWalletIndex,
    carteirasTotal: walletsWithAddresses.length,
    enderecoAtual: currentAddress,
    carteiraSelecionada: walletsWithAddresses[selectedWalletIndex],
    todasAsCarteiras: walletsWithAddresses,
  })

  // Share address functionality
  const shareAddress = async () => {
    if (!currentAddress) return
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Receber ${selectedToken}`,
          text: `Meu endereço ${selectedToken} (${selectedNetwork.toUpperCase()}): ${currentAddress}`,
        })
      } else {
        copyToClipboard(currentAddress, 'Endereço copiado!')
      }
    } catch (err) {
      copyToClipboard(currentAddress, 'Endereço copiado!')
    }
  }

  return (
    <div className='space-y-3'>
      {/* Header Compacto */}
      <div className='flex items-center gap-3'>
        <div className='w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-xl flex items-center justify-center shadow-md'>
          <Download className='w-5 h-5 text-white' />
        </div>
        <div>
          <h2 className='text-lg font-bold text-gray-900 dark:text-white'>Receber</h2>
          <p className='text-xs text-gray-500 dark:text-gray-400'>
            Receba crypto de qualquer lugar
          </p>
        </div>
      </div>

      {/* Main Content - Layout Horizontal no Desktop */}
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-3'>
        {/* QR Code Card - Compacto */}
        <div className='lg:col-span-5 relative bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 rounded-xl shadow-lg p-4 text-white overflow-hidden'>
          <div className='absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2' />

          <div className='relative z-10 flex flex-col sm:flex-row lg:flex-col items-center gap-4'>
            {/* QR Code */}
            <div className='flex flex-col items-center'>
              {currentAddress ? (
                <div className='relative'>
                  <div className='bg-white rounded-xl p-3 shadow-lg'>
                    <QRCodeSVG value={currentAddress} size={120} level='H' />
                  </div>
                  <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'>
                    <div className='bg-white rounded-full p-1.5 shadow ring-2 ring-green-500/30'>
                      <CryptoIcon symbol={selectedToken} size={28} />
                    </div>
                  </div>
                </div>
              ) : isAddressLoading ? (
                <div className='w-32 h-32 bg-white/20 rounded-xl flex items-center justify-center animate-pulse'>
                  <p className='text-xs text-green-100'>Carregando...</p>
                </div>
              ) : (
                <div className='w-32 h-32 bg-white/20 rounded-xl flex items-center justify-center'>
                  <QrCode className='w-8 h-8 text-white/60' />
                </div>
              )}
            </div>

            {/* Info */}
            <div className='flex-1 text-center sm:text-left lg:text-center w-full'>
              <div className='flex items-center justify-center sm:justify-start lg:justify-center gap-2 mb-2'>
                <CryptoIcon symbol={selectedToken} size={24} />
                <span className='text-xl font-bold'>{selectedToken}</span>
                <span className='text-xs bg-white/20 px-2 py-0.5 rounded-full'>
                  {selectedNetwork.toUpperCase()}
                </span>
              </div>

              {/* Address */}
              <div className='bg-white/15 rounded-lg p-2 mb-3'>
                <p className='text-xs font-mono truncate'>{currentAddress || 'Carregando...'}</p>
              </div>

              {/* Action Buttons */}
              <div className='flex gap-2'>
                <button
                  onClick={() =>
                    currentAddress && copyToClipboard(currentAddress, 'Endereço copiado!')
                  }
                  disabled={!currentAddress}
                  className='flex-1 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-medium flex items-center justify-center gap-1 disabled:opacity-50'
                >
                  <Copy className='w-3 h-3' />
                  Copiar
                </button>
                <button
                  onClick={shareAddress}
                  disabled={!currentAddress}
                  className='flex-1 py-2 bg-white hover:bg-white/90 text-green-600 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-50'
                >
                  <Share2 className='w-3 h-3' />
                  Compartilhar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Selectors - Lado a Lado */}
        <div className='lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-3'>
          {/* Token Selector */}
          <div className='bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700'>
            <div className='px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'>
              <h3 className='text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5'>
                <Sparkles className='w-3 h-3 text-blue-500' />
                Token ({tokenList.length})
              </h3>
            </div>
            <div className='p-2'>
              <div className='grid grid-cols-4 gap-1.5 max-h-36 overflow-y-auto'>
                {tokenList.map(token => (
                  <button
                    key={token.symbol}
                    onClick={() => handleTokenSelect(token)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                      selectedToken === token.symbol
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-100 dark:border-gray-700 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <CryptoIcon symbol={token.symbol} size={20} />
                    <span className='text-xs font-semibold text-gray-900 dark:text-white'>
                      {token.symbol}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Network Selector */}
          <div className='bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700'>
            <div className='px-3 py-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'>
              <h3 className='text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5'>
                <Shield className='w-3 h-3 text-green-500' />
                Rede ({networkList.length})
              </h3>
            </div>
            <div className='p-2'>
              <div className='space-y-1 max-h-36 overflow-y-auto'>
                {networkList.map(({ network, name, icon, fee }) => (
                  <button
                    key={network}
                    onClick={() => handleNetworkSelect(network)}
                    className={`w-full flex items-center justify-between gap-2 p-2 rounded-lg border transition-all text-left ${
                      selectedNetwork === network
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                        : 'border-gray-100 dark:border-gray-700 hover:border-green-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className='flex items-center gap-2 min-w-0'>
                      <CryptoIcon symbol={icon} size={18} />
                      <p className='text-xs font-medium text-gray-900 dark:text-white truncate'>
                        {name}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                        fee === 'Mínima'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : fee === 'Baixa'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            : fee === 'Alta'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {fee}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Compacto */}
      <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2.5 flex gap-2'>
        <AlertCircle className='w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5' />
        <div className='text-xs text-red-800 dark:text-red-200'>
          <strong>Atenção:</strong> Confirme a rede <strong>{selectedNetwork.toUpperCase()}</strong>{' '}
          antes de receber. Rede errada = perda total!
        </div>
      </div>
    </div>
  )
}
