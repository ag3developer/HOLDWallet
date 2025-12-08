# 🚀 PLANO DE CONCLUSÃO - HOLDWALLET BACKEND

**Data:** 8 de dezembro de 2025  
**Status:** Iniciando implementação final  
**Meta:** 100% completo em 1 dia

---

## 📋 FASE 1: SYSTEM WALLET (2 horas)

### 1.1 - Criar Models

**Arquivo:** `backend/app/models/system_wallet.py`

```python
# Tabela: system_wallets
class SystemWallet(Base):
    __tablename__ = "system_wallets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    name = Column(String(255), unique=True)  # "holdwallet_main"
    status = Column(String(50), default="active")  # active, inactive
    created_at = Column(DateTime, default=datetime.utcnow)

# Tabela: system_addresses
class SystemAddress(Base):
    __tablename__ = "system_addresses"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid4()))
    system_wallet_id = Column(String(36), ForeignKey("system_wallets.id"))
    network = Column(String(50))  # bitcoin, ethereum, polygon, etc
    address = Column(String(255), unique=True)
    private_key_encrypted = Column(Text)  # Encrypted with Fernet
    public_key = Column(Text)
    balance = Column(Numeric(28, 8), default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
```

**Tasks:**

- [ ] Criar arquivo `system_wallet.py`
- [ ] Adicionar models SystemWallet e SystemAddress
- [ ] Criar migration para as 2 tabelas

---

### 1.2 - Criar Service

**Arquivo:** `backend/app/services/system_wallet_service.py`

```python
class SystemWalletService:
    """Gerencia a carteira consolidada do sistema"""

    @staticmethod
    def create_system_wallet(db: Session, name: str = "holdwallet_main"):
        """Criar nova system wallet"""
        wallet = SystemWallet(name=name)
        db.add(wallet)
        db.commit()
        return wallet

    @staticmethod
    async def generate_addresses_for_all_networks(db: Session, system_wallet_id: str):
        """
        Gerar endereços em todas as 15 redes

        Redes:
        1. Bitcoin
        2. Ethereum
        3. Polygon
        4. BSC (Binance Smart Chain)
        5. Base
        6. Tron
        7. Solana
        8. Litecoin
        9. Dogecoin
        10. Cardano
        11. Avalanche
        12. Polkadot
        13. Chainlink
        14. Shiba
        15. XRP
        """
        networks = [
            "bitcoin", "ethereum", "polygon", "bsc", "base",
            "tron", "solana", "litecoin", "dogecoin", "cardano",
            "avalanche", "polkadot", "chainlink", "shiba", "xrp"
        ]

        for network in networks:
            address, private_key = await CryptoService.generate_address(network)
            encrypted_key = CryptoService.encrypt_private_key(private_key)

            system_address = SystemAddress(
                system_wallet_id=system_wallet_id,
                network=network,
                address=address,
                private_key_encrypted=encrypted_key
            )
            db.add(system_address)

        db.commit()

    @staticmethod
    def get_system_address(db: Session, network: str) -> SystemAddress:
        """Pegar endereço do sistema para uma rede específica"""
        return db.query(SystemAddress).filter(
            SystemAddress.network == network
        ).first()

    @staticmethod
    def get_all_system_addresses(db: Session) -> List[SystemAddress]:
        """Pegar todos os endereços do sistema"""
        return db.query(SystemAddress).all()

    @staticmethod
    def update_balance(db: Session, system_address_id: str, balance: float):
        """Atualizar saldo de um endereço"""
        address = db.query(SystemAddress).filter(
            SystemAddress.id == system_address_id
        ).first()
        if address:
            address.balance = balance
            db.commit()
        return address
```

**Tasks:**

- [ ] Criar arquivo `system_wallet_service.py`
- [ ] Implementar SystemWalletService
- [ ] Adicionar suporte para 15 redes

---

### 1.3 - Criar API Endpoints

**Arquivo:** `backend/app/routers/system_wallet.py`

