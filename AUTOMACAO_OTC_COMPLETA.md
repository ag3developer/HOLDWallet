# 🤖 Automação Completa do Sistema OTC - WOLK NOW

## Visão Geral

Este documento descreve as automações implementadas no sistema de trading OTC (Over-The-Counter) da WOLK NOW, eliminando a necessidade de intervenção manual do admin para a maioria das operações.

---

## 📊 Fluxos de Operação

### 🟢 COMPRA (BUY) - Fluxo Automático

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FLUXO DE COMPRA (BUY)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Usuário solicita cotação                                                │
│     └─► POST /api/v1/instant-trade/quote                                    │
│                                                                             │
│  2. Usuário confirma e cria trade com PIX                                   │
│     └─► POST /api/v1/instant-trade/create-with-pix                          │
│         ├─► Trade criado (Status: PENDING)                                  │
│         ├─► PIX gerado via API Banco do Brasil                              │
│         └─► QR Code retornado ao usuário                                    │
│                                                                             │
│  3. Usuário paga o PIX (escaneando QR Code)                                 │
│                                                                             │
│  4. 🤖 AUTOMÁTICO: Banco do Brasil envia webhook                            │
│     └─► POST /api/v1/webhooks/bb/pix                                        │
│         ├─► Sistema verifica pagamento                                      │
│         ├─► Trade atualizado (Status: PAYMENT_CONFIRMED)                    │
│         └─► 🚀 Crypto enviada automaticamente ao usuário                    │
│             └─► Status: COMPLETED                                           │
│                                                                             │
│  ✅ RESULTADO: Zero intervenção do admin necessária!                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 🔴 VENDA (SELL) - Fluxo Automático

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FLUXO DE VENDA (SELL)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Usuário solicita cotação de venda                                       │
│     └─► POST /api/v1/instant-trade/quote (operation: "sell")                │
│                                                                             │
│  2. Usuário confirma a venda                                                │
│     └─► POST /api/v1/instant-trade/create                                   │
│         ├─► Trade criado (Status: PENDING)                                  │
│         │                                                                   │
│         └─► 🤖 AUTOMÁTICO: Sistema processa venda                           │
│             ├─► Transfere crypto do usuário para plataforma                 │
│             ├─► Registra TX hash da transação                               │
│             └─► Status: CRYPTO_RECEIVED                                     │
│                                                                             │
│  3. 👨‍💼 MANUAL: Admin envia PIX ao usuário                                   │
│     └─► Admin acessa painel e clica "Finalizar Venda"                       │
│         └─► Status: COMPLETED                                               │
│                                                                             │
│  ⚡ MELHORIA: Admin só precisa enviar PIX e finalizar!                      │
│     (Antes: Admin tinha que processar crypto manualmente)                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Detalhes Técnicos

### Integração Banco do Brasil PIX

#### Configuração

| Parâmetro    | Valor                                        |
| ------------ | -------------------------------------------- |
| Ambiente     | Produção                                     |
| Autenticação | mTLS com e-CNPJ                              |
| Chave PIX    | 24275355000151 (CNPJ)                        |
| Webhook URL  | `https://api.wolknow.com/v1/webhooks/bb/pix` |

#### TXID (Identificador de Transação)

- **Requisito BB**: 26-35 caracteres alfanuméricos
- **Formato Gerado**: `WOLK{ANO}{HEX_CODE}{RANDOM_PADDING}`
- **Exemplo**: `WOLK20260AEB8EX7K9M2N4P5Q8`

#### Permissões API (Escopos)

- ✅ `cob.write` - Criar cobranças PIX
- ✅ `cob.read` - Consultar cobranças PIX
- ✅ `pix.read` - Consultar pagamentos recebidos
- ❌ `pix.write` - Enviar PIX (não implementado)

### Webhook de Pagamento PIX

```python
# Endpoint: /api/v1/webhooks/bb/pix
# Método: POST

# Payload recebido do Banco do Brasil:
{
    "pix": [
        {
            "endToEndId": "E00000000202601131234567890",
            "txid": "WOLK20260AEB8EX7K9M2N4P5Q8",
            "valor": "150.00",
            "horario": "2026-01-13T14:30:00.000Z",
            "pagador": {
                "cpf": "12345678901",
                "nome": "Nome do Pagador"
            }
        }
    ]
}
```

### Processamento Automático de SELL

```python
# Arquivo: backend/app/services/instant_trade_service.py
# Método: create_trade_from_quote()

# Quando operation == "sell":
# 1. Trade é criado com status PENDING
# 2. Sistema automaticamente executa:
withdraw_result = blockchain_withdraw_service.withdraw_crypto_from_user(
    db=self.db,
    trade=trade,
    network="polygon"  # Rede mais econômica
)

# 3. Se sucesso:
#    - Status atualizado para CRYPTO_RECEIVED
#    - TX hash registrado
#    - Histórico criado

# 4. Se falha:
#    - Trade permanece PENDING
#    - Admin pode processar manualmente
```

---

## 📁 Arquivos Modificados

### 1. `backend/app/services/instant_trade_service.py`

**Mudança**: Adicionado processamento automático de SELL

```python
# Após criar trade de SELL, sistema automaticamente:
# - Chama blockchain_withdraw_service.withdraw_crypto_from_user()
# - Atualiza status para CRYPTO_RECEIVED
# - Registra TX hash e histórico
```

### 2. `backend/app/routers/instant_trade.py`

**Mudança**: Correção do TXID para webhook

