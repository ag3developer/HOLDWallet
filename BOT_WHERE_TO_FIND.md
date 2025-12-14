# 🤖 Onde Encontrar os Bots - Visual Guide

## 📍 Localização no Chat

### Visão Geral da Interface

```
┌─────────────────────────────────────────────────────────────┐
│                        🏠 HOLDWallet Chat                   │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│  SIDEBAR     │         CHAT PRINCIPAL                      │
│              │                                              │
│  🔍 Search   │                                              │
│  input field │    Contato Selecionado                      │
│              │    ┌──────────────────────────────┐          │
│ ─────────────│    │ 🤖 Bot Trader          │ ☎️📹 │ ← BUTTONS
│              │    │ Online                 │           │
│ 📋 Contatos  │    └──────────────────────────────┘          │
│              │                                              │
│  👤 User 1   │    [Histórico de Mensagens]                 │
│  👤 User 2   │                                              │
│  👤 User 3   │    [Input de Mensagem]                      │
│              │                                              │
│ ─────────────│                                              │
│              │                                              │
│ 🤖 Bot       │ ← VOCÊ ESTÁ AQUI!                           │
│   Traders    │ ← ROLE PARA BAIXO PARA VER                 │
│              │                                              │
│  🤖 Bot T    │ ← Mostra lista de bots                      │
│  🎧 Bot S    │                                              │
│  💼 Bot M    │                                              │
│              │                                              │
│ ─────────────│                                              │
│ ⚙️ Settings  │                                              │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

---

## 🔍 Step-by-Step: Encontrar e Usar os Bots

### Step 1: Abra o Chat

```
URL: http://localhost:5173
```

### Step 2: Procure na Sidebar

Na **sidebar esquerda**, você verá:

```
📋 CONTATOS
├─ 👤 User 1
├─ 👤 User 2
├─ 👤 User 3
│
├─ ─────────────
│
└─ 🤖 BOT TRADERS      ← CLIQUE AQUI
   ├─ 🤖 Bot Trader    ← Opção 1
   ├─ 🎧 Bot Support   ← Opção 2
   └─ 💼 Bot Manager   ← Opção 3
```

### Step 3: Selecione um Bot

Clique em qualquer um:

```
ANTES:
🤖 BOT TRADERS
  ├─ 🤖 Bot Trader (não selecionado)
  ├─ 🎧 Bot Support
  └─ 💼 Bot Manager

DEPOIS (após clicar):
🤖 BOT TRADERS
  ├─ 🤖 Bot Trader ← HIGHLIGHTED (azul)
  ├─ 🎧 Bot Support
  └─ 💼 Bot Manager

E no centro da tela:
"🤖 Bot Trader" aparece no header do chat
```

### Step 4: Use os Botões

No **header do chat**, procure:

```
┌─ 🤖 Bot Trader ─┐
│                │
│  [☎️] [📹]    │ ← Estes botões!
│                │
└────────────────┘
```

- **☎️** = Audio call (chamada de voz)
- **📹** = Video call (chamada de vídeo)

### Step 5: Clique em um Botão

```
Você clica em ☎️
        ▼
IncomingCallModal abre
        ▼
Modal com "Aceitar" / "Rejeitar"
        ▼
Você clica "Aceitar"
        ▼
CallModal abre
        ▼
Chamada ativa com controles
```

---

## 📲 Botões de Chamada (Header do Chat)

### Localização Exata

```
┌─────────────────────────────────────────────────┐
│ Chat Header                                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  👤 Nome do Contato     Status (Online/Offline)│
│                                                 │
│                      [☎️]  [📹]  [⋮]          │
│                       ↑     ↑               │
│                  ESTOS BOTÕES!
│
└─────────────────────────────────────────────────┘

Exemplo com Bot:
┌─────────────────────────────────────────────────┐
│ 🤖 Bot Trader                   Online         │
│                      [☎️]  [📹]  [⋮]          │
│                                                 │
└─────────────────────────────────────────────────┘
```

### O Que Cada Botão Faz

| Botão | Nome  | Função                      |
| ----- | ----- | --------------------------- |
| ☎️    | Phone | Inicia chamada de **áudio** |
| 📹    | Video | Inicia chamada de **vídeo** |
| ⋮     | Menu  | Mais opções (configurações) |

---

## 🎯 Caminho Completo: Click-by-Click

```
1. SIDEBAR ESQUERDA
   ┌─────────────┐
   │ 🤖 Bot Traders │  ← Role para baixo se não ver
   │ ┌───────────┐   │
   │ │ 🤖 Bot T  │ ← CLIQUE AQUI
   │ │ 🎧 Bot S  │
   │ │ 💼 Bot M  │
   │ └───────────┘   │
   └─────────────────┘

2. CHAT HEADER
   ┌──────────────────────────┐
   │ 🤖 Bot Trader  Online    │
   │              [☎️] [📹]  │
   │                 ↓        │
   │              CLIQUE      │
   │              AQUI        │
   └──────────────────────────┘

