/**
 * 🧪 CallModal Test Component
 * Componente para testar se CallModal abre corretamente
 */

import { useState } from 'react'
import { CallModal } from './CallModal'

export function CallModalTest() {
  const [isOpen, setIsOpen] = useState(false)
  const [callType, setCallType] = useState<'audio' | 'video'>('audio')
  const [duration, setDuration] = useState(0)
  const [isAudioEnabled, setIsAudioEnabled] = useState(true)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)

  const handleStartAudioCall = () => {
    console.log('✅ TEST: Abrindo modal de áudio')
    setCallType('audio')
    setIsOpen(true)
    setDuration(0)
  }

  const handleStartVideoCall = () => {
    console.log('✅ TEST: Abrindo modal de vídeo')
    setCallType('video')
    setIsOpen(true)
    setDuration(0)
  }

  const handleEndCall = () => {
    console.log('✅ TEST: Fechando modal')
    setIsOpen(false)
  }

  return (
    <div className='p-8 max-w-md mx-auto'>
      <h1 className='text-2xl font-bold mb-6'>🧪 CallModal Test</h1>

      <div className='space-y-4'>
        <button
          onClick={handleStartAudioCall}
          className='w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors'
        >
          ☎️ Abrir Modal de Áudio
        </button>

        <button
          onClick={handleStartVideoCall}
          className='w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors'
        >
          📹 Abrir Modal de Vídeo
        </button>

        <div className='border-t pt-4 mt-4'>
          <p className='text-sm text-gray-600'>
            <strong>Estado atual:</strong>
            <br />
            isOpen: {isOpen ? '✅ true' : '❌ false'}
            <br />
            callType: {callType}
            <br />
            duration: {duration}
          </p>
        </div>
      </div>

      {/* Test CallModal */}
      <CallModal
        isOpen={isOpen}
        callType={callType}
        contactName='João Silva (TEST)'
        contactAvatar='https://api.dicebear.com/7.x/avataaars/svg?seed=test'
        duration={duration}
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        onToggleAudio={enabled => {
          console.log('🔊 Audio toggled:', enabled)
          setIsAudioEnabled(enabled)
        }}
        onToggleVideo={enabled => {
          console.log('📹 Video toggled:', enabled)
          setIsVideoEnabled(enabled)
        }}
        onEndCall={handleEndCall}
      />

      {/* Debug Info */}
      <div className='mt-8 p-4 bg-gray-100 rounded-lg text-xs font-mono text-gray-800'>
        <p>
          🔍 <strong>Debug Console:</strong>
        </p>
        <p>Abra DevTools (F12) e vá para a aba Console</p>
        <p>Você verá logs quando clicar nos botões acima</p>
      </div>
    </div>
  )
}
