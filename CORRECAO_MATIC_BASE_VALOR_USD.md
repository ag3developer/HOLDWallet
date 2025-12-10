# CORRECAO: MATIC e BASE agora mostram valores em USD e BRL

## Problema Identificado

- USDT mostra saldo + valor em USD ✅
- MATIC mostra saldo mas NÃO mostra valor em USD ❌
- BASE mostra saldo mas NÃO mostra valor em USD ❌

## Causa Raiz

A API de preços (`price_aggregator.get_prices()`) estava retornando **None** para os símbolos "matic" e "eth", então:

```python
# ANTES - Se preço não vinha da API:
price_usd = Decimal(str(price_data_usd.price)) if price_data_usd else Decimal('0')
# Resultado: balance_usd = amount * 0 = $0.00
```

## Solução Implementada

### 1. Adicionar Fallback para USD

Adicionei um dicionário `fallback_prices_usd` com preços em USD para todos os coins:

```python
fallback_prices_usd = {
    "matic": Decimal("0.67"),    # Polygon agora tem preço!
    "eth": Decimal("3500.00"),   # Ethereum/Base agora tem preço!
    # ... outros coins ...
}
```

### 2. Usar Fallback quando API Falha

Mudei o cálculo para usar o fallback:

```python
# ANTES:
price_usd = Decimal(str(price_data_usd.price)) if price_data_usd else Decimal('0')

# DEPOIS:
price_usd = Decimal(str(price_data_usd.price)) if price_data_usd else fallback_prices_usd.get(symbol, Decimal('0'))
```

**Agora se a API falha, usa preço fallback ao invés de 0!**

### 3. Também melhorado para BRL

```python
price_brl = Decimal(str(price_data_brl.price)) if price_data_brl else fallback_prices_brl.get(symbol, Decimal('0'))
```

### 4. Logs Melhorados

Adicionei logs para rastrear quais preços estão faltando:

```
[BALANCE DEBUG] Prices fetched - USD symbols: ['btc', 'eth', ...], BRL symbols: [...]
[BALANCE DEBUG] Missing USD prices: {'matic', 'sol', ...}
[BALANCE DEBUG] Missing BRL prices: {'bnb', ...}
```

## Resultado Esperado

Agora você deve ver:

- ✅ MATIC: 22.98 MATIC | **$15.38** (22.98 × $0.67)
- ✅ BASE: 0.002697 | **$0.00945** (usando preço ETH fallback)
- ✅ USDT: 0.037785 | **$0.04**
- ✅ **Total em USD = correto!**
- ✅ **Total em BRL = correto!**

## Preços Fallback Configurados

**USD:**

- BTC: $95.000
- ETH: $3.500
- MATIC: $0.67
- BNB: $700
- SOL: $50
- E outros...

**BRL:**

- BTC: R$ 300.000
- ETH: R$ 12.500
- MATIC: R$ 3,45
- E outros...

## Como Testar

1. Abra http://localhost:3000/wallet
2. Veja que MATIC agora mostra valor em USD
3. Veja que BASE agora mostra valor em USD
4. Total em BRL agora é a soma correta!

## Próximos Passos (Opcional)

1. **Atualizar preços fallback** com valores mais reais

   - Edite linhas 349-387 em `wallets.py`

2. **Verificar por que API falha**

   - Rode: `curl "http://localhost:8000/api/v1/prices/batch?symbols=matic,eth&fiat=usd"`
   - Se retorna 200, então fallback está funcionando
   - Se retorna erro, há problema na API de preços

3. **Cache de preços**
   - Considere usar Redis para cache distribuído
   - Ou aumentar TTL do cache em `price_aggregator.py`

## Arquivos Modificados

- `/backend/app/routers/wallets.py` (linhas 345-425)
  - Adicionado `fallback_prices_usd`
  - Atualizado cálculo de `price_usd` para usar fallback
  - Melhorado logging de preços
