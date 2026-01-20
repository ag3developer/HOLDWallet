# 🔐 Sistema de 2FA Ob### Operações Admin (Requer X-2FA-Code)

| Método          | Rota                                        | Descrição                    |
| --------------- | ------------------------------------------- | ---------------------------- | -------------- |
| POST            | `/api/admin/instant-trades/confirm-payment` | Aprovar trade OTC **MANUAL** |
| POST            | `/api/admin/wolkpay/*`                      | WolkPay aprovação **MANUAL** |
| POST/DELETE     | `/api/admin/wallets/*`                      | Bloquear/Deletar carteiras   |
| POST            | `/api/admin/wallets/blacklist/*`            | Gerenciar blacklist          |
| POST/PUT/DELETE | `/api/admin/users/*`                        | Gerenciar usuários           |
| PUT/POST        | `/api/admin/settings/*`                     | Alterar configurações        | o - HOLDWallet |

## Resumo de Segurança Implementado

Após o incidente de segurança de **R$ 66.627,00** em trades fraudulentos, implementamos múltiplas camadas de proteção:

### ✅ Camada 1: API Protection (Já Ativo)

- Bloqueia scripts/bots (`okhttp`, `curl`, `python-requests`)
- Bloqueia IPs suspeitos
- Restringe rotas admin a IPs brasileiros
- Desabilita `/docs` em produção

### ✅ Camada 2: 2FA Obrigatório (NOVO)

- **Todas operações admin** requerem código 2FA
- **Transações > R$ 1.000** requerem 2FA ou biometria

---

## 🛡️ Rotas Protegidas por 2FA

### Operações Admin (Requer X-2FA-Code)

| Método          | Rota                                        | Descrição                    |
| --------------- | ------------------------------------------- | ---------------------------- |
| POST            | `/api/admin/instant-trades/confirm-payment` | Aprovar trade OTC **MANUAL** |
| POST            | `/api/admin/wolkpay/*`                      | WolkPay aprovação **MANUAL** |
| POST/PUT/DELETE | `/api/admin/users/*`                        | Gerenciar usuários           |
| PUT/POST        | `/api/admin/settings/*`                     | Alterar configurações        |

### Transações de Alto Valor (> R$ 1.000)

| Método | Rota                        | Descrição       |
| ------ | --------------------------- | --------------- |
| POST   | `/api/wallets/send`         | Enviar crypto   |
| POST   | `/api/instant-trade/create` | Criar trade OTC |
| POST   | `/api/p2p/order`            | Criar ordem P2P |

---

## ✅ Rotas ISENTAS de 2FA (Automáticas)

> **IMPORTANTE**: O fluxo automático de PIX **NÃO É AFETADO**.

| Rota                  | Descrição                            |
| --------------------- | ------------------------------------ |
| `/webhooks/*`         | Todos os webhooks (BB, Stripe, etc)  |
| `/callback/*`         | Callbacks de pagamento               |
| `/wolkpay/checkout/*` | Checkout público WolkPay (não admin) |
| `/health`             | Health checks                        |

### Fluxo PIX Automático - OTC (SEM 2FA)

```
Cliente paga PIX
       ↓
BB envia webhook → POST /webhooks/bb/pix
       ↓
Sistema detecta pagamento (automático)
       ↓
Crypto enviada automaticamente
       ↓
✅ Trade OTC completado
```

### Fluxo PIX Automático - WolkPay (SEM 2FA)

```
Pagador acessa link → /wolkpay/checkout/{token}
       ↓
Gera PIX → /wolkpay/checkout/{token}/pay
       ↓
Pagador paga PIX
       ↓
BB envia webhook → POST /webhooks/bb/pix
       ↓
WolkPay detecta pagamento (automático)
       ↓
✅ Invoice paga automaticamente
```

**Ambos os fluxos são server-to-server, não passam pelo 2FA.**

---

## 📱 Como Integrar no Frontend

### 1. Configurar 2FA (Google Authenticator/Authy)

```typescript
// Endpoint para obter QR Code
const setup2FA = async () => {
  const response = await api.post("/auth/2fa/setup");
  return {
    qrCode: response.data.qr_code, // Base64 da imagem QR
    secret: response.data.secret, // Código manual
    backupCodes: response.data.backup_codes, // Códigos de backup
  };
};

// Endpoint para verificar e ativar
const verify2FA = async (code: string) => {
  const response = await api.post("/auth/2fa/verify", { code });
  return response.data.success;
};
```