```python
router = APIRouter(prefix="/api/v1/system-wallet", tags=["system"])

@router.post("/initialize")
async def initialize_system_wallet(db: Session = Depends(get_db)):
    """Inicializar a carteira do sistema"""
    wallet = SystemWalletService.create_system_wallet(db)
    await SystemWalletService.generate_addresses_for_all_networks(db, wallet.id)
    return {"status": "initialized", "wallet_id": wallet.id}

@router.get("/addresses")
async def get_system_addresses(db: Session = Depends(get_db)):
    """Listar todos os endereços do sistema"""
    addresses = SystemWalletService.get_all_system_addresses(db)
    return addresses

@router.get("/addresses/{network}")
async def get_system_address(network: str, db: Session = Depends(get_db)):
    """Pegar endereço para uma rede específica"""
    address = SystemWalletService.get_system_address(db, network)
    return address

@router.get("/balance/{network}")
async def get_system_balance(network: str, db: Session = Depends(get_db)):
    """Pegar saldo consolidado de uma rede"""
    address = SystemWalletService.get_system_address(db, network)
    if not address:
        return {"error": "Address not found"}

    # Atualizar saldo da blockchain
    balance = await BlockchainService.get_balance(network, address.address)
    SystemWalletService.update_balance(db, address.id, balance)

    return {"network": network, "balance": balance}
```

**Tasks:**

- [ ] Criar arquivo `system_wallet.py` em routers
- [ ] Criar endpoints /initialize, /addresses, /balance
- [ ] Testar endpoints

---

## ⏳ FASE 2: BACKGROUND JOBS COM CELERY (3 horas)

### 2.1 - Setup Celery + Redis

**Arquivo:** `backend/app/core/celery_app.py`

```python
from celery import Celery
import os

celery_app = Celery(
    "holdwallet",
    broker=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    backend=os.getenv("REDIS_URL", "redis://localhost:6379/0")
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    beat_schedule={
        'process-instant-trades': {
            'task': 'app.tasks.process_instant_trades',
            'schedule': 10.0,  # a cada 10 segundos
        },
        'monitor-confirmations': {
            'task': 'app.tasks.monitor_blockchain_confirmations',
            'schedule': 30.0,  # a cada 30 segundos
        },
    }
)
```

**Tasks:**

- [ ] Instalar: `pip install celery redis`
- [ ] Criar arquivo `celery_app.py`
- [ ] Configurar Redis (Docker ou local)
- [ ] Adicionar variáveis de ambiente

---

### 2.2 - Criar Tasks

**Arquivo:** `backend/app/tasks.py`

```python
from app.core.celery_app import celery_app
from app.services.instant_trade_service import InstantTradeService
from app.services.transaction_service import TransactionService
from app.services.wallet_balance_service import WalletBalanceService
from app.db.session import SessionLocal

@celery_app.task(name="app.tasks.process_instant_trades")
def process_instant_trades():
    """
    Processa trades pendentes a cada 10 segundos

    Workflow:
    1. Buscar trades com status PENDING
    2. Verificar se pagamento foi confirmado
    3. Se sim, transferir saldo do sistema para usuário
    4. Atualizar status para COMPLETED
    """
    db = SessionLocal()
    try:
        pending_trades = db.query(InstantTrade).filter(
            InstantTrade.status == "PENDING",
            InstantTrade.payment_method == "PIX"
        ).all()

        for trade in pending_trades:
            # Verificar se pagamento foi confirmado
            pix_status = check_pix_payment_status(trade.pix_key)

            if pix_status == "confirmed":
                # Transferir saldo
                WalletBalanceService.transfer_balance(
                    db=db,
                    from_user_id="system",  # Do sistema
                    to_user_id=trade.user_id,
                    cryptocurrency=trade.cryptocurrency,
                    amount=trade.amount,
                    reason=f"Instant Trade #{trade.id} Completion",
                    reference_id=trade.id
                )

                # Atualizar status
                trade.status = "COMPLETED"
                trade.completed_at = datetime.utcnow()
                db.commit()

                print(f"✅ Trade {trade.id} completed")
    finally:
        db.close()

@celery_app.task(name="app.tasks.monitor_blockchain_confirmations")
def monitor_blockchain_confirmations():
    """
    Monitora confirmações de transações na blockchain a cada 30 segundos

    Workflow:
    1. Buscar transações pendentes
    2. Verificar status na blockchain
    3. Se confirmada, liberar saldo locked
    4. Atualizar status
    """
    db = SessionLocal()
    try:
        pending_txs = db.query(Transaction).filter(
            Transaction.status == "pending"
        ).all()

        for tx in pending_txs:
            status = TransactionService.get_transaction_status(tx.tx_hash, tx.network)

            if status == "confirmed":
                # Liberar saldo locked
                wallet_balance = db.query(WalletBalance).filter(
                    WalletBalance.user_id == tx.user_id
                ).first()

                wallet_balance.locked_balance -= tx.amount
                wallet_balance.available_balance += tx.amount
                wallet_balance.total_balance = (
                    wallet_balance.available_balance + wallet_balance.locked_balance
                )

                # Atualizar TX
                tx.status = "confirmed"
                tx.confirmed_at = datetime.utcnow()
                db.commit()

                print(f"✅ Transaction {tx.tx_hash} confirmed")
    finally:
        db.close()

@celery_app.task(name="app.tasks.send_pix_payment")
def send_pix_payment(trade_id: str):
    """
    Envia pagamento via PIX (acionado quando usuário confirma trade)
    """
    db = SessionLocal()
    try:
        trade = db.query(InstantTrade).filter(
            InstantTrade.id == trade_id
        ).first()

        if not trade:
            return

        # Enviar PIX
        pix_result = BRLCodeClient.send_payment(
            amount=trade.brl_amount,
            key=trade.pix_key,
            description=f"Instant Trade #{trade_id}"
        )

        # Registrar
        trade.pix_status = "sent"
        trade.pix_sent_at = datetime.utcnow()
        db.commit()

        print(f"✅ PIX sent for trade {trade_id}")
    finally:
        db.close()

@celery_app.task(name="app.tasks.refund_user_on_timeout")
def refund_user_on_timeout(trade_id: str):
    """
    Reembolsa usuário se trade não completar em 10 minutos
    """
    db = SessionLocal()
    try:
        trade = db.query(InstantTrade).filter(
            InstantTrade.id == trade_id
        ).first()

        if not trade or trade.status == "COMPLETED":
            return

        # Verificar timeout
        if datetime.utcnow() - trade.created_at > timedelta(minutes=10):
            # Reembolsar
            WalletBalanceService.transfer_balance(
                db=db,
                from_user_id="system",
                to_user_id=trade.user_id,
                cryptocurrency=trade.cryptocurrency,
                amount=trade.amount,
                reason=f"Refund - Trade #{trade_id} timeout"
            )

            # Cancelar trade
            trade.status = "CANCELLED"
            trade.cancelled_at = datetime.utcnow()
            db.commit()

            print(f"⏰ Trade {trade_id} refunded due to timeout")
    finally:
        db.close()
```

