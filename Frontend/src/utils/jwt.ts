/**
 * Utilitários de JWT (somente leitura do payload, sem validar assinatura).
 * Usados para saber quando o token de acesso expira e evitar enviar/mostrar
 * sessões que já venceram.
 */

interface JwtPayload {
  exp?: number
  sub?: string
  user_id?: string
  [key: string]: unknown
}

export function decodeJwtPayload(token: string | null | undefined): JwtPayload | null {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 3 || !parts[1]) return null
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    return JSON.parse(json) as JwtPayload
  } catch {
    return null
  }
}

/** Momento de expiração em ms (epoch), ou null se o token não tiver `exp`. */
export function getTokenExpiry(token: string | null | undefined): number | null {
  const exp = decodeJwtPayload(token)?.exp
  return typeof exp === 'number' ? exp * 1000 : null
}

/**
 * true se o token já expirou (com margem de segurança).
 * Tokens sem `exp` ou ilegíveis são tratados como não expirados — o backend decide.
 */
export function isTokenExpired(token: string | null | undefined, skewMs = 30_000): boolean {
  const expiry = getTokenExpiry(token)
  if (expiry === null) return false
  return Date.now() >= expiry - skewMs
}

/** Milissegundos restantes até expirar (Infinity se desconhecido). */
export function msUntilExpiry(token: string | null | undefined): number {
  const expiry = getTokenExpiry(token)
  return expiry === null ? Number.POSITIVE_INFINITY : expiry - Date.now()
}
