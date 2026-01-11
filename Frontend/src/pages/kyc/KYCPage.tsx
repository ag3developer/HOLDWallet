/**
 * 🛡️ KYC Page - Verificação de Identidade
 * ========================================
 * Página completa para verificação KYC com fluxo em steps.
 *
 * Author: HOLD Wallet Team
 */

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Shield,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react'

import { useKYC } from '@/hooks/useKYC'
import { KYCStatus, KYCLevel, DocumentType, KYCPersonalData } from '@/services/kyc'

import {
  KYCStatusBadge,
  KYCLevelBadge,
  KYCLevelSelector,
  KYCConsentCheckbox,
  DocumentUploadCard,
  KYCStepIndicator,
  KYCInfoCard,
  KYCLimitsDisplay,
  KYCExportDataButton,
} from '@/components/kyc/KYCComponents'

// ============================================================
// MAIN COMPONENT
// ============================================================

const KYCPage: React.FC = () => {
  const navigate = useNavigate()
  const {
    verification,
    loading,
    error,
    requirements,
    uploading,
    uploadProgress,
    submitting,
    loadStatus,
    loadRequirements,
    startVerification,
    savePersonalData,
    uploadDocument,
    deleteDocument,
    submitForReview,
    exportData,
    clearError,
    getMissingDocuments,
    getUploadedDocuments,
  } = useKYC()

  // Step management
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedLevel, setSelectedLevel] = useState<KYCLevel>(KYCLevel.BASIC)
  const [consent, setConsent] = useState(false)

  // CEP lookup state
  const [loadingCep, setLoadingCep] = useState(false)
  const [prefillLoaded, setPrefillLoaded] = useState(false)
  const [prefillSource, setPrefillSource] = useState<string | null>(null)

  // Form data
  const [personalData, setPersonalData] = useState<Partial<KYCPersonalData>>({
    nationality: 'BR',
    country: 'BR',
  })

  const steps = ['Nível', 'Consentimento', 'Dados Pessoais', 'Documentos', 'Revisão']

  // Effect to sync step with verification status
  useEffect(() => {
    if (verification) {
      // Se já existe verificação, ajustar o step baseado no status
      if (verification.status === KYCStatus.APPROVED) {
        setCurrentStep(5)
      } else if (
        verification.status === KYCStatus.SUBMITTED ||
        verification.status === KYCStatus.UNDER_REVIEW
      ) {
        setCurrentStep(5)
      } else if (verification.status === KYCStatus.REJECTED) {
        // Rejeitado - pode tentar novamente
        setCurrentStep(1)
      } else if (verification.consent_given && (verification.documents?.length ?? 0) > 0) {
        // Tem consentimento e documentos - ir para step 4 (documentos)
        setCurrentStep(4)
      } else if (verification.consent_given) {
        // Tem consentimento mas não tem documentos - ir para step 3 (dados pessoais)
        setCurrentStep(3)
      } else {
        // Verificação existe mas sem consentimento - ir para step 2 (consentimento)
        // Mas como já existe, pular para step 3 (dados pessoais)
        setCurrentStep(3)
      }

      // Sincronizar o nível selecionado com o da verificação existente
      if (verification.level) {
        setSelectedLevel(verification.level)
      }

      // Se já deu consentimento, marcar
      if (verification.consent_given) {
        setConsent(true)
      }
    }
  }, [verification])

  // Load requirements when level changes
  useEffect(() => {
    loadRequirements(selectedLevel)
  }, [selectedLevel, loadRequirements])

  // Load prefill data on mount
  useEffect(() => {
    const loadPrefillData = async () => {
      if (prefillLoaded) return

      try {
        const response = await fetch('/api/kyc/prefill-data', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data && Object.keys(data.data).length > 0) {
            setPersonalData(prev => ({
              ...prev,
              full_name: data.data.full_name || prev.full_name,
              document_number: data.data.document_number || prev.document_number,
              birth_date: data.data.birth_date || prev.birth_date,
              phone: data.data.phone || prev.phone,
              mother_name: data.data.mother_name || prev.mother_name,
              zip_code: data.data.zip_code || prev.zip_code,
              street: data.data.street || prev.street,
              number: data.data.number || prev.number,
              complement: data.data.complement || prev.complement,
              neighborhood: data.data.neighborhood || prev.neighborhood,
              city: data.data.city || prev.city,
              state: data.data.state || prev.state,
            }))
            setPrefillSource(data.source)
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados pré-preenchidos:', err)
      } finally {
        setPrefillLoaded(true)
      }
    }

    loadPrefillData()
  }, [prefillLoaded])

  // ============================================================
  // CEP LOOKUP FUNCTION
  // ============================================================

  const handleCepLookup = async (cep: string) => {
    // Remove caracteres não numéricos
    const cleanCep = cep.replace(/\D/g, '')

    // CEP precisa ter 8 dígitos
    if (cleanCep.length !== 8) return

    setLoadingCep(true)

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
      const data = await response.json()

      if (!data.erro) {
        setPersonalData(prev => ({
          ...prev,
          street: data.logradouro || prev.street,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
          complement: data.complemento || prev.complement,
        }))
      }
    } catch (err) {
      console.error('Erro ao buscar CEP:', err)
    } finally {
      setLoadingCep(false)
    }
  }

  // Format CPF as 000.000.000-00
  const formatCpf = (value: string): string => {
    const numbers = value.replace(/\D/g, '').slice(0, 11)
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`
    if (numbers.length <= 9)
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9)}`
  }

  // Format CEP as 00000-000
  const formatCep = (value: string): string => {
    const numbers = value.replace(/\D/g, '').slice(0, 8)
    if (numbers.length <= 5) return numbers
    return `${numbers.slice(0, 5)}-${numbers.slice(5)}`
  }

  // Format phone as (00) 00000-0000
  const formatPhone = (value: string): string => {
    const numbers = value.replace(/\D/g, '').slice(0, 11)
    if (numbers.length <= 2) return numbers.length ? `(${numbers}` : ''
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`
  }

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleStartVerification = async () => {
    if (!consent) return

    // Se já existe uma verificação em andamento, apenas avançar para o próximo step
    if (verification && verification.status === KYCStatus.PENDING) {
      setCurrentStep(3)
      return
    }

    const success = await startVerification(selectedLevel, consent)
    if (success) {
      setCurrentStep(3)
    }
  }

  const handleSavePersonalData = async () => {
    const success = await savePersonalData(personalData as KYCPersonalData)
    if (success) {
      setCurrentStep(4)
    }
  }

  const handleUploadDocument = async (type: DocumentType, file: File) => {
    await uploadDocument(type, file)
  }

  const handleDeleteDocument = async (documentId: string) => {
    await deleteDocument(documentId)
  }

  const handleSubmit = async () => {
    const success = await submitForReview()
    if (success) {
      setCurrentStep(5)
    }
  }

  const handleInputChange = (field: keyof KYCPersonalData, value: string | boolean) => {
    setPersonalData(prev => ({ ...prev, [field]: value }))
  }

  // ============================================================
  // RENDER HELPERS
  // ============================================================

  const renderApprovedStatus = () => (
    <div className='text-center py-8'>
      <div className='w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4'>
        <CheckCircle className='w-10 h-10 text-green-500' />
      </div>
      <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
        Verificação Aprovada! 🎉
      </h2>
      <p className='text-gray-500 mb-6'>
        Sua conta está verificada no nível{' '}
        {verification?.level && <KYCLevelBadge level={verification.level} />}
      </p>

      {verification?.limits && (
        <KYCLimitsDisplay
          level={verification.level}
          limits={{
            daily_limit_brl: verification.limits.limits?.instant_trade?.daily_limit_brl || 0,
            monthly_limit_brl: verification.limits.limits?.instant_trade?.monthly_limit_brl || 0,
            transaction_limit_brl:
              verification.limits.limits?.instant_trade?.transaction_limit_brl || 0,
          }}
        />
      )}

      {verification?.expiration_date && (
        <p className='text-sm text-gray-500 mt-4'>
          Válido até: {new Date(verification.expiration_date).toLocaleDateString('pt-BR')}
        </p>
      )}

      <div className='mt-6 flex justify-center gap-4'>
        <KYCExportDataButton onExport={exportData} />
        <button
          onClick={() => navigate('/dashboard')}
          className='px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90'
        >
          Ir para Dashboard
        </button>
      </div>
    </div>
  )

  const renderPendingReview = () => (
    <div className='text-center py-8'>
      <div className='w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4'>
        <Clock className='w-10 h-10 text-blue-500 animate-pulse' />
      </div>
      <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>Em Análise</h2>
      <p className='text-gray-500 mb-6'>
        Sua verificação está sendo analisada pela nossa equipe.
        <br />
        Você receberá uma notificação quando houver atualização.
      </p>

      <KYCInfoCard
        type='info'
        title='Tempo estimado'
        message='A análise geralmente leva até 24 horas úteis.'
      />

      <div className='mt-6'>
        <button
          onClick={() => navigate('/dashboard')}
          className='px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90'
        >
          Voltar ao Dashboard
        </button>
      </div>
    </div>
  )

  const renderRejected = () => (
    <div className='text-center py-8'>
      <div className='w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4'>
        <XCircle className='w-10 h-10 text-red-500' />
      </div>
      <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-2'>
        Verificação Rejeitada
      </h2>
      <p className='text-gray-500 mb-4'>Infelizmente sua verificação foi rejeitada.</p>

      {verification?.rejection_reason && (
        <KYCInfoCard type='error' title='Motivo' message={verification.rejection_reason} />
      )}

      {verification?.requested_documents && verification.requested_documents.length > 0 && (
        <div className='mt-4 text-left bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4'>
          <p className='font-medium text-yellow-800 dark:text-yellow-200 mb-2'>
            <AlertTriangle className='w-4 h-4 inline mr-2' />
            Documentos solicitados:
          </p>
          <ul className='list-disc list-inside text-yellow-700 dark:text-yellow-300 text-sm'>
            {verification.requested_documents.map((doc, idx) => (
              <li key={idx}>{doc}</li>
            ))}
          </ul>
        </div>
      )}

      <div className='mt-6'>
        <button
          onClick={() => {
            // Reiniciar processo
            setCurrentStep(1)
            loadStatus()
          }}
          className='px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90'
        >
          Tentar Novamente
        </button>
      </div>
    </div>
  )

  // ============================================================
  // STEP CONTENT
  // ============================================================

  const renderStepContent = () => {
    // Status especiais
    if (verification?.status === KYCStatus.APPROVED) {
      return renderApprovedStatus()
    }
    if (
      verification?.status === KYCStatus.SUBMITTED ||
      verification?.status === KYCStatus.UNDER_REVIEW
    ) {
      return renderPendingReview()
    }
    if (verification?.status === KYCStatus.REJECTED) {
      return renderRejected()
    }

    switch (currentStep) {
      case 1:
        return (
          <div className='space-y-6'>
            <div className='text-center mb-6'>
              <h2 className='text-xl font-bold text-gray-900 dark:text-white'>
                Escolha seu Nível de Verificação
              </h2>
              <p className='text-gray-500 mt-1'>
                Selecione o nível que melhor atende às suas necessidades
              </p>
            </div>

            <KYCLevelSelector selectedLevel={selectedLevel} onSelect={setSelectedLevel} />

            <div className='flex justify-end'>
              <button
                onClick={() => setCurrentStep(2)}
                className='flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90'
              >
                Continuar
                <ArrowRight className='w-4 h-4' />
              </button>
            </div>
          </div>
        )

      case 2:
        return (
          <div className='space-y-6'>
            <div className='text-center mb-6'>
              <h2 className='text-xl font-bold text-gray-900 dark:text-white'>
                Termos e Consentimento
              </h2>
              <p className='text-gray-500 mt-1'>Leia e aceite os termos para continuar</p>
            </div>

            {/* Mostrar aviso se já existe verificação em andamento */}
            {verification && verification.status === KYCStatus.PENDING && (
              <KYCInfoCard
                type='info'
                title='Verificação em andamento'
                message='Você já iniciou uma verificação. Continue de onde parou preenchendo seus dados.'
              />
            )}

            <KYCInfoCard
              type='info'
              title='Por que precisamos verificar sua identidade?'
              message='A verificação KYC é obrigatória por regulamentação e ajuda a proteger você e a plataforma contra fraudes e atividades ilegais.'
            />

            <KYCConsentCheckbox checked={consent} onChange={setConsent} />

            <div className='flex justify-between'>
              <button
                onClick={() => setCurrentStep(1)}
                className='flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900'
              >
                <ArrowLeft className='w-4 h-4' />
                Voltar
              </button>

              <button
                onClick={handleStartVerification}
                disabled={!consent || submitting}
                className='flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {submitting ? (
                  <>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    Iniciando...
                  </>
                ) : verification && verification.status === KYCStatus.PENDING ? (
                  <>
                    Continuar Verificação
                    <ArrowRight className='w-4 h-4' />
                  </>
                ) : (
                  <>
                    Aceitar e Continuar
                    <ArrowRight className='w-4 h-4' />
                  </>
                )}
              </button>
            </div>
          </div>
        )

      case 3:
        return (
          <div className='space-y-6'>
            <div className='text-center mb-6'>
              <h2 className='text-xl font-bold text-gray-900 dark:text-white'>Dados Pessoais</h2>
              <p className='text-gray-500 mt-1'>Preencha seus dados conforme seu documento</p>
            </div>

            {/* Form de dados pessoais */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {/* Nome completo */}
              <div className='md:col-span-2'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Nome Completo *
                </label>
                <input
                  type='text'
                  value={personalData.full_name || ''}
                  onChange={e => handleInputChange('full_name', e.target.value)}
                  placeholder='Conforme seu documento'
                  className='w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent'
                />
              </div>

              {/* CPF */}
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  CPF *
                </label>
                <input
                  type='text'
                  value={personalData.document_number || ''}
                  onChange={e => handleInputChange('document_number', formatCpf(e.target.value))}
                  placeholder='000.000.000-00'
                  maxLength={14}
                  className='w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent'
                />
              </div>

              {/* Data de nascimento */}
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Data de Nascimento *
                </label>
                <input
                  type='date'
                  value={personalData.birth_date || ''}
                  onChange={e => handleInputChange('birth_date', e.target.value)}
                  className='w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent'
                />
              </div>

              {/* Telefone */}
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Telefone *
                </label>
                <input
                  type='tel'
                  value={personalData.phone || ''}
                  onChange={e => handleInputChange('phone', formatPhone(e.target.value))}
                  placeholder='(11) 99999-9999'
                  maxLength={15}
                  className='w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent'
                />
              </div>

              {/* Nome da mãe */}
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Nome da Mãe
                </label>
                <input
                  type='text'
                  value={personalData.mother_name || ''}
                  onChange={e => handleInputChange('mother_name', e.target.value)}
                  placeholder='Nome completo'
                  className='w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent'
                />
              </div>

              {/* Separador de endereço */}
              <div className='md:col-span-2 border-t border-gray-200 dark:border-gray-700 pt-4 mt-2'>
                <h3 className='font-medium text-gray-900 dark:text-white'>
                  Endereço
                  {prefillSource && (
                    <span className='ml-2 text-xs font-normal text-green-600 dark:text-green-400'>
                      ✓ Dados pré-preenchidos
                    </span>
                  )}
                </h3>
              </div>

              {/* CEP */}
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  CEP *
                </label>
                <div className='relative'>
                  <input
                    type='text'
                    value={personalData.zip_code || ''}
                    onChange={e => {
                      const formatted = formatCep(e.target.value)
                      handleInputChange('zip_code', formatted)
                      handleCepLookup(formatted)
                    }}
                    placeholder='00000-000'
                    maxLength={9}
                    className='w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent'
                  />
                  {loadingCep && (
                    <div className='absolute right-3 top-1/2 -translate-y-1/2'>
                      <Loader2 className='w-4 h-4 animate-spin text-primary' />
                    </div>
                  )}
                </div>
                <p className='text-xs text-gray-500 mt-1'>
                  Digite o CEP para preencher o endereço automaticamente
                </p>
              </div>

              {/* Rua */}
              <div className='md:col-span-2'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Rua/Avenida *
                </label>
                <input
                  type='text'
                  value={personalData.street || ''}
                  onChange={e => handleInputChange('street', e.target.value)}
                  className='w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent'
                />
              </div>

              {/* Número */}
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Número *
                </label>
                <input
                  type='text'
                  value={personalData.number || ''}
                  onChange={e => handleInputChange('number', e.target.value)}
                  className='w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent'
                />
              </div>

              {/* Complemento */}
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Complemento
                </label>
                <input
                  type='text'
                  value={personalData.complement || ''}
                  onChange={e => handleInputChange('complement', e.target.value)}
                  className='w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent'
                />
              </div>

              {/* Bairro */}
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Bairro *
                </label>
                <input
                  type='text'
                  value={personalData.neighborhood || ''}
                  onChange={e => handleInputChange('neighborhood', e.target.value)}
                  className='w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent'
                />
              </div>

              {/* Cidade */}
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Cidade *
                </label>
                <input
                  type='text'
                  value={personalData.city || ''}
                  onChange={e => handleInputChange('city', e.target.value)}
                  className='w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent'
                />
              </div>

              {/* Estado */}
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  Estado *
                </label>
                <select
                  value={personalData.state || ''}
                  onChange={e => handleInputChange('state', e.target.value)}
                  className='w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent'
                >
                  <option value=''>Selecione</option>
                  <option value='AC'>Acre</option>
                  <option value='AL'>Alagoas</option>
                  <option value='AP'>Amapá</option>
                  <option value='AM'>Amazonas</option>
                  <option value='BA'>Bahia</option>
                  <option value='CE'>Ceará</option>
                  <option value='DF'>Distrito Federal</option>
                  <option value='ES'>Espírito Santo</option>
                  <option value='GO'>Goiás</option>
                  <option value='MA'>Maranhão</option>
                  <option value='MT'>Mato Grosso</option>
                  <option value='MS'>Mato Grosso do Sul</option>
                  <option value='MG'>Minas Gerais</option>
                  <option value='PA'>Pará</option>
                  <option value='PB'>Paraíba</option>
                  <option value='PR'>Paraná</option>
                  <option value='PE'>Pernambuco</option>
                  <option value='PI'>Piauí</option>
                  <option value='RJ'>Rio de Janeiro</option>
                  <option value='RN'>Rio Grande do Norte</option>
                  <option value='RS'>Rio Grande do Sul</option>
                  <option value='RO'>Rondônia</option>
                  <option value='RR'>Roraima</option>
                  <option value='SC'>Santa Catarina</option>
                  <option value='SP'>São Paulo</option>
                  <option value='SE'>Sergipe</option>
                  <option value='TO'>Tocantins</option>
                </select>
              </div>
            </div>

            <div className='flex justify-between pt-4'>
              <button
                onClick={() => setCurrentStep(2)}
                className='flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900'
              >
                <ArrowLeft className='w-4 h-4' />
                Voltar
              </button>

              <button
                onClick={handleSavePersonalData}
                disabled={submitting || !personalData.full_name || !personalData.document_number}
                className='flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {submitting ? (
                  <>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    Salvando...
                  </>
                ) : (
                  <>
                    Continuar
                    <ArrowRight className='w-4 h-4' />
                  </>
                )}
              </button>
            </div>
          </div>
        )

      case 4:
        return (
          <div className='space-y-6'>
            <div className='text-center mb-6'>
              <h2 className='text-xl font-bold text-gray-900 dark:text-white'>
                Envio de Documentos
              </h2>
              <p className='text-gray-500 mt-1'>Envie os documentos necessários para verificação</p>
            </div>

            {/* Documentos necessários */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {/* CNH ou RG */}
              <DocumentUploadCard
                documentType={DocumentType.CNH_FRONT}
                document={getUploadedDocuments().find(
                  d => d.document_type === DocumentType.CNH_FRONT
                )}
                onUpload={file => handleUploadDocument(DocumentType.CNH_FRONT, file)}
                onDelete={() => {
                  const doc = getUploadedDocuments().find(
                    d => d.document_type === DocumentType.CNH_FRONT
                  )
                  if (doc) handleDeleteDocument(doc.id)
                }}
                uploading={uploading}
                progress={uploadProgress}
              />

              <DocumentUploadCard
                documentType={DocumentType.CNH_BACK}
                document={getUploadedDocuments().find(
                  d => d.document_type === DocumentType.CNH_BACK
                )}
                onUpload={file => handleUploadDocument(DocumentType.CNH_BACK, file)}
                onDelete={() => {
                  const doc = getUploadedDocuments().find(
                    d => d.document_type === DocumentType.CNH_BACK
                  )
                  if (doc) handleDeleteDocument(doc.id)
                }}
                uploading={uploading}
                progress={uploadProgress}
              />

              {/* Selfie */}
              <div className='md:col-span-2'>
                <DocumentUploadCard
                  documentType={DocumentType.SELFIE_WITH_DOCUMENT}
                  document={getUploadedDocuments().find(
                    d => d.document_type === DocumentType.SELFIE_WITH_DOCUMENT
                  )}
                  onUpload={file => handleUploadDocument(DocumentType.SELFIE_WITH_DOCUMENT, file)}
                  onDelete={() => {
                    const doc = getUploadedDocuments().find(
                      d => d.document_type === DocumentType.SELFIE_WITH_DOCUMENT
                    )
                    if (doc) handleDeleteDocument(doc.id)
                  }}
                  uploading={uploading}
                  progress={uploadProgress}
                />
              </div>

              {/* Comprovante de residência (se intermediário+) */}
              {selectedLevel !== KYCLevel.BASIC && (
                <div className='md:col-span-2'>
                  <DocumentUploadCard
                    documentType={DocumentType.PROOF_OF_ADDRESS}
                    document={getUploadedDocuments().find(
                      d => d.document_type === DocumentType.PROOF_OF_ADDRESS
                    )}
                    onUpload={file => handleUploadDocument(DocumentType.PROOF_OF_ADDRESS, file)}
                    onDelete={() => {
                      const doc = getUploadedDocuments().find(
                        d => d.document_type === DocumentType.PROOF_OF_ADDRESS
                      )
                      if (doc) handleDeleteDocument(doc.id)
                    }}
                    uploading={uploading}
                    progress={uploadProgress}
                  />
                </div>
              )}
            </div>

            {/* Documentos faltantes */}
            {getMissingDocuments().length > 0 && (
              <KYCInfoCard
                type='warning'
                title='Documentos pendentes'
                message={`Ainda faltam ${getMissingDocuments().length} documento(s) para completar sua verificação.`}
              />
            )}

            <div className='flex justify-between pt-4'>
              <button
                onClick={() => setCurrentStep(3)}
                className='flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900'
              >
                <ArrowLeft className='w-4 h-4' />
                Voltar
              </button>

              <button
                onClick={handleSubmit}
                disabled={submitting || getMissingDocuments().length > 0}
                className='flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {submitting ? (
                  <>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar para Análise
                    <ArrowRight className='w-4 h-4' />
                  </>
                )}
              </button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  // ============================================================
  // MAIN RENDER
  // ============================================================

  if (loading) {
    return (
      <div className='flex items-center justify-center min-h-screen'>
        <Loader2 className='w-8 h-8 animate-spin text-primary' />
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900'>
      {/* Header */}
      <div className='bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700'>
        <div className='max-w-4xl mx-auto px-4 py-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <button
                onClick={() => navigate(-1)}
                className='p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg'
              >
                <ArrowLeft className='w-5 h-5' />
              </button>
              <div className='flex items-center gap-2'>
                <Shield className='w-6 h-6 text-primary' />
                <h1 className='text-xl font-bold text-gray-900 dark:text-white'>Verificação KYC</h1>
              </div>
            </div>

            {verification && <KYCStatusBadge status={verification.status} />}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className='max-w-4xl mx-auto px-4 py-8'>
        {/* Error Alert */}
        {error && (
          <div className='mb-6'>
            <KYCInfoCard
              type='error'
              title='Erro'
              message={error}
              action={{
                label: 'Fechar',
                onClick: clearError,
              }}
            />
          </div>
        )}

        {/* Step Indicator */}
        {verification?.status !== KYCStatus.APPROVED &&
          verification?.status !== KYCStatus.SUBMITTED &&
          verification?.status !== KYCStatus.UNDER_REVIEW && (
            <div className='mb-8'>
              <KYCStepIndicator
                steps={steps}
                currentStep={currentStep}
                onStepClick={step => {
                  if (step <= currentStep) setCurrentStep(step)
                }}
              />
            </div>
          )}

        {/* Main Content Card */}
        <div className='bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8'>
          {renderStepContent()}
        </div>

        {/* Footer Info */}
        <div className='mt-6 text-center text-sm text-gray-500'>
          <p>Seus dados são criptografados e protegidos conforme a LGPD.</p>
          <p className='mt-1'>
            Dúvidas?{' '}
            <a href='/support' className='text-primary hover:underline'>
              Entre em contato
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export { KYCPage }
export default KYCPage
