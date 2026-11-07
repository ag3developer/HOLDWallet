import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

/**
 * Preço spot de referência via Binance (WebSocket público, sem chave).
 * Os pares são em USDT; o par USDT/BRL dá a conversão exata para reais.
 * A cotação que vale para a ordem continua vindo do backend (/instant-trade/quote).
 */

/** Símbolo do app → par na Binance. Ativos fora da lista usam o preço do backend. */
export const BINANCE_PAIRS: Record<string, string> = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
  SOL: 'SOLUSDT',
  BNB: 'BNBUSDT',
  XRP: 'XRPUSDT',
  DOGE: 'DOGEUSDT',
  ADA: 'ADAUSDT',
  AVAX: 'AVAXUSDT',
  DOT: 'DOTUSDT',
  LINK: 'LINKUSDT',
  LTC: 'LTCUSDT',
  TRX: 'TRXUSDT',
  SHIB: 'SHIBUSDT',
  MATIC: 'POLUSDT', // MATIC virou POL
  USDC: 'USDCUSDT',
}
const USDT_BRL = 'USDTBRL'

export interface SpotTick {
  /** Último preço em USDT (≈ USD) */
  last: number
  open: number
  high: number
  low: number
  /** Variação em 24h, % */
  change: number
}

const WS_URL = 'wss://stream.binance.com:9443/stream?streams='

/** Tickers de 24h em tempo real (miniTicker) + taxa USDT/BRL. */
export function useBinanceTickers() {
  const [ticks, setTicks] = useState<Record<string, SpotTick>>({})
  const [usdtBrl, setUsdtBrl] = useState<SpotTick | null>(null)
  const [connected, setConnected] = useState(false)
  const buffer = useRef<Record<string, SpotTick>>({})
  const brlBuffer = useRef<SpotTick | null>(null)

  useEffect(() => {
    const pairToSymbol: Record<string, string> = {}
    for (const [sym, pair] of Object.entries(BINANCE_PAIRS)) pairToSymbol[pair] = sym
    const streams = [...Object.values(BINANCE_PAIRS), USDT_BRL].map(p => `${p.toLowerCase()}@miniTicker`).join('/')

    let ws: WebSocket | null = null
    let retry = 0
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let closed = false

    // Atualiza a tela no máximo 2x por segundo (o stream manda ~1 msg/s por par)
    const flush = setInterval(() => {
      if (Object.keys(buffer.current).length) {
        const batch = buffer.current
        buffer.current = {}
        setTicks(prev => ({ ...prev, ...batch }))
      }
      if (brlBuffer.current) {
        setUsdtBrl(brlBuffer.current)
        brlBuffer.current = null
      }
    }, 500)

    const connect = () => {
      ws = new WebSocket(WS_URL + streams)
      ws.onopen = () => {
        retry = 0
        setConnected(true)
      }
      ws.onmessage = ev => {
        try {
          const d = JSON.parse(ev.data)?.data
          if (!d?.s) return
          const tick: SpotTick = {
            last: Number(d.c),
            open: Number(d.o),
            high: Number(d.h),
            low: Number(d.l),
            change: Number(d.o) ? ((Number(d.c) - Number(d.o)) / Number(d.o)) * 100 : 0,
          }
          if (d.s === USDT_BRL) brlBuffer.current = tick
          else if (pairToSymbol[d.s]) buffer.current[pairToSymbol[d.s] as string] = tick
        } catch {
          /* mensagem inválida: ignora */
        }
      }
      ws.onclose = () => {
        setConnected(false)
        if (closed) return
        retry += 1
        retryTimer = setTimeout(connect, Math.min(30_000, 1000 * 2 ** Math.min(retry, 5)))
      }
      ws.onerror = () => ws?.close()
    }
    connect()

    return () => {
      closed = true
      clearInterval(flush)
      if (retryTimer) clearTimeout(retryTimer)
      ws?.close()
    }
  }, [])

  return { ticks, usdtBrl, connected }
}

export type ChartRange = '24h' | '7D' | '30D' | '1A'
const RANGE: Record<ChartRange, { interval: string; limit: number }> = {
  '24h': { interval: '15m', limit: 96 },
  '7D': { interval: '1h', limit: 168 },
  '30D': { interval: '4h', limit: 180 },
  '1A': { interval: '1d', limit: 365 },
}

/** Par usado no gráfico: USDT (o próprio) é mostrado contra o real. */
export const chartPairFor = (symbol: string): string | undefined =>
  symbol === 'USDT' ? USDT_BRL : BINANCE_PAIRS[symbol]

/** Fechamentos do par (na moeda de cotação do par) para o gráfico de linha do ativo. */
export function useBinanceCloses(pair: string | undefined, range: ChartRange) {
  return useQuery({
    queryKey: ['binance-klines', pair, range],
    enabled: !!pair,
    staleTime: 60_000,
    queryFn: async () => {
      const { interval, limit } = RANGE[range]
      const r = await fetch(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`)
      if (!r.ok) throw new Error(`klines ${r.status}`)
      const rows = (await r.json()) as Array<[number, string, string, string, string]>
      return rows.map(k => ({ t: k[0], v: Number(k[4]) }))
    },
  })
}
