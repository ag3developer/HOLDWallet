import { useState, useEffect } from 'react';
import WalletService from '../services/wallet-service';
import { useAuthStore } from '../stores/useAuthStore';

export interface WalletBalances {
  [symbol: string]: number;
}

export function useWalletBalances(walletId?: string) {
  const [balances, setBalances] = useState<WalletBalances>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isStoreReady, setIsStoreReady] = useState(false);
  const { token } = useAuthStore();

  // Wait for Zustand store to be ready (rehydrated from localStorage)
  useEffect(() => {
    // Small delay to ensure localStorage is read by Zustand
    const timer = setTimeout(() => {
      setIsStoreReady(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isStoreReady) {
      console.log('[useWalletBalances] Store not ready yet, waiting...');
      setLoading(true);
      setBalances({});
      return;
    }

    if (!walletId) {
      console.log('[useWalletBalances] No wallet ID provided');
      setLoading(false);
      setBalances({});
      return;
    }

    // Get token from localStorage directly as backup
    const getToken = (): string | null => {
      // First try the Zustand store
      if (token) {
        console.log('[useWalletBalances] Using token from store');
        return token;
      }

      // Try Zustand persisted state
      const authState = localStorage.getItem('auth-storage');
      if (authState) {
        try {
          const parsed = JSON.parse(authState);
          const storedToken = parsed.state?.token;
          if (storedToken) {
            console.log('[useWalletBalances] Using token from auth-storage');
            return storedToken;
          }
        } catch (e) {
          console.debug('[useWalletBalances] Failed to parse auth-storage:', e instanceof Error ? e.message : String(e));
        }
      }

      // Try direct localStorage key
      const directToken = localStorage.getItem('authToken');
      if (directToken) {
        console.log('[useWalletBalances] Using token from authToken key');
        return directToken;
      }

      return null;
    };

    const authToken = getToken();
    if (!authToken) {
      console.warn('[useWalletBalances] No auth token available');
      setLoading(false);
      setError(new Error('Not authenticated. Please login first.'));
      setBalances({});
      return;
    }

    const fetchBalances = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('[useWalletBalances] Fetching balances for wallet:', walletId);
        
        const data = await WalletService.getWalletBalances(walletId);
        console.log('[useWalletBalances] Balances fetched successfully:', data);
        setBalances(data);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch balances');
        setError(error);
        console.error('[useWalletBalances] Error:', error);
        setBalances({});
      } finally {
        setLoading(false);
      }
    };

    fetchBalances();
  }, [walletId, token, isStoreReady]);

  return { balances, loading, error };
}
