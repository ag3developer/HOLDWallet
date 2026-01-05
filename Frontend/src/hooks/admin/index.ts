/**
 * 🛡️ HOLD Wallet - Admin Hooks Index
 * ===================================
 *
 * Exportação central dos hooks do módulo admin.
 */

export {
  useAdminDashboard,
  useAdminUsers,
  useAdminUser,
  useAdminTrades,
  useAdminP2P,
  useAdminSettings,
} from './useAdmin'

// React Query hooks com cache
export * from './useAdminUsers'
export * from './useAdminTrades'
export * from './useAdminP2P'
export * from './useAdminWallets'
export * from './useAdminTransactions'
