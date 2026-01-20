# 🔐 Guia de Rotação da Carteira da Plataforma

## ⚠️ SITUAÇÃO CRÍTICA: Chave Privada Comprometida

A private key da carteira da plataforma foi encontrada **HARDCODED** nos seguintes arquivos do repositório:

- `backend/fix_private_key_encryption.py` (linha 24)
- `backend/fix_pk_production.py` (linha 25)

**Private Key Exposta:** `0x62603e4b9eedf6aad1e43bf1b2e34902de88d3338a28ee37c26043323d28e773`

**Carteira Comprometida:** `0xc3F6487656E9D7BD1148D997A9EeDD703435A1B7`

---

## 🚨 AÇÃO IMEDIATA NECESSÁRIA

### Passo 1: Gerar Nova Carteira

Use o endpoint da API:

```bash
curl -X POST "https://api.holdwallet.com/api/v1/admin/system-wallets/platform-wallet/generate-new" \
  -H "Authorization: Bearer <SEU_TOKEN_ADMIN>" \
  -H "Content-Type: application/json"
```

Ou pelo painel admin: `/admin/system-wallets/platform-wallet/generate-new`

**Guarde as informações retornadas:**

- Mnemonic (24 palavras)
- Private key
- Endereço

### Passo 2: Transferir Fundos

Se ainda há fundos na carteira antiga, use:

```bash
curl -X POST "https://api.holdwallet.com/api/v1/admin/system-wallets/platform-wallet/emergency-transfer" \
  -H "Authorization: Bearer <SEU_TOKEN_ADMIN>" \
  -H "Content-Type: application/json" \
  -d '{
    "to_address": "<NOVO_ENDERECO>",
    "old_private_key": "0x62603e4b9eedf6aad1e43bf1b2e34902de88d3338a28ee37c26043323d28e773",
    "network": "polygon"
  }'
```

Repita para outras redes onde há fundos (ethereum, bsc, base).

### Passo 3: Atualizar .env de Produção

Acesse o servidor via SSH e edite:

```bash
ssh root@<IP_DO_SERVIDOR>
cd /root/HOLDWallet/backend
nano .env
```

Altere:

```env
PLATFORM_WALLET_PRIVATE_KEY=<NOVA_PRIVATE_KEY>
PLATFORM_WALLET_ADDRESS=<NOVO_ENDERECO>
```

### Passo 4: Reiniciar Backend

```bash
lsof -ti:8000 | xargs kill -9
cd /root/HOLDWallet/backend && python3 run.py &
```

### Passo 5: Remover Arquivos com Chave Exposta

```bash
rm backend/fix_private_key_encryption.py
rm backend/fix_pk_production.py
```

E commitar a remoção:

```bash
git rm backend/fix_private_key_encryption.py
git rm backend/fix_pk_production.py
git commit -m "🔐 SECURITY: Remove exposed private keys"
git push
```

---

## 📋 Novos Endpoints Disponíveis

### 1. Gerar Nova Carteira

```
POST /api/v1/admin/system-wallets/platform-wallet/generate-new
```

Cria uma nova carteira com mnemonic e private key.
Retorna instruções completas de configuração.

### 2. Importar Carteira Existente

```
POST /api/v1/admin/system-wallets/platform-wallet/import
```

Parâmetros:

- `private_key`: Chave privada da carteira a importar

Útil quando você já tem uma carteira segura (ex: hardware wallet).

### 3. Transferência de Emergência

```
POST /api/v1/admin/system-wallets/platform-wallet/emergency-transfer
```

Parâmetros:

- `to_address`: Endereço de destino
- `old_private_key`: Chave privada da carteira antiga
- `network`: polygon | ethereum | bsc | base

Transfere automaticamente:

1. USDT
2. USDC
3. Moeda nativa (POL, ETH, BNB)

### 4. Verificar Status

```
GET /api/v1/admin/system-wallets/platform-wallet/status
```

Mostra:

- Se está configurada
- Endereço atual
- Saldos em todas as redes

---

## 🔒 Boas Práticas de Segurança

1. **NUNCA** commite private keys no Git
2. Use **variáveis de ambiente** para chaves sensíveis
3. Considere usar um **HSM** ou **Vault** para armazenar chaves
4. Habilite **2FA** em todas as contas admin
5. Faça **rotação periódica** das carteiras (a cada 3-6 meses)
6. Mantenha **backup seguro** das mnemonics (offline, criptografado)
7. Monitore transações suspeitas com alertas automáticos

---

## 🕵️ Investigação da Transferência Não Autorizada

TX suspeita: `0x15fa82c01ff0258def77e0b81b735d41fe34a825cd2ef5832d4cc9c92086c839`

- **Valor:** ~19 POL
- **Destino:** `0x763D460bD420111f1b539ce175f7A769b2cAB39E`
- **NÃO registrada** no banco de dados (sem audit trail)
- **Endereço destino** não pertence a nenhum usuário

**Conclusão:** Provavelmente alguém com acesso ao repositório usou a private key exposta para fazer a transferência.

---

## 📞 Em Caso de Emergência

1. Transfira TODOS os fundos imediatamente
2. Revogue acessos ao repositório Git
3. Faça auditoria de quem tinha acesso
4. Notifique autoridades se necessário
5. Documente tudo para análise forense
