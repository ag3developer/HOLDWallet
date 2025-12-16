/**
 * Hook para buscar atividades do usuário
 */
import { useQuery } from '@tanstack/react-query'
import UserActivityService, { type UserActivityListResponse } from '@/services/userActivityService'

export interface UseUserActivitiesParams {
  limit?: number
  offset?: number
  activity_type?: string
  enabled?: boolean
}

export const useUserActivities = (params?: UseUserActivitiesParams) => {
  return useQuery<UserActivityListResponse>({
    queryKey: ['user-activities', params],
    queryFn: () => UserActivityService.getUserActivities(params),
    enabled: params?.enabled === true, // ✅ Desabilitado por padrão até endpoint estar pronto
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchOnWindowFocus: false, // ✅ Não refetch automático
    retry: 1, // ✅ Tentar apenas 1 vez
    retryDelay: 3000,
  })
}

export default useUserActivities
