# 🤖 Bot Chat - Quick Start

## 🎯 Objetivo

Você pode fazer **chamadas de áudio e vídeo com 3 bots simulados** no chat. Perfeito para testar a funcionalidade P2P sem precisar de outro usuário real.

---

## 3️⃣ Bots Disponíveis

Na **sidebar do chat**, procure por:

```
🤖 Bot Traders
├─ 🤖 Bot Trader         ← Trader simulado
├─ 🎧 Bot Support        ← Support simulado
└─ 💼 Bot Manager        ← Manager simulado
```

Todos **online 24/7** e prontos para atender!

---

## 📞 Como Fazer Uma Chamada

### 1. Selecione um Bot

Clique em qualquer bot na lista:

```
🤖 Bot Traders > 🤖 Bot Trader
```

### 2. Escolha o Tipo

No topo, você verá:

```
[☎️ Phone]  [📹 Video]
```

- **☎️ Phone** = Audio only (voz)
- **📹 Video** = Audio + vídeo

### 3. Modal Aparece

Você verá:

```
┌─────────────────────────┐
│  🤖 Bot Trader          │
│  📹 Chamada de vídeo    │
│                         │
│  [🔴 Rejeitar] [🟢 Aceitar]
└─────────────────────────┘
```

### 4. Aceitar a Chamada

Clique em **"Aceitar"** (botão verde)

### 5. Chamada Ativa

Abre a chamada com:

- **Áudio:** Visualizador com barras animadas
- **Vídeo:** Área de vídeo (remoto + local)
- **Controles:**
  - 🎤 Mute/Unmute
  - 📹 Camera on/off (vídeo only)
  - 🔊 Volume
  - 📞 Encerrar (botão vermelho)
- **Timer:** Mostra duração (00:00 → 00:01 → ...)

### 6. Encerrar

Clique no botão **📞 vermelho** para encerrar

---

## 🧪 Teste Rápido (2 minutos)

```
⏱️ 00:00 - Abra o chat (http://localhost:5173)

⏱️ 00:15 - Procure por "Bot Traders" na sidebar

⏱️ 00:30 - Clique em "🤖 Bot Trader"

⏱️ 00:45 - Clique no botão ☎️ (phone)

⏱️ 01:00 - Click "Aceitar" no modal

⏱️ 01:15 - Veja a chamada ativa com timer

⏱️ 01:30 - Click mute button (🎤) - fica vermelho

⏱️ 01:45 - Click encerrar (📞 vermelho)

⏱️ 02:00 - ✅ Sucesso! Chamada encerrada
```

---

## 🎮 Controles Disponíveis

Durante uma chamada ativa:

| Botão         | Função              | Estado                          |
| ------------- | ------------------- | ------------------------------- |
| 🎤            | Mutar áudio         | Cinza = Som ON, Vermelho = Mudo |
| 📹            | Camera (video only) | Cinza = ON, Vermelho = OFF      |
| 🔊            | Controle de volume  | Alterna som                     |
| 📞 (vermelho) | Encerrar chamada    | Fecha tudo                      |

---

## 📊 O Que Você Verá

### Audio Call (☎️)

```
┌─────────────────────────┐
│  🤖 Bot Trader          │
│  00:15                  │
├─────────────────────────┤
│                         │
│  [Avatar grande]        │
│  Bot Trader             │
│  Chamada de voz...      │
│                         │
│  ▮ ▮ ▮ ▮ ▮             │ ← Barras pulsantes
│  (animação de som)      │
│                         │
├─────────────────────────┤
│ [🎤] [🔊] [📞]         │ ← Controles
├─────────────────────────┤
│ ☎️ Chamada de voz em... │
└─────────────────────────┘
```

### Video Call (📹)

```
┌─────────────────────────┐
│  🤖 Bot Trader          │
│  00:15                  │
├─────────────────────────┤
│  [Remote Video - Full]  │
│  ┌─────────────────┐    │
│  │ Video do Bot    │    │
│  │  (tela cheia)   │    │
│  └─────────────────┘    │
│      ┌────┐ ← Local    │
│      │Your│   Video    │
│      │video           │
│      └────┘            │
├─────────────────────────┤
│ [🎤] [📹] [🔊] [📞]   │
├─────────────────────────┤
│ 📹 Chamada de vídeo...  │
└─────────────────────────┘
```

---

## 💬 Mensagens de Sistema

Durante o chat, você verá mensagens automáticas:

```
"☎️ Chamada de voz iniciada com Bot Trader..."
"🤖 Bot Trader está aceitando sua chamada..."
"⏱️ Chamada em andamento..."
"🛑 Chamada encerrada (duração: 00:45)"
```

---

## ❓ FAQ Rápido

**P: Onde encontro os bots?**  
R: Na sidebar esquerda, role para baixo até "🤖 Bot Traders"

**P: Posso fazer chamada sem aceitar?**  
R: Não, você precisa clicar "Aceitar" primeiro

**P: O bot responde automaticamente?**  
R: 50% de chance de responder após ~2 segundos

**P: Quanto tempo dura a chamada?**  
R: O bot encerra entre 10-30 segundos automaticamente

**P: Posso fazer múltiplas chamadas?**  
R: Uma por vez. Encerre a atual antes de iniciar outra

**P: O áudio/vídeo real funciona?**  
R: Neste momento é simulado. Para real, use 2 usuários

**P: Preciso de permissões de câmera/microfone?**  
R: Sim! Permita quando o navegador pedir

---

## 🐛 Se Algo Não Funcionar

### 1. Limpar Cache

```
Ctrl+Shift+R (Windows)
Cmd+Shift+R (Mac)
```

### 2. Abrir Console (F12)

Procure por erros em vermelho

### 3. Recarregar Página

```
Ctrl+R ou Cmd+R
```

### 4. Verificar Bots Carregados

No Console, execute:

```javascript
console.log(bots);
// Deve mostrar 3 bots
```

---

## 🚀 Resumo da Experiência

```
┌──────────────────────────────────────────┐
│ Você                                     │
│ ▼                                        │
│ Clica no Bot ──────┐                    │
│                    ▼                     │
│              IncomingCallModal abre     │
│              (Aceitar/Rejeitar)         │
│                    │                     │
│         Clica "Aceitar"                 │
│                    ▼                     │
│              CallModal abre              │
│              (Chamada ativa)             │
│              - Timer incrementa          │
│              - Controles disponíveis     │
│              - Áudio/Vídeo (simulado)    │
│                    │                     │
│         Clica "End Call" (📞)           │
│                    ▼                     │
│              Modal fecha                 │
│              Volta ao chat normal        │
│                    ▼                     │
│         Mensagem de sistema aparece      │
│         "🛑 Chamada encerrada (00:45)"   │
└──────────────────────────────────────────┘
```

---

## 📱 Teste em Responsivo

✅ **Desktop:** Totalmente funcional  
✅ **Tablet:** Totalmente funcional  
✅ **Mobile:** Totalmente funcional

O modal se adapta ao tamanho da tela!

---

## ✅ Pronto Para Começar!

1. Abra http://localhost:5173
2. Procure por "🤖 Bot Traders" na sidebar
3. Clique em um bot
4. Clique ☎️ ou 📹
5. Clique "Aceitar"
6. Teste os controles
7. Clique "End Call" para encerrar
8. Veja a mensagem de sistema

**Tempo total:** 2-3 minutos ⏱️

---

**Tudo funcionando?** ✅  
**Pronto para testar com usuários reais!** 🚀
