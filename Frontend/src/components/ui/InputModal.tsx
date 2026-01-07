import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, XCircle, MessageSquare } from 'lucide-react'

interface InputModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (value: string) => void
  title: string
  message: string
  inputLabel?: string
  inputPlaceholder?: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info'
  icon?: React.ReactNode
  isLoading?: boolean
  required?: boolean
  multiline?: boolean
}

export const InputModal: React.FC<InputModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  inputLabel = 'Motivo',
  inputPlaceholder = 'Digite aqui...',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning',
  icon,
  isLoading = false,
  required = false,
  multiline = false,
}) => {
  const [inputValue, setInputValue] = useState('')

  // Reset input when modal opens
  useEffect(() => {
    if (isOpen) {
      setInputValue('')
    }
  }, [isOpen])

  const typeConfig = {
    danger: {
      bgColor: 'bg-red-100 dark:bg-red-900/20',
      iconColor: 'text-red-600 dark:text-red-400',
      buttonColor: 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white',
      borderColor: 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500',
      defaultIcon: <XCircle className='w-6 h-6' />,
    },
    warning: {
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      buttonColor:
        'bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white',
      borderColor:
        'border-yellow-300 dark:border-yellow-700 focus:border-yellow-500 focus:ring-yellow-500',
      defaultIcon: <AlertTriangle className='w-6 h-6' />,
    },
    info: {
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
      buttonColor:
        'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white',
      borderColor: 'border-blue-300 dark:border-blue-700 focus:border-blue-500 focus:ring-blue-500',
      defaultIcon: <MessageSquare className='w-6 h-6' />,
    },
  }

  const config = typeConfig[type]

  const handleConfirm = () => {
    if (required && !inputValue.trim()) {
      return
    }
    onConfirm(inputValue.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !multiline) {
      e.preventDefault()
      handleConfirm()
    }
    if (e.key === 'Escape') {
      onClose()
    }
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
                  className={`w-16 h-16 rounded-full flex items-center justify-center ${config.bgColor}`}
                >
                  <div className={config.iconColor}>{icon || config.defaultIcon}</div>
                </div>
              </div>

              {/* Message */}
              <p className='text-center text-gray-600 dark:text-gray-300 mb-6'>{message}</p>

              {/* Input */}
              <div className='space-y-2'>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300'>
                  {inputLabel}
                  {required && <span className='text-red-500 ml-1'>*</span>}
                </label>
                {multiline ? (
                  <textarea
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={inputPlaceholder}
                    rows={4}
                    disabled={isLoading}
                    className={`w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-gray-700 
                      text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                      focus:outline-none focus:ring-2 transition-all resize-none
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${config.borderColor}`}
                    autoFocus
                  />
                ) : (
                  <input
                    type='text'
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={inputPlaceholder}
                    disabled={isLoading}
                    className={`w-full px-4 py-3 rounded-xl border bg-gray-50 dark:bg-gray-700 
                      text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                      focus:outline-none focus:ring-2 transition-all
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${config.borderColor}`}
                    autoFocus
                  />
                )}
              </div>
            </div>

            {/* Footer */}
            <div className='flex gap-3 p-6 pt-0'>
              <button
                onClick={onClose}
                disabled={isLoading}
                className='flex-1 py-3 px-4 rounded-xl font-medium text-gray-700 dark:text-gray-300 
                  bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {cancelText}
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading || (required && !inputValue.trim())}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-colors 
                  disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2
                  ${config.buttonColor}`}
              >
                {isLoading ? (
                  <>
                    <svg className='animate-spin h-5 w-5' viewBox='0 0 24 24'>
                      <circle
                        className='opacity-25'
                        cx='12'
                        cy='12'
                        r='10'
                        stroke='currentColor'
                        strokeWidth='4'
                        fill='none'
                      />
                      <path
                        className='opacity-75'
                        fill='currentColor'
                        d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                      />
                    </svg>
                    Processando...
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

export default InputModal
