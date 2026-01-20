/**
 * 🛡️ HOLD Wallet - Admin Wallets Page
 * ====================================
 *
 * Página de gestão de carteiras blockchain no painel administrativo.
 * Mostra todas as carteiras criadas, endereços e redes suportadas.
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  Wallet,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Copy,
  ExternalLink,
  User,
  Globe,
  Clock,
  Hash,
  Shield,
  Zap,
  DollarSign,
  Coins,
  Lock,
  Trash2,
  AlertTriangle,
  ShieldX,
  X,
  Fingerprint,
  CheckCircle,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Helper para obter token
const getAuthToken = () => {
  try {
    const stored = localStorage.getItem('hold-wallet-auth')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed?.state?.token
    }
  } catch {
    return null
  }
  return null
}

// Tipos
interface WalletAddress {
  id: string
  address: string
  network: string
  address_type: string
  is_active: boolean
  created_at: string | null
}

interface AdminWallet {
  id: string
  user_id: string
  username: string
  email: string
  name: string
  network: string
  is_active: boolean
  supported_networks: string[]
  total_addresses: number
  addresses_by_network: Record<string, WalletAddress[]>
  balances: Record<string, { available: number; locked: number; total: number }>
  created_at: string | null
  updated_at: string | null
}

interface WalletStats {
  total_wallets: number
  wallets_with_balance: number
  wallets_today: number
  total_btc: number
  total_eth: number
  total_usdt: number
  total_brl: number
  balances_by_crypto?: Array<{
    cryptocurrency: string
    total_available: number
    total_locked: number
    wallets_count: number
  }>
}

// Cores por rede
const NETWORK_COLORS: Record<string, string> = {
  bitcoin: 'bg-orange-500',
  ethereum: 'bg-blue-500',
  polygon: 'bg-purple-500',
  bsc: 'bg-yellow-500',
  tron: 'bg-red-500',
  base: 'bg-blue-600',
  solana: 'bg-gradient-to-r from-purple-500 to-pink-500',
  litecoin: 'bg-gray-500',
  dogecoin: 'bg-yellow-400',
  cardano: 'bg-blue-700',
  avalanche: 'bg-red-600',
  polkadot: 'bg-pink-600',
  chainlink: 'bg-blue-800',
  shiba: 'bg-orange-600',
  xrp: 'bg-gray-700',
  multi: 'bg-gradient-to-r from-blue-500 to-purple-500',
}

// Ícones de rede (texto curto)
const NETWORK_SYMBOLS: Record<string, string> = {
  bitcoin: 'BTC',
  ethereum: 'ETH',
  polygon: 'MATIC',
  bsc: 'BNB',
  tron: 'TRX',
  base: 'BASE',
  solana: 'SOL',
  litecoin: 'LTC',
  dogecoin: 'DOGE',
  cardano: 'ADA',
  avalanche: 'AVAX',
  polkadot: 'DOT',
  chainlink: 'LINK',
  shiba: 'SHIB',
  xrp: 'XRP',
  multi: 'MULTI',
}

// URLs dos logos das criptomoedas
const NETWORK_LOGOS: Record<string, string> = {
  bitcoin: 'https://cryptologos.cc/logos/bitcoin-btc-logo.svg',
  ethereum: 'https://cryptologos.cc/logos/ethereum-eth-logo.svg',
  polygon: 'https://cryptologos.cc/logos/polygon-matic-logo.svg',
  bsc: 'https://cryptologos.cc/logos/bnb-bnb-logo.svg',
  tron: 'https://cryptologos.cc/logos/tron-trx-logo.svg',
  base: 'https://icons.llamao.fi/icons/chains/rsz_base.jpg',
  solana: 'https://cryptologos.cc/logos/solana-sol-logo.svg',
  litecoin: 'https://cryptologos.cc/logos/litecoin-ltc-logo.svg',
  dogecoin: 'https://cryptologos.cc/logos/dogecoin-doge-logo.svg',
  cardano: 'https://cryptologos.cc/logos/cardano-ada-logo.svg',
  avalanche: 'https://cryptologos.cc/logos/avalanche-avax-logo.svg',
  polkadot: 'https://cryptologos.cc/logos/polkadot-new-dot-logo.svg',
  chainlink: 'https://cryptologos.cc/logos/chainlink-link-logo.svg',
  shiba: 'https://cryptologos.cc/logos/shiba-inu-shib-logo.svg',
  xrp: 'https://cryptologos.cc/logos/xrp-xrp-logo.svg',
  multi: '',
}

// Componente de Logo da Rede
const NetworkLogo: React.FC<{ network: string; size?: 'sm' | 'md' | 'lg' }> = ({
  network,
  size = 'md',
}) => {
  const logoUrl = NETWORK_LOGOS[network]
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={network}
        className={`${sizeClasses[size]} object-contain`}
        onError={e => {
          // Fallback para texto se a imagem falhar
          e.currentTarget.style.display = 'none'
        }}
      />
    )
  }

  // Fallback para texto
  return (
    <span className={`${sizeClasses[size]} flex items-center justify-center text-xs font-bold`}>
      {NETWORK_SYMBOLS[network]?.slice(0, 2) || '??'}
    </span>
  )
}

// Helper para gerar URL do explorer
function getExplorerUrl(network: string, address: string): string {
  const explorers: Record<string, string> = {
    bitcoin: `https://blockstream.info/address/${address}`,
    ethereum: `https://etherscan.io/address/${address}`,
    polygon: `https://polygonscan.com/address/${address}`,
    bsc: `https://bscscan.com/address/${address}`,
    tron: `https://tronscan.org/#/address/${address}`,
    base: `https://basescan.org/address/${address}`,
    solana: `https://solscan.io/account/${address}`,
    litecoin: `https://blockchair.com/litecoin/address/${address}`,
    dogecoin: `https://blockchair.com/dogecoin/address/${address}`,
    cardano: `https://cardanoscan.io/address/${address}`,
    avalanche: `https://snowtrace.io/address/${address}`,
    xrp: `https://xrpscan.com/account/${address}`,
  }
  return explorers[network] || `#`
}

export const AdminWalletsPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [networkFilter, setNetworkFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [expandedWallets, setExpandedWallets] = useState<Set<string>>(new Set())
  const [expandedNetworks, setExpandedNetworks] = useState<Set<string>>(new Set())
  const [blockchainBalances, setBlockchainBalances] = useState<Record<string, any>>({})
  const [loadingBalances, setLoadingBalances] = useState<Set<string>>(new Set())
  const [syncingBlockchain, setSyncingBlockchain] = useState(false)

  // Estados para ações de segurança (apenas delete e blacklist usam modal)
  const [actionModal, setActionModal] = useState<{
    type: 'delete' | 'blacklist' | null
    wallet: AdminWallet | null
    address?: string
    network?: string
  }>({ type: null, wallet: null })
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionReason, setActionReason] = useState('')
  const [authMethod, setAuthMethod] = useState<'2fa' | 'biometry'>('2fa')
  const [hasBiometry, setHasBiometry] = useState(false)
  const [biometryVerified, setBiometryVerified] = useState(false)

  const limit = 20

  // Função para consultar saldos blockchain
  const fetchBlockchainBalances = async (walletId: string) => {
    const token = getAuthToken()
    if (!token) {
      toast.error('Token não encontrado')
      return
    }

    setLoadingBalances(prev => new Set(prev).add(walletId))

    try {
      const response = await fetch(`${API_URL}/admin/wallets/${walletId}/blockchain-balances`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Falha ao consultar blockchain')
      }

      const data = await response.json()

      if (data.success && data.data) {
        setBlockchainBalances(prev => ({
          ...prev,
          [walletId]: data.data,
        }))

        const totalBalances = data.data.total_balances || {}
        const balancesList = Object.entries(totalBalances)
          .filter(([_, val]) => (val as number) > 0)
          .map(([symbol, val]) => `${symbol}: ${(val as number).toFixed(6)}`)
          .join(', ')

        if (balancesList) {
          toast.success(`Saldos encontrados: ${balancesList}`)
        } else {
          toast.success('Consulta concluída - Sem saldos')
        }
      }
    } catch (error) {
      console.error('Erro ao consultar blockchain:', error)
      toast.error('Erro ao consultar blockchain')
    } finally {
      setLoadingBalances(prev => {
        const newSet = new Set(prev)
        newSet.delete(walletId)
        return newSet
      })
    }
  }

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Função para sincronizar TODOS os saldos blockchain
  const syncAllBlockchainBalances = async () => {
    const token = getAuthToken()
    if (!token) {
      toast.error('Token não encontrado')
      return
    }

    setSyncingBlockchain(true)
    const loadingToast = toast.loading('Sincronizando saldos blockchain...')

    try {
      const response = await fetch(`${API_URL}/admin/wallets/sync-all-blockchain-balances`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Falha ao sincronizar blockchain')
      }

      const data = await response.json()

      if (data.success) {
        toast.dismiss(loadingToast)

        const totals = data.data?.total_balances || {}
        const balancesList = Object.entries(totals)
          .filter(([_, val]) => (val as number) > 0)
          .map(([symbol, val]) => `${symbol}: ${(val as number).toFixed(4)}`)
          .join(', ')

        if (balancesList) {
          toast.success(`✅ Atualizado! ${balancesList}`, { duration: 4000 })
        } else {
          toast.success('✅ Atualização concluída')
        }

        // Recarregar estatísticas do banco de dados
        refetchStats()
      }
    } catch (error) {
      console.error('Erro ao sincronizar blockchain:', error)
      toast.dismiss(loadingToast)
      toast.error('Erro ao sincronizar blockchain')
    } finally {
      setSyncingBlockchain(false)
    }
  }

  // ============== FUNCOES DE SEGURANCA ==============

  // Excluir carteira
  const handleDeleteWallet = async () => {
    if (!actionModal.wallet) {
      toast.error('Selecione uma carteira')
      return
    }

    if (authMethod === '2fa' && !twoFactorCode) {
      toast.error('Código 2FA obrigatório')
      return
    }

    if (authMethod === 'biometry' && !biometryVerified) {
      toast.error('Biometria não verificada')
      return
    }

    const token = getAuthToken()
    if (!token) {
      toast.error('Token não encontrado')
      return
    }

    setActionLoading(true)

    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }

      if (authMethod === '2fa') {
        headers['X-2FA-Code'] = twoFactorCode
      } else {
        headers['X-Biometry-Verified'] = 'true'
      }

      // Usar force=true para permitir exclusão de carteiras com saldo (maliciosas)
      const response = await fetch(`${API_URL}/admin/wallets/${actionModal.wallet.id}?force=true`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({
          reason: actionReason || 'Exclusão administrativa',
          blacklist_addresses: true,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Falha ao excluir carteira')
      }

      toast.success(
        `Carteira de ${actionModal.wallet.email} excluída e endereços adicionados à blacklist`
      )
      closeModal()
      refetchWallets()
      refetchStats()
    } catch (error: any) {
      console.error('Erro ao excluir carteira:', error)
      toast.error(error.message || 'Erro ao excluir carteira')
    } finally {
      setActionLoading(false)
    }
  }

  // Adicionar endereço à blacklist
  const handleBlacklistAddress = async () => {
    if (!actionModal.address || !actionModal.network) {
      toast.error('Selecione um endereço')
      return
    }

    if (authMethod === '2fa' && !twoFactorCode) {
      toast.error('Código 2FA obrigatório')
      return
    }

    if (authMethod === 'biometry' && !biometryVerified) {
      toast.error('Biometria não verificada')
      return
    }

    const token = getAuthToken()
    if (!token) {
      toast.error('Token não encontrado')
      return
    }

    setActionLoading(true)

    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      }

      if (authMethod === '2fa') {
        headers['X-2FA-Code'] = twoFactorCode
      } else {
        headers['X-Biometry-Verified'] = 'true'
      }

      const response = await fetch(`${API_URL}/admin/wallets/blacklist/address`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          address: actionModal.address,
          network: actionModal.network,
          reason: actionReason || 'Endereço malicioso',
          user_id: actionModal.wallet?.user_id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Falha ao adicionar à blacklist')
      }

      toast.success(`Endereço adicionado à blacklist`)
      closeModal()
    } catch (error: any) {
      console.error('Erro ao adicionar à blacklist:', error)
      toast.error(error.message || 'Erro ao adicionar à blacklist')
    } finally {
      setActionLoading(false)
    }
  }

  // Verificar se o usuário tem biometria disponível
  const checkBiometryAvailable = async () => {
    try {
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(`${API_URL}/auth/webauthn/status`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        // Backend retorna has_biometric, não has_credentials
        setHasBiometry(data.has_biometric || data.has_credentials || false)
        console.log('🔐 Biometria disponível:', data.has_biometric || data.has_credentials)
      }
    } catch (error) {
      console.error('Erro ao verificar biometria:', error)
    }
  }

  // Verificar biometria disponível ao montar
  useEffect(() => {
    checkBiometryAvailable()
  }, [])

  // Quando o modal abre e tem biometria, definir como método padrão
  useEffect(() => {
    if (actionModal.type && hasBiometry) {
      setAuthMethod('biometry')
    }
  }, [actionModal.type, hasBiometry])

  // Estado para loading da biometria
  const [biometryLoading, setBiometryLoading] = useState(false)

  // Autenticar com biometria - VERSÃO MELHORADA
  const authenticateWithBiometry = async (): Promise<boolean> => {
    // Verificar se WebAuthn está disponível
    if (!window.PublicKeyCredential) {
      toast.error('Seu navegador não suporta autenticação biométrica')
      return false
    }

    const token = getAuthToken()
    if (!token) {
      toast.error('Token não encontrado')
      return false
    }

    setBiometryLoading(true)
    const loadingToast = toast.loading('Iniciando autenticação biométrica...')

    try {
      console.log('🔐 Iniciando autenticação WebAuthn...')

      // 1. Obter opções de autenticação do servidor
      const optionsResponse = await fetch(`${API_URL}/auth/webauthn/authenticate/options`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!optionsResponse.ok) {
        const errorData = await optionsResponse.json().catch(() => ({}))
        console.error('Erro ao obter opções:', errorData)
        throw new Error(errorData.detail || 'Falha ao iniciar autenticação biométrica')
      }

      const optionsData = await optionsResponse.json()
      console.log('📦 Opções recebidas:', optionsData)

      // O backend pode retornar em formatos diferentes
      const options = optionsData.options || optionsData

      if (!options || !options.challenge) {
        throw new Error('Resposta do servidor inválida - challenge não encontrado')
      }

      // Converter Base64URL para ArrayBuffer
      const base64URLToArrayBuffer = (base64url: string): ArrayBuffer => {
        // Garantir que é uma string
        if (typeof base64url !== 'string') {
          console.error('base64url não é string:', base64url)
          throw new Error('Formato inválido de credencial')
        }
        const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
        const padLen = (4 - (base64.length % 4)) % 4
        const padded = base64 + '='.repeat(padLen)
        const binary = atob(padded)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i)
        }
        return bytes.buffer
      }

      // Preparar opções para WebAuthn
      const publicKeyOptions: PublicKeyCredentialRequestOptions = {
        challenge: base64URLToArrayBuffer(options.challenge),
        timeout: options.timeout || 120000, // 2 minutos
        rpId: options.rpId || window.location.hostname,
        userVerification: (options.userVerification as UserVerificationRequirement) || 'preferred',
      }

      // Adicionar credenciais permitidas se existirem
      if (
        options.allowCredentials &&
        Array.isArray(options.allowCredentials) &&
        options.allowCredentials.length > 0
      ) {
        publicKeyOptions.allowCredentials = options.allowCredentials.map((cred: any) => ({
          type: 'public-key' as const,
          id: base64URLToArrayBuffer(cred.id),
          transports: cred.transports || ['internal', 'hybrid', 'usb', 'ble', 'nfc'],
        }))
      }

      console.log('🔑 Opções WebAuthn preparadas:', {
        rpId: publicKeyOptions.rpId,
        timeout: publicKeyOptions.timeout,
        credentialsCount: publicKeyOptions.allowCredentials?.length || 0,
      })

      toast.dismiss(loadingToast)
      toast.loading('Aguardando autenticação biométrica...', { id: 'biometry-waiting' })

      // 2. Solicitar autenticação biométrica
      // Isso deve abrir o diálogo do sistema (Touch ID, Face ID, etc.)
      console.log('🖐️ Chamando navigator.credentials.get()...')

      const credential = (await navigator.credentials.get({
        publicKey: publicKeyOptions,
        mediation: 'optional',
      })) as PublicKeyCredential | null

      toast.dismiss('biometry-waiting')

      if (!credential) {
        throw new Error('Autenticação cancelada pelo usuário')
      }

      console.log('✅ Credencial obtida:', credential.id)

      // Converter ArrayBuffer para Base64URL
      const arrayBufferToBase64URL = (buffer: ArrayBuffer): string => {
        const bytes = new Uint8Array(buffer)
        let binary = ''
        for (const byte of bytes) {
          binary += String.fromCharCode(byte)
        }
        const base64 = btoa(binary)
        return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
      }

      const assertionResponse = credential.response as AuthenticatorAssertionResponse

      // 3. Enviar para verificação no servidor
      const verifyToast = toast.loading('Verificando autenticação...')

      const verifyResponse = await fetch(`${API_URL}/auth/webauthn/authenticate/verify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: {
            id: credential.id,
            rawId: arrayBufferToBase64URL(credential.rawId),
            response: {
              clientDataJSON: arrayBufferToBase64URL(assertionResponse.clientDataJSON),
              authenticatorData: arrayBufferToBase64URL(assertionResponse.authenticatorData),
              signature: arrayBufferToBase64URL(assertionResponse.signature),
              userHandle: assertionResponse.userHandle
                ? arrayBufferToBase64URL(assertionResponse.userHandle)
                : null,
            },
            type: credential.type,
            authenticatorAttachment: (credential as any).authenticatorAttachment || 'platform',
          },
        }),
      })

      toast.dismiss(verifyToast)

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json().catch(() => ({}))
        console.error('Erro na verificação:', errorData)
        throw new Error(errorData.detail || 'Falha na verificação biométrica')
      }

      const verifyData = await verifyResponse.json()
      console.log('🎉 Verificação completa:', verifyData)

      if (verifyData.success || verifyData.verified) {
        setBiometryVerified(true)
        toast.success('✅ Biometria verificada com sucesso!')
        return true
      }

      throw new Error('Verificação biométrica falhou')
    } catch (error: any) {
      toast.dismiss(loadingToast)
      toast.dismiss('biometry-waiting')

      console.error('❌ Erro na autenticação biométrica:', error)

      // Mensagens de erro mais específicas
      if (error.name === 'NotAllowedError') {
        toast.error('Autenticação cancelada ou negada pelo usuário')
      } else if (error.name === 'SecurityError') {
        toast.error('Erro de segurança - verifique se está usando HTTPS')
      } else if (error.name === 'NotSupportedError') {
        toast.error('Autenticação biométrica não suportada neste dispositivo')
      } else if (error.name === 'InvalidStateError') {
        toast.error('Nenhuma credencial biométrica encontrada')
      } else if (error.name === 'AbortError') {
        toast.error('Autenticação foi cancelada')
      } else if (error.message?.includes('challenge')) {
        toast.error('Erro ao obter desafio do servidor')
      } else {
        toast.error(error.message || 'Erro na autenticação biométrica')
      }

      return false
    } finally {
      setBiometryLoading(false)
    }
  }

  // Fechar modal
  const closeModal = () => {
    setActionModal({ type: null, wallet: null })
    setTwoFactorCode('')
    setActionReason('')
    // Se tem biometria, usar como padrão
    setAuthMethod(hasBiometry ? 'biometry' : '2fa')
    setBiometryVerified(false)
  }

  // Executar ação baseada no tipo (apenas delete e blacklist usam modal)
  const executeAction = async () => {
    // Se usar biometria e ainda não verificou, verificar primeiro
    if (authMethod === 'biometry' && !biometryVerified) {
      const verified = await authenticateWithBiometry()
      if (!verified) return
    }

    switch (actionModal.type) {
      case 'delete':
        handleDeleteWallet()
        break
      case 'blacklist':
        handleBlacklistAddress()
        break
    }
  }

  // Buscar estatísticas
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['admin', 'wallets', 'stats'],
    queryFn: async () => {
      const token = getAuthToken()
      const response = await fetch(`${API_URL}/admin/wallets/stats`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch stats')
      const data = await response.json()
      return data.data as WalletStats
    },
    staleTime: 5 * 60 * 1000, // 5 minutos - dados considerados frescos
    gcTime: 30 * 60 * 1000, // 30 minutos - mantém em cache
    refetchOnWindowFocus: false, // Não recarrega ao focar na janela
    refetchOnMount: false, // Não recarrega ao montar se tiver cache
  })

  // Buscar carteiras
  const {
    data: walletsData,
    isLoading: walletsLoading,
    refetch: refetchWallets,
  } = useQuery({
    queryKey: ['admin', 'wallets', 'list', page, limit, debouncedSearch, networkFilter],
    queryFn: async () => {
      const token = getAuthToken()
      const params = new URLSearchParams({
        skip: String((page - 1) * limit),
        limit: String(limit),
      })
      if (debouncedSearch) params.append('search', debouncedSearch)
      if (networkFilter !== 'all') params.append('network', networkFilter)

      const response = await fetch(`${API_URL}/admin/wallets?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      if (!response.ok) throw new Error('Failed to fetch wallets')
      const data = await response.json()
      return data.data as { items: AdminWallet[]; total: number }
    },
    staleTime: 3 * 60 * 1000, // 3 minutos - dados considerados frescos
    gcTime: 15 * 60 * 1000, // 15 minutos - mantém em cache
    refetchOnWindowFocus: false, // Não recarrega ao focar na janela
    placeholderData: previousData => previousData, // Mantém dados anteriores enquanto carrega
  })

  const handleRefresh = () => {
    refetchStats()
    refetchWallets()
    toast.success('Dados atualizados')
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copiado!`)
  }

  const toggleWalletExpand = (walletId: string) => {
    const newExpanded = new Set(expandedWallets)
    if (newExpanded.has(walletId)) {
      newExpanded.delete(walletId)
    } else {
      newExpanded.add(walletId)
    }
    setExpandedWallets(newExpanded)
  }

  const toggleNetworkExpand = (key: string) => {
    const newExpanded = new Set(expandedNetworks)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedNetworks(newExpanded)
  }

  const wallets = walletsData?.items || []
  const total = walletsData?.total || 0
  const totalPages = Math.ceil(total / limit)

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const truncateAddress = (address: string, chars = 8) => {
    if (address.length <= chars * 2) return address
    return `${address.slice(0, chars)}...${address.slice(-chars)}`
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-[#0a0a0a] p-6 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2'>
            <Wallet className='h-6 w-6 text-blue-500' />
            Carteiras Blockchain
          </h1>
          <p className='text-gray-600 dark:text-gray-400 text-sm mt-1'>
            Gestão de carteiras, endereços e redes dos usuários
          </p>
        </div>
        <div className='flex items-center gap-3'>
          <button
            onClick={handleRefresh}
            className='flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white border border-gray-200 dark:border-white/10 transition-colors'
          >
            <RefreshCw
              className={`h-4 w-4 ${statsLoading || walletsLoading ? 'animate-spin' : ''}`}
            />
            Atualizar
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <div className='bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl p-4'>
          <div className='flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-2'>
            <Wallet className='h-4 w-4' />
            Total de Carteiras
          </div>
          <div className='text-2xl font-bold text-gray-900 dark:text-white'>
            {statsLoading ? '...' : (stats?.total_wallets || 0).toLocaleString()}
          </div>
          <div className='text-xs text-green-500 mt-1'>+{stats?.wallets_today || 0} hoje</div>
        </div>

        <div className='bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl p-4'>
          <div className='flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-2'>
            <Shield className='h-4 w-4' />
            Com Saldo
          </div>
          <div className='text-2xl font-bold text-gray-900 dark:text-white'>
            {statsLoading ? '...' : (stats?.wallets_with_balance || 0).toLocaleString()}
          </div>
          <div className='text-xs text-gray-500 mt-1'>carteiras ativas</div>
        </div>

        <div className='bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl p-4'>
          <div className='flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-2'>
            <DollarSign className='h-4 w-4 text-green-500' />
            Total Stablecoins
          </div>
          <div className='text-2xl font-bold text-green-500'>
            $
            {statsLoading
              ? '...'
              : (stats?.total_usdt || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className='text-xs text-gray-500 mt-1'>USDT + USDC</div>
        </div>

        <div className='bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl p-4'>
          <div className='flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-2'>
            <Zap className='h-4 w-4 text-purple-500' />
            Cryptos com Saldo
          </div>
          <div className='text-2xl font-bold text-purple-500'>
            {statsLoading
              ? '...'
              : stats?.balances_by_crypto?.filter(b => b.total_available > 0).length || 0}
          </div>
          <div className='text-xs text-gray-500 mt-1'>moedas diferentes</div>
        </div>
      </div>

      {/* Saldos por Cryptocurrency do Banco - SEMPRE VISÍVEL */}
      <div className='bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl p-4'>
        <div className='flex items-center justify-between mb-3'>
          <div className='flex items-center gap-2'>
            <DollarSign className='h-5 w-5 text-blue-400' />
            <h3 className='text-gray-900 dark:text-white font-medium'>Saldos por Moeda</h3>
          </div>
          <button
            onClick={syncAllBlockchainBalances}
            disabled={syncingBlockchain}
            className='flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600/20 hover:bg-green-600/30 disabled:opacity-50 disabled:cursor-not-allowed text-green-600 dark:text-green-400 text-sm font-medium transition-colors border border-green-500/30'
          >
            <Zap className={`h-3.5 w-3.5 ${syncingBlockchain ? 'animate-pulse' : ''}`} />
            {syncingBlockchain ? 'Atualizando...' : 'Atualizar Saldos'}
          </button>
        </div>
        {stats?.balances_by_crypto &&
        stats.balances_by_crypto.filter(b => b.total_available > 0).length > 0 ? (
          <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3'>
            {stats.balances_by_crypto
              .filter(b => b.total_available > 0)
              .sort((a, b) => {
                // USDT/USDC primeiro, depois por valor
                const isStableA = a.cryptocurrency.includes('USD') ? 1 : 0
                const isStableB = b.cryptocurrency.includes('USD') ? 1 : 0
                if (isStableA !== isStableB) return isStableB - isStableA
                return b.total_available - a.total_available
              })
              .map(b => (
                <div key={b.cryptocurrency} className='bg-gray-100 dark:bg-white/5 rounded-lg p-3'>
                  <div className='text-xs text-gray-500 dark:text-gray-400 mb-1'>
                    {b.cryptocurrency}
                  </div>
                  <div className='text-lg font-bold text-gray-900 dark:text-white'>
                    {b.cryptocurrency.includes('USD') && '$'}
                    {b.total_available.toLocaleString('en-US', {
                      minimumFractionDigits: b.cryptocurrency.includes('USD') ? 2 : 4,
                      maximumFractionDigits: b.cryptocurrency.includes('USD') ? 2 : 6,
                    })}
                  </div>
                  <div className='text-xs text-gray-500'>{b.wallets_count} carteira(s)</div>
                </div>
              ))}
          </div>
        ) : (
          <div className='text-center py-6 text-gray-500'>
            <p>Nenhum saldo encontrado</p>
            <p className='text-sm mt-1'>
              Clique em "Atualizar Saldos" para sincronizar com a blockchain
            </p>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className='bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl p-4'>
        <div className='flex flex-col md:flex-row gap-4'>
          <div className='relative flex-1'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
            <input
              type='text'
              placeholder='Buscar por usuário ou email...'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className='w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50'
            />
          </div>

          <select
            value={networkFilter}
            onChange={e => {
              setNetworkFilter(e.target.value)
              setPage(1)
            }}
            title='Filtrar por rede'
            className='px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50'
          >
            <option value='all'>Todas as Redes</option>
            <option value='multi'>Multi-chain</option>
            <option value='bitcoin'>Bitcoin</option>
            <option value='ethereum'>Ethereum</option>
            <option value='polygon'>Polygon</option>
            <option value='bsc'>BSC</option>
            <option value='tron'>Tron</option>
            <option value='solana'>Solana</option>
          </select>
        </div>
      </div>

      {/* Lista de Carteiras */}
      <div className='space-y-4'>
        {walletsLoading ? (
          <div className='bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl p-12 text-center'>
            <RefreshCw className='h-8 w-8 animate-spin mx-auto mb-2 text-blue-500' />
            <p className='text-gray-500 dark:text-gray-400'>Carregando carteiras...</p>
          </div>
        ) : wallets.length === 0 ? (
          <div className='bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl p-12 text-center'>
            <Wallet className='h-8 w-8 mx-auto mb-2 text-gray-400 dark:text-gray-600' />
            <p className='text-gray-500 dark:text-gray-400'>Nenhuma carteira encontrada</p>
          </div>
        ) : (
          wallets.map(wallet => (
            <div
              key={wallet.id}
              className='bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden'
            >
              {/* Header da Carteira */}
              <div
                className='p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition-colors'
                onClick={() => toggleWalletExpand(wallet.id)}
              >
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-4'>
                    <div
                      className={`w-10 h-10 rounded-lg ${NETWORK_COLORS[wallet.network] || 'bg-gray-600'} flex items-center justify-center text-white text-lg`}
                    >
                      <NetworkLogo network={wallet.network} size='lg' />
                    </div>
                    <div>
                      <div className='flex items-center gap-2'>
                        <span className='text-gray-900 dark:text-white font-medium'>
                          {wallet.name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${wallet.is_active !== false ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-red-500/20 text-red-600 dark:text-red-400'}`}
                        >
                          {wallet.is_active !== false ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <div className='flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400'>
                        <User className='h-3 w-3' />
                        <span>{wallet.username}</span>
                        <span className='text-gray-400 dark:text-gray-600'>•</span>
                        <span className='text-gray-500'>{wallet.email}</span>
                      </div>
                    </div>
                  </div>
                  <div className='flex items-center gap-6'>
                    {/* Botões de Ação de Segurança */}
                    <div className='flex items-center gap-2'>
                      {/* Botão para gerenciar bloqueios - navega para página dedicada */}
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          navigate(`/admin/wallets/${wallet.id}/block`)
                        }}
                        className='p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20 transition-colors'
                        title='Gerenciar bloqueios e restricoes'
                      >
                        <Shield className='h-4 w-4' />
                      </button>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          setActionModal({ type: 'delete', wallet })
                        }}
                        className='p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 transition-colors'
                        title='Excluir carteira e adicionar à blacklist'
                      >
                        <Trash2 className='h-4 w-4' />
                      </button>
                    </div>
                    <div className='text-right'>
                      <div className='flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400'>
                        <Globe className='h-3 w-3' />
                        <span>{wallet.supported_networks?.length || 0} redes</span>
                      </div>
                      <div className='flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400'>
                        <Hash className='h-3 w-3' />
                        <span>{wallet.total_addresses || 0} endereços</span>
                      </div>
                    </div>
                    <div className='text-right'>
                      <div className='flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400'>
                        <Clock className='h-3 w-3' />
                        <span>{formatDate(wallet.created_at)}</span>
                      </div>
                    </div>
                    {expandedWallets.has(wallet.id) ? (
                      <ChevronDown className='h-5 w-5 text-gray-400' />
                    ) : (
                      <ChevronRight className='h-5 w-5 text-gray-400' />
                    )}
                  </div>
                </div>

                {/* Badges de Redes */}
                {wallet.supported_networks && wallet.supported_networks.length > 0 && (
                  <div className='flex flex-wrap gap-1 mt-3'>
                    {wallet.supported_networks.map(net => (
                      <span
                        key={net}
                        className={`px-2 py-0.5 rounded text-xs text-white flex items-center gap-1 ${NETWORK_COLORS[net] || 'bg-gray-600'}`}
                      >
                        <NetworkLogo network={net} size='sm' />
                        {net}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Detalhes Expandidos */}
              {expandedWallets.has(wallet.id) && (
                <div className='border-t border-gray-200 dark:border-white/10 p-4 bg-gray-50 dark:bg-white/[0.02]'>
                  {/* Info IDs */}
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-4'>
                    <div className='bg-gray-100 dark:bg-white/5 rounded-lg p-3'>
                      <div className='text-xs text-gray-500 mb-1'>Wallet ID</div>
                      <div className='flex items-center gap-2'>
                        <code className='text-sm text-gray-900 dark:text-white font-mono'>
                          {truncateAddress(wallet.id, 12)}
                        </code>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            copyToClipboard(wallet.id, 'Wallet ID')
                          }}
                          className='text-gray-400 hover:text-gray-900 dark:hover:text-white'
                          title='Copiar Wallet ID'
                        >
                          <Copy className='h-3 w-3' />
                        </button>
                      </div>
                    </div>
                    <div className='bg-gray-100 dark:bg-white/5 rounded-lg p-3'>
                      <div className='text-xs text-gray-500 mb-1'>User ID</div>
                      <div className='flex items-center gap-2'>
                        <code className='text-sm text-gray-900 dark:text-white font-mono'>
                          {truncateAddress(wallet.user_id, 12)}
                        </code>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            copyToClipboard(wallet.user_id, 'User ID')
                          }}
                          className='text-gray-400 hover:text-gray-900 dark:hover:text-white'
                          title='Copiar User ID'
                        >
                          <Copy className='h-3 w-3' />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Botão Consultar Blockchain e Saldos */}
                  <div className='mb-4'>
                    <div className='flex items-center justify-between mb-3'>
                      <h4 className='text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2'>
                        <Coins className='h-4 w-4 text-yellow-500' />
                        Saldos Blockchain (Tempo Real)
                      </h4>
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          fetchBlockchainBalances(wallet.id)
                        }}
                        disabled={loadingBalances.has(wallet.id)}
                        className='flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-600 dark:text-blue-400 border border-blue-500/30 transition-colors disabled:opacity-50'
                      >
                        {loadingBalances.has(wallet.id) ? (
                          <>
                            <RefreshCw className='h-4 w-4 animate-spin' />
                            Consultando...
                          </>
                        ) : (
                          <>
                            <Zap className='h-4 w-4' />
                            Consultar Blockchain
                          </>
                        )}
                      </button>
                    </div>

                    {/* Mostrar saldos blockchain se já consultados */}
                    {blockchainBalances[wallet.id] && (
                      <div className='bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-4'>
                        <div className='flex items-center gap-2 mb-3'>
                          <DollarSign className='h-4 w-4 text-green-500 dark:text-green-400' />
                          <span className='text-sm text-gray-600 dark:text-gray-300'>
                            Saldos consultados na blockchain:
                          </span>
                        </div>

                        {/* Total de saldos */}
                        {blockchainBalances[wallet.id].total_balances &&
                        Object.keys(blockchainBalances[wallet.id].total_balances).length > 0 ? (
                          <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
                            {Object.entries(blockchainBalances[wallet.id].total_balances).map(
                              ([symbol, balance]) => (
                                <div
                                  key={symbol}
                                  className='bg-gray-100 dark:bg-black/30 rounded-lg p-3'
                                >
                                  <div className='text-xs text-gray-500 mb-1'>{symbol}</div>
                                  <div className='text-lg font-bold text-gray-900 dark:text-white'>
                                    {(balance as number).toFixed(
                                      symbol === 'USDT' || symbol === 'USDC' ? 2 : 8
                                    )}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <div className='text-center py-4 text-gray-500'>
                            Nenhum saldo encontrado nesta carteira
                          </div>
                        )}

                        {/* Detalhes por endereço */}
                        {blockchainBalances[wallet.id].balances &&
                          blockchainBalances[wallet.id].balances.some(
                            (b: any) => b.balance > 0
                          ) && (
                            <div className='mt-4 border-t border-gray-200 dark:border-white/10 pt-3'>
                              <div className='text-xs text-gray-500 mb-2'>
                                Detalhes por endereço:
                              </div>
                              <div className='space-y-2 max-h-48 overflow-y-auto'>
                                {blockchainBalances[wallet.id].balances
                                  .filter((b: any) => b.balance > 0)
                                  .map((bal: any) => (
                                    <div
                                      key={`${bal.network}-${bal.symbol}-${bal.address}`}
                                      className='flex items-center justify-between bg-gray-100 dark:bg-black/20 rounded px-3 py-2 text-sm'
                                    >
                                      <div className='flex items-center gap-2'>
                                        <span
                                          className={`px-2 py-0.5 rounded text-xs ${NETWORK_COLORS[bal.network] || 'bg-gray-600'} text-white`}
                                        >
                                          {bal.network}
                                        </span>
                                        <span className='text-gray-600 dark:text-gray-400'>
                                          {bal.type === 'token'
                                            ? `${bal.symbol} (Token)`
                                            : bal.symbol}
                                        </span>
                                      </div>
                                      <span className='text-gray-900 dark:text-white font-mono'>
                                        {bal.balance.toFixed(
                                          bal.symbol === 'USDT' || bal.symbol === 'USDC' ? 2 : 8
                                        )}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                      </div>
                    )}
                  </div>

                  {/* Endereços por Rede */}
                  {wallet.addresses_by_network &&
                    Object.keys(wallet.addresses_by_network).length > 0 && (
                      <div className='space-y-2'>
                        <h4 className='text-sm font-medium text-gray-600 dark:text-gray-400 mb-2'>
                          Endereços por Rede
                        </h4>
                        {Object.entries(wallet.addresses_by_network).map(([network, addresses]) => (
                          <div
                            key={`${wallet.id}-${network}`}
                            className='bg-gray-100 dark:bg-white/5 rounded-lg overflow-hidden'
                          >
                            <div
                              className='px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-200 dark:hover:bg-white/5'
                              onClick={e => {
                                e.stopPropagation()
                                toggleNetworkExpand(`${wallet.id}-${network}`)
                              }}
                            >
                              <div className='flex items-center gap-2'>
                                <span
                                  className={`w-6 h-6 rounded ${NETWORK_COLORS[network] || 'bg-gray-600'} flex items-center justify-center text-white text-xs`}
                                >
                                  <NetworkLogo network={network} size='sm' />
                                </span>
                                <span className='text-gray-900 dark:text-white font-medium capitalize'>
                                  {network}
                                </span>
                                <span className='text-gray-500 text-sm'>
                                  ({addresses.length} endereço{addresses.length > 1 ? 's' : ''})
                                </span>
                              </div>
                              {expandedNetworks.has(`${wallet.id}-${network}`) ? (
                                <ChevronDown className='h-4 w-4 text-gray-400' />
                              ) : (
                                <ChevronRight className='h-4 w-4 text-gray-400' />
                              )}
                            </div>

                            {expandedNetworks.has(`${wallet.id}-${network}`) && (
                              <div className='px-4 pb-3 space-y-2'>
                                {addresses.map((addr, idx) => (
                                  <div
                                    key={addr.id}
                                    className='bg-gray-200 dark:bg-black/20 rounded-lg p-3'
                                  >
                                    <div className='flex items-center justify-between'>
                                      <div className='flex-1 min-w-0'>
                                        <div className='flex items-center gap-2 mb-1'>
                                          <span className='text-xs text-gray-500'>#{idx + 1}</span>
                                          <span
                                            className={`px-1.5 py-0.5 rounded text-xs ${addr.is_active ? 'bg-green-500/20 text-green-600 dark:text-green-400' : 'bg-gray-500/20 text-gray-500 dark:text-gray-400'}`}
                                          >
                                            {addr.address_type}
                                          </span>
                                        </div>
                                        <code className='text-sm text-gray-900 dark:text-white font-mono break-all'>
                                          {addr.address}
                                        </code>
                                      </div>
                                      <div className='flex items-center gap-2 ml-4'>
                                        <button
                                          onClick={e => {
                                            e.stopPropagation()
                                            copyToClipboard(addr.address, 'Endereço')
                                          }}
                                          className='p-1.5 rounded hover:bg-gray-300 dark:hover:bg-white/10 text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                          title='Copiar endereço'
                                        >
                                          <Copy className='h-4 w-4' />
                                        </button>
                                        <a
                                          href={getExplorerUrl(network, addr.address)}
                                          target='_blank'
                                          rel='noopener noreferrer'
                                          onClick={e => e.stopPropagation()}
                                          className='p-1.5 rounded hover:bg-gray-300 dark:hover:bg-white/10 text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                          title='Ver no explorer'
                                        >
                                          <ExternalLink className='h-4 w-4' />
                                        </a>
                                        <button
                                          onClick={e => {
                                            e.stopPropagation()
                                            setActionModal({
                                              type: 'blacklist',
                                              wallet,
                                              address: addr.address,
                                              network: network,
                                            })
                                          }}
                                          className='p-1.5 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-500 dark:hover:text-red-400'
                                          title='Adicionar à blacklist'
                                        >
                                          <ShieldX className='h-4 w-4' />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                  {/* Saldos (se houver) */}
                  {wallet.balances && Object.keys(wallet.balances).length > 0 && (
                    <div className='mt-4'>
                      <h4 className='text-sm font-medium text-gray-600 dark:text-gray-400 mb-2'>
                        Saldos
                      </h4>
                      <div className='grid grid-cols-2 md:grid-cols-4 gap-2'>
                        {Object.entries(wallet.balances).map(([crypto, bal]) => (
                          <div key={crypto} className='bg-gray-100 dark:bg-white/5 rounded-lg p-3'>
                            <div className='text-xs text-gray-500 mb-1'>{crypto}</div>
                            <div className='text-gray-900 dark:text-white font-mono'>
                              {bal.total.toFixed(crypto === 'BTC' ? 8 : 4)}
                            </div>
                            {bal.locked > 0 && (
                              <div className='text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1'>
                                <Lock className='h-3 w-3' />
                                {bal.locked.toFixed(4)} bloqueado
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className='flex items-center justify-between bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-xl px-4 py-3'>
          <p className='text-sm text-gray-600 dark:text-gray-400'>
            Mostrando {(page - 1) * limit + 1} - {Math.min(page * limit, total)} de {total}
          </p>
          <div className='flex gap-2'>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className='flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              <ChevronLeft className='h-4 w-4' />
              Anterior
            </button>
            <span className='flex items-center px-3 text-gray-600 dark:text-gray-400'>
              Página {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className='flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              Próximo
              <ChevronRight className='h-4 w-4' />
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Ação com 2FA */}
      {actionModal.type && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'>
          <div className='bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl'>
            {/* Header */}
            <div
              className={`px-6 py-4 border-b border-gray-200 dark:border-white/10 rounded-t-2xl ${
                actionModal.type === 'delete'
                  ? 'bg-red-500/10'
                  : actionModal.type === 'blacklist'
                    ? 'bg-purple-500/10'
                    : 'bg-gray-500/10'
              }`}
            >
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  {actionModal.type === 'delete' && <Trash2 className='h-6 w-6 text-red-500' />}
                  {actionModal.type === 'blacklist' && (
                    <ShieldX className='h-6 w-6 text-purple-500' />
                  )}
                  <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
                    {actionModal.type === 'delete' && 'Excluir Carteira'}
                    {actionModal.type === 'blacklist' && 'Adicionar à Blacklist'}
                  </h3>
                </div>
                <button
                  onClick={closeModal}
                  className='p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors'
                  title='Fechar'
                  aria-label='Fechar modal'
                >
                  <X className='h-5 w-5' />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className='px-6 py-5'>
              {/* Aviso */}
              <div
                className={`flex items-start gap-3 p-4 rounded-xl mb-4 ${
                  actionModal.type === 'delete'
                    ? 'bg-red-500/10 border border-red-500/20'
                    : 'bg-purple-500/10 border border-purple-500/20'
                }`}
              >
                <AlertTriangle
                  className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                    actionModal.type === 'delete' ? 'text-red-500' : 'text-purple-500'
                  }`}
                />
                <div>
                  <p className='text-sm text-gray-700 dark:text-gray-300'>
                    {actionModal.type === 'delete' && (
                      <>
                        Esta ação é <strong>irreversível</strong>. A carteira será excluída e todos
                        os endereços serão adicionados à blacklist.
                      </>
                    )}
                    {actionModal.type === 'blacklist' && (
                      <>O endereço será permanentemente bloqueado para novas transações.</>
                    )}
                  </p>
                </div>
              </div>

              {/* Info da Carteira */}
              {actionModal.wallet && (
                <div className='bg-gray-100 dark:bg-white/5 rounded-xl p-4 mb-4'>
                  <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold'>
                      {actionModal.wallet.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className='font-medium text-gray-900 dark:text-white'>
                        {actionModal.wallet.username}
                      </p>
                      <p className='text-sm text-gray-500'>{actionModal.wallet.email}</p>
                    </div>
                  </div>
                  {actionModal.address && (
                    <div className='mt-3 pt-3 border-t border-gray-200 dark:border-white/10'>
                      <p className='text-xs text-gray-500 mb-1'>Endereço:</p>
                      <code className='text-xs text-gray-900 dark:text-white font-mono break-all'>
                        {actionModal.address}
                      </code>
                    </div>
                  )}
                </div>
              )}

              {/* Motivo (opcional para delete/blacklist) */}
              {(actionModal.type === 'delete' || actionModal.type === 'blacklist') && (
                <div className='mb-4'>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    Motivo (opcional)
                  </label>
                  <input
                    type='text'
                    value={actionReason}
                    onChange={e => setActionReason(e.target.value)}
                    placeholder='Ex: Atividade suspeita, fraude, etc.'
                    className='w-full px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50'
                  />
                </div>
              )}

              {/* Autenticação - Toggle entre 2FA e Biometria */}
              <div className='mb-4'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'>
                  <Shield className='h-4 w-4 inline mr-1 text-blue-500' />
                  Autenticação (obrigatório)
                </label>

                {/* Toggle de método de autenticação */}
                {hasBiometry && (
                  <div className='flex bg-gray-100 dark:bg-white/5 rounded-xl p-1 mb-4'>
                    <button
                      type='button'
                      onClick={() => setAuthMethod('2fa')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                        authMethod === '2fa'
                          ? 'bg-white dark:bg-white/10 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      <Shield className='h-4 w-4' />
                      Código 2FA
                    </button>
                    <button
                      type='button'
                      onClick={() => setAuthMethod('biometry')}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                        authMethod === 'biometry'
                          ? 'bg-white dark:bg-white/10 text-green-600 dark:text-green-400 shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      <Fingerprint className='h-4 w-4' />
                      Biometria
                    </button>
                  </div>
                )}

                {/* Input de código 2FA */}
                {authMethod === '2fa' && (
                  <>
                    <input
                      type='text'
                      inputMode='numeric'
                      maxLength={6}
                      value={twoFactorCode}
                      onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                      placeholder='000000'
                      className='w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500/50'
                    />
                    <p className='text-xs text-gray-500 mt-2'>
                      Digite o código do seu aplicativo autenticador (Google Authenticator, Authy,
                      etc.)
                    </p>
                  </>
                )}

                {/* Botão de biometria */}
                {authMethod === 'biometry' && (
                  <div className='text-center'>
                    {biometryVerified ? (
                      <div className='flex flex-col items-center gap-3 py-4'>
                        <div className='w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center'>
                          <CheckCircle className='h-8 w-8 text-green-500' />
                        </div>
                        <span className='text-green-600 dark:text-green-400 font-medium'>
                          Biometria verificada!
                        </span>
                      </div>
                    ) : biometryLoading ? (
                      <div className='flex flex-col items-center gap-3 py-6'>
                        <div className='w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse'>
                          <Fingerprint className='h-8 w-8 text-blue-500 animate-bounce' />
                        </div>
                        <span className='text-blue-600 dark:text-blue-400 font-medium'>
                          Aguardando autenticação...
                        </span>
                        <span className='text-xs text-gray-500'>
                          Complete a autenticação no seu dispositivo
                        </span>
                      </div>
                    ) : (
                      <button
                        type='button'
                        onClick={authenticateWithBiometry}
                        disabled={actionLoading || biometryLoading}
                        className='w-full flex flex-col items-center gap-3 py-6 px-4 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-2 border-dashed border-green-500/30 hover:border-green-500/50 hover:from-green-500/20 hover:to-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
                      >
                        <div className='w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center'>
                          <Fingerprint className='h-8 w-8 text-green-500' />
                        </div>
                        <span className='text-green-600 dark:text-green-400 font-medium'>
                          Clique para autenticar com biometria
                        </span>
                        <span className='text-xs text-gray-500'>
                          Touch ID, Face ID ou chave de segurança
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className='px-6 py-4 border-t border-gray-200 dark:border-white/10 flex gap-3'>
              <button
                onClick={closeModal}
                className='flex-1 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-medium transition-colors'
              >
                Cancelar
              </button>
              <button
                onClick={executeAction}
                disabled={
                  actionLoading ||
                  (authMethod === '2fa' && (!twoFactorCode || twoFactorCode.length !== 6)) ||
                  (authMethod === 'biometry' && !biometryVerified)
                }
                className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  actionModal.type === 'delete'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-purple-500 hover:bg-purple-600 text-white'
                }`}
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className='h-4 w-4 animate-spin' />
                    Processando...
                  </>
                ) : (
                  <>
                    {actionModal.type === 'delete' && <Trash2 className='h-4 w-4' />}
                    {actionModal.type === 'blacklist' && <ShieldX className='h-4 w-4' />}
                    Confirmar
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

export default AdminWalletsPage
