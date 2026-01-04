# 🔍 Diagnóstico: Erro 400 (Bad Request)

## 📊 Evolução do Erro

### ❌ ANTES:

```
POST /instant-trade/create 422 (Unprocessable Entity)
Causa: payment_method inválido ("bank_transfer" não existe)
```

### ✅ CORREÇÃO 1:

```
Mudamos: "bank_transfer" → "ted"
Resultado: 422 corrigido ✅
```

### ❌ AGORA:

```
POST /instant-trade/create 400 (Bad Request)
Causa: PROVÁVEL → Quote expirado ou não encontrado
```

## 🎯 Causa Raiz do 400

### Problema Identificado:

O erro 400 geralmente vem de **`ValidationError`** no backend. As causas mais prováveis são:

1. **Quote Expirado** (MAIS PROVÁVEL) ⏰

   - Quotes são válidos por apenas **30 segundos**
   - Se usuário demora para confirmar → quote expira
   - Código: `raise ValidationError("Quote has expired")`

2. **Quote Não Encontrado** 🔍

   - Quote ID não existe no cache
   - Código: `raise ValidationError("Quote not found or expired")`

3. **Validação de Valor** 💰
   - Valor fora dos limites (min: R$ 50, max: R$ 50.000)
   - Mas isso daria erro antes, no `/quote`

## 📝 Código Relevante

### Backend: `instant_trade_service.py` (linhas 170-184)

```python
def get_cached_quote(self, quote_id: str) -> Dict[str, Any]:
    """Get a cached quote by ID"""
    quote = _quote_cache.get(quote_id)
    if not quote:
        raise ValidationError("Quote not found or expired")  # ❌ 400

    # Check if expired
    expires_at = datetime.fromisoformat(quote.get("expires_at", ""))
    if expires_at < datetime.now():
        del _quote_cache[quote_id]
        raise ValidationError("Quote has expired")  # ❌ 400

    return quote
```

### Backend: `instant_trade_service.py` (linhas 185-245)

```python
def create_trade_from_quote(self, user_id: str, quote_id: str, payment_method: str):
    # Get the quote from cache
    quote = self.get_cached_quote(quote_id)  # ⬅️ AQUI QUE FALHA!

    # ... resto do código
```

## 🔧 Melhorias Aplicadas

### 1. Adicionado Logging no Router

**Arquivo**: `backend/app/routers/instant_trade.py`

```python
import logging

logger = logging.getLogger(__name__)

# ...

@router.post("/create")
async def create_trade(...):
    try:
        # ... código
        return response_data

    except Exception as e:
        logger.error(f"Error creating trade: {str(e)}")  # 🆕 LOG!
        error_detail = str(e)

        # Add more context to the error message
        if "Quote not found" in error_detail or "expired" in error_detail:
            error_detail = "Quote has expired. Please get a new quote and try again within 30 seconds."

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_detail,
        )
```

### 2. Mensagem de Erro Mais Clara

**ANTES:**

```json
{
  "detail": "Quote not found or expired"
}
```

**DEPOIS:**

```json
{
  "detail": "Quote has expired. Please get a new quote and try again within 30 seconds."
}
```

## 🧪 Como Reproduzir e Testar

### Cenário 1: Quote Expira Rápido (30s)

```
1. User: Get Quote → recebe quote_id
2. User: Espera 31 segundos ⏱️
3. User: Clica "Confirm"
4. Backend: ❌ 400 "Quote has expired"
```

### Cenário 2: Quote Válido (< 30s)

```
1. User: Get Quote → recebe quote_id
2. User: Clica "Confirm" RÁPIDO (< 30s) ⚡
3. Backend: ✅ 200 Trade criado com sucesso
```

### Cenário 3: Double Submit

```
1. User: Get Quote → recebe quote_id
2. User: Clica "Confirm" → Trade criado ✅
3. User: Clica "Confirm" NOVAMENTE
4. Backend: ❌ 400 "Quote not found" (já foi usado)
```

## 💡 Soluções Possíveis

### Solução 1: Aumentar Validade do Quote ⏰

**Arquivo**: `instant_trade_service.py` linha 38

```python
# ANTES
QUOTE_VALIDITY_SECONDS = 30

# DEPOIS (mais tempo para usuário)
QUOTE_VALIDITY_SECONDS = 60  # ou 90 ou 120
```

**Prós:**

