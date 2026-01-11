/**
 * 🛡️ Admin KYC Management Page
 * =============================
 * Página para gerenciar verificações KYC dos usuários.
 * Inclui visualização de documentos, aprovação e rejeição.
 *
 * Author: HOLD Wallet Team
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  User,
  FileText,
  Loader2,
  X,
  Download,
  Image,
  MapPin,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  FileCheck,
  ExternalLink,
  ZoomIn,
} from 'lucide-react'
import { adminApi } from '@/services/admin/adminService'

// Types
interface KYCVerification {
  id: string
  user_id: string
  username: string
  email: string
  level: 'basic' | 'intermediate' | 'advanced'
  status: 'pending' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'expired'
  created_at: string
  submitted_at?: string
  reviewed_at?: string
  reviewer_id?: string
  rejection_reason?: string
  documents_count: number
  personal_data_filled: boolean
}

interface KYCDocument {
  id: string
  document_type: string
  status: string
  file_url?: string
  original_name?: string
  mime_type?: string
  uploaded_at: string
  rejection_reason?: string
  ocr_processed?: boolean
  extracted_name?: string
  extracted_cpf?: string
}

interface KYCPersonalData {
  full_name: string
  document_number: string
  birth_date: string
  phone: string
  mother_name?: string
  zip_code: string
  street: string
  number: string
  complement?: string
  neighborhood: string
  city: string
  state: string
}

interface KYCStats {
  total: number
  pending: number
  under_review: number
  approved: number
  rejected: number
}

// Status badge component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    pending: {
      bg: 'bg-gray-100 dark:bg-gray-700',
      text: 'text-gray-600 dark:text-gray-300',
      icon: <Clock className='w-3 h-3' />,
    },
    submitted: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-600 dark:text-blue-400',
      icon: <FileText className='w-3 h-3' />,
    },
    under_review: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-600 dark:text-yellow-400',
      icon: <Eye className='w-3 h-3' />,
    },
    approved: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-600 dark:text-green-400',
      icon: <CheckCircle className='w-3 h-3' />,
    },
    rejected: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-600 dark:text-red-400',
      icon: <XCircle className='w-3 h-3' />,
    },
    expired: {
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      text: 'text-orange-600 dark:text-orange-400',
      icon: <AlertTriangle className='w-3 h-3' />,
    },
  }

  const statusLabels: Record<string, string> = {
    pending: 'Pendente',
    submitted: 'Enviado',
    under_review: 'Em Análise',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    expired: 'Expirado',
  }

  const style = styles[status] || styles.pending

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
    >
      {style.icon}
      {statusLabels[status] || status}
    </span>
  )
}

// Level badge component
const LevelBadge: React.FC<{ level: string }> = ({ level }) => {
  const styles: Record<string, { bg: string; text: string }> = {
    basic: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-300' },
    intermediate: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-600 dark:text-blue-400',
    },
    advanced: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-600 dark:text-purple-400',
    },
  }

  const labels: Record<string, string> = {
    basic: 'Básico',
    intermediate: 'Intermediário',
    advanced: 'Avançado',
  }

  const style = styles[level] || styles.basic

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {labels[level] || level}
    </span>
  )
}

// Document type labels
const documentTypeLabels: Record<string, string> = {
  rg_front: 'RG (Frente)',
  rg_back: 'RG (Verso)',
  cnh_front: 'CNH (Frente)',
  cnh_back: 'CNH (Verso)',
  cnh: 'CNH',
  passport: 'Passaporte',
  selfie: 'Selfie',
  selfie_with_document: 'Selfie com Documento',
  proof_of_address: 'Comprovante de Residência',
  proof_of_income: 'Comprovante de Renda',
  cpf: 'CPF',
  other: 'Outro',
}

// Main component
const AdminKYCPage: React.FC = () => {
  const navigate = useNavigate()

  // State
  const [verifications, setVerifications] = useState<KYCVerification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<KYCStats>({
    total: 0,
    pending: 0,
    under_review: 0,
    approved: 0,
    rejected: 0,
  })

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [levelFilter, setLevelFilter] = useState<string>('all')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 20

  // Selected verification for detail view
  const [selectedVerification, setSelectedVerification] = useState<KYCVerification | null>(null)
  const [verificationDetails, setVerificationDetails] = useState<{
    documents: KYCDocument[]
    personal_data: KYCPersonalData | null
  } | null>(null)
  const [loadingDetails, setLoadingDetails] = useState(false)

  // Document preview modal
  const [documentPreview, setDocumentPreview] = useState<{
    open: boolean
    url: string
    title: string
  }>({ open: false, url: '', title: '' })
  const [loadingDocUrl, setLoadingDocUrl] = useState<string | null>(null)

  // Review modal
  const [reviewModal, setReviewModal] = useState<{
    open: boolean
    type: 'approve' | 'reject' | null
    verificationId: string | null
  }>({ open: false, type: null, verificationId: null })
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState(false)

  // Fetch verifications
  const fetchVerifications = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params: Record<string, string> = {
        page: String(currentPage),
        per_page: String(itemsPerPage),
      }

      if (searchTerm) params.search = searchTerm
      if (statusFilter !== 'all') params.status = statusFilter
      if (levelFilter !== 'all') params.level = levelFilter

      const response = await adminApi.get('/kyc', { params })
      const data = response.data

      const mappedVerifications = (data.items || []).map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        username: item.user_username || 'N/A',
        email: item.user_email || 'N/A',
        level: item.level,
        status: item.status,
        created_at: item.created_at,
        submitted_at: item.submitted_at,
        reviewed_at: item.approved_at || item.rejected_at,
        rejection_reason: item.rejection_reason,
        documents_count: item.documents?.length || 0,
        personal_data_filled: item.consent_given,
      }))

      setVerifications(mappedVerifications)
      setTotalPages(data.pages || Math.ceil((data.total || 0) / itemsPerPage))

      fetchStats()
    } catch (err: any) {
      console.error('Erro ao carregar verificações:', err)
      setError(err?.response?.data?.detail || err?.message || 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchTerm, statusFilter, levelFilter])

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await adminApi.get('/kyc/stats')
      const statsData = response.data
      setStats({
        total: statsData.total_verifications || 0,
        pending: statsData.pending || 0,
        under_review: statsData.under_review || 0,
        approved: statsData.approved || 0,
        rejected: statsData.rejected || 0,
      })
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err)
    }
  }

  // Fetch verification details
  const fetchVerificationDetails = async (verificationId: string) => {
    setLoadingDetails(true)

    try {
      const response = await adminApi.get(`/kyc/${verificationId}`)
      const data = response.data

      const mappedDocuments = (data.documents || []).map((doc: any) => ({
        id: doc.id,
        document_type: doc.document_type,
        status: doc.status,
        file_url: doc.file_url || doc.s3_url,
        original_name: doc.original_name,
        mime_type: doc.mime_type,
        uploaded_at: doc.uploaded_at,
        rejection_reason: doc.rejection_reason,
        ocr_processed: doc.ocr_processed,
        extracted_name: doc.extracted_name,
        extracted_cpf: doc.extracted_cpf,
      }))

      const personalData = data.personal_data_full
        ? {
            full_name: data.personal_data_full.full_name,
            document_number: data.personal_data_full.document_number,
            birth_date: data.personal_data_full.birth_date,
            phone: data.personal_data_full.phone,
            mother_name: data.personal_data_full.mother_name,
            zip_code: data.personal_data_full.zip_code,
            street: data.personal_data_full.street,
            number: data.personal_data_full.number,
            complement: data.personal_data_full.complement,
            neighborhood: data.personal_data_full.neighborhood,
            city: data.personal_data_full.city,
            state: data.personal_data_full.state,
          }
        : null

      setVerificationDetails({
        documents: mappedDocuments,
        personal_data: personalData,
      })
    } catch (err) {
      console.error('Erro ao carregar detalhes:', err)
    } finally {
      setLoadingDetails(false)
    }
  }

  // Get document URL for viewing
  const getDocumentUrl = async (verificationId: string, documentId: string, docType: string) => {
    setLoadingDocUrl(documentId)
    try {
      const response = await adminApi.get(`/kyc/${verificationId}/documents/${documentId}/url`)
      const url = response.data.url
      setDocumentPreview({
        open: true,
        url,
        title: documentTypeLabels[docType] || docType,
      })
    } catch (err: any) {
      alert('Erro ao carregar documento: ' + (err?.response?.data?.detail || err?.message))
    } finally {
      setLoadingDocUrl(null)
    }
  }

  // Handle approve/reject
  const handleReview = async (type: 'approve' | 'reject') => {
    if (!reviewModal.verificationId) return

    setProcessing(true)

    try {
      const endpoint =
        type === 'approve'
          ? `/kyc/${reviewModal.verificationId}/approve`
          : `/kyc/${reviewModal.verificationId}/reject`

      const body: any = {}
      if (type === 'reject' && rejectionReason) {
        body.reason = rejectionReason
      }
      if (type === 'approve') {
        body.notes = ''
        body.expiration_months = 24
      }

      await adminApi.post(endpoint, body)

      await fetchVerifications()

      setReviewModal({ open: false, type: null, verificationId: null })
      setRejectionReason('')
      setSelectedVerification(null)
      setVerificationDetails(null)
    } catch (err: any) {
      alert(err?.response?.data?.detail || err?.message || 'Erro desconhecido')
    } finally {
      setProcessing(false)
    }
  }

  // Effects
  useEffect(() => {
    fetchVerifications()
  }, [fetchVerifications])

  useEffect(() => {
    if (selectedVerification) {
      fetchVerificationDetails(selectedVerification.id)
    }
  }, [selectedVerification])

  // Format date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Format CPF
  const formatCPF = (cpf: string) => {
    if (!cpf) return '-'
    const cleaned = cpf.replace(/\D/g, '')
    if (cleaned.length !== 11) return cpf
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`
  }

  // Format phone
  const formatPhone = (phone: string) => {
    if (!phone) return '-'
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
    }
    return phone
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-6'>
      {/* Header */}
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2'>
          <Shield className='w-7 h-7 text-primary' />
          Gestão de KYC
        </h1>
        <p className='text-gray-500 mt-1'>Gerencie e aprove verificações de identidade</p>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-2 md:grid-cols-5 gap-3 mb-6'>
        <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm'>
          <div className='text-2xl font-bold text-gray-900 dark:text-white'>{stats.total}</div>
          <div className='text-sm text-gray-500'>Total</div>
        </div>
        <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm'>
          <div className='text-2xl font-bold text-yellow-600'>{stats.pending}</div>
          <div className='text-sm text-gray-500'>Pendentes</div>
        </div>
        <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm'>
          <div className='text-2xl font-bold text-blue-600'>{stats.under_review}</div>
          <div className='text-sm text-gray-500'>Em Análise</div>
        </div>
        <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm'>
          <div className='text-2xl font-bold text-green-600'>{stats.approved}</div>
          <div className='text-sm text-gray-500'>Aprovados</div>
        </div>
        <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm'>
          <div className='text-2xl font-bold text-red-600'>{stats.rejected}</div>
          <div className='text-sm text-gray-500'>Rejeitados</div>
        </div>
      </div>

      {/* Filters */}
      <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6 shadow-sm'>
        <div className='flex flex-col md:flex-row gap-4'>
          <div className='flex-1'>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
              <input
                type='text'
                placeholder='Buscar por nome, email ou CPF...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent'
              />
            </div>
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            title='Filtrar por status'
            className='px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent'
          >
            <option value='all'>Todos os Status</option>
            <option value='pending'>Pendente</option>
            <option value='submitted'>Enviado</option>
            <option value='under_review'>Em Análise</option>
            <option value='approved'>Aprovado</option>
            <option value='rejected'>Rejeitado</option>
          </select>

          <select
            value={levelFilter}
            onChange={e => setLevelFilter(e.target.value)}
            title='Filtrar por nível'
            className='px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent'
          >
            <option value='all'>Todos os Níveis</option>
            <option value='basic'>Básico</option>
            <option value='intermediate'>Intermediário</option>
            <option value='advanced'>Avançado</option>
          </select>

          <button
            onClick={() => fetchVerifications()}
            disabled={loading}
            title='Atualizar lista'
            className='px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors'
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className='flex flex-col lg:flex-row gap-6'>
        {/* Table */}
        <div className='flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm'>
          {loading ? (
            <div className='flex items-center justify-center h-64'>
              <Loader2 className='w-8 h-8 animate-spin text-primary' />
            </div>
          ) : error ? (
            <div className='flex items-center justify-center h-64 text-red-500'>
              <AlertTriangle className='w-6 h-6 mr-2' />
              {error}
            </div>
          ) : verifications.length === 0 ? (
            <div className='flex flex-col items-center justify-center h-64 text-gray-500'>
              <Shield className='w-12 h-12 mb-3 text-gray-300' />
              <p>Nenhuma verificação encontrada</p>
            </div>
          ) : (
            <>
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead className='bg-gray-50 dark:bg-gray-900/50'>
                    <tr>
                      <th className='px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                        Usuário
                      </th>
                      <th className='px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                        Nível
                      </th>
                      <th className='px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                        Status
                      </th>
                      <th className='px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                        Docs
                      </th>
                      <th className='px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                        Data
                      </th>
                      <th className='px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                    {verifications.map(verification => (
                      <tr
                        key={verification.id}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${
                          selectedVerification?.id === verification.id
                            ? 'bg-primary/5 dark:bg-primary/10'
                            : ''
                        }`}
                        onClick={() => setSelectedVerification(verification)}
                      >
                        <td className='px-4 py-3'>
                          <div className='flex items-center gap-3'>
                            <div className='w-9 h-9 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center'>
                              <User className='w-4 h-4 text-primary' />
                            </div>
                            <div>
                              <div className='text-sm font-medium text-gray-900 dark:text-white'>
                                {verification.username}
                              </div>
                              <div className='text-xs text-gray-500'>{verification.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className='px-4 py-3'>
                          <LevelBadge level={verification.level} />
                        </td>
                        <td className='px-4 py-3'>
                          <StatusBadge status={verification.status} />
                        </td>
                        <td className='px-4 py-3'>
                          <span className='inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400'>
                            <FileText className='w-4 h-4' />
                            {verification.documents_count}
                          </span>
                        </td>
                        <td className='px-4 py-3'>
                          <span className='text-sm text-gray-500'>
                            {formatDate(verification.created_at)}
                          </span>
                        </td>
                        <td className='px-4 py-3 text-right'>
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              setSelectedVerification(verification)
                            }}
                            title='Ver detalhes'
                            className='p-2 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
                          >
                            <Eye className='w-4 h-4' />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className='flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700'>
                <div className='text-sm text-gray-500'>
                  Página {currentPage} de {totalPages}
                </div>
                <div className='flex gap-2'>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    title='Página anterior'
                    className='p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 transition-colors'
                  >
                    <ChevronLeft className='w-4 h-4' />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    title='Próxima página'
                    className='p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 transition-colors'
                  >
                    <ChevronRight className='w-4 h-4' />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Detail Panel */}
        {selectedVerification && (
          <div className='w-full lg:w-[480px] bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm'>
            {/* Header */}
            <div className='p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50'>
              <div className='flex items-center justify-between'>
                <h3 className='font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
                  <FileCheck className='w-5 h-5 text-primary' />
                  Detalhes da Verificação
                </h3>
                <button
                  onClick={() => {
                    setSelectedVerification(null)
                    setVerificationDetails(null)
                  }}
                  title='Fechar'
                  className='p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors'
                >
                  <X className='w-4 h-4' />
                </button>
              </div>
            </div>

            {loadingDetails ? (
              <div className='flex items-center justify-center h-64'>
                <Loader2 className='w-6 h-6 animate-spin text-primary' />
              </div>
            ) : (
              <div className='p-4 space-y-5 max-h-[calc(100vh-280px)] overflow-y-auto'>
                {/* User Info */}
                <div className='bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4'>
                  <div className='flex items-center gap-3 mb-3'>
                    <div className='w-12 h-12 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-sm'>
                      <User className='w-6 h-6 text-primary' />
                    </div>
                    <div>
                      <div className='font-semibold text-gray-900 dark:text-white'>
                        {selectedVerification.username}
                      </div>
                      <div className='text-sm text-gray-500 flex items-center gap-1'>
                        <Mail className='w-3 h-3' />
                        {selectedVerification.email}
                      </div>
                    </div>
                  </div>
                  <div className='flex items-center gap-2'>
                    <StatusBadge status={selectedVerification.status} />
                    <LevelBadge level={selectedVerification.level} />
                  </div>
                </div>

                {/* Personal Data */}
                {verificationDetails?.personal_data && (
                  <div>
                    <h4 className='text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2'>
                      <CreditCard className='w-4 h-4 text-primary' />
                      Dados Pessoais
                    </h4>
                    <div className='bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 space-y-3'>
                      <div className='grid grid-cols-2 gap-3'>
                        <div>
                          <div className='text-xs text-gray-500 mb-0.5'>Nome Completo</div>
                          <div className='text-sm font-medium text-gray-900 dark:text-white'>
                            {verificationDetails.personal_data.full_name || '-'}
                          </div>
                        </div>
                        <div>
                          <div className='text-xs text-gray-500 mb-0.5'>CPF</div>
                          <div className='text-sm font-medium text-gray-900 dark:text-white'>
                            {formatCPF(verificationDetails.personal_data.document_number)}
                          </div>
                        </div>
                        <div>
                          <div className='text-xs text-gray-500 mb-0.5'>Data de Nascimento</div>
                          <div className='text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1'>
                            <Calendar className='w-3 h-3 text-gray-400' />
                            {verificationDetails.personal_data.birth_date || '-'}
                          </div>
                        </div>
                        <div>
                          <div className='text-xs text-gray-500 mb-0.5'>Telefone</div>
                          <div className='text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1'>
                            <Phone className='w-3 h-3 text-gray-400' />
                            {formatPhone(verificationDetails.personal_data.phone)}
                          </div>
                        </div>
                      </div>

                      {/* Address */}
                      <div className='pt-3 border-t border-gray-200 dark:border-gray-700'>
                        <div className='text-xs text-gray-500 mb-1 flex items-center gap-1'>
                          <MapPin className='w-3 h-3' />
                          Endereço
                        </div>
                        <div className='text-sm text-gray-900 dark:text-white'>
                          {verificationDetails.personal_data.street},{' '}
                          {verificationDetails.personal_data.number}
                          {verificationDetails.personal_data.complement &&
                            ` - ${verificationDetails.personal_data.complement}`}
                          <br />
                          {verificationDetails.personal_data.neighborhood} -{' '}
                          {verificationDetails.personal_data.city}/
                          {verificationDetails.personal_data.state}
                          <br />
                          <span className='text-gray-500'>
                            CEP: {verificationDetails.personal_data.zip_code}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Documents */}
                {verificationDetails?.documents && verificationDetails.documents.length > 0 && (
                  <div>
                    <h4 className='text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2'>
                      <Image className='w-4 h-4 text-primary' />
                      Documentos Enviados ({verificationDetails.documents.length})
                    </h4>
                    <div className='space-y-2'>
                      {verificationDetails.documents.map(doc => (
                        <div
                          key={doc.id}
                          className='bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 flex items-center justify-between'
                        >
                          <div className='flex items-center gap-3'>
                            <div className='w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center shadow-sm'>
                              <FileText className='w-5 h-5 text-primary' />
                            </div>
                            <div>
                              <div className='text-sm font-medium text-gray-900 dark:text-white'>
                                {documentTypeLabels[doc.document_type] || doc.document_type}
                              </div>
                              <div className='text-xs text-gray-500'>
                                {formatDate(doc.uploaded_at)}
                              </div>
                            </div>
                          </div>
                          <div className='flex items-center gap-2'>
                            <StatusBadge status={doc.status} />
                            <button
                              onClick={() =>
                                getDocumentUrl(selectedVerification.id, doc.id, doc.document_type)
                              }
                              disabled={loadingDocUrl === doc.id}
                              title='Visualizar documento'
                              className='p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors disabled:opacity-50'
                            >
                              {loadingDocUrl === doc.id ? (
                                <Loader2 className='w-4 h-4 animate-spin' />
                              ) : (
                                <ZoomIn className='w-4 h-4' />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rejection Reason */}
                {selectedVerification.status === 'rejected' &&
                  selectedVerification.rejection_reason && (
                    <div>
                      <h4 className='text-sm font-semibold text-gray-900 dark:text-white mb-2'>
                        Motivo da Rejeição
                      </h4>
                      <div className='bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl p-3 text-sm'>
                        {selectedVerification.rejection_reason}
                      </div>
                    </div>
                  )}

                {/* Action Buttons */}
                {(selectedVerification.status === 'submitted' ||
                  selectedVerification.status === 'under_review' ||
                  selectedVerification.status === 'pending') && (
                  <div className='pt-4 border-t border-gray-200 dark:border-gray-700'>
                    <div className='flex gap-3'>
                      <button
                        onClick={() =>
                          setReviewModal({
                            open: true,
                            type: 'reject',
                            verificationId: selectedVerification.id,
                          })
                        }
                        className='flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl font-medium transition-colors'
                      >
                        <XCircle className='w-4 h-4' />
                        Rejeitar
                      </button>
                      <button
                        onClick={() =>
                          setReviewModal({
                            open: true,
                            type: 'approve',
                            verificationId: selectedVerification.id,
                          })
                        }
                        className='flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white hover:bg-green-700 rounded-xl font-medium transition-colors'
                      >
                        <CheckCircle className='w-4 h-4' />
                        Aprovar
                      </button>
                    </div>
                  </div>
                )}

                {/* View User Button */}
                <button
                  onClick={() => navigate(`/admin/users/${selectedVerification.user_id}`)}
                  className='w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium transition-colors'
                >
                  <User className='w-4 h-4' />
                  Ver Perfil do Usuário
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewModal.open && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl'>
            <h3 className='text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
              {reviewModal.type === 'approve' ? (
                <>
                  <CheckCircle className='w-5 h-5 text-green-600' />
                  Aprovar Verificação
                </>
              ) : (
                <>
                  <XCircle className='w-5 h-5 text-red-600' />
                  Rejeitar Verificação
                </>
              )}
            </h3>

            {reviewModal.type === 'reject' && (
              <div className='mb-4'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                  Motivo da Rejeição *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder='Descreva o motivo da rejeição (mínimo 10 caracteres)...'
                  rows={4}
                  className='w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent resize-none'
                />
                <div className='text-xs text-gray-500 mt-1'>
                  {rejectionReason.length}/10 caracteres mínimos
                  {rejectionReason.length < 10 && rejectionReason.length > 0 && (
                    <span className='text-red-500 ml-2'>
                      (faltam {10 - rejectionReason.length})
                    </span>
                  )}
                </div>
              </div>
            )}

            <p className='text-gray-500 mb-6'>
              {reviewModal.type === 'approve'
                ? 'Tem certeza que deseja aprovar esta verificação KYC? O usuário receberá acesso aos serviços do nível correspondente.'
                : 'Tem certeza que deseja rejeitar esta verificação KYC? O usuário será notificado e poderá enviar novamente.'}
            </p>

            <div className='flex gap-3'>
              <button
                onClick={() => {
                  setReviewModal({ open: false, type: null, verificationId: null })
                  setRejectionReason('')
                }}
                disabled={processing}
                className='flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors'
              >
                Cancelar
              </button>
              <button
                onClick={() => handleReview(reviewModal.type!)}
                disabled={
                  processing ||
                  (reviewModal.type === 'reject' && rejectionReason.trim().length < 10)
                }
                className={`flex-1 px-4 py-2.5 rounded-xl font-medium disabled:opacity-50 transition-colors ${
                  reviewModal.type === 'approve'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {processing ? (
                  <Loader2 className='w-4 h-4 animate-spin mx-auto' />
                ) : reviewModal.type === 'approve' ? (
                  'Confirmar Aprovação'
                ) : (
                  'Confirmar Rejeição'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {documentPreview.open && (
        <div className='fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl'>
            <div className='flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700'>
              <h3 className='font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
                <Image className='w-5 h-5 text-primary' />
                {documentPreview.title}
              </h3>
              <div className='flex items-center gap-2'>
                <a
                  href={documentPreview.url}
                  target='_blank'
                  rel='noopener noreferrer'
                  title='Abrir em nova aba'
                  className='p-2 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
                >
                  <ExternalLink className='w-4 h-4' />
                </a>
                <a
                  href={documentPreview.url}
                  download
                  title='Baixar documento'
                  className='p-2 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
                >
                  <Download className='w-4 h-4' />
                </a>
                <button
                  onClick={() => setDocumentPreview({ open: false, url: '', title: '' })}
                  title='Fechar'
                  className='p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors'
                >
                  <X className='w-4 h-4' />
                </button>
              </div>
            </div>
            <div className='p-4 overflow-auto max-h-[calc(90vh-80px)] bg-gray-100 dark:bg-gray-900'>
              <img
                src={documentPreview.url}
                alt={documentPreview.title}
                className='max-w-full h-auto mx-auto rounded-lg shadow-lg'
                onError={e => {
                  // Se não for imagem, mostra como iframe (PDF)
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const iframe = document.createElement('iframe')
                  iframe.src = documentPreview.url
                  iframe.className = 'w-full h-[70vh] rounded-lg'
                  target.parentNode?.appendChild(iframe)
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminKYCPage
