/**
 * 🛡️ Admin KYC Management Page
 * =============================
 * Página para gerenciar verificações KYC dos usuários.
 *
 * Author: HOLD Wallet Team
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield,
  Search,
  Filter,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  User,
  FileText,
  Calendar,
  Loader2,
  Check,
  X,
  MessageSquare,
} from 'lucide-react'

// URL da API - usa proxy em dev, URL direta em produção
const API_URL = import.meta.env.PROD
  ? import.meta.env.VITE_API_URL || 'https://api.wolknow.com/v1'
  : '/api' // Em dev, usa o proxy do Vite

// Helper para obter token de autenticação
const getAuthToken = (): string | null => {
  try {
    const stored = localStorage.getItem('hold-wallet-auth')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed?.state?.token || null
    }
  } catch {
    return null
  }
  return null
}

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
  status: 'pending' | 'approved' | 'rejected'
  file_url?: string
  uploaded_at: string
  rejection_reason?: string
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
const StatusBadge: React.FC<{ status: KYCVerification['status'] }> = ({ status }) => {
  const styles: Record<
    KYCVerification['status'],
    { bg: string; text: string; icon: React.ReactNode }
  > = {
    pending: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-600 dark:text-gray-400',
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

  const statusLabels: Record<KYCVerification['status'], string> = {
    pending: 'Pendente',
    submitted: 'Enviado',
    under_review: 'Em Análise',
    approved: 'Aprovado',
    rejected: 'Rejeitado',
    expired: 'Expirado',
  }

  const style = styles[status]

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
    >
      {style.icon}
      {statusLabels[status]}
    </span>
  )
}

// Level badge component
const LevelBadge: React.FC<{ level: KYCVerification['level'] }> = ({ level }) => {
  const styles: Record<KYCVerification['level'], { bg: string; text: string }> = {
    basic: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' },
    intermediate: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-600 dark:text-blue-400',
    },
    advanced: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      text: 'text-purple-600 dark:text-purple-400',
    },
  }

  const labels: Record<KYCVerification['level'], string> = {
    basic: 'Básico',
    intermediate: 'Intermediário',
    advanced: 'Avançado',
  }

  const style = styles[level]

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {labels[level]}
    </span>
  )
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
  const [statusFilter, setStatusFilter] = useState<KYCVerification['status'] | 'all'>('all')
  const [levelFilter, setLevelFilter] = useState<KYCVerification['level'] | 'all'>('all')

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
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(itemsPerPage),
      })

      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (levelFilter !== 'all') params.append('level', levelFilter)

      const response = await fetch(`${API_URL}/admin/kyc?${params}`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
        // Bypass Service Worker cache
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar verificações')
      }

      const data = await response.json()

      // Mapeia os dados do backend para o formato do frontend
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

      // Fetch stats separately
      fetchStats()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchTerm, statusFilter, levelFilter])

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/admin/kyc/stats`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      })

      if (response.ok) {
        const statsData = await response.json()
        setStats({
          total: statsData.total_count || 0,
          pending: statsData.by_status?.pending || 0,
          under_review: statsData.by_status?.under_review || 0,
          approved: statsData.by_status?.approved || 0,
          rejected: statsData.by_status?.rejected || 0,
        })
      }
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err)
    }
  }

  // Fetch verification details
  const fetchVerificationDetails = async (verificationId: string) => {
    setLoadingDetails(true)

    try {
      const response = await fetch(`${API_URL}/admin/kyc/${verificationId}`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar detalhes')
      }

      const data = await response.json()

      // Mapeia os documentos
      const mappedDocuments = (data.documents || []).map((doc: any) => ({
        id: doc.id,
        document_type: doc.document_type,
        status: doc.status,
        file_url: doc.file_url || doc.s3_url,
        uploaded_at: doc.uploaded_at,
        rejection_reason: doc.rejection_reason,
      }))

      // Mapeia os dados pessoais
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

  // Handle approve/reject
  const handleReview = async (type: 'approve' | 'reject') => {
    if (!reviewModal.verificationId) return

    setProcessing(true)

    try {
      const endpoint =
        type === 'approve'
          ? `${API_URL}/admin/kyc/${reviewModal.verificationId}/approve`
          : `${API_URL}/admin/kyc/${reviewModal.verificationId}/reject`

      const body: { rejection_reason?: string } = {}
      if (type === 'reject' && rejectionReason) {
        body.rejection_reason = rejectionReason
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error(`Erro ao ${type === 'approve' ? 'aprovar' : 'rejeitar'} verificação`)
      }

      // Refresh list
      await fetchVerifications()

      // Close modal and detail panel
      setReviewModal({ open: false, type: null, verificationId: null })
      setRejectionReason('')
      setSelectedVerification(null)
      setVerificationDetails(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro desconhecido')
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
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Document type labels
  const documentTypeLabels: Record<string, string> = {
    rg_front: 'RG (Frente)',
    rg_back: 'RG (Verso)',
    cnh_front: 'CNH (Frente)',
    cnh_back: 'CNH (Verso)',
    passport: 'Passaporte',
    selfie: 'Selfie',
    selfie_with_document: 'Selfie com Documento',
    proof_of_address: 'Comprovante de Residência',
    proof_of_income: 'Comprovante de Renda',
  }

  return (
    <div className='p-6'>
      {/* Header */}
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2'>
          <Shield className='w-7 h-7 text-primary' />
          Gestão de KYC
        </h1>
        <p className='text-gray-500 mt-1'>Gerencie e aprove verificações de identidade</p>
      </div>

      {/* Stats Cards */}
      <div className='grid grid-cols-2 md:grid-cols-5 gap-4 mb-6'>
        <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700'>
          <div className='text-2xl font-bold text-gray-900 dark:text-white'>{stats.total}</div>
          <div className='text-sm text-gray-500'>Total</div>
        </div>
        <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700'>
          <div className='text-2xl font-bold text-yellow-600'>{stats.pending}</div>
          <div className='text-sm text-gray-500'>Pendentes</div>
        </div>
        <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700'>
          <div className='text-2xl font-bold text-blue-600'>{stats.under_review}</div>
          <div className='text-sm text-gray-500'>Em Análise</div>
        </div>
        <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700'>
          <div className='text-2xl font-bold text-green-600'>{stats.approved}</div>
          <div className='text-sm text-gray-500'>Aprovados</div>
        </div>
        <div className='bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700'>
          <div className='text-2xl font-bold text-red-600'>{stats.rejected}</div>
          <div className='text-sm text-gray-500'>Rejeitados</div>
        </div>
      </div>

      {/* Filters */}
      <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6'>
        <div className='flex flex-col md:flex-row gap-4'>
          {/* Search */}
          <div className='flex-1'>
            <div className='relative'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400' />
              <input
                type='text'
                placeholder='Buscar por nome, email ou CPF...'
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className='w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent'
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as KYCVerification['status'] | 'all')}
            className='px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent'
          >
            <option value='all'>Todos os Status</option>
            <option value='pending'>Pendente</option>
            <option value='submitted'>Enviado</option>
            <option value='under_review'>Em Análise</option>
            <option value='approved'>Aprovado</option>
            <option value='rejected'>Rejeitado</option>
            <option value='expired'>Expirado</option>
          </select>

          {/* Level Filter */}
          <select
            value={levelFilter}
            onChange={e => setLevelFilter(e.target.value as KYCVerification['level'] | 'all')}
            className='px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent'
          >
            <option value='all'>Todos os Níveis</option>
            <option value='basic'>Básico</option>
            <option value='intermediate'>Intermediário</option>
            <option value='advanced'>Avançado</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={fetchVerifications}
            disabled={loading}
            className='px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50'
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className='flex gap-6'>
        {/* Table */}
        <div className='flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
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
              <table className='w-full'>
                <thead className='bg-gray-50 dark:bg-gray-900'>
                  <tr>
                    <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Usuário
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Nível
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Status
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Docs
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Data
                    </th>
                    <th className='px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                  {verifications.map(verification => (
                    <tr
                      key={verification.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${
                        selectedVerification?.id === verification.id ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => setSelectedVerification(verification)}
                    >
                      <td className='px-4 py-3'>
                        <div className='flex items-center gap-3'>
                          <div className='w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center'>
                            <User className='w-4 h-4 text-gray-500' />
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
                        <span className='text-sm text-gray-600 dark:text-gray-400'>
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
                          className='p-2 text-gray-500 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg'
                        >
                          <Eye className='w-4 h-4' />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className='flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700'>
                <div className='text-sm text-gray-500'>
                  Página {currentPage} de {totalPages}
                </div>
                <div className='flex gap-2'>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className='p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50'
                  >
                    <ChevronLeft className='w-4 h-4' />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className='p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50'
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
          <div className='w-96 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
            {/* Header */}
            <div className='p-4 border-b border-gray-200 dark:border-gray-700'>
              <div className='flex items-center justify-between'>
                <h3 className='font-semibold text-gray-900 dark:text-white'>
                  Detalhes da Verificação
                </h3>
                <button
                  onClick={() => {
                    setSelectedVerification(null)
                    setVerificationDetails(null)
                  }}
                  className='p-1 text-gray-500 hover:text-gray-700'
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
              <div className='p-4 space-y-4 max-h-[600px] overflow-y-auto'>
                {/* User Info */}
                <div>
                  <h4 className='text-sm font-medium text-gray-500 mb-2'>Usuário</h4>
                  <div className='bg-gray-50 dark:bg-gray-900 rounded-lg p-3'>
                    <div className='font-medium text-gray-900 dark:text-white'>
                      {selectedVerification.username}
                    </div>
                    <div className='text-sm text-gray-500'>{selectedVerification.email}</div>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <h4 className='text-sm font-medium text-gray-500 mb-2'>Status</h4>
                  <div className='flex items-center gap-2'>
                    <StatusBadge status={selectedVerification.status} />
                    <LevelBadge level={selectedVerification.level} />
                  </div>
                </div>

                {/* Personal Data */}
                {verificationDetails?.personal_data && (
                  <div>
                    <h4 className='text-sm font-medium text-gray-500 mb-2'>Dados Pessoais</h4>
                    <div className='bg-gray-50 dark:bg-gray-900 rounded-lg p-3 space-y-2 text-sm'>
                      <div className='flex justify-between'>
                        <span className='text-gray-500'>Nome:</span>
                        <span className='text-gray-900 dark:text-white'>
                          {verificationDetails.personal_data.full_name}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-gray-500'>CPF:</span>
                        <span className='text-gray-900 dark:text-white'>
                          {verificationDetails.personal_data.document_number}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-gray-500'>Nascimento:</span>
                        <span className='text-gray-900 dark:text-white'>
                          {verificationDetails.personal_data.birth_date}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-gray-500'>Telefone:</span>
                        <span className='text-gray-900 dark:text-white'>
                          {verificationDetails.personal_data.phone}
                        </span>
                      </div>
                      <div className='pt-2 border-t border-gray-200 dark:border-gray-700'>
                        <div className='text-gray-500 mb-1'>Endereço:</div>
                        <div className='text-gray-900 dark:text-white'>
                          {verificationDetails.personal_data.street},{' '}
                          {verificationDetails.personal_data.number}
                          {verificationDetails.personal_data.complement &&
                            ` - ${verificationDetails.personal_data.complement}`}
                          <br />
                          {verificationDetails.personal_data.neighborhood} -{' '}
                          {verificationDetails.personal_data.city}/
                          {verificationDetails.personal_data.state}
                          <br />
                          CEP: {verificationDetails.personal_data.zip_code}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Documents */}
                {verificationDetails?.documents && verificationDetails.documents.length > 0 && (
                  <div>
                    <h4 className='text-sm font-medium text-gray-500 mb-2'>Documentos</h4>
                    <div className='space-y-2'>
                      {verificationDetails.documents.map(doc => (
                        <div
                          key={doc.id}
                          className='bg-gray-50 dark:bg-gray-900 rounded-lg p-3 flex items-center justify-between'
                        >
                          <div>
                            <div className='text-sm font-medium text-gray-900 dark:text-white'>
                              {documentTypeLabels[doc.document_type] || doc.document_type}
                            </div>
                            <div className='text-xs text-gray-500'>
                              {formatDate(doc.uploaded_at)}
                            </div>
                          </div>
                          {doc.file_url && (
                            <a
                              href={doc.file_url}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='p-2 text-primary hover:bg-primary/10 rounded-lg'
                            >
                              <Eye className='w-4 h-4' />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Rejection Reason */}
                {selectedVerification.status === 'rejected' &&
                  selectedVerification.rejection_reason && (
                    <div>
                      <h4 className='text-sm font-medium text-gray-500 mb-2'>Motivo da Rejeição</h4>
                      <div className='bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg p-3 text-sm'>
                        {selectedVerification.rejection_reason}
                      </div>
                    </div>
                  )}

                {/* Action Buttons */}
                {(selectedVerification.status === 'submitted' ||
                  selectedVerification.status === 'under_review') && (
                  <div className='pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-2'>
                    <button
                      onClick={() =>
                        setReviewModal({
                          open: true,
                          type: 'reject',
                          verificationId: selectedVerification.id,
                        })
                      }
                      className='flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg font-medium'
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
                      className='flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg font-medium'
                    >
                      <CheckCircle className='w-4 h-4' />
                      Aprovar
                    </button>
                  </div>
                )}

                {/* View User Button */}
                <button
                  onClick={() => navigate(`/admin/users/${selectedVerification.user_id}`)}
                  className='w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium'
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
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
          <div className='bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4'>
            <h3 className='text-lg font-bold text-gray-900 dark:text-white mb-4'>
              {reviewModal.type === 'approve' ? 'Aprovar Verificação' : 'Rejeitar Verificação'}
            </h3>

            {reviewModal.type === 'reject' && (
              <div className='mb-4'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Motivo da Rejeição *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder='Descreva o motivo da rejeição...'
                  rows={3}
                  className='w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent'
                />
              </div>
            )}

            <p className='text-gray-500 mb-6'>
              {reviewModal.type === 'approve'
                ? 'Tem certeza que deseja aprovar esta verificação KYC?'
                : 'Tem certeza que deseja rejeitar esta verificação KYC?'}
            </p>

            <div className='flex gap-3'>
              <button
                onClick={() => {
                  setReviewModal({ open: false, type: null, verificationId: null })
                  setRejectionReason('')
                }}
                disabled={processing}
                className='flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50'
              >
                Cancelar
              </button>
              <button
                onClick={() => handleReview(reviewModal.type!)}
                disabled={processing || (reviewModal.type === 'reject' && !rejectionReason)}
                className={`flex-1 px-4 py-2 rounded-lg font-medium disabled:opacity-50 ${
                  reviewModal.type === 'approve'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {processing ? (
                  <Loader2 className='w-4 h-4 animate-spin mx-auto' />
                ) : reviewModal.type === 'approve' ? (
                  'Aprovar'
                ) : (
                  'Rejeitar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminKYCPage
