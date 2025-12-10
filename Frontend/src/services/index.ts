// Export all services
export { apiClient } from './api'
export { authService } from './auth'
export { walletService } from './wallet'
export { p2pService } from './p2p'
export { chatService } from './chat'
export { notificationService } from './notification'
export { webrtcService } from './webrtcService'
export { callSignalingService } from './callSignalingService'

// Re-export types for convenience
export type {
  ApiResponse,
  PaginatedResponse,
  User,
  Wallet,
  Transaction,
  P2POrder,
  Trade,
  ChatConversation,
  ChatMessage,
  PaymentMethod,
} from '@/types'
