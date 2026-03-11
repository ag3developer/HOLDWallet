# 📧 Checklist para Notificações por Email Funcionarem 100%

## Status Atual

- ✅ Código de notificações implementado
- ✅ Templates multi-idioma (PT/EN/ES)
- ✅ Integração nos endpoints (P2P, OTC, WolkPay, etc.)
- ❌ **Pacote `resend` não instalado**
- ❓ **API Key do Resend não configurada**

---

## 📋 Passos para Ativar as Notificações

### 1️⃣ Instalar pacote Resend (OBRIGATÓRIO)

**Local:**

```bash
cd /Users/josecarlosmartins/Documents/HOLDWallet/backend
pip install resend
```

**Produção (DigitalOcean):**

```bash
ssh root@api.wolknow.com
cd /path/to/backend
pip install resend
# ou reinicie o serviço para instalar do requirements.txt
```

---

### 2️⃣ Configurar API Key do Resend (OBRIGATÓRIO)

#### Passo a passo:

1. Acesse: https://resend.com/signup
2. Crie uma conta ou faça login
3. Vá em **API Keys** → **Create API Key**
4. Copie a chave (começa com `re_`)

#### Configure a variável de ambiente:

**Local (.env):**

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**DigitalOcean App Platform:**

1. Acesse o painel do app
2. Vá em **Settings** → **App-Level Environment Variables**
3. Adicione:
   - Key: `RESEND_API_KEY`
   - Value: `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
4. Salve e **Deploy** novamente

---

### 3️⃣ Verificar Domínio no Resend (RECOMENDADO)

Para enviar de `@wolknow.com`:

1. No Resend, vá em **Domains** → **Add Domain**
2. Digite: `wolknow.com`
3. Adicione os registros DNS:

   ```
   Tipo: MX
   Nome: send
   Valor: feedback-smtp.us-east-1.amazonses.com
   Prioridade: 10

   Tipo: TXT
   Nome: send
   Valor: v=spf1 include:amazonses.com ~all
   ```

4. Aguarde verificação (pode levar até 24h)

**Sem domínio verificado:** Só pode enviar de `onboarding@resend.dev`

---

### 4️⃣ Testar Localmente

```bash
cd /Users/josecarlosmartins/Documents/HOLDWallet/backend

# Instalar resend
pip install resend

# Configurar API Key
export RESEND_API_KEY="re_xxxxxxxxxxxxx"

# Testar
python -c "
import resend
resend.api_key = 'SUA_API_KEY_AQUI'
r = resend.Emails.send({
    'from': 'onboarding@resend.dev',
    'to': 'seu@email.com',
    'subject': 'Teste WOLK NOW',
    'html': '<h1>Email funcionando!</h1>'
})
print(r)
"
```

---

### 5️⃣ Verificar Logs no Backend

Quando uma notificação é enviada, você verá nos logs:

✅ **Sucesso:**

```
INFO: Trade notifications sent for trade abc123
INFO: Email enviado com sucesso para user@email.com
```

⚠️ **Modo Log-Only (sem API Key):**

```
WARNING: NotificationService em modo log-only
INFO: [LOG-ONLY] Email para user@email.com: Compra OTC Concluída
```

❌ **Erro:**

```
ERROR: Failed to send trade notification: API key invalid
```

---

## 📊 Tipos de Notificações Implementadas

| Serviço      | Evento                 | Email |
| ------------ | ---------------------- | ----- |
| **P2P**      | Trade iniciado         | ✅    |
| **P2P**      | Trade concluído        | ✅    |
| **P2P**      | Trade cancelado        | ✅    |
| **P2P**      | Disputa aberta         | ✅    |
| **OTC**      | Compra/Venda concluída | ✅    |
| **WolkPay**  | Invoice criada         | ✅    |
| **WolkPay**  | Invoice paga           | ✅    |
| **Boletos**  | Processando            | ✅    |
| **Boletos**  | Pago                   | ✅    |
| **Depósito** | Crypto recebido        | ✅    |
| **Saque**    | Enviado/Concluído      | ✅    |
| **Conta**    | Boas-vindas            | ✅    |
| **KYC**      | Status alterado        | ✅    |

---

## 🔧 Solução de Problemas

### Email não chega

1. Verifique se `RESEND_API_KEY` está configurada
2. Verifique os logs do backend
3. Confira a pasta de spam do usuário
4. Verifique se o domínio está verificado

### Erro "API key invalid"

- A API Key está incorreta ou expirou
- Gere uma nova em https://resend.com/api-keys

### Erro "Domain not verified"

- O domínio `wolknow.com` precisa ser verificado no Resend
- Ou use `onboarding@resend.dev` como remetente temporário

### NotificationService em modo log-only

- `RESEND_API_KEY` não está configurada
- Verifique variáveis de ambiente

---

## 🚀 Deploy em Produção

1. SSH no servidor ou acesse DigitalOcean
2. Adicione `RESEND_API_KEY` às variáveis de ambiente
3. Instale/atualize dependências: `pip install -r requirements.txt`
4. Reinicie o serviço backend
5. Faça uma operação de teste
6. Verifique os logs

---

## 📞 Suporte Resend

- Documentação: https://resend.com/docs
- Status: https://resend.com/status
- Preços: 3.000 emails/mês grátis, depois $20/10.000

---

**Última atualização:** 11/03/2026
