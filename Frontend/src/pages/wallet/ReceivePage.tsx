import { useState, useMemo, useEffect } from 'react'
import { Download, AlertCircle, QrCode, Copy } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import { CryptoIcon } from '@/components/CryptoIcon'
import { useWallets } from '@/hooks/useWallets'
import { useWalletAddresses } from '@/hooks/useWalletAddresses'
import { useMultipleWalletBalances } from '@/hooks/useWallet'

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

  // Dados da API
  const { wallets: apiWallets } = useWallets()
  const walletIds = useMemo(() => apiWallets?.map((w: any) => String(w.id)) || [], [apiWallets])
  const balancesQueries = useMultipleWalletBalances(walletIds)

  // Buscar endereços de todas as redes (se for carteira multi)
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
          const address = networkAddresses[network] || ''
          expandedWallets.push({
            id: `${wallet.id}-${network}`,
            walletId: wallet.id,
            symbol,
            network,
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

  // Sincronizar selectedWalletIndex quando carteiras carregam
  useEffect(() => {
    if (walletsWithAddresses.length > 0 && selectedWalletIndex >= walletsWithAddresses.length) {
      const newIndex = Math.max(
        walletsWithAddresses.findIndex(w => w.network === selectedNetwork),
        0
      )
      setSelectedWalletIndex(newIndex)
    }
  }, [walletsWithAddresses, selectedNetwork])

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

  const currentAddress = walletsWithAddresses[selectedWalletIndex]?.address || ''

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

          uniqueTokens.set(wallet.symbol, {
            ...tokenInfo,
            ...info,
          })
        }
      }
    })

    return Array.from(uniqueTokens.values())
  }, [walletsWithAddresses, networkPreferences, tokenPreferences])

  const networkList = useMemo(() => {
    const uniqueNetworks = new Map<string, any>()

    walletsWithAddresses.forEach(wallet => {
      // Apenas incluir redes que o usuário selecionou nas preferências
      if (networkPreferences[wallet.network as keyof typeof networkPreferences]) {
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
  }, [walletsWithAddresses, networkPreferences])

  const handleTokenSelect = (token: any) => {
    setSelectedToken(token.symbol)
    setSelectedNetwork(token.network)
    // Encontrar a carteira correta para este token/rede
    const walletIndex = Math.max(
      walletsWithAddresses.findIndex(w => w.network === token.network),
      0
    )
    console.log('Token selecionado:', token.symbol, 'Rede:', token.network, 'Index:', walletIndex)
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
        <QrCode className='w-12 h-12 text-gray-400 mx-auto mb-3' />
        <p className='text-gray-500 dark:text-gray-400'>Nenhuma carteira disponível</p>
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

  return (
    <div className='space-y-4'>
      {/* Header */}
      <div className='mb-4'>
        <h2 className='text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2'>
          <div className='w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center'>
            <Download className='w-5 h-5 text-white' />
          </div>
          Receber Criptomoeda
        </h2>
      </div>

      {/* Card Principal - QR + Dados */}
      <div className='bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg p-6 text-white'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          {/* QR Code */}
          <div className='flex flex-col items-center justify-center'>
            <p className='text-sm font-medium text-blue-100 mb-4'>Escaneie para enviar</p>
            {currentAddress ? (
              <div className='relative'>
                <div className='bg-white rounded-xl p-4 shadow-lg'>
                  <QRCodeSVG
                    value={currentAddress}
                    size={180}
                    level='H'
                    className='w-full h-auto'
                  />
                </div>
                <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'>
                  <div className='bg-white rounded-full p-2 shadow-lg'>
                    <CryptoIcon symbol={selectedToken} size={44} />
                  </div>
                </div>
              </div>
            ) : (
              <div className='w-48 h-48 bg-gray-200 rounded-lg flex items-center justify-center'>
                <QrCode className='w-12 h-12 text-gray-400' />
              </div>
            )}
          </div>

          {/* Informações */}
          <div className='flex flex-col justify-center space-y-4'>
            {/* Token Recebendo */}
            <div>
              <p className='text-blue-100 text-xs mb-1 uppercase font-semibold'>Recebendo</p>
              <div className='flex items-center gap-3'>
                <CryptoIcon symbol={selectedToken} size={32} />
                <div>
                  <p className='text-3xl font-bold'>{selectedToken}</p>
                  <p className='text-xs text-blue-200'>via {selectedNetwork.toUpperCase()}</p>
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div>
              <p className='text-blue-100 text-xs mb-2 uppercase font-semibold'>Seu Endereço</p>
              <div className='flex items-center gap-2 bg-white bg-opacity-20 rounded-lg p-3 backdrop-blur-sm'>
                <input
                  type='text'
                  value={currentAddress || 'Carregando...'}
                  readOnly
                  aria-label={`Endereço para receber ${selectedToken}`}
                  className='flex-1 bg-transparent text-white text-xs font-mono outline-none placeholder-blue-200 truncate'
                />
                <button
                  onClick={() =>
                    currentAddress && copyToClipboard(currentAddress, 'Endereço copiado!')
                  }
                  className='p-2 bg-white bg-opacity-30 hover:bg-opacity-40 rounded-lg transition-all flex-shrink-0'
                  aria-label='Copiar endereço'
                >
                  <Copy className='w-4 h-4' />
                </button>
              </div>
            </div>

            {/* Badge de Rede */}
            <div className='pt-2 border-t border-white border-opacity-20'>
              <span className='inline-block px-3 py-1 bg-white bg-opacity-20 rounded-full text-xs font-medium'>
                {selectedNetwork === 'ethereum' && 'ERC-20'}
                {selectedNetwork === 'bsc' && 'BEP-20'}
                {selectedNetwork === 'polygon' && 'Polygon'}
                {selectedNetwork === 'tron' && 'TRC-20'}
                {selectedNetwork === 'base' && 'Base L2'}
                {selectedNetwork === 'bitcoin' && 'BTC Native'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Seletores Compactos */}
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {/* Token Selector */}
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4'>
          <div className='text-xs font-bold text-gray-700 dark:text-gray-300 mb-3 block uppercase tracking-wider'>
            Selecionar Token ({tokenList.length})
          </div>
          <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-96 overflow-y-auto'>
            {tokenList.map(token => (
              <button
                key={token.symbol}
                onClick={() => handleTokenSelect(token)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-center ${
                  selectedToken === token.symbol
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                }`}
              >
                <CryptoIcon symbol={token.symbol} size={20} />
                <span className='text-xs font-bold text-gray-900 dark:text-white'>
                  {token.symbol}
                </span>
                <span className='text-xs text-gray-500 dark:text-gray-400 truncate'>
                  {token.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Network Selector */}
        <div className='bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4'>
          <div className='text-xs font-bold text-gray-700 dark:text-gray-300 mb-3 block uppercase tracking-wider'>
            Rede Blockchain ({networkList.length})
          </div>
          <div className='space-y-2 max-h-96 overflow-y-auto'>
            {networkList.map(({ network, name, icon, fee }) => (
              <button
                key={network}
                onClick={() => handleNetworkSelect(network)}
                className={`w-full flex items-center justify-between gap-2 p-2 rounded-lg border-2 transition-all text-left ${
                  selectedNetwork === network
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600'
                }`}
              >
                <div className='flex items-center gap-2 min-w-0'>
                  <CryptoIcon symbol={icon} size={16} />
                  <div className='min-w-0'>
                    <p className='text-xs font-bold text-gray-900 dark:text-white truncate'>
                      {name}
                    </p>
                    <p className={getFeeColor(fee)}>{fee}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerta Crítico */}
      <div className='bg-red-50 dark:bg-red-900/20 border-l-4 border-red-600 dark:border-red-500 rounded-lg p-4'>
        <div className='flex items-start gap-3'>
          <AlertCircle className='w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0' />
          <div>
            <h3 className='text-sm font-bold text-red-900 dark:text-red-100 mb-2'>
              ⚠️ ATENÇÃO CRÍTICA!
            </h3>
            <ul className='text-xs text-red-800 dark:text-red-200 space-y-1.5'>
              <li>
                • <strong>Rede errada = perda total!</strong> Confirme que o remetente envia pela
                rede {selectedNetwork.toUpperCase()}
              </li>
              <li>
                • <strong>Verifique endereço:</strong> Confira cada caractere antes de compartilhar
              </li>
              <li>
                • <strong>Nunca compartilhe:</strong> suas chaves privadas com ninguém
              </li>
              <li>
                • <strong>Teste pequeno:</strong> Peça transferência de $1 como teste para quantias
                grandes
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
