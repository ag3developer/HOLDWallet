import { useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import { AlertTriangle, Check, ChevronRight, Copy, Share2 } from 'lucide-react'
import { CryptoIcon } from '@/components/CryptoIcon'
import { ASSETS, NETWORKS, assetInfo } from './assets'
import { AssetButton, BTN_PRIMARY, BTN_SECONDARY, CARD, FlowHeader, MUTED, SKELETON, SOFT, SearchBox, qty } from './ui'

const FEE_LABEL: Record<string, string> = { min: 'Taxa mínima', low: 'Taxa baixa', var: 'Taxa variável', high: 'Taxa alta' }
const STEPS = ['Moeda', 'Rede', 'Endereço']

interface Props {
  initialAsset?: string
  initialNetwork?: string
  addresses: Record<string, string>
  held: Array<{ symbol: string; quantity: number }>
  onClose: () => void
}

/** Receber em 3 passos: moeda → rede → endereço (QR, copiar, compartilhar). */
export const ReceiveFlow = ({ initialAsset, initialNetwork, addresses, held, onClose }: Props) => {
  const startAsset = initialAsset && ASSETS.some(a => a.symbol === initialAsset) ? initialAsset : null
  const startNetwork =
    startAsset && initialNetwork && assetInfo(startAsset).networks.includes(initialNetwork)
      ? initialNetwork
      : startAsset && assetInfo(startAsset).networks.length === 1
        ? assetInfo(startAsset).networks[0]!
        : null
  const [asset, setAsset] = useState<string | null>(startAsset)
  const [network, setNetwork] = useState<string | null>(startNetwork)
  const [search, setSearch] = useState('')
  const [copied, setCopied] = useState(false)

  const step = !asset ? 0 : !network ? 1 : 2
  const info = asset ? assetInfo(asset) : null
  const address = network ? addresses[network] || '' : ''

  const list = useMemo(() => {
    const q = search.trim().toLowerCase()
    const heldSet = new Set(held.map(h => h.symbol))
    return [...ASSETS]
      .filter(a => !q || `${a.symbol} ${a.name}`.toLowerCase().includes(q))
      .sort((a, b) => Number(heldSet.has(b.symbol)) - Number(heldSet.has(a.symbol)))
  }, [search, held])

  const back = () => {
    if (step === 2 && info && info.networks.length > 1) setNetwork(null)
    else if (step >= 1) {
      setNetwork(null)
      setAsset(null)
    } else onClose()
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      toast.success('Endereço copiado')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Não foi possível copiar')
    }
  }
  const share = async () => {
    try {
      await navigator.share({ title: `Meu endereço ${asset} (${NETWORKS[network!]?.name})`, text: address })
    } catch {
      /* cancelado */
    }
  }

  return (
    <div className='max-w-2xl mx-auto text-gray-900 dark:text-[#EEF1F7]'>
      <FlowHeader
        title={step === 2 ? `Receber ${asset}` : 'Receber'}
        backLabel={step === 0 ? 'Voltar para a carteira' : 'Voltar'}
        onBack={back}
        step={step}
        steps={STEPS}
      />

      {step === 0 && (
        <section className={`${CARD} p-4 sm:p-5`} aria-label='Escolha a moeda'>
          <p className={`text-sm mb-3 ${SOFT}`}>Qual moeda você vai receber?</p>
          <SearchBox value={search} onChange={setSearch} placeholder='Buscar moeda' />
          <div className='mt-3 max-h-[60vh] overflow-y-auto -mx-1 px-1'>
            {list.map(a => {
              const h = held.find(x => x.symbol === a.symbol)
              return (
                <AssetButton
                  key={a.symbol}
                  symbol={a.symbol}
                  name={a.name}
                  sub={`${a.name} · ${a.networks.length} ${a.networks.length > 1 ? 'redes' : 'rede'}`}
                  right={
                    <span className='inline-flex items-center gap-2'>
                      {h && <span className={`text-sm tabular-nums ${SOFT}`}>{qty(h.quantity, a.symbol)}</span>}
                      <ChevronRight className={`w-4 h-4 ${MUTED}`} aria-hidden='true' />
                    </span>
                  }
                  onClick={() => {
                    setAsset(a.symbol)
                    setNetwork(a.networks.length === 1 ? a.networks[0]! : null)
                  }}
                />
              )
            })}
          </div>
        </section>
      )}

      {step === 1 && info && (
        <section className={`${CARD} p-4 sm:p-5`} aria-label='Escolha a rede'>
          <div className='flex items-center gap-3 mb-4'>
            <CryptoIcon symbol={info.symbol} size={36} className='rounded-full' />
            <p className={`text-sm ${SOFT}`}>
              Por qual rede vão te enviar <strong className='text-gray-900 dark:text-[#EEF1F7]'>{info.symbol}</strong>? Use a mesma rede de quem envia.
            </p>
          </div>
          <div className='space-y-2'>
            {info.networks.map((n, i) => {
              const net = NETWORKS[n]
              if (!net) return null
              return (
                <button
                  key={n}
                  type='button'
                  onClick={() => setNetwork(n)}
                  className='w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-gray-200 hover:border-gray-300 dark:border-[#222B3D] dark:hover:border-[#2F3D5C] text-left'
                >
                  <span className='flex-1 min-w-0'>
                    <span className='flex items-center gap-2 font-semibold'>
                      {net.name}
                      {net.standard && <span className={`text-xs font-medium ${MUTED}`}>{net.standard}</span>}
                      {i === 0 && info.networks.length > 1 && (
                        <span className='text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-[#34C77B]/10 dark:text-[#34C77B]'>
                          Recomendada
                        </span>
                      )}
                    </span>
                    <span className={`block text-sm ${MUTED}`}>{FEE_LABEL[net.fee]}</span>
                  </span>
                  <ChevronRight className={`w-4 h-4 ${MUTED}`} aria-hidden='true' />
                </button>
              )
            })}
          </div>
        </section>
      )}

      {step === 2 && info && network && (
        <section className={`${CARD} p-5 sm:p-8`} aria-label='Seu endereço'>
          <div className='flex flex-col items-center text-center'>
            <div className='bg-white p-4 rounded-2xl border border-gray-200 dark:border-transparent'>
              {address ? (
                <QRCodeSVG value={address} size={208} level='M' includeMargin={false} />
              ) : (
                <div className={`w-[208px] h-[208px] ${SKELETON}`} aria-label='Gerando endereço' />
              )}
            </div>
            <p className={`mt-4 text-sm ${SOFT}`}>
              Seu endereço <strong className='text-gray-900 dark:text-[#EEF1F7]'>{info.symbol}</strong> na rede{' '}
              <strong className='text-gray-900 dark:text-[#EEF1F7]'>{NETWORKS[network]?.name}</strong>
            </p>
            <code className='mt-3 w-full rounded-xl bg-gray-50 dark:bg-[#0D121C] border border-gray-200 dark:border-[#222B3D] px-4 py-3 font-mono text-sm break-all'>
              {address || 'Gerando endereço…'}
            </code>
            <div className='mt-4 grid w-full gap-2 sm:grid-cols-2'>
              <button type='button' onClick={copy} disabled={!address} className={BTN_PRIMARY}>
                {copied ? <Check className='w-4 h-4' aria-hidden='true' /> : <Copy className='w-4 h-4' aria-hidden='true' />}
                {copied ? 'Copiado' : 'Copiar endereço'}
              </button>
              {'share' in navigator ? (
                <button type='button' onClick={share} disabled={!address} className={BTN_SECONDARY}>
                  <Share2 className='w-4 h-4' aria-hidden='true' />
                  Compartilhar
                </button>
              ) : (
                <button type='button' onClick={onClose} className={BTN_SECONDARY}>
                  Concluir
                </button>
              )}
            </div>
          </div>
          <div className='mt-6 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-400/20 dark:bg-amber-400/5 p-4 flex gap-3'>
            <AlertTriangle className='w-5 h-5 shrink-0 text-amber-600 dark:text-amber-300' aria-hidden='true' />
            <p className='text-sm'>
              Envie para este endereço <strong>somente {info.symbol}</strong> pela rede <strong>{NETWORKS[network]?.name}</strong>. Outra moeda ou
              outra rede pode resultar em perda definitiva.
            </p>
          </div>
          <p className={`mt-4 text-xs text-center ${MUTED}`}>O saldo aparece na carteira depois das confirmações da rede.</p>
        </section>
      )}
    </div>
  )
}
