# 🔴 Arquitetura Profissional de Tratamento de Erros

## Problema Original

O sistema tinha uma "gambiarra" onde qualquer erro 403 causava logout, mesmo quando não era um problema de sessão.

```typescript
// ❌ ERRADO - Gambiarra
if (error.response?.status === 403) {
  // Verificar manualmente strings no detail...
  if (!detail.includes("BIOMETRIC") && !detail.includes("2FA")) {
    this.handleAuthError(); // Logout!
  }
}
```

## Solução Profissional

### 1. Códigos de Erro Padronizados

**Backend:** `backend/app/core/error_codes.py`
**Frontend:** `Frontend/src/services/errors/ErrorCodes.ts`

```
AUTH_SESSION_EXPIRED  → 401 → Logout obrigatório
AUTH_SESSION_INVALID  → 401 → Logout obrigatório
AUTH_2FA_INVALID      → 403 → NÃO logout, pedir novo código
AUTH_BIOMETRIC_EXPIRED→ 403 → NÃO logout, pedir nova biometria
VALIDATION_*          → 400 → NÃO logout, mostrar erro
BUSINESS_*            → 400/403 → NÃO logout, mostrar erro
```

### 2. Resposta de Erro Estruturada

O backend retorna:

```json
{
  "code": "AUTH_2FA_INVALID",
  "message": "Código 2FA inválido. Tente novamente.",
  "details": {
    "attempts_remaining": 2
  },
  "requires_logout": false,
  "requires_reauth": true
}
```

### 3. Frontend Usa Flags Explícitas

```typescript
const parsedError = parseErrorResponse(error);

if (parsedError.requires_logout) {
  // Logout - sessão realmente expirou
  this.handleAuthError();
} else if (parsedError.requires_reauth) {
  // Mostrar modal de 2FA/biometria
  showReauthModal();
} else {
  // Apenas mostrar erro, não logout
  showErrorNotification(parsedError.message);
}
```

## Princípios da Arquitetura

### 1. **Single Source of Truth**

- Códigos de erro definidos em UM lugar
- Backend e Frontend usam os mesmos códigos
- Facilita manutenção

### 2. **Explicit Intent**

- O backend diz EXPLICITAMENTE o que o frontend deve fazer
- `requires_logout: true/false`
- `requires_reauth: true/false`
- Sem adivinhação no frontend

### 3. **Separation of Concerns**

- 401 = Sessão (sempre logout)
- 403 = Autorização (depende do contexto)
- 400 = Validação (nunca logout)
- 500 = Servidor (nunca logout)

### 4. **Graceful Degradation**

- Se backend retorna formato antigo, frontend infere do código
- Compatibilidade com endpoints não migrados

## Implementação no Backend

```python
from app.core.error_codes import APIError, ErrorCode, raise_2fa_invalid

# Em vez de:
raise HTTPException(
    status_code=403,
    detail="INVALID_2FA_TOKEN"  # ❌ String mágica
)

# Use:
raise_2fa_invalid(attempts_remaining=2)  # ✅ Estruturado
```

## Implementação no Frontend

```typescript
import {
  parseErrorResponse,
  getErrorMessage,
} from "@/services/errors/ErrorCodes";

try {
  await api.post("/wallets/send", data);
} catch (error) {
  const parsed = parseErrorResponse(error);

  if (parsed?.requires_reauth) {
    // Abrir modal de 2FA
    setShow2FADialog(true);
  } else {
    // Mostrar erro amigável
    showError(parsed?.message || "Erro desconhecido");
  }
}
```

## Benefícios

1. **Previsível**: Frontend sabe exatamente o que fazer
2. **Manutenível**: Códigos centralizados, fácil adicionar novos
3. **Debugável**: Logs claros com códigos específicos
4. **Internacionalizável**: Mensagens podem ser traduzidas por código
5. **Versionável**: Novos códigos não quebram clientes antigos

## Migração Gradual

1. ✅ Criar `error_codes.py` no backend
2. ✅ Criar `ErrorCodes.ts` no frontend
3. ✅ Atualizar interceptor para usar nova estrutura
4. 🔄 Migrar endpoints gradualmente para usar `APIError`
5. 🔄 Migrar componentes para usar `parseErrorResponse`

## Status da Migração

| Endpoint            | Status      |
| ------------------- | ----------- |
| `/wallets/send`     | 🔄 Pendente |
| `/auth/login`       | 🔄 Pendente |
| `/wolkpay/bill/pay` | 🔄 Pendente |
| Interceptor API     | ✅ Migrado  |
