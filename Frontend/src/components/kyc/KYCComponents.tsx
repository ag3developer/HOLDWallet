/**
 * 🛡️ KYC Components - Componentes de Verificação
 * ================================================
 * Componentes reutilizáveis para o fluxo de KYC.
 *
 * Author: HOLD Wallet Team
 */

import React, { useState, useRef, useCallback } from 'react'
import {
  Shield,
  Check,
  Upload,
  X,
  AlertCircle,
  Clock,
  FileText,
  Camera,
  User,
  MapPin,
  CreditCard,
  Loader2,
  ChevronRight,
  Info,
  Download,
} from 'lucide-react'
import {
  KYCLevel,
  KYCStatus,
  DocumentType,
  DocumentStatus,
  KYCDocument,
  getStatusLabel,
  getLevelLabel,
  getDocumentTypeLabel,
  formatFileSize,
  formatCurrency,
} from '@/services/kyc'

// ============================================================
// STATUS BADGE
// ============================================================

interface StatusBadgeProps {
  status: KYCStatus
  size?: 'sm' | 'md' | 'lg'
}

export const KYCStatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const colors: Record<KYCStatus, string> = {
    [KYCStatus.PENDING]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    [KYCStatus.SUBMITTED]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    [KYCStatus.UNDER_REVIEW]:
      'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    [KYCStatus.APPROVED]: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    [KYCStatus.REJECTED]: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    [KYCStatus.EXPIRED]: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  }

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  const icons: Record<KYCStatus, React.ReactNode> = {
    [KYCStatus.PENDING]: <Clock className='w-3 h-3' />,
    [KYCStatus.SUBMITTED]: <Upload className='w-3 h-3' />,
    [KYCStatus.UNDER_REVIEW]: <Loader2 className='w-3 h-3 animate-spin' />,
    [KYCStatus.APPROVED]: <Check className='w-3 h-3' />,
    [KYCStatus.REJECTED]: <X className='w-3 h-3' />,
    [KYCStatus.EXPIRED]: <AlertCircle className='w-3 h-3' />,
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${colors[status]} ${sizes[size]}`}
    >
      {icons[status]}
      {getStatusLabel(status)}
    </span>
  )
}

// ============================================================
// LEVEL BADGE
// ============================================================

interface LevelBadgeProps {
  level: KYCLevel
  showLimits?: boolean
}

export const KYCLevelBadge: React.FC<LevelBadgeProps> = ({ level, showLimits = false }) => {
  const colors: Record<KYCLevel, string> = {
    [KYCLevel.NONE]: 'bg-gray-100 text-gray-600 border-gray-200',
    [KYCLevel.BASIC]: 'bg-blue-50 text-blue-700 border-blue-200',
    [KYCLevel.INTERMEDIATE]: 'bg-purple-50 text-purple-700 border-purple-200',
    [KYCLevel.ADVANCED]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }

  const icons: Record<KYCLevel, React.ReactNode> = {
    [KYCLevel.NONE]: <Shield className='w-4 h-4' />,
    [KYCLevel.BASIC]: <Shield className='w-4 h-4' />,
    [KYCLevel.INTERMEDIATE]: <Shield className='w-4 h-4' />,
    [KYCLevel.ADVANCED]: <Shield className='w-4 h-4' />,
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colors[level]}`}
    >
      {icons[level]}
      <span className='font-medium'>{getLevelLabel(level)}</span>
    </div>
  )
}

// ============================================================
// LEVEL SELECTOR
// ============================================================

interface LevelSelectorProps {
  selectedLevel: KYCLevel
  onSelect: (level: KYCLevel) => void
  disabled?: boolean
}

