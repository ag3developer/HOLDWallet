# ✅ Chat P2P - Migração para REST API

## 🎯 O Que Foi Feito

### 1. Removido WebSocket

- ❌ Removido todo código WebSocket (ws, WebSocket.OPEN, etc)
- ✅ Implementado polling REST a cada 2 segundos

### 2. Métodos Atualizados

#### `connectToRoom(chatRoomId, token)`

- **Antes:** Tentava conectar WebSocket
- **Agora:** Inicia polling REST que busca novas mensagens a cada 2s

#### `sendMessage(content)`

- **Antes:** Enviava via `ws.send()`
- **Agora:** `POST /chat/p2p/{roomId}/messages` com corpo JSON

#### `sendAudioMessage(audioBlob)`

- **Antes:** Enviava via WebSocket com base64
- **Agora:** `POST /chat/p2p/{roomId}/messages` com FormData

#### `disconnect()`

- **Antes:** Fechava WebSocket
- **Agora:** Para o polling (clearInterval)

### 3. Polling de Mensagens

```typescript
// A cada 2 segundos:
GET /chat/p2p/{roomId}/messages?after={lastMessageId}&limit=50

// Resposta esperada:
{
  "messages": [
    {
      "id": "msg-uuid",
      "sender_id": "user-uuid",
      "content": "Olá!",
      "created_at": "2026-01-04T16:00:00",
      ...
    }
  ]
}
```

---

## 🔴 Erro 500 - O Que Verificar

### Endpoints Necessários no Backend

#### 1. Buscar Mensagens (GET)

```
GET /chat/p2p/{roomId}/messages
Query params:
  - after: string (optional) - ID da última mensagem
  - limit: number (optional) - Máximo 50
```

#### 2. Enviar Mensagem (POST)

```
POST /chat/p2p/{roomId}/messages
Body:
{
  "content": "Mensagem aqui",
  "message_type": "text"
}
```

#### 3. Enviar Áudio (POST)

```
POST /chat/p2p/{roomId}/messages
Content-Type: multipart/form-data
Form fields:
  - file: File
  - message_type: "audio"
  - content: "Mensagem de áudio"
```

---

## 🐛 Como Debugar Erro 500

### 1. Verificar Logs do Backend

```bash
# No terminal do backend, procure por:
- Stack trace do erro
- Rota que está falhando
- Mensagem de erro SQL (se houver)
```

### 2. Verificar se Rota Existe

```bash
# No código do backend:
grep -r "/chat/p2p" Backend/app/routes/
grep -r "chat.*p2p" Backend/app/routes/
```

### 3. Testar Endpoint Manualmente

```bash
# Usando curl:
curl -X GET "http://localhost:8000/chat/p2p/test-room-id/messages" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ✅ Se Endpoints Não Existirem

### Opção A: Criar Endpoints Mock Rápidos

Criar arquivo `Backend/app/routes/chat_p2p.py`:

```python
from fastapi import APIRouter, Depends
from typing import List, Optional

router = APIRouter(prefix="/chat/p2p", tags=["Chat P2P"])

@router.get("/{room_id}/messages")
async def get_messages(
    room_id: str,
    after: Optional[str] = None,
    limit: int = 50
):
    # Mock - retorna array vazio por enquanto
    return {
        "success": True,
        "messages": [],
        "total": 0
    }

@router.post("/{room_id}/messages")
async def send_message(
    room_id: str,
    content: str,
    message_type: str = "text"
):
    # Mock - simula envio
    return {
        "success": True,
        "message": {
            "id": "mock-" + str(uuid.uuid4()),
            "content": content,
            "sender_id": "current-user-id",
            "created_at": datetime.now().isoformat()
        }
    }
```

Depois registrar no `main.py`:

```python
from app.routes import chat_p2p
app.include_router(chat_p2p.router)
```

### Opção B: Usar Endpoints Existentes

Se já existe algum endpoint de chat genérico, podemos adaptar o frontend para usar ele.

---

## 📊 Status Atual

✅ **Frontend:**

- Chat P2P usa REST API
- Polling funcionando
- Envio de mensagens por REST
- Sem dependência de WebSocket

❌ **Backend:**

- Precisa ter endpoints `/chat/p2p/{roomId}/messages`
- Ou adaptar endpoints existentes

---

## 🚀 Próximos Passos

1. **Verificar logs do backend** para ver qual endpoint está falhando
2. **Verificar se endpoints existem** no código do backend
3. **Criar endpoints mock** se não existirem (5 minutos)
4. **Testar** envio e recebimento de mensagens

---

## 💡 Dicas

### Ver Requisições no Console

Abra DevTools > Network > Filter by "Fetch/XHR" e procure por:

- `/chat/p2p/` - requisições do chat
- Status 500 - erro do servidor
- Status 404 - endpoint não existe

### Ver Logs do Polling

Console deve mostrar a cada 2 segundos:

```
🔄 [P2P Service REST] Buscando mensagens...
✅ [P2P Service REST] X mensagens recebidas
```

Se não aparecer, o polling não está ativo.
