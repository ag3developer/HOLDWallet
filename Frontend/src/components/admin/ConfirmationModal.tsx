/**
 * 🔔 Confirmation Modal Component
 * ================================
 *
 * Modal customizado e bonito para confirmações de ações críticas.
 * Suporta dois tipos: warning (amarelo) e danger (vermelho).
 */

import React from 'react'
import { X, AlertTriangle, AlertCircle } from 'lucide-react'

interface ConfirmationModalProps {
  isOpen: boolean
  title: string
  message: string
  description?: string
  type?: 'warning' | 'danger'
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  description,
  type = 'warning',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null

  const isDanger = type === 'danger'
  const bgColor = isDanger ? 'bg-red-50 dark:bg-red-950/20' : 'bg-yellow-50 dark:bg-yellow-950/20'
  const borderColor = isDanger
    ? 'border-red-200 dark:border-red-800'
    : 'border-yellow-200 dark:border-yellow-800'
  const iconColor = isDanger
    ? 'text-red-600 dark:text-red-400'
    : 'text-yellow-600 dark:text-yellow-400'
  const buttonColor = isDanger
    ? 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800'
    : 'bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-800'

  return (
    <div className='fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50'>
      {/* Modal */}
      <div className='bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden'>
        {/* Header */}
        <div
          className={`${bgColor} ${borderColor} border-b px-6 py-4 flex items-start justify-between`}
        >
          <div className='flex items-start gap-3 flex-1'>
            {isDanger ? (
              <AlertTriangle className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
            ) : (
              <AlertCircle className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
            )}
            <div>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-white'>{title}</h2>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className='text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50'
          >
            <X className='w-5 h-5' />
          </button>
        </div>

        {/* Content */}
        <div className='px-6 py-4'>
          <p className='text-gray-900 dark:text-gray-100 text-base font-medium mb-2'>{message}</p>
          {description && <p className='text-gray-600 dark:text-gray-400 text-sm'>{description}</p>}
        </div>

        {/* Footer */}
        <div className='bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex gap-3 justify-end'>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className='px-4 py-2 rounded-lg text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium'
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg text-white ${buttonColor} disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2`}
          >
            {isLoading && (
              <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
