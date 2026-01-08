# 🚀 Gas Sponsor Service - Documentação

## Visão Geral

O **Gas Sponsor Service** é uma solução profissional para resolver o problema de usuários que não têm token nativo (MATIC/ETH) para pagar taxas de gas em transações de VENDA.

## Como Funciona

### Fluxo Completo

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FLUXO DE VENDA COM GAS SPONSOR                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. 👤 Usuário solicita VENDA de 100 USDT                          │
│     └── Quer receber R$ 600,00                                     │
│                                                                     │
│  2. ⛽ Sistema verifica gas do usuário                              │
│     └── Usuário tem 7 USDT mas 0 MATIC                             │
│                                                                     │
│  3. 💰 Plataforma calcula custo de gas                             │
│     └── ~0.005 MATIC necessário                                    │
│     └── + 50% margem = 0.0075 MATIC                                │
│     └── + 20% segurança = 0.009 MATIC                              │
│                                                                     │
│  4. 📤 Plataforma envia MATIC para usuário                         │
│     └── TX: 0xabc123... (gas da plataforma para usuário)           │
│     └── Aguarda confirmação                                         │
│                                                                     │
│  5. 💵 Calcula taxa em BRL                                         │
│     └── 0.009 MATIC × R$ 3,50 = R$ 0,03                           │
│     └── + 10% admin fee = R$ 0,003                                 │
│     └── Taxa total: R$ 0,04 (arredondado)                          │
│                                                                     │
│  6. 📤 Executa transação de USDT                                   │
│     └── 7 USDT: Carteira usuário → Carteira plataforma             │
│     └── TX: 0xdef456...                                            │
│                                                                     │
│  7. 💰 Desconta taxa do valor BRL                                  │
│     └── Original: R$ 600,00                                        │
│     └── Taxa de rede: - R$ 0,04                                    │
│     └── Final: R$ 599,96                                           │
│                                                                     │
│  8. ✅ Trade concluído                                             │
│     └── Admin paga R$ 599,96 via PIX                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Configuração

### Variáveis de Ambiente (.env)

```env
# Carteira da plataforma - OBRIGATÓRIO
PLATFORM_WALLET_PRIVATE_KEY=0x...  # Chave privada
PLATFORM_WALLET_ADDRESS=0x...       # Endereço público

# RPCs das redes
POLYGON_RPC_URL=https://polygon-rpc.com
ETHEREUM_RPC_URL=https://eth.drpc.org
```

### Parâmetros do Serviço

No arquivo `gas_sponsor_service.py`:

```python
NETWORK_CONFIG = {
    "polygon": {
        "gas_margin": Decimal("1.5"),        # 50% a mais do estimado
        "native_to_brl_rate": Decimal("3.50"), # Cotação MATIC/BRL
        "admin_fee_percent": Decimal("0.10"),  # 10% taxa admin
    }
}
```

## Manutenção

### 1. Abastecer Carteira da Plataforma

A carteira da plataforma precisa ter MATIC/ETH suficiente para patrocinar os usuários.

**Recomendação**: Manter pelo menos **1 MATIC** na carteira da plataforma.

Para verificar saldo:

```python
from app.services.gas_sponsor_service import gas_sponsor_service

balance = gas_sponsor_service.get_platform_gas_balance("polygon")
print(f"Saldo: {balance['balance']} {balance['native_symbol']}")
print(f"Alerta: {balance['low_balance_alert']}")
```

### 2. Atualizar Cotações

As cotações MATIC/BRL e ETH/BRL devem ser atualizadas periodicamente:

```python
# Em gas_sponsor_service.py
NETWORK_CONFIG = {
    "polygon": {
        "native_to_brl_rate": Decimal("3.50"),  # Atualizar conforme mercado
    }
}
```

**Sugestão futura**: Integrar com API de cotação (CoinGecko, Binance).

## Logs

O serviço gera logs detalhados:

```
⛽ Verificando necessidade de gas sponsor...
💰 Gas check: {"has_enough_gas": false, "current_balance": 0, "required_gas": 0.0075}
📤 Enviando 0.009 MATIC para 0xUser...
✅ Gas enviado para usuário! TX: 0xabc123
⏳ Aguardando confirmação do gas...
✅ Gas confirmado! Block: 12345678
✅ Gas sponsor completo!
   TX: 0xabc123
   Enviado: 0.009 MATIC
   Taxa BRL: R$ 0.04
💰 Taxa de rede descontada: R$ 0.04
   BRL original: R$ 600.00 → BRL final: R$ 599.96
```

## Tratamento de Erros

| Erro                                          | Causa              | Solução                |
| --------------------------------------------- | ------------------ | ---------------------- |
| "PLATFORM_WALLET_PRIVATE_KEY não configurada" | .env incorreto     | Verificar configuração |
| "Timeout aguardando confirmação"              | Rede congestionada | Aumentar timeout       |
| "insufficient funds" na plataforma            | Carteira sem MATIC | Abastecer carteira     |

## Benefícios

1. **UX Melhorada**: Usuário não precisa comprar MATIC
2. **Transparência**: Taxa visível e descontada automaticamente
3. **Profissional**: Solução enterprise-grade
4. **Seguro**: Plataforma controla o processo

## Estrutura de Arquivos

```
backend/app/services/
├── gas_sponsor_service.py          # ⭐ NOVO - Serviço de patrocínio
├── blockchain_withdraw_service.py  # Modificado para usar gas sponsor
└── ...
```

## API Response (após implementação)

```json
{
  "success": true,
  "tx_hash": "0xdef456...",
  "from_address": "0xUser...",
  "to_address": "0xPlatform...",
  "network": "polygon",
  "gas_sponsor": {
    "sponsored": true,
    "gas_tx_hash": "0xabc123...",
    "gas_amount_sent": "0.009",
    "network_fee_brl": "0.04",
    "native_symbol": "MATIC"
  }
}
```

---

**Data**: Janeiro 2026
**Autor**: HOLD Wallet Team