**Tasks:**

- [ ] Criar arquivo `tasks.py`
- [ ] Implementar 4 tasks
- [ ] Testar cada task

---

### 2.3 - Integrar no Main

**Arquivo:** `backend/app/main.py`

```python
# Adicionar no top do arquivo:
from app.core.celery_app import celery_app

# Adicionar após criar FastAPI app:
app.add_event_handler("startup", lambda: print("✅ Celery app loaded"))
```

**Tasks:**

- [ ] Integrar Celery no main.py
- [ ] Testar inicialização

---

### 2.4 - Executar Worker Celery

**Comando no terminal:**

```bash
# Terminal 1: Worker
celery -A app.tasks worker --loglevel=info

# Terminal 2: Beat (scheduler)
celery -A app.core.celery_app beat --loglevel=info
```

**Tasks:**

- [ ] Iniciar Redis
- [ ] Iniciar Celery worker
- [ ] Iniciar Celery beat

---

## 💳 FASE 3: PIX INTEGRATION (2 horas)

### 3.1 - Criar BRLCode Client

**Arquivo:** `backend/app/clients/brl_code_client.py`

```python
import httpx
from typing import Dict, Optional

class BRLCodeClient:
    """Cliente para integração com BRL Code"""

    BASE_URL = os.getenv("BRCODE_API_URL", "https://api.brcode.com.br")
    API_KEY = os.getenv("BRCODE_API_KEY")

    @staticmethod
    async def create_pix_qrcode(
        amount: float,
        description: str,
        callback_url: str
    ) -> Dict:
        """
        Criar QR Code PIX

        Response:
        {
            "qr_code": "00020126360014br.gov.bcb.pix...",
            "pix_key": "abc123@holdwallet",
            "expires_at": "2025-12-08T10:30:00Z"
        }
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{BRLCodeClient.BASE_URL}/qrcodes",
                json={
                    "amount": amount,
                    "description": description,
                    "callback_url": callback_url
                },
                headers={"Authorization": f"Bearer {BRLCodeClient.API_KEY}"}
            )
            return response.json()

    @staticmethod
    async def check_payment_status(pix_key: str) -> Dict:
        """
        Verificar status do pagamento

        Response:
        {
            "status": "pending|confirmed|failed",
            "amount": 1000.00,
            "paid_at": "2025-12-08T10:25:00Z"
        }
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{BRLCodeClient.BASE_URL}/qrcodes/{pix_key}",
                headers={"Authorization": f"Bearer {BRLCodeClient.API_KEY}"}
            )
            return response.json()

    @staticmethod
    async def send_payment(
        amount: float,
        key: str,
        description: str
    ) -> Dict:
        """
        Enviar pagamento via PIX

        Response:
        {
            "transaction_id": "abc123",
            "status": "success|failed",
            "message": "..."
        }
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{BRLCodeClient.BASE_URL}/payments",
                json={
                    "amount": amount,
                    "pix_key": key,
                    "description": description
                },
                headers={"Authorization": f"Bearer {BRLCodeClient.API_KEY}"}
            )
            return response.json()
```

