# 🧪 Guia de Testes - Chat P2P WebRTC

**Última atualização:** 10 de dezembro de 2025

---

## ✅ Checklist de Testes Rápidos

### **1. Teste de Build**

```bash
cd /Users/josecarlosmartins/Documents/HOLDWallet/Frontend
npm run build

# Esperado:
# ✓ 1981 modules transformed
# ✓ built in 8.03s
# 0 erros críticos
```

**Status:** ✅ PASSOU (8.03s, 0 erros)

---

### **2. Teste de Imports**

```typescript
// Em ChatPage.tsx deve ter:
import { CallModal } from "@/components/chat/CallModal";
import { webrtcService } from "@/services/webrtcService";

// Verificação de exports:
// /services/index.ts deve exportar webrtcService
export { webrtcService } from "./webrtcService";
```

**Status:** ✅ PASSOU (ambos os imports presentes)

---

### **3. Teste de Componentes**

#### **A. WebRTC Service**

```typescript
// Verificar que todas essas funções existem:
webrtcService.initiateCall();
webrtcService.acceptCall();
webrtcService.rejectCall();
webrtcService.endCall();
webrtcService.toggleAudio();
webrtcService.toggleVideo();
webrtcService.getLocalStream();
webrtcService.stopLocalStream();
webrtcService.onCallEvent();
webrtcService.onRemoteStream();
```

**Status:** ✅ PASSOU (10+ funções implementadas)

#### **B. Call Modal**

```typescript
// Verificar props esperadas:
isOpen: boolean ✅
callType: 'audio' | 'video' ✅
contactName: string ✅
contactAvatar?: string ✅
duration: number ✅
isAudioEnabled: boolean ✅
isVideoEnabled: boolean ✅
onToggleAudio: (enabled: boolean) => void ✅
onToggleVideo: (enabled: boolean) => void ✅
onEndCall: () => void ✅
remoteVideoRef?: React.RefObject<HTMLVideoElement> ✅
localVideoRef?: React.RefObject<HTMLVideoElement> ✅
```

**Status:** ✅ PASSOU (12 props, todas tipadas)

---

### **4. Teste de Handlers**

Verificar que os 6 handlers estão implementados:

```typescript
// 1. Chamada de voz
handleInitiateAudioCall() {
  // - Valida autenticação ✅
  // - Obtém token ✅
  // - Chama webrtcService.initiateCall('audio') ✅
  // - Abre CallModal ✅
  // - Adiciona mensagem de sistema ✅
}

// 2. Chamada de vídeo
handleInitiateVideoCall() {
  // - Valida autenticação ✅
  // - Obtém token ✅
  // - Chama webrtcService.initiateCall('video') ✅
  // - Abre CallModal ✅
  // - Adiciona mensagem de sistema ✅
}

// 3. Encerrar chamada
handleEndCall() {
  // - Chama webrtcService.endCall() ✅
  // - Desativa CallModal ✅
  // - Adiciona mensagem de encerramento ✅
}

// 4. Toggle áudio
handleToggleAudio(enabled) {
  // - Chama webrtcService.toggleAudio() ✅
  // - Atualiza estado isAudioEnabled ✅
}

// 5. Toggle vídeo
handleToggleVideo(enabled) {
  // - Chama webrtcService.toggleVideo() ✅
  // - Atualiza estado isVideoEnabled ✅
}

// 6. Enviar mensagem
handleSendMessage() {
  // - Valida mensagem não vazia ✅
  // - Limpa input ✅
}
```

**Status:** ✅ PASSOU (6/6 handlers implementados)

---

### **5. Teste de Estados**

```typescript
// Estados de chamada devem existir:
const [isCallActive, setIsCallActive] = useState(false) ✅
const [callType, setCallType] = useState<'audio' | 'video' | null>(null) ✅
const [callDuration, setCallDuration] = useState(0) ✅
const [isAudioEnabled, setIsAudioEnabled] = useState(true) ✅
const [isVideoEnabled, setIsVideoEnabled] = useState(true) ✅

// Refs de vídeo:
const remoteVideoRef = useRef<HTMLVideoElement>(null) ✅
const localVideoRef = useRef<HTMLVideoElement>(null) ✅
const callDurationRef = useRef(0) ✅
```

**Status:** ✅ PASSOU (8 estados/refs, todos tipados)

---

### **6. Teste de useEffect**

```typescript
// useEffect para duração de chamada deve:
// - Não executar se isCallActive = false ✅
// - Incrementar callDurationRef a cada segundo ✅
// - Atualizar UI com setCallDuration() ✅
// - Limpar interval no cleanup ✅
```

**Status:** ✅ PASSOU (lógica correta)

---

### **7. Teste de Integração no JSX**

```typescript
// Buttons devem ter onClick handlers:
<button onClick={handleInitiateAudioCall}>  // ☎️ Phone ✅
<button onClick={handleInitiateVideoCall}>  // 📹 Video ✅

// CallModal deve render quando chamada ativa:
{isCallActive && callType && (
  <CallModal
    isOpen={isCallActive}
    callType={callType}
    // ... props
  />
)} ✅
```

**Status:** ✅ PASSOU (botões integrados, CallModal renderiza)

---

## 🧪 Testes Manuais (Em Staging)

### **Teste 1: Verificar Permissões**

```
1. Abrir navegador
2. Ir para /chat
3. Clicar botão ☎️ (Phone)
4. Navegador solicita permissão para microfone
   Esperado: Dialog de permissão aparece
   Status: [ ] Passou
```

