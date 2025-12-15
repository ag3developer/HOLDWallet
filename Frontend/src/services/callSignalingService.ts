/**
 * 📞 Call Signaling Service
 * Serviço para trocar sinais de chamada (offer, answer, ICE candidates) via chat
 */

// ==================== INTERFACES ====================

export interface CallSignal {
  type: 'call_offer' | 'call_answer' | 'ice_candidate' | 'call_rejected' | 'call_ended'
  call_id: string
  sender_id: string
  receiver_id: string
  data: any
}

export interface OfferData {
  call_type: 'audio' | 'video'
  sdp: string
}

export interface AnswerData {
  sdp: string
}

export interface ICECandidateData {
  candidate: any
}

// ==================== CALL SIGNALING SERVICE ====================

class CallSignalingService {
  private readonly signalListeners: ((signal: CallSignal) => void)[] = []
  private readonly pendingOffers: Map<string, CallSignal> = new Map()

  /**
   * Enviar oferta de chamada via chat
   */
  async sendCallOffer(
    chatRoomId: string,
    callId: string,
    callType: 'audio' | 'video',
    sdp: string,
    receiverId: string
  ): Promise<void> {
    try {
      const signal: CallSignal = {
        type: 'call_offer',
        call_id: callId,
        sender_id: this.getCurrentUserId(),
        receiver_id: receiverId,
        data: {
          call_type: callType,
          sdp: sdp,
        } as OfferData,
      }

      console.log('📤 Sending call offer:', callId)

      // Salvar no histórico local para recuperação
      this.pendingOffers.set(callId, signal)

      // Enviar via chat como mensagem de sistema
      await this.sendSignalViaChat(chatRoomId, signal)
    } catch (error) {
      console.error('❌ Failed to send call offer:', error)
      throw error
    }
  }

  /**
   * Enviar resposta de chamada
   */
  async sendCallAnswer(
    chatRoomId: string,
    callId: string,
    sdp: string,
    receiverId: string
  ): Promise<void> {
    try {
      const signal: CallSignal = {
        type: 'call_answer',
        call_id: callId,
        sender_id: this.getCurrentUserId(),
        receiver_id: receiverId,
        data: {
          sdp: sdp,
        } as AnswerData,
      }

      console.log('📤 Sending call answer:', callId)
      await this.sendSignalViaChat(chatRoomId, signal)

      // Limpar oferta pendente
      this.pendingOffers.delete(callId)
    } catch (error) {
      console.error('❌ Failed to send call answer:', error)
      throw error
    }
  }

  /**
   * Enviar ICE candidate
   */
  async sendICECandidate(
    chatRoomId: string,
    callId: string,
    candidate: RTCIceCandidate,
    receiverId: string
  ): Promise<void> {
    try {
      const signal: CallSignal = {
        type: 'ice_candidate',
        call_id: callId,
        sender_id: this.getCurrentUserId(),
        receiver_id: receiverId,
        data: {
          candidate: {
            candidate: candidate.candidate,
            sdpMLineIndex: candidate.sdpMLineIndex,
            sdpMid: candidate.sdpMid,
          },
        } as ICECandidateData,
      }

      console.log('📤 Sending ICE candidate:', callId)
      await this.sendSignalViaChat(chatRoomId, signal)
    } catch (error) {
      console.error('❌ Failed to send ICE candidate:', error)
      // Não lançar erro para ICE candidates, pois alguns podem falhar
    }
  }

  /**
   * Enviar rejeição de chamada
   */
  async sendCallRejection(
    chatRoomId: string,
    callId: string,
    receiverId: string,
    reason?: string
  ): Promise<void> {
    try {
      const signal: CallSignal = {
        type: 'call_rejected',
        call_id: callId,
        sender_id: this.getCurrentUserId(),
        receiver_id: receiverId,
        data: {
          reason: reason || 'Chamada rejeitada pelo usuário',
        },
      }

      console.log('📤 Sending call rejection:', callId)
      await this.sendSignalViaChat(chatRoomId, signal)

      // Limpar oferta pendente
      this.pendingOffers.delete(callId)
    } catch (error) {
      console.error('❌ Failed to send call rejection:', error)
    }
  }

  /**
   * Enviar sinal de fim de chamada
   */
  async sendCallEnded(
    chatRoomId: string,
    callId: string,
    receiverId: string,
    duration: number
  ): Promise<void> {
    try {
      const signal: CallSignal = {
        type: 'call_ended',
        call_id: callId,
        sender_id: this.getCurrentUserId(),
        receiver_id: receiverId,
        data: {
          duration: duration,
          timestamp: new Date().toISOString(),
        },
      }

      console.log('📤 Sending call ended signal:', callId)
      await this.sendSignalViaChat(chatRoomId, signal)

      // Limpar dados da chamada
      this.pendingOffers.delete(callId)
    } catch (error) {
      console.error('❌ Failed to send call ended signal:', error)
    }
  }

  /**
   * Registrar listener para sinais de chamada
   */
  onSignal(callback: (signal: CallSignal) => void): () => void {
    this.signalListeners.push(callback)
    return () => {
      const index = this.signalListeners.indexOf(callback)
      if (index > -1) this.signalListeners.splice(index, 1)
    }
  }

  /**
   * Notificar listeners sobre novo sinal
   */
  private notifySignal(signal: CallSignal): void {
    this.signalListeners.forEach(listener => listener(signal))
  }

  /**
   * Enviar sinal via chat
   * Encapsula o sinal em uma mensagem de sistema do chat
   */
  private async sendSignalViaChat(chatRoomId: string, signal: CallSignal): Promise<void> {
    try {
      // Criar mensagem de sistema com o sinal codificado
      console.log('📤 Sending via chat:', signal.type)

      // Aqui seria enviado via API do chat
      // await apiClient.post(`/chat/rooms/${chatRoomId}/system-message`, {
      //   content: JSON.stringify(messageContent),
      //   message_type: 'system'
      // })

      console.log('✅ Signal sent via chat:', signal.type)

      // Simular resposta imediata para desenvolvimento
      // Em produção, o backend receberá e encaminhará para o outro usuário
    } catch (error) {
      console.error('❌ Failed to send signal via chat:', error)
      throw error
    }
  }

  /**
   * Processar sinal recebido
   * Chamado quando uma mensagem de sistema de chamada é recebida
   */
  processReceivedSignal(signal: CallSignal): void {
    console.log('📥 Received signal:', signal.type, signal.call_id)
    this.notifySignal(signal)
  }

  /**
   * Obter ofertas pendentes de um call_id específico
   */
  getPendingOffer(callId: string): CallSignal | undefined {
    return this.pendingOffers.get(callId)
  }

  /**
   * Limpar todos os sinais pendentes
   */
  clearPendingSignals(): void {
    this.pendingOffers.clear()
    console.log('🧹 Cleared pending call signals')
  }

  // ==================== UTILITY ====================

  /**
   * Obter ID do usuário atual
   */
  private getCurrentUserId(): string {
    // Obter do localStorage ou do contexto de autenticação
    return localStorage.getItem('user_id') || 'anonymous'
  }
}

export const callSignalingService = new CallSignalingService()
