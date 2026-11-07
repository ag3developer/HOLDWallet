import { useMemo } from 'react'
import { useWallets, useMultipleWalletBalances } from '@/hooks/useWallet'
import { useWalletAddresses } from '@/hooks/useWalletAddresses'
import { useMarketPrices } from '@/hooks/useMarketPrices'
import { symbolFromKey } from '@/pages/dashboard/home/usePortfolio'

/**
 * Catálogo da carteira organizado por ATIVO (o que o usuário pensa) e não por rede.
 * A primeira rede de cada ativo é a recomendada (taxa mais baixa).
 */
export interface NetworkInfo {
  id: string
  name: string
  standard?: string
  fee: 'min' | 'low' | 'var' | 'high'
}

export const NETWORKS: Record<string, NetworkInfo> = {
  polygon: { id: 'polygon', name: 'Polygon', standard: 'POS', fee: 'min' },
  tron: { id: 'tron', name: 'Tron', standard: 'TRC-20', fee: 'min' },
  base: { id: 'base', name: 'Base', standard: 'L2', fee: 'min' },
  bsc: { id: 'bsc', name: 'BNB Smart Chain', standard: 'BEP-20', fee: 'low' },
  ethereum: { id: 'ethereum', name: 'Ethereum', standard: 'ERC-20', fee: 'high' },
  bitcoin: { id: 'bitcoin', name: 'Bitcoin', fee: 'var' },
  solana: { id: 'solana', name: 'Solana', standard: 'SPL', fee: 'min' },
  litecoin: { id: 'litecoin', name: 'Litecoin', fee: 'var' },
  dogecoin: { id: 'dogecoin', name: 'Dogecoin', fee: 'var' },
  cardano: { id: 'cardano', name: 'Cardano', fee: 'min' },
  avalanche: { id: 'avalanche', name: 'Avalanche C-Chain', fee: 'low' },
  polkadot: { id: 'polkadot', name: 'Polkadot', fee: 'var' },
  xrp: { id: 'xrp', name: 'XRP Ledger', fee: 'min' },
}

export interface AssetInfo {
  symbol: string
  name: string
  networks: string[]
  stable?: boolean
}

export const ASSETS: AssetInfo[] = [
  { symbol: 'USDT', name: 'Tether', networks: ['polygon', 'tron', 'base', 'bsc', 'ethereum', 'avalanche'], stable: true },
  { symbol: 'BTC', name: 'Bitcoin', networks: ['bitcoin'] },
  { symbol: 'ETH', name: 'Ethereum', networks: ['base', 'ethereum'] },
  { symbol: 'USDC', name: 'USD Coin', networks: ['polygon', 'base', 'solana', 'bsc', 'ethereum', 'avalanche'], stable: true },
  { symbol: 'SOL', name: 'Solana', networks: ['solana'] },
  { symbol: 'BNB', name: 'BNB', networks: ['bsc'] },
  { symbol: 'XRP', name: 'XRP', networks: ['xrp'] },
  { symbol: 'TRX', name: 'TRON', networks: ['tron'] },
  { symbol: 'MATIC', name: 'Polygon (POL)', networks: ['polygon'] },
  { symbol: 'LTC', name: 'Litecoin', networks: ['litecoin'] },
  { symbol: 'DOGE', name: 'Dogecoin', networks: ['dogecoin'] },
  { symbol: 'ADA', name: 'Cardano', networks: ['cardano'] },
  { symbol: 'AVAX', name: 'Avalanche', networks: ['avalanche'] },
  { symbol: 'DOT', name: 'Polkadot', networks: ['polkadot'] },
  { symbol: 'LINK', name: 'Chainlink', networks: ['ethereum'] },
  { symbol: 'SHIB', name: 'Shiba Inu', networks: ['ethereum'] },
  { symbol: 'TRAY', name: 'Trayon', networks: ['polygon'] },
]
export const assetInfo = (symbol: string): AssetInfo =>
  ASSETS.find(a => a.symbol === symbol) || { symbol, name: symbol, networks: [] }

/** Redes que geram endereço (tokens usam o endereço da rede onde vivem). */
export const ADDRESS_NETWORKS = Object.keys(NETWORKS)

