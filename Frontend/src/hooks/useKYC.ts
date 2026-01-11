/**
 * 🛡️ useKYC Hook - Gerenciamento de estado KYC
 * =============================================
 * Hook React para gerenciar estado e operações de KYC.
 *
 * Author: HOLD Wallet Team
 */

import { useState, useCallback, useEffect } from 'react'
import kycService, {
  KYCStatus,
  KYCLevel,
  KYCStatusResponse,
  KYCPersonalData,
  KYCLevelRequirements,
  DocumentType,
  KYCDocument,
} from '@/services/kyc'

interface UseKYCState {
  // Status da verificação
  verification: KYCStatusResponse | null
  loading: boolean
  error: string | null

  // Requisitos do nível
  requirements: KYCLevelRequirements | null

  // Upload progress
  uploading: boolean
  uploadProgress: number

  // Form states
  submitting: boolean
}

interface UseKYCActions {
  // Carregar dados
  loadStatus: () => Promise<void>
  loadRequirements: (level: KYCLevel) => Promise<void>

  // Operações
  startVerification: (level: KYCLevel, consent: boolean) => Promise<boolean>
  savePersonalData: (data: KYCPersonalData) => Promise<boolean>
  uploadDocument: (
    type: DocumentType,
    file: File
  ) => Promise<{ success: boolean; documentId?: string; error?: string }>
  deleteDocument: (documentId: string) => Promise<boolean>
  submitForReview: () => Promise<boolean>
  exportData: () => Promise<void>

  // Utilitários
  clearError: () => void
  canProceedToStep: (step: number) => boolean
  getMissingDocuments: () => DocumentType[]
  getUploadedDocuments: () => KYCDocument[]
}

export function useKYC(): UseKYCState & UseKYCActions {
  // State
  const [verification, setVerification] = useState<KYCStatusResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requirements, setRequirements] = useState<KYCLevelRequirements | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  // Carregar status da verificação
  const loadStatus = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const status = await kycService.getKYCStatus()
      setVerification(status)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar status do KYC'

      // Se não existe verificação, não é erro - usuário ainda não iniciou
      if ((err as { response?: { status?: number } })?.response?.status !== 404) {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Carregar requisitos do nível
  const loadRequirements = useCallback(async (level: KYCLevel) => {
    try {
      const reqs = await kycService.getLevelRequirements(level)
      setRequirements(reqs)
    } catch (err: unknown) {
      console.error('Erro ao carregar requisitos:', err)
    }
  }, [])

  // Iniciar verificação
  const startVerification = useCallback(
    async (level: KYCLevel, consent: boolean): Promise<boolean> => {
      setSubmitting(true)
      setError(null)

      try {
        await kycService.startKYC({ level, consent })
        await loadStatus()
        await loadRequirements(level)
        return true
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao iniciar verificação'
        setError(errorMessage)
        return false
      } finally {
        setSubmitting(false)
      }
    },
    [loadStatus, loadRequirements]
  )

  // Salvar dados pessoais
  const savePersonalData = useCallback(
    async (data: KYCPersonalData): Promise<boolean> => {
      setSubmitting(true)
      setError(null)

      try {
        await kycService.savePersonalData(data)
        await loadStatus()
        return true
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar dados pessoais'
        setError(errorMessage)
        return false
      } finally {
        setSubmitting(false)
      }
    },
    [loadStatus]
  )

  // Upload de documento
  const uploadDocument = useCallback(
    async (
      type: DocumentType,
      file: File
    ): Promise<{ success: boolean; documentId?: string; error?: string }> => {
      setUploading(true)
      setUploadProgress(0)
      setError(null)

      try {
        // Validar arquivo
        const maxSize = 10 * 1024 * 1024 // 10MB
        if (file.size > maxSize) {
          throw new Error('Arquivo muito grande. Máximo permitido: 10MB')
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
        if (!allowedTypes.includes(file.type)) {
          throw new Error('Tipo de arquivo não permitido. Use: JPEG, PNG, WebP ou PDF')
        }

        // Simular progresso (API não retorna progresso real)
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => Math.min(prev + 10, 90))
        }, 200)

        const result = await kycService.uploadDocument(type, file)

        clearInterval(progressInterval)
        setUploadProgress(100)

        // Recarregar status
        await loadStatus()

        return { success: true, documentId: result.document_id }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao enviar documento'
        setError(errorMessage)
        return { success: false, error: errorMessage }
      } finally {
        setUploading(false)
        setUploadProgress(0)
      }
    },
    [loadStatus]
  )

  // Deletar documento
  const deleteDocument = useCallback(
    async (documentId: string): Promise<boolean> => {
      try {
        await kycService.deleteDocument(documentId)
        await loadStatus()
        return true
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao remover documento'
        setError(errorMessage)
        return false
      }
    },
    [loadStatus]
  )

  // Submeter para revisão
  const submitForReview = useCallback(async (): Promise<boolean> => {
    setSubmitting(true)
    setError(null)

    try {
      await kycService.submitForReview()
      await loadStatus()
      return true
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao submeter verificação'
      setError(errorMessage)
      return false
    } finally {
      setSubmitting(false)
    }
  }, [loadStatus])

  // Exportar dados (LGPD)
  const exportData = useCallback(async () => {
    try {
      const blob = await kycService.exportMyData()

      // Criar link de download
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kyc_data_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao exportar dados'
      setError(errorMessage)
    }
  }, [])

  // Limpar erro
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Verificar se pode avançar para próximo step
  const canProceedToStep = useCallback(
    (step: number): boolean => {
      if (!verification) return step === 1

      switch (step) {
        case 1: // Consentimento
          return true
        case 2: // Dados pessoais
          return verification.consent_given
        case 3: // Documentos
          return verification.consent_given // Dados pessoais salvos implicitamente
        case 4: // Revisão
          return verification.can_submit
        default:
          return false
      }
    },
    [verification]
  )

  // Obter documentos faltantes
  const getMissingDocuments = useCallback((): DocumentType[] => {
    if (!verification) return []
    return verification.missing_documents
  }, [verification])

  // Obter documentos enviados
  const getUploadedDocuments = useCallback((): KYCDocument[] => {
    if (!verification) return []
    return verification.documents
  }, [verification])

  // Carregar status inicial
  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  return {
    // State
    verification,
    loading,
    error,
    requirements,
    uploading,
    uploadProgress,
    submitting,

    // Actions
    loadStatus,
    loadRequirements,
    startVerification,
    savePersonalData,
    uploadDocument,
    deleteDocument,
    submitForReview,
    exportData,
    clearError,
    canProceedToStep,
    getMissingDocuments,
    getUploadedDocuments,
  }
}