**Tasks:**

- [ ] Criar arquivo `brl_code_client.py`
- [ ] Implementar 3 métodos
- [ ] Adicionar autenticação

---

### 3.2 - Criar Webhook Handler

**Arquivo:** `backend/app/routers/webhooks.py`

```python
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.db.session import get_db

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

@router.post("/pix-callback")
async def pix_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Receber callback de pagamento PIX

    Body esperado:
    {
        "trade_id": "abc123",
        "status": "confirmed",
        "amount": 1000.00,
        "timestamp": "2025-12-08T10:25:00Z"
    }
    """
    data = await request.json()

    # Validar assinatura (HMAC)
    signature = request.headers.get("X-Signature")
    if not validate_webhook_signature(data, signature):
        return {"error": "Invalid signature"}, 401

    # Processar pagamento
    trade_id = data.get("trade_id")
    status = data.get("status")

    trade = db.query(InstantTrade).filter(
        InstantTrade.id == trade_id
    ).first()

    if not trade:
        return {"error": "Trade not found"}, 404

    if status == "confirmed":
        trade.pix_status = "confirmed"
        trade.pix_confirmed_at = datetime.utcnow()
        db.commit()

        # Disparar task para transferir saldo
        process_instant_trades.delay()

    return {"status": "processed"}

def validate_webhook_signature(data: Dict, signature: str) -> bool:
    """Validar assinatura HMAC do webhook"""
    import hmac
    import hashlib
    import json

    secret = os.getenv("BRCODE_WEBHOOK_SECRET")
    expected_signature = hmac.new(
        secret.encode(),
        json.dumps(data).encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(expected_signature, signature)
```

**Tasks:**

- [ ] Criar arquivo `webhooks.py`
- [ ] Implementar webhook handler
- [ ] Adicionar validação de assinatura

---

### 3.3 - Criar Payment Service

**Arquivo:** `backend/app/services/payment_service.py`

```python
from typing import Dict, Optional
from datetime import datetime

class PaymentService:
    """Gerencia pagamentos PIX"""

    @staticmethod
    async def create_pix_payment_request(
        db: Session,
        trade_id: str,
        amount: float,
        description: str = None
    ) -> Dict:
        """
        Criar requisição de pagamento PIX

        Retorna:
        {
            "qr_code": "00020126...",
            "qr_code_base64": "data:image/png;base64,..."
        }
        """
        trade = db.query(InstantTrade).filter(
            InstantTrade.id == trade_id
        ).first()

        if not trade:
            raise ValueError("Trade not found")

        # Criar QR Code
        callback_url = f"{os.getenv('API_URL')}/webhooks/pix-callback"

        qr_response = await BRLCodeClient.create_pix_qrcode(
            amount=amount,
            description=description or f"Instant Trade #{trade_id}",
            callback_url=callback_url
        )

        # Salvar informações
        trade.pix_qrcode = qr_response.get("qr_code")
        trade.pix_key = qr_response.get("pix_key")
        trade.pix_expires_at = qr_response.get("expires_at")
        trade.pix_status = "pending"
        db.commit()

        return {
            "qr_code": qr_response.get("qr_code"),
            "expires_at": qr_response.get("expires_at"),
            "trade_id": trade_id
        }

    @staticmethod
    async def check_payment_status(db: Session, trade_id: str) -> Dict:
        """Verificar status do pagamento"""
        trade = db.query(InstantTrade).filter(
            InstantTrade.id == trade_id
        ).first()

        if not trade or not trade.pix_key:
            return {"status": "not_found"}

        # Verificar com BRLCode
        status = await BRLCodeClient.check_payment_status(trade.pix_key)

        return {
            "status": status.get("status"),
            "amount": status.get("amount"),
            "paid_at": status.get("paid_at")
        }

    @staticmethod
    async def cancel_payment(db: Session, trade_id: str) -> Dict:
        """Cancelar pagamento"""
        trade = db.query(InstantTrade).filter(
            InstantTrade.id == trade_id
        ).first()

        if not trade:
            raise ValueError("Trade not found")

        trade.pix_status = "cancelled"
        trade.status = "CANCELLED"
        db.commit()

        return {"status": "cancelled"}
```

