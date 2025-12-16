import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  traderProfileService,
  TraderProfile,
  TraderProfileCreate,
  TraderProfileUpdate,
} from '@/services/traderProfileService'
import { useAuthStore } from '@/stores/useAuthStore'

// Keys para React Query
export const TRADER_PROFILE_KEYS = {
  all: ['trader-profiles'] as const,
  my: () => [...TRADER_PROFILE_KEYS.all, 'me'] as const,
  public: (id: string) => [...TRADER_PROFILE_KEYS.all, 'public', id] as const,
}

// LocalStorage keys
const LS_KEYS = {
  myProfile: 'trader_profile_cache',
  timestamp: 'trader_profile_cache_timestamp',
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

/**
 * Hook para buscar o perfil do trader autenticado
 * Com cache em React Query + localStorage
 */
export function useMyTraderProfile() {
  const { token } = useAuthStore()

  return useQuery({
    queryKey: TRADER_PROFILE_KEYS.my(),
    queryFn: async () => {
      if (!token) {
        console.error('[useMyTraderProfile] ❌ No authentication token')
        throw new Error('No authentication token')
      }

      console.log('[useMyTraderProfile] 📤 Fetching from API...')
      console.log('[useMyTraderProfile] Token status:', token ? '✅ Present' : '❌ Missing')

      try {
        // Buscar do backend
        const profile = await traderProfileService.getMyProfile(token)
        console.log('[useMyTraderProfile] ✅ Profile fetched:', profile)

        // Salvar no localStorage
        try {
          localStorage.setItem(LS_KEYS.myProfile, JSON.stringify(profile))
          localStorage.setItem(LS_KEYS.timestamp, Date.now().toString())
          console.log('[useMyTraderProfile] 💾 Cached in localStorage')
        } catch (error) {
          console.error('[useMyTraderProfile] ⚠️ Failed to cache in localStorage:', error)
        }

        return profile
      } catch (error) {
        console.error('[useMyTraderProfile] ❌ Error fetching profile:', error)
        throw error
      }
    },
    enabled: !!token,
    staleTime: CACHE_DURATION, // Cache por 5 minutos
    gcTime: 10 * 60 * 1000, // Manter em memória por 10 minutos
    retry: 2,
    retryDelay: 1000,
    // Tentar carregar do localStorage primeiro
    placeholderData: () => {
      try {
        const cached = localStorage.getItem(LS_KEYS.myProfile)
        const timestamp = localStorage.getItem(LS_KEYS.timestamp)

        if (cached && timestamp) {
          const age = Date.now() - Number.parseInt(timestamp, 10)

          // Se cache tem menos de 5 minutos, usar
          if (age < CACHE_DURATION) {
            console.log('[useMyTraderProfile] Using localStorage cache')
            return JSON.parse(cached) as TraderProfile
          }
        }
      } catch (error) {
        console.error('[useMyTraderProfile] Failed to read localStorage cache:', error)
      }
      return undefined
    },
  })
}

/**
 * Hook para buscar perfil público de outro trader
 */
export function usePublicTraderProfile(profileId: string | undefined) {
  return useQuery({
    queryKey: TRADER_PROFILE_KEYS.public(profileId || ''),
    queryFn: async () => {
      if (!profileId) {
        throw new Error('No profile ID provided')
      }
      return traderProfileService.getPublicProfile(profileId)
    },
    enabled: !!profileId,
    staleTime: 10 * 60 * 1000, // Perfis públicos podem ser cacheados por mais tempo
    gcTime: 30 * 60 * 1000,
  })
}

/**
 * Hook para criar perfil de trader
 */
export function useCreateTraderProfile() {
  const queryClient = useQueryClient()
  const { token } = useAuthStore()

  return useMutation({
    mutationFn: async (data: TraderProfileCreate) => {
      if (!token) {
        throw new Error('No authentication token')
      }
      return traderProfileService.createProfile(data, token)
    },
    onSuccess: newProfile => {
      // Atualizar cache do React Query
      queryClient.setQueryData(TRADER_PROFILE_KEYS.my(), newProfile)

      // Atualizar localStorage
      try {
        localStorage.setItem(LS_KEYS.myProfile, JSON.stringify(newProfile))
        localStorage.setItem(LS_KEYS.timestamp, Date.now().toString())
      } catch (error) {
        console.error('[useCreateTraderProfile] Failed to cache:', error)
      }

      console.log('[useCreateTraderProfile] Profile created and cached')
    },
  })
}

/**
 * Hook para atualizar perfil de trader
 */
export function useUpdateTraderProfile() {
  const queryClient = useQueryClient()
  const { token } = useAuthStore()

  return useMutation({
    mutationFn: async (data: TraderProfileUpdate) => {
      if (!token) {
        throw new Error('No authentication token')
      }
      return traderProfileService.updateProfile(data, token)
    },
    onSuccess: updatedProfile => {
      // Atualizar cache do React Query
      queryClient.setQueryData(TRADER_PROFILE_KEYS.my(), updatedProfile)

      // Atualizar localStorage
      try {
        localStorage.setItem(LS_KEYS.myProfile, JSON.stringify(updatedProfile))
        localStorage.setItem(LS_KEYS.timestamp, Date.now().toString())
      } catch (error) {
        console.error('[useUpdateTraderProfile] Failed to cache:', error)
      }

      console.log('[useUpdateTraderProfile] Profile updated and cached')
    },
  })
}

/**
 * Limpa o cache do perfil (útil em logout)
 */
export function clearTraderProfileCache() {
  try {
    localStorage.removeItem(LS_KEYS.myProfile)
    localStorage.removeItem(LS_KEYS.timestamp)
    console.log('[clearTraderProfileCache] Cache cleared')
  } catch (error) {
    console.error('[clearTraderProfileCache] Failed to clear cache:', error)
  }
}
