# 🌐 WOLKNOW - CONFIGURAÇÃO DE DOMÍNIOS

**Data**: 14 de Dezembro de 2025  
**Status**: Pronto para Configuração

---

## 📋 Resumo de Domínios

| Serviço      | URL                          | Tipo         | Status          |
| ------------ | ---------------------------- | ------------ | --------------- |
| **Frontend** | https://wolknow.com          | Frontend App | ⏳ À Configurar |
| **API**      | https://api.wolknow.com      | Backend API  | ⏳ À Configurar |
| **Docs**     | https://api.wolknow.com/docs | Swagger UI   | ⏳ À Configurar |

---

## 🔧 CONFIGURAÇÃO NECESSÁRIA

### 1️⃣ Frontend (https://wolknow.com)

**Atualmente hospedado em**: Vercel  
**Novo domínio**: wolknow.com

#### Passos:

1. **Obter o domínio**

   ```
   Registrar wolknow.com em:
   - GoDaddy
   - Namecheap
   - Registro.br (se for .br)
   ```

2. **Configurar em Vercel**

   ```
   Dashboard > Project Settings > Domains

   Adicionar:
   - wolknow.com
   - www.wolknow.com

   Vercel fornecerá 2 nameservers:
   - ns1.vercel-dns.com
   - ns2.vercel-dns.com
   ```

3. **Apontar domínio para Vercel**

   ```
   Registrador de Domínio > Configurações DNS

   Tipo: NS (Nameservers)
   - ns1.vercel-dns.com
   - ns2.vercel-dns.com
   ```

4. **Validar em Vercel**
   ```
   Dashboard espera 5-10 minutos para reconhecer
   Verifica automaticamente quando apontar
   ```

---

### 2️⃣ Backend API (https://api.wolknow.com)

**Atualmente hospedado em**: DigitalOcean App Platform  
**URL Atual**: holdwallet-backend-njjvk.ondigitalocean.app  
**Novo domínio**: api.wolknow.com

#### Passos:

1. **Configurar em DigitalOcean**

   ```
   DigitalOcean Dashboard > Apps > wolknow-backend

   1. Clique em "Edit" ou "Settings"
   2. Procure por "Domains" ou "Custom Domains"
   3. Adicione: api.wolknow.com
   ```

2. **Obter CNAME**

   ```
   DigitalOcean fornecerá:
   CNAME: holdwallet-backend-njjvk.ondigitalocean.app

   Ou será algo como:
   CNAME: app-[ID].ondigitalocean.app
   ```

3. **Apontar domínio**

   ```
   Registrador de Domínio > Configurações DNS

   Nome: api
   Tipo: CNAME
   Valor: holdwallet-backend-njjvk.ondigitalocean.app

   OU (se usar DigitalOcean DNS):

   Nome: api
   Tipo: CNAME
   Valor: [fornecido pelo DigitalOcean]
   ```

4. **Validar Certificado SSL**

   ```
   DigitalOcean gerará automaticamente certificado Let's Encrypt

   Esperar 5-10 minutos para validação
   ```

---

## 🔐 CERTIFICADO SSL (HTTPS)

### Vercel (Frontend)

- ✅ **Automático**: Vercel configura certificado grátis automatically
- TTL: 2 horas

### DigitalOcean (Backend)

- ✅ **Automático**: DigitalOcean configura Let's Encrypt automatically
- Renovação: Automática

---

## 🔄 ATUALIZAR CÓDIGO

### Backend (Já Atualizado ✅)

**Arquivo**: `backend/app/core/config.py`

```python
CORS_ORIGINS: List[str] = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "https://wolknow.com",
    "https://www.wolknow.com",
    "https://api.wolknow.com"
]
```

### Frontend (Já Atualizado ✅)

**Arquivo**: `Frontend/.env.production`

```bash
REACT_APP_API_URL=https://api.wolknow.com
```

**Arquivo**: `Frontend/src/config/api.ts`

```typescript
const API_URL = process.env.REACT_APP_API_URL || "https://api.wolknow.com";
```

---

## ✅ CHECKLIST DE CONFIGURAÇÃO

### Antes de Tudo

- [ ] Registrar domínio wolknow.com
- [ ] Ter acesso ao registrador (GoDaddy, Namecheap, etc)
- [ ] Ter acesso a Vercel Dashboard
- [ ] Ter acesso a DigitalOcean Dashboard

### Configuração Vercel (Frontend)

- [ ] Entrar no Vercel Dashboard
- [ ] Ir para projeto hold-wallet-deaj (ou novo projeto)
- [ ] Acessar Project Settings > Domains
- [ ] Adicionar: wolknow.com
- [ ] Adicionar: www.wolknow.com
- [ ] Copiar nameservers fornecidos por Vercel

### Configuração DigitalOcean (Backend)

