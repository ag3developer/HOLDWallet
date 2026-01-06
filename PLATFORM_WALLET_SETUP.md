# 🏦 Configuração das Carteiras do Sistema - WOLK NOW

## 📋 Visão Geral

O sistema WOLK NOW possui **duas estruturas de carteiras** que trabalham juntas:

| Componente                 | Propósito                                        | Armazenamento                           |
| -------------------------- | ------------------------------------------------ | --------------------------------------- |
| **SystemBlockchainWallet** | Carteira HD com 16 redes para receber taxas/fees | Banco de dados (mnemonic criptografada) |
| **PLATFORM_WALLET**        | Carteira para operações OTC (enviar crypto)      | Variáveis de ambiente                   |

---

## 🔄 Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    WOLK NOW - SISTEMA DE CARTEIRAS              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │        SystemBlockchainWallet (Banco de Dados)          │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  • Carteira HD com mnemonic de 12 palavras              │   │
│  │  • Suporta 16 redes (ETH, Polygon, BSC, Base, etc)      │   │
│  │  • Mnemonic criptografada com ENCRYPTION_KEY            │   │
│  │  • Gerenciada via /admin/system-wallet                  │   │
│  │  • ID: <UUID gerado automaticamente>                    │   │
│  │                                                         │   │
│  │  Endereço EVM: 0x<SEU_ENDERECO_EVM>                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              │ (mesma carteira)                 │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │         PLATFORM_WALLET (Variáveis de Ambiente)         │   │
│  │  ─────────────────────────────────────────────────────  │   │
│  │  • Private key exportada da SystemBlockchainWallet      │   │
│  │  • Usada para assinar transações de saída (OTC)         │   │
│  │  • Configurada no servidor de produção                  │   │
│  │                                                         │   │
│  │  PLATFORM_WALLET_ADDRESS=0x<SEU_ENDERECO>               │   │
│  │  PLATFORM_WALLET_PRIVATE_KEY=0x<SUA_PRIVATE_KEY>        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Variáveis de Ambiente Necessárias

### No servidor de produção (DigitalOcean):

```env
# Carteira do Sistema (derivada da SystemBlockchainWallet)
# ⚠️ SUBSTITUA pelos valores reais da sua carteira!
PLATFORM_WALLET_ADDRESS=0x<SEU_ENDERECO_AQUI>
PLATFORM_WALLET_PRIVATE_KEY=0x<SUA_PRIVATE_KEY_AQUI>

# Chave de criptografia (para descriptografar dados no banco)
# ⚠️ Use a mesma chave gerada no ambiente de desenvolvimento!
ENCRYPTION_KEY=<SUA_ENCRYPTION_KEY_AQUI>

# ID da carteira no banco de dados (opcional)
SYSTEM_BLOCKCHAIN_WALLET_ID=<UUID_DA_CARTEIRA>
```

### Exemplo de valores (NÃO USE EM PRODUÇÃO):

```env
# ⚠️ EXEMPLO - NÃO USE ESSES VALORES!
PLATFORM_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f12345
PLATFORM_WALLET_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
ENCRYPTION_KEY=exemplo_base64_key_aqui_nao_usar_em_producao=
```

---

## 🔄 Fluxo de Operações

### Usuário COMPRA Crypto (BUY/OTC)

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Usuário       │         │    Backend      │         │  Platform       │
│   (Paga PIX)    │         │    WOLK NOW     │         │  Wallet         │
└────────┬────────┘         └────────┬────────┘         └────────┬────────┘
         │                           │                           │
         │  1. Solicita compra       │                           │
         │ ─────────────────────────>│                           │
         │                           │                           │
         │  2. Paga via PIX/TED      │                           │
         │ ─────────────────────────>│                           │
         │                           │                           │
         │                           │  3. Usa PLATFORM_WALLET   │
         │                           │     PRIVATE_KEY para      │
         │                           │ ─────────────────────────>│
         │                           │     assinar transação     │
         │                           │                           │
         │  4. Recebe USDT/ETH       │                           │
         │<───────────────────────────────────────────────────── │
         │     na carteira pessoal   │                           │
         │                           │                           │
