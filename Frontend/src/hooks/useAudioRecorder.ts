/**
 * 🎙️ useAudioRecorder Hook
 * Hook para gravar áudio do microfone e fazer playback
 */

import { useCallback, useRef, useState } from 'react'

export interface AudioRecorderState {
  isRecording: boolean
  recordedChunks: Blob[]
  audioBlob: Blob | null
}

export interface UseAudioRecorderResult {
  isRecording: boolean
  recordedAudio: Blob | null
  recordingTime: number
  startRecording: () => Promise<void>
  stopRecording: () => Promise<Blob | null>
  playRecording: () => Promise<void>
  sendRecording: (onSend: (audio: Blob) => void) => void
  clearRecording: () => void
}

export function useAudioRecorder(): UseAudioRecorderResult {
  const [isRecording, setIsRecording] = useState(false)
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Inicia gravação de áudio
   */
  const startRecording = useCallback(async () => {
    try {
      // Solicitar permissão de microfone
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      streamRef.current = stream

      // Criar MediaRecorder
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      audioChunksRef.current = []

      // Quando dados de áudio chegam
      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      // Quando gravação para
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        setRecordedAudio(audioBlob)
        console.log('🎙️ Áudio gravado:', audioBlob.size, 'bytes')
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Timer para mostrar tempo de gravação
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

      console.log('🎙️ Iniciando gravação de áudio...')
    } catch (error) {
      console.error('❌ Erro ao iniciar gravação:', error)
      alert('❌ Não foi possível acessar o microfone. Verifique as permissões.')
    }
  }, [])

  /**
   * Para gravação de áudio
   */
  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise(resolve => {
      if (!mediaRecorderRef.current || !streamRef.current) {
        resolve(null)
        return
      }

      const mediaRecorder = mediaRecorderRef.current

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' })
        setRecordedAudio(audioBlob)

        // Parar stream
        const tracks = streamRef.current?.getTracks() ?? []
        tracks.forEach(track => track.stop())

        setIsRecording(false)

        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current)
        }

        console.log('🎙️ Gravação parada. Áudio:', audioBlob.size, 'bytes')
        resolve(audioBlob)
      }

      mediaRecorder.stop()
    })
  }, [])

  /**
   * Reproduz o áudio gravado
   */
  const playRecording = useCallback(async () => {
    if (!recordedAudio) {
      console.warn('⚠️ Nenhum áudio gravado para reproduzir')
      return
    }

    try {
      // Criar elemento de áudio temporário
      const audioUrl = URL.createObjectURL(recordedAudio)

      audioElementRef.current ??= new Audio()

      audioElementRef.current.src = audioUrl

      // Usar promise para capturar erros de play()
      await audioElementRef.current.play()

      console.log('🔊 Reproduzindo áudio gravado...')

      // Limpar URL quando terminar
      audioElementRef.current.onended = () => {
        URL.revokeObjectURL(audioUrl)
        console.log('🔊 Áudio terminado')
      }
    } catch (error) {
      // Ignorar AbortError - ocorre quando o elemento é removido durante play()
      if (error instanceof Error && error.name === 'AbortError') {
        console.debug('[AudioRecorder] Play interrupted - element removed from DOM')
      } else {
        console.error('❌ Erro ao reproduzir áudio:', error)
      }
    }
  }, [recordedAudio])

  /**
   * Envia o áudio gravado
   */
  const sendRecording = useCallback(
    (onSend: (audio: Blob) => void) => {
      if (!recordedAudio) {
        console.warn('⚠️ Nenhum áudio para enviar')
        return
      }

      console.log('📤 Enviando áudio:', recordedAudio.size, 'bytes')
      onSend(recordedAudio)

      // Limpar após enviar
      setRecordedAudio(null)
      audioChunksRef.current = []
    },
    [recordedAudio]
  )

  /**
   * Limpa a gravação
   */
  const clearRecording = useCallback(() => {
    setRecordedAudio(null)
    audioChunksRef.current = []
    setRecordingTime(0)
    console.log('🗑️ Gravação limpa')
  }, [])

  return {
    isRecording,
    recordedAudio,
    recordingTime,
    startRecording,
    stopRecording,
    playRecording,
    sendRecording,
    clearRecording,
  }
}
