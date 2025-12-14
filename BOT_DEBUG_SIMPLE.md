# 🤖 Bot Testing - Debug Simples

## 🔍 Abra o DevTools e Procure por Estes Logs

Pressione **F12** (DevTools) → **Console**

Procure por logs assim:

```
🤖 Bots carregados no hook: [
  { id: "bot_support", name: "🤖 Bot Suporte", ... },
  { id: "bot_trader", name: "💰 Bot Trader", ... },
  ...
]

📱 Debug - Sidebar: {
  isSidebarOpen: true,
  botsCount: 3,
  shouldRender: true
}
```

---

## ✅ Se Vir Os Logs

Significa que:

- ✅ Bots foram carregados (3 bots)
- ✅ Sidebar está aberta (`isSidebarOpen: true`)
- ✅ Deve renderizar (`shouldRender: true`)

**Procure na sidebar por:**

```
🤖 Bots de Teste
├─ 🤖 Bot Suporte
├─ 💰 Bot Trader
└─ ...
```

---

## ❌ Se NÃO Vir Os Logs

Algo está errado. Tente:

1. **Reload a página:**

   ```
   Ctrl+Shift+R (Windows)
   Cmd+Shift+R (Mac)
   ```

2. **Verifique se há erros vermelhos no console**

3. **Execute no console:**
   ```javascript
   console.log("Página carregada");
   ```
   Se ver a mensagem, tudo carregou OK.

---

## 🧪 Teste Manual

### Se vir os logs E vir os bots:

1. **Clique em um bot** (ex: "🤖 Bot Suporte")
2. **No header do chat, procure:**
   ```
   [☎️] [📹]
   ```
3. **Clique em ☎️ (phone)**
4. **Modal deve aparecer:**
   ```
   ┌────────────────┐
   │ 🤖 Bot Suporte │
   │ ☎️ Chamada...  │
   │                │
   │ [Rejeitar]     │
   │ [Aceitar]      │
   └────────────────┘
   ```
5. **Clique "Aceitar"**
6. **CallModal abre com timer**

---

## 📋 Checklist

- [ ] Vi os logs no console
- [ ] `bots.length` é 3 ou mais
- [ ] `isSidebarOpen` é `true`
- [ ] `shouldRender` é `true`
- [ ] Vejo bots na sidebar
- [ ] Consigo clicar em um bot
- [ ] Consigo clicar em ☎️ ou 📹
- [ ] Modal de chamada aparece
- [ ] Consigo aceitar a chamada

---

## 🎯 Se Funcionar

**Parabéns!** 🎉

Os bots estão funcionando. Agora você pode:

- ☎️ Fazer audio calls
- 📹 Fazer video calls
- 🎤 Testar mute
- 📞 Encerrar chamadas
- 💬 Testar com múltiplos bots

---

## 🚨 Se Não Funcionar

**Abra issue com:**

1. Screenshot do console (com os logs)
2. Se vê erro em vermelho (qual é?)
3. Se vê ou não os bots
4. Que botão você clicou
5. O que aconteceu

---

**Status:** 🚀 Pronto para debug!
