import type { ReactNode } from 'react'
import { ArrowLeft, Search } from 'lucide-react'
import { CryptoIcon } from '@/components/CryptoIcon'

/** Tokens visuais compartilhados (mesma identidade da Home e da OTC). */
export const CARD = 'bg-white border border-gray-200 dark:bg-[#111724] dark:border-[#1E2738] rounded-2xl'
export const MUTED = 'text-gray-500 dark:text-[#8590A6]'
export const SOFT = 'text-gray-600 dark:text-[#A3ADC2]'
export const UP = 'text-emerald-600 dark:text-[#34C77B]'
export const DOWN = 'text-red-600 dark:text-[#FF7A7A]'
export const LINK = 'text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-[#8FB0FF] dark:hover:text-[#B9CDFF]'
export const BTN_PRIMARY =
  'h-12 rounded-xl bg-blue-600 text-white hover:bg-blue-700 dark:bg-[#5B8CFF] dark:text-[#0A0E15] dark:hover:bg-[#7AA2FF] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
export const BTN_SECONDARY =
  'h-12 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-[#2A3449] dark:text-[#EEF1F7] dark:hover:bg-[#172033] font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50 transition-colors'
export const SKELETON = 'rounded-xl bg-gray-100 dark:bg-white/5 animate-pulse'

export const pct = (n: number) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(2).replace('.', ',')}%`
export const qty = (n: number, symbol: string, locale = 'pt-BR') =>
  `${n.toLocaleString(locale, { maximumFractionDigits: n >= 1000 ? 2 : n >= 1 ? 4 : 8 })} ${symbol}`
export const shortAddr = (a: string) => (a && a.length > 16 ? `${a.slice(0, 8)}…${a.slice(-6)}` : a)

/** Cabeçalho de um fluxo (Receber/Enviar) com voltar e indicador de passos. */
export const FlowHeader = ({
  title,
  onBack,
  backLabel,
  step,
  steps,
}: {
  title: string
  onBack: () => void
  backLabel: string
  step?: number
  steps?: string[]
}) => (
  <div className='flex flex-col gap-4 mb-6'>
    <button
      type='button'
      onClick={onBack}
      className={`self-start inline-flex items-center gap-2 h-10 -ml-1 px-1 text-sm font-medium ${SOFT} hover:text-gray-900 dark:hover:text-white`}
    >
      <ArrowLeft className='w-4 h-4' aria-hidden='true' />
      {backLabel}
    </button>
    <div className='flex flex-wrap items-end justify-between gap-3'>
      <h2 className='text-xl sm:text-2xl font-semibold text-gray-900 dark:text-[#EEF1F7]'>{title}</h2>
      {steps && step != null && (
        <ol className='flex items-center gap-1.5' aria-label='Passos'>
          {steps.map((s, i) => (
            <li key={s} className='flex items-center gap-1.5' aria-current={i === step ? 'step' : undefined}>
              <span
                className={`h-1.5 rounded-full transition-all ${
                  i <= step ? 'bg-blue-600 dark:bg-[#5B8CFF]' : 'bg-gray-200 dark:bg-[#222B3D]'
                } ${i === step ? 'w-8' : 'w-4'}`}
              />
              <span className='sr-only'>{s}</span>
            </li>
          ))}
          <span className={`ml-2 text-xs ${MUTED}`}>{steps[step]}</span>
        </ol>
      )}
    </div>
  </div>
)

/** Linha clicável de ativo (escolha de moeda nos fluxos e na lista da carteira). */
export const AssetButton = ({
  symbol,
  name,
  right,
  sub,
  onClick,
  active,
}: {
  symbol: string
  name: string
  right?: ReactNode
  sub?: ReactNode
  onClick: () => void
  active?: boolean
}) => (
  <button
    type='button'
    onClick={onClick}
    aria-pressed={active}
    className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-xl text-left transition-colors ${
      active ? 'bg-blue-50/70 dark:bg-[#172033]' : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]'
    }`}
  >
    <CryptoIcon symbol={symbol} size={40} className='rounded-full shrink-0' />
    <span className='flex-1 min-w-0'>
      <span className='block text-[15px] font-semibold text-gray-900 dark:text-[#EEF1F7]'>{symbol}</span>
      <span className={`block text-[13px] truncate ${MUTED}`}>{sub ?? name}</span>
    </span>
    {right && <span className='text-right'>{right}</span>}
  </button>
)

export const SearchBox = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
  <label className='flex items-center gap-2 h-11 px-3 rounded-xl bg-gray-100 dark:bg-[#0D121C] dark:border dark:border-[#1E2738]'>
    <Search className={`w-4 h-4 ${MUTED}`} aria-hidden='true' />
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className='flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-[#EEF1F7]'
    />
  </label>
)
