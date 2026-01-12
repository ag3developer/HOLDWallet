/**
 * 🛡️ KYC Service - API Client
 * ===========================
 * Serviço para comunicação com a API de KYC.
 *
 * Author: HOLD Wallet Team
 */

import { apiClient } from './api'

// Alias para facilitar uso
const api = apiClient

// ============================================================
// TIPOS
// ============================================================

export enum KYCStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum KYCLevel {
  NONE = 'none',
  BASIC = 'basic',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum DocumentType {
  CPF_PHOTO = 'cpf_photo',
  RG_FRONT = 'rg_front',
  RG_BACK = 'rg_back',
  CNH_FRONT = 'cnh_front',
  CNH_BACK = 'cnh_back',
  PASSPORT = 'passport',
  SELFIE_WITH_DOCUMENT = 'selfie_with_document',
  SELFIE_LIVENESS = 'selfie_liveness',
  PROOF_OF_ADDRESS = 'proof_of_address',
  PROOF_OF_INCOME = 'proof_of_income',
  OTHER = 'other',
}

export enum DocumentStatus {
  PENDING = 'pending',
  ANALYZING = 'analyzing',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export interface KYCDocument {
  id: string
  document_type: DocumentType
  status: DocumentStatus
  original_name: string
  mime_type: string
  file_size: number
  uploaded_at: string
  ocr_processed: boolean
  ocr_confidence?: number
  face_match_score?: number
  liveness_passed?: boolean
  rejection_reason?: string
}

export interface KYCVerification {
  id: string
  status: KYCStatus
  level: KYCLevel
  created_at: string
  updated_at?: string
  submitted_at?: string
  approved_at?: string
  rejected_at?: string
  expiration_date?: string
  auto_approved: boolean
  risk_score?: number
  rejection_reason?: string
  requested_documents?: string[]
  consent_given: boolean
  consent_at?: string
  documents: KYCDocument[]
}

export interface KYCPersonalData {
  full_name: string
  social_name?: string
  birth_date: string
  nationality?: string
  gender?: string
  mother_name?: string

  // Documento
  document_type: 'cpf' | 'rg' | 'cnh'
  document_number: string
  rg_number?: string
  rg_issuer?: string
  rg_state?: string

  // Endereço
  zip_code: string
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
  country?: string

  // Contato
  phone: string
  email?: string

  // Financeiro (nível intermediário+)
  occupation?: string
  employer?: string
  monthly_income?: string
  source_of_funds?: string

  // Compliance
  pep?: boolean
  pep_relationship?: string
  fatca?: boolean
}

export interface KYCLevelRequirements {
  level: KYCLevel
  level_name: string
  required_documents: DocumentType[]
  requires_proof_of_address: boolean
  requires_proof_of_income: boolean
  requires_liveness: boolean
  daily_limit_brl: number
  monthly_limit_brl: number
  transaction_limit_brl: number
}

export interface ServiceLimits {
  daily_limit_brl: number
  monthly_limit_brl: number
  transaction_limit_brl: number
  requires_approval: boolean
}

export interface KYCLimits {
  kyc_level: KYCLevel
  kyc_level_name: string
  limits: Record<string, ServiceLimits>
}

export interface KYCStartRequest {
  level: KYCLevel
  consent: boolean
}

export interface KYCStartResponse {
  id: string
  status: KYCStatus
  level: KYCLevel
  message: string
}

export interface KYCStatusResponse extends KYCVerification {
  next_steps: string[]
  missing_documents: DocumentType[]
  can_submit: boolean
  limits: KYCLimits
  personal_data_complete?: boolean
  has_kyc?: boolean
  is_verified?: boolean
  documents_uploaded?: number
  documents_required?: number
  documents_approved?: number
  verification_id?: string
  expires_at?: string
  days_until_expiration?: number
}

// ============================================================
// FUNÇÕES DA API
// ============================================================

/**
 * Inicia uma nova verificação KYC
 */
export async function startKYC(data: KYCStartRequest): Promise<KYCStartResponse> {
  const response = await api.post('/kyc/start', data)
  return response.data
}

/**
 * Obtém status atual da verificação KYC
 */
export async function getKYCStatus(): Promise<KYCStatusResponse> {
  const response = await api.get('/kyc/status')
  return response.data
}

/**
 * Salva dados pessoais
 */
export async function savePersonalData(
  data: KYCPersonalData
): Promise<{ success: boolean; message: string }> {
  const response = await api.post('/kyc/personal-data', data)
  return response.data
}

/**
 * Upload de documento
 */
export async function uploadDocument(
  documentType: DocumentType,
  file: File
): Promise<{
  success: boolean
  document_id: string
  status: DocumentStatus
  auto_analysis?: {
    ocr_confidence?: number
    face_detected?: boolean
    face_match_score?: number
    liveness_passed?: boolean
    fraud_indicators?: string[]
  }
}> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('document_type', documentType)

