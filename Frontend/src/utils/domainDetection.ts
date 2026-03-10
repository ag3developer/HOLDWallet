/**
 * Domain Detection Utility
 * Detecta qual app deve ser renderizado baseado no hostname
 */

export type AppMode = 'main' | 'gateway'

/**
 * Detecta o modo da aplicação baseado no hostname
 * - gateway.wolknow.com ou gateway.localhost → 'gateway'
 * - Qualquer outro → 'main'
 */
export function detectAppMode(): AppMode {
  const hostname = globalThis.location.hostname.toLowerCase()

  // Detecta se é o subdomínio gateway
  if (
    hostname.startsWith('gateway.') ||
    hostname === 'gateway.localhost' ||
    // Para testes locais
    (hostname === 'localhost' && globalThis.location.port === '3001')
  ) {
    return 'gateway'
  }

  return 'main'
}

/**
 * Verifica se estamos no domínio do Gateway
 */
export function isGatewayDomain(): boolean {
  return detectAppMode() === 'gateway'
}

/**
 * Verifica se estamos no domínio principal
 */
export function isMainDomain(): boolean {
  return detectAppMode() === 'main'
}

/**
 * Retorna a URL base do app atual
 */
export function getAppBaseUrl(): string {
  const protocol = globalThis.location.protocol
  const hostname = globalThis.location.hostname
  const port = globalThis.location.port ? `:${globalThis.location.port}` : ''

  return `${protocol}//${hostname}${port}`
}

/**
 * Gera URL para o outro app (cross-domain navigation)
 */
export function getCrossAppUrl(targetApp: AppMode, path: string = '/'): string {
  const protocol = globalThis.location.protocol
  const port = globalThis.location.port ? `:${globalThis.location.port}` : ''

  // Em produção
  if (globalThis.location.hostname.includes('wolknow.com')) {
    if (targetApp === 'gateway') {
      return `${protocol}//gateway.wolknow.com${path}`
    }
    return `${protocol}//wolknow.com${path}`
  }

  // Em desenvolvimento local
  if (targetApp === 'gateway') {
    return `${protocol}//gateway.localhost${port}${path}`
  }
  return `${protocol}//localhost${port}${path}`
}
