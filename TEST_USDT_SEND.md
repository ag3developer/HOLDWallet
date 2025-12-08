# 📋 Guia Completo: Como Enviar USDT com 2FA

## ✅ Status do Sistema

Sistema completo implementado com suporte a envio de USDT com 2FA verificado em todas as redes EVM:

| Componente         | Status | Detalhes                                                      |
| ------------------ | ------ | ------------------------------------------------------------- |
| Frontend Detection | ✅     | SelectToken mostra USDT como primeira opção                   |
| Frontend Envio     | ✅     | SendPage.tsx envia `token_symbol`                             |
| Backend Rota       | ✅     | `/wallets/send` agora aceita `token_symbol` e `token_address` |
| Detecção de Token  | ✅     | Backend detecta USDT automaticamente                          |
| USDT Service       | ✅     | `USDTTransactionService` implementado                         |
| Assinatura         | ✅     | Tokens assinados com chave privada                            |
| Broadcast          | ✅     | Transação enviada para blockchain                             |
| Database           | ✅     | Transação salva com `token_symbol` e `token_address`          |
| 2FA                | ✅     | Verificação 2FA implementada antes de enviar                  |

## 🚀 Passo a Passo: Enviar USDT via UI

### Passo 1: Abrir a página de envio

1. Vá para a aba **"Enviar"** no wallet
2. A página abre com **USDT** pré-selecionado como token padrão

### Passo 2: Selecionar rede (Polygon)

1. Clique no seletor de rede
2. Escolha **"Polygon"** (recomendado para USDT - mais rápido e barato)
3. O balanço USDT da rede Polygon aparece automaticamente

### Passo 3: Preencher dados da transação

1. **Para (Recipient)**: Cole um endereço Ethereum válido

   - O sistema valida em tempo real (borda fica verde ✓ para válido)
   - Exemplo: `0x7913436c1B61575F66d31B6d5b77767A7dC30EFa`

2. **Valor**: Digite a quantidade de USDT a enviar

   - O sistema valida se há saldo suficiente
   - Mostra valor em USD em tempo real

3. **Velocidade de Gas** (Opcional):

   - Lenta (5-10min, mais barata)
   - Padrão (2-5min)
   - Rápida (<1min, mais cara)

4. **Nota** (Opcional): Adicione uma nota para a transação

### Passo 4: Estimar Taxas (Automático)

- Quando clica "Enviar", sistema automaticamente:
  1. Valida o endereço
  2. Chama `/wallets/estimate-fee` para obter taxas estimadas
  3. Mostra as taxas na modal 2FA

### Passo 5: Confirmar com 2FA

1. Modal "Autenticação de Dois Fatores" aparece com:

   - Detalhes da transação (para, valor, taxa)
   - Campo para código 2FA
   - Botões "Cancelar" e "Confirmar"

2. Abra seu app autenticador e obtenha o código 6 dígitos

   - App: Google Authenticator, Microsoft Authenticator, Authy, etc.
   - Chave: `JC7PZEAO2FLBUQZITP2UGUNFVVQCGRXC`

3. Digite o código 2FA (6 dígitos) no campo

   - O sistema aceita códigos de 6-8 dígitos
   - Campo mostra apenas números

4. Clique "Confirmar Envio"

### Passo 6: Confirmação de Sucesso

- Transação enviada com sucesso!
- TX Hash é retornado: `0x...`
- Status: **"pending"** (aguardando confirmação)
- Link do explorador: Polygon Scan com a transação

### Passo 7: Ver Transação no Histórico

1. Vá para a aba **"Transações"**
2. Transação aparece com:
   - TX Hash (clicável para ver na rede)
   - De/Para (endereços)
   - Valor: quantidade de USDT
   - Taxa: quanto foi gasto em gas
   - Status: "pending" ou "confirmed"
   - Data/Hora

## 🔐 Detalhes Técnicos do Envio de USDT

### Request Payload (Frontend → Backend)

```json
{
  "wallet_id": "cdfd5281-483a-4f4b-ad70-290d65d2216d",
  "to_address": "0x7913436c1B61575F66d31B6d5b77767A7dC30EFa",
  "amount": "1.5",
  "network": "polygon",
  "fee_level": "standard",
  "token_symbol": "USDT",
  "token_address": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
  "two_factor_token": "726005"
}
```

### O que Acontece no Backend

1. **2FA Validation**: Verifica se token 2FA é válido
2. **Token Detection**: Detecta que é USDT
3. **Contract Address**: Obtém endereço USDT na Polygon
4. **Private Key**: Deriva chave privada da seed phrase
5. **Gas Estimation**: Estima gas necessário para transação ERC-20
6. **Sign Transaction**: Assina transação com a chave privada
7. **Broadcast**: Envia transação para a blockchain Polygon
8. **Save to DB**: Salva registro com:
   - TX Hash (do blockchain)
   - Token symbol: "USDT"
   - Token address: contrato USDT
   - Status: "pending"
