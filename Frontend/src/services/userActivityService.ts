/**
 * User Activity Service
 * Serviço para buscar atividades do usuário
 */
import { apiClient } from './api'

export interface UserActivity {
  id: number
  user_id: number
  activity_type:
    | 'login'
    | 'logout'
    | 'trade'
    | 'security'
    | 'wallet'
    | 'kyc'
    | 'withdrawal'
    | 'deposit'
  description: string
  status: 'success' | 'failed' | 'pending' | 'cancelled'
  extra_data?: Record<string, any>
  ip_address?: string
  user_agent?: string
  timestamp: string
}

export interface UserActivityListResponse {
  total: number
  activities: UserActivity[]
}

export class UserActivityService {
  /**
   * Busca atividades do usuário com paginação
   */
  static async getUserActivities(params?: {
    limit?: number
    offset?: number
    activity_type?: string
  }): Promise<UserActivityListResponse> {
    try {
      const response = await apiClient.get<UserActivityListResponse>('/users/me/activities', {
        params: {
          limit: params?.limit || 50,
          offset: params?.offset || 0,
          ...(params?.activity_type && { activity_type: params.activity_type }),
        },
      })

      return response.data
    } catch (error: any) {
      console.warn('[UserActivityService] ⚠️ Endpoint /users/me/activities ainda não implementado')
      // Retorna dados vazios em vez de erro
      return {
        items: [],
        total: 0,
        limit: params?.limit || 50,
        offset: params?.offset || 0,
      }
    }
  }

  /**
   * Formata o timestamp para exibição com timezone local
   */
  static formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp)

    // Formata com timezone local do usuário
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    }).format(date)
  }

  /**
   * Formata timestamp relativo (ex: "há 5 minutos")
   */
  static formatRelativeTime(timestamp: string): string {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'agora mesmo'
    if (diffMins < 60) return `há ${diffMins} minuto${diffMins > 1 ? 's' : ''}`
    if (diffHours < 24) return `há ${diffHours} hora${diffHours > 1 ? 's' : ''}`
    if (diffDays < 7) return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`

    // Mais de 7 dias, mostra data completa
    return this.formatTimestamp(timestamp)
  }

  /**
   * Extrai informações de device/browser do extra_data
   */
  static getDeviceInfo(activity: UserActivity): string {
    if (activity.extra_data?.device) {
      return activity.extra_data.device
    }

    if (activity.user_agent) {
      // Parse básico do user agent
      const ua = activity.user_agent
      if (ua.includes('Chrome')) return 'Chrome'
      if (ua.includes('Firefox')) return 'Firefox'
      if (ua.includes('Safari')) return 'Safari'
      if (ua.includes('Edge')) return 'Edge'
      return 'Unknown Browser'
    }

    return 'Unknown Device'
  }
}

export default UserActivityService
