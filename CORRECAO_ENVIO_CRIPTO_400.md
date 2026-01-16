# 🔧 Correção: Erro 400 ao Enviar Cripto

**Data:** 16/01/2026  
**Problema:** Usuário recebe erro 400 ao tentar enviar cripto e é deslogado

---

## 🔍 Diagnóstico

### Sintomas Relatados

1. Usuário tenta enviar cripto da carteira para endereço externo
2. Faz o fluxo correto de autenticação biométrica
3. Recebe erro 400 (Bad Request)
4. É deslogado da conta

### Análise do Problema

#### 1. Token Biométrico Consumido Prematuramente

O token biométrico estava sendo **marcado como usado** no momento da verificação, ANTES da transação ser processada.

**Fluxo ANTIGO (problemático):**

```
1. Usuário faz biometria → Token criado
2. Frontend envia transação com token
3. Backend verifica token → MARCA COMO USADO ❌
4. Backend tenta enviar transação → ERRO de blockchain
5. Token já foi consumido → Usuário não pode tentar novamente
```

**Fluxo NOVO (corrigido):**

```
1. Usuário faz biometria → Token criado
2. Frontend envia transação com token
3. Backend verifica token → NÃO marca como usado ainda ✅
4. Backend tenta enviar transação
5. SE sucesso → Marca token como usado
6. SE erro → Token permanece válido para nova tentativa
```

#### 2. Possível Causa do Erro 400

O usuário **martins** (contato@josecarlosmartins.com) tentou enviar cripto, mas:

| Rede     | Saldo Nativo (Gas)   | Saldo USDT        |
| -------- | -------------------- | ----------------- |
| Polygon  | **3639.92 MATIC** ✅ | **23.74 USDT** ✅ |
| Ethereum | 0 ETH ❌             | N/A               |
| BSC      | 0 BNB ❌             | 0                 |
| Base     | 0 ETH ❌             | 0                 |

Se a transação foi enviada em **Polygon**, deveria funcionar. Se foi em outra rede, falharia por saldo insuficiente para gas.

---

## ✅ Correções Aplicadas

### 1. `webauthn_service.py`

**Modificações:**

- `verify_biometric_token()` agora aceita parâmetro `consume=True/False`
- Nova função `consume_biometric_token()` para marcar token como usado após sucesso

```python
def verify_biometric_token(self, user_id, token: str, consume: bool = True) -> bool:
    """
    Args:
        consume: Se True, marca o token como usado.
                 Se False, apenas valida sem consumir.
    """
    # ... validação ...

    if consume:
        token_record.is_used = True
        token_record.used_at = datetime.now(timezone.utc)
        db.commit()
        logger.info(f"✅ Token VERIFIED and CONSUMED")
    else:
        logger.info(f"✅ Token VERIFIED (not consumed yet)")

    return True

def consume_biometric_token(self, token: str) -> bool:
    """Consome token APÓS transação bem sucedida"""
    # ... marca como usado ...
```

### 2. `wallets.py` (endpoint `/wallets/send`)

**Modificações:**

- Verificar token com `consume=False` inicialmente
- Guardar referência do token
- Consumir token apenas APÓS sucesso da transação

```python
# Na verificação inicial:
is_valid = webauthn_service.verify_biometric_token(
    current_user.id,
    request.two_factor_token,
    consume=False  # Não consumir ainda!
)
if is_valid:
    biometric_token_to_consume = request.two_factor_token

# ... processamento da transação ...

# Após sucesso:
if biometric_token_to_consume:
    webauthn_service.consume_biometric_token(biometric_token_to_consume)
```

---

## 🧪 Como Testar

1. **Login** como usuário com 2FA/biometria habilitados
2. **Ir para Enviar** → Selecionar **Polygon** (única rede com saldo)
3. **Preencher** endereço de destino e valor
4. **Autenticar** com biometria
5. **Verificar** se transação é enviada com sucesso

### Se der erro:

- Verificar os logs do backend para a mensagem de erro específica
- O token biométrico NÃO será consumido, permitindo nova tentativa

---

## 📝 Arquivos Modificados

| Arquivo                                    | Modificação                                                        |
| ------------------------------------------ | ------------------------------------------------------------------ |
| `backend/app/services/webauthn_service.py` | Novo parâmetro `consume` e novo método `consume_biometric_token()` |
| `backend/app/routers/wallets.py`           | Lógica de consumo adiado do token                                  |

---

## 🚀 Deploy

Para aplicar em produção, fazer deploy do backend:

```bash
# Na droplet de produção
cd /opt/holdwallet/backend
git pull origin main
sudo systemctl restart holdwallet-backend
```

---

## ⚠️ Observações Importantes

1. **Saldo apenas em Polygon**: O usuário só tem saldo na rede Polygon. Transações em outras redes falharão por falta de gas.

2. **Token de 5 minutos**: O token biométrico expira em 5 minutos. Se a transação demorar mais que isso, o token expirará.

3. **Single-use**: Cada token só pode ser usado UMA vez. Após sucesso, é invalidado.
