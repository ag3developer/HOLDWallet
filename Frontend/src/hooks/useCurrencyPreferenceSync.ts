import { useEffect } from 'react'
import { apiClient } from '@/services/api'
import { useAuthStore } from '@/stores/useAuthStore'
import { useCurrencyStore, type Currency } from '@/stores/useCurrencyStore'

const SYNCED_KEY = 'currency-pref-synced'
const SUPPORTED: Currency[] = ['BRL', 'USD', 'EUR']

/** Salva a moeda de exibição no perfil do usuário (vale em qualquer aparelho). */
export async function saveCurrencyPreference(currency: Currency) {
  try {
    await apiClient.put('/users/me/preferences', { currency })
    localStorage.setItem(SYNCED_KEY, '1')
  } catch {
    /* sem rede: fica salva localmente e sobe na próxima sincronização */
  }
}

/**
 * Sincroniza a moeda do perfil com o app ao entrar.
 * Migração: quem escolheu uma moeda diferente de USD antes desta versão tem a escolha local enviada ao perfil.
 * Depois disso, o perfil é a fonte da verdade.
 */
export function useCurrencyPreferenceSync() {
  const { isAuthenticated, token } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated || !token) return
    let alive = true
    const run = async () => {
      const local = useCurrencyStore.getState().currency
      let synced = false
      try {
        synced = localStorage.getItem(SYNCED_KEY) === '1'
      } catch {
        /* armazenamento indisponível */
      }
      if (!synced && local !== 'USD') {
        await saveCurrencyPreference(local)
        return
      }
      try {
        const r = await apiClient.get<{ currency: Currency }>('/users/me/preferences')
        const remote = r.data?.currency
        if (alive && remote && SUPPORTED.includes(remote) && remote !== useCurrencyStore.getState().currency) {
          useCurrencyStore.getState().setCurrency(remote)
        }
        try {
          localStorage.setItem(SYNCED_KEY, '1')
        } catch {
          /* ignora */
        }
      } catch {
        /* mantém a escolha local */
      }
    }
    run()
    return () => {
      alive = false
    }
  }, [isAuthenticated, token])
}
