/**
 * WebAuthn Service
 * Serviço para gerenciar autenticação biométrica (Face ID, Touch ID, Windows Hello)
 */

import { apiClient } from './api'
import { apiConfig } from '@/config/api'

export interface WebAuthnCredential {
  id: string
  device_name: string
  created_at: string
  last_used_at: string | null
}

export interface WebAuthnStatus {
  has_biometric: boolean
  credentials: WebAuthnCredential[]
}

export interface RegistrationOptions {
  options: PublicKeyCredentialCreationOptions
}

export interface AuthenticationOptions {
  options: PublicKeyCredentialRequestOptions
}

class WebAuthnService {
  private baseUrl = `${apiConfig.baseURL}/auth/webauthn`

  /**
   * Verifica se o navegador suporta WebAuthn
   */
  isSupported(): boolean {
    return !!(window.PublicKeyCredential && typeof window.PublicKeyCredential === 'function')
  }

  /**
   * Verifica se o dispositivo tem autenticador de plataforma (biometria)
   */
  async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isSupported()) return false

    try {
      return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    } catch {
      return false
    }
  }

  /**
   * Obtém o status do WebAuthn para o usuário atual
   */
  async getStatus(): Promise<WebAuthnStatus> {
    const response = await apiClient.get(`${this.baseUrl}/status`)
    return response.data
  }

  /**
   * Inicia o registro de uma nova credencial biométrica
   */
  async getRegistrationOptions(authenticatorType: string = 'platform'): Promise<any> {
    const response = await apiClient.post(`${this.baseUrl}/register/options`, {
      authenticator_type: authenticatorType,
    })
    return response.data.options
  }

  /**
   * Registra uma nova credencial biométrica
   */
  async registerCredential(
    deviceName?: string
  ): Promise<{ success: boolean; credential: WebAuthnCredential }> {
    // 1. Obter opções do servidor
    const options = await this.getRegistrationOptions()

    // 2. Converter dados para formato correto
    const publicKeyOptions = this.prepareRegistrationOptions(options)

    // 3. Criar credencial usando biometria do dispositivo
    const credential = (await navigator.credentials.create({
      publicKey: publicKeyOptions,
    })) as PublicKeyCredential

    if (!credential) {
      throw new Error('Falha ao criar credencial')
    }

    // 4. Preparar resposta para o servidor
    const credentialResponse = this.prepareCredentialResponse(credential)

    // 5. Verificar e salvar no servidor
    const response = await apiClient.post(`${this.baseUrl}/register/verify`, {
      credential: credentialResponse,
      device_name: deviceName,
    })

    return response.data
  }

  /**
   * Inicia autenticação biométrica
   */
  async getAuthenticationOptions(): Promise<any> {
    const response = await apiClient.post(`${this.baseUrl}/authenticate/options`)
    return response.data.options
  }

  /**
   * Verifica autenticação biométrica para autorizar ações sensíveis
   * Retorna um token biométrico que pode ser usado como alternativa ao 2FA
   */
  async authenticate(): Promise<string | null> {
    // 1. Obter opções do servidor
    const options = await this.getAuthenticationOptions()

    // 2. Converter dados para formato correto
    const publicKeyOptions = this.prepareAuthenticationOptions(options)

    // 3. Solicitar autenticação biométrica
    const credential = (await navigator.credentials.get({
      publicKey: publicKeyOptions,
    })) as PublicKeyCredential

    if (!credential) {
      throw new Error('Falha na autenticação')
    }

    // 4. Preparar resposta para o servidor
    const credentialResponse = this.prepareAuthenticationResponse(credential)

    // 5. Verificar no servidor e obter token biométrico
    const response = await apiClient.post(`${this.baseUrl}/authenticate/verify`, {
      credential: credentialResponse,
    })

    if (response.data.success && response.data.biometric_token) {
      console.log('🔐 Biometric token received')
      return response.data.biometric_token
    }

    // Fallback para boolean (compatibilidade)
    return response.data.success ? 'biometric_verified_legacy' : null
  }

  /**
   * Remove uma credencial biométrica
   */
  async deleteCredential(credentialId: string): Promise<boolean> {
    const response = await apiClient.delete(`${this.baseUrl}/credential`, {
      data: { credential_id: credentialId },
    })
    return response.data.success
  }

  // Helpers para converter dados

  private prepareRegistrationOptions(options: any): PublicKeyCredentialCreationOptions {
    return {
      ...options,
      challenge: this.base64UrlToBuffer(options.challenge),
      user: {
        ...options.user,
        id: this.base64UrlToBuffer(options.user.id),
      },
      excludeCredentials:
        options.excludeCredentials?.map((cred: any) => ({
          ...cred,
          id: this.base64UrlToBuffer(cred.id),
        })) || [],
    }
  }

  private prepareAuthenticationOptions(options: any): PublicKeyCredentialRequestOptions {
    return {
      ...options,
      challenge: this.base64UrlToBuffer(options.challenge),
      allowCredentials:
        options.allowCredentials?.map((cred: any) => ({
          ...cred,
          id: this.base64UrlToBuffer(cred.id),
        })) || [],
    }
  }

  private prepareCredentialResponse(credential: PublicKeyCredential): any {
    const response = credential.response as AuthenticatorAttestationResponse

    return {
      id: credential.id,
      rawId: this.bufferToBase64Url(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: this.bufferToBase64Url(response.clientDataJSON),
        attestationObject: this.bufferToBase64Url(response.attestationObject),
      },
    }
  }

  private prepareAuthenticationResponse(credential: PublicKeyCredential): any {
    const response = credential.response as AuthenticatorAssertionResponse

    return {
      id: credential.id,
      rawId: this.bufferToBase64Url(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: this.bufferToBase64Url(response.clientDataJSON),
        authenticatorData: this.bufferToBase64Url(response.authenticatorData),
        signature: this.bufferToBase64Url(response.signature),
        userHandle: response.userHandle ? this.bufferToBase64Url(response.userHandle) : null,
      },
    }
  }

  private base64UrlToBuffer(base64url: string): ArrayBuffer {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
    const padLen = (4 - (base64.length % 4)) % 4
    const padded = base64 + '='.repeat(padLen)
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  }

  private bufferToBase64Url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    const base64 = btoa(binary)
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }
}

export const webAuthnService = new WebAuthnService()