export interface Position {
  key: string
  network: string
  /** Carteira (id) que guarda este saldo */
  walletId: string
  /** Saldo exato como veio da API (sem perda de precisão em tokens de 18 casas) */
  raw: string
  quantity: number
  valueUSD: number
  address: string
}

export interface WalletAsset extends AssetInfo {
  quantity: number
  valueUSD: number
  priceUSD: number
  change24h: number
  share: number
  positions: Position[]
}

/** Rede de uma chave de saldo da API ("polygon_usdt" → polygon, "base" → base). */
const networkFromKey = (key: string) => key.toLowerCase().split('_')[0] || key

/** Saldos de todas as carteiras agrupados por ativo, com a quebra por rede e os endereços. */
export function useWalletAssets(priorityNetwork?: string) {
  const { data: wallets, isLoading: walletsLoading } = useWallets()
  const walletIds = useMemo(() => wallets?.map((w: any) => String(w.id)) || [], [wallets])
  const balanceQueries = useMultipleWalletBalances(walletIds)
  const balancesKey = balanceQueries.map(q => q.dataUpdatedAt).join('|')
  const multiWallet = wallets?.find((w: any) => w.network === 'multi')
  const { addresses, isPriorityLoaded } = useWalletAddresses(multiWallet?.id?.toString(), ADDRESS_NETWORKS, priorityNetwork)
  const { prices, isLoading: pricesLoading } = useMarketPrices(
    ASSETS.map(a => a.symbol),
    'USD'
  )

  const result = useMemo(() => {
    const bySymbol = new Map<string, { positions: Position[]; fallbackPrice: number }>()
    balanceQueries.forEach((q, qi) => {
      const data = q.data as Record<string, any> | undefined
      if (!data) return
      for (const [key, nb] of Object.entries<any>(data)) {
        const quantity = Number.parseFloat(nb?.balance || '0')
        if (!quantity || quantity <= 0) continue
        const symbol = symbolFromKey(key)
        const network = networkFromKey(key)
        const entry = bySymbol.get(symbol) || { positions: [], fallbackPrice: 0 }
        const existing = entry.positions.find(p => p.network === network)
        if (existing) existing.quantity += quantity
        else
          entry.positions.push({
            key,
            network,
            walletId: walletIds[qi] || '',
            raw: String(nb?.balance ?? '0'),
            quantity,
            valueUSD: 0,
            address: addresses[network] || nb?.address || '',
          })
        const p = Number.parseFloat(nb?.price_usd || '0')
        if (p > 0) entry.fallbackPrice = p
        bySymbol.set(symbol, entry)
      }
    })

    let totalUSD = 0
    const held: WalletAsset[] = []
    for (const [symbol, entry] of bySymbol) {
      const info = assetInfo(symbol)
      const priceUSD = prices[symbol]?.price || entry.fallbackPrice || (info.stable ? 1 : 0)
      const positions = entry.positions
        .map(p => ({ ...p, valueUSD: p.quantity * priceUSD }))
        .sort((a, b) => b.quantity - a.quantity)
      const quantity = positions.reduce((s, p) => s + p.quantity, 0)
      const valueUSD = quantity * priceUSD
      totalUSD += valueUSD
      held.push({ ...info, quantity, valueUSD, priceUSD, change24h: prices[symbol]?.change24h ?? 0, share: 0, positions })
    }
    held.forEach(a => (a.share = totalUSD > 0 ? (a.valueUSD / totalUSD) * 100 : 0))
    held.sort((a, b) => b.valueUSD - a.valueUSD)

    const change24h =
      totalUSD > 0 ? held.reduce((s, a) => s + a.change24h * a.valueUSD, 0) / totalUSD : 0
    return { held, totalUSD, change24h }
  }, [balancesKey, addresses, prices]) // eslint-disable-line react-hooks/exhaustive-deps

  const loading = walletsLoading || balanceQueries.some(q => q.isLoading)
  return {
    ...result,
    prices,
    addresses,
    addressesReady: isPriorityLoaded,
    loading,
    pricesLoading,
    hasWallet: !!wallets?.length,
    multiWalletId: multiWallet?.id ? String(multiWallet.id) : undefined,
  }
}
