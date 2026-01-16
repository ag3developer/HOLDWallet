import { ImgHTMLAttributes, useState, useEffect } from 'react'
import baseLogo from '../assets/crypto-icons/base.png'

interface CryptoIconProps extends ImgHTMLAttributes<HTMLImageElement> {
  symbol: string
  size?: number
  className?: string
}

const symbolMap: Record<string, string> = {
  // Símbolos
  BTC: 'btc',
  ETH: 'eth',
  USDT: 'usdt',
  USDC: 'usdc',
  BNB: 'bnb',
  MATIC: 'matic',
  TRX: 'trx',
  BASE: 'base',
  SOL: 'sol',
  LTC: 'ltc',
  DOGE: 'doge',
  ADA: 'ada',
  AVAX: 'avax',
  DOT: 'dot',
  LINK: 'link',
  SHIB: 'shib',
  XRP: 'xrp',
  DAI: 'dai',
  BUSD: 'busd',
  // Nomes de redes (minúsculo)
  bitcoin: 'btc',
  ethereum: 'eth',
  polygon: 'matic',
  bsc: 'bnb',
  tron: 'trx',
  base: 'base',
  solana: 'sol',
  litecoin: 'ltc',
  dogecoin: 'doge',
  cardano: 'ada',
  avalanche: 'avax',
  polkadot: 'dot',
  chainlink: 'link',
  xrp: 'xrp',
  arbitrum: 'eth',
  optimism: 'eth',
  // Stablecoins (minúsculo)
  usdt: 'usdt',
  usdc: 'usdc',
  dai: 'dai',
}

// Mapa de ícones locais importados
const localIconMap: Record<string, string> = {
  base: baseLogo,
}

export const CryptoIcon = ({ symbol, size = 24, className = '', ...props }: CryptoIconProps) => {
  // Tentar encontrar pelo símbolo original (lowercase para nomes de redes) ou uppercase (para símbolos)
  const normalizedSymbol = symbol?.toLowerCase() || ''
  const iconName =
    symbolMap[normalizedSymbol] || symbolMap[symbol?.toUpperCase()] || normalizedSymbol || 'btc'
  const localIcon = localIconMap[iconName]

  // Tentar primeiro o arquivo local se existir, depois a CDN
  const cdnPath = `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/${iconName}.svg`
  const initialSrc = localIcon || cdnPath

  const [src, setSrc] = useState(initialSrc)

  useEffect(() => {
    setSrc(initialSrc)
  }, [initialSrc])

  return (
    <img
      src={src}
      alt={`${symbol} logo`}
      width={size}
      height={size}
      className={`${className} object-contain`}
      onError={() => {
        // Se temos um arquivo local, tentar a CDN
        if (localIcon && src === localIcon) {
          setSrc(cdnPath)
          return
        }

        // Se a CDN também falhar, usar ícone genérico colorido
        setSrc(
          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"%3E%3Ccircle cx="16" cy="16" r="16" fill="%236366f1"/%3E%3Ctext x="16" y="21" text-anchor="middle" fill="white" font-size="14" font-weight="bold"%3E' +
            encodeURIComponent(symbol?.[0] || '?') +
            '%3C/text%3E%3C/svg%3E'
        )
      }}
      {...props}
    />
  )
}
