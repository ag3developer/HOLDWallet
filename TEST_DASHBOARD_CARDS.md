# 🧪 Instruções de Teste - Dashboard Cards

## ✅ O que foi Implementado

Na página `/dashboard` (http://localhost:3000/dashboard), os cards de moedas agora mostram:

1. **Quantidade** - Quantas unidades da moeda você possui
2. **Preço Unitário** - Quanto custa uma unidade em USD
3. **Valor Total** - Quantidade × Preço em USD
4. **Valor Convertido** - Automaticamente converte para BRL/EUR conforme seleção

## 🚀 Como Testar

### 1. Preparar o Backend

```bash
# No terminal, vá para o diretório do backend
cd /Users/josecarlosmartins/Documents/HOLDWallet

# Iniciar o servidor backend
python -m uvicorn backend.app.main:app --reload
```

**Esperado:** Backend rodando em `http://localhost:8000`

### 2. Preparar o Frontend

```bash
# Em outro terminal, vá para o diretório do frontend
cd /Users/josecarlosmartins/Documents/HOLDWallet/Frontend

# Instalar dependências (se necessário)
npm install

# Iniciar o servidor frontend
npm run dev
```

**Esperado:** Frontend rodando em `http://localhost:3000`

### 3. Testar o Dashboard

#### Passo 1: Navegar para o Dashboard

```
1. Abra http://localhost:3000/dashboard
2. Faça login com suas credenciais
```

#### Passo 2: Verificar Saldo Total

```
1. No topo do dashboard, procure por "SALDO TOTAL"
2. Deve mostrar um valor em USD (não mais R$ 0,00)
3. Exemplo: $1.234,56 USD
```

#### Passo 3: Expandir Carteiras

```
1. Na seção "Suas Carteiras", clique em uma carteira
2. Ela deve expandir mostrando as redes disponíveis
3. Para cada rede, deve aparecer:
   - Quantidade de moedas (ex: 0.50 BTC)
   - Valor em USD (ex: $15.234,56)
```

#### Passo 4: Mudar Moeda

```
1. Vá para Settings (⚙️)
2. Procure por "Currency" ou "Moeda"
3. Mude de USD para BRL
4. Volte ao Dashboard
5. Os valores devem estar em BRL (multiplicados por 5)
   Exemplo:
   - USD: $1.000,00
   - BRL: R$ 5.000,00
```

#### Passo 5: Verificar Preços de Mercado

```
1. No painel direito, procure por "Mercado"
2. Deve mostrar preços de BTC, ETH, BNB, SOL, USDT
3. Deve atualizar automaticamente a cada 5 segundos
```

## 📋 Checklist de Validação

- [ ] Saldo total não mostra mais R$ 0,00
- [ ] Cada carteira mostra saldo correto
- [ ] Cada rede dentro da carteira mostra quantidade e valor
- [ ] Mudando para BRL, valores são multiplicados por 5
- [ ] Mudando para EUR, valores são multiplicados por 0.92
- [ ] Preços de mercado aparecem e atualizam

## 🔍 O que Você Deve Ver

### Exemplo 1: Bitcoin

```
Bitcoin                          Saldo
├─ Quantidade: 0.50 BTC
├─ Preço: $92.353,00 USD
└─ Total: $46.176,50 USD
```

### Exemplo 2: Ethereum

```
Ethereum                         Saldo
├─ Quantidade: 1.25 ETH
├─ Preço: $3.311,31 USD
└─ Total: $4.139,14 USD
```

### Exemplo 3: Com Múltiplas Moedas

```
SALDO TOTAL: $50.315,64 USD

Carteira: holdwallet
├─ Bitcoin:   0.50 BTC  →  $46.176,50
├─ Ethereum:  1.25 ETH  →  $4.139,14
└─ Total Carteira: $50.315,64
```

## ⚠️ Possíveis Problemas

### Problema 1: Ainda mostra R$ 0,00

**Solução:**

- Limpar cache do navegador (Ctrl+Shift+Delete)
- Recarregar a página (F5)
- Verificar se o backend está retornando `price_usd`

### Problema 2: Valores estão incorretos

**Solução:**

- Verificar logs do backend
- Confirmar que `price_usd` está sendo retornado
- Validar cálculo: `balance × price_usd`

### Problema 3: Moedas não mudam

**Solução:**

- Verificar se `formatCurrency()` está sendo chamado
- Verificar se `currency` está selecionado corretamente
- Limpar localStorage

## 📊 Dados Esperados do Backend

Quando você faz uma requisição para `/api/wallets/{wallet_id}/balances`, deve receber:

```json
{
  "wallet_id": "uuid-here",
  "wallet_name": "holdwallet",
  "balances": {
    "ethereum": {
      "network": "ethereum",
      "address": "0x...",
      "balance": "1.25",
      "price_usd": "3311.31",
      "balance_usd": "4139.14",
      "balance_brl": "20695.70",
      "last_updated": "2025-12-09T10:30:00"
    },
    "bitcoin": {
      "network": "bitcoin",
      "address": "1A1z7...",
      "balance": "0.50",
      "price_usd": "92353.00",
      "balance_usd": "46176.50",
      "balance_brl": "230882.50",
      "last_updated": "2025-12-09T10:30:00"
    }
  },
  "total_usd": "50315.64"
}
```

## 🐛 Debug

Se algo não funcionar, execute no console do navegador:

```javascript
// Checar dados do backend
fetch("/api/wallets/YOUR_WALLET_ID/balances")
  .then((r) => r.json())
  .then((d) => console.log(JSON.stringify(d, null, 2)));

// Checar se formatCurrency está funcionando
import { useCurrencyStore } from "@/stores/useCurrencyStore";
const store = useCurrencyStore();
console.log("Currency:", store.currency);
console.log("Formatted:", store.formatCurrency(1000));
```

## ✅ Testes Completos

Após validar, execute este checklist final:

- [ ] Backend retorna `price_usd` para cada rede
- [ ] Frontend calcula `balance × price_usd` corretamente
- [ ] `formatCurrency()` converte de USD para BRL/EUR
- [ ] Saldo total atualiza automaticamente
- [ ] Mudança de moeda funciona imediatamente
- [ ] Preços de mercado atualizam em tempo real
- [ ] Sem erros no console
- [ ] Performance é boa (carrega rápido)

## 🎉 Sucesso!

Se tudo funcionar como esperado, os cards do dashboard agora mostram:

✅ Quantidade de cada moeda
✅ Preço unitário em tempo real
✅ Valor total em USD/BRL/EUR
✅ Conversão de moedas automática
