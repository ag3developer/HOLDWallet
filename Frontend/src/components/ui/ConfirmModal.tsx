import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, Trash2 } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  icon?: React.ReactNode
  isLoading?: boolean
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger',
  icon,
  isLoading = false,
}) => {
  const typeConfig = {
    danger: {
      bgColor: 'bg-red-100 dark:bg-red-900/20',
      iconColor: 'text-red-600 dark:text-red-400',
      buttonColor: 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white',
      defaultIcon: <Trash2 className='w-6 h-6' />,
    },
    warning: {
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      buttonColor:
        'bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white',
      defaultIcon: <AlertTriangle className='w-6 h-6' />,
    },
    info: {
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      buttonColor:
        'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white',
      defaultIcon: <AlertTriangle className='w-6 h-6' />,
    },
  }

  const config = typeConfig[type]

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className='absolute inset-0 bg-black/60 backdrop-blur-sm'
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className='relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden'
          >
            {/* Header */}
            <div className='flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700'>
              <h3 className='text-xl font-semibold text-gray-900 dark:text-white'>{title}</h3>
              <button
                onClick={onClose}
                disabled={isLoading}
                title='Fechar'
                aria-label='Fechar modal'
                className='p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <X className='w-5 h-5 text-gray-500 dark:text-gray-400' />
              </button>
            </div>

            {/* Body */}
            <div className='p-6'>
              {/* Icon */}
              <div className='flex justify-center mb-4'>
                <div
                  className={`${config.bgColor} ${config.iconColor} p-4 rounded-full animate-pulse`}
                >
                  {icon || config.defaultIcon}
                </div>
              </div>

              {/* Message */}
              <p className='text-center text-gray-700 dark:text-gray-300 text-base leading-relaxed'>
                {message}
              </p>
            </div>

            {/* Footer */}
            <div className='flex gap-3 p-6 bg-gray-50 dark:bg-gray-900/50'>
              <button
                onClick={onClose}
                disabled={isLoading}
                className='flex-1 px-6 py-3 rounded-xl font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className={`flex-1 px-6 py-3 rounded-xl font-medium ${config.buttonColor} transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
              >
                {isLoading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <div className='w-5 h-5 border-2 border-white border-t-transparent rounded-full' />
                    </motion.div>
                    <span>Processando...</span>
                  </>
                ) : (
                  confirmText
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
