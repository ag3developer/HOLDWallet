# 🎯 TED/Bank Transfer - VISUAL GUIDE

## 📱 Fluxo Visual Completo

### TELA 1: Seleção de Método de Pagamento

```
┌────────────────────────────────────────┐
│  Confirm Trade                    [X]  │
├────────────────────────────────────────┤
│                                        │
│  Trade Summary                         │
│  ┌──────────────────────────────────┐  │
│  │ Operation: buy                   │  │
│  │ Crypto: USDT                     │  │
│  │ Amount: R$ 100.00                │  │
│  │ ────────────────────────────────│  │
│  │ Total: R$ 100.00                 │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Payment Method                        │
│  ┌────┬────┬────┬────┐                │
│  │PIX │TED │Card│Debt│                │
│  └────┴────┴────┴────┘                │
│          👆 SELECIONAR "TED"           │
│                                        │
│  [Cancel]          [Confirm]           │
└────────────────────────────────────────┘
```

### TELA 2: Modal de Instruções (NOVO! 🎉)

```
┌─────────────────────────────────────────────┐
│  Payment Instructions               [X]     │
├─────────────────────────────────────────────┤
│                                             │
│  🔵 Order Reference: OTC-2025-123456        │
│     Transfer R$ 100.00 and upload proof    │
│                                             │
│  Bank Account Details                       │
│  ┌────────────────────────────────────────┐ │
│  │ Bank: Banco do Brasil         📋 Copy │ │
│  │ CNPJ: 24.275.355/0001-51     📋 Copy │ │
│  │ Agency: 5271-0                📋 Copy │ │
│  │ Account: 26689-2              📋 Copy │ │
│  │ Holder: HOLD DIGITAL ASSETS   📋 Copy │ │
│  │ ───────────────────────────────────── │ │
│  │ PIX Key: 24.275.355/0001-51  📋 Copy │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  Upload Proof of Payment                    │
│  ┌────────────────────────────────────────┐ │
│  │          📤                             │ │
│  │     Click to upload                     │ │
│  │  (JPG, PNG or PDF - Max 5MB)           │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  ✓ Make the transfer                        │
│  ✓ Upload clear photo of receipt            │
│  ✓ Team verifies within 2-4 hours           │
│  ✓ Receive crypto once confirmed            │
│                                             │
│  [Cancel]              [📤 Upload Proof]    │
└─────────────────────────────────────────────┘
```

### TELA 3: Após Upload (Success)

```
┌─────────────────────────────────────────────┐
│  Payment Instructions               [X]     │
├─────────────────────────────────────────────┤
│                                             │
│  🟢 Payment proof uploaded successfully!    │
│     Awaiting confirmation from our team     │
│                                             │
│  Bank Account Details                       │
│  [... mesmos dados ...]                     │
│                                             │
│  Upload Proof of Payment                    │
│  ┌────────────────────────────────────────┐ │
│  │          ✅                             │ │
│  │  Payment proof uploaded successfully!   │ │
│  └────────────────────────────────────────┘ │
│                                             │
│  Status: PENDING (Awaiting confirmation)    │
│                                             │
│              [Close]                        │
└─────────────────────────────────────────────┘
```

## 🎨 Features do Modal

### 1. Copy Buttons (📋)

- Clique em qualquer campo
- Texto é copiado automaticamente
- Toast notification: "CNPJ copied to clipboard!"

### 2. Upload de Arquivo

- Aceita: JPG, PNG, PDF
- Tamanho máximo: 5MB
- Validação automática
- Preview do nome do arquivo

### 3. Instruções Claras

- ✓ Passo a passo
- ✓ Tempo estimado (2-4 horas)
- ✓ Status do pedido
- ✓ O que fazer depois

### 4. Dark Mode

- 🌙 Suporte completo a dark mode
- 🎨 Cores ajustadas automaticamente
- 🖤 Bordas e backgrounds adaptados

