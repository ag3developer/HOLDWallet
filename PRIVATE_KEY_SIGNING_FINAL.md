# 🔐 Private Key Signing - Implementação Final

## Situação Atual

✅ **Pronto:**

- USDT Transaction Service (backend/app/services/usdt_transaction_service.py)
- Wallet Transactions Router (backend/app/routers/wallet_transactions.py)
- Endpoints de validação e estimação de gas
- Integração ao main.py

❌ **Falta implementar:**

- Recuperação de private key do banco
- Assinatura de transação
- Envio para blockchain

---

## Passo 1: Verificar Estrutura do Banco

Verificar se Address model tem private_key_encrypted:

```bash
# Abrir banco
sqlite3 holdwallet.db

# Verificar tabela
.schema address

# Procurar por private_key ou encrypted
SELECT * FROM address LIMIT 1;
```

**Se não tiver**, adicionar coluna:

```python
# backend/app/models/address.py

class Address(Base):
    __tablename__ = "address"

    id = Column(Integer, primary_key=True)
    wallet_id = Column(Integer, ForeignKey("wallet.id"))
    network = Column(String)
    address = Column(String, unique=True)
    address_type = Column(String)

    # ADICIONAR:
    private_key_encrypted = Column(String, nullable=True)  # Criptografado!
    public_key = Column(String, nullable=True)
    derivation_path = Column(String, nullable=True)
```

---

## Passo 2: Verificar Criptografia Existente

Procurar função de criptografia:

```bash
grep -r "encrypt\|decrypt\|cipher" backend/app/core/
grep -r "encrypt\|decrypt\|cipher" backend/app/services/
```

**Se encontrar**, usar. **Se não encontrar**, criar:

```python
# backend/app/core/crypto.py (NOVO ARQUIVO)

from cryptography.fernet import Fernet
import os
from app.core.config import settings

# Gerar chave (guardar em variável de ambiente!)
# ENCRYPTION_KEY = Fernet.generate_key()
# export ENCRYPTION_KEY="chave_base64_aqui"

def get_encryption_key() -> bytes:
    """Obter chave de criptografia da variável de ambiente"""
    key_str = os.getenv('ENCRYPTION_KEY')
    if not key_str:
        raise ValueError("ENCRYPTION_KEY não configurada!")
    return key_str.encode() if isinstance(key_str, str) else key_str

def encrypt_private_key(private_key: str) -> str:
    """Criptografar private key"""
    cipher = Fernet(get_encryption_key())
    encrypted = cipher.encrypt(private_key.encode())
    return encrypted.decode()

def decrypt_private_key(encrypted_key: str, passphrase: str = None) -> str:
    """Descriptografar private key"""
    # Validar passphrase do usuário (opcional segurança extra)
    if passphrase:
        # hash passphrase e validar (omitido por brevidade)
        pass

    cipher = Fernet(get_encryption_key())
    decrypted = cipher.decrypt(encrypted_key.encode())
    return decrypted.decode()
```

---

## Passo 3: Atualizar wallet_transactions.py

Adicionar private key handling no endpoint `/send`:

```python
# backend/app/routers/wallet_transactions.py

# Adicionar estes imports no topo:
from app.core.crypto import decrypt_private_key
from app.models.user import User

# Adicionar esta função após as schemas:
async def get_current_user_full(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """Obter usuário completo com dados do banco"""
    return db.query(User).filter(User.id == current_user.id).first()

# Modificar endpoint /send:
@router.post("/{wallet_id}/send", response_model=SendUSDTResponse)
async def send_usdt(
    wallet_id: int,
    request: SendUSDTRequest,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Enviar USDT para outro endereço
    """
    try:
        # ... validações existentes ...

        # NOVA PARTE: Obter e descriptografar private key
        from_address_obj = db.query(Address).filter(
            Address.wallet_id == wallet_id,
            Address.network == request.network.lower(),
            Address.address_type == "receiving"
        ).first()

        if not from_address_obj:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Endereço não encontrado para esta rede"
            )

        # Verificar se tem private key criptografada
        if not from_address_obj.private_key_encrypted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Private key não configurada para este endereço"
            )

        # TODO: Adicionar 2FA aqui!
        # await verify_2fa(current_user.id, otp_code=request.otp_code)

        # Descriptografar private key
        try:
            private_key = decrypt_private_key(
                from_address_obj.private_key_encrypted
            )
        except Exception as e:
            logger.error(f"Erro ao descriptografar private key: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Erro ao processar chave privada"
            )

        # Preparar transação
        prep = usdt_transaction_service.prepare_transaction(
            str(from_address_obj.address),
            request.to_address,
            request.amount,
            request.token,
            request.network.lower(),
            request.fee_level
        )

        if not prep.get('valid'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=prep.get('error', 'Erro ao preparar transação')
            )

        # ASSINAR E ENVIAR (NOVO!)
        try:
            result = usdt_transaction_service.sign_and_send_transaction(
                from_address=str(from_address_obj.address),
                to_address=request.to_address,
                amount=request.amount,
                token=request.token,
                network=request.network.lower(),
                private_key=private_key  # ← CHAVE DESCRIPTOGRAFADA
            )

            # Aguardar confirmação
            confirmation = await usdt_transaction_service.wait_for_confirmation(
                result['tx_hash'],
                request.network.lower(),
                timeout_seconds=300  # 5 minutos
            )

            # Registrar transação no banco de dados
            tx = Transaction(
                user_id=current_user.id,
                wallet_id=wallet_id,
                from_address=str(from_address_obj.address),
                to_address=request.to_address,
                amount=request.amount,
                token=request.token,
                network=request.network.lower(),
                tx_hash=result['tx_hash'],
                fee=confirmation.get('gas_fee_native', '0'),
                status='confirmed' if confirmation.get('confirmed') else 'pending',
                note=request.note
            )
            db.add(tx)
            db.commit()
            db.refresh(tx)

            logger.info(f"✅ Transação enviada: {result['tx_hash']}")

            return SendUSDTResponse(
                valid=True,
                tx_hash=result['tx_hash'],
                from_address=str(from_address_obj.address),
                to_address=request.to_address,
                amount=request.amount,
                token=request.token,
                network=request.network.lower(),
                status='confirmed' if confirmation.get('confirmed') else 'pending',
                explorer_url=result.get('explorer_url')
            )

        except ValueError as e:
            logger.error(f"Erro ao assinar transação: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Erro ao assinar: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Erro ao enviar transação: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erro ao enviar: {str(e)}"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro geral no envio: {e}")
        return SendUSDTResponse(
            valid=False,
            error=str(e)
        )
```

---

## Passo 4: Adicionar Private Key ao Gerar Endereço

Atualizar wallet_service.py para guardar private key:

```python
# backend/app/services/wallet_service.py

# Modificar função que cria endereço:

def create_address_with_key(
    wallet_id: int,
    network: str,
    derivation_path: str
) -> Tuple[str, str]:
    """Criar endereço e retornar também a chave privada"""

    # ... gerar endereço conforme código existente ...

    from eth_account import Account
    from app.core.crypto import encrypt_private_key

    # Gerar ou recuperar private key
    account = Account.from_key(private_key_hex)
    address = account.address

    # Criptografar private key
    private_key_encrypted = encrypt_private_key(private_key_hex)

    return address, private_key_encrypted

# Salvar no banco:
def save_address_with_key(
    db: Session,
    wallet_id: int,
    network: str,
    address: str,
    private_key_encrypted: str
) -> Address:
    """Salvar endereço e private key no banco"""

    addr = Address(
        wallet_id=wallet_id,
        network=network,
        address=address,
        address_type="receiving",
        private_key_encrypted=private_key_encrypted,
        derivation_path=f"m/44'/60'/0'/0/0"  # BIP44 path
    )
    db.add(addr)
    db.commit()
    return addr
```

---

## Passo 5: Configurar Variáveis de Ambiente

```bash
# .env

# Criptografia
ENCRYPTION_KEY="resultado_de_Fernet.generate_key()"

# Exemplo:
# ENCRYPTION_KEY="gAAAAABl5xZ4..."

# 2FA (opcional)
REQUIRE_2FA_FOR_SENDS=true
REQUIRE_2FA_FOR_AMOUNT_ABOVE=1000  # USD

# RPC Endpoints
ETHEREUM_RPC_URL="https://eth.llamarpc.com"
POLYGON_RPC_URL="https://polygon-rpc.com"
# ... etc
```

