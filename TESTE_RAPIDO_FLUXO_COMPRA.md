# 🧪 Teste Rápido - Fluxo de Compra OTC Completo

## ✅ O que está funcionando

1. ✅ Backend rodando em http://localhost:8000
2. ✅ Database com 30 tabelas (incluindo instant_trades)
3. ✅ Relationship User-InstantTrade CORRIGIDA
4. ✅ Endpoints admin registrados
5. ✅ BlockchainDepositService criado

## ⚠️ Configuração Pendente

Para testar o fluxo completo, você precisa:

### 1. Adicionar Private Key da Plataforma

Edite o arquivo `.env`:

```bash
# Adicione esta linha
PLATFORM_WALLET_PRIVATE_KEY=0xSUA_PRIVATE_KEY_AQUI

# Endpoints RPC (usar endpoints reais)
POLYGON_RPC_URL=https://polygon-mainnet.infura.io/v3/YOUR_KEY
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
BASE_RPC_URL=https://mainnet.base.org
```

⚠️ **ATENÇÃO:** A private key é CRÍTICA! Nunca compartilhe e mantenha em segredo!

### 2. Criar Usuário Admin

Execute este script Python para tornar um usuário admin:

```python
# run_admin_setup.py
from app.core.db import SessionLocal
from app.models.user import User

db = SessionLocal()

# Substitua pelo email do usuário que será admin
admin_email = "seu_email@example.com"

user = db.query(User).filter(User.email == admin_email).first()
if user:
    user.is_admin = True
    db.commit()
    print(f"✅ {admin_email} agora é admin!")
else:
    print(f"❌ Usuário {admin_email} não encontrado")

db.close()
```

Execute:

```bash
cd backend
python run_admin_setup.py
```

## 🎯 Testando o Fluxo

### 1. Login como usuário normal

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@example.com",
    "password": "senha123"
  }'
```

Guarde o `access_token`.

### 2. Criar ordem de compra

```bash
curl -X POST http://localhost:8000/instant-trade/quote \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "operation_type": "buy",
    "symbol": "USDT",
    "fiat_amount": 100,
    "payment_method": "pix"
  }'
```

**Response esperado:**

```json
{
  "id": "uuid",
  "reference_code": "OTC-2025-000001",
  "operation_type": "buy",
  "symbol": "USDT",
  "fiat_amount": 100.0,
  "crypto_amount": 17.868,
  "total_amount": 103.75,
  "status": "pending",
  "expires_at": "2025-12-15T20:00:00"
}
```

Guarde o `id` do trade.

### 3. Login como admin

```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "senha123"
  }'
```

Guarde o `access_token` do admin.

### 4. Listar trades pendentes (como admin)

```bash
curl -X GET http://localhost:8000/admin/instant-trades/pending \
  -H "Authorization: Bearer ADMIN_TOKEN_AQUI"
```

**Response esperado:**

```json
[
  {
    "id": "uuid",
    "reference_code": "OTC-2025-000001",
    "user_id": "user_uuid",
    "operation_type": "buy",
    "symbol": "USDT",
    "fiat_amount": 100.0,
    "crypto_amount": 17.868,
    "status": "pending"
  }
]
```

### 5. Confirmar pagamento e disparar depósito (como admin)

⚠️ **ATENÇÃO:** Isso vai realmente enviar crypto na blockchain se a private key estiver configurada!

```bash
curl -X POST http://localhost:8000/admin/instant-trades/confirm-payment \
  -H "Authorization: Bearer ADMIN_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "trade_id": "UUID_DO_TRADE",
    "network": "polygon",
    "notes": "Pagamento PIX confirmado manualmente"
  }'
```

**Response esperado (sucesso):**

```json
{
  "success": true,
  "message": "Pagamento confirmado e crypto depositada com sucesso!",
  "trade_id": "uuid",
  "tx_hash": "0xabc123...",
  "wallet_address": "0xdef456...",
  "network": "polygon",
  "status": "completed"
}
```

**Response esperado (se wallet não encontrada):**

```json
{
  "success": false,
  "message": "Pagamento confirmado mas depósito falhou",
  "error": "Wallet não encontrada para network=polygon"
}
```

### 6. Verificar resultado (como usuário)

```bash
curl -X GET http://localhost:8000/instant-trade/orders \
  -H "Authorization: Bearer USER_TOKEN"
```

Deve retornar o trade com:

- `status`: "completed"
- `tx_hash`: "0xabc123..."
- `wallet_address`: "0xdef456..."
- `network`: "polygon"

### 7. Verificar na blockchain

Acesse o explorador:

- Polygon: https://polygonscan.com/tx/{tx_hash}
- Ethereum: https://etherscan.io/tx/{tx_hash}
- Base: https://basescan.org/tx/{tx_hash}

## 🎛️ Endpoints Admin Disponíveis

### GET /admin/instant-trades/pending

Lista trades aguardando depósito

### GET /admin/instant-trades/all

Lista todos os trades com paginação

- Query params: `skip`, `limit`, `status_filter`

### POST /admin/instant-trades/confirm-payment

Confirma pagamento e dispara depósito blockchain

### POST /admin/instant-trades/manual-deposit/{trade_id}

Retry manual de depósito para trades que falharam

- Query param: `network` (default: polygon)

## 📊 Documentação Swagger

Acesse: http://localhost:8000/docs

Você verá os novos endpoints na seção **Admin - Instant Trades**

## ⚙️ Modo Teste (sem blockchain real)

Se quiser testar sem gastar gas ou sem configurar private key:

1. Comente o código de envio blockchain em `BlockchainDepositService.deposit_crypto_to_user()`
2. Retorne um tx_hash fake:

```python
# Linha ~310 em blockchain_deposit_service.py
# Comente as linhas de envio e adicione:
tx_hash = f"0xFAKE_{trade.id[:8]}"  # TX hash fake para teste
```

Assim você pode testar todo o fluxo sem realmente enviar crypto.

## 🐛 Troubleshooting

### Erro: "PLATFORM_WALLET_PRIVATE_KEY não configurada"

Adicione a private key no `.env`

### Erro: "User não é admin"

Execute o script de setup admin

### Erro: "Wallet não encontrada para network=polygon"

O usuário precisa ter uma wallet criada na rede Polygon. Verifique em `/wallets`

### Erro: "Insufficient platform balance"

A wallet da plataforma precisa ter saldo suficiente de USDT/USDC + MATIC para gas

### Erro: "Could not determine join condition"

O relationship fix já foi aplicado. Reinicie o backend.

## ✅ Checklist

- [ ] Backend rodando
- [ ] Private key configurada no .env
- [ ] Usuário admin criado
- [ ] Usuário normal tem wallet na rede
- [ ] Wallet da plataforma tem saldo
- [ ] Testou criação de ordem
- [ ] Testou confirmação de pagamento
- [ ] Verificou tx_hash na blockchain

## 🚀 Próximo Passo

Agora você pode:

1. Testar o fluxo completo
2. Criar frontend admin para facilitar as confirmações
3. Adicionar notificações quando pagamento for confirmado
4. Implementar webhooks para atualizar status automaticamente

Boa sorte! 🎉
