# 🎥 Teste de Áudio e Vídeo - Guia Rápido

## ✅ O que Você Viu

A primeira parte funcionou! Quando clicou em um bot, apareceu:

```
┌─────────────────────────────────┐
│  🎧 Bot Suporte                 │
│  Chamada de vídeo               │
│  ...                            │
│  [🔴 Rejeitar] [🟢 Aceitar]    │
└─────────────────────────────────┘
```

Isso é o **IncomingCallModal** (modal de chamada recebida) ✅

---

## 🚀 Agora Vamos Testar o Áudio/Vídeo

### Passo 1: Clique em "Aceitar" (botão verde)

Quando você clica em **"Aceitar"**:

1. ✅ O modal de chamada recebida fecha
2. ✅ O **CallModal abre** (modal de chamada ativa)
3. ✅ **Pedido de permissão de câmera/microfone** aparece no navegador
4. ✅ **Você precisa permitir!**

```
Navegador pede:
┌─────────────────────────────┐
│ localhost quer usar sua      │
│ 🎤 Microfone                │
│ 📹 Câmera                   │
│                             │
│ [Permitir]  [Bloquear]      │
└─────────────────────────────┘
```

**Clique em "Permitir"**

---

### Passo 2: CallModal Abre com Vídeo

Depois de permitir, você verá:

```
┌───────────────────────────────────┐
│  🎧 Bot Suporte  00:05            │
├───────────────────────────────────┤
│                                   │
│  [Vídeo do Bot - área cinza]     │
│                                   │
│    ┌──────┐ ← Seu vídeo          │
│    │ VOCÊ │   (canto inferior)   │
│    └──────┘                       │
│                                   │
├───────────────────────────────────┤
│  [🎤] [📹] [🔊] [📞 RED]        │
│                                   │
│  📹 Chamada de vídeo em andamento │
└───────────────────────────────────┘
```

---

### Passo 3: Teste os Controles

**Para Áudio:**

- Clique em 🎤 (mute button)
- Deve ficar **vermelho** (mudo)
- Clique novamente para desmutar (volta a cinza)

**Para Vídeo:**

- Clique em 📹 (camera button)
- Deve ficar **vermelho** (câmera desligada)
- Você deixa de ver seu vídeo no canto
- Clique novamente para ligar

**Para Volume:**

- Clique em 🔊 (volume button)
- Alterna mudo de som

**Para Encerrar:**

- Clique em 📞 **vermelho** (end call)
- Modal fecha
- Volta para o chat

---

## 🔍 O Que Pode Dar Errado

### ❌ Navegador Pede Permissão e Você Clica "Bloquear"

**Solução:**

1. Reload a página (Ctrl+R)
2. Tente novamente
3. Clique em "Permitir" desta vez

### ❌ Permite mas Não Abre a Câmera

**Solução:**

1. Abra **DevTools** (F12)
2. Vá para **Console**
3. Procure por erros em vermelho (tipo "❌ Permissão negada")
4. Se houver erro, veja a mensagem exata

### ❌ CallModal Não Abre Depois de Aceitar

**Solução:**

1. Verifique console (F12 → Console)
2. Procure por logs:
   - `✅ Aceitando chamada do bot...`
   - `🎥 Mídia capturada...`
3. Se não aparecer, há um erro

### ❌ Vídeo Não Aparece (Só Cinza)

**Possível Causa:** Câmera está bloqueada  
**Solução:**

1. Verifique configurações de câmera do SO (Windows/Mac)
2. Veja se outro app está usando câmera
3. Reinicie navegador
4. Tente em modo incógnito

### ❌ Nenhum Som

**Possível Causa:** Microfone está mudo  
**Solução:**

1. Verifique configurações de áudio do SO
2. Veja se outro app está usando microfone
3. Tente clicar no botão 🎤 para desmutar
4. Clique no botão 🔊 para aumentar volume

---

## 📱 Teste Completo (Passo-a-Passo)

```
1. Abra http://localhost:5173

2. Procure por "🤖 Bot Traders" na sidebar

3. Clique em "🎧 Bot Suporte" (ou outro bot)

4. No topo, clique em 📹 (Video button)

5. IncomingCallModal aparece

6. Clique em "Aceitar" (verde)

7. Navegador pede permissão
   → Clique "Permitir"

8. CallModal abre com áreas de vídeo

9. Teste os botões:
   - 🎤 (mute) → fica vermelho
   - 📹 (camera) → fica vermelho, vídeo desaparece
   - 🔊 (volume) → alterna
   - 📞 (end call) → encerra

10. Clique 📞 para encerrar

11. Volta para o chat normal
```

---

## ✅ Checklist de Sucesso

- [ ] Vejo os bots na sidebar
- [ ] Clico em um bot
- [ ] Clico em 📹 (video)
- [ ] IncomingCallModal aparece
- [ ] Clico "Aceitar"
- [ ] Navegador pede permissão
- [ ] Permitir funciona
- [ ] CallModal abre
- [ ] Vejo área de vídeo (cinza ou preto)
- [ ] Vejo meu vídeo no canto
- [ ] 🎤 button funciona
- [ ] 📹 button funciona
- [ ] 🔊 button funciona
- [ ] 📞 button encerra

---

## 📊 Teste de Áudio (sem Vídeo)

Se quiser testar só áudio:

```
1. Clique em bot

2. Clique em ☎️ (Phone - audio only)

3. Clique "Aceitar"

4. Vê visualizador de áudio (barras animadas)

5. Testa 🎤 (mute)

6. Testa 🔊 (volume)

7. Clica 📞 para encerrar
```

---

## 🎯 Fluxo Completo de Vídeo

```
Você                    Aplicação                Bot
 │                           │                     │
 │─ Clica em Bot ──────────>│                     │
 │                           │                     │
 │  ← Abre Chat com Bot ─────│                     │
 │                           │                     │
 │─ Clica 📹 (Video) ──────>│─ Pede Permission   │
 │                           │                     │
 │  ← Browser pede ──────────│                     │
 │    permissão              │                     │
 │                           │                     │
 │─ Clica "Permitir" ──────>│─ Captura Câmera   │
 │                           │ & Microfone        │
 │                           │                     │
 │  ← IncomingCallModal ─────│ ← Simula Chamada  │
 │    aparece                │   recebida         │
 │                           │                     │
 │─ Clica "Aceitar" ───────>│─ Ativa CallModal  │
 │                           │                     │
 │  ← CallModal abre ────────│                     │
 │  ← Vejo meu vídeo ────────│ ← Mostra vídeo    │
 │  ← Vejo vídeo do Bot ─────│   remoto (cinza)  │
 │                           │                     │
 │─ Testo controles ───────>│                     │
 │  (mute, video, volume)   │                     │
 │                           │                     │
 │─ Clica "End Call" ──────>│─ Encerra          │
 │                           │   Chamada          │
 │  ← Modal fecha ───────────│                     │
 │  ← Volta ao chat ────────>│                     │
 │                           │                     │
```

---

## 📞 Resumo Final

✅ **Bots aparecem** - Seção "🤖 Bot Traders"  
✅ **Chamada recebida** - IncomingCallModal com "Aceitar/Rejeitar"  
✅ **Permissão** - Navegador pede câmera/microfone  
✅ **Vídeo** - CallModal mostra área de vídeo  
✅ **Áudio** - Captura do seu microfone  
✅ **Controles** - Todos funcionam (mute, video, volume, end)  
✅ **Timer** - Mostra duração incrementando

---

**Agora é só testar! 🚀**

Se der erro, mande a mensagem do console (F12) que fixo rapidinho!