**Gerar ENCRYPTION_KEY:**

```python
from cryptography.fernet import Fernet

key = Fernet.generate_key()
print(key.decode())  # Copiar e colar em .env
```

---

## Passo 6: Testar Localmente

```bash
# 1. Setup
cd backend
source venv/bin/activate
pip install cryptography web3

# 2. Configurar .env
export ENCRYPTION_KEY="sua_chave_aqui"
export ETHEREUM_RPC_URL="https://eth.llamarpc.com"

# 3. Executar
python -m uvicorn app.main:app --reload

# 4. Testar validação
curl -X POST http://localhost:8000/api/v1/wallets/1/validate-transaction \
  -H "Authorization: Bearer $JWT" \
  -d '{"wallet_id": 1, "to_address": "0x...", ...}'

# 5. Testar estimação
curl -X POST http://localhost:8000/api/v1/wallets/1/estimate-gas \
  -H "Authorization: Bearer $JWT" \
  -d '{"wallet_id": 1, "to_address": "0x...", ...}'

# 6. Testar envio (PRIMEIRO EM TESTNET!)
curl -X POST http://localhost:8000/api/v1/wallets/1/send \
  -H "Authorization: Bearer $JWT" \
  -d '{"wallet_id": 1, "to_address": "0x...", "amount": "1", "network": "polygon", ...}'
```

---

## Passo 7: Testar em Testnet

```bash
# 1. Obter USDT testnet (Polygon Mumbai)
# https://www.aavechan.com/

# 2. Enviar em testnet
curl -X POST http://localhost:8000/api/v1/wallets/1/send \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_id": 1,
    "to_address": "0xRecipientAddress",
    "amount": "0.1",
    "token": "USDT",
    "network": "polygon",
    "fee_level": "slow"
  }'

# 3. Verificar response
# Deve retornar:
# {
#   "valid": true,
#   "tx_hash": "0x...",
#   "status": "pending",
#   "explorer_url": "https://mumbai.polygonscan.com/tx/..."
# }

# 4. Ver no explorer
# https://mumbai.polygonscan.com/tx/{tx_hash}
```

---

## 🚨 Checklist de Segurança

- [ ] Private key NUNCA em logs
- [ ] Private key SEMPRE criptografado no banco
- [ ] ENCRYPTION_KEY em variável de ambiente (NUNCA em código)
- [ ] 2FA antes de assinar transações
- [ ] Rate limiting nos endpoints
- [ ] Validação de amounts (não permitir 0 ou valores negativos)
- [ ] Verificação de endereço válido
- [ ] Timeout nas transações (não deixar pendurado)
- [ ] Audit log de TODAS as transações
- [ ] HTTPS em produção
- [ ] JWT refresh tokens
- [ ] Validação de CORS

---

## 🎯 Resumo de Mudanças

| Arquivo                                      | Mudança                            |
| -------------------------------------------- | ---------------------------------- |
| `backend/app/core/crypto.py`                 | NOVO - funções encrypt/decrypt     |
| `backend/app/models/address.py`              | ADD - campos private_key_encrypted |
| `backend/app/routers/wallet_transactions.py` | UPDATE - implementar signing       |
| `backend/app/services/wallet_service.py`     | UPDATE - salvar private key        |
| `.env`                                       | ADD - ENCRYPTION_KEY               |
| `main.py`                                    | ✅ JÁ FEITO - router integrado     |

**Tempo estimado:** 30-60 minutos

---

## 📞 Suporte

Se der erro:

1. Verificar se ENCRYPTION_KEY está setada:

   ```bash
   echo $ENCRYPTION_KEY
   ```

2. Verificar banco de dados:

   ```bash
   sqlite3 holdwallet.db ".schema address"
   ```

3. Ver logs:

   ```bash
   docker logs hold-wallet-backend
   # ou
   tail -f backend/logs/app.log
   ```

4. Testes de private key:
   ```python
   from app.core.crypto import encrypt_private_key, decrypt_private_key
   pk = "0x1234..."
   encrypted = encrypt_private_key(pk)
   decrypted = decrypt_private_key(encrypted)
   assert pk == decrypted
   ```

---

**Próximo:** Implementar e testar em testnet! 🚀
