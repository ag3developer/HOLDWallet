# 🔍 Checklist WebSocket P2P - Diagnóstico Completo

## ✅ Status Atual (baseado nos logs)

### Frontend

- ✅ URL com parâmetros corretos: `context=p2p&orderId=...&userId=...`
- ✅ P2P Context sendo criado com sucesso
- ✅ Contato P2P sendo criado (ID 999)
- ❌ WebSocket **NÃO conectando**
- ❌ connectionStatus permanece `disconnected`
- ❌ chatRoomId permanece `null`

### Backend

- ✅ API REST funcionando: `/p2p/orders/{orderId}` retorna 200 OK
- ✅ Banco de dados funcionando (queries executando)
- ✅ Dados do trader sendo carregados corretamente
- ❓ WebSocket endpoint - **PRECISA VERIFICAR**

---

## 🔴 Problemas Identificados

### 1. useEffect Não Está Conectando

**Sintomas:**

- Log "🔄 [useEffect P2P] Executado!" **NÃO aparece** nos logs do console
- connectionStatus fica `disconnected`
- chatRoomId fica `null`

**Possíveis Causas:**

1. ❓ useEffect pode estar sendo executado, mas caindo no `if (!p2pContext || !p2pContext.orderId)`
2. ❓ Token pode não existir no localStorage
3. ❓ Erro silencioso no try/catch
4. ❓ WebSocket endpoint pode não estar configurado

---

## 📋 Checklist de Verificação

### A. Frontend - Variáveis de Ambiente

```bash
# Verificar se APP_CONFIG.api.wsUrl está configurado
```

**Arquivo:** `Frontend/src/config/app.config.ts` ou similar

**O que verificar:**

- [ ] `wsUrl` existe?
- [ ] URL correta? (ws://localhost:8000 ou wss://...)
- [ ] Endpoint WebSocket está completo?

---

### B. Backend - Endpoint WebSocket

**Arquivo esperado:** `Backend/app/routes/chat.py` ou similar

**O que verificar:**

- [ ] Rota `/chat/ws/{chatRoomId}` existe?
- [ ] Aceita parâmetro `token` na query string?
- [ ] Está registrada no FastAPI app?

**Código esperado:**

```python
@router.websocket("/ws/{chat_room_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    chat_room_id: str,
    token: str = Query(...)
):
    # Código de conexão
    await websocket.accept()
    # ...
```

---

### C. Banco de Dados - Tabelas Necessárias

**Tabelas verificadas nos logs:**

- ✅ `p2p_orders` - existe
- ✅ `payment_methods` - existe
- ✅ `trader_profiles` - existe
- ✅ `users` - existe

**Tabelas que podem faltar:**

- ❓ `chat_messages` ou `p2p_messages`
- ❓ `chat_rooms` ou `p2p_chat_rooms`

**SQL para verificar:**

```sql
-- Verificar se tabelas de chat existem
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%chat%' OR table_name LIKE '%message%';
```

---

### D. Frontend - localStorage Token

**O que verificar:**

- [ ] Token existe em `localStorage.getItem('token')`?
- [ ] Token está válido (não expirado)?
- [ ] Token tem formato correto (JWT)?

**Como testar no console do navegador:**

```javascript
console.log("Token:", localStorage.getItem("token"));
console.log("UserId:", localStorage.getItem("userId"));
```

---

### E. WebSocket URL Construction

**Arquivo:** `Frontend/src/services/chatP2P.ts` linha ~125

**Verificar:**

```typescript
const wsBaseUrl = APP_CONFIG.api.wsUrl || "ws://localhost:8000";
const wsUrl = `${wsBaseUrl}/chat/ws/${chatRoomId}?token=${encodeURIComponent(
  token
)}`;
```

**Problemas possíveis:**

- [ ] `APP_CONFIG.api.wsUrl` é `undefined`
- [ ] URL final está mal formada
- [ ] Endpoint não existe no backend

**URL esperada:**

```
ws://localhost:8000/chat/ws/p2p_e419eb32-2e5e-4168-9ab3-004503a87353?token=eyJ...
```

---

## 🛠️ Ações Corretivas

### 1. Adicionar Logs de Debug no Frontend

Vou adicionar logs para capturar **exatamente** o que está acontecendo:

```typescript
// No useEffect de conexão P2P
console.log("1️⃣ useEffect P2P triggered");
console.log("2️⃣ p2pContext:", p2pContext);
console.log("3️⃣ p2pContext?.orderId:", p2pContext?.orderId);
console.log("4️⃣ Token:", localStorage.getItem("token") ? "EXISTS" : "MISSING");
console.log("5️⃣ APP_CONFIG.api.wsUrl:", APP_CONFIG.api.wsUrl);
```

### 2. Verificar Backend WebSocket

**Comando para verificar se endpoint existe:**

```bash
# No terminal do backend
grep -r "websocket" Backend/app/routes/
grep -r "/ws/" Backend/app/routes/
```

### 3. Verificar Configuração WebSocket

**Arquivo:** `Frontend/src/config/app.config.ts`

Deve ter algo como:

```typescript
export const APP_CONFIG = {
  api: {
    baseUrl: "http://localhost:8000",
    wsUrl: "ws://localhost:8000", // ← VERIFICAR ISSO
  },
};
```

---

## 📝 Próximos Passos

1. **Executar comandos de verificação**
2. **Coletar logs completos** com os novos debug logs
3. **Verificar se endpoint WebSocket existe no backend**
4. **Verificar configuração de URL do WebSocket**
5. **Criar endpoint WebSocket se não existir**

---

## 🚨 Solução Rápida Temporária

Se o WebSocket não existir no backend, podemos:

1. **Usar REST API para mensagens** (polling)
2. **Criar endpoint WebSocket mock**
3. **Implementar WebSocket completo**

Qual opção prefere?
