// Tipos básicos do sistema
export interface User {
  id: string
  email: string
  username: string
  firstName?: string
  lastName?: string
  phoneNumber?: string
  avatar?: string
  isVerified?: boolean
  twoFactorEnabled?: boolean
  kycStatus?: KYCStatus
  created_at?: string
  createdAt?: string
  updatedAt?: string
  last_login?: string | null
  is_active?: boolean
  is_admin?: boolean
  profile?: UserProfile
}

export interface UserProfile {
  bio?: string
  location?: string
  website?: string
  socialLinks?: SocialLinks
  preferences: UserPreferences
}

export interface SocialLinks {
  twitter?: string
  telegram?: string
  discord?: string
}

export interface UserPreferences {
  language: string
  theme: 'light' | 'dark' | 'system'
  currency: string
  timezone: string
  notifications: NotificationSettings
}

export interface NotificationSettings {
  push: boolean
  email: boolean
  sms: boolean
  trading: boolean
  chat: boolean
  security: boolean
}

export type KYCStatus = 'not_started' | 'pending' | 'under_review' | 'approved' | 'rejected'

// Tipos de autenticação
export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterRequest {
  email: string
  username: string
  password: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: User
  requires2FA?: boolean
  tempToken?: string
}

// Tipos de carteira
export interface Wallet {
  id: string
  userId: string
  name: string
  type: WalletType
  coin: string
  address: string
  balance: string
  balanceUSD: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type WalletType = 'hot' | 'cold' | 'hardware' | 'multisig'

export interface Transaction {
  id: string
  walletId: string
  type: TransactionType
  status: TransactionStatus
  amount: string
  amountUSD: string
  fee: string
  feeUSD: string
  fromAddress?: string
  toAddress?: string
  txHash?: string
  blockNumber?: number
  confirmations: number
  requiredConfirmations: number
  memo?: string
  createdAt: string
  updatedAt: string
}

export type TransactionType = 'send' | 'receive' | 'trade' | 'fee'

export type TransactionStatus = 'pending' | 'confirming' | 'confirmed' | 'failed' | 'cancelled'

// Tipos de P2P Trading
export interface P2POrder {
  id: string
  userId: string
  type: OrderType
  status: OrderStatus
  coin: string
  cryptocurrency?: string
  fiatCurrency?: string
  amount: string
  price: string
  total: string
  minAmount: string
  maxAmount: string
  paymentMethods: PaymentMethod[]
  terms?: string
  autoReply?: string
  timeLimit: number
  user: PublicUser
  completedTrades: number
  successRate: number
  avgRating: number
  badges: Badge[]
  isOnline: boolean
  lastSeen?: string
  createdAt: string
  updatedAt: string
}

export type OrderType = 'buy' | 'sell'

export type OrderStatus = 'active' | 'inactive' | 'completed' | 'cancelled' | 'disputed'

export interface PaymentMethod {
  id: string
  name: string
  type: PaymentMethodType
  details: Record<string, any>
  isActive: boolean
}

export type PaymentMethodType = 'bank_transfer' | 'pix' | 'paypal' | 'wise' | 'cash' | 'crypto'

export interface Trade {
  id: string
  orderId: string
  buyerId: string
  sellerId: string
  coin: string
  cryptocurrency?: string
  fiatCurrency?: string
  amount: string
  price: string
  total: string
  status: TradeStatus
  paymentMethod: PaymentMethod
  paymentMethodId?: string
  escrowAddress?: string
  escrowAmount?: string
  timeLimit: number
  expiresAt: string
  buyer?: PublicUser
  seller?: PublicUser
  messages?: TradeMessage[]
  disputes?: Dispute[]
  createdAt: string
  updatedAt: string
}

export type TradeStatus =
  | 'payment_pending'
  | 'payment_sent'
  | 'payment_confirmed'
  | 'escrow_released'
  | 'completed'
  | 'cancelled'
  | 'disputed'
  | 'expired'

export interface TradeMessage {
  id: string
  tradeId: string
  userId: string
  message: string
  type: MessageType
  attachments?: MessageAttachment[]
  createdAt: string
}

export type MessageType = 'text' | 'image' | 'file' | 'payment_proof' | 'system'

export interface MessageAttachment {
  id: string
  name: string
  type: string
  size: number
  url: string
}

export interface Dispute {
  id: string
  tradeId: string
  reporterId: string
  respondentId: string
  reason: DisputeReason
  status: DisputeStatus
  description: string
  evidence: DisputeEvidence[]
  resolution?: string
  resolvedBy?: string
  createdAt: string
  updatedAt: string
}

export type DisputeReason = 'payment_not_received' | 'payment_not_sent' | 'fraud' | 'other'

export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'closed'

export interface DisputeEvidence {
  id: string
  type: EvidenceType
  description: string
  attachments: MessageAttachment[]
  createdAt: string
}

export type EvidenceType = 'screenshot' | 'document' | 'transaction_proof' | 'chat_log'

// Tipos de chat
export interface ChatConversation {
  id: string
  participants: User[]
  type: ConversationType
  name?: string
  avatar?: string
  lastMessage?: ChatMessage
  unreadCount: number
  isArchived: boolean
  isMuted: boolean
  createdAt: string
  updatedAt: string
}

export type ConversationType = 'direct' | 'group' | 'trade'

export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  content: string
  type: MessageType
  replyTo?: string
  attachments?: MessageAttachment[]
  reactions?: MessageReaction[]
  status: MessageStatus
  createdAt: string
  updatedAt: string
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface MessageReaction {
  emoji: string
  userId: string
  createdAt: string
}

// Tipos de usuário público
export interface PublicUser {
  id: string
  firstName?: string
  lastName?: string
  username?: string
  display_name?: string
  email?: string
  avatar?: string
  isVerified?: boolean
  verified?: boolean
  badges: Badge[]
  reputation?: UserReputation
  stats?: UserStats
  total_trades?: number
  success_rate?: number
  avg_rating?: number
  is_online?: boolean
  isOnline?: boolean
  last_seen?: string
  lastSeen?: string
  joined_date?: string
}

export interface UserReputation {
  score: number
  level: ReputationLevel
  completedTrades: number
  successRate: number
  avgRating: number
  totalVolume: string
  joinDate: string
}

export type ReputationLevel = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

export interface UserStats {
  totalTrades: number
  buyTrades: number
  sellTrades: number
  avgResponseTime: number
  avgReleaseTime: number
  positiveRatings: number
  neutralRatings: number
  negativeRatings: number
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  color: string
  rarity: BadgeRarity
  earnedAt: string
}

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary'

// Tipos de API
export interface ApiResponse<T = any> {
  data: T
  message: string
  success: boolean
  timestamp: string
}

export interface PaginatedResponse<T = any> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, any>
  timestamp: string
}

// Tipos de formulários
export interface FormError {
  field: string
  message: string
}

export interface FormState<T = any> {
  data: T
  errors: FormError[]
  isSubmitting: boolean
  isValid: boolean
}

// Tipos de notificação
export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any>
  isRead: boolean
  createdAt: string
}

export type NotificationType =
  | 'trade_update'
  | 'payment_received'
  | 'message'
  | 'security'
  | 'system'
  | 'marketing'

// Tipos de configurações
export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  language: string
  currency: string
  timezone: string
  notifications: NotificationSettings
  security: SecuritySettings
  trading: TradingSettings
}

export interface SecuritySettings {
  twoFactorEnabled: boolean
  biometricEnabled: boolean
  sessionTimeout: number
  loginNotifications: boolean
}

export interface TradingSettings {
  defaultPaymentMethods: string[]
  autoAcceptTrades: boolean
  maxActiveOrders: number
  defaultTimeLimit: number
}
