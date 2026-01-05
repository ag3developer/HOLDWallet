/**
 * 🛡️ HOLD Wallet - Admin Hooks
 * ============================
 *
 * Hooks personalizados para o módulo administrativo.
 */

import { useState, useEffect, useCallback } from 'react'
import {
  getDashboardStats,
  getRecentActivities,
  getUsers,
  getUserById,
  getTrades,
  getP2POrders,
  getP2PDisputes,
  getSettings,
  updateSettings,
  type DashboardStats,
  type RecentActivity,
  type User,
  type UserListParams,
  type Trade,
  type TradeListParams,
  type P2POrder,
  type Dispute,
  type SystemSettings,
} from '../../services/admin'

// ============================================
// Dashboard Hook
// ============================================

export function useAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activities, setActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [statsData, activitiesData] = await Promise.all([
        getDashboardStats(),
        getRecentActivities(10),
      ])
      setStats(statsData)
      setActivities(activitiesData)
    } catch {
      setError('Erro ao carregar dados do dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { stats, activities, loading, error, refresh: fetchData }
}

// ============================================
// Users Hook
// ============================================

export function useAdminUsers(initialParams: UserListParams = {}) {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [params, setParams] = useState<UserListParams>(initialParams)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getUsers(params)
      setUsers(data.users)
      setTotal(data.total)
    } catch {
      setError('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const updateParams = (newParams: Partial<UserListParams>) => {
    setParams(prev => ({ ...prev, ...newParams }))
  }

  return { users, total, loading, error, params, updateParams, refresh: fetchUsers }
}

export function useAdminUser(userId: string | undefined) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUser = useCallback(async () => {
    if (!userId) return
    try {
      setLoading(true)
      setError(null)
      const data = await getUserById(userId)
      setUser(data)
    } catch {
      setError('Erro ao carregar usuário')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  return { user, loading, error, refresh: fetchUser }
}

// ============================================
// Trades Hook
// ============================================

export function useAdminTrades(initialParams: TradeListParams = {}) {
  const [trades, setTrades] = useState<Trade[]>([])
  const [total, setTotal] = useState(0)
  const [params, setParams] = useState<TradeListParams>(initialParams)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTrades = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getTrades(params)
      setTrades(data.trades)
      setTotal(data.total)
    } catch {
      setError('Erro ao carregar trades')
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    fetchTrades()
  }, [fetchTrades])

  const updateParams = (newParams: Partial<TradeListParams>) => {
    setParams(prev => ({ ...prev, ...newParams }))
  }

  return { trades, total, loading, error, params, updateParams, refresh: fetchTrades }
}

// ============================================
// P2P Hook
// ============================================

interface P2PParams {
  skip?: number
  limit?: number
  status?: string
}

export function useAdminP2P(initialParams: P2PParams = {}) {
  const [orders, setOrders] = useState<P2POrder[]>([])
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [params, setParams] = useState<P2PParams>(initialParams)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [ordersData, disputesData] = await Promise.all([
        getP2POrders(params),
        getP2PDisputes(params),
      ])
      setOrders(ordersData.orders || [])
      setDisputes(disputesData.disputes || [])
    } catch {
      setError('Erro ao carregar dados P2P')
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const updateParams = (newParams: Partial<P2PParams>) => {
    setParams(prev => ({ ...prev, ...newParams }))
  }

  return { orders, disputes, loading, error, params, updateParams, refresh: fetchData }
}

// ============================================
// Settings Hook
// ============================================

export function useAdminSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getSettings()
      setSettings(data)
    } catch {
      setError('Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const saveSettings = async (newSettings: Partial<SystemSettings>) => {
    try {
      setSaving(true)
      setError(null)
      const data = await updateSettings(newSettings)
      setSettings(data)
      return true
    } catch {
      setError('Erro ao salvar configurações')
      return false
    } finally {
      setSaving(false)
    }
  }

  return { settings, loading, saving, error, saveSettings, refresh: fetchSettings }
}