export const KYCLevelSelector: React.FC<LevelSelectorProps> = ({
  selectedLevel,
  onSelect,
  disabled = false,
}) => {
  const levels = [
    {
      level: KYCLevel.BASIC,
      name: 'Básico',
      description: 'Limites reduzidos, verificação simplificada',
      limits: { daily: 3000, monthly: 30000 },
      features: ['Instant Trade até R$ 1.000', 'P2P até R$ 5.000/mês'],
    },
    {
      level: KYCLevel.INTERMEDIATE,
      name: 'Intermediário',
      description: 'Limites elevados, verificação completa',
      limits: { daily: 100000, monthly: 500000 },
      features: [
        'Instant Trade até R$ 50.000',
        'WolkPay habilitado',
        'Transferências internacionais',
      ],
    },
    {
      level: KYCLevel.ADVANCED,
      name: 'Avançado',
      description: 'Limites personalizados, acesso total',
      limits: { daily: 999999999, monthly: 999999999 },
      features: ['Limites personalizados', 'Operações OTC', 'Conta empresarial'],
    },
  ]

  return (
    <div className='space-y-3'>
      {levels.map(item => (
        <button
          key={item.level}
          onClick={() => onSelect(item.level)}
          disabled={disabled}
          className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
            selectedLevel === item.level
              ? 'border-primary bg-primary/5'
              : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className='flex items-start justify-between'>
            <div className='flex-1'>
              <div className='flex items-center gap-2'>
                <h3 className='font-semibold text-gray-900 dark:text-white'>{item.name}</h3>
                {selectedLevel === item.level && (
                  <span className='bg-primary text-white text-xs px-2 py-0.5 rounded-full'>
                    Selecionado
                  </span>
                )}
              </div>
              <p className='text-sm text-gray-500 mt-1'>{item.description}</p>

              <div className='mt-3 flex flex-wrap gap-2'>
                {item.features.map((feature, idx) => (
                  <span
                    key={idx}
                    className='text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded'
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            <div
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedLevel === item.level
                  ? 'border-primary bg-primary'
                  : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              {selectedLevel === item.level && <Check className='w-3 h-3 text-white' />}
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

// ============================================================
// CONSENT CHECKBOX
// ============================================================

interface ConsentCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export const KYCConsentCheckbox: React.FC<ConsentCheckboxProps> = ({
  checked,
  onChange,
  disabled = false,
}) => {
  return (
    <div className='bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4'>
      <label className='flex items-start gap-3 cursor-pointer'>
        <input
          type='checkbox'
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          disabled={disabled}
          className='mt-1 w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary'
        />
        <div className='text-sm text-gray-600 dark:text-gray-400'>
          <p className='font-medium text-gray-900 dark:text-white mb-1'>
            Consentimento para Verificação
          </p>
          <p>
            Autorizo a HOLD Wallet a coletar e processar meus dados pessoais para fins de
            verificação de identidade (KYC), conforme a Lei Geral de Proteção de Dados (LGPD).
            Entendo que meus dados serão armazenados de forma segura e criptografada.
          </p>
          <a
            href='/privacy-policy'
            className='text-primary hover:underline mt-2 inline-block'
            target='_blank'
          >
            Ler Política de Privacidade →
          </a>
        </div>
      </label>
    </div>
  )
}

// ============================================================
// DOCUMENT UPLOAD CARD
// ============================================================

interface DocumentUploadCardProps {
  documentType: DocumentType
  document?: KYCDocument | undefined
  onUpload: (file: File) => void
  onDelete?: () => void
  uploading?: boolean
  progress?: number
  disabled?: boolean
}

export const DocumentUploadCard: React.FC<DocumentUploadCardProps> = ({
  documentType,
  document,
  onUpload,
  onDelete,
  uploading = false,
  progress = 0,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        onUpload(e.dataTransfer.files[0])
      }
    },
    [onUpload]
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0])
    }
  }

  const getIcon = () => {
    switch (documentType) {
      case DocumentType.SELFIE_WITH_DOCUMENT:
      case DocumentType.SELFIE_LIVENESS:
        return <Camera className='w-8 h-8' />
      case DocumentType.PROOF_OF_ADDRESS:
        return <MapPin className='w-8 h-8' />
      case DocumentType.PROOF_OF_INCOME:
        return <CreditCard className='w-8 h-8' />
      default:
        return <FileText className='w-8 h-8' />
    }
  }

  const getStatusColor = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.APPROVED:
        return 'border-green-500 bg-green-50 dark:bg-green-900/20'
      case DocumentStatus.REJECTED:
        return 'border-red-500 bg-red-50 dark:bg-red-900/20'
      case DocumentStatus.ANALYZING:
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
      default:
        return 'border-gray-200 dark:border-gray-700'
    }
  }

  return (
    <div
      className={`relative rounded-xl border-2 border-dashed transition-all ${
        document
          ? getStatusColor(document.status)
          : dragActive
            ? 'border-primary bg-primary/5'
            : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type='file'
        accept='image/jpeg,image/png,image/webp,application/pdf'
        onChange={handleChange}
        disabled={disabled || uploading}
        className='hidden'
      />

      {document ? (
        // Documento enviado
        <div className='p-4'>
          <div className='flex items-start justify-between'>
            <div className='flex items-center gap-3'>
              <div
                className={`p-2 rounded-lg ${
                  document.status === DocumentStatus.APPROVED
                    ? 'bg-green-100 text-green-600'
                    : document.status === DocumentStatus.REJECTED
                      ? 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                {getIcon()}
              </div>
              <div>
                <p className='font-medium text-gray-900 dark:text-white'>
                  {getDocumentTypeLabel(documentType)}
                </p>
                <p className='text-sm text-gray-500'>
                  {document.original_name} • {formatFileSize(document.file_size)}
                </p>
                {document.status === DocumentStatus.REJECTED && document.rejection_reason && (
                  <p className='text-sm text-red-500 mt-1'>{document.rejection_reason}</p>
                )}
              </div>
            </div>

            <div className='flex items-center gap-2'>
              {document.status === DocumentStatus.APPROVED && (
                <span className='text-green-500'>
                  <Check className='w-5 h-5' />
                </span>
              )}
              {onDelete && document.status !== DocumentStatus.APPROVED && (
                <button
                  onClick={onDelete}
                  className='p-1 text-gray-400 hover:text-red-500'
                  title='Remover documento'
                >
                  <X className='w-5 h-5' />
                </button>
              )}
            </div>
          </div>
        </div>
      ) : uploading ? (
        // Fazendo upload
        <div className='p-6 text-center'>
          <Loader2 className='w-8 h-8 animate-spin text-primary mx-auto mb-2' />
          <p className='text-sm text-gray-500'>Enviando documento...</p>
          <div className='mt-2 h-2 bg-gray-200 rounded-full overflow-hidden'>
            <div
              className='h-full bg-primary transition-all duration-300'
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : (
        // Área de upload
        <button
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className='w-full p-6 text-center'
        >
          <div className='text-gray-400 mx-auto mb-3'>{getIcon()}</div>
          <p className='font-medium text-gray-900 dark:text-white'>
            {getDocumentTypeLabel(documentType)}
          </p>
          <p className='text-sm text-gray-500 mt-1'>Arraste ou clique para enviar</p>
          <p className='text-xs text-gray-400 mt-2'>JPEG, PNG, WebP ou PDF até 10MB</p>
        </button>
      )}
    </div>
  )
}

// ============================================================
// STEP INDICATOR
// ============================================================

interface StepIndicatorProps {
  steps: string[]
  currentStep: number
  onStepClick?: (step: number) => void
}

export const KYCStepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStep,
  onStepClick,
}) => {
  return (
    <div className='flex items-center justify-center'>
      {steps.map((step, idx) => (
        <React.Fragment key={idx}>
          <button
            onClick={() => onStepClick?.(idx + 1)}
            disabled={idx + 1 > currentStep}
            className={`flex items-center gap-2 ${
              idx + 1 > currentStep ? 'cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                idx + 1 < currentStep
                  ? 'bg-green-500 text-white'
                  : idx + 1 === currentStep
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
              }`}
            >
              {idx + 1 < currentStep ? <Check className='w-4 h-4' /> : idx + 1}
            </div>
            <span
              className={`hidden sm:block text-sm ${
                idx + 1 === currentStep
                  ? 'text-gray-900 dark:text-white font-medium'
                  : 'text-gray-500'
              }`}
            >
              {step}
            </span>
          </button>

          {idx < steps.length - 1 && (
            <div
              className={`w-8 sm:w-16 h-0.5 mx-2 ${
                idx + 1 < currentStep ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// ============================================================
// INFO CARD
// ============================================================

interface InfoCardProps {
  type: 'info' | 'warning' | 'success' | 'error'
  title: string
  message: string
  action?: {
    label: string
    onClick: () => void
  }
}

export const KYCInfoCard: React.FC<InfoCardProps> = ({ type, title, message, action }) => {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200',
    warning:
      'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200',
    success:
      'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
    error:
      'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
  }

  const icons = {
    info: <Info className='w-5 h-5' />,
    warning: <AlertCircle className='w-5 h-5' />,
    success: <Check className='w-5 h-5' />,
    error: <X className='w-5 h-5' />,
  }

  return (
    <div className={`rounded-xl border p-4 ${styles[type]}`}>
      <div className='flex items-start gap-3'>
        {icons[type]}
        <div className='flex-1'>
          <h4 className='font-semibold'>{title}</h4>
          <p className='text-sm mt-1 opacity-90'>{message}</p>
          {action && (
            <button
              onClick={action.onClick}
              className='mt-2 text-sm font-medium flex items-center gap-1 hover:underline'
            >
              {action.label}
              <ChevronRight className='w-4 h-4' />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// LIMITS DISPLAY
// ============================================================

interface LimitsDisplayProps {
  level: KYCLevel
  limits: {
    daily_limit_brl: number
    monthly_limit_brl: number
    transaction_limit_brl: number
  }
}

export const KYCLimitsDisplay: React.FC<LimitsDisplayProps> = ({ level, limits }) => {
  return (
    <div className='bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4'>
      <div className='flex items-center gap-2 mb-3'>
        <KYCLevelBadge level={level} />
        <span className='text-sm text-gray-500'>Seus limites</span>
      </div>

      <div className='grid grid-cols-3 gap-4'>
        <div>
          <p className='text-xs text-gray-500 uppercase tracking-wider'>Por Transação</p>
          <p className='text-lg font-semibold text-gray-900 dark:text-white'>
            {limits.transaction_limit_brl >= 999999999
              ? 'Ilimitado'
              : formatCurrency(limits.transaction_limit_brl)}
          </p>
        </div>
        <div>
          <p className='text-xs text-gray-500 uppercase tracking-wider'>Diário</p>
          <p className='text-lg font-semibold text-gray-900 dark:text-white'>
            {limits.daily_limit_brl >= 999999999
              ? 'Ilimitado'
              : formatCurrency(limits.daily_limit_brl)}
          </p>
        </div>
        <div>
          <p className='text-xs text-gray-500 uppercase tracking-wider'>Mensal</p>
          <p className='text-lg font-semibold text-gray-900 dark:text-white'>
            {limits.monthly_limit_brl >= 999999999
              ? 'Ilimitado'
              : formatCurrency(limits.monthly_limit_brl)}
          </p>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// EXPORT DATA BUTTON
// ============================================================

interface ExportDataButtonProps {
  onExport: () => void
  loading?: boolean
}

export const KYCExportDataButton: React.FC<ExportDataButtonProps> = ({
  onExport,
  loading = false,
}) => {
  return (
    <button
      onClick={onExport}
      disabled={loading}
      className='flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-primary border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary transition-colors'
    >
      {loading ? <Loader2 className='w-4 h-4 animate-spin' /> : <Download className='w-4 h-4' />}
      Exportar Meus Dados (LGPD)
    </button>
  )
}

export default {
  KYCStatusBadge,
  KYCLevelBadge,
  KYCLevelSelector,
  KYCConsentCheckbox,
  DocumentUploadCard,
  KYCStepIndicator,
  KYCInfoCard,
  KYCLimitsDisplay,
  KYCExportDataButton,
}