- [ ] Entrar no DigitalOcean Dashboard
- [ ] Ir para Apps > wolknow-backend
- [ ] Clicar em Settings/Edit
- [ ] Procurar por Custom Domains ou Domains
- [ ] Adicionar: api.wolknow.com
- [ ] Obter CNAME fornecido
- [ ] Validar certificado SSL

### Configuração DNS (Registrador)

- [ ] Ir para registrador de domínio
- [ ] Opção 1: Mudar nameservers para Vercel

  - [ ] Remover nameservers antigos
  - [ ] Adicionar ns1.vercel-dns.com
  - [ ] Adicionar ns2.vercel-dns.com
  - [ ] Salvar (TTL ~24 horas)

- Opção 2: Usar DigitalOcean DNS
  - [ ] Mudar nameservers para DigitalOcean
  - [ ] No DigitalOcean:
    - [ ] Criar novo domain: wolknow.com
    - [ ] Adicionar record tipo CNAME:
      - [ ] @ → Vercel (para root)
      - [ ] www → Vercel
      - [ ] api → DigitalOcean backend

### Após Configuração

- [ ] Aguardar 5-10 minutos de propagação
- [ ] Testar: https://wolknow.com
- [ ] Testar: https://api.wolknow.com/health
- [ ] Testar: https://api.wolknow.com/docs
- [ ] Login no Frontend deve chamar api.wolknow.com
- [ ] Verificar logs de erro no browser (DevTools)

---

## 🔍 COMO TESTAR PROPAGAÇÃO DNS

### Opção 1: Via Terminal

```bash
# Verificar DNS
nslookup wolknow.com
dig wolknow.com

# Verificar API
nslookup api.wolknow.com
dig api.wolknow.com

# Verificar CNAME
nslookup api.wolknow.com
# Deve retornar: holdwallet-backend-njjvk.ondigitalocean.app
```

### Opção 2: Online Tools

- https://www.whatsmydns.net/
- https://dns.google/
- https://mxtoolbox.com/

### Opção 3: Browser

```
Abrir Developer Tools (F12)
Network > Obter página
Verificar se requests vão para api.wolknow.com
```

---

## 📧 EMAILS & CONFIGURAÇÕES OPCIONAIS

Se quiser usar email na Wolknow:

```bash
# MX Records
mail.wolknow.com MX 10 mail.wolknow.com

# SPF (para evitar spam)
@  TXT  "v=spf1 include:sendgrid.net ~all"

# DKIM (signatures)
default._domainkey TXT "v=DKIM1; ..."
```

**Status**: Opcional por enquanto

---

## 🚀 TIMELINE ESPERADO

```
Hoje:
  - Registrar domínio (5 min)
  - Configurar Vercel (5 min)
  - Configurar DigitalOcean (5 min)
  - Apontar DNS (5 min)
  Total: ~20 minutos

Próximas 24 horas:
  - DNS propaga globalmente (6-24 horas)
  - Certificados SSL são validados (5-15 min)
  - Serviço fica 100% operacional

Próximos 7 dias:
  - Cache DNS do ISP atualiza
  - Todos os usuários veem novo domínio
```

---

## 🆘 TROUBLESHOOTING

### DNS não está apontando

```bash
# Verificar
dig wolknow.com
# Se não retornar IP, esperar mais tempo

# Limpar cache local
sudo dscacheutil -flushcache  # macOS
ipconfig /flushdns            # Windows
```

### SSL Certificate Error

```
Causa: Certificado ainda não foi validado
Solução: Aguardar 5-10 minutos após apontar DNS
```

### Frontend não consegue chamar API

```
Erro: CORS ou Connection Refused
Causa: CORS_ORIGINS não inclui wolknow.com
Solução: ✅ Já atualizado no backend
```

### Certificado auto-assinado em localhost

```
Se ainda estiver desenvolvendo localmente:
- Frontend .env.development: http://localhost:8000
- Frontend .env.production: https://api.wolknow.com
```

---

## 📞 SUPORTE DURANTE MIGRAÇÃO

Se algo der errado:

1. **Vercel Support**: vercel.com/support
2. **DigitalOcean Support**: support.digitalocean.com
3. **Registrador**: GoDaddy, Namecheap, etc

---

## ✨ PRÓXIMAS AÇÕES

1. ✅ Código já foi atualizado
2. ⏳ **Você precisa fazer**:

   - Registrar domínio wolknow.com
   - Configurar Vercel
   - Configurar DigitalOcean
   - Apontar DNS

3. ⏳ Após configuração:
   - Testar domínios
   - Fazer commit com confirmação
   - Redeploy em produção (automático)

---

**Criado em**: 2025-12-14 14:45:00  
**Status**: Pronto para Configuração  
**Próxima Etapa**: Registrar domínio wolknow.com
