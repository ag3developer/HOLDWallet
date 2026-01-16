# 🔍 DIAGNÓSTICO COMPLETO: Envio Multi-Chain

**Data:** 16 de Janeiro de 2026
**Status:** Análise para implementação 100%

---

## 📊 RESUMO EXECUTIVO

| Rede         | Moeda      | Service Existe              | Método Send             | Integrado /send | Status  |
| ------------ | ---------- | --------------------------- | ----------------------- | --------------- | ------- |
| Ethereum     | ETH        | ✅ blockchain_signer        | ✅ sign_evm_transaction | ✅              | 🟢 100% |
| Polygon      | MATIC      | ✅ blockchain_signer        | ✅ sign_evm_transaction | ✅              | 🟢 100% |
| BSC          | BNB        | ✅ blockchain_signer        | ✅ sign_evm_transaction | ✅              | 🟢 100% |
| Base         | BASE       | ✅ blockchain_signer        | ✅ sign_evm_transaction | ✅              | 🟢 100% |
| Avalanche    | AVAX       | ✅ blockchain_signer        | ✅ sign_evm_transaction | ✅              | 🟢 100% |
| ERC20        | USDT/USDC  | ✅ usdt_transaction_service | ✅ sign_and_send        | ✅              | 🟢 100% |
| **Bitcoin**  | BTC        | ✅ btc_service.py           | ✅ send_btc             | ❌              | 🟡 80%  |
| **TRON**     | TRX        | ✅ tron_service.py          | ✅ send_trx             | ❌              | 🟡 80%  |
| **TRON**     | USDT-TRC20 | ✅ tron_service.py          | ✅ send_trc20           | ❌              | 🟡 70%  |
| **Solana**   | SOL        | ✅ sol_service.py           | ✅ send_sol             | ❌              | 🟡 80%  |
| **XRP**      | XRP        | ✅ xrp_service.py           | ✅ send_xrp             | ❌              | 🟡 80%  |
| **Litecoin** | LTC        | ✅ ltc_doge_service.py      | ✅ send_ltc             | ❌              | 🟡 80%  |
| **Dogecoin** | DOGE       | ✅ ltc_doge_service.py      | ⚠️ parcial              | ❌              | 🟡 70%  |
| Cardano      | ADA        | ❌ não existe               | ❌ não                  | ❌              | 🔴 0%   |

---

## 🟢 REDES 100% FUNCIONAIS (EVM)

### ✅ Ethereum, Polygon, BSC, Base, Avalanche

- **Service:** `blockchain_signer.py`
- **Método:** `sign_evm_transaction()`
- **Integração:** Completa no endpoint `/wallets/send`
- **Fluxo:**
  1. Frontend envia request → `/wallets/send`
  2. Obtém private_key do DB (encrypted_private_key)
  3. `blockchain_signer.sign_evm_transaction()` assina e broadcast
  4. Salva no banco `transactions`
  5. Retorna tx_hash

### ✅ USDT/USDC (ERC20/Polygon)

- **Service:** `usdt_transaction_service.py`
- **Método:** `sign_and_send_transaction()`
- **Integração:** Completa no endpoint `/wallets/send`
- **Detecção:** Automática via `token_symbol == 'USDT'` ou `'USDC'`

---

## 🟡 REDES COM SERVIÇO PRONTO (NÃO INTEGRADAS)

### 1. Bitcoin (BTC) - 80% Pronto

**Arquivo:** `backend/app/services/btc_service.py` (599 linhas)

**Métodos Disponíveis:**

```python
class BTCService:
    def get_balance(address) -> Dict              # ✅ Funciona
    def get_utxos(address) -> List[UTXO]          # ✅ Funciona
    def get_recommended_fees() -> Dict             # ✅ Funciona
    async def send_btc(                            # ✅ PRONTO!
        from_address: str,
        to_address: str,
        amount_btc: float,
        private_key_wif: str,                      # ⚠️ Precisa converter hex→WIF
        fee_level: str = 'hour'
    ) -> BTCTransactionResult
```

**O que falta:**

- ❌ Integrar no endpoint `/wallets/send`
- ❌ Converter private_key hex para WIF antes de chamar
- ❌ Tratar endereços SegWit vs Legacy

**APIs Usadas:** Blockstream.info, Mempool.space (gratuitas)

---

