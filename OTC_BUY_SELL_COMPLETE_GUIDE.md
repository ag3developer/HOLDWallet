# 🔄 FLUXO COMPLETO: Compra e Venda OTC Instantâneo

## 📊 Visão Geral dos Dois Cenários

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HOLD WALLET OTC                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   COMPRA (BUY)                        VENDA (SELL)                          │
│   Usuário recebe crypto               Usuário envia crypto                  │
│   Plataforma recebe BRL               Plataforma envia BRL                  │
│                                                                             │
│   ┌─────────────────┐                 ┌─────────────────┐                   │
│   │ Platform Wallet │ ───────→       │ User Wallet     │ ───────→          │
│   │ (Private Key)   │  crypto        │ (Custodial Key) │  crypto           │
│   └─────────────────┘                 └─────────────────┘                   │
│          │                                   │                              │
│          ▼                                   ▼                              │
│   ┌─────────────────┐                 ┌─────────────────┐                   │
│   │ User Wallet     │                 │ Platform Wallet │                   │
│   │ (Blockchain)    │                 │ (Blockchain)    │                   │
│   └─────────────────┘                 └─────────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📗 CENÁRIO 1: COMPRA (BUY) - Usuário compra crypto

### Fluxo Visual

```
┌───────────────────────────────────────────────────────────────────┐
│                    USUÁRIO COMPRA 100 USDT                        │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1️⃣ Usuário cria ordem de compra                                 │
│      POST /instant-trade/create                                   │
│      Status: PENDING                                              │
│                     ↓                                             │
│  2️⃣ Usuário paga R$ 580 via TED/PIX                              │
│      Upload do comprovante                                        │
│                     ↓                                             │
│  3️⃣ ⭐ ADMIN verifica comprovante                                │
│      Página: /admin/trades/{trade_id}                            │
│      Clica: "Confirmar Pagamento"                                 │
│      Status: PAYMENT_CONFIRMED                                    │
│                     ↓                                             │
│  4️⃣ Sistema AUTOMATICAMENTE:                                     │
│      • Usa PLATFORM_WALLET_PRIVATE_KEY                           │
│      • Assina transação blockchain                               │
│      • Envia 100 USDT → User Wallet                              │
│      • Registra tx_hash                                          │
│      Status: COMPLETED                                            │
│                     ↓                                             │
│  ✅ CONCLUÍDO                                                     │
│                                                                   │
│  📌 CHAVE USADA: PLATFORM_WALLET_PRIVATE_KEY (da empresa)        │
│  📁 ARQUIVO: blockchain_deposit_service.py                        │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### Arquivos Envolvidos

- `backend/app/services/blockchain_deposit_service.py` - Serviço de depósito
- `backend/app/routers/admin/trades.py` - Endpoint `confirm-payment`
- `Frontend/src/pages/admin/AdminTradeDetailPage.tsx` - Botão "Confirmar Pagamento"

### Variáveis de Ambiente

```env
PLATFORM_WALLET_PRIVATE_KEY=0x...  # Chave privada da carteira da empresa
```

---

## 📕 CENÁRIO 2: VENDA (SELL) - Usuário vende crypto

### Fluxo Visual

```
┌───────────────────────────────────────────────────────────────────┐
│                    USUÁRIO VENDE 100 USDT                         │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1️⃣ Usuário cria ordem de venda                                  │
│      POST /instant-trade/create                                   │
│      Status: PENDING                                              │
│                     ↓                                             │
│  2️⃣ ⭐ ADMIN verifica e processa venda                           │
│      Página: /admin/trades/{trade_id}                            │
│      Clica: "Processar Venda"                                     │
│                     ↓                                             │
│  3️⃣ Sistema AUTOMATICAMENTE:                                     │
│      • Busca Address do usuário (com encrypted_private_key)      │
│      • Descriptografa chave privada CUSTODIAL do usuário         │
│      • Verifica saldo do usuário                                 │
│      • Transfere 100 USDT: User Wallet → Platform Wallet         │
│      • Registra tx_hash                                          │
│      Status: CRYPTO_RECEIVED                                      │
│                     ↓                                             │
│  4️⃣ ADMIN processa pagamento BRL                                 │
│      • Envia PIX/TED para conta bancária do usuário              │
│      • Valor: R$ 580 (fiat_amount)                               │
│                     ↓                                             │
│  5️⃣ ADMIN finaliza venda                                         │
│      Clica: "Finalizar Venda"                                     │
│      Status: COMPLETED                                            │
│                     ↓                                             │
│  ✅ CONCLUÍDO                                                     │
│                                                                   │
│  📌 CHAVE USADA: User.encrypted_private_key (custodial)          │
│  📁 ARQUIVO: blockchain_withdraw_service.py                       │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

