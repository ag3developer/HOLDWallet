# 🔧 FIX: WebSocket P2P Chat Connection

## 🐛 Problema

**Erro ao enviar mensagem:**

```
❌ Erro ao enviar mensagem: Error: WebSocket not connected
    at ChatP2PService.sendMessage (chatP2P.ts:265:13)
```

**Causa Raiz:**

- O chat P2P não estava estabelecendo conexão WebSocket
- O `useEffect` de conexão usava `selectedContact` (número 999)
- Mas para P2P, precisa usar `p2p_${orderId}` como room ID

## ✅ Solução Implementada

### 1. Novo useEffect para Conexão P2P

**Arquivo:** `Frontend/src/pages/chat/ChatPage.tsx` (linha ~275)

```typescript
// Conectar ao chat P2P quando contexto P2P estiver carregado
useEffect(() => {
  const connectP2PChat = async () => {
    if (!p2pContext || !urlUserId) {
      console.log("⏭️ Pulando conexão P2P: sem contexto ou userId");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      console.warn("⚠️ Sem token de autenticação");
      return;
    }

    try {
      // Criar room ID específico para P2P usando orderId
      const chatRoomId = `p2p_${p2pContext.orderId}`;
      console.log("🔌 [P2P] Conectando ao chat room:", chatRoomId);
      console.log("🆔 [P2P] Order ID:", p2pContext.orderId);
      console.log("👤 [P2P] Trader ID:", urlUserId);

      setChatRoomId(chatRoomId);
      setConnectionStatus("connecting");

      await chatP2PService.connectToRoom(chatRoomId, token);
      console.log("✅ [P2P] Conectado ao chat P2P");
      setConnectionStatus("connected");

      // Registrar listeners para mensagens
      const unsubscribeMessage = chatP2PService.onMessage((message) => {
        console.log("📨 [P2P] Mensagem recebida:", message);
        // Adicionar mensagem à lista
        setMessages((prev) => [...prev, newMessage]);
      });

      const unsubscribeTyping = chatP2PService.onTyping((data) => {
        if (data.user_id !== urlUserId) {
          setIsTyping(data.is_typing);
        }
      });

      const unsubscribeStatus = chatP2PService.onStatus((status) => {
        console.log("🔄 [P2P] Status mudou:", status);
        setConnectionStatus(status);
      });

      // Cleanup: desconectar quando componente desmontar
      return () => {
        console.log("🔌 [P2P] Desconectando do chat");
        unsubscribeMessage();
        unsubscribeTyping();
        unsubscribeStatus();
        chatP2PService.disconnect();
      };
    } catch (error) {
      console.error("❌ [P2P] Erro ao conectar ao chat:", error);
      setConnectionStatus("error");
    }
  };

  connectP2PChat();
}, [p2pContext, urlUserId]);
```

### 2. Dependências do useEffect

**Importante:**

- Depende de `p2pContext` (carregado pela API)
- Depende de `urlUserId` (ID do trader)
- Executa automaticamente quando ambos estiverem disponíveis

### 3. Room ID Correto

**Formato:** `p2p_${orderId}`

**Exemplo:**

```
p2p_e419eb32-2e5e-4168-9ab3-004503a87353
```

Isso garante que:

- ✅ Cada negociação P2P tem uma sala única
- ✅ Apenas participantes da negociação podem acessar
- ✅ Backend pode identificar contexto P2P

## 🔄 Fluxo de Conexão

```
1. Usuário clica em "Chat" no anúncio P2P
   ↓
2. Navega para /chat?context=p2p&orderId=xxx&userId=xxx
   ↓
3. useEffect carrega ordem P2P (loadP2POrder)
   ↓
4. setP2PContext() define o contexto
   ↓
5. useEffect de conexão P2P detecta contexto
   ↓
6. Conecta ao WebSocket: p2p_${orderId}
   ↓
7. Registra listeners (mensagens, typing, status)
   ↓
8. ✅ Chat pronto para enviar/receber mensagens
```

## 📊 Console Logs Esperados

```javascript
🔍 [ChatPage] Parâmetros da URL detectados:
   - context: p2p
   - orderId: e419eb32-2e5e-4168-9ab3-004503a87353
   - userId: caac82a2-d892-4b8d-aa3f-8f1255a84d23

✅ [ChatPage] Condição atendida! Carregando ordem P2P...
📡 Chamando API: /p2p/orders/e419eb32-2e5e-4168-9ab3-004503a87353

✅ Ordem recebida do backend: {...}
🗺️ Contexto P2P mapeado: {...}
✅ Contato P2P criado: {...}

🔌 [P2P] Conectando ao chat room: p2p_e419eb32-2e5e-4168-9ab3-004503a87353
🆔 [P2P] Order ID: e419eb32-2e5e-4168-9ab3-004503a87353
👤 [P2P] Trader ID: caac82a2-d892-4b8d-aa3f-8f1255a84d23

✅ [P2P] Conectado ao chat P2P
🔄 [P2P] Status mudou: connected
```

## 🎯 Estado da Conexão

**Interface mostra:**

- 🟢 **"Conectado"** - WebSocket ativo
- 🟠 **"Conectando..."** - Estabelecendo conexão
- 🔴 **"Desconectado"** - Sem conexão
- ⚠️ **"Erro"** - Falha na conexão

## ✅ Validação

### Antes de Enviar Mensagem:

```typescript
if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
  throw new Error("WebSocket not connected");
}
```

### Agora:

```typescript
// WebSocket conectado automaticamente quando:
// 1. p2pContext carregado ✅
// 2. urlUserId disponível ✅
// 3. Token presente ✅
// 4. Room ID criado: p2p_${orderId} ✅
```

## 🧪 Como Testar

1. **Abra F12 → Console**

2. **Clique em "Chat" em um anúncio P2P**

3. **Verifique os logs:**

   ```
   🔌 [P2P] Conectando ao chat room: p2p_...
   ✅ [P2P] Conectado ao chat P2P
   🔄 [P2P] Status mudou: connected
   ```

4. **Digite uma mensagem e pressione Enter**

5. **Deve funcionar SEM erro:**
   - ✅ Mensagem enviada
   - ✅ Aparece no chat
   - ✅ Sem erro "WebSocket not connected"

## 🚨 Troubleshooting

### Se ainda aparecer erro:

1. **Verifique token:**

   ```javascript
   localStorage.getItem("token");
   ```

2. **Verifique status da conexão:**

   ```javascript
   // No console, deve mostrar:
   🔄 [P2P] Status mudou: connected
   ```

3. **Verifique room ID:**

   ```javascript
   // Deve ser formato: p2p_{orderId}
   ```

4. **Verifique backend:**
   - WebSocket server rodando?
   - Endpoint correto?
   - CORS configurado?

## 📝 Arquivos Modificados

- ✅ `Frontend/src/pages/chat/ChatPage.tsx`
  - Adicionado useEffect para conexão P2P (linha ~275)
  - Room ID específico: `p2p_${orderId}`
  - Listeners registrados automaticamente
  - Cleanup ao desmontar componente

---

**Status:** ✅ **IMPLEMENTADO**
**Testado:** ⏳ **AGUARDANDO TESTE DO USUÁRIO**
