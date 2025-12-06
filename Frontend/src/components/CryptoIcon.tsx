import { ImgHTMLAttributes } from 'react'

interface CryptoIconProps extends ImgHTMLAttributes<HTMLImageElement> {
  symbol: string
  size?: number
  className?: string
}

const symbolMap: Record<string, string> = {
  'BTC': 'btc',
  'ETH': 'eth',
  'USDT': 'usdt',
  'USDC': 'usdc',
  'BNB': 'bnb',
  'MATIC': 'matic',
  'TRX': 'trx',
  'BASE': 'eth', // Base usa logo ETH
  'SOL': 'sol',
  'LTC': 'ltc',
  'DOGE': 'doge',
  'ADA': 'ada',
  'AVAX': 'avax',
  'DOT': 'dot',
  'LINK': 'link',
  'SHIB': 'shib',
  'XRP': 'xrp',
  'DAI': 'dai',
  'BUSD': 'busd',
}

export const CryptoIcon = ({ symbol, size = 24, className = '', ...props }: CryptoIconProps) => {
  const iconName = symbolMap[symbol?.toUpperCase()] || 'btc'
  
  // Usar URL pública da CDN como fallback enquanto os locais não funcionam
  const iconPath = `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/${iconName}.svg`
  
  return (
    <img
      src={iconPath}
      alt={`${symbol} logo`}
      width={size}
      height={size}
      className={`${className} object-contain`}
      onError={(e) => {
        // Fallback para ícone genérico colorido
        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"%3E%3Ccircle cx="16" cy="16" r="16" fill="%236366f1"/%3E%3Ctext x="16" y="21" text-anchor="middle" fill="white" font-size="14" font-weight="bold"%3E' + encodeURIComponent(symbol?.[0] || '?') + '%3C/text%3E%3C/svg%3E'
      }}
      {...props}
    />
  )
}
