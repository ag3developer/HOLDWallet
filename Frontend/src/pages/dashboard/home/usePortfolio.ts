import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { apiClient } from '@/services/api'

/** Períodos do gráfico de patrimônio. */
export type Period = '24h' | '7D' | '30D' | '1A'
export const PERIODS: Period[] = ['24h', '7D', '30D', '1A']
const PERIOD_DAYS: Record<Period, number> = { '24h': 1, '7D': 7, '30D': 30, '1A': 365 }

const STABLE = new Set(['USDT', 'USDC', 'DAI', 'BUSD'])

/** Rede/token da API de saldos → símbolo do ativo. */
export const symbolFromKey = (key: string): string => {
  const k = key.toLowerCase()
  if (k.includes('_usdt')) return 'USDT'
  if (k.includes('_usdc')) return 'USDC'
  const map: Record<string, string> = {
    bitcoin: 'BTC',
    ethereum: 'ETH',
    polygon: 'MATIC',
    bsc: 'BNB',
    tron: 'TRX',
    base: 'ETH', // a moeda nativa da rede Base é ETH
    solana: 'SOL',
    litecoin: 'LTC',
    dogecoin: 'DOGE',
    cardano: 'ADA',
    avalanche: 'AVAX',
    polkadot: 'DOT',
    chainlink: 'LINK',
    shiba: 'SHIB',
    xrp: 'XRP',
  }
  return map[k] || key.toUpperCase()
}

export interface Holding {
  symbol: string
  quantity: number
  priceUSD: number
  valueUSD: number
  change24h: number
  share: number
  networks: string[]
}

interface PriceInfo {
  price: number
  change24h: number
}

/**
 * Junta os saldos de todas as carteiras e redes por ativo (BTC, USDT…),
 * ordenados pelo valor, e o total em USD.
 */
export function useHoldings(balanceData: Array<Record<string, any> | undefined>, prices: Record<string, PriceInfo>) {
  return useMemo(() => {
    const bySymbol: Record<string, { quantity: number; fallbackPrice: number; networks: Set<string> }> = {}
    const addresses = new Set<string>()

    for (const data of balanceData) {
      if (!data) continue
      for (const [key, nb] of Object.entries<any>(data)) {
        if (nb?.address) addresses.add(String(nb.address).toLowerCase())
        const qty = Number.parseFloat(nb?.balance || '0')
        if (!qty || qty <= 0) continue
        const symbol = symbolFromKey(key)
        const entry = (bySymbol[symbol] ||= { quantity: 0, fallbackPrice: 0, networks: new Set() })
        entry.quantity += qty
        entry.networks.add(key.split('_')[0] || key)
        const p = Number.parseFloat(nb?.price_usd || '0')
        if (p > 0) entry.fallbackPrice = p
      }
    }

    let totalUSD = 0
    const list = Object.entries(bySymbol).map(([symbol, e]) => {
      const priceUSD = prices[symbol]?.price || e.fallbackPrice || (STABLE.has(symbol) ? 1 : 0)
      const valueUSD = e.quantity * priceUSD
      totalUSD += valueUSD
      return {
        symbol,
        quantity: e.quantity,
        priceUSD,
        valueUSD,
        change24h: prices[symbol]?.change24h ?? 0,
        share: 0,
        networks: [...e.networks],
      }
    })
    const holdings: Holding[] = list
      .map(h => ({ ...h, share: totalUSD > 0 ? (h.valueUSD / totalUSD) * 100 : 0 }))
      .sort((a, b) => b.valueUSD - a.valueUSD)

    return { holdings, totalUSD, addresses }
  }, [balanceData, prices])
}

type Series = Array<[number, number]>

const getHistory = async (symbol: string, days: number, interval: string): Promise<Series> => {
  const res = await apiClient.get(`/prices/history/${symbol.toLowerCase()}`, {
    params: { vs_currency: 'usd', days, interval },
  })
  const prices = (res.data?.prices || []) as Series
  return prices.filter(p => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[1]))
}

const fetchHistory = async (symbol: string, days: number): Promise<Series> => {
  if (days > 30) return getHistory(symbol, days, 'daily')
  // "auto" = granularidade fina (horária); se o servidor ainda não aceitar, cai para diário.
  const fine = await getHistory(symbol, days, 'auto').catch(() => [] as Series)
  return fine.length > 2 ? fine : getHistory(symbol, days, 'daily')
}

/** Histórico de preço (USD) de vários ativos, com cache longo para não pesar no provedor. */
export function usePriceHistories(symbols: string[], days: number) {
  const queries = useQueries({
    queries: symbols.map(symbol => ({
      queryKey: ['price-history', symbol, days],
      queryFn: () => fetchHistory(symbol, days),
      staleTime: days <= 1 ? 5 * 60_000 : 30 * 60_000,
      gcTime: 60 * 60_000,
      retry: 1,
      enabled: !STABLE.has(symbol),
    })),
  })
  const isLoading = queries.some(q => q.isLoading)
  const data: Record<string, Series> = {}
  symbols.forEach((s, i) => {
    const d = queries[i]?.data
    if (d && d.length > 1) data[s] = d
  })
  return { data, isLoading }
}

export interface ChartPoint {
  t: number
  v: number
}

/**
 * Evolução do patrimônio no período: quantidade atual de cada ativo × preço de cada momento.
 * (Aproximação: não considera depósitos e saques feitos dentro do período.)
 */
export function usePortfolioSeries(holdings: Holding[], period: Period) {
  const days = PERIOD_DAYS[period]
  const volatile = holdings.filter(h => !STABLE.has(h.symbol) && h.valueUSD > 0).map(h => h.symbol)
  const { data, isLoading } = usePriceHistories(volatile, days)

  const points = useMemo<ChartPoint[]>(() => {
    if (!holdings.length) return []
    // Linha do tempo do ativo com mais pontos; os outros são alinhados pelo instante mais próximo.
    const base = Object.values(data).sort((a, b) => b.length - a.length)[0]
    if (!base) return []
    const lookup = (series: Series, t: number) => {
      let lo = 0
      let hi = series.length - 1
      while (lo < hi) {
        const mid = (lo + hi) >> 1
        if ((series[mid]?.[0] ?? 0) < t) lo = mid + 1
        else hi = mid
      }
      return series[lo]?.[1] ?? 0
    }
    const pts = base.map(([t]) => {
      let v = 0
      for (const h of holdings) {
        const s = data[h.symbol]
        v += h.quantity * (s ? lookup(s, t) : h.priceUSD)
      }
      return { t, v }
    })
    // O último ponto é o valor de agora (preço ao vivo).
    const now = holdings.reduce((acc, h) => acc + h.valueUSD, 0)
    pts.push({ t: Date.now(), v: now })
    return pts
  }, [data, holdings])

  return { points, isLoading }
}

/** Caminho SVG de uma série em uma caixa w×h (margem em cima/embaixo). */
export function linePath(values: number[], w: number, h: number, padTop = 4, padBottom = 4) {
  if (values.length < 2) return { line: '', area: '', coords: [] as Array<[number, number]> }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const coords = values.map((v, i): [number, number] => [
    (i / (values.length - 1)) * w,
    padTop + (1 - (v - min) / span) * (h - padTop - padBottom),
  ])
  const line = coords.map((c, i) => `${i ? 'L' : 'M'}${c[0].toFixed(2)} ${c[1].toFixed(2)}`).join(' ')
  return { line, area: `${line} L${w} ${h} L0 ${h} Z`, coords }
}
