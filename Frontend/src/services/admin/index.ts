/**
 * 🛡️ HOLD Wallet - Admin Services Index
 * ======================================
 *
 * Exportação central dos serviços do módulo admin.
 */

export * from './adminService'
export { default as adminApi } from './adminService'

export * from './adminWolkpay'
export { default as adminWolkpayApi } from './adminWolkpay'

export * from './adminGateway'
export { default as adminGatewayApi } from './adminGateway'