### Arquivos Envolvidos (NOVOS)

- `backend/app/services/blockchain_withdraw_service.py` - **NOVO** Serviço de retirada
- `backend/app/routers/admin/trades.py` - Endpoints `process-sell` e `complete-sell`
- `Frontend/src/pages/admin/AdminTradeDetailPage.tsx` - Botões "Processar Venda" e "Finalizar Venda"

### Variáveis de Ambiente

```env
PLATFORM_WALLET_ADDRESS=0x...  # Endereço da carteira da empresa (destino das vendas)
ENCRYPTION_KEY=...             # Chave para descriptografar private keys dos usuários
```

---

## 🔑 Segurança: Onde Ficam as Chaves

### Chave da Plataforma (COMPRA)

```
Arquivo: .env
Variável: PLATFORM_WALLET_PRIVATE_KEY=0x...

Usado em: blockchain_deposit_service.py
Para: Enviar crypto da plataforma para usuários
```

### Chaves dos Usuários (VENDA - Custodial)

```
Banco de Dados: addresses.encrypted_private_key

Criptografada com: ENCRYPTION_KEY (Fernet)
Descriptografada em: crypto_service.decrypt_data()
Usada em: blockchain_withdraw_service.py
Para: Transferir crypto do usuário para a plataforma
```

---

## 🖥️ Interface Admin - Botões por Status

### Trade de COMPRA (BUY)

| Status            | Botão Disponível      | Ação                              |
| ----------------- | --------------------- | --------------------------------- |
| PENDING           | "Confirmar Pagamento" | Confirma pagamento + Envia crypto |
| PAYMENT_CONFIRMED | "Retry Depósito"      | Tenta novamente se falhou         |
| COMPLETED         | "Contabilidade"       | Registra fees                     |
| FAILED            | "Retry Depósito"      | Tenta novamente                   |

### Trade de VENDA (SELL) - **NOVO**

| Status          | Botão Disponível  | Ação                      |
| --------------- | ----------------- | ------------------------- |
| PENDING         | "Processar Venda" | Retira crypto do usuário  |
| CRYPTO_RECEIVED | "Finalizar Venda" | Confirma envio do PIX/TED |
| COMPLETED       | "Contabilidade"   | Registra fees             |

---

## 📊 Status do Trade

```
COMPRA (BUY):
PENDING → PAYMENT_CONFIRMED → COMPLETED
                           ↘ FAILED (retry disponível)

VENDA (SELL):
PENDING → CRYPTO_RECEIVED → COMPLETED
                         ↘ FAILED
```

### Novo Status Adicionado

- `CRYPTO_RECEIVED` - Crypto recebida da wallet do usuário, aguardando envio de PIX/TED

---

## 🧪 Como Testar

### 1. Teste de COMPRA (BUY)

```bash
# 1. Criar ordem de compra como usuário
POST /instant-trade/create
{
  "quote_id": "xxx",
  "payment_method": "ted"
}

# 2. Como admin, confirmar pagamento
POST /admin/trades/{trade_id}/confirm-payment
{
  "network": "polygon"
}

# Resultado esperado:
# - Crypto enviada para user wallet
# - tx_hash registrado
# - Status: COMPLETED
```

### 2. Teste de VENDA (SELL)

```bash
# 1. Criar ordem de venda como usuário
POST /instant-trade/create
{
  "quote_id": "xxx",
  "payment_method": "ted"
}

# 2. Como admin, processar venda
POST /admin/trades/{trade_id}/process-sell
{
  "network": "polygon"
}

# Resultado esperado:
# - Crypto retirada do user wallet
# - Enviada para platform wallet
# - Status: CRYPTO_RECEIVED

# 3. Como admin, finalizar após enviar PIX
POST /admin/trades/{trade_id}/complete-sell

# Resultado esperado:
# - Status: COMPLETED
```

---

## ⚠️ Importante

1. **Wallets Custodiais**: A plataforma guarda as chaves privadas dos usuários criptografadas. Isso permite movimentar os fundos sem necessidade de MetaMask.

2. **Segurança**: As chaves são criptografadas com Fernet (ENCRYPTION_KEY). Mantenha essa chave segura!

3. **Aprovação Manual**: Tanto COMPRA quanto VENDA requerem aprovação manual do admin. Não é automático.

4. **Ordem das Operações (SELL)**:

   - Primeiro retira a crypto do usuário
   - Depois envia o PIX/TED (processo externo)
   - Por último marca como COMPLETED

5. **Variáveis de Ambiente Necessárias**:
   ```env
   PLATFORM_WALLET_PRIVATE_KEY=0x...
   PLATFORM_WALLET_ADDRESS=0x...
   ENCRYPTION_KEY=...
   POLYGON_RPC_URL=https://...
   ```
