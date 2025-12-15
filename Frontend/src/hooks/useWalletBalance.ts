import { useQuery, useMutation } from '@tanstack/react-query'
import axios from 'axios'

const API_BASE = 'http://localhost:8000'

interface WalletBalance {
  cryptocurrency: string
  available_balance: number
  locked_balance: number
  total_balance: number
}

export const useWalletBalance = (userId: string | undefined, crypto?: string) => {
  return useQuery({
    queryKey: ['wallet-balance', userId, crypto],
    queryFn: async () => {
      if (!userId) return null

      const params = new URLSearchParams({
        user_id: userId,
        ...(crypto && { cryptocurrency: crypto }),
      })

      const { data } = await axios.get(`${API_BASE}/p2p/wallet/balance?${params}`)
      return data.data
    },
    enabled: !!userId,
    staleTime: 30000,
  })
}

export const useAllWalletBalances = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['wallet-balances', userId],
    queryFn: async () => {
      if (!userId) return []

      const { data } = await axios.get(`${API_BASE}/p2p/wallet/balance?user_id=${userId}`)
      return Array.isArray(data.data) ? data.data : [data.data]
    },
    enabled: !!userId,
    staleTime: 30000,
  })
}

export const useDepositBalance = () => {
  return useMutation({
    mutationFn: async (variables: { userId: string; cryptocurrency: string; amount: number }) => {
      const { data } = await axios.post(
        `${API_BASE}/p2p/wallet/deposit?user_id=${variables.userId}`,
        {
          cryptocurrency: variables.cryptocurrency,
          amount: variables.amount,
        }
      )
      return data
    },
  })
}

export const useFreezeBalance = () => {
  return useMutation({
    mutationFn: async (variables: {
      userId: string
      cryptocurrency: string
      amount: number
      reason?: string
    }) => {
      const { data } = await axios.post(
        `${API_BASE}/p2p/wallet/freeze?user_id=${variables.userId}`,
        {
          cryptocurrency: variables.cryptocurrency,
          amount: variables.amount,
          reason: variables.reason || 'P2P Trade',
        }
      )
      return data
    },
  })
}
