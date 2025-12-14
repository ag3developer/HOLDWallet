# ✅ TESTE RÁPIDO - Audio + Video

## 🎯 Objetivo

Verificar que audio e vídeo estão funcionando com bots.

---

## 📋 Checklist de Teste

### ☎️ Audio Call (Áudio)

```
☐ Abra http://localhost:5173
☐ Sidebar > 🤖 Bot Traders > 🤖 Bot Trader
☐ Clique botão ☎️ (phone)
☐ Modal aparece > Clique "Aceitar"
☐ CallModal abre com barras de áudio
☐ Timer incrementa (00:00 → 00:01)
☐ Clique 🎤 (mute) - fica vermelho
☐ Clique novamente - volta normal
☐ Clique 📞 (red button) - fecha
☐ Volte ao chat
✅ AUDIO FUNCIONA!
```

### 📹 Video Call (Vídeo)

```
☐ Sidebar > 🤖 Bot Traders > 🤖 Bot Trader
☐ Clique botão 📹 (video)
☐ Browser pede: "Permitir câmera e microfone?"
☐ Clique "Permitir"
☐ Modal aparece > Clique "Aceitar"
☐ CallModal abre
☐ Área grande: "🤖 Bot Simulado" (vídeo do bot)
☐ Canto inferior direito: SUA CÂMERA (ao vivo!)
☐ Você se vê espelhado
☐ Timer incrementa
☐ Clique 🎤 para mutar
☐ Clique 📹 para desligar câmera (fica vermelho)
☐ Câmera local fica preta
☐ Clique 📹 novamente para ligar
☐ Você se vê novamente
☐ Clique 📞 (red button) - fecha
✅ VIDEO FUNCIONA!
```

---

## 🎬 O Que Você Deve Ver

### Audio Call

```
┌────────────────────────┐
│ 🤖 Bot Trader   00:15  │
├────────────────────────┤
│ [Avatar grande]        │
│ Bot Trader             │
│ ▮ ▮ ▮ ▮ ▮             │ ← Barras pulsantes
│ (som)                  │
├────────────────────────┤
│ [🎤] [🔊] [📞]        │
└────────────────────────┘
```

### Video Call

```
┌────────────────────────┐
│ 🤖 Bot Trader   00:15  │
├────────────────────────┤
│ 🤖 Bot Simulado        │
│ (vídeo remoto grande)  │
│                   [Sua ]
│                   [câm ]
│                   [era ]
├────────────────────────┤
│ [🎤] [📹] [🔊] [📞]   │
└────────────────────────┘
```

---

## 🔍 Console (F12)

### Audio Call - Logs Esperados

```
📞 Iniciando chamada de voz com: Bot Trader
🎤 Solicitando permissões de mídia: audio
✅ Mídia capturada: {audio: true, video: false}
```

### Video Call - Logs Esperados

```
📹 Iniciando chamada de vídeo com: Bot Trader
🎤 Solicitando permissões de mídia: video
✅ Mídia capturada: {audio: true, video: true}
📹 Vídeo local conectado
🎬 Vídeo remoto simulado
```

---

## ⚠️ Se Não Funcionar

### Problema 1: "Câmera não aparece"

- Feche outros apps (Zoom, Teams, etc)
- Recarregue a página (Ctrl+R)
- Tente novamente

### Problema 2: "Permissão negada"

- Abra browser settings
- Privacy & Security > Camera
- Permita para localhost:5173
- Reload

### Problema 3: "Console com erro"

- Abra DevTools (F12)
- Vá para Console
- Procure erro em vermelho
- Copie erro e pesquise

---

## ✅ Resultado Esperado

Depois do teste, você deve ter:

- ✅ Audio funciona (pode testar em chamadas reais)
- ✅ Vídeo funciona (câmera abre e transmite)
- ✅ Controles funcionam (mute, camera toggle, etc)
- ✅ Timer funciona (incrementa a cada segundo)
- ✅ Bot responde (aparece modal de chamada)
- ✅ Sem erros no console

---

## 🎉 Pronto!

Se tudo passou no checklist: **Parabéns! 🎉**

Seu chat P2P com áudio e vídeo está 100% funcional!

Próximo passo: Testar com usuário real (abrir 2 browsers diferentes)
