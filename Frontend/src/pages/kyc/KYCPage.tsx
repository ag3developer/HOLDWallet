import { useState } from 'react'
import { 
  Shield, 
  User, 
  Upload, 
  Check, 
  Clock, 
  AlertCircle,
  FileText,
  Camera,
  Globe,
  CreditCard,
  Users,
  Building,
  MapPin,
  Calendar,
  Phone,
  Mail,
  ChevronRight,
  X,
  Eye,
  Download,
  Trash2,
  Edit3
} from 'lucide-react'

type KYCStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'incomplete'

interface DocumentFile {
  id: string
  name: string
  type: 'identity' | 'address' | 'income' | 'selfie'
  file?: File
  url?: string
  status: KYCStatus
  uploadDate: string
  rejectionReason?: string
}

export const KYCPage = () => {
  const [activeStep, setActiveStep] = useState(0)
  const [kycStatus, setKycStatus] = useState<KYCStatus>('incomplete')
  const [isUploading, setIsUploading] = useState(false)

  const [personalInfo, setPersonalInfo] = useState({
    fullName: 'João Silva',
    dateOfBirth: '1990-05-15',
    nationality: 'BR',
    idNumber: '123.456.789-00',
    address: 'Rua das Flores, 123',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01234-567',
    country: 'BR',
    phone: '+55 11 99999-9999',
    occupation: 'Desenvolvedor de Software',
    monthlyIncome: '15000',
    sourceOfFunds: 'salary'
  })

  const [documents, setDocuments] = useState<DocumentFile[]>([
    {
      id: '1',
      name: 'RG_frente.jpg',
      type: 'identity',
      status: 'approved',
      uploadDate: '2024-11-20',
      url: '/mock-document-1.jpg'
    },
    {
      id: '2',
      name: 'RG_verso.jpg',
      type: 'identity',
      status: 'approved',
      uploadDate: '2024-11-20',
      url: '/mock-document-2.jpg'
    },
    {
      id: '3',
      name: 'comprovante_residencia.pdf',
      type: 'address',
      status: 'under_review',
      uploadDate: '2024-11-21',
      url: '/mock-document-3.pdf'
    }
  ])

  const kycSteps = [
    {
      id: 0,
      title: 'Informações Pessoais',
      description: 'Dados básicos e contato',
      icon: User,
      status: 'approved' as KYCStatus
    },
    {
      id: 1,
      title: 'Documentos de Identidade',
      description: 'RG, CNH ou Passaporte',
      icon: FileText,
      status: 'approved' as KYCStatus
    },
    {
      id: 2,
      title: 'Comprovante de Endereço',
      description: 'Documento com até 3 meses',
      icon: MapPin,
      status: 'under_review' as KYCStatus
    },
    {
      id: 3,
      title: 'Selfie de Verificação',
      description: 'Foto segurando documento',
      icon: Camera,
      status: 'pending' as KYCStatus
    },
    {
      id: 4,
      title: 'Informações Financeiras',
      description: 'Renda e origem dos recursos',
      icon: CreditCard,
      status: 'incomplete' as KYCStatus
    }
  ]

  const getStatusIcon = (status: KYCStatus) => {
    switch (status) {
      case 'approved':
        return <Check className="w-5 h-5 text-green-600" />
      case 'under_review':
        return <Clock className="w-5 h-5 text-yellow-600" />
      case 'rejected':
        return <X className="w-5 h-5 text-red-600" />
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-blue-600" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusText = (status: KYCStatus) => {
    switch (status) {
      case 'approved':
        return 'Aprovado'
      case 'under_review':
        return 'Em Análise'
      case 'rejected':
        return 'Rejeitado'
      case 'pending':
        return 'Pendente'
      default:
        return 'Incompleto'
    }
  }

  const getStatusColor = (status: KYCStatus) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
      case 'under_review':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
      case 'pending':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: DocumentFile['type']) => {
    const file = e.target.files?.[0]
    if (file) {
      setIsUploading(true)
      
      // Simular upload
      setTimeout(() => {
        const newDoc: DocumentFile = {
          id: Date.now().toString(),
          name: file.name,
          type,
          file,
          status: 'pending',
          uploadDate: new Date().toISOString().split('T')[0] || ''
        }
        
        setDocuments(prev => [...prev, newDoc])
        setIsUploading(false)
      }, 2000)
    }
  }

  const handleDeleteDocument = (docId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== docId))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            Verificação KYC
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Complete sua verificação de identidade para usar todos os recursos
          </p>
        </div>

        {/* Overall Status */}
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(kycStatus)}`}>
          {getStatusIcon(kycStatus)}
          Status: {getStatusText(kycStatus)}
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Progresso da Verificação</h2>
        
        <div className="space-y-4">
          {kycSteps.map((step, index) => (
            <div 
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                activeStep === step.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                step.status === 'approved' 
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : step.status === 'under_review'
                  ? 'bg-yellow-100 dark:bg-yellow-900/30'
                  : step.status === 'rejected'
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                <step.icon className={`w-6 h-6 ${
                  step.status === 'approved' ? 'text-green-600'
                  : step.status === 'under_review' ? 'text-yellow-600'
                  : step.status === 'rejected' ? 'text-red-600'
                  : 'text-gray-500'
                }`} />
              </div>
              
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {step.description}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(step.status)}`}>
                  {getStatusIcon(step.status)}
                  {getStatusText(step.status)}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Personal Information */}
          {activeStep === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Informações Pessoais
                </h3>
                <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Edit3 className="w-4 h-4" />
                  Editar
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={personalInfo.fullName}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, fullName: e.target.value }))}
                      aria-label="Nome completo"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      readOnly
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    CPF
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={personalInfo.idNumber}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, idNumber: e.target.value }))}
                      aria-label="CPF"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      readOnly
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Data de Nascimento
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="date"
                      value={personalInfo.dateOfBirth}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                      aria-label="Data de nascimento"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      readOnly
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Telefone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="tel"
                      value={personalInfo.phone}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, phone: e.target.value }))}
                      aria-label="Telefone"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      readOnly
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Profissão
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={personalInfo.occupation}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, occupation: e.target.value }))}
                      aria-label="Profissão"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      readOnly
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Renda Mensal
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={`R$ ${personalInfo.monthlyIncome}`}
                      onChange={(e) => setPersonalInfo(prev => ({ ...prev, monthlyIncome: e.target.value }))}
                      aria-label="Renda mensal"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      readOnly
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Endereço Completo
                </label>
                <textarea
                  value={`${personalInfo.address}, ${personalInfo.city} - ${personalInfo.state}, ${personalInfo.zipCode}`}
                  aria-label="Endereço completo"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  rows={3}
                  readOnly
                />
              </div>
            </div>
          )}

          {/* Document Upload Section */}
          {(activeStep === 1 || activeStep === 2 || activeStep === 3) && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                {activeStep === 1 && 'Upload de Documentos de Identidade'}
                {activeStep === 2 && 'Upload de Comprovante de Endereço'}
                {activeStep === 3 && 'Selfie de Verificação'}
              </h3>

              {/* Upload Area */}
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                {isUploading ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="text-gray-600 dark:text-gray-300">Enviando documento...</p>
                  </div>
                ) : (
                  <>
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Arraste e solte seu arquivo aqui
                    </p>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      Ou clique para selecionar
                    </p>
                    <label className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                      <Upload className="w-4 h-4" />
                      Selecionar Arquivo
                      <input
                        type="file"
                        accept={activeStep === 3 ? "image/*" : "image/*,.pdf"}
                        onChange={(e) => handleFileUpload(e, 
                          activeStep === 1 ? 'identity' : 
                          activeStep === 2 ? 'address' : 'selfie'
                        )}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {activeStep === 3 ? 'Apenas imagens (JPG, PNG)' : 'PDF, JPG, PNG (máx. 5MB)'}
                    </p>
                  </>
                )}
              </div>

              {/* Document Requirements */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-400 mb-2">Requisitos:</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                  {activeStep === 1 && (
                    <>
                      <li>• RG, CNH ou Passaporte válido</li>
                      <li>• Documento deve estar legível e sem rasuras</li>
                      <li>• Envie frente e verso (se aplicável)</li>
                    </>
                  )}
                  {activeStep === 2 && (
                    <>
                      <li>• Conta de luz, água, telefone ou extrato bancário</li>
                      <li>• Documento deve ter no máximo 3 meses</li>
                      <li>• Deve conter seu nome e endereço completo</li>
                    </>
                  )}
                  {activeStep === 3 && (
                    <>
                      <li>• Foto sua segurando o documento de identidade</li>
                      <li>• Rosto e documento devem estar visíveis</li>
                      <li>• Boa iluminação e qualidade da imagem</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          
          {/* Uploaded Documents */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Documentos Enviados
            </h3>

            {documents.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                Nenhum documento enviado ainda
              </p>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getStatusColor(doc.status)}`}>
                      <FileText className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {doc.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(doc.status)}`}>
                          {getStatusIcon(doc.status)}
                          {getStatusText(doc.status)}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1">
                      {doc.url && (
                        <button 
                          aria-label="Visualizar documento"
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteDocument(doc.id)}
                        aria-label="Remover documento"
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Help Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Precisa de Ajuda?
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Guia de Documentos</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Veja exemplos de documentos aceitos
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Suporte</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Entre em contato com nossa equipe
                  </p>
                </div>
              </div>

              <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Falar com Suporte
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