```python
# TXID gerado com mínimo 26 caracteres
if len(base_txid) < 26:
    padding_needed = 26 - len(base_txid)
    random_padding = ''.join(secrets.choice(
        string.ascii_uppercase + string.digits
    ) for _ in range(padding_needed))
    txid = base_txid + random_padding

# IMPORTANTE: Salvar txid retornado pelo BB
actual_txid = pix_data.get("txid", txid)
trade_obj.pix_txid = actual_txid
```

### 3. `backend/app/routers/webhooks_bb.py`

**Funcionalidade**: Recebe webhook do BB e processa automaticamente

```python
# Webhook endpoint: POST /api/v1/webhooks/bb/pix
# 1. Recebe notificação de pagamento
# 2. Busca trade pelo txid
# 3. Atualiza status para PAYMENT_CONFIRMED
# 4. Envia crypto automaticamente ao usuário
# 5. Atualiza status para COMPLETED
```

---

## 🔄 Comparativo: Antes vs Depois

### COMPRA (BUY)

| Etapa                 | Antes                | Depois                |
| --------------------- | -------------------- | --------------------- |
| Criar PIX             | ❌ Manual via BB     | ✅ Automático via API |
| Verificar pagamento   | ❌ Manual no BB      | ✅ Webhook automático |
| Confirmar pagamento   | ❌ Admin clica botão | ✅ Automático         |
| Enviar crypto         | ❌ Admin processa    | ✅ Automático         |
| **Intervenção Admin** | **4 etapas**         | **0 etapas**          |

### VENDA (SELL)

| Etapa                     | Antes                      | Depois                     |
| ------------------------- | -------------------------- | -------------------------- |
| Criar trade               | ✅ Automático              | ✅ Automático              |
| Retirar crypto do usuário | ❌ Admin clica "Processar" | ✅ Automático              |
| Enviar PIX ao usuário     | ❌ Manual                  | ❌ Manual                  |
| Finalizar venda           | ❌ Admin clica "Finalizar" | ❌ Admin clica "Finalizar" |
| **Intervenção Admin**     | **3 etapas**               | **1 etapa**                |

---

## ⚠️ Tratamento de Erros

### Falha no Processamento Automático de SELL

```python
try:
    withdraw_result = blockchain_withdraw_service.withdraw_crypto_from_user(...)

    if withdraw_result["success"]:
        # ✅ Sucesso - trade atualizado automaticamente
        trade.status = TradeStatus.CRYPTO_RECEIVED
    else:
        # ⚠️ Falha - trade permanece PENDING
        logger.warning(f"SELL automático falhou: {withdraw_result.get('error')}")
        # Admin pode processar manualmente via painel

except Exception as e:
    # ❌ Erro - trade permanece PENDING
    logger.error(f"Erro no SELL automático: {str(e)}")
    # Trade não é cancelado, apenas aguarda processamento manual
```

### Falha no Webhook PIX

- Se webhook falhar, trade permanece `PENDING`
- Usuário pode usar endpoint `/pix-status` para verificar pagamento
- Admin pode confirmar pagamento manualmente se necessário

---

## 📈 Métricas de Automação

| Operação | Taxa de Automação | Intervenção Manual  |
| -------- | ----------------- | ------------------- |
| BUY      | 100%              | Apenas em falhas    |
| SELL     | 66%               | Apenas envio de PIX |

---

## 🚀 Próximos Passos (Roadmap)

### PIX Pagamento para SELL (Futuro)

Para automatizar 100% da venda, seria necessário implementar **PIX Pagamento** (envio de PIX):

```python
# Requer escopos adicionais no BB:
# - pix.write (enviar PIX)

# Fluxo futuro:
# 1. Sistema recebe crypto do usuário (automático ✅)
# 2. Sistema envia PIX automaticamente (a implementar)
# 3. Trade finalizado (automático)
```

**Nota**: PIX Pagamento requer aprovação adicional do Banco do Brasil e configuração de limites.

---

## 📝 Commits Relacionados

| Commit     | Descrição                                             |
| ---------- | ----------------------------------------------------- |
| `8e22edc6` | Fix: TXID generation 26+ chars, save BB returned txid |
| `57875a43` | Feat: Auto-process SELL trades                        |

---

## 🧪 Como Testar

### Testar BUY Automático

1. No app, vá para "Comprar Crypto"
2. Selecione uma crypto (ex: USDT)
3. Insira valor em BRL
4. Confirme e escaneie o QR Code PIX
5. Pague o PIX
6. ✅ Crypto deve aparecer automaticamente na carteira

### Testar SELL Automático

1. No app, vá para "Vender Crypto"
2. Selecione crypto que possui
3. Insira quantidade
4. Confirme a venda
5. ✅ Crypto deve ser transferida automaticamente (status: CRYPTO_RECEIVED)
6. Admin envia PIX e finaliza

### Verificar Logs

```bash
# SSH no servidor
ssh root@api.wolknow.com

# Ver logs do backend
docker logs -f holdwallet-backend --tail 100

# Procurar por automações
docker logs holdwallet-backend 2>&1 | grep -E "(SELL automático|webhook|CRYPTO_RECEIVED)"
```

---

## 📞 Suporte

Em caso de problemas com as automações:

1. Verificar logs do backend
2. Conferir status do trade no painel admin
3. Verificar configuração do webhook no BB
4. Contactar equipe de desenvolvimento

---

**Última atualização**: 13 de Janeiro de 2026  
**Versão**: 1.0  
**Autor**: WOLK NOW Development Team
