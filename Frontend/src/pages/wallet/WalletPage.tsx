import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import toast, { Toaster } from 'react-hot-toast'
import { 
  Wallet, 
  Send, 
  Download, 
  Eye, 
  EyeOff, 
  Copy, 
  QrCode,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Minus,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertCircle,
  Info,
  Loader2,
  Settings,
  Shield,
  Zap,
  Sparkles,
  Star,
  CircleDollarSign
} from 'lucide-react'
import { CryptoIcon } from '@/components/CryptoIcon'
import { QRCodeScanner } from '@/components/QRCodeScanner'
import { SendConfirmationModal } from '@/components/wallet/SendConfirmationModal'
import { useWallets } from '@/hooks/useWallets'
import { useTransactions } from '@/hooks/useTransactions'
import { useWalletAddresses } from '@/hooks/useWalletAddresses'
import { useMultipleWalletBalances } from '@/hooks/useWallet'
import { useSendTransaction } from '@/hooks/useSendTransaction'
import { use2FAStatus } from '@/hooks/use2FAStatus'
import { transactionService } from '@/services/transactionService'

export const WalletPage = () => {
  const [showBalances, setShowBalances] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'send' | 'receive'>('overview')
  const [selectedWalletForReceive, setSelectedWalletForReceive] = useState<number>(0)
  const [showInfoModal, setShowInfoModal] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [scannedAddress, setScannedAddress] = useState<string>('')
  
  // Estados para envio de transações
  const [sendAmount, setSendAmount] = useState<string>('')
  const [sendToAddress, setSendToAddress] = useState<string>('')
  const [showSendConfirmModal, setShowSendConfirmModal] = useState(false)
  
  // Novos estados para seleção de token e rede no tab Receber
  const [selectedToken, setSelectedToken] = useState<string>('USDT') // Token mais usado
  const [selectedNetwork, setSelectedNetwork] = useState<string>('polygon') // Rede mais barata
  
  // Hook de envio de transações
  const {
    validateAddress,
    validationResult,
    isValidating,
    estimateFee,
    feeEstimates,
    isEstimatingFee,
    sendTransaction,
    sendResult,
    isSending,
    sendError,
    sendSuccess,
    reset: resetSend
  } = useSendTransaction({
    onSuccess: (data) => {
      toast.success(
        <div>
          <p className="font-semibold">Transação enviada com sucesso!</p>
          <p className="text-xs">TX: {data.tx_hash.slice(0, 10)}...</p>
        </div>,
        { duration: 5000 }
      )
      setShowSendConfirmModal(false)
      setSendAmount('')
      setSendToAddress('')
      setActiveTab('transactions')
      refreshTransactions()
    },
    onError: (error) => {
      toast.error(error.message)
    }
  })
  
  // Usar dados reais da API
  const { wallets: apiWallets, isLoading, error } = useWallets()
  
  // Verificar status do 2FA
  const { data: twoFAStatus } = use2FAStatus()
  
  // Debug: Log 2FA status
  useEffect(() => {
    console.log('[WalletPage] 2FA Status:', twoFAStatus)
  }, [twoFAStatus])
  
  // Copiar endereço escaneado para o campo de envio
  useEffect(() => {
    if (scannedAddress) {
      setSendToAddress(scannedAddress)
      // Limpar após copiar
      setScannedAddress('')
    }
  }, [scannedAddress])
  
  // Buscar saldos reais de todas as carteiras
  const walletIds = useMemo(() => apiWallets?.map(w => w.id) || [], [apiWallets])
  const balancesQueries = useMultipleWalletBalances(walletIds)
  
  // Buscar transações reais do blockchain para a primeira carteira
  const firstWalletId = useMemo(() => apiWallets?.[0]?.id, [apiWallets])
  const { 
    transactions: apiTransactions, 
    isLoading: transactionsLoading,
    refreshTransactions 
  } = useTransactions({ 
    wallet_id: firstWalletId, // Buscar transações reais do blockchain
    limit: 50 
  })

  // Carregar preferências de rede do localStorage (13 blockchains independentes)
  // Nota: USDT e USDC são tokens, não blockchains - aparecem nos seletores de cada rede
  const [networkPreferences, setNetworkPreferences] = useState(() => {
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
      xrp: true
    }
    
    // Merge saved preferences with defaults to handle new cryptocurrencies
    if (saved) {
      const savedPrefs = JSON.parse(saved)
      return { ...defaultPreferences, ...savedPrefs }
    }
    
    return defaultPreferences
  })

  const [showAllNetworks, setShowAllNetworks] = useState(() => {
    const saved = localStorage.getItem('wallet_show_all_networks')
    return saved !== null ? saved === 'true' : true
  })

  // Expandir carteira multi para mostrar todas as redes disponíveis com saldos reais
  const wallets = useMemo(() => {
    const expandedWallets: any[] = []
    
    apiWallets.forEach((wallet, walletIndex) => {
      // Buscar saldos reais desta carteira
      const balanceQuery = balancesQueries[walletIndex]
      const realBalances = balanceQuery?.data || {}
      
      if (wallet.network === 'multi') {
        // Para carteiras multi, criar entradas para cada rede suportada (15 blockchains independentes)
        const supportedNetworks = [
          { network: 'bitcoin', symbol: 'BTC', color: 'from-orange-400 to-orange-600' },
          { network: 'ethereum', symbol: 'ETH', color: 'from-blue-400 to-purple-600' },
          { network: 'polygon', symbol: 'MATIC', color: 'from-purple-400 to-purple-600' },
          { network: 'bsc', symbol: 'BNB', color: 'from-yellow-400 to-yellow-600' },
          { network: 'tron', symbol: 'TRX', color: 'from-red-400 to-red-600' },
          { network: 'base', symbol: 'BASE', color: 'from-blue-500 to-blue-700' },
          { network: 'solana', symbol: 'SOL', color: 'from-purple-500 to-pink-500' },
          { network: 'litecoin', symbol: 'LTC', color: 'from-gray-400 to-gray-600' },
          { network: 'dogecoin', symbol: 'DOGE', color: 'from-yellow-300 to-yellow-500' },
          { network: 'cardano', symbol: 'ADA', color: 'from-blue-500 to-blue-700' },
          { network: 'avalanche', symbol: 'AVAX', color: 'from-red-500 to-red-700' },
          { network: 'polkadot', symbol: 'DOT', color: 'from-pink-500 to-pink-700' },
          { network: 'chainlink', symbol: 'LINK', color: 'from-blue-600 to-blue-800' },
          { network: 'shiba', symbol: 'SHIB', color: 'from-orange-500 to-red-500' },
          { network: 'xrp', symbol: 'XRP', color: 'from-gray-600 to-gray-800' }
        ]
        
        // Filtrar redes baseado nas preferências do usuário (se modo customizado)
        const filteredNetworks = showAllNetworks 
          ? supportedNetworks 
          : supportedNetworks.filter(net => networkPreferences[net.network as keyof typeof networkPreferences])
        
        filteredNetworks.forEach(({ network, symbol, color }) => {
          // Buscar saldo real desta rede
          const networkBalance = realBalances[network]
          const nativeBalance = networkBalance ? parseFloat(networkBalance.balance || '0') : 0
          const balanceUSD = networkBalance ? parseFloat(networkBalance.balance_usd || '0') : 0
          const balanceBRL = networkBalance ? parseFloat(networkBalance.balance_brl || '0') : 0
          
          expandedWallets.push({
            id: `${wallet.id}-${network}`,
            walletId: wallet.id,
            name: `${wallet.name} (${symbol})`,
            symbol: symbol,
            network: network,
            balance: nativeBalance,
            balanceUSD: balanceUSD,
            balanceBRL: balanceBRL,
            change24h: 0,
            color: color,
            address: '' // Será preenchido pelo hook useWalletAddresses
          })
        })
      } else {
        // Para carteiras específicas, adicionar normalmente com saldo real
        let color = 'from-blue-400 to-blue-600'
        let symbol = wallet.network.toUpperCase()
        
        if (wallet.network === 'bitcoin' || wallet.network === 'btc') {
          color = 'from-orange-400 to-orange-600'
          symbol = 'BTC'
        } else if (wallet.network === 'ethereum' || wallet.network === 'eth') {
          color = 'from-blue-400 to-purple-600'
          symbol = 'ETH'
        }
        
        // Buscar saldo real da rede específica
        const networkBalance = realBalances[wallet.network]
        const nativeBalance = networkBalance ? parseFloat(networkBalance.balance || '0') : 0
        const balanceUSD = networkBalance ? parseFloat(networkBalance.balance_usd || '0') : 0
        const balanceBRL = networkBalance ? parseFloat(networkBalance.balance_brl || '0') : 0
        
        expandedWallets.push({
          id: wallet.id,
          walletId: wallet.id,
          name: wallet.name,
          symbol: symbol,
          network: wallet.network,
          balance: nativeBalance,
          balanceUSD: balanceUSD,
          balanceBRL: balanceBRL,
          change24h: 0,
          color: color,
          address: wallet.first_address || ''
        })
      }
    })
    
    return expandedWallets
  }, [apiWallets, networkPreferences, showAllNetworks, balancesQueries])

  // Buscar endereços específicos para carteiras multi (13 blockchains)
  const multiWallet = apiWallets.find(w => w.network === 'multi')
  const networksList = multiWallet ? [
    'bitcoin', 'ethereum', 'polygon', 'bsc', 'tron', 'base',
    'solana', 'litecoin', 'dogecoin', 'cardano', 'avalanche',
    'polkadot', 'chainlink', 'shiba', 'xrp'
  ] : []
  const { addresses: networkAddresses } = useWalletAddresses(
    multiWallet?.id?.toString(),
    networksList
  )

  // Atualizar endereços das carteiras expandidas
  const walletsWithAddresses = useMemo(() => {
    return wallets.map(wallet => {
      if (wallet.walletId && networkAddresses[wallet.network]) {
        return {
          ...wallet,
          address: networkAddresses[wallet.network]
        }
      }
      return wallet
    })
  }, [wallets, networkAddresses])

  // Mapear transações da API para o formato do componente
  const userAddresses = walletsWithAddresses.map(w => w.address)
  const transactions = useMemo(() => {
    return apiTransactions.map((tx) => {
      const txType = transactionService.getTransactionType(tx, userAddresses)
      const amount = parseFloat(tx.amount)
      
      return {
        id: tx.id,
        type: txType,
        amount: amount,
        symbol: tx.token_symbol || tx.network.toUpperCase(),
        usdAmount: 0, // TODO: Calcular valor em USD
        status: tx.status === 'confirmed' ? 'completed' : tx.status,
        timestamp: new Date(tx.created_at).toLocaleString('pt-BR'),
        hash: transactionService.formatHash(tx.hash),
        fullHash: tx.hash,
        explorerUrl: transactionService.getExplorerUrl(tx.network, tx.hash)
      }
    })
  }, [apiTransactions, userAddresses])

  const totalBalanceUSD = walletsWithAddresses.reduce((sum, wallet) => sum + wallet.balanceUSD, 0)

  // Função para copiar texto com feedback
  const copyToClipboard = (text: string, message: string = 'Copiado para a área de transferência!') => {
    navigator.clipboard.writeText(text)
    toast.success(message, {
      duration: 3000,
      position: 'bottom-center',
      style: {
        background: '#10b981',
        color: '#fff',
      },
      icon: '✓',
    })
  }

  // Funções para envio de transações
  const handleSendPreview = async () => {
    const selectedWallet = walletsWithAddresses[selectedWalletForReceive]

    if (!selectedWallet) {
      toast.error('Selecione uma carteira')
      return
    }

    if (!sendToAddress.trim()) {
      toast.error('Digite o endereço de destino')
      return
    }

    if (!sendAmount || parseFloat(sendAmount) <= 0) {
      toast.error('Digite um valor válido')
      return
    }

    // Validar endereço
    await validateAddress(sendToAddress, selectedWallet.network)
    
    if (!validationResult?.valid) {
      toast.error('Endereço inválido para esta rede')
      return
    }

    // Estimar taxas
    await estimateFee(
      selectedWallet.walletId,
      sendToAddress,
      sendAmount,
      selectedWallet.network
    )

    // 🔥 NOVO: Buscar status 2FA AGORA (antes de abrir modal)
    console.log('[DEBUG] Checking 2FA status before opening modal...')
    console.log('[DEBUG] twoFAStatus:', twoFAStatus)
    
    // Mostrar modal de confirmação
    setShowSendConfirmModal(true)
  }
  
  const handleSendConfirm = async (feeLevel: 'slow' | 'standard' | 'fast', twoFactorToken?: string) => {
    const selectedWallet = walletsWithAddresses[selectedWalletForReceive]
    
    if (!selectedWallet) return

    console.log('[DEBUG] Sending transaction:', {
      wallet_id: selectedWallet.walletId,
      has_2fa_token: !!twoFactorToken,
      token_length: twoFactorToken?.length,
      token_value: twoFactorToken // Remover depois do debug
    })

    await sendTransaction({
      wallet_id: selectedWallet.walletId,
      to_address: sendToAddress,
      amount: sendAmount,
      network: selectedWallet.network,
      fee_level: feeLevel,
      note: 'Envio via HOLDWallet',
      two_factor_token: twoFactorToken
    })
  }


  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando carteiras...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <Link 
            to="/wallet/create"
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeira Carteira
          </Link>
        </div>
      </div>
    )
  }

  // Empty state
  if (walletsWithAddresses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Wallet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Nenhuma carteira encontrada
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Comece criando sua primeira carteira
          </p>
          <Link 
            to="/wallet/create"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            <Plus className="w-5 h-5 mr-2" />
            Criar Carteira Principal
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast Container */}
      <Toaster />
      
      {/* QR Code Scanner Modal */}
      <QRCodeScanner
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={(address) => {
          setScannedAddress(address)
          toast.success('Endereço escaneado com sucesso!')
        }}
      />
      
      {/* Modal de Informações Importantes */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200">
            {/* Header do Modal */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-2xl p-6">
              <div className="flex items-center gap-3 text-white">
                <AlertCircle className="w-8 h-8" />
                <h3 className="text-xl font-bold">IMPORTANTE!</h3>
              </div>
            </div>
            
            {/* Conteúdo do Modal */}
            <div className="p-6 space-y-4">
              {/* Resumo com Ícones */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border-2 border-blue-200 dark:border-blue-700">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  Você vai receber:
                </p>
                <div className="flex items-center gap-3 mb-4">
                  <CryptoIcon symbol={selectedToken} size={48} />
                  <div>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {selectedToken}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {selectedToken === 'USDT' && 'Tether'}
                      {selectedToken === 'USDC' && 'USD Coin'}
                      {selectedToken === 'BTC' && 'Bitcoin'}
                      {selectedToken === 'ETH' && 'Ethereum'}
                      {selectedToken === 'BNB' && 'Binance Coin'}
                      {selectedToken === 'MATIC' && 'Polygon'}
                      {selectedToken === 'TRX' && 'Tron'}
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-blue-200 dark:border-blue-700">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    Na rede:
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                        {selectedNetwork.toUpperCase()}
                      </span>
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {selectedNetwork === 'polygon' && '(Taxas: $0.01-$0.10)'}
                      {selectedNetwork === 'tron' && '(TRC-20)'}
                      {selectedNetwork === 'ethereum' && '(ERC-20)'}
                      {selectedNetwork === 'bsc' && '(BEP-20)'}
                      {selectedNetwork === 'base' && '(Layer 2)'}
                      {selectedNetwork === 'bitcoin' && '(Native)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Instrução Principal */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border-l-4 border-green-500">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-900 dark:text-green-100 mb-1">
                      Confirme com o remetente
                    </p>
                    <p className="text-sm text-green-800 dark:text-green-200">
                      Ele deve enviar <strong>{selectedToken}</strong> pela rede{' '}
                      <strong>{selectedNetwork.toUpperCase()}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Aviso Crítico */}
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border-l-4 border-red-500">
                <div className="flex items-start gap-2">
                  <Shield className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900 dark:text-red-100 mb-1">
                      Rede errada = PERDA TOTAL!
                    </p>
                    <p className="text-sm text-red-800 dark:text-red-200">
                      Se o remetente usar uma rede diferente, você perderá seus fundos permanentemente.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="p-6 pt-0">
              <button
                onClick={() => setShowInfoModal(false)}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-semibold"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            Carteiras
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Gerencie suas criptomoedas e moedas tradicionais
          </p>
        </div>
        
        <div className="flex gap-3">
          <Link
            to="/wallet/settings"
            className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Settings className="w-4 h-4 mr-2" />
            Configurações
          </Link>
          <button 
            onClick={() => setShowQRScanner(true)}
            className="inline-flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <QrCode className="w-4 h-4 mr-2" />
            Escanear QR
          </button>
          <Link 
            to="/wallet/create"
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar Carteira Principal
          </Link>
        </div>
      </div>

      {/* Total Balance Card */}
      <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Saldo Total</h2>
            <button
              onClick={() => setShowBalances(!showBalances)}
              className="p-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-all"
            >
              {showBalances ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
          </div>
          
          <div className="mb-2">
            <span className="text-4xl font-bold">
              {showBalances ? `$${totalBalanceUSD.toFixed(2)}` : '••••••'}
            </span>
            <span className="text-blue-200 ml-2">USD</span>
          </div>
          
          <div className="flex items-center gap-2 text-green-200">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">+2.45% (últimas 24h)</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="space-y-3">
        {/* Settings Info Badge */}
        {!showAllNetworks && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-800 dark:text-blue-200">
                Modo customizado ativo - Mostrando apenas redes selecionadas
              </span>
            </div>
            <Link
              to="/wallet/settings"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Alterar
            </Link>
          </div>
        )}
        
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Visão Geral', icon: Wallet },
          { id: 'transactions', label: 'Transações', icon: Clock },
          { id: 'send', label: 'Enviar', icon: Send },
          { id: 'receive', label: 'Receber', icon: Download }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-md font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {walletsWithAddresses.map((wallet) => (
            <div key={wallet.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-50 dark:bg-gray-700 rounded-xl flex items-center justify-center p-2">
                    <CryptoIcon symbol={wallet.symbol} size={40} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{wallet.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{wallet.symbol}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    aria-label="Enviar criptomoeda"
                    className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  <button 
                    aria-label="Receber criptomoeda"
                    className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <div>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {showBalances ? wallet.balance.toFixed(wallet.symbol === 'BRL' ? 2 : 6) : '••••••'}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 ml-2">{wallet.symbol}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 dark:text-gray-400">
                    {showBalances ? `$${wallet.balanceUSD.toFixed(2)}` : '••••••'}
                  </span>
                  <div className={`flex items-center gap-1 text-sm ${
                    wallet.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {wallet.change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {Math.abs(wallet.change24h)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Transações Recentes</h3>
            <button
              onClick={() => refreshTransactions()}
              disabled={transactionsLoading}
              className="inline-flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {transactionsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Clock className="w-4 h-4 mr-2" />
                  Atualizar
                </>
              )}
            </button>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {transactions.length === 0 ? (
              <div className="p-12 text-center">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Nenhuma transação encontrada
                </p>
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        tx.type === 'receive' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      }`}>
                        {tx.type === 'receive' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-base text-gray-900 dark:text-white">
                            {tx.type === 'receive' ? 'Recebido' : 'Enviado'}
                          </span>
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            tx.status === 'completed'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : tx.status === 'failed'
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          }`}>
                            {tx.status === 'completed' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {tx.status === 'completed' ? 'Concluída' : tx.status === 'failed' ? 'Falhou' : 'Pendente'}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-1">
                          <span className="font-medium">{tx.timestamp}</span>
                          <button 
                            onClick={() => {
                              if (tx.fullHash) {
                                copyToClipboard(tx.fullHash, 'Hash da transação copiado!')
                              }
                            }}
                            className="flex items-center gap-1.5 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          >
                            <span className="font-mono">{tx.hash}</span>
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {tx.explorerUrl && (
                          <a
                            href={tx.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                          >
                            <span>Ver no explorador</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`flex items-center justify-end gap-2 font-bold text-lg mb-1 ${
                        tx.type === 'receive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        <span>{tx.type === 'receive' ? '+' : '-'}{tx.amount}</span>
                        <CryptoIcon symbol={tx.symbol} size={24} />
                      </div>
                      {tx.usdAmount > 0 && (
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          ${tx.usdAmount.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'send' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                  <Send className="w-4 h-4 text-white" />
                </div>
                Enviar Criptomoeda
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Transfira seus ativos para outra carteira
              </p>
            </div>
            <Link
              to="/wallet/networks"
              className="inline-flex items-center px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <AlertCircle className="w-3 h-3 mr-1.5" />
              Comparar Redes
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Coluna Esquerda: Seleção e Dados */}
            <div className="space-y-3">
              {/* Passo 1: Selecionar Carteira */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Passo 1</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">De qual carteira enviar?</p>
                  </div>
                </div>
                
                {/* Seletor Visual de Carteiras */}
                <div className="space-y-2">
                  {walletsWithAddresses.map((wallet, index) => (
                    <button
                      key={wallet.id}
                      onClick={() => setSelectedWalletForReceive(index)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                        selectedWalletForReceive === index
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CryptoIcon symbol={wallet.symbol} size={28} />
                        <div className="text-left">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{wallet.symbol}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{wallet.network.toUpperCase()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {wallet.balance.toFixed(6)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ${wallet.balanceUSD.toFixed(2)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Info da Rede Selecionada */}
              {walletsWithAddresses[selectedWalletForReceive] && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3 mb-3">
                    <CryptoIcon symbol={walletsWithAddresses[selectedWalletForReceive].symbol} size={32} />
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Rede Blockchain:</p>
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {walletsWithAddresses[selectedWalletForReceive].network.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg p-3 space-y-1">
                    {walletsWithAddresses[selectedWalletForReceive].network === 'bitcoin' && (
                      <p>• Bitcoin Network (BTC) - Confirmação: ~10-60 min</p>
                    )}
                    {walletsWithAddresses[selectedWalletForReceive].network === 'ethereum' && (
                      <>
                        <p>• Ethereum Network (ERC-20) - Gas fees variáveis</p>
                        <p>• Suporta: ETH, USDT, USDC, e todos os tokens ERC-20</p>
                      </>
                    )}
                    {walletsWithAddresses[selectedWalletForReceive].network === 'bsc' && (
                      <>
                        <p>• Binance Smart Chain (BEP-20) - Gas fees baixos</p>
                        <p>• Suporta: BNB, USDT (BEP-20), BUSD, e tokens BEP-20</p>
                      </>
                    )}
                    {walletsWithAddresses[selectedWalletForReceive].network === 'polygon' && (
                      <>
                        <p>• Polygon Network (MATIC) - Gas fees muito baixos</p>
                        <p>• Suporta: MATIC, USDT, USDC, e tokens Polygon</p>
                      </>
                    )}
                    {walletsWithAddresses[selectedWalletForReceive].network === 'tron' && (
                      <>
                        <p>• Tron Network (TRC-20) - Gas fees extremamente baixos</p>
                        <p>• Suporta: TRX, USDT (TRC-20), e tokens TRC-20</p>
                      </>
                    )}
                    {walletsWithAddresses[selectedWalletForReceive].network === 'base' && (
                      <>
                        <p>• Base Network (Ethereum L2) - Gas fees reduzidos</p>
                        <p>• Suporta: ETH, USDC, e tokens Base</p>
                      </>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Coluna Direita: Destinatário e Valor */}
            <div className="space-y-3">
              {/* Passo 2: Endereço do Destinatário */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Send className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Passo 2</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Para onde enviar?</p>
                  </div>
                </div>
                
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Endereço do Destinatário
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={sendToAddress}
                    onChange={(e) => setSendToAddress(e.target.value)}
                    placeholder="Digite, cole ou escaneie o endereço"
                    className="w-full px-3 py-3 pr-20 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-mono"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <button
                      type="button"
                      onClick={() => setShowQRScanner(true)}
                      className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                      title="Escanear QR Code"
                    >
                      <QrCode className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText()
                          setSendToAddress(text)
                          toast.success('Endereço colado!')
                        } catch (err) {
                          toast.error('Erro ao colar endereço')
                        }
                      }}
                      className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                      title="Colar endereço"
                    >
                      <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex items-start gap-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2 border border-yellow-200 dark:border-yellow-800">
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    Confirme que o destinatário aceita a rede{' '}
                    <span className="font-bold">
                      {walletsWithAddresses[selectedWalletForReceive]?.network.toUpperCase()}
                    </span>
                  </p>
                </div>
              </div>

              {/* Passo 3: Valor a Enviar */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                    <CircleDollarSign className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Passo 3</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Quanto enviar?</p>
                  </div>
                </div>
                
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Valor
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <CryptoIcon symbol={walletsWithAddresses[selectedWalletForReceive]?.symbol} size={24} />
                  </div>
                  <input
                    type="number"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.000001"
                    className="w-full pl-12 pr-16 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-semibold"
                  />
                  <button 
                    type="button"
                    onClick={() => setSendAmount(walletsWithAddresses[selectedWalletForReceive]?.balance.toString() || '0')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
                  >
                    MAX
                  </button>
                </div>
                
                {/* Saldo Disponível */}
                <div className="mt-3 bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Saldo disponível:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {walletsWithAddresses[selectedWalletForReceive]?.balance.toFixed(6)}{' '}
                      {walletsWithAddresses[selectedWalletForReceive]?.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Valor em USD:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      ${walletsWithAddresses[selectedWalletForReceive]?.balanceUSD.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Avisos e Resumo */}
          <div className="space-y-3">
            {/* Resumo da Transação */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Resumo da Transação</h4>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">De:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {walletsWithAddresses[selectedWalletForReceive]?.symbol} ({walletsWithAddresses[selectedWalletForReceive]?.network.toUpperCase()})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Taxa estimada:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {walletsWithAddresses[selectedWalletForReceive]?.network === 'polygon' && '$0.01 - $0.10'}
                    {walletsWithAddresses[selectedWalletForReceive]?.network === 'ethereum' && '$5 - $50'}
                    {walletsWithAddresses[selectedWalletForReceive]?.network === 'bsc' && '$0.10 - $1'}
                    {walletsWithAddresses[selectedWalletForReceive]?.network === 'tron' && '$0.01 - $2'}
                    {walletsWithAddresses[selectedWalletForReceive]?.network === 'base' && '$0.01 - $0.50'}
                    {walletsWithAddresses[selectedWalletForReceive]?.network === 'bitcoin' && '$1 - $5'}
                  </span>
                </div>
              </div>
            </div>

            {/* Aviso de Taxa */}
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-yellow-800 dark:text-yellow-200">
                  <p className="font-semibold mb-1">Importante - Taxa de Rede (Gas Fee)</p>
                  <p>
                    A taxa será deduzida automaticamente. Certifique-se de ter saldo suficiente em{' '}
                    <span className="font-bold">{walletsWithAddresses[selectedWalletForReceive]?.symbol}</span>{' '}
                    para cobrir a transação + taxa.
                  </p>
                </div>
              </div>
            </div>

            {/* Botão de Enviar */}
            <button 
              onClick={handleSendPreview}
              disabled={isValidating || isEstimatingFee || isSending}
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-4 rounded-lg hover:from-orange-600 hover:to-red-700 transition-all font-bold text-base flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {(isValidating || isEstimatingFee) ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Validando...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Revisar e Enviar
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'receive' && (
        <div className="space-y-4">
          {/* Header com ação */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <Download className="w-4 h-4 text-white" />
                </div>
                Receber Criptomoeda
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Compartilhe seu endereço para receber pagamentos
              </p>
            </div>
            <Link
              to="/wallet/networks"
              className="inline-flex items-center px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <AlertCircle className="w-3 h-3 mr-1.5" />
              Comparar Redes
            </Link>
          </div>

          <div className="space-y-4">
            {walletsWithAddresses.length > 0 ? (
              <>
                {/* Layout Principal: Grid 2 colunas */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Coluna Esquerda: Seletores */}
                  <div className="space-y-3">
                    {/* Token Selector - PASSO 1 */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                          <CircleDollarSign className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Passo 1</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">O que deseja receber?</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {/* Stablecoins */}
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                            <span>💎</span> Stablecoins (Mais Usados)
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {['USDT', 'USDC'].map((token) => (
                              <button
                                key={token}
                                onClick={() => {
                                  setSelectedToken(token)
                                  setSelectedNetwork('polygon')
                                  const walletIndex = walletsWithAddresses.findIndex(
                                    w => w.network === 'polygon'
                                  )
                                  if (walletIndex !== -1) {
                                    setSelectedWalletForReceive(walletIndex)
                                  }
                                }}
                                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                                  selectedToken === token
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                                }`}
                              >
                                <CryptoIcon symbol={token} size={24} />
                                <div className="text-left">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{token}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {token === 'USDT' ? 'Tether' : 'USD Coin'}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Moedas Nativas */}
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                            <span>🔷</span> Moedas Nativas
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { symbol: 'BTC', name: 'Bitcoin', network: 'bitcoin' },
                              { symbol: 'ETH', name: 'Ethereum', network: 'ethereum' },
                              { symbol: 'BNB', name: 'Binance', network: 'bsc' },
                              { symbol: 'MATIC', name: 'Polygon', network: 'polygon' },
                              { symbol: 'TRX', name: 'Tron', network: 'tron' }
                            ].map(({ symbol, name, network }) => (
                              <button
                                key={symbol}
                                onClick={() => {
                                  setSelectedToken(symbol)
                                  setSelectedNetwork(network)
                                  const walletIndex = walletsWithAddresses.findIndex(
                                    w => w.network === network
                                  )
                                  if (walletIndex !== -1) {
                                    setSelectedWalletForReceive(walletIndex)
                                  }
                                }}
                                className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                                  selectedToken === symbol
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                                }`}
                              >
                                <CryptoIcon symbol={symbol} size={24} />
                                <div className="text-left">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{symbol}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{name}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Network Selector - PASSO 2 (só para tokens multi-rede) */}
                    {(selectedToken === 'USDT' || selectedToken === 'USDC') && (
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg shadow-sm border border-green-200 dark:border-green-700 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                            <Zap className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-green-900 dark:text-green-100">Passo 2</h3>
                            <p className="text-xs text-green-700 dark:text-green-300">Escolha a rede blockchain</p>
                          </div>
                        </div>
                        
                        {/* Redes Recomendadas */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-green-700 dark:text-green-300 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Recomendadas (Taxas Baixas)
                          </p>
                          <div className="space-y-2">
                            {[
                              { network: 'polygon', name: 'Polygon', fee: '$0.01-$0.10', icon: 'MATIC' },
                              { network: 'tron', name: 'Tron (TRC-20)', fee: '$0.01-$2', icon: 'TRX' },
                              { network: 'base', name: 'Base (L2)', fee: '$0.01-$0.50', icon: 'ETH' },
                              { network: 'bsc', name: 'BSC (BEP-20)', fee: '$0.10-$1', icon: 'BNB' }
                            ].map(({ network, name, fee, icon }) => (
                              <button
                                key={network}
                                onClick={() => {
                                  setSelectedNetwork(network)
                                  const walletIndex = walletsWithAddresses.findIndex(w => w.network === network)
                                  if (walletIndex !== -1) {
                                    setSelectedWalletForReceive(walletIndex)
                                  }
                                }}
                                className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                                  selectedNetwork === network
                                    ? 'border-green-500 bg-white dark:bg-gray-800 shadow-md'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <CryptoIcon symbol={icon} size={28} />
                                  <div className="text-left">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{name}</p>
                                    <p className="text-xs text-green-600 dark:text-green-400 font-medium">{fee}</p>
                                  </div>
                                </div>
                                {selectedNetwork === network && (
                                  <CheckCircle className="w-5 h-5 text-green-500" />
                                )}
                              </button>
                            ))}
                          </div>
                          
                          {/* Ethereum (Taxas Altas) */}
                          <div className="pt-2 border-t border-green-200 dark:border-green-800">
                            <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400 flex items-center gap-1 mb-2">
                              <AlertCircle className="w-3 h-3" />
                              Taxas Altas
                            </p>
                            <button
                              onClick={() => {
                                setSelectedNetwork('ethereum')
                                const walletIndex = walletsWithAddresses.findIndex(w => w.network === 'ethereum')
                                if (walletIndex !== -1) {
                                  setSelectedWalletForReceive(walletIndex)
                                }
                              }}
                              className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                                selectedNetwork === 'ethereum'
                                  ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 shadow-md'
                                  : 'border-gray-200 dark:border-gray-700 hover:border-yellow-300 dark:hover:border-yellow-600'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <CryptoIcon symbol="ETH" size={28} />
                                <div className="text-left">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Ethereum (ERC-20)</p>
                                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">$5-$50</p>
                                </div>
                              </div>
                              {selectedNetwork === 'ethereum' && (
                                <CheckCircle className="w-5 h-5 text-yellow-500" />
                              )}
                            </button>
                          </div>
                        </div>
                        
                        {/* Dica contextual */}
                        <div className="mt-3 flex items-start gap-2 bg-white dark:bg-gray-800 rounded-lg p-3 border border-green-200 dark:border-green-800">
                          <Info className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-gray-700 dark:text-gray-300">
                            <strong className="text-green-600 dark:text-green-400">Dica:</strong>{' '}
                            {selectedNetwork === 'polygon' && 'Polygon tem as menores taxas! Ideal para transferências frequentes.'}
                            {selectedNetwork === 'tron' && 'Tron é muito popular para USDT por causa das taxas baixíssimas!'}
                            {selectedNetwork === 'ethereum' && 'Ethereum tem taxas altas. Considere Polygon ou Tron para economizar.'}
                            {selectedNetwork === 'bsc' && 'BSC é muito usado por exchanges como Binance.'}
                            {selectedNetwork === 'base' && 'Base é uma Layer 2 do Ethereum com taxas reduzidas.'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Resumo Compacto */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Você vai receber:</p>
                            <p className="text-sm font-bold text-gray-900 dark:text-white">
                              {selectedToken} <span className="text-xs font-normal text-gray-500">via {selectedNetwork.toUpperCase()}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 rounded text-xs font-medium text-blue-700 dark:text-blue-300">
                            {selectedNetwork === 'ethereum' && 'ERC-20'}
                            {selectedNetwork === 'bsc' && 'BEP-20'}
                            {selectedNetwork === 'polygon' && 'Polygon'}
                            {selectedNetwork === 'tron' && 'TRC-20'}
                            {selectedNetwork === 'base' && 'Base L2'}
                            {selectedNetwork === 'bitcoin' && 'Native'}
                          </span>
                          <button
                            onClick={() => setShowInfoModal(true)}
                            className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-lg transition-colors"
                            aria-label="Ver informações importantes"
                          >
                            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Coluna Direita: QR Code e Endereço */}
                  <div className="space-y-3">
                    {/* QR Code Card com Logo Central */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                      <div className="text-center">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                          Escaneie para enviar
                        </h3>
                        {walletsWithAddresses[selectedWalletForReceive]?.address ? (
                          <div className="relative inline-block">
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
                              <QRCodeSVG 
                                value={walletsWithAddresses[selectedWalletForReceive].address}
                                size={220}
                                level="H"
                                includeMargin={false}
                                className="w-full h-auto"
                              />
                            </div>
                            
                            {/* Logo da moeda no centro do QR Code */}
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                              <div className="bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg border-4 border-white dark:border-gray-800">
                                <CryptoIcon symbol={selectedToken} size={48} />
                              </div>
                            </div>
                            
                            {/* Decorative corners */}
                            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-blue-500 rounded-tl-lg"></div>
                            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-blue-500 rounded-tr-lg"></div>
                            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-blue-500 rounded-bl-lg"></div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-blue-500 rounded-br-lg"></div>
                          </div>
                        ) : (
                          <div className="w-56 h-56 mx-auto bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            <div className="text-center">
                              <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Endereço não disponível
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Address Card - REDUZIR */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Seu Endereço {selectedToken}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={walletsWithAddresses[selectedWalletForReceive]?.address || 'Carregando...'}
                          readOnly
                          aria-label={`Endereço para receber ${selectedToken}`}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-mono"
                        />
                        <button 
                          onClick={() => {
                            const address = walletsWithAddresses[selectedWalletForReceive]?.address
                            if (address) {
                              copyToClipboard(address, `Endereço ${selectedToken} copiado!`)
                            }
                          }}
                          className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all"
                          aria-label="Copiar endereço"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Compartilhe este endereço para receber {selectedToken}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Instruções de Segurança */}
                <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-lg border border-red-300 dark:border-red-700 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <h3 className="text-base font-semibold text-red-900 dark:text-red-100">
                      Atenção Crítica!
                    </h3>
                  </div>
                  <ul className="space-y-2 text-xs text-red-800 dark:text-red-200">
                    <li className="flex items-start gap-2">
                      <span className="font-bold mt-0.5">1.</span>
                      <span><strong>Confirme a rede:</strong> O remetente DEVE enviar pela rede <strong className="text-red-600 dark:text-red-400">{selectedNetwork.toUpperCase()}</strong>. Rede errada = perda total!</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold mt-0.5">2.</span>
                      <span><strong>Verifique o endereço:</strong> Confira caractere por caractere antes de compartilhar. Um erro pode custar caro.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold mt-0.5">3.</span>
                      <span><strong>Teste com valor pequeno:</strong> Para transferências grandes, peça para enviar $1 primeiro como teste.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold mt-0.5">4.</span>
                      <span><strong>Cuidado com golpes:</strong> Nunca compartilhe suas chaves privadas. A HOLDWallet NUNCA pede.</span>
                    </li>
                  </ul>
                </div>

              </>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                Nenhuma carteira disponível
              </p>
            )}
          </div>
        </div>
      )}

      {/* Send Confirmation Modal */}
      {walletsWithAddresses[selectedWalletForReceive] && (
        <SendConfirmationModal
          isOpen={showSendConfirmModal}
          onClose={() => setShowSendConfirmModal(false)}
          onConfirm={handleSendConfirm}
          fromAddress={walletsWithAddresses[selectedWalletForReceive].address}
          toAddress={sendToAddress}
          amount={sendAmount}
          symbol={walletsWithAddresses[selectedWalletForReceive].symbol}
          network={walletsWithAddresses[selectedWalletForReceive].network}
          feeEstimates={feeEstimates}
          isLoading={isSending}
          requires2FA={twoFAStatus?.enabled || false}
        />
      )}
    </div>
  )
}