9. **Return Response**: Retorna TX hash e detalhes

### Response (Backend → Frontend)

```json
{
  "success": true,
  "mode": "custodial",
  "transaction_id": 42,
  "tx_hash": "0x95be59ac201ad20ebc812df3a079f28a3e9a92381811303402d5dd7ed697e851",
  "network": "polygon",
  "from_address": "0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6",
  "to_address": "0x7913436c1B61575F66d31B6d5b77767A7dC30EFa",
  "amount": "1.5",
  "fee": "0.50",
  "fee_level": "standard",
  "status": "pending",
  "explorer_url": "https://polygonscan.com/tx/0x95be59a...",
  "estimated_confirmation_time": "2-5 minutes"
}
```

## 📊 Endereços de Contrato USDT Suportados

| Rede        | Contrato USDT                                  | Decimals |
| ----------- | ---------------------------------------------- | -------- |
| Ethereum    | 0xdAC17F958D2ee523a2206206994597C13D831ec7     | 6        |
| **Polygon** | **0xc2132D05D31c914a87C6611C10748AEb04B58e8F** | **6**    |
| BSC         | 0x55d398326f99059fF775485246999027B3197955     | 18       |
| Arbitrum    | 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9     | 6        |
| Optimism    | 0x94b008aA00579c1307B0EF2c499aD98a8ce58e58     | 6        |
| Base        | 0xd9aAEc860b8A647Ac0d7fc6e6e8E5AB5D29CEBda     | 6        |
| Avalanche   | 0x9702230A8657203E2F72AE0e001Cab3f1995937b     | 6        |
| Fantom      | 0x049d68029b510645dab0ac87207b0c2a85b9122e     | 6        |

## 🧪 Testando o Sistema Completo

### Teste Mínimo (5 minutos)

1. Abra o app
2. Vá para "Enviar"
3. Mantenha USDT e Polygon selecionados
4. Digite um endereço válido (0x7913436c1B61575F66d31B6d5b77767A7dC30EFa)
5. Digite 0.5 como valor
6. Clique "Enviar"
7. Digite o código 2FA quando solicitado
8. Clique "Confirmar Envio"
9. Veja a transação no histórico (aba "Transações")

### Teste com Diferentes Redes

Repita o teste acima usando diferentes redes:

- ✅ Polygon (recomendado)
- ✅ Ethereum (mais caro em gas)
- ✅ BSC (rápido e barato)
- ✅ Base (L2 rápido)

### Teste de Validação

1. Digite endereço inválido → borda vermelha, não envia
2. Digite endereço válido → borda verde, permite enviar
3. Digite valor maior que saldo → erro "Saldo insuficiente"
4. Não copie 2FA → erro "Código 2FA inválido"

## 🔍 Troubleshooting

### "Token não suportado na rede X"

- USDT não está disponível naquela rede
- Escolha outra rede (Polygon, Ethereum, BSC, etc.)

### "Erro ao enviar USDT: Chave privada inválida"

- Seed phrase pode estar corrompida
- Tente fazer logout e login novamente

### "2FA token required"

- 2FA está habilitado, mas você não inseriu o código
- Obtenha código do app autenticador e tente novamente

### "Invalid address format"

- Endereço não é um endereço Ethereum válido (0x + 40 hex chars)
- Copie um endereço válido novamente

### Transação não confirma após 10 minutos

- Pode estar congestionada na rede
- Verifique TX hash no Polygon Scan
- Redes podem levar mais tempo em horários de pico

## 📝 Notas Importantes

1. **USDT no Polygon**: Recomendado para testes

   - Taxas muito mais baratas (alguns centavos)
   - Transações confirmam em 2-5 minutos
   - Adequado para teste com valores pequenos

2. **Confirmação**: Transações mostram como "pending" até serem incluídas em um bloco

3. **Histórico**: Todas as transações são salvas no banco de dados com:

   - TX Hash (blochain confirmation)
   - Token symbol (USDT)
   - Token address (contrato)
   - Status (pending/confirmed)

4. **Segurança**:
   - 2FA é verificado antes de assinar qualquer transação
   - Chave privada nunca é exposta
   - Seed phrase permanece criptografada no banco

## ✨ Próximos Passos

Após confirmar que o USDT está funcionando:

1. Testar com USDC
2. Testar em diferentes redes (BSC, Arbitrum, etc.)
3. Implementar notificações de confirmação
4. Adicionar histórico de transações em tempo real

---

**Última atualização**: 7 de Dezembro de 2025
**Status**: ✅ Pronto para teste completo
