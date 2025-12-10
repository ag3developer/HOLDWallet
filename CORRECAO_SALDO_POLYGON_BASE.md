# CORRECAO: Saldos Polygon e Base não aparecem no total

## Problema

Na página `/wallet`, saldos de Polygon (22.98 MATIC) e Base (0.002697) não estavam sendo somados.

## Causa Raiz

O backend estava retornando `balance_brl = "0.00"` para essas redes porque:

1. A API de preços (`price_aggregator`) falhava ou retornava preços vazios
2. Quando `price_data_brl = None`, o código fazia: `price_brl = Decimal('0')`
3. Resultado: `balance_brl = amount * 0 = "0.00"`

## Solução Implementada

### Mudança 1: Adicionar Fallback de Preços

**Arquivo:** `/backend/app/routers/wallets.py`

Adicionei um dicionário `fallback_prices_brl` com preços em BRL para todos os coins suportados:

```python
fallback_prices_brl = {
    "btc": Decimal("300000.00"),
    "eth": Decimal("12500.00"),
    "matic": Decimal("3.45"),
    "bnb": Decimal("2500.00"),
    ...
}
```

### Mudança 2: Usar Fallback quando API Falha

```python
# ANTES:
price_brl = Decimal(str(price_data_brl.price)) if price_data_brl else Decimal('0')

# DEPOIS:
price_brl = Decimal(str(price_data_brl.price)) if price_data_brl else fallback_prices_brl.get(symbol, Decimal('0'))
```

Agora se o preço não vem da API, usa o fallback ao invés de 0.

### Mudança 3: Logs Melhorados

Adicionei logs de debug detalhados:

- Logs de preços fetched
- Logs de qual símbolo está sendo processado
- Logs quando fallback é usado
- Logs do resultado final (balance_brl calculado)

## Como Testar

1. **Abra DevTools (F12)**

2. **Acesse a página de wallet:** http://localhost:3000/wallet

3. **Veja a console do backend** (ou rode):

   ```bash
   tail -f backend.log | grep "BALANCE DEBUG"
   ```

4. **Esperado:** Ver algo como:

   ```
   [BALANCE DEBUG] polygon: symbol=matic, native_balance=22.987624
   [BALANCE DEBUG] polygon: symbol=matic, price_brl=3.45, fallback_used=True
   [BALANCE DEBUG] polygon: balance_usd=X, balance_brl=79.25
   ```

5. **Resultado:** O total em BRL agora deve incluir Polygon, Base e outros saldos!

## Preços Fallback Usados

- BTC: R$ 300.000,00
- ETH: R$ 12.500,00
- MATIC: R$ 3,45
- BNB: R$ 2.500,00
- SOL: R$ 200,00
- E outros...

Se você quiser preços mais atualizados, abra `wallets.py` linhas 349-372 e atualize os valores.

## Próximas Melhorias Opcionais

1. Armazenar preços em cache mais agressivamente
2. Usar Redis para cache distribuído
3. Atualizar preços fallback periodicamente
4. Implementar endpoints de atualização de preços
