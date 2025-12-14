# 🎥 Teste de Vídeo - Quick Guide

## ✅ O que foi corrigido

- ✅ Agora as refs corretas são passadas para o CallModal
- ✅ A câmera deve abrir quando você clica em 📹 (video call)
- ✅ O microfone também captura áudio
- ✅ Vídeo remoto (bot) é simulado com canvas

---

## 🎬 Como Testar Video Call

### Passo 1: Recarregue a página

```
F5 ou Cmd+R
```

### Passo 2: Abra o chat

```
http://localhost:5173
```

### Passo 3: Procure o bot

Na **sidebar**, procure por:

```
🤖 Bot Traders
└─ 🤖 Bot Trader (ou outro bot)
```

### Passo 4: Clique no botão 📹 (video)

```
Header do chat > [☎️]  [📹]
                      ↑
                  CLIQUE AQUI
```

### Passo 5: Permita acesso à câmera

O navegador vai pedir:

```
"ChatPage quer acessar sua câmera e microfone"

[Bloquear] [Permitir] ← CLIQUE AQUI
```

### Passo 6: Veja o modal de chamada recebida

```
┌─────────────────────────┐
│  🤖 Bot Trader          │
│  📹 Chamada de vídeo    │
│                         │
│ [Rejeitar] [Aceitar]   │
└─────────────────────────┘
```

### Passo 7: Clique "Aceitar"

```
Modal fecha
     ↓
CallModal abre
     ↓
Você vê sua câmera! 🎥
```

---

## 🎥 O Que Você Deve Ver

### No CallModal de Vídeo

```
┌──────────────────────────────┐
│ 🤖 Bot Trader        00:12   │
├──────────────────────────────┤
│                              │
│  [Vídeo Remoto - Bot]        │
│  ┌────────────────────────┐  │
│  │ 🤖 Bot Simulado        │  │
│  │                        │  │
│  │ (Vídeo do Bot em      │  │
│  │  simulado com Canvas) │  │
│  │                        │  │
│  └────────────────────────┘  │
│      ┌──────────┐ ← Seu vídeo│
│      │ SUA CÂMERA     │            │
│      │ (ao vivo)      │            │
│      │ - mostra você  │            │
│      │ - espelhado    │            │
│      └──────────┘            │
│                              │
├──────────────────────────────┤
│ [🎤] [📹] [🔊] [📞 RED]    │
├──────────────────────────────┤
│ 📹 Chamada de vídeo em...   │
└──────────────────────────────┘
```

---

## 🔍 O Que Verificar

- ✅ Permissão de câmera é solicitada
- ✅ Você permite acesso
- ✅ CallModal abre com vídeo
- ✅ Área grande mostra "🤖 Bot Simulado" (remoto)
- ✅ Canto inferior direito mostra **SUA CÂMERA** (local)
- ✅ Você se vê espelhado (scale-x-[-1])
- ✅ Vídeo atualiza em tempo real
- ✅ Timer incrementa (00:12, 00:13, ...)
- ✅ Botão 📹 funciona (ativa/desativa câmera)
- ✅ Botão 📞 encerra a chamada

---

## 🐛 Se a Câmera Não Abrir

### Problema 1: "Permissão Negada"

**Solução:**

1. Verifique as configurações do navegador
2. Va para: `Settings → Privacy & security → Camera`
3. Permita acesso para `localhost:5173`
4. Recarregue a página
5. Tente novamente

### Problema 2: "Nenhuma câmera encontrada"

**Solução:**

1. Verifique se sua câmera está conectada
2. Feche outros aplicativos que usam câmera (Zoom, Teams, etc)
3. Reinicie o navegador
4. Tente novamente

### Problema 3: Console mostra erro

**Solução:**

1. Abra DevTools (F12)
2. Vá para Console
3. Procure por erro vermelho
4. Copie a mensagem de erro
5. Verifique qual é o erro específico

---

## 📱 Console Logs Esperados

Quando você clica em 📹:

```javascript
📹 Iniciando chamada de vídeo com: Bot Trader
🎤 Solicitando permissões de mídia: video
✅ Mídia capturada: {audio: true, video: true}
📹 Vídeo local conectado
🎬 Vídeo remoto simulado
```

Se vir todos esses logs: ✅ **Perfeito!**

---

## 🎮 Teste dos Controles

### 1. Botão 🎤 (Mute)

```
Clique em 🎤
  ↓
Botão fica VERMELHO
  ↓
Áudio desabilitado
  ↓
Clique novamente para ativar
```

### 2. Botão 📹 (Camera)

```
Clique em 📹
  ↓
Botão fica VERMELHO
  ↓
Câmera desabilitada
  ↓
Vídeo local fica preto
  ↓
Clique novamente para ativar
```

### 3. Botão 🔊 (Volume)

```
Clique em 🔊
  ↓
Alterna som (simulado)
```

### 4. Botão 📞 (End Call)

```
Clique em 📞 (RED)
  ↓
Modal fecha
  ↓
Câmera é parada
  ↓
Volta para chat normal
```

---

## 📊 Checklist

- [ ] Permissão de câmera solicitada
- [ ] Você permite acesso
- [ ] CallModal abre com área de vídeo
- [ ] Vê "🤖 Bot Simulado" na área grande
- [ ] Vê sua câmera no canto (espelhado)
- [ ] Timer incrementa
- [ ] Botão 🎤 muda de cor
- [ ] Botão 📹 muda de cor
- [ ] Botão 🔊 funciona
- [ ] Botão 📞 encerra a chamada
- [ ] Console mostra logs corretos
- [ ] Nenhum erro no console

---

## 🚀 Teste Completo (Audio + Video)

```
⏱️ 00:00 - Teste Audio Call
         1. Clique em ☎️
         2. Aceitar
         3. Verify áudio funciona
         4. Encerrar

⏱️ 02:00 - Teste Video Call
         1. Clique em 📹
         2. Permita câmera
         3. Aceitar
         4. Verify vídeo funciona
         5. Teste controles
         6. Encerrar

⏱️ 05:00 - ✅ Sucesso!
```

---

## 💡 Dicas

1. **Luz adequada:** Para melhor qualidade do vídeo, teste em local com boa iluminação
2. **Teste o microfone:** Você pode testar se o áudio está sendo capturado
3. **Permissões:** Uma vez permitida, a câmera não pede novamente
4. **Múltiplas câmeras:** Se tiver múltiplas câmeras, só a padrão é usada
5. **Privacy:** Os vídeos são apenas simulados, não são enviados a lugar nenhum

---

## 🔧 Técnico: Como Funciona

### Audio Capture

```
navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
})
  ↓
AudioStream capturado
  ↓
Pronto para enviar para WebRTC
```

### Video Capture

```
navigator.mediaDevices.getUserMedia({
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user'
  }
})
  ↓
VideoStream capturado
  ↓
Conectado ao <video ref={localVideoRef}>
  ↓
Você vê sua câmera em tempo real
```

### Remote Video (Simulado)

```
Canvas criado com dimensões 1280x720
  ↓
Desenha texto e gradiente
  ↓
Canvas.captureStream(30fps)
  ↓
Conectado ao <video ref={remoteVideoRef}>
  ↓
Você vê "🤖 Bot Simulado"
```

---

**Status:** ✅ Pronto para testar!

Se funcionar: Excelente! 🎉  
Se não funcionar: Verifique console (F12) 🔍
