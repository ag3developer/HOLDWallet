import { useMemo, useRef, useState } from 'react'
import type { ChartPoint, Period } from './usePortfolio'
import { linePath } from './usePortfolio'

interface Props {
  points: ChartPoint[]
  period: Period
  loading: boolean
  hidden: boolean
  format: (usd: number) => string
  locale: string
  emptyLabel: string
  ariaLabel: string
}

const W = 1000
const H = 240

/** Gráfico de linha do patrimônio, fluido na largura, com cruz e tooltip ao passar o dedo/mouse. */
export const PortfolioChart = ({ points, period, loading, hidden, format, locale, emptyLabel, ariaLabel }: Props) => {
  const boxRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)

  const { line, area, coords } = useMemo(
    () => linePath(points.map(p => p.v), W, H, 16, 20),
    [points]
  )

  const pick = (clientX: number) => {
    const el = boxRef.current
    if (!el || coords.length < 2) return
    const rect = el.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
    setHover(Math.round(ratio * (coords.length - 1)))
  }

  const fmtDate = (t: number) =>
    new Date(t).toLocaleString(locale, period === '24h' || period === '7D'
      ? { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: 'short', year: period === '1A' ? 'numeric' : undefined })

  if (loading && points.length < 2) {
    return <div className='h-44 sm:h-56 lg:h-60 rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse' />
  }
  if (points.length < 2) {
    return (
      <div className='h-44 sm:h-56 lg:h-60 rounded-xl border border-dashed border-gray-200 dark:border-[#222B3D] flex items-center justify-center text-sm text-gray-500 dark:text-[#8590A6] px-6 text-center'>
        {emptyLabel}
      </div>
    )
  }

  const active = hover != null ? coords[hover] : coords[coords.length - 1]
  const activePoint = hover != null ? points[hover] : null
  const leftPct = active ? (active[0] / W) * 100 : 0
  const topPct = active ? (active[1] / H) * 100 : 0

  return (
    <div
      ref={boxRef}
      className='relative h-44 sm:h-56 lg:h-60 select-none touch-pan-y'
      onMouseMove={e => pick(e.clientX)}
      onMouseLeave={() => setHover(null)}
      onTouchStart={e => e.touches[0] && pick(e.touches[0].clientX)}
      onTouchMove={e => e.touches[0] && pick(e.touches[0].clientX)}
      onTouchEnd={() => setHover(null)}
    >
      <svg
        role='img'
        aria-label={ariaLabel}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio='none'
        className='absolute inset-0 w-full h-full overflow-visible'
      >
        {[0.25, 0.5, 0.75].map(f => (
          <line
            key={f}
            x1='0'
            x2={W}
            y1={H * f}
            y2={H * f}
            className='stroke-gray-100 dark:stroke-[#1E2738]'
            strokeWidth='1'
            vectorEffect='non-scaling-stroke'
          />
        ))}
        <path d={area} className='fill-blue-600/10 dark:fill-[#5B8CFF]/10' />
        <path
          d={line}
          fill='none'
          className='stroke-blue-600 dark:stroke-[#5B8CFF]'
          strokeWidth='2'
          strokeLinejoin='round'
          strokeLinecap='round'
          vectorEffect='non-scaling-stroke'
        />
        {hover != null && active && (
          <line
            x1={active[0]}
            x2={active[0]}
            y1='0'
            y2={H}
            className='stroke-gray-300 dark:stroke-[#3A4660]'
            strokeWidth='1'
            strokeDasharray='4 4'
            vectorEffect='non-scaling-stroke'
          />
        )}
      </svg>

      {active && (
        <span
          aria-hidden='true'
          className='absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full bg-blue-600 dark:bg-[#5B8CFF] ring-2 ring-white dark:ring-[#111724] pointer-events-none'
          style={{ left: `${leftPct}%`, top: `${topPct}%` }}
        />
      )}

      {activePoint && (
        <div
          className='absolute top-0 pointer-events-none px-3 py-2 rounded-lg bg-gray-900 text-white dark:bg-[#1A2336] dark:border dark:border-[#2A3449] shadow-lg text-xs whitespace-nowrap'
          style={{
            left: `${leftPct}%`,
            transform: `translateX(${leftPct > 70 ? '-105%' : leftPct < 30 ? '5%' : '-50%'})`,
          }}
        >
          <div className='font-semibold text-sm tabular-nums'>{hidden ? '••••' : format(activePoint.v)}</div>
          <div className='text-gray-300 dark:text-[#A3ADC2]'>{fmtDate(activePoint.t)}</div>
        </div>
      )}
    </div>
  )
}

/** Mini-gráfico (sparkline) para a lista de mercado. */
export const Sparkline = ({ values, up }: { values: number[]; up: boolean }) => {
  const { line } = useMemo(() => linePath(values, 72, 28, 3, 3), [values])
  if (!line) return <span className='block w-[72px] h-7' aria-hidden='true' />
  return (
    <svg aria-hidden='true' width='72' height='28' viewBox='0 0 72 28' className='shrink-0'>
      <path
        d={line}
        fill='none'
        className={up ? 'stroke-emerald-600 dark:stroke-[#34C77B]' : 'stroke-red-600 dark:stroke-[#FF7A7A]'}
        strokeWidth='1.6'
        strokeLinejoin='round'
        strokeLinecap='round'
      />
    </svg>
  )
}