  const response = await api.post('/kyc/documents', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

/**
 * Remove um documento
 */
export async function deleteDocument(documentId: string): Promise<{ success: boolean }> {
  const response = await api.delete(`/kyc/documents/${documentId}`)
  return response.data
}

/**
 * Submete verificação para análise
 */
export async function submitForReview(): Promise<{
  success: boolean
  message: string
  auto_approved?: boolean
  estimated_review_time?: string
}> {
  const response = await api.post('/kyc/submit')
  return response.data
}

/**
 * Obtém requisitos por nível
 */
export async function getLevelRequirements(level: KYCLevel): Promise<KYCLevelRequirements> {
  const response = await api.get(`/kyc/requirements/${level}`)
  return response.data
}

/**
 * Obtém dados pessoais do usuário (LGPD)
 */
export async function getMyData(): Promise<{
  verification: KYCVerification
  personal_data: KYCPersonalData | null
  documents: KYCDocument[]
}> {
  const response = await api.get('/kyc/my-data')
  return response.data
}

/**
 * Exporta dados do usuário (LGPD)
 */
export async function exportMyData(): Promise<Blob> {
  const response = await api.get('/kyc/export', {
    responseType: 'blob',
  })
  return response.data
}

// ============================================================
// VALIDAÇÃO CPF (SERPRO)
// ============================================================

export interface CPFValidationResult {
  valid: boolean
  cpf: string
  status: 'regular' | 'suspended' | 'canceled' | 'deceased' | 'pending' | 'null' | 'unknown'
  status_description?: string
  reason?: string
  source: string
  name_match?: boolean | null
  name_similarity?: number
  birth_date_match?: boolean | null
  registered_name?: string
  enriched_data?: {
    gender?: string
    age?: number
    mother_name?: string
    has_obit_indication?: boolean
  }
}

export interface CPFFaceValidationResult extends CPFValidationResult {
  face_match: boolean
  face_similarity?: number
}

/**
 * Valida CPF em tempo real via SERPRO/BigData
 */
export async function validateCPF(
  cpf: string,
  name?: string,
  birthDate?: string
): Promise<CPFValidationResult> {
  const formData = new FormData()
  formData.append('cpf', cpf)
  if (name) formData.append('name', name)
  if (birthDate) formData.append('birth_date', birthDate)

  const response = await api.post('/kyc/validate-cpf', formData)
  return response.data
}

/**
 * Consulta situação cadastral do CPF (simplificada)
 */
export async function getCPFSituation(cpf: string): Promise<CPFValidationResult> {
  const response = await api.get(`/kyc/cpf-situation/${cpf}`)
  return response.data
}

/**
 * Valida CPF com comparação facial via SERPRO Datavalid
 */
export async function validateCPFWithFace(
  cpf: string,
  selfie: File,
  name?: string
): Promise<CPFFaceValidationResult> {
  const formData = new FormData()
  formData.append('cpf', cpf)
  formData.append('selfie', selfie)
  if (name) formData.append('name', name)

  const response = await api.post('/kyc/validate-cpf-face', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

// ============================================================
// VERIFICAÇÃO BIOMÉTRICA (AWS)
// ============================================================

export interface LivenessSessionResult {
  session_id: string
  message: string
}

export interface LivenessVerificationResult {
  checks: {
    liveness: {
      is_live: boolean
      confidence: number
      status: string
      decision: string
    }
    face_comparison?: {
      match: boolean
      similarity: number
      confidence: number
    }
  }
  overall_status: 'APPROVED' | 'REJECTED' | 'ERROR' | 'PENDING'
  message: string
}

export interface SelfieVerificationResult {
  checks: {
    selfie_quality: {
      success: boolean
      face_count: number
      confidence: number
      issues: string[]
      attributes: {
        age_range?: { low: number; high: number }
        gender?: { value: string; confidence: number }
        smile?: boolean
        eyeglasses?: boolean
      }
    }
    face_comparison: {
      match: boolean
      similarity: number
      confidence: number
      decision: string
      reason: string
    }
  }
  overall_status: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW' | 'ERROR'
  message: string
}

export interface AutoVerificationResult {
  verification_id: string
  user_id: string
  started_at: string
  completed_at?: string
  steps: {
    document?: {
      overall_status: string
      checks: {
        ocr?: {
          success: boolean
          confidence: number
          extracted_fields: Record<string, string>
          completeness: number
        }
        fraud?: {
          risk_score: number
          risk_level: string
          indicators: string[]
          recommendation: string
        }
        face_detection?: {
          success: boolean
          face_count: number
          quality_ok: boolean
        }
      }
    }
    selfie?: SelfieVerificationResult
  }
  overall_decision: 'APPROVED' | 'REJECTED' | 'MANUAL_REVIEW' | 'ERROR'
  recommended_level?: string
  extracted_data?: Record<string, string>
}

export interface DocumentOCRResult {
  document_id: string
  document_type: string
  checks: {
    ocr: {
      success: boolean
      confidence: number
      extracted_fields: Record<string, string>
      completeness: number
      is_valid: boolean
    }
    fraud: {
      success: boolean
      risk_score: number
      risk_level: string
      indicators: string[]
      recommendation: string
    }
    face_detection?: {
      success: boolean
      face_count: number
      quality_ok: boolean
      issues: string[]
    }
  }
  overall_status: string
}

/**
 * Cria sessão de liveness detection (prova de vida)
 */
export async function createLivenessSession(): Promise<LivenessSessionResult> {
  const response = await api.post('/kyc/biometric/liveness-session')
  return response.data
}

/**
 * Verifica resultado de uma sessão de liveness
 */
export async function verifyLiveness(sessionId: string): Promise<LivenessVerificationResult> {
  const formData = new FormData()
  formData.append('session_id', sessionId)

  const response = await api.post('/kyc/biometric/verify-liveness', formData)
  return response.data
}

/**
 * Verifica selfie comparando com documento
 */
export async function verifySelfie(selfie: File): Promise<SelfieVerificationResult> {
  const formData = new FormData()
  formData.append('selfie', selfie)

  const response = await api.post('/kyc/biometric/verify-selfie', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  return response.data
}

/**
 * Executa verificação biométrica automática completa
 */
export async function runAutoVerification(): Promise<AutoVerificationResult> {
  const response = await api.post('/kyc/biometric/auto-verify')
  return response.data
}

/**
 * Extrai dados de documento via OCR
 */
export async function getDocumentOCR(documentId: string): Promise<DocumentOCRResult> {
  const response = await api.get(`/kyc/biometric/document-ocr/${documentId}`)
  return response.data
}

// ============================================================
// UTILITÁRIOS
// ============================================================

export function getStatusLabel(status: KYCStatus): string {
  const labels: Record<KYCStatus, string> = {
    [KYCStatus.PENDING]: 'Pendente',
    [KYCStatus.SUBMITTED]: 'Enviado',
    [KYCStatus.UNDER_REVIEW]: 'Em Análise',
    [KYCStatus.APPROVED]: 'Aprovado',
    [KYCStatus.REJECTED]: 'Rejeitado',
    [KYCStatus.EXPIRED]: 'Expirado',
  }
  return labels[status] || status
}

export function getLevelLabel(level: KYCLevel): string {
  const labels: Record<KYCLevel, string> = {
    [KYCLevel.NONE]: 'Sem Verificação',
    [KYCLevel.BASIC]: 'Básico',
    [KYCLevel.INTERMEDIATE]: 'Intermediário',
    [KYCLevel.ADVANCED]: 'Avançado',
  }
  return labels[level] || level
}

export function getDocumentTypeLabel(type: DocumentType): string {
  const labels: Record<DocumentType, string> = {
    [DocumentType.CPF_PHOTO]: 'Foto do CPF',
    [DocumentType.RG_FRONT]: 'RG (Frente)',
    [DocumentType.RG_BACK]: 'RG (Verso)',
    [DocumentType.CNH_FRONT]: 'CNH (Frente)',
    [DocumentType.CNH_BACK]: 'CNH (Verso)',
    [DocumentType.PASSPORT]: 'Passaporte',
    [DocumentType.SELFIE_WITH_DOCUMENT]: 'Selfie com Documento',
    [DocumentType.SELFIE_LIVENESS]: 'Selfie de Verificação',
    [DocumentType.PROOF_OF_ADDRESS]: 'Comprovante de Residência',
    [DocumentType.PROOF_OF_INCOME]: 'Comprovante de Renda',
    [DocumentType.OTHER]: 'Outro',
  }
  return labels[type] || type
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Export default
const kycService = {
  // KYC básico
  startKYC,
  getKYCStatus,
  savePersonalData,
  uploadDocument,
  deleteDocument,
  submitForReview,
  getLevelRequirements,
  getMyData,
  exportMyData,

  // Validação CPF (SERPRO)
  validateCPF,
  getCPFSituation,
  validateCPFWithFace,

  // Biometria (AWS)
  createLivenessSession,
  verifyLiveness,
  verifySelfie,
  runAutoVerification,
  getDocumentOCR,

  // Utilitários
  getStatusLabel,
  getLevelLabel,
  getDocumentTypeLabel,
  formatCurrency,
  formatFileSize,
}

export default kycService
