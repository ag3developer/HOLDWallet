# 🚀 BB-AUTO - Integração Frontend InstantTrade

## ✅ STATUS: IMPLEMENTAÇÃO CONCLUÍDA

**Data:** 10 de Janeiro de 2026  
**Arquivo Modificado:** `Frontend/src/pages/trading/components/ConfirmationPanel.tsx`

---

## 🎯 RESUMO

Foi adicionado o método de pagamento **BB-AUTO** (PIX Automático via Banco do Brasil) na página de InstantTrade.

Este novo método:

- ✅ Aparece em **destaque amarelo** na lista de métodos de pagamento
- ✅ Tem badge "Instantâneo" para indicar que é o método mais rápido
- ✅ Gera QR Code PIX automaticamente via API do BB
- ✅ Mostra tela dedicada com QR Code para pagamento
- ✅ Faz polling automático para verificar quando o pagamento foi confirmado
- ✅ **NÃO afeta os métodos existentes** (PIX, TED, Credit, Debit continuam funcionando normalmente)

---

## 📱 INTERFACE DO USUÁRIO

### Seleção de Método de Pagamento:

```
┌─────────────────────────────────────────────────────────────────────┐
│  Método de Pagamento                                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │⚡        │  │ 💵       │  │ 🏦       │  │ 💳       │  │ 💳     ││
│  │ BB-AUTO  │  │  PIX     │  │  TED     │  │ Credit   │  │ Debit  ││
│  │[Instant] │  │          │  │          │  │          │  │        ││
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └────────┘│
│    AMARELO       AZUL         AZUL          AZUL          AZUL      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Tela de QR Code PIX (quando BB-AUTO é selecionado):

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Voltar     ⚡ PIX Automático - Banco do Brasil                   │
│               Escaneie o QR Code ou copie o código para pagar       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│                    ┌────────────────┐                               │
│                    │                │                               │
│                    │   QR CODE      │                               │
│                    │   PIX BB       │                               │
│                    │                │                               │
│                    └────────────────┘                               │
│                                                                      │
│                      Valor a pagar                                   │
│                      R$ 103,25                                       │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│  Código PIX Copia e Cola:                                [📋 Copiar]│
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ 00020126580014br.gov.bcb.pix0136... (código PIX EMV)            ││
│  └─────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────┤
│  ⏰ Este PIX expira em 15 minutos                                    │
├─────────────────────────────────────────────────────────────────────┤
│  ⟳ Aguardando confirmação do pagamento...                           │
├─────────────────────────────────────────────────────────────────────┤
│  Trade ID: abc12345...                                               │
│  PIX TXID: WOLK2026000123                                           │
│  Você receberá: 0.00165432 BTC                                      │
├─────────────────────────────────────────────────────────────────────┤
│  🔒 Pagamento processado via API oficial do Banco do Brasil         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 FLUXO COMPLETO

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FLUXO BB-AUTO (PIX AUTOMÁTICO)                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Usuário solicita cotação → GET /instant-trade/quote                 │
│                    ↓                                                     │
│  2. Usuário seleciona "BB-AUTO" como método de pagamento                │
│                    ↓                                                     │
│  3. Usuário confirma → POST /instant-trade/create-with-pix              │
│                    ↓                                                     │
│  4. Backend cria trade + gera PIX via API BB                            │
│                    ↓                                                     │
│  5. Frontend mostra QR Code + código PIX                                │
│                    ↓                                                     │
│  6. Usuário paga PIX no app do banco                                    │
│                    ↓                                                     │
│  7. Banco do Brasil envia webhook → POST /webhooks/bb/pix               │
│                    ↓                                                     │
│  8. Backend confirma pagamento automaticamente                          │
│                    ↓                                                     │
│  9. Backend envia crypto para carteira do usuário                       │
│                    ↓                                                     │
│  10. Trade COMPLETED! ✅                                                │
│                                                                          │
│  ⏱️ Tempo total: ~30 segundos (automático!)                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 📝 ALTERAÇÕES NO CÓDIGO

### `ConfirmationPanel.tsx`:

1. **Imports adicionados:**

   - `Zap` (ícone do raio para BB-AUTO)
   - `QrCode` (ícone do QR Code)
   - `Copy`, `CheckCheck` (ícones para copiar)
   - `Shield` (ícone de segurança)

2. **Novo método de pagamento:**

```tsx
const BUY_PAYMENT_METHODS = [
  {
    id: "bb_auto",
    name: "BB-AUTO",
    icon: Zap,
    highlight: true,
    badge: "Instantâneo",
  },
  { id: "pix", name: "PIX", icon: Banknote },
  // ... outros métodos permanecem iguais
];
```

3. **Novos estados:**

```tsx
const [pixData, setPixData] = useState<{
  txid: string;
  qrcode: string;
  qrcode_image?: string;
  valor: string;
  expiracao_segundos: number;
} | null>(null);
const [pixCopied, setPixCopied] = useState(false);
const [pixStatus, setPixStatus] = useState<"pending" | "paid" | "expired">(
  "pending"
);
```

4. **Polling de status PIX:**

```tsx
// Verifica status a cada 5 segundos
useEffect(() => {
  if (!tradeCreated || selectedPayment !== "bb_auto" || pixStatus !== "pending")
    return;

  const checkPixStatus = async () => {
    const response = await apiClient.get(
      `/instant-trade/${tradeCreated}/pix-status`
    );
    if (response.data.pix_pago) {
      setPixStatus("paid");
      toast.success("Pagamento PIX confirmado!");
    }
  };

  const interval = setInterval(checkPixStatus, 5000);
  return () => clearInterval(interval);
}, [tradeCreated, selectedPayment, pixStatus]);
```

5. **Função createTrade modificada:**

   - Quando `selectedPayment === 'bb_auto'`, chama `/instant-trade/create-with-pix`
   - Armazena dados do PIX em `pixData`
   - Mostra interface de QR Code

6. **Interface de QR Code:**
   - Nova seção renderizada quando `pixData && selectedPayment === 'bb_auto'`
   - QR Code visual + código para copiar
   - Timer de expiração
   - Status de verificação automática

---

## ⚠️ IMPORTANTE

### Para ativar o BB-AUTO em produção:

1. **Renovar certificado e-CNPJ A1** (expirado em Nov/2024)
2. **Configurar credenciais no servidor DO:**
   ```env
   BB_ENVIRONMENT=production
   BB_CLIENT_ID=...
   BB_CLIENT_SECRET=...
   BB_GW_DEV_APP_KEY=...
   BB_PIX_KEY=24275355000151
   BB_WEBHOOK_URL=https://api.wolknow.com/webhooks/bb/pix
   BB_CERT_PATH=/app/certs/bb_certificate.crt
   BB_KEY_PATH=/app/certs/bb_private_key.key
   ```
3. **Copiar certificados para o servidor**
4. **Configurar webhook no Portal BB**

### Enquanto não estiver ativado:

- Os métodos PIX, TED, Credit e Debit **continuam funcionando normalmente**
- O BB-AUTO vai mostrar erro de conexão se alguém tentar usar (backend retorna erro)
- Quando o certificado for renovado, o BB-AUTO funcionará automaticamente

---

## 🧪 PARA TESTAR

1. Acessar página InstantTrade
2. Solicitar uma cotação (buy)
3. Na tela de confirmação, verificar que BB-AUTO aparece em amarelo destacado
4. Selecionar BB-AUTO e confirmar
5. Deve mostrar erro (até certificado ser renovado)
6. Voltar e testar com PIX normal → deve funcionar como antes

---

_Documento criado em: 10 de Janeiro de 2026_
