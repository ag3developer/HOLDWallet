import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/useAuthStore'
import {
  traderProfileService,
  TraderProfile,
  TraderProfileCreate,
  TraderProfileUpdate,
} from '@/services/traderProfileService'

interface UseTraderProfileReturn {
  profile: TraderProfile | null
  loading: boolean
  error: string | null
  createProfile: (data: TraderProfileCreate) => Promise<TraderProfile>
  updateProfile: (data: TraderProfileUpdate) => Promise<TraderProfile>
  fetchMyProfile: () => Promise<void>
  refetch: () => Promise<void>
}

export function useTraderProfile(): UseTraderProfileReturn {
  const { token } = useAuthStore()
  const [profile, setProfile] = useState<TraderProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMyProfile = async () => {
    if (!token) {
      setProfile(null)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await traderProfileService.getMyProfile(token)
      setProfile(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch profile'
      setError(message)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const createProfile = async (data: TraderProfileCreate): Promise<TraderProfile> => {
    if (!token) {
      throw new Error('Not authenticated')
    }

    try {
      setLoading(true)
      setError(null)
      const newProfile = await traderProfileService.createProfile(data, token)
      setProfile(newProfile)
      return newProfile
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create profile'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (data: TraderProfileUpdate): Promise<TraderProfile> => {
    if (!token) {
      throw new Error('Not authenticated')
    }

    try {
      setLoading(true)
      setError(null)
      const updated = await traderProfileService.updateProfile(data, token)
      setProfile(updated)
      return updated
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile'
      setError(message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const refetch = async () => {
    await fetchMyProfile()
  }

  useEffect(() => {
    if (token) {
      fetchMyProfile()
    }
  }, [token])

  return {
    profile,
    loading,
    error,
    createProfile,
    updateProfile,
    fetchMyProfile,
    refetch,
  }
}
