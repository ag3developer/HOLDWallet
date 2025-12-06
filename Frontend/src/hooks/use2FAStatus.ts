/**
 * 🔐 use2FAStatus Hook
 * =====================
 * 
 * React hook to check if the current user has 2FA enabled.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api';

export interface TwoFactorStatus {
  enabled: boolean;
  email?: string;
  last_used_at?: string;
  enabled_at?: string;
}

/**
 * Fetch 2FA status from the backend
 */
async function fetch2FAStatus(): Promise<TwoFactorStatus> {
  const response = await apiClient.get<TwoFactorStatus>('/auth/2fa/status');
  return response.data;
}

/**
 * Hook to get current user's 2FA status
 */
export function use2FAStatus() {
  return useQuery<TwoFactorStatus>({
    queryKey: ['2fa-status'],
    queryFn: fetch2FAStatus,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });
}

export default use2FAStatus;
