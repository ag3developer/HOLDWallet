/**
 * 🔄 Update Notification Component
 * =================================
 *
 * Mostra uma notificação quando há uma nova versão disponível.
 * Usado pelo usePWAUpdate hook.
 */

import { RefreshCw } from 'lucide-react'

interface UpdateNotificationProps {
  onUpdate: () => void
}

export const UpdateNotification = ({ onUpdate }: UpdateNotificationProps) => {
  return (
    <div className='fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-[9999] animate-in slide-in-from-bottom duration-300'>
      <div className='bg-blue-600 text-white rounded-xl shadow-2xl p-4'>
        <div className='flex items-start gap-3'>
          <div className='p-2 bg-white/20 rounded-lg'>
            <RefreshCw className='w-5 h-5' />
          </div>
          <div className='flex-1'>
            <h4 className='font-semibold text-sm'>Nova versão disponível!</h4>
            <p className='text-xs text-blue-100 mt-1'>Atualize para obter as últimas melhorias.</p>
          </div>
        </div>
        <button
          onClick={onUpdate}
          className='w-full mt-3 px-4 py-2.5 bg-white text-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-50 transition-colors active:scale-95'
        >
          Atualizar agora
        </button>
      </div>
    </div>
  )
}

export default UpdateNotification