**Tasks:**

- [ ] Criar arquivo `payment_service.py`
- [ ] Implementar 3 métodos principais
- [ ] Testar integração

---

### 3.4 - Criar API Endpoints

**Arquivo:** `backend/app/routers/pix_payment.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.payment_service import PaymentService

router = APIRouter(prefix="/api/v1/pix", tags=["pix"])

@router.post("/create-payment")
async def create_pix_payment(
    trade_id: str,
    db: Session = Depends(get_db)
):
    """Criar pagamento PIX para um trade"""
    payment = await PaymentService.create_pix_payment_request(
        db=db,
        trade_id=trade_id
    )
    return payment

@router.get("/check-status/{trade_id}")
async def check_pix_status(
    trade_id: str,
    db: Session = Depends(get_db)
):
    """Verificar status do pagamento PIX"""
    status = await PaymentService.check_payment_status(db, trade_id)
    return status

@router.post("/cancel/{trade_id}")
async def cancel_pix_payment(
    trade_id: str,
    db: Session = Depends(get_db)
):
    """Cancelar pagamento PIX"""
    result = await PaymentService.cancel_payment(db, trade_id)
    return result
```

**Tasks:**

- [ ] Criar arquivo `pix_payment.py`
- [ ] Implementar 3 endpoints
- [ ] Testar endpoints

---

### 3.5 - Adicionar no Main.py

```python
# Imports
from app.routers import pix_payment
from app.routers import webhooks

# Incluir routers
app.include_router(pix_payment.router)
app.include_router(webhooks.router)
```

**Tasks:**

- [ ] Integrar routers no main.py

---

## 🧪 TESTES & VALIDAÇÃO

### Checklist de Testes

**FASE 1 - SYSTEM WALLET:**

- [ ] Migrations criadas e executadas
- [ ] Endpoint `/api/v1/system-wallet/initialize` funciona
- [ ] 15 endereços gerados corretamente
- [ ] Endereços recuperáveis via API

**FASE 2 - BACKGROUND JOBS:**

- [ ] Redis conectado
- [ ] Celery worker inicia sem erros
- [ ] Celery beat scheduler funciona
- [ ] Task de processo de trades executa a cada 10s
- [ ] Task de monitoramento executa a cada 30s
- [ ] Tasks podem ser acionadas manualmente

**FASE 3 - PIX INTEGRATION:**

- [ ] BRLCode client conecta corretamente
- [ ] QR Code gerado com sucesso
- [ ] Webhook recebe callbacks corretamente
- [ ] Assinatura validada
- [ ] Trade atualizado ao receber pagamento

---

## 📊 ESTIMATIVA FINAL

```
Fase 1 (System Wallet):     2 horas
Fase 2 (Background Jobs):   3 horas
Fase 3 (PIX Integration):   2 horas
Testes & Debugging:         1 hora
─────────────────────────────────────
TOTAL:                      8 horas

Início:  8 de dezembro 09:00 AM
Fim:     8 de dezembro 5:00 PM
```

---

## ✅ CONCLUSÃO ESPERADA

**Ao final de hoje:**

```
┌──────────────────────────────────────┐
│  ✅ System Wallet                    │
│  ✅ Background Jobs                  │
│  ✅ PIX Integration                  │
│  ✅ 50+ testes passando               │
│  ✅ Documentação completa             │
│                                      │
│  🎉 BACKEND 100% PRONTO! 🎉          │
│  Aplicação pode ir para PRODUÇÃO!    │
└──────────────────────────────────────┘
```

**Próximo:** Frontend refinamento (1-2 dias)

---

**Status:** ✨ Tudo planejado e pronto para começar!  
**Vamos começar a implementação agora?** 🚀