- ✅ Usuário tem mais tempo para decidir
- ✅ Menos erros de expiração

**Contras:**

- ❌ Preço pode variar mais
- ❌ Risco maior de perda para plataforma

### Solução 2: Auto-Refresh do Quote (Frontend) 🔄

**Arquivo**: `ConfirmationPanel.tsx` ou `ConfirmationModal.tsx`

```typescript
useEffect(() => {
  if (!quote) return;

  // Se faltam menos de 10 segundos, busca novo quote
  const checkExpiration = setInterval(() => {
    const remaining = quote.expires_in_seconds - elapsed;
    if (remaining < 10) {
      // Auto-refresh quote
      getNewQuote();
    }
  }, 1000);

  return () => clearInterval(checkExpiration);
}, [quote]);
```

**Prós:**

- ✅ Transparente para usuário
- ✅ Sempre quote válido
- ✅ Preço sempre atual

**Contras:**

- ❌ Mais chamadas à API
- ❌ Preço pode mudar durante seleção

### Solução 3: Timer Visual + Warning ⚠️

**Arquivo**: `ConfirmationPanel.tsx`

```tsx
{
  remainingSeconds < 10 && (
    <div className="bg-red-50 border border-red-200 rounded p-2">
      <p className="text-red-600 text-xs">
        ⚠️ Quote expires in {remainingSeconds}s! Confirm now or get new quote.
      </p>
    </div>
  );
}
```

**Prós:**

- ✅ Usuário sabe que precisa ser rápido
- ✅ Não precisa aumentar validade
- ✅ Simples de implementar

**Contras:**

- ❌ Pode pressionar usuário
- ❌ UX pode ser ruim

## 🎯 Recomendação

**Melhor Solução**: **Combinação 1 + 3**

1. ✅ Aumentar validade para **60 segundos** (razoável)
2. ✅ Mostrar timer visual quando faltar < 15s
3. ✅ Mensagem clara quando expirar

## 📋 Checklist de Debug

Para confirmar que o erro é realmente quote expirado:

- [ ] Abrir Console do Browser (F12)
- [ ] Network Tab → Filter "instant-trade"
- [ ] Get Quote → ver `expires_in_seconds` na response
- [ ] Esperar > 30 segundos
- [ ] Clicar "Confirm"
- [ ] Ver resposta 400 no Network Tab
- [ ] Ver mensagem: "Quote has expired..."

**OU**

- [ ] Backend logs: `tail -f backend/logs/app.log`
- [ ] Ver linha: `Error creating trade: Quote has expired`

## 🚀 Próximos Passos

### Imediato:

1. **Confirmar** que erro 400 é de quote expirado
2. **Aumentar** `QUOTE_VALIDITY_SECONDS` de 30 para 60
3. **Testar** novamente

### Curto Prazo:

4. **Adicionar** timer visual no frontend
5. **Adicionar** warning quando < 15s
6. **Melhorar** UX do fluxo

### Médio Prazo:

7. **Implementar** auto-refresh inteligente
8. **Adicionar** retry automático
9. **Monitorar** taxa de expiração

## 📊 Logs Úteis

### Ver Logs do Backend:

```bash
# Ver últimas 100 linhas
tail -100 backend/logs/app.log

# Ver em tempo real
tail -f backend/logs/app.log

# Filtrar só erros
tail -f backend/logs/app.log | grep -i "error\|exception"

# Filtrar instant-trade
tail -f backend/logs/app.log | grep "instant-trade"
```

### Ver Logs do Frontend:

```javascript
// Console do browser
// Ver request completo
console.log("Quote:", quote);
console.log("Quote ID:", quote.quote_id);
console.log("Expires in:", quote.expires_in_seconds, "seconds");
```

## ✅ Resumo

**Erro 400 Atual:**

- ❌ Não é problema de payment_method (já corrigido)
- ✅ Provável: Quote expirado (> 30 segundos)
- ✅ Solução: Aumentar validade + timer visual

**Status:**

- ✅ Logging melhorado no backend
- ✅ Mensagem de erro mais clara
- ⏳ Aguardando confirmação do usuário
- ⏳ Depois: aumentar QUOTE_VALIDITY_SECONDS

**Teste Rápido:**

```
1. Get Quote
2. Confirmar IMEDIATAMENTE (< 5 segundos)
3. Se funcionar → era problema de expiração ✅
4. Se não funcionar → outro problema ❌
```