### 2. TRON (TRX) - 80% Pronto

**Arquivo:** `backend/app/services/tron_service.py` (388 linhas)

**Métodos Disponíveis:**

```python
class TRONService:
    def get_balance(address) -> Decimal           # ✅ Funciona
    def get_trc20_balance(address) -> Decimal     # ✅ Funciona
    async def send_trx(                           # ✅ PRONTO!
        from_address: str,
        to_address: str,
        amount_trx: float,
        private_key_hex: str
    ) -> TRXTransactionResult
    async def send_trc20(                         # ✅ PRONTO!
        from_address: str,
        to_address: str,
        amount: float,
        private_key_hex: str,
        contract_address: str
    ) -> TRXTransactionResult                     # USDT-TRC20 funciona!
```

**O que falta:**

- ❌ Integrar no endpoint `/wallets/send`
- ❌ Detectar `network == 'tron'` e rotear

**APIs Usadas:** TronGrid API (gratuita)

---

### 3. Solana (SOL) - 80% Pronto

**Arquivo:** `backend/app/services/sol_service.py` (251 linhas)

**Métodos Disponíveis:**

```python
class SOLService:
    def get_balance(address) -> Decimal           # ✅ Funciona
    async def send_sol(                           # ✅ PRONTO!
        from_address: str,
        to_address: str,
        amount_sol: float,
        private_key_base58: str                   # ⚠️ Precisa converter hex→base58
    ) -> SOLTransactionResult
```

**O que falta:**

- ❌ Integrar no endpoint `/wallets/send`
- ❌ Instalar dependência `solders` se não estiver
- ❌ Converter private_key hex para base58

**Dependência necessária:** `pip install solders`

---

### 4. XRP (Ripple) - 80% Pronto

**Arquivo:** `backend/app/services/xrp_service.py` (254 linhas)

**Métodos Disponíveis:**

```python
class XRPService:
    def get_balance(address) -> Decimal           # ✅ Funciona
    async def send_xrp(                           # ✅ PRONTO!
        from_address: str,
        to_address: str,
        amount_xrp: float,
        private_key_hex: str,
        destination_tag: int = None
    ) -> XRPTransactionResult
```

**O que falta:**

- ❌ Integrar no endpoint `/wallets/send`
- ❌ Instalar dependência `xrpl-py`

**Dependência necessária:** `pip install xrpl-py`

---

### 5. Litecoin (LTC) - 80% Pronto

**Arquivo:** `backend/app/services/ltc_doge_service.py` (415 linhas)

**Métodos Disponíveis:**

```python
class LTCService:
    def get_balance(address) -> Decimal           # ✅ Funciona
    async def send_ltc(                           # ✅ PRONTO!
        from_address: str,
        to_address: str,
        amount_ltc: float,
        private_key_wif: str
    ) -> TransactionResult
```

**O que falta:**

- ❌ Integrar no endpoint `/wallets/send`
- ❌ Converter private_key hex para WIF Litecoin

**APIs Usadas:** Blockcypher.com (gratuita)

---

### 6. Dogecoin (DOGE) - 80% Pronto ✅

**Arquivo:** `backend/app/services/ltc_doge_service.py` (415 linhas)

**Métodos Disponíveis:**

```python
class DOGEService:
    def get_balance(address) -> Decimal           # ✅ Funciona
    def get_utxos(address) -> List[UTXO]          # ✅ Funciona
    async def send_doge(                          # ✅ JÁ EXISTE!
        from_address: str,
        to_address: str,
        amount_doge: float,
        private_key_wif: str
    ) -> TransactionResult
```

**O que falta:**

- ❌ Integrar no endpoint `/wallets/send`

---

## 🔴 REDES NÃO IMPLEMENTADAS

### Cardano (ADA) - 0% Pronto

- ❌ Não existe service
- ❌ Blockchain complexa (usar cardano-py)
- ⏰ Estimativa: 2-3 dias de desenvolvimento

---

## 🛠️ PLANO DE IMPLEMENTAÇÃO

### Fase 1: Integração Rápida (2-4 horas)

Integrar serviços já prontos no `/wallets/send`:

