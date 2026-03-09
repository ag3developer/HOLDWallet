/**
 * Utilitário centralizado para logos de criptomoedas
 * Usa logos locais primeiro, com fallback para URLs externas
 */

// Importações de logos locais SVG
import btcLogo from '@/assets/crypto-icons/btc.svg'
import ethLogo from '@/assets/crypto-icons/eth.svg'
import usdtLogo from '@/assets/crypto-icons/usdt.svg'
import usdcLogo from '@/assets/crypto-icons/usdc.svg'
import bnbLogo from '@/assets/crypto-icons/bnb.svg'
import solLogo from '@/assets/crypto-icons/sol.svg'
import maticLogo from '@/assets/crypto-icons/matic.svg'
import trxLogo from '@/assets/crypto-icons/trx.svg'
import ltcLogo from '@/assets/crypto-icons/ltc.svg'
import dogeLogo from '@/assets/crypto-icons/doge.svg'
import adaLogo from '@/assets/crypto-icons/ada.svg'
import avaxLogo from '@/assets/crypto-icons/avax.svg'
import dotLogo from '@/assets/crypto-icons/dot.svg'
import xrpLogo from '@/assets/crypto-icons/xrp.svg'
import linkLogo from '@/assets/crypto-icons/link.svg'
import daiLogo from '@/assets/crypto-icons/dai.svg'
import baseLogo from '@/assets/crypto-icons/base.png'
import trayLogo from '@/assets/crypto-icons/tray.png'

// Mapa de logos locais (principal)
const LOCAL_LOGOS: Record<string, string> = {
  // Bitcoin
  BTC: btcLogo,
  BITCOIN: btcLogo,

  // Ethereum
  ETH: ethLogo,
  ETHEREUM: ethLogo,

  // Stablecoins
  USDT: usdtLogo,
  USDC: usdcLogo,
  DAI: daiLogo,

  // BNB/BSC
  BNB: bnbLogo,
  BSC: bnbLogo,

  // Solana
  SOL: solLogo,
  SOLANA: solLogo,

  // Polygon
  MATIC: maticLogo,
  POLYGON: maticLogo,

  // Tron
  TRX: trxLogo,
  TRON: trxLogo,

  // Litecoin
  LTC: ltcLogo,
  LITECOIN: ltcLogo,

  // Dogecoin
  DOGE: dogeLogo,
  DOGECOIN: dogeLogo,

  // Cardano
  ADA: adaLogo,
  CARDANO: adaLogo,

  // Avalanche
  AVAX: avaxLogo,
  AVALANCHE: avaxLogo,

  // Polkadot
  DOT: dotLogo,
  POLKADOT: dotLogo,

  // XRP
  XRP: xrpLogo,
  RIPPLE: xrpLogo,

  // Chainlink
  LINK: linkLogo,
  CHAINLINK: linkLogo,

  // Base (L2)
  BASE: baseLogo,

  // TRAY (DEX Token)
  TRAY: trayLogo,
}

// Mapa de fallback para URLs externas (caso logo local não exista)
// Usando CDN do GitHub que é mais confiável
const FALLBACK_URLS: Record<string, string> = {
  SHIB: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/shib.svg',
  ARBITRUM:
    'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/arb.svg',
  ARB: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/arb.svg',
  UNI: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/uni.svg',
  ATOM: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/atom.svg',
  XLM: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/xlm.svg',
  POL: 'https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/svg/color/matic.svg',
}

/**
 * Retorna a URL do logo de uma criptomoeda
 * Prioriza logos locais, fallback para URLs externas se não encontrado
 *
 * @param symbol - Símbolo da criptomoeda (ex: BTC, ETH, USDT)
 * @returns URL do logo ou undefined se não encontrado
 */
export function getCryptoLogo(symbol: string): string | undefined {
  const normalizedSymbol = symbol.toUpperCase()

  // Primeiro tenta o logo local
  if (LOCAL_LOGOS[normalizedSymbol]) {
    return LOCAL_LOGOS[normalizedSymbol]
  }

  // Fallback para URL externa
  if (FALLBACK_URLS[normalizedSymbol]) {
    return FALLBACK_URLS[normalizedSymbol]
  }

  return undefined
}

/**
 * Retorna todos os logos disponíveis como um mapa
 * Útil para iterações ou quando precisa de todos os logos
 */
export function getAllCryptoLogos(): Record<string, string> {
  return { ...LOCAL_LOGOS, ...FALLBACK_URLS }
}

/**
 * Verifica se existe um logo para uma determinada criptomoeda
 */
export function hasCryptoLogo(symbol: string): boolean {
  const normalizedSymbol = symbol.toUpperCase()
  return normalizedSymbol in LOCAL_LOGOS || normalizedSymbol in FALLBACK_URLS
}

// Re-exporta o trayLogo para uso direto
export { trayLogo }

// Exportação default do mapa de logos (para compatibilidade)
export const CRYPTO_LOGOS = { ...LOCAL_LOGOS, ...FALLBACK_URLS }

export default getCryptoLogo
