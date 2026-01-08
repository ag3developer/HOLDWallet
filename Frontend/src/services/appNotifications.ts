/**
 * WOLK NOW - Notification Service
 * ================================
 *
 * Servico para integrar notificacoes em toda a aplicacao.
 * Fornece metodos para notificar o usuario sobre eventos importantes.
 */

import { notify, useNotificationStore } from '@/stores/useNotificationStore'

// Formatar moeda
const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// Formatar crypto
const formatCrypto = (amount: number, symbol: string): string => {
  let decimals = 2
  if (amount < 1) {
    decimals = 8
  } else if (amount < 100) {
    decimals = 4
  }
  return `${amount.toLocaleString('pt-BR', { maximumFractionDigits: decimals })} ${symbol}`
}

// Servico de notificacoes do app
export const appNotifications = {
  // ========== TRADES P2P ==========

  /** Notifica quando uma ordem P2P e criada */
  orderCreated: (orderId: string, type: 'buy' | 'sell', amount: number, symbol: string) => {
    notify.trade(
      `Ordem de ${type === 'buy' ? 'Compra' : 'Venda'} Criada`,
      `Sua ordem de ${formatCrypto(amount, symbol)} foi criada com sucesso.`,
      { orderId, amount, symbol, link: `/p2p/orders/${orderId}` }
    )
  },

  /** Notifica quando uma ordem e aceita por contraparte */
  orderAccepted: (orderId: string, counterparty: string) => {
    notify.trade('Ordem Aceita', `${counterparty} aceitou sua ordem. Inicie a negociacao.`, {
      orderId,
      link: `/p2p/trade/${orderId}`,
    })
  },

  /** Notifica quando um pagamento e confirmado */
  paymentConfirmed: (orderId: string, amount: number, currency: string) => {
    notify.trade(
      'Pagamento Confirmado',
      `Pagamento de ${formatCurrency(amount, currency)} foi confirmado.`,
      { orderId, amount, currency, link: `/p2p/trade/${orderId}` }
    )
  },

  /** Notifica quando uma ordem e concluida */
  orderCompleted: (orderId: string, amount: number, symbol: string) => {
    notify.trade(
      'Ordem Concluida',
      `Sua negociacao de ${formatCrypto(amount, symbol)} foi concluida com sucesso!`,
      { orderId, amount, symbol, link: `/p2p/orders/${orderId}` }
    )
  },

  /** Notifica quando uma ordem e cancelada */
  orderCancelled: (orderId: string, reason?: string) => {
    notify.trade('Ordem Cancelada', reason || 'Sua ordem foi cancelada.', {
      orderId,
      link: `/p2p/orders`,
    })
  },

  /** Notifica sobre disputa aberta */
  disputeOpened: (orderId: string) => {
    notify.trade('Disputa Aberta', 'Uma disputa foi aberta para esta ordem. Aguarde analise.', {
      orderId,
      link: `/p2p/trade/${orderId}`,
    })
  },

  // ========== TRANSACOES BLOCKCHAIN ==========

  /** Notifica quando uma transacao e enviada */
  transactionSent: (txHash: string, amount: number, symbol: string, to: string) => {
    const shortAddress = `${to.slice(0, 6)}...${to.slice(-4)}`
    notify.transaction(
      'Transacao Enviada',
      `${formatCrypto(amount, symbol)} enviado para ${shortAddress}`,
      { txHash, amount, symbol, link: `/wallet/transactions` }
    )
  },

  /** Notifica quando uma transacao e recebida */
  transactionReceived: (txHash: string, amount: number, symbol: string, from: string) => {
    const shortAddress = `${from.slice(0, 6)}...${from.slice(-4)}`
    notify.transaction(
      'Transacao Recebida',
      `Voce recebeu ${formatCrypto(amount, symbol)} de ${shortAddress}`,
      { txHash, amount, symbol, link: `/wallet/transactions` }
    )
  },

  /** Notifica quando uma transacao e confirmada */
  transactionConfirmed: (txHash: string, confirmations: number) => {
    notify.transaction(
      'Transacao Confirmada',
      `Sua transacao foi confirmada com ${confirmations} confirmacoes.`,
      { txHash, link: `/wallet/transactions` }
    )
  },

  /** Notifica quando uma transacao falha */
  transactionFailed: (txHash: string, reason?: string) => {
    notify.transaction(
      'Transacao Falhou',
      reason || 'Sua transacao nao foi processada. Tente novamente.',
      { txHash }
    )
  },

  // ========== PAGAMENTOS PIX ==========

  /** Notifica quando um PIX e recebido */
  pixReceived: (amount: number, sender?: string) => {
    const senderText = sender ? ` de ${sender}` : ''
    notify.payment('PIX Recebido', `Voce recebeu ${formatCurrency(amount, 'BRL')}${senderText}.`, {
      amount,
      currency: 'BRL',
    })
  },

  /** Notifica quando um PIX e enviado */
  pixSent: (amount: number, recipient: string) => {
    notify.payment('PIX Enviado', `${formatCurrency(amount, 'BRL')} enviado para ${recipient}.`, {
      amount,
      currency: 'BRL',
    })
  },

  /** Notifica quando PIX expira */
  pixExpired: (orderId: string) => {
    notify.payment('PIX Expirado', 'O codigo PIX expirou. Gere um novo codigo.', { orderId })
  },

  // ========== ALERTAS DE PRECO ==========

  /** Notifica sobre variacao de preco significativa */
  priceAlert: (symbol: string, price: number, percentChange: number) => {
    const direction = percentChange >= 0 ? 'subiu' : 'caiu'
    notify.price(
      `${symbol} ${direction} ${Math.abs(percentChange).toFixed(2)}%`,
      `${symbol} agora esta em ${formatCurrency(price, 'USD')}`,
      { symbol, amount: price, percentChange, link: '/trading' }
    )
  },

  /** Notifica quando atinge preco alvo */
  priceTargetReached: (symbol: string, targetPrice: number, currentPrice: number) => {
    notify.price(
      `${symbol} Atingiu Alvo`,
      `${symbol} chegou ao preco alvo de ${formatCurrency(targetPrice, 'USD')}`,
      { symbol, amount: currentPrice, link: '/trading' }
    )
  },

  // ========== SEGURANCA ==========

  /** Notifica sobre novo login */
  newLogin: (ip: string, device: string, location?: string) => {
    const locationText = location ? ` em ${location}` : ''
    notify.security('Novo Login Detectado', `Login realizado de ${device}${locationText}`, {
      ip,
      device,
    })
  },

  /** Notifica sobre tentativa de login suspeita */
  suspiciousLogin: (ip: string, device: string) => {
    notify.security(
      'Tentativa de Login Suspeita',
      `Detectamos uma tentativa de login incomum de ${device} (${ip})`,
      { ip, device, link: '/security' }
    )
  },

  /** Notifica quando 2FA e ativado */
  twoFactorEnabled: () => {
    notify.security('2FA Ativado', 'A autenticacao de dois fatores foi ativada com sucesso.', {
      link: '/security',
    })
  },

  /** Notifica quando 2FA e desativado */
  twoFactorDisabled: () => {
    notify.security('2FA Desativado', 'A autenticacao de dois fatores foi desativada.', {
      link: '/security',
    })
  },

  /** Notifica sobre alteracao de senha */
  passwordChanged: () => {
    notify.security('Senha Alterada', 'Sua senha foi alterada com sucesso.', {})
  },

  // ========== SISTEMA ==========

  /** Notifica sobre atualizacao do app */
  appUpdated: (version: string) => {
    notify.system('App Atualizado', `WOLK NOW foi atualizado para a versao ${version}.`, {
      link: '/changelog',
    })
  },

  /** Notifica sobre manutencao programada */
  scheduledMaintenance: (startTime: Date, duration: string) => {
    notify.system(
      'Manutencao Programada',
      `Manutencao prevista para ${startTime.toLocaleString('pt-BR')} (${duration}).`,
      {}
    )
  },

  /** Notifica sobre novos recursos */
  newFeature: (title: string, description: string) => {
    notify.system(title, description, {})
  },

  // ========== CARTEIRA ==========

  /** Notifica quando carteira e criada */
  walletCreated: (name: string, network: string) => {
    notify.wallet('Carteira Criada', `Carteira "${name}" criada na rede ${network}.`, {
      link: '/wallet',
    })
  },

  /** Notifica quando carteira e importada */
  walletImported: (name: string) => {
    notify.wallet('Carteira Importada', `Carteira "${name}" foi importada com sucesso.`, {
      link: '/wallet',
    })
  },

  /** Notifica sobre saldo baixo */
  lowBalance: (symbol: string, balance: number, threshold: number) => {
    notify.wallet(
      `Saldo Baixo de ${symbol}`,
      `Seu saldo de ${symbol} esta abaixo de ${threshold}. Saldo atual: ${formatCrypto(balance, symbol)}`,
      { symbol, amount: balance, link: '/wallet' }
    )
  },

  // ========== CHAT ==========

  /** Notifica sobre nova mensagem */
  newMessage: (from: string, preview: string, orderId?: string) => {
    const link = orderId ? `/p2p/trade/${orderId}` : '/chat'
    const data: { link: string; orderId?: string } = { link }
    if (orderId) {
      data.orderId = orderId
    }
    notify.chat(
      `Mensagem de ${from}`,
      preview.length > 50 ? `${preview.substring(0, 50)}...` : preview,
      data
    )
  },
}

// Hook para usar notificacoes
export const useAppNotifications = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotificationStore()

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    notify: appNotifications,
  }
}

export default appNotifications
