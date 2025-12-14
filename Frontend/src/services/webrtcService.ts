/**
 * 📞 Wolknow - WebRTC Service
 * ================================
 * Serviço para gerenciar chamadas de voz e vídeo P2P usando WebRTC
 */

// ==================== INTERFACES ====================

export interface CallOffer {
  type: 'call_offer'
  call_id: string
  caller_id: string
  caller_name: string
  call_type: 'audio' | 'video'
  sdp: string
}

export interface CallAnswer {
  type: 'call_answer'
  call_id: string
  answerer_id: string
  sdp: string
}

export interface ICECandidate {
  type: 'ice_candidate'
  call_id: string
  candidate: RTCIceCandidate
}

export interface CallEvent {
  type: 'call_incoming' | 'call_accepted' | 'call_rejected' | 'call_ended'
  call_id: string
  caller_id?: string
  caller_name?: string
  call_type?: 'audio' | 'video'
}

interface PeerConnection {
  pc: globalThis.RTCPeerConnection
  dataChannel?: RTCDataChannel
}

// ==================== WEBRTC SERVICE ====================

class WebRTCService {
  private readonly peers: Map<string, PeerConnection> = new Map()
  private localStream: MediaStream | null = null
  private readonly callListeners: ((event: CallEvent) => void)[] = []
  private readonly streamListeners: Map<string, ((stream: MediaStream) => void)[]> = new Map()
  private readonly config: RTCConfiguration = {
    iceServers: [
      { urls: ['stun:stun.l.google.com:19302'] },
      { urls: ['stun:stun1.l.google.com:19302'] },
      { urls: ['stun:stun2.l.google.com:19302'] },
      { urls: ['stun:stun3.l.google.com:19302'] },
      { urls: ['stun:stun4.l.google.com:19302'] },
    ],
  }

  private currentCallId: string | null = null
  private currentCallType: 'audio' | 'video' | null = null
  private isCallActive = false

  // ==================== MEDIA SETUP ====================