## 🔄 Estados do Pedido

### PENDING (Amarelo)

```
┌─────────────────────────────────┐
│ 🟡 Order Status: PENDING        │
│    Awaiting payment confirmation │
└─────────────────────────────────┘
```

### PAYMENT_CONFIRMED (Azul)

```
┌─────────────────────────────────┐
│ 🔵 Order Status: CONFIRMED      │
│    Processing crypto deposit     │
└─────────────────────────────────┘
```

### COMPLETED (Verde)

```
┌─────────────────────────────────┐
│ ✅ Order Status: COMPLETED      │
│    Crypto deposited successfully │
│    TX: 0xabc123...               │
└─────────────────────────────────┘
```

### FAILED (Vermelho)

```
┌─────────────────────────────────┐
│ ❌ Order Status: FAILED          │
│    Contact support               │
└─────────────────────────────────┘
```

## 📊 Dados Bancários (Copy & Paste)

### Para Transferência:

```
Banco: Banco do Brasil (001)
Agência: 5271-0
Conta: 26689-2
Titular: HOLD DIGITAL ASSETS LTDA
CNPJ: 24.275.355/0001-51
```

### Para PIX:

```
Chave PIX (CNPJ): 24.275.355/0001-51
Titular: HOLD DIGITAL ASSETS LTDA
```

## 🎯 Como o Admin Vê

### Admin Panel (Backend já pronto)

```
GET /admin/instant-trades/pending
Response:
[
  {
    "trade_id": "OTC-2025-123456",
    "user_email": "user@example.com",
    "payment_method": "ted",
    "total_amount": 100.00,
    "crypto_amount": 17.868,
    "symbol": "USDT",
    "status": "PENDING",
    "payment_proof_url": "https://...",
    "created_at": "2025-12-15T10:30:00"
  }
]
```

### Admin Confirma:

```
POST /admin/instant-trades/confirm-payment
{
  "trade_id": "OTC-2025-123456",
  "payment_proof_url": "https://..."
}

Response:
{
  "success": true,
  "trade": {
    "status": "COMPLETED",
    "tx_hash": "0xabc123...",
    "wallet_address": "0xuser...",
    "network": "Polygon"
  }
}
```

## ✅ Checklist de Teste

### Frontend:

- [ ] Refresh da página
- [ ] Ir para Trading → Buy
- [ ] Entrar R$ 100
- [ ] Get Quote
- [ ] Selecionar "Bank" (último botão)
- [ ] Clicar "Confirm"
- [ ] ✅ DEVE abrir modal com dados bancários
- [ ] Clicar em "Copy" em cada campo
- [ ] ✅ DEVE copiar e mostrar toast
- [ ] Clicar "Click to upload"
- [ ] Selecionar arquivo JPG/PNG
- [ ] Clicar "Upload Proof"
- [ ] ✅ DEVE mostrar success e status PENDING

### Backend:

- [ ] Verificar log: `tail -f backend.log`
- [ ] Ver trade criado: `GET /instant-trade/orders`
- [ ] Status deve ser "PENDING"
- [ ] payment_method deve ser "ted"

### Admin:

- [ ] Listar pending: `GET /admin/instant-trades/pending`
- [ ] Ver proof_url registrado
- [ ] Confirmar: `POST /admin/instant-trades/confirm-payment`
- [ ] ✅ DEVE depositar crypto automaticamente

## 🚀 PRONTO PARA TESTAR!

**Refresh a página e testa o fluxo de compra com "Bank"!** 🎉

Agora quando o user escolher "Bank":

1. ✅ Não dá erro 422
2. ✅ Mostra dados bancários completos
3. ✅ Permite upload de comprovante
4. ✅ Fica como PENDING aguardando confirmação
5. ✅ Admin pode aprovar pelo backend
6. ✅ Sistema deposita crypto automaticamente

**Tudo funcionando! 🎊**