### 2. Incluir Código 2FA nas Requisições Críticas

```typescript
// Para operações admin ou alto valor
const approveTradeWithout2FA = async (tradeId: string, code: string) => {
  return api.post(
    `/api/admin/instant-trades/confirm-payment`,
    {
      trade_id: tradeId,
    },
    {
      headers: {
        "X-2FA-Code": code, // ← OBRIGATÓRIO
      },
    },
  );
};

// Ou com biometria
const sendCryptoWithBiometric = async (data: any, biometricToken: string) => {
  return api.post("/api/wallets/send", data, {
    headers: {
      "X-Biometric-Token": biometricToken, // ← Alternativa ao 2FA
    },
  });
};
```

### 3. Modal de 2FA no Frontend

```typescript
// Componente de modal 2FA
const TwoFactorModal = ({ onSubmit, isOpen }) => {
  const [code, setCode] = useState('');

  return (
    <Modal isOpen={isOpen}>
      <h2>🔐 Verificação de Segurança</h2>
      <p>Digite o código do seu Google Authenticator/Authy:</p>
      <input
        type="text"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="000000"
      />
      <button onClick={() => onSubmit(code)}>Verificar</button>
    </Modal>
  );
};
```

---

## 🔄 Fluxo de Operação Admin

```
Admin faz login
       ↓
Acessa painel admin
       ↓
Clica "Aprovar Trade"
       ↓
   [2FA habilitado?]
       ↓
    ┌──┴──┐
   Não   Sim
    ↓     ↓
  ERRO   Modal 2FA
    ↓     ↓
Forçar  Digita código
Setup    ↓
         ↓
   [Código válido?]
       ↓
    ┌──┴──┐
   Não   Sim
    ↓     ↓
  ERRO   ✅ Operação
 Retry   executada
```

---

## 📋 Respostas da API

### Erro: 2FA não habilitado

```json
{
  "detail": "Two-factor authentication must be enabled for admin operations.",
  "code": "2FA_REQUIRED_NOT_ENABLED",
  "setup_url": "/settings/security/2fa"
}
```

### Erro: Código 2FA não enviado

```json
{
  "detail": "Two-factor authentication code required for this operation",
  "code": "2FA_CODE_REQUIRED",
  "hint": "Include X-2FA-Code header with your authenticator code"
}
```

### Erro: Código 2FA inválido

```json
{
  "detail": "Invalid two-factor authentication code",
  "code": "INVALID_2FA_CODE"
}
```

### Erro: Transação alto valor sem verificação

```json
{
  "detail": "Transactions above R$ 1000.00 require 2FA or biometric verification",
  "code": "HIGH_VALUE_2FA_REQUIRED",
  "threshold": 1000.0,
  "transaction_value": 5000.0
}
```

---

## 🔒 Configuração Recomendada para admin@wolknow.com

1. **Acesse** `/settings/security/2fa`
2. **Escaneie** o QR Code com Google Authenticator ou Authy
3. **Guarde** os códigos de backup em local seguro
4. **Ative** o 2FA

Depois de ativado:

- Todo trade aprovado precisará do código de 6 dígitos
- Impossível aprovar trades por scripts/bots
- Mesmo com senha vazada, atacante não consegue operar

---

## 📊 Impacto no Incidente de Segurança

**Se 2FA estivesse ativo:**

- ❌ Atacante não conseguiria aprovar nenhum trade
- ❌ Mesmo com credenciais de admin, sem código do seu celular = acesso negado
- ✅ R$ 66.627,00 teriam sido protegidos

---

## 🚀 Deploy

O middleware já está integrado em `/backend/app/main.py`:

```python
from app.middleware.mandatory_2fa import Mandatory2FAMiddleware, TransactionValueMiddleware

# Middlewares adicionados na ordem correta
app.add_middleware(Mandatory2FAMiddleware)
app.add_middleware(TransactionValueMiddleware)
```

Após reiniciar o backend, todas as operações críticas exigirão 2FA automaticamente.

---

**Data:** 2025-01-19
**Autor:** Sistema de Segurança HOLDWallet
