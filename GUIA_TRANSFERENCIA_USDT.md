# 🚀 GUIA: Como Transferir USDT

## Pré-requisitos ✅

1. **Backend rodando:**

   ```bash
   bash start_backend.sh
   ```

2. **2FA habilitado** - Você precisa de um token 2FA para fazer transferências
   - Se não tiver, configure em: Settings > Autenticação 2FA

---

## Opção 1: Usar Script Python (Simples) 🐍

```bash
python3 transfer_simples.py
```

**O que o script faz:**

1. ✅ Faz login automaticamente
2. ✅ Mostra seus saldos atuais
3. ✅ Oferece opções de transferência
4. ✅ Executa a transferência
5. ✅ Mostra o resultado

---

## Opção 2: Usar cURL (Manual) 📡

### 1. Fazer Login:

```bash
curl -X POST http://127.0.0.1:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "app@holdwallet.com",
    "password": "Abc123@@"
  }'
```

Copie o `access_token` da resposta.

### 2. Transferir USDT:

```bash
curl -X POST http://127.0.0.1:8000/wallets/send \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_id": "ada6ce2a-9a69-4328-860c-e918d37f23bb",
    "to_address": "0x7913436c1B61575F66d31B6d5b77767A7dC30EFa",
    "amount": "0.5",
    "network": "polygon",
    "fee_level": "standard",
    "token_symbol": "USDT",
    "two_factor_token": "OBTIDO_DO_AUTENTICADOR"
  }'
```

---

## Opção 3: Usar Frontend (UI) 🖥️

1. Abra o navegador
2. Vá para: `http://localhost:3000`
3. Clique em "Enviar USDT"
4. Preencha os dados
5. Confirme com 2FA
6. Pronto! 🎉

---

## Seus Saldos Atuais 💰

| Rede    | Moeda | Saldo | Status |
| ------- | ----- | ----- | ------ |
| Polygon | MATIC | 15.99 | ✅     |
| Polygon | USDT  | 2.04  | ✅     |
| BASE    | USDT  | 8.44  | ✅     |

---

## Endereço para Teste 🧪

- **Seu endereço:** `0xa1aaacff9902bdaaebfbba53214bdce5d6f442e6`
- **Endereço de destino (teste):** `0x7913436c1B61575F66d31B6d5b77767A7dC30EFa`

---

## Troubleshooting 🔧

**Erro: "Saldo insuficiente"**

- Verifique se tem saldo na rede escolhida
- Lembre-se que USDT em Polygon ≠ USDT em BASE

**Erro: "2FA token inválido"**

- Confirme que o token do autenticador está correto
- Tokens expiram em 30 segundos!

**Erro: "Backend não conecta"**

- Verifique: `bash start_backend.sh`
- Tente acessar: `http://127.0.0.1:8000/docs`

---

## Próximos Passos 🎯

1. ✅ Faça uma transferência de teste com 0.5 USDT
2. ✅ Verifique no explorador (PolygonScan/BaseScan)
3. ✅ Quando confirmar, transfira valores maiores
4. ✅ Recarregue o frontend para ver saldos atualizados

---

**Dúvidas?** Consulte a documentação: `00_COMECE_AQUI.md`