└─────────────────────────────────────────────────────────────────┘
```

### Usuário VENDE Crypto (SELL)

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Usuário       │         │    Backend      │         │  System         │
│ (Envia Crypto)  │         │    WOLK NOW     │         │  Wallet         │
└────────┬────────┘         └────────┬────────┘         └────────┬────────┘
         │                           │                           │
         │  1. Solicita venda        │                           │
         │ ─────────────────────────>│                           │
         │                           │                           │
         │  2. Envia USDT/ETH        │                           │
         │ ────────────────────────────────────────────────────>│
         │     para endereço         │                           │
         │     do sistema            │                           │
         │                           │                           │
         │                           │  3. Backend confirma      │
         │                           │<───────────────────────── │
         │                           │     recebimento           │
         │                           │                           │
         │  4. Recebe PIX/TED        │                           │
         │<───────────────────────── │                           │
         │     na conta bancária     │                           │
         │                           │                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 💰 Redes Suportadas

A SystemBlockchainWallet suporta **16 redes** + stablecoins:

| Rede      | Símbolo | Tipo de Endereço           |
| --------- | ------- | -------------------------- |
| Ethereum  | ETH     | EVM (compartilhado)        |
| Polygon   | MATIC   | EVM (compartilhado)        |
| BSC       | BNB     | EVM (compartilhado)        |
| Base      | ETH     | EVM (compartilhado)        |
| Avalanche | AVAX    | EVM (compartilhado)        |
| Bitcoin   | BTC     | Endereço BTC específico    |
| Solana    | SOL     | Endereço Solana específico |
| Tron      | TRX     | Endereço Tron específico   |
| ...       | ...     | ...                        |

> **Nota:** Redes EVM (Ethereum, Polygon, BSC, Base, Avalanche) compartilham o mesmo endereço.

---

## 🛡️ Segurança

### Camadas de Proteção:

1. **Mnemonic criptografada** no banco com `ENCRYPTION_KEY` (Fernet)
2. **Private keys derivadas** apenas quando necessário
3. **Variáveis de ambiente** para operações de saída
4. **Acesso admin** restrito via `/admin/system-wallet`

### ⚠️ NUNCA FAÇA:

- ❌ Commitar private keys no código
- ❌ Expor ENCRYPTION_KEY publicamente
- ❌ Compartilhar mnemonic com terceiros
- ❌ Usar carteira pessoal como Platform Wallet
- ❌ Deixar credenciais em arquivos de documentação

### ✅ SEMPRE FAÇA:

- ✅ Use variáveis de ambiente no servidor
- ✅ Mantenha backup da mnemonic offline (papel/cofre)
- ✅ Monitore transações suspeitas
- ✅ Configure alertas de saldo baixo

---

## 📊 Gerenciamento via Admin

### Acessar painel de administração:

```
https://seu-dominio.com/admin/system-wallet
```

### Funcionalidades disponíveis:

- 📊 Ver saldos de todas as redes
- 📥 Ver endereços para receber
- 📤 Realizar saques (com 2FA)
- 📈 Histórico de transações
- 🔄 Atualizar saldos em cache

### Endpoints da API:

| Método | Endpoint                                               | Descrição                 |
| ------ | ------------------------------------------------------ | ------------------------- |
| GET    | `/admin/system-blockchain-wallet/status`               | Status da carteira        |
| GET    | `/admin/system-blockchain-wallet/addresses`            | Listar endereços          |
| POST   | `/admin/system-blockchain-wallet/refresh-balances`     | Atualizar saldos          |
| POST   | `/admin/system-blockchain-wallet/add-missing-networks` | Adicionar redes faltantes |

---

## 🔧 Configuração no Servidor

### DigitalOcean App Platform:

1. Acesse: **Apps** → Seu App → **Settings**
2. Vá em **App-Level Environment Variables**
3. Adicione as variáveis (veja seção "Variáveis de Ambiente")
4. Clique **Save** e faça redeploy

---

## 🔍 Verificação

### Verificar se está configurado corretamente:

Nos logs do backend, deve aparecer:

```
✅ Platform wallet configured: 0x<SEU_ENDERECO>
```

Se aparecer:

```
❌ PLATFORM_WALLET_PRIVATE_KEY não configurada!
```

A variável não foi configurada corretamente.

### Testar via API:

```bash
curl -X GET https://api.seu-dominio.com/v1/admin/system-blockchain-wallet/status \
  -H "Authorization: Bearer SEU_TOKEN_ADMIN"
```

---

## 📈 Monitoramento

### Alertas Recomendados:

| Alerta            | Condição   | Ação                  |
| ----------------- | ---------- | --------------------- |
| Saldo Baixo MATIC | < 10 MATIC | Recarregar gas        |
| Saldo Baixo USDT  | < $1,000   | Recarregar liquidez   |
| Transação Grande  | > $10,000  | Verificar manualmente |

### Ferramentas de Monitoramento:

- [Polygonscan](https://polygonscan.com/address/SEU_ENDERECO) - Polygon
- [Etherscan](https://etherscan.io/address/SEU_ENDERECO) - Ethereum
- [BscScan](https://bscscan.com/address/SEU_ENDERECO) - BSC

---

## ✅ Checklist de Configuração

- [ ] SystemBlockchainWallet criada no banco de dados
- [ ] Endereços gerados para 16 redes
- [ ] Mnemonic criptografada e guardada
- [ ] `PLATFORM_WALLET_ADDRESS` configurada no servidor
- [ ] `PLATFORM_WALLET_PRIVATE_KEY` configurada no servidor
- [ ] `ENCRYPTION_KEY` configurada no servidor
- [ ] Redeploy do backend realizado
- [ ] Verificar logs (sem erro de "não configurada")
- [ ] Enviar saldo inicial de MATIC para gas
- [ ] Enviar saldo inicial de USDT para operações
- [ ] Testar transação pequena

---

## 🆘 Troubleshooting

### Erro: "PLATFORM_WALLET_PRIVATE_KEY não configurada"

```
Causa: Variável de ambiente não definida
Solução: Adicione a variável no DigitalOcean e faça redeploy
```

### Erro: "insufficient funds for gas"

```
Causa: Falta MATIC/ETH/BNB para pagar gas
Solução: Envie tokens nativos para o endereço da Platform Wallet
```

### Erro: "Falha ao descriptografar"

```
Causa: ENCRYPTION_KEY incorreta ou diferente
Solução: Verifique se está usando a mesma key do ambiente de desenvolvimento
```

---

**Documento atualizado em:** 6 de Janeiro de 2026  
**Versão:** 2.1 - Credenciais removidas, apenas exemplos genéricos
