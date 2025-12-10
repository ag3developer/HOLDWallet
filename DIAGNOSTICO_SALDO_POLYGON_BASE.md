# Diagnóstico: Saldos Polygon e Base não estão sendo somados

## Problema Identificado

Na página `/wallet`, o saldo total mostrado é **R$ 0,20**, mas você tem:

- **MATIC (Polygon): 22.987624**
- **BASE: 0.002697**
- **USDT**: algum saldo
- Outros ativos

**O problema é que Polygon e Base estão retornando `balance_brl = "0.00"`**

## Causa Provável

Existem 3 causas possíveis:

### 1. **Preço BRL não está sendo retornado da API**

- A `price_aggregator.get_prices(symbols, "brl")` pode estar retornando `None` para "matic" ou "eth"
- Quando `price_data_brl = None`, o código faz: `price_brl = Decimal('0')`
- Resultado: `balance_brl = amount * 0 = 0`

### 2. **Saldo nativo (native_balance) está sendo retornado como 0 ou vazio**

- Se `blockchain_service.get_address_balance()` retorna `native_balance = "0"`
- Então aquele network é pulado completamente

### 3. **Símbolo de rede está mapeado errado**

- Base é mapeado para "eth" no backend
- Polygon é mapeado para "matic"
- Se o `price_aggregator` não tem esses símbolos, retorna None

## Como Investigar

### Passo 1: Verificar os logs do backend

```
tail -f backend.log | grep "BALANCE DEBUG"
```

Você verá algo como:

```
[BALANCE DEBUG] Prices fetched - USD: ['btc', 'eth', 'matic'], BRL: ['btc', 'eth', 'matic']
[BALANCE DEBUG] Price BRL - matic: 3.45
[BALANCE DEBUG] polygon: symbol=matic, native_balance=22.987624
[BALANCE DEBUG] polygon: price_brl=3.45, price_data_brl=PriceData(...)
[BALANCE DEBUG] polygon: balance_usd=X, balance_brl=Y
```

### Passo 2: Verificar a resposta da API

Abra o DevTools (F12) → Network tab → procure por:

```
GET /wallets/{id}/balances?include_tokens=true
```

Verifique a resposta JSON. Procure por:

```json
{
  "balances": {
    "polygon": {
      "balance": "22.987624",
      "balance_brl": "0.00" // <-- AQUI DEVE SER O VALOR EM REAIS
    }
  }
}
```

### Passo 3: Testar o price_aggregator diretamente

```bash
curl "http://localhost:8000/api/v1/prices/batch?symbols=matic,eth&fiat=brl"
```

Resposta esperada:

```json
{
  "matic": { "price": 3.45, "currency": "brl" },
  "eth": { "price": 12500.0, "currency": "brl" }
}
```

## Solução

### Se o problema é preço faltando:

Verifique o arquivo `backend/app/services/price_aggregator.py`:

- Ensure que "matic" e "eth" estão sendo buscados do CoinGecko
- Se não, adicione mapeamento de símbolo

### Se o problema é saldo nativo vindo como 0:

Verifique `backend/app/services/blockchain_service.py`:

- Método `get_address_balance()`
- Checa se as chamadas RPC para Polygon e Base estão funcionando

### Se o problema é no frontend:

Verifique `Frontend/src/pages/wallet/WalletPage.tsx`:

- Linha 331: `const totalBalanceBRL = walletsWithAddresses.reduce((sum, wallet) => sum + wallet.balanceBRL, 0)`
- Adicione console.log para ver quais wallets estão sendo somadas

## Próximos Passos

1. Ative os logs no backend (já foi feito com `[BALANCE DEBUG]`)
2. Faça uma requisição para `/wallets/{id}/balances`
3. Compartilhe os logs do backend
4. Compartilhe a resposta JSON da API
5. Testar o endpoint `/api/v1/prices/batch` direto

Isso vai nos mostrar exatamente em qual etapa o valor está virando 0.
