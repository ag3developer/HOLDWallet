# WolkPay Gateway - Configuração de Subdomínio

## 📋 Visão Geral

O WolkPay Gateway agora funciona com subdomínio separado, permitindo uma experiência dedicada para merchants sem misturar com o app principal de usuários.

**Estrutura:**

```
wolknow.com           → App principal (carteira, P2P, etc)
gateway.wolknow.com   → Portal de Merchants (WolkPay Gateway)
api.wolknow.com       → Backend FastAPI
```

---

## 🚀 Passos de Configuração

### 1️⃣ Cloudflare - Criar Subdomínio

1. Acesse o painel do Cloudflare
2. Selecione o domínio `wolknow.com`
3. Vá em **DNS** → **Records**
4. Clique em **Add record**

```
Type: CNAME
Name: gateway
Target: cname.vercel-dns.com
Proxy status: ✅ Proxied (laranja)
TTL: Auto
```

> **Nota**: O target pode ser `cname.vercel-dns.com` ou `hold-wallet-deaj.vercel.app` dependendo da sua configuração Vercel.

### 2️⃣ Vercel - Adicionar Domínio

1. Acesse o painel do Vercel
2. Selecione o projeto **hold-wallet** (ou nome do seu projeto)
3. Vá em **Settings** → **Domains**
4. Clique em **Add Domain**
5. Digite: `gateway.wolknow.com`
6. Aguarde verificação (geralmente automática com Cloudflare)

### 3️⃣ Verificar Configuração

Após alguns minutos, verifique:

```bash
# Verificar DNS
dig gateway.wolknow.com

# Verificar HTTPS
curl -I https://gateway.wolknow.com
```

---

## 🔧 Arquitetura de Código

### Detecção de Domínio

O arquivo `src/utils/domainDetection.ts` detecta qual app renderizar:

```typescript
export function isGatewayDomain(): boolean {
  const hostname = globalThis.location.hostname.toLowerCase();
  return hostname.startsWith("gateway.") || hostname === "gateway.localhost";
}
```

### Roteamento no App.tsx

```typescript
function AppRouter() {
  if (isGatewayDomain()) {
    return <GatewayApp />  // Portal de Merchants
  }
  return <MainApp />  // App principal
}
```

### Estrutura de Arquivos

```
Frontend/src/
├── apps/
│   └── GatewayApp.tsx        # App separado para merchants
├── components/layout/
│   └── GatewayLayout.tsx     # Layout do dashboard merchant
├── pages/gateway/
│   ├── GatewayLandingPage.tsx    # Landing page marketing
│   ├── GatewayLoginPage.tsx      # Login de merchants
│   ├── GatewayCheckoutPage.tsx   # Checkout público
│   └── dashboard/
│       ├── GatewayDashboardPage.tsx
│       ├── GatewayPaymentsPage.tsx
│       ├── GatewayApiKeysPage.tsx
│       ├── GatewayWebhooksPage.tsx
│       ├── GatewaySettingsPage.tsx
│       └── GatewayRegisterPage.tsx
└── utils/
    └── domainDetection.ts    # Utilitário de detecção de domínio
```

---

## 🧪 Teste Local

### Opção 1: Editar /etc/hosts

```bash
sudo nano /etc/hosts

# Adicionar:
127.0.0.1  gateway.localhost
```

Depois acesse: `http://gateway.localhost:3000`

### Opção 2: Usar porta diferente

Edite `domainDetection.ts` para detectar porta 3001:

```typescript
if (hostname === "localhost" && globalThis.location.port === "3001") {
  return "gateway";
}
```

Depois rode:

```bash
PORT=3001 npm run dev
```

---

## 🔐 CORS no Backend

O arquivo `.env.production` já foi atualizado para incluir o novo origin:

```bash
ALLOWED_ORIGINS=https://wolknow.com,https://gateway.wolknow.com,https://hold-wallet-deaj.vercel.app
```

---

## 📱 Rotas do Gateway

### Públicas (sem auth)

- `/` - Landing page
- `/login` - Login de merchant
- `/register` - Registro de merchant
- `/checkout/:token` - Checkout de pagamento

### Protegidas (requer auth)

- `/dashboard` - Dashboard principal
- `/payments` - Lista de pagamentos
- `/payments/:id` - Detalhes do pagamento
- `/api-keys` - Gerenciamento de API Keys
- `/webhooks` - Configuração de webhooks
- `/settings` - Configurações da conta

---

## ✅ Checklist de Deploy

- [ ] Criar registro DNS no Cloudflare
- [ ] Adicionar domínio no Vercel
- [ ] Verificar SSL automático
- [ ] Testar landing page: `https://gateway.wolknow.com`
- [ ] Testar login: `https://gateway.wolknow.com/login`
- [ ] Testar registro: `https://gateway.wolknow.com/register`
- [ ] Atualizar CORS no backend (já feito em .env.production)
- [ ] Fazer deploy do backend com novo CORS

---

## 🎨 Benefícios da Arquitetura

1. **Mesmo Deploy**: Um único build serve ambos os domínios
2. **SEO Separado**: Landing pages e meta tags específicas
3. **Branding Independente**: UX customizada para merchants
4. **Escalabilidade**: Pode separar deploys futuramente se necessário
5. **Cookies Isolados**: Auth separada por domínio se necessário
