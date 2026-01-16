# 🔄 Novo Fluxo de Envio de Transação

## ❌ Fluxo Antigo (ERRADO)

```
1. Usuário clica "Enviar"
2. Frontend pede biometria/2FA imediatamente
3. Frontend envia para /wallets/send
4. Backend descobre que não tem saldo
5. Erro 503 - Token biométrico desperdiçado!
```

## ✅ Novo Fluxo (CORRETO)

```
1. Usuário preenche dados da transação (destino, valor, rede)
2. Frontend chama POST /v1/wallets/validate-send
3. Backend verifica na BLOCKCHAIN:
   - Saldo real suficiente?
   - Gas disponível?
   - Endereço válido?
4. Se válido → Frontend pede biometria/2FA
5. Se inválido → Frontend mostra erro ANTES da biometria
6. Com biometria OK → Frontend chama POST /v1/wallets/send
```

## 📡 Novo Endpoint: POST /v1/wallets/validate-send

### Request

```json
{
  "wallet_id": "991be417-9dd8-4879-8ddd-09a3a1d4466e",
  "to_address": "0x93aa6710b3bdaa3df857cb5f0b1db3ee17ec33c1",
  "amount": "5",
  "network": "polygon",
  "fee_level": "standard",
  "token_symbol": null // ou "USDT", "USDC" para tokens
}
```

### Response - Sucesso

```json
{
  "valid": true,
  "message": "Transação pode ser realizada",
  "from_address": "0xd9f66cae72550eba2552c46dd22038c12aa0d935",
  "to_address": "0x93aa6710b3bdaa3df857cb5f0b1db3ee17ec33c1",
  "amount": "5",
  "balance": "3639.92",
  "gas_estimate": "0.008",
  "total_required": "5.008",
  "remaining_after": "3634.912",
  "network": "polygon",
  "requires_auth": true
}
```

### Response - Saldo Insuficiente

```json
{
  "valid": false,
  "error": "INSUFFICIENT_BALANCE",
  "message": "Saldo insuficiente de MATIC",
  "balance": "0",
  "amount": "5",
  "gas_estimate": "0.008",
  "total_required": "5.008",
  "shortfall": "5.008"
}
```

### Response - Sem Gas

```json
{
  "valid": false,
  "error": "INSUFFICIENT_GAS",
  "message": "Saldo insuficiente de MATIC para gas",
  "balance": "0.001",
  "gas_required": "0.008",
  "native_symbol": "MATIC"
}
```

## 🔧 Implementação no Frontend

### Antes (ERRADO)

```typescript
async function handleSend() {
  // ❌ Pede biometria ANTES de validar
  const biometricToken = await requestBiometric();

  // ❌ Só descobre o erro depois
  const result = await api.post("/wallets/send", {
    ...transactionData,
    two_factor_token: biometricToken,
  });
}
```

### Depois (CORRETO)

```typescript
async function handleSend() {
  // ✅ PRIMEIRO: Validar na blockchain
  setLoading(true);
  setStatus("Verificando saldo na blockchain...");

  const validation = await api.post("/wallets/validate-send", {
    wallet_id: walletId,
    to_address: toAddress,
    amount: amount,
    network: network,
    token_symbol: tokenSymbol,
  });

  // ✅ Se inválido, mostrar erro e NÃO pedir biometria
  if (!validation.data.valid) {
    setError(validation.data.message);
    setLoading(false);
    return;
  }

  // ✅ Mostrar resumo da transação
  setTransactionSummary({
    balance: validation.data.balance,
    gasEstimate: validation.data.gas_estimate,
    totalRequired: validation.data.total_required,
    remainingAfter: validation.data.remaining_after,
  });

  // ✅ SÓ AGORA pedir biometria
  setStatus("Confirme com biometria...");
  const biometricToken = await requestBiometric();

  if (!biometricToken) {
    setError("Biometria cancelada");
    setLoading(false);
    return;
  }

  // ✅ Enviar transação
  setStatus("Enviando transação...");
  const result = await api.post("/wallets/send", {
    wallet_id: walletId,
    to_address: toAddress,
    amount: amount,
    network: network,
    fee_level: feeLevel,
    mode: "custodial",
    two_factor_token: biometricToken,
    token_symbol: tokenSymbol,
  });

  if (result.data.success) {
    setSuccess(`Transação enviada! Hash: ${result.data.tx_hash}`);
  }
}
```

## 🎯 Benefícios do Novo Fluxo

1. **UX Melhor**: Usuário só confirma biometria se a transação for possível
2. **Menos Erros**: Validação clara antes de comprometer autenticação
3. **Tokens Preservados**: Biometric tokens não são desperdiçados
4. **Feedback Claro**: Usuário sabe exatamente porque não pode enviar
5. **Segurança**: Consulta saldo REAL na blockchain, não cache

## 📋 Códigos de Erro

| Código                       | Significado                       |
| ---------------------------- | --------------------------------- |
| `WALLET_NOT_FOUND`           | Carteira não existe               |
| `NO_ADDRESS_FOR_NETWORK`     | Sem endereço para esta rede       |
| `INVALID_TO_ADDRESS`         | Endereço de destino inválido      |
| `NETWORK_UNAVAILABLE`        | Não conectou à blockchain         |
| `TOKEN_NOT_SUPPORTED`        | Token não suportado nesta rede    |
| `BALANCE_CHECK_FAILED`       | Erro ao consultar blockchain      |
| `INSUFFICIENT_BALANCE`       | Saldo insuficiente (moeda nativa) |
| `INSUFFICIENT_TOKEN_BALANCE` | Saldo insuficiente (token)        |
| `INSUFFICIENT_GAS`           | Sem gas para pagar transação      |
| `VALIDATION_FAILED`          | Erro genérico de validação        |

## 🔐 Ordem das Chamadas

```
1. POST /v1/wallets/validate-send  (sem auth token)
   ↓
2. Se valid=true → Pedir biometria/2FA ao usuário
   ↓
3. POST /v1/wallets/send (com two_factor_token)
```

---

_Atualizado: 16 de Janeiro de 2026_
