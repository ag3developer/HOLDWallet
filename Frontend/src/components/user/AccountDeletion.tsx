/**
 * 👤 Account Deletion Component
 * =============================
 *
 * Componente para solicitar e gerenciar exclusão de conta
 * - Exportar dados
 * - Solicitar exclusão
 * - Confirmar com código
 * - Cancelar exclusão
 */

import React, { useState } from 'react'
import { Trash2, Mail, AlertCircle, CheckCircle, Clock, Download } from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  useRequestAccountDeletion,
  useConfirmAccountDeletion,
  useCancelAccountDeletion,
  useAccountDeletionStatus,
  useExportAccountData,
} from '@/hooks/user/useAccountDeletion'

type DeletionStep = 'menu' | 'export' | 'request' | 'confirm' | 'status'

interface AccountDeletionProps {
  onClose?: () => void
}

export const AccountDeletion: React.FC<AccountDeletionProps> = ({ onClose }) => {
  const [step, setStep] = useState<DeletionStep>('menu')
  const [password, setPassword] = useState('')
  const [reason, setReason] = useState('')
  const [confirmationCode, setConfirmationCode] = useState('')
  const [deletionType, setDeletionType] = useState<'soft' | 'hard' | 'scheduled'>('soft')
  const [deletionId, setDeletionId] = useState<string>('')

  // Mutations
  const requestDeletionMutation = useRequestAccountDeletion()
  const confirmDeletionMutation = useConfirmAccountDeletion()
  const cancelDeletionMutation = useCancelAccountDeletion()
  const exportDataMutation = useExportAccountData()

  // Queries
  const { data: deletionStatus } = useAccountDeletionStatus(deletionId)

  const handleExportData = async (format: 'pdf' | 'excel' | 'json') => {
    try {
      const response = await exportDataMutation.mutateAsync({
        format,
        send_to_email: false,
      })

      // Criar download
      const url = window.URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `account-data.${format === 'json' ? 'json' : format === 'excel' ? 'xlsx' : 'pdf'}`
      link.click()

      toast.success(`Dados exportados em ${format.toUpperCase()}`)
    } catch (err) {
      console.error('Erro ao exportar:', err)
      toast.error('Erro ao exportar dados')
    }
  }

  const handleRequestDeletion = async () => {
    if (!password) {
      toast.error('Digite sua senha para confirmar')
      return
    }

    try {
      const response = await requestDeletionMutation.mutateAsync({
        deletion_type: deletionType,
        password,
        reason,
      })

      setDeletionId(response.deletion_id)
      setStep('confirm')
      toast.success('Solicitação de exclusão enviada. Verifique seu email.')
    } catch (err: any) {
      console.error('Erro ao solicitar exclusão:', err)
      toast.error(err.response?.data?.detail || 'Erro ao solicitar exclusão')
    }
  }

  const handleConfirmDeletion = async () => {
    if (!confirmationCode || confirmationCode.length !== 6) {
      toast.error('Digite o código de 6 dígitos')
      return
    }

    try {
      await confirmDeletionMutation.mutateAsync({
        deletion_id: deletionId,
        confirmation_code: confirmationCode,
      })

      setStep('status')
      toast.success('Exclusão de conta confirmada!')
    } catch (err: any) {
      console.error('Erro ao confirmar:', err)
      toast.error(err.response?.data?.detail || 'Código inválido')
    }
  }

  const handleCancelDeletion = async () => {
    if (!confirm('Deseja cancelar a exclusão da sua conta?')) return

    try {
      await cancelDeletionMutation.mutateAsync(deletionId)
      setStep('menu')
      setDeletionId('')
      setConfirmationCode('')
      toast.success('Exclusão de conta cancelada')
    } catch (err) {
      console.error('Erro ao cancelar:', err)
      toast.error('Erro ao cancelar exclusão')
    }
  }

  return (
    <div className='max-w-2xl mx-auto'>
      {/* Menu Principal */}
      {step === 'menu' && (
        <div className='space-y-4'>
          <div className='bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex gap-3'>
            <AlertCircle className='w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5' />
            <div>
              <h3 className='font-medium text-yellow-900 dark:text-yellow-200'>Atenção!</h3>
              <p className='text-sm text-yellow-800 dark:text-yellow-300 mt-1'>
                A exclusão de conta é permanente e todos os seus dados serão removidos
              </p>
            </div>
          </div>

          <div className='grid md:grid-cols-2 gap-4'>
            <button
              onClick={() => setStep('export')}
              className='p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
            >
              <Download className='w-6 h-6 text-blue-600 mb-2' />
              <h3 className='font-medium'>Exportar Dados</h3>
              <p className='text-sm text-gray-600 dark:text-gray-400 mt-1'>
                Baixe uma cópia de todos os seus dados
              </p>
            </button>

            <button
              onClick={() => setStep('request')}
              className='p-4 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors'
            >
              <Trash2 className='w-6 h-6 text-red-600 mb-2' />
              <h3 className='font-medium text-red-900 dark:text-red-200'>Deletar Conta</h3>
              <p className='text-sm text-red-700 dark:text-red-400 mt-1'>
                Solucitar exclusão permanente
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Exportar Dados */}
      {step === 'export' && (
        <div className='space-y-4'>
          <button
            onClick={() => setStep('menu')}
            className='text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4'
          >
            ← Voltar
          </button>

          <div className='bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4'>
            <h2 className='text-lg font-bold'>Exportar Dados da Conta</h2>
            <p className='text-gray-600 dark:text-gray-400'>
              Escolha o formato para baixar seus dados:
            </p>

            <div className='grid md:grid-cols-3 gap-3'>
              <button
                onClick={() => handleExportData('pdf')}
                disabled={exportDataMutation.isPending}
                className='p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50'
              >
                <Download className='w-5 h-5 mx-auto mb-2' />
                <span className='font-medium block'>PDF</span>
                <span className='text-xs text-gray-600 dark:text-gray-400'>
                  Relatório formatado
                </span>
              </button>

              <button
                onClick={() => handleExportData('excel')}
                disabled={exportDataMutation.isPending}
                className='p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50'
              >
                <Download className='w-5 h-5 mx-auto mb-2' />
                <span className='font-medium block'>Excel</span>
                <span className='text-xs text-gray-600 dark:text-gray-400'>Planilhas</span>
              </button>

              <button
                onClick={() => handleExportData('json')}
                disabled={exportDataMutation.isPending}
                className='p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50'
              >
                <Download className='w-5 h-5 mx-auto mb-2' />
                <span className='font-medium block'>JSON</span>
                <span className='text-xs text-gray-600 dark:text-gray-400'>Dados brutos</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Solicitar Exclusão */}
      {step === 'request' && (
        <div className='space-y-4'>
          <button
            onClick={() => setStep('menu')}
            className='text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4'
          >
            ← Voltar
          </button>

          <div className='bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3'>
            <AlertCircle className='w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5' />
            <div>
              <h3 className='font-medium text-red-900 dark:text-red-200'>Ação Irreversível!</h3>
              <p className='text-sm text-red-800 dark:text-red-300 mt-1'>
                Uma vez confirmada, sua conta e todos os dados serão deletados permanentemente
              </p>
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4'>
            <div>
              <label className='block text-sm font-medium mb-2'>Tipo de Exclusão</label>
              <select
                value={deletionType}
                onChange={e => setDeletionType(e.target.value as any)}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white'
              >
                <option value='soft'>Soft Delete (90 dias, pode recuperar)</option>
                <option value='hard'>Hard Delete (Imediato, irreversível)</option>
                <option value='scheduled'>Agendado (7 dias para confirmar)</option>
              </select>
              <p className='text-xs text-gray-600 dark:text-gray-400 mt-1'>
                {deletionType === 'soft' &&
                  'Sua conta será deativada por 90 dias, tempo durante o qual pode ser recuperada'}
                {deletionType === 'hard' &&
                  'Sua conta será deletada imediatamente, sem possibilidade de recuperação'}
                {deletionType === 'scheduled' &&
                  'Você terá 7 dias para confirmar a exclusão antes que seja efetiva'}
              </p>
            </div>

            <div>
              <label className='block text-sm font-medium mb-2'>Motivo (opcional)</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder='Nos conte por que está deixando a plataforma...'
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white'
                rows={3}
              />
            </div>

            <div>
              <label className='block text-sm font-medium mb-2'>Confirme sua senha</label>
              <input
                type='password'
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder='Digite sua senha'
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white'
              />
            </div>

            <button
              onClick={handleRequestDeletion}
              disabled={requestDeletionMutation.isPending}
              className='w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium'
            >
              {requestDeletionMutation.isPending ? 'Processando...' : 'Solicitar Exclusão'}
            </button>
          </div>
        </div>
      )}

      {/* Confirmar Exclusão */}
      {step === 'confirm' && (
        <div className='space-y-4'>
          <div className='bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex gap-3'>
            <Mail className='w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5' />
            <div>
              <h3 className='font-medium text-blue-900 dark:text-blue-200'>Verifique seu email</h3>
              <p className='text-sm text-blue-800 dark:text-blue-300 mt-1'>
                Enviamos um código de confirmação com 6 dígitos para seu email
              </p>
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4'>
            <div>
              <label className='block text-sm font-medium mb-2'>Código de Confirmação</label>
              <input
                type='text'
                value={confirmationCode}
                onChange={e => setConfirmationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder='000000'
                maxLength={6}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-center text-2xl tracking-widest font-mono'
              />
            </div>

            <button
              onClick={handleConfirmDeletion}
              disabled={confirmDeletionMutation.isPending}
              className='w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium'
            >
              {confirmDeletionMutation.isPending ? 'Confirmando...' : 'Confirmar Exclusão'}
            </button>

            <button
              onClick={handleCancelDeletion}
              disabled={cancelDeletionMutation.isPending}
              className='w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700'
            >
              Cancelar Exclusão
            </button>
          </div>
        </div>
      )}

      {/* Status */}
      {step === 'status' && deletionStatus && (
        <div className='space-y-4'>
          <div className='bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex gap-3'>
            <CheckCircle className='w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5' />
            <div>
              <h3 className='font-medium text-green-900 dark:text-green-200'>
                Exclusão Confirmada!
              </h3>
              <p className='text-sm text-green-800 dark:text-green-300 mt-1'>
                Sua conta está agendada para exclusão
              </p>
            </div>
          </div>

          <div className='bg-white dark:bg-gray-800 rounded-lg p-6 space-y-4'>
            <div className='space-y-2'>
              <p>
                <span className='font-medium'>Status:</span> {deletionStatus.status}
              </p>
              <p>
                <span className='font-medium'>Tipo:</span> {deletionStatus.deletion_type}
              </p>
              <p>
                <span className='font-medium'>Data da Solicitação:</span>{' '}
                {new Date(deletionStatus.requested_at).toLocaleDateString('pt-BR')}
              </p>
              {deletionStatus.scheduled_deletion_date && (
                <p>
                  <span className='font-medium'>Data Programada:</span>{' '}
                  {new Date(deletionStatus.scheduled_deletion_date).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              className='w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600'
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
