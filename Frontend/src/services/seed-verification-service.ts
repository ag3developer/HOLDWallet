/**
 * 🔐 Seed Phrase Verification Service
 * Secure communication with backend for seed phrase verification
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export interface SeedVerificationStartResponse {
  required_positions: number[]
  attempt_id: string
}

export interface SeedVerificationRequest {
  wallet_id: string
  selected_positions: number[]
}

export interface SeedVerificationResponse {
  verified: boolean
  message: string
}

export interface ExportSeedPhraseResponse {
  success: boolean
  seed_phrase: string
  word_count: number
  warning: string
}

class SeedVerificationService {
  /**
   * 🔐 Start seed phrase verification
   * Requests backend to generate 3 random positions
   * Seed phrase is NOT sent to frontend
   */
  async startSeedVerification(walletId: string): Promise<SeedVerificationStartResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/wallets/verify-seed-start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_id: walletId,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to start seed verification')
      }

      return await response.json()
    } catch (error) {
      console.error('Error starting seed verification:', error)
      throw error
    }
  }

  /**
   * 🔐 Verify user's selected seed words
   * Backend validates the selected positions against encrypted seed
   */
  async verifySeedWords(
    walletId: string,
    selectedPositions: number[]
  ): Promise<SeedVerificationResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/wallets/verify-seed-words`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_id: walletId,
          selected_positions: selectedPositions,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Verification failed')
      }

      return await response.json()
    } catch (error) {
      console.error('Error verifying seed words:', error)
      throw error
    }
  }

  /**
   * 🔐 Export seed phrase (AFTER successful verification)
   * Only return the seed phrase if verification passed
   */
  async exportSeedPhrase(walletId: string): Promise<ExportSeedPhraseResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/wallets/export-seed-phrase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_id: walletId,
          selected_positions: [], // Empty, verification already done
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to export seed phrase')
      }

      return await response.json()
    } catch (error) {
      console.error('Error exporting seed phrase:', error)
      throw error
    }
  }
}

export const seedVerificationService = new SeedVerificationService()
