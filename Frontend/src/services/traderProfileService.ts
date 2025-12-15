import { UUID } from 'crypto'

export interface TraderProfile {
  id: UUID
  user_id: UUID
  display_name: string
  avatar_url?: string
  bio?: string
  is_verified: boolean
  verification_level: string
  total_trades: number
  completed_trades: number
  success_rate: number
  average_rating: number
  total_reviews: number
  auto_accept_orders: boolean
  min_order_amount?: number
  max_order_amount?: number
  accepted_payment_methods?: string
  average_response_time?: number
  is_active: boolean
  is_blocked: boolean
  created_at: string
  updated_at: string
}

export interface TraderProfileCreate {
  display_name: string
  bio?: string
  avatar_url?: string
  min_order_amount?: number
  max_order_amount?: number
  accepted_payment_methods?: string
  auto_accept_orders?: boolean
}

export interface TraderProfileUpdate {
  display_name?: string
  bio?: string
  avatar_url?: string
  min_order_amount?: number
  max_order_amount?: number
  accepted_payment_methods?: string
  auto_accept_orders?: boolean
}

export interface TraderStats {
  id: UUID
  trader_id: UUID
  date: string
  trades_completed: number
  total_volume_brl: number
  success_rate: number
  average_rating: number
  new_reviews: number
  disputes: number
  created_at: string
}

class TraderProfileService {
  private API_BASE = 'http://127.0.0.1:8000'

  async createProfile(data: TraderProfileCreate, token: string): Promise<TraderProfile> {
    const response = await fetch(`${this.API_BASE}/trader-profiles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`Failed to create trader profile: ${response.statusText}`)
    }

    return response.json()
  }

  async getMyProfile(token: string): Promise<TraderProfile> {
    const response = await fetch(`${this.API_BASE}/trader-profiles/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch trader profile: ${response.statusText}`)
    }

    return response.json()
  }

  async updateProfile(data: TraderProfileUpdate, token: string): Promise<TraderProfile> {
    const response = await fetch(`${this.API_BASE}/trader-profiles/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`Failed to update trader profile: ${response.statusText}`)
    }

    return response.json()
  }

  async getPublicProfile(profileId: UUID): Promise<TraderProfile> {
    const response = await fetch(`${this.API_BASE}/trader-profiles/${profileId}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch trader profile: ${response.statusText}`)
    }

    return response.json()
  }

  async listTraders(options?: {
    skip?: number
    limit?: number
    sort_by?: 'success_rate' | 'average_rating' | 'total_trades' | 'created_at'
    order?: 'asc' | 'desc'
    verified_only?: boolean
  }): Promise<TraderProfile[]> {
    const params = new URLSearchParams()
    if (options?.skip) params.append('skip', options.skip.toString())
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.sort_by) params.append('sort_by', options.sort_by)
    if (options?.order) params.append('order', options.order)
    if (options?.verified_only) params.append('verified_only', 'true')

    const response = await fetch(`${this.API_BASE}/trader-profiles?${params.toString()}`)

    if (!response.ok) {
      throw new Error(`Failed to list traders: ${response.statusText}`)
    }

    return response.json()
  }

  async getTraderStats(profileId: UUID, days: number = 7): Promise<TraderStats[]> {
    const response = await fetch(
      `${this.API_BASE}/trader-profiles/${profileId}/stats?days=${days}`
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch trader stats: ${response.statusText}`)
    }

    return response.json()
  }
}

export const traderProfileService = new TraderProfileService()
