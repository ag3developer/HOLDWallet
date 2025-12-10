/**
 * 🎙️ Audio Recorder Panel Component
 * Painel para gravar, ouvir e enviar áudio durante chamada
 */

import { useAudioRecorder } from '@/hooks/useAudioRecorder'
import { Mic, Square, Play, Send, Trash2 } from 'lucide-react'

export interface AudioRecorderPanelProps {
  readonly onAudioSend?: (audio: Blob) => void
}

export function AudioRecorderPanel({ onAudioSend }: AudioRecorderPanelProps) {
  const { isRecording, recordedAudio, recordingTime, startRecording, stopRecording, playRecording, sendRecording, clearRecording } = useAudioRecorder()

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const handleStartRecording = async () => {
    await startRecording()
  }

  const handleStopRecording = async () => {
    await stopRecording()
  }

  const handleSendAudio = () => {
    if (onAudioSend) {
      sendRecording(onAudioSend)
    }
  }

  return (
    <div className='bg-gray-800 border-t border-gray-700 p-4 space-y-3'>
      {/* Status */}
      <div className='text-xs text-gray-400 text-center'>
        {isRecording ? (
          <span className='text-red-400 font-semibold'>🔴 Gravando... {formatTime(recordingTime)}</span>
        ) : recordedAudio ? (
          <span className='text-green-400 font-semibold'>✅ Áudio gravado ({(recordedAudio.size / 1024).toFixed(1)} KB)</span>
        ) : (
          <span>🎙️ Nenhum áudio gravado</span>
        )}
      </div>

      {/* Controles */}
      <div className='flex gap-2 justify-center flex-wrap'>
        {!isRecording ? (
          <button
            onClick={handleStartRecording}
            className='flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors font-semibold'
            title='Iniciar gravação'
          >
            <Mic className='w-5 h-5' />
            Gravar
          </button>
        ) : (
          <button
            onClick={handleStopRecording}
            className='flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors font-semibold'
            title='Parar gravação'
          >
            <Square className='w-5 h-5' />
            Parar
          </button>
        )}

        {recordedAudio && (
          <>
            <button
              onClick={playRecording}
              className='flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors font-semibold'
              title='Ouvir áudio gravado'
            >
              <Play className='w-5 h-5' />
              Ouvir
            </button>

            <button
              onClick={handleSendAudio}
              className='flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors font-semibold'
              title='Enviar áudio'
            >
              <Send className='w-5 h-5' />
              Enviar
            </button>

            <button
              onClick={clearRecording}
              className='flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors'
              title='Limpar gravação'
            >
              <Trash2 className='w-5 h-5' />
            </button>
          </>
        )}
      </div>

      {/* Info */}
      <div className='text-xs text-gray-500 text-center italic'>
        {isRecording
          ? 'Seu áudio está sendo gravado...'
          : recordedAudio
            ? 'Clique em "Ouvir" para reproduzir seu áudio ou "Enviar" para enviar para o contato'
            : 'Clique em "Gravar" para iniciar a gravação de áudio'}
      </div>
    </div>
  )
}

export default AudioRecorderPanel