  /**
   * Obter stream de áudio/vídeo local
   */
  async getLocalStream(constraints: MediaStreamConstraints): Promise<MediaStream> {
    try {
      console.log('📹 Requesting media access:', constraints)
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints)
      console.log('✅ Local stream obtained')
      return this.localStream
    } catch (error) {
      console.error('❌ Failed to get local stream:', error)
      throw new Error('Não foi possível acessar câmera/microfone. Verifique as permissões.')
    }
  }

  /**
   * Parar de usar stream local
   */
  stopLocalStream(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
      console.log('⏹️ Local stream stopped')
    }
  }

  /**
   * Obter stream local
   */
  getLocalStreamTracks(): MediaStream | null {
    return this.localStream
  }

  // ==================== PEER CONNECTION ====================

  /**
   * Criar conexão peer para chamada
   */
  private createPeerConnection(peerId: string): globalThis.RTCPeerConnection {
    console.log(`🔧 Creating peer connection for ${peerId}`)

    const pc = new globalThis.RTCPeerConnection(this.config)

    // Adicionar tracks do stream local
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!)
      })
    }

    // Handle ICE candidates
    pc.onicecandidate = event => {
      if (event.candidate) {
        this.sendICECandidate(peerId, event.candidate)
      }
    }

    // Handle remote stream
    pc.ontrack = event => {
      console.log('🎥 Received remote track:', event.track.kind)
      if (event.streams[0]) {
        this.notifyStream(peerId, event.streams[0])
      }
    }

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`🔗 Connection state (${peerId}):`, pc.connectionState)

      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        this.endCall(peerId).catch(console.error)
      }
    }

    // Handle ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log(`❄️ ICE connection state (${peerId}):`, pc.iceConnectionState)
    }

    this.peers.set(peerId, { pc })
    return pc
  }

  // ==================== CALL SETUP ====================

  /**
   * Iniciar chamada de voz/vídeo
   */
  async initiateCall(
    peerId: string,
    callType: 'audio' | 'video',
    callId: string,
    callerName: string
  ): Promise<void> {
    try {
      console.log(`📞 Initiating ${callType} call to ${peerId}`)

      // Obter stream de mídia
      const constraints = {
        audio: true,
        video: callType === 'video' ? { width: { max: 1280 }, height: { max: 720 } } : false,
      }

      await this.getLocalStream(constraints)
      this.currentCallId = callId
      this.currentCallType = callType

      // Criar conexão peer
      const pc = this.createPeerConnection(peerId)

      // Criar oferta
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: callType === 'video',
      })

      await pc.setLocalDescription(offer)

      // Enviar oferta via chat
      const callOffer: CallOffer = {
        type: 'call_offer',
        call_id: callId,
        caller_id: this.getCurrentUserId(),
        caller_name: callerName,
        call_type: callType,
        sdp: offer.sdp || '',
      }

      await this.sendCallSignal(peerId, callOffer)
      console.log('✅ Call offer sent')
    } catch (error) {
      console.error('❌ Failed to initiate call:', error)
      this.endCall(peerId)
      throw error
    }
  }

  /**
   * Aceitar chamada recebida
   */
  async acceptCall(peerId: string, offer: CallOffer): Promise<void> {
    try {
      console.log(`✅ Accepting ${offer.call_type} call from ${peerId}`)

      this.currentCallId = offer.call_id
      this.currentCallType = offer.call_type

      // Obter stream de mídia
      const constraints = {
        audio: true,
        video: offer.call_type === 'video' ? { width: { max: 1280 }, height: { max: 720 } } : false,
      }

      await this.getLocalStream(constraints)

      // Criar conexão peer
      const pc = this.createPeerConnection(peerId)

      // Definir descrição remota
      const remoteDescription = new RTCSessionDescription({
        type: 'offer',
        sdp: offer.sdp,
      })
      await pc.setRemoteDescription(remoteDescription)

      // Criar resposta
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      // Enviar resposta
      const callAnswer: CallAnswer = {
        type: 'call_answer',
        call_id: offer.call_id,
        answerer_id: this.getCurrentUserId(),
        sdp: answer.sdp || '',
      }

      await this.sendCallSignal(peerId, callAnswer)
      console.log('✅ Call answer sent')

      this.isCallActive = true
    } catch (error) {
      console.error('❌ Failed to accept call:', error)
      throw error
    }
  }

  /**
   * Rejeitar chamada
   */
  async rejectCall(peerId: string, callId: string): Promise<void> {
    console.log(`❌ Rejecting call from ${peerId}`)
    await this.sendCallSignal(peerId, {
      type: 'call_rejected',
      call_id: callId,
    })
    this.endCall(peerId)
  }

  /**
   * Processar resposta de chamada
   */
  async handleCallAnswer(peerId: string, answer: CallAnswer): Promise<void> {
    try {
      const peerConnection = this.peers.get(peerId)
      if (!peerConnection) {
        throw new Error(`Peer connection not found for ${peerId}`)
      }

      const remoteDescription = new RTCSessionDescription({
        type: 'answer',
        sdp: answer.sdp,
      })

      await peerConnection.pc.setRemoteDescription(remoteDescription)
      this.isCallActive = true
      console.log('✅ Call answer processed')
    } catch (error) {
      console.error('❌ Failed to handle call answer:', error)
      throw error
    }
  }

  /**
   * Processar ICE candidate
   */
  async handleICECandidate(peerId: string, candidate: RTCIceCandidate): Promise<void> {
    try {
      const peerConnection = this.peers.get(peerId)
      if (!peerConnection) {
        console.warn(`Peer connection not found for ${peerId}`)
        return
      }

      await peerConnection.pc.addIceCandidate(candidate)
    } catch (error) {
      console.error('❌ Failed to add ICE candidate:', error)
    }
  }

  // ==================== CALL MANAGEMENT ====================

  /**
   * Encerrar chamada
   */
  async endCall(peerId: string): Promise<void> {
    console.log(`🛑 Ending call with ${peerId}`)

    const peerConnection = this.peers.get(peerId)
    if (peerConnection) {
      peerConnection.pc.close()
      this.peers.delete(peerId)
    }

    this.isCallActive = false
    this.currentCallId = null
    this.currentCallType = null

    // Parar stream local
    this.stopLocalStream()

    // Notificar
    this.notifyCallEvent({
      type: 'call_ended',
      call_id: this.currentCallId ?? '',
    })

    console.log('✅ Call ended')
  }

  /**
   * Mutar/desmutar áudio
   */
  toggleAudio(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled
      })
      console.log(`🔇 Audio ${enabled ? 'enabled' : 'disabled'}`)
    }
  }

  /**
   * Ligar/desligar vídeo
   */
  toggleVideo(enabled: boolean): void {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled
      })
      console.log(`📹 Video ${enabled ? 'enabled' : 'disabled'}`)
    }
  }

  /**
   * Verificar se há chamada ativa
   */
  isCallInProgress(): boolean {
    return this.isCallActive
  }

  /**
   * Obter ID da chamada atual
   */
  getCurrentCallId(): string | null {
    return this.currentCallId
  }

  /**
   * Obter tipo de chamada atual
   */
  getCurrentCallType(): 'audio' | 'video' | null {
    return this.currentCallType
  }

  // ==================== SIGNALING ====================

  /**
   * Enviar sinal de chamada via chat
   */
  private async sendCallSignal(peerId: string, signal: unknown): Promise<void> {
    try {
      // Enviar via chat message (pode ser estendido para socket específico)
      console.log('📤 Sending call signal:', (signal as { type: string }).type)
      // Aqui você pode enviar via WebSocket do chat
    } catch (error) {
      console.error('❌ Failed to send call signal:', error)
    }
  }

  /**
   * Enviar ICE candidate
   */
  private sendICECandidate(peerId: string, candidate: RTCIceCandidate): void {
    try {
      const iceCandidate: ICECandidate = {
        type: 'ice_candidate',
        call_id: this.currentCallId ?? '',
        candidate: candidate,
      }

      void this.sendCallSignal(peerId, iceCandidate)
    } catch (error) {
      console.error('❌ Failed to send ICE candidate:', error)
    }
  }

  // ==================== EVENT LISTENERS ====================

  /**
   * Registrar listener para eventos de chamada
   */
  onCallEvent(callback: (event: CallEvent) => void): () => void {
    this.callListeners.push(callback)
    return () => {
      const index = this.callListeners.indexOf(callback)
      if (index > -1) this.callListeners.splice(index, 1)
    }
  }

  /**
   * Registrar listener para streams remotos
   */
  onRemoteStream(peerId: string, callback: (stream: MediaStream) => void): () => void {
    if (!this.streamListeners.has(peerId)) {
      this.streamListeners.set(peerId, [])
    }

    const listeners = this.streamListeners.get(peerId)!
    listeners.push(callback)

    return () => {
      const index = listeners.indexOf(callback)
      if (index > -1) listeners.splice(index, 1)
    }
  }

  private notifyCallEvent(event: CallEvent): void {
    this.callListeners.forEach(listener => listener(event))
  }

  private notifyStream(peerId: string, stream: MediaStream): void {
    const listeners = this.streamListeners.get(peerId) || []
    listeners.forEach(listener => listener(stream))
  }

  // ==================== UTILITY ====================

  /**
   * Obter ID do usuário atual (deve vir do auth service)
   */
  private getCurrentUserId(): string {
    // Implementar conforme necessário
    return localStorage.getItem('user_id') || 'unknown'
  }

  /**
   * Limpar recursos
   */
  cleanup(): void {
    this.peers.forEach((_, peerId) => {
      this.endCall(peerId)
    })
    this.stopLocalStream()
    this.peers.clear()
    this.streamListeners.clear()
  }
}

export const webrtcService = new WebRTCService()