3. INCOMING CALL MODAL
   ┌─────────────────────────┐
   │                         │
   │  🤖 Bot Trader          │
   │  ☎️ Chamada de voz      │
   │                         │
   │ [Rejeitar] [Aceitar]   │
   │                  ↓      │
   │              CLIQUE     │
   │              AQUI       │
   └─────────────────────────┘

4. CALL MODAL (CHAMADA ATIVA)
   ┌─────────────────────────┐
   │  🤖 Bot Trader 00:12   │
   │                         │
   │  [Avatar] + Audio bars  │
   │                         │
   │ [🎤] [🔊] [📞 RED]    │
   │                         │
   │ ☎️ Chamada de voz em    │
   └─────────────────────────┘
            ↓
        CLIQUE
        BOTÃO
        RED
            ↓
        MODAL FECHA
```

---

## 🔍 Se Não Encontrar os Bots

### Problema 1: Não Vejo a Seção "🤖 Bot Traders"

**Solução:**

1. Role a sidebar para **baixo**
2. A seção está no final da lista de contatos
3. Se ainda não aparecer:
   - Limpe cache: `Ctrl+Shift+R`
   - Recarregue a página: `Ctrl+R`

### Problema 2: Não Vejo os Botões ☎️ e 📹

**Solução:**

1. Certifique-se que selecionou um bot
2. Procure no **header do chat** (topo)
3. Os botões ficam à **direita** do nome do bot
4. Se não aparecer:
   - Clique novamente no bot
   - Verifique se está logado

### Problema 3: Não Apareça Nenhum Modal

**Solução:**

1. Abra **DevTools** (F12)
2. Vá para **Console**
3. Procure por erros em vermelho
4. Clique novamente no botão ☎️ ou 📹
5. Veja o que o console diz

---

## 📱 Aparência em Diferentes Telas

### Desktop (1920x1080)

```
┌──────────────────────────────────────────┐
│ SIDEBAR (220px) │ CHAT (resto)          │
│                 │                        │
│ 🤖 Bot Traders  │ 🤖 Bot Trader        │
│ ├─ 🤖 Bot T    │ [☎️] [📹]           │
│ ├─ 🎧 Bot S    │                        │
│ └─ 💼 Bot M    │ [Chat area grande]    │
│                 │                        │
└──────────────────────────────────────────┘
```

### Tablet (768x1024)

```
┌────────────────────────┐
│ SIDEBAR (pequena)      │
│ 🤖 Bot Traders         │
│ ├─ 🤖 Bot T           │
│                        │
│ CHAT                   │
│ 🤖 Bot Trader         │
│ [☎️] [📹]             │
└────────────────────────┘
```

### Mobile (375x812)

```
┌──────────────────────┐
│ Menu ≡   🤖 Bot T    │ ← Sidebar pode estar
│ [☎️] [📹]           │   escondida
│                      │
│ Chat area            │
│                      │
│                      │
└──────────────────────┘
```

---

## 🎨 Cores e Estilos

### Sidebar - Bot Trader (não selecionado)

```
🤖 Bot Trader
Text: Gray
Background: Transparent
```

### Sidebar - Bot Trader (selecionado)

```
🤖 Bot Trader       ← Background AZUL/PURPLE
Text: White/Light
Indicador: ✓ ou barra azul
```

### Header - Botões

```
[☎️] - Cinza por padrão
      Verde ao hover

[📹] - Cinza por padrão
      Azul ao hover
```

### Modals - Cores

```
IncomingCallModal:
  Header: Verde (incoming)
  Buttons: Vermelho (reject) + Verde (accept)

CallModal:
  Header: Azul → Purple (gradient)
  Controls: Cinza + Vermelho (end call)
  Status: Verde pulsante
```

---

## ✅ Checklist Visual

- [ ] Vejo "🤖 Bot Traders" na sidebar
- [ ] Vejo 3 bots listados abaixo
- [ ] Posso clicar em um bot
- [ ] Header muda para mostrar o bot selecionado
- [ ] Vejo botões ☎️ e 📹 no header
- [ ] Clicar em ☎️ abre IncomingCallModal
- [ ] Clicar em 📹 abre IncomingCallModal
- [ ] Modal mostra o nome do bot
- [ ] Botão "Aceitar" é verde
- [ ] Botão "Rejeitar" é vermelho
- [ ] Clicando "Aceitar" abre CallModal
- [ ] CallModal mostra timer
- [ ] Controles funcionam

---

## 🚀 Resumo

| Elemento       | Localização      | Cor          | Função          |
| -------------- | ---------------- | ------------ | --------------- |
| Bot List       | Sidebar inferior | 🤖 Icon      | Mostrar bots    |
| Bot Item       | Abaixo do título | Gray/Blue    | Selecioná-lo    |
| ☎️ Button      | Header direita   | Gray/Green   | Audio call      |
| 📹 Button      | Header direita   | Gray/Blue    | Video call      |
| Incoming Modal | Center screen    | Green header | Receber chamada |
| Call Modal     | Fullscreen       | Blue header  | Chamada ativa   |

---

**Agora você sabe exatamente onde encontrar e clicar! 🎯**
