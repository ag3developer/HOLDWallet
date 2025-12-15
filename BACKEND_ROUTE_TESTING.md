# 🔍 TESTE DE ROTAS DO BACKEND

## Rotas Possíveis para Testar

Execute estes comandos para descobrir a rota correta:

### Teste 1: Sem /api

```bash
curl -X POST https://api.wolknow.com/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'
```

### Teste 2: Sem /v1

```bash
curl -X POST https://api.wolknow.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'
```

### Teste 3: Sem nada (root)

```bash
curl -X POST https://api.wolknow.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'
```

### Teste 4: Com domain diferente

```bash
curl -X POST https://wolknow.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'
```

### Teste 5: Localhost (se estiver local)

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'
```

## Qual resposta significa que funcionou?

### ✅ Sucesso (200):

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {...}
}
```

### ⚠️ Credenciais Inválidas (401):

```json
{
  "detail": "Invalid credentials",
  "code": "INVALID_CREDENTIALS"
}
```

### ❌ Erro do Servidor (500):

```json
{
  "detail": "Internal server error",
  "code": "INTERNAL_SERVER_ERROR"
}
```

### ❌ Rota Não Encontrada (404):

```
404 Not Found
```

## Arquivos para Verificar

### `Frontend/src/config/app.ts`

```typescript
export const APP_CONFIG = {
  api: {
    baseUrl: "https://api.wolknow.com/api/v1", // ← VERIFICAR ISTO
  },
};
```

### `backend/app.py` ou `backend/main.py`

```python
# Procure por:
app = FastAPI(
    root_path="/api/v1"  # ← Pode estar aqui
)
# ou
@app.post("/auth/login")  # ← Path da rota
```

## Próximas Ações

1. ✅ Execute os 5 testes acima
2. ✅ Anote qual funcionou (se algum funcionou)
3. ✅ Atualize o `app.ts` com a URL correta
4. ✅ Faça redeploy do frontend
5. ✅ Teste novamente

---

**Gerado:** 14 de dezembro de 2025
**Status:** Aguardando teste de rotas