// ============================================================
// HOOKS AUXILIARES
// ============================================================

/**
 * Hook para verificar se usuário tem KYC aprovado
 */
export function useKYCApproved(): {
  isApproved: boolean
  level: KYCLevel | null
  loading: boolean
} {
  const [isApproved, setIsApproved] = useState(false)
  const [level, setLevel] = useState<KYCLevel | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkKYC = async () => {
      try {
        const status = await kycService.getKYCStatus()
        setIsApproved(status.status === KYCStatus.APPROVED)
        setLevel(status.level)
      } catch {
        setIsApproved(false)
        setLevel(null)
      } finally {
        setLoading(false)
      }
    }

    checkKYC()
  }, [])

  return { isApproved, level, loading }
}

/**
 * Hook para obter limites do usuário
 */
export function useKYCLimits(): {
  limits: Record<string, { daily: number; monthly: number; transaction: number }> | null
  loading: boolean
} {
  const [limits, setLimits] = useState<Record<
    string,
    { daily: number; monthly: number; transaction: number }
  > | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadLimits = async () => {
      try {
        const status = await kycService.getKYCStatus()
        if (status.limits?.limits) {
          const formattedLimits: Record<
            string,
            { daily: number; monthly: number; transaction: number }
          > = {}

          Object.entries(status.limits.limits).forEach(([service, serviceLimits]) => {
            formattedLimits[service] = {
              daily: serviceLimits.daily_limit_brl,
              monthly: serviceLimits.monthly_limit_brl,
              transaction: serviceLimits.transaction_limit_brl,
            }
          })

          setLimits(formattedLimits)
        }
      } catch {
        setLimits(null)
      } finally {
        setLoading(false)
      }
    }

    loadLimits()
  }, [])

  return { limits, loading }
}

// ============================================================
// HOOKS DE BIOMETRIA E VALIDAÇÃO CPF
// ============================================================

import type {
  CPFValidationResult,
  CPFFaceValidationResult,
  LivenessVerificationResult,
  SelfieVerificationResult,
  AutoVerificationResult,
  DocumentOCRResult,
} from '@/services/kyc'

/**
 * Hook para validação de CPF via SERPRO
 */