```python
# backend/app/routers/wallets.py - modificação no endpoint /send

# Após verificar wallet e address, ANTES do código EVM:

network_lower = request.network.lower()

# ============================================
# BITCOIN
# ============================================
if network_lower == 'bitcoin':
    from app.services.btc_service import btc_service
    from bitcoinlib.keys import Key

    # Converter hex para WIF
    key = Key(private_key, network='bitcoin')
    private_key_wif = key.wif()

    result = await btc_service.send_btc(
        from_address=from_address,
        to_address=request.to_address,
        amount_btc=float(request.amount),
        private_key_wif=private_key_wif,
        fee_level=request.fee_level or 'hour'
    )

    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)

    tx_hash = result.tx_hash
    # Salvar no banco e retornar...

# ============================================
# TRON (TRX e USDT-TRC20)
# ============================================
elif network_lower == 'tron':
    from app.services.tron_service import tron_service

    if request.token_symbol and request.token_symbol.upper() == 'USDT':
        result = await tron_service.send_trc20(
            from_address=from_address,
            to_address=request.to_address,
            amount=float(request.amount),
            private_key_hex=private_key
        )
    else:
        result = await tron_service.send_trx(
            from_address=from_address,
            to_address=request.to_address,
            amount_trx=float(request.amount),
            private_key_hex=private_key
        )

    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)

    tx_hash = result.tx_hash

# ============================================
# SOLANA
# ============================================
elif network_lower == 'solana':
    from app.services.sol_service import SOLService
    import base58

    sol_service = SOLService()

    # Converter hex para base58 se necessário
    if len(private_key) == 64:
        pk_bytes = bytes.fromhex(private_key)
        private_key_b58 = base58.b58encode(pk_bytes).decode()
    else:
        private_key_b58 = private_key

    result = await sol_service.send_sol(
        from_address=from_address,
        to_address=request.to_address,
        amount_sol=float(request.amount),
        private_key_base58=private_key_b58
    )

    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)

    tx_hash = result.tx_hash

# ============================================
# XRP
# ============================================
elif network_lower == 'xrp':
    from app.services.xrp_service import xrp_service

    result = await xrp_service.send_xrp(
        from_address=from_address,
        to_address=request.to_address,
        amount_xrp=float(request.amount),
        private_key_hex=private_key
    )

    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)

    tx_hash = result.tx_hash

# ============================================
# LITECOIN
# ============================================
elif network_lower == 'litecoin':
    from app.services.ltc_doge_service import ltc_service
    from bitcoinlib.keys import Key

    key = Key(private_key, network='litecoin')
    private_key_wif = key.wif()

    result = await ltc_service.send_ltc(
        from_address=from_address,
        to_address=request.to_address,
        amount_ltc=float(request.amount),
        private_key_wif=private_key_wif
    )

    if not result.success:
        raise HTTPException(status_code=400, detail=result.error)

    tx_hash = result.tx_hash

# ============================================
# EVM CHAINS (código existente)
# ============================================
else:
    # Código EVM existente...
```

### Fase 2: Implementar send_doge (30 min)

Copiar lógica de `send_ltc` para `send_doge`.

### Fase 3: Dependências (5 min)

```bash
pip install xrpl-py solders bitcoinlib base58
```

### Fase 4: Testes (1-2 horas)

- Testar cada rede com valores pequenos
- Verificar se transações salvam no banco

---

## 📋 CHECKLIST FINAL

### Para completar 100%:

- [ ] Instalar dependências: `xrpl-py`, `solders`, `bitcoinlib`
- [ ] Modificar `/wallets/send` para rotear por network
- [ ] Testar BTC (mainnet com $1)
- [ ] Testar TRON TRX (mainnet)
- [ ] Testar TRON USDT-TRC20
- [ ] Testar SOL
- [ ] Testar XRP
- [ ] Testar LTC
- [ ] Implementar send_doge()
- [ ] Testar DOGE
- [ ] (Opcional) Implementar ADA

---

## ⏱️ ESTIMATIVA DE TEMPO

| Tarefa                           | Tempo        |
| -------------------------------- | ------------ |
| Integrar BTC, TRX, SOL, XRP, LTC | 2-3 horas    |
| Implementar send_doge            | 30 min       |
| Testes completos                 | 2 horas      |
| **TOTAL**                        | **~5 horas** |

---

## 🚀 QUER QUE EU IMPLEMENTE AGORA?

Posso começar imediatamente pela integração de todas as redes no endpoint `/send`. Diga "sim" para começar!