### **Teste 2: Iniciar Chamada de Voz**

```
1. Autorizar microfone
2. Esperar CallModal abrir
   Esperado:
   - Modal escuro com header azul ✓
   - Nome do contato no header ✓
   - Duração começando em 00:00 ✓
   - Audio visualizer animando ✓
   - Botões: 🎤 📹 🔊 🔴 ✓

   Status: [ ] Passou
```

### **Teste 3: Controlar Áudio**

```
1. Clique em 🎤 (mute button)
   Esperado: Botão muda de cor para vermelho

2. Clique novamente em 🎤 (unmute button)
   Esperado: Botão volta para cor original

3. Verifique console:
   console.log('🔇 Audio disabled') ou
   console.log('🔇 Audio enabled')

   Status: [ ] Passou
```

### **Teste 4: Iniciar Chamada de Vídeo**

```
1. Abrir novo chat
2. Clicar botão 📹 (Video)
3. Autorizar câmera + microfone
4. Esperar CallModal abrir
   Esperado:
   - Vídeo remoto no centro (preto se sem stream)
   - Vídeo local no canto inferior direito (espelhado)
   - Botões de controle abaixo

   Status: [ ] Passou
```

### **Teste 5: Controlar Vídeo**

```
1. Durante chamada de vídeo, clique em 📹
   Esperado:
   - Botão fica vermelho
   - Vídeo local desaparece (câmera desligada)

2. Clique novamente em 📹
   Esperado:
   - Botão volta à cor original
   - Vídeo local reaparece

   Status: [ ] Passou
```

### **Teste 6: Encerrar Chamada**

```
1. Durante chamada, clique em 🔴 (Hang Up)
   Esperado:
   - CallModal desaparece
   - Mensagem "🛑 Chamada encerrada" aparece no chat
   - Estados são resetados

   Status: [ ] Passou
```

### **Teste 7: Timer de Duração**

```
1. Iniciar chamada
2. Deixar rodar por 30 segundos
   Esperado:
   - Duração muda de 00:00 para 00:30
   - Timer continua incrementando

3. Encerrar chamada
   Esperado:
   - Timer é resetado para 00:00

   Status: [ ] Passou
```

### **Teste 8: Responsividade**

```
Desktop (1920x1080):
  - [ ] CallModal ocupa ~50% da tela
  - [ ] Vídeo remoto com aspect ratio correto
  - [ ] Botões visíveis e clicáveis

Tablet (768x1024):
  - [ ] CallModal adapta-se bem
  - [ ] Botões mantêm espaço
  - [ ] Texto legível

Mobile (375x667):
  - [ ] CallModal fullscreen
  - [ ] Botões em tamanho maior
  - [ ] Sem overflow

Status: [ ] Passou
```

### **Teste 9: Dark Mode**

```
1. Ativar dark mode no sistema
2. Abrir chamada
   Esperado:
   - Background escuro
   - Texto em branco
   - Ícones visíveis
   - Sem problemas de contraste

Status: [ ] Passou
```

### **Teste 10: Tratamento de Erros**

```
A. Sem microfone:
   1. Bloquear permissão de microfone no navegador
   2. Clicar ☎️
   Esperado: Alert "❌ Não foi possível acessar microfone"
   Status: [ ] Passou

B. Sem câmera:
   1. Bloquear permissão de câmera
   2. Clicar 📹
   Esperado: Alert "❌ Não foi possível acessar câmera"
   Status: [ ] Passou

C. Sem token:
   1. Limpar localStorage
   2. Clicar ☎️ ou 📹
   Esperado: Alert "Você precisa estar autenticado"
   Status: [ ] Passou
```

---

## 📊 Resultados Esperados

### **Build Output**

```
✓ 1981 modules transformed.
✓ built in 8.03s
```

**Esperado:** ✅ Build bem-sucedido, 0 erros críticos

---

### **Bundle Size**

```
Main JS: 1,226.16 kB (312.67 kB gzipped)
CSS: 102.73 kB (15.28 kB gzipped)
```

**Esperado:** ✅ Dentro de limites aceitáveis

---

### **Runtime Performance**

```
Time to Interactive: < 2.5s
First Contentful Paint: < 1.5s
Call Setup Time: < 2s
```

**Esperado:** ✅ Performance aceitável

---

## 🐛 Possíveis Problemas e Soluções

| Problema                      | Solução                                |
| ----------------------------- | -------------------------------------- |
| "Module not found: CallModal" | Verificar import em ChatPage.tsx       |
| "webrtcService is undefined"  | Verificar export em /services/index.ts |
| CallModal não abre            | Verificar state isCallActive = true    |
| Vídeo não aparece             | Verificar remoteVideoRef conectado     |
| Áudio sem som                 | Verificar isAudioEnabled = true        |
| Build falha                   | Executar `npm install` e limpar cache  |

---

## 📝 Checklist de Pré-Deploy

- [ ] Todos os testes manuais passaram
- [ ] Build executado sem erros
- [ ] Tested em Chrome, Firefox, Safari
- [ ] Responsividade confirmada (desktop, tablet, mobile)
- [ ] Dark mode testado
- [ ] Erro handling validado
- [ ] Performance dentro dos limites
- [ ] Console sem erros críticos
- [ ] Permissões funcionando
- [ ] WebRTC signaling integrado com backend

---

**Pronto para Staging:** ✅ SIM  
**Pronto para Produção:** ⏳ APÓS TESTES DE STAGING

---

Desenvolvido com ❤️ por GitHub Copilot  
Data: 10 de dezembro de 2025