export function useCPFValidation() {
  const [validating, setValidating] = useState(false)
  const [result, setResult] = useState<CPFValidationResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const validateCPF = useCallback(
    async (cpf: string, name?: string, birthDate?: string): Promise<CPFValidationResult | null> => {
      setValidating(true)
      setError(null)
      setResult(null)

      try {
        const res = await kycService.validateCPF(cpf, name, birthDate)
        setResult(res)
        return res
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erro ao validar CPF'
        setError(errorMessage)
        return null
      } finally {
        setValidating(false)
      }
    },
    []
  )

  const getCPFSituation = useCallback(async (cpf: string): Promise<CPFValidationResult | null> => {
    setValidating(true)
    setError(null)

    try {
      const res = await kycService.getCPFSituation(cpf)
      setResult(res)
      return res
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao consultar CPF'
      setError(errorMessage)
      return null
    } finally {
      setValidating(false)
    }
  }, [])

  const validateWithFace = useCallback(
    async (cpf: string, selfie: File, name?: string): Promise<CPFFaceValidationResult | null> => {
      setValidating(true)
      setError(null)

      try {
        const res = await kycService.validateCPFWithFace(cpf, selfie, name)
        setResult(res)
        return res
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erro na validação facial'
        setError(errorMessage)
        return null
      } finally {
        setValidating(false)
      }
    },
    []
  )

  const clearResult = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return {
    validating,
    result,
    error,
    validateCPF,
    getCPFSituation,
    validateWithFace,
    clearResult,
  }
}

/**
 * Hook para verificação biométrica (AWS Rekognition)
 */
export function useBiometricVerification() {
  const [processing, setProcessing] = useState(false)
  const [livenessSessionId, setLivenessSessionId] = useState<string | null>(null)
  const [livenessResult, setLivenessResult] = useState<LivenessVerificationResult | null>(null)
  const [selfieResult, setSelfieResult] = useState<SelfieVerificationResult | null>(null)
  const [autoResult, setAutoResult] = useState<AutoVerificationResult | null>(null)
  const [ocrResult, setOcrResult] = useState<DocumentOCRResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Criar sessão de liveness
  const createLivenessSession = useCallback(async (): Promise<string | null> => {
    setProcessing(true)
    setError(null)

    try {
      const res = await kycService.createLivenessSession()
      setLivenessSessionId(res.session_id)
      return res.session_id
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar sessão de liveness'
      setError(errorMessage)
      return null
    } finally {
      setProcessing(false)
    }
  }, [])

  // Verificar resultado do liveness
  const verifyLiveness = useCallback(
    async (sessionId?: string): Promise<LivenessVerificationResult | null> => {
      const sid = sessionId || livenessSessionId
      if (!sid) {
        setError('Nenhuma sessão de liveness ativa')
        return null
      }

      setProcessing(true)
      setError(null)

      try {
        const res = await kycService.verifyLiveness(sid)
        setLivenessResult(res)
        return res
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erro na verificação de liveness'
        setError(errorMessage)
        return null
      } finally {
        setProcessing(false)
      }
    },
    [livenessSessionId]
  )

  // Verificar selfie
  const verifySelfie = useCallback(
    async (selfie: File): Promise<SelfieVerificationResult | null> => {
      setProcessing(true)
      setError(null)

      try {
        const res = await kycService.verifySelfie(selfie)
        setSelfieResult(res)
        return res
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Erro na verificação de selfie'
        setError(errorMessage)
        return null
      } finally {
        setProcessing(false)
      }
    },
    []
  )

  // Executar verificação automática completa
  const runAutoVerification = useCallback(async (): Promise<AutoVerificationResult | null> => {
    setProcessing(true)
    setError(null)

    try {
      const res = await kycService.runAutoVerification()
      setAutoResult(res)
      return res
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro na verificação automática'
      setError(errorMessage)
      return null
    } finally {
      setProcessing(false)
    }
  }, [])

  // Obter OCR de documento
  const getDocumentOCR = useCallback(
    async (documentId: string): Promise<DocumentOCRResult | null> => {
      setProcessing(true)
      setError(null)

      try {
        const res = await kycService.getDocumentOCR(documentId)
        setOcrResult(res)
        return res
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Erro ao extrair dados do documento'
        setError(errorMessage)
        return null
      } finally {
        setProcessing(false)
      }
    },
    []
  )

  // Limpar resultados
  const clearResults = useCallback(() => {
    setLivenessSessionId(null)
    setLivenessResult(null)
    setSelfieResult(null)
    setAutoResult(null)
    setOcrResult(null)
    setError(null)
  }, [])

  return {
    processing,
    error,

    // Liveness
    livenessSessionId,
    livenessResult,
    createLivenessSession,
    verifyLiveness,

    // Selfie
    selfieResult,
    verifySelfie,

    // Auto verification
    autoResult,
    runAutoVerification,

    // OCR
    ocrResult,
    getDocumentOCR,

    // Utils
    clearResults,
  }
}

export default useKYC
