# 🧪 GUIA RÁPIDO DE TESTES - OTC INSTANT TRADE

## ✅ PRÉ-REQUISITOS

1. **Backend rodando**

   ```bash
   cd backend
   python -m uvicorn app.main:app --reload
   # Deve estar em http://127.0.0.1:8000
   ```

2. **Frontend rodando**

   ```bash
   cd Frontend
   npm run dev
   # Deve estar em http://localhost:3000
   ```

3. **Banco de dados**
   - SQLite com tabelas `instant_trades` e `instant_trade_history`
   - Executar migrations se necessário

---

## 🚀 TESTE 1: BACKEND - GET QUOTE

### Teste via cURL:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/instant-trade/quote \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "buy",
    "symbol": "BTC",
    "fiat_amount": 1000
  }'
```

### Resposta esperada:

```json
{
  "quote_id": "quote_abc123...",
  "operation": "buy",
  "symbol": "BTC",
  "crypto_price": 300000.0,
  "fiat_amount": 1000.0,
  "crypto_amount": 0.00335832,
  "spread_percentage": 3.0,
  "spread_amount": 30.0,
  "network_fee_percentage": 0.25,
  "network_fee_amount": 2.5,
  "total_amount": 1032.5,
  "expires_in_seconds": 30
}
```

---

## 🚀 TESTE 2: FRONTEND - PÁGINA OTC

### 1. Acessar página

```
http://localhost:3000/instant-trade
```

### 2. Testar fluxo de compra:

- [ ] Página carrega sem erros
- [ ] Toggle "Buy" e "Sell" funciona
- [ ] Seleção de criptomoeda muda
- [ ] Input de valor aceita números
- [ ] Botão "Get Quote" fica habilitado quando há valor

### 3. Clicar "Get Quote"

- [ ] Loading spinner aparece
- [ ] Quote retorna com sucesso
- [ ] Mostra preço, spread, fees, total
- [ ] Mostra "Quote valid for 30 seconds"

### 4. Clicar "Continue Purchase"

- [ ] Modal de confirmação abre
- [ ] Mostra todos os detalhes
- [ ] Mostra seletor de método de pagamento
- [ ] PIX está selecionado por padrão

### 5. Clicar "Confirm"

- [ ] Loading spinner aparece
- [ ] Sucesso: toast com "Trade created: OTC-2025-XXXXXX"
- [ ] Modal fecha
- [ ] Form limpa e reseta

### 6. Testar fluxo de venda

- [ ] Repetir testes com "Sell" em vez de "Buy"
- [ ] Verificar que input muda para quantidade em crypto

---

## 🚀 TESTE 3: VALIDAÇÕES

### Teste de erro - Quote inválida:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/instant-trade/quote \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "buy",
    "symbol": "INVALID",
    "fiat_amount": 1000
  }'
```

**Esperado:** Erro 400 com mensagem de criptomoeda não suportada

### Teste de erro - Amount mínimo:

```bash
curl -X POST http://127.0.0.1:8000/api/v1/instant-trade/quote \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "buy",
    "symbol": "BTC",
    "fiat_amount": 10
  }'
```

**Esperado:** Erro de amount mínimo (R$ 50)

---

## 🚀 TESTE 4: BANCO DE DADOS

### Verificar se trade foi criado:

```bash
# Acessar banco SQLite
sqlite3 backend/holdwallet.db

# Ver trades
SELECT * FROM instant_trades;

# Ver histórico
SELECT * FROM instant_trade_history;
```

### Campos esperados em `instant_trades`:

- `id` - UUID único
- `user_id` - ID do usuário (null em teste)
- `operation_type` - 'buy' ou 'sell'
- `symbol` - 'BTC', 'ETH', etc
- `fiat_amount` - Valor em BRL
- `crypto_amount` - Quantidade de crypto
- `spread_amount` - Valor do spread
- `network_fee_amount` - Valor da taxa
- `total_amount` - Total com taxas
- `reference_code` - 'OTC-2025-XXXXXX'
- `status` - 'pending'
- `created_at` - Timestamp
- `expires_at` - Timestamp (criação + 15 min)

---

## 🎯 CHECKLIST DE TESTES

### Backend

- [ ] Quote retorna com cálculos corretos
- [ ] Spread de 3% aplicado
- [ ] Network fee de 0.25% aplicado
- [ ] Trade criado no DB
- [ ] Reference code único gerado
- [ ] User relationship funciona

### Frontend

- [ ] Página carrega sem erros
- [ ] API call funciona
- [ ] Quote exibido corretamente
- [ ] Modal de confirmação abre
- [ ] Trade criado com sucesso
- [ ] Feedback visual (loading, toast)
- [ ] Design responsivo (mobile/desktop)
- [ ] Dark mode funciona

### UX/UI

- [ ] Sem emojis (apenas icons)
- [ ] Layout limpo e profissional
- [ ] Transições suaves
- [ ] Cores consistentes (green buy, red sell)
- [ ] Tipografia legível
- [ ] Espaçamento adequado

---

## 🐛 TROUBLESHOOTING

### Erro: "Failed to fetch"

- [ ] Backend está rodando em http://127.0.0.1:8000?
- [ ] CORS está configurado em main.py?
- [ ] Firewall bloqueando porta 8000?

### Erro: "Quote not found"

- [ ] Quote ID está sendo passado?
- [ ] Quote expirou (> 30s)?

### Erro: "Trade creation failed"

- [ ] Database accessible?
- [ ] Tabelas criadas?
- [ ] user_id passado?

### Frontend não carrega API

- [ ] Verificar console (F12 > Network)
- [ ] Verificar resposta da API
- [ ] Verificar CORS headers

---

## 📊 DADOS DE TESTE

### Criptomoedas

```
BTC - R$ 300.000,00
ETH - R$ 12.500,00
USDT - R$ 5,00
SOL - R$ 500,00
ADA - R$ 2,50
AVAX - R$ 140,00
```

### Exemplo: Compra de BTC

```
Desejo: R$ 1.000,00
Spread (3%): R$ 30,00
Fee (0.25%): R$ 2,50
Total: R$ 1.032,50
Recebo: 0.00335832 BTC
```

### Exemplo: Venda de BTC

```
Tenho: 0.01 BTC
Preço: R$ 300.000,00
Bruto: R$ 3.000,00
Spread (3%): -R$ 90,00
Fee (0.25%): -R$ 7,50
Recebo: R$ 2.902,50
```

---

## ✅ TESTE COMPLETO (5 min)

1. Abrir frontend: http://localhost:3000/instant-trade
2. Selecionar "Buy"
3. Escolher "BTC"
4. Digitar "1000"
5. Clicar "Get Quote"
6. Verificar que quote aparece
7. Clicar "Continue Purchase"
8. Clicar "Confirm"
9. Verificar toast de sucesso
10. Verificar DB com `SELECT * FROM instant_trades`

Se tudo passar = ✅ **SUCESSO!**

---

**Desenvolvido por:** GitHub Copilot
**Data:** 7 de dezembro de 2025
**Status:** Pronto para testes
