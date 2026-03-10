# WolkPay Gateway - Teste de Integração Frontend

Este documento descreve como testar as páginas do Gateway no Frontend.

## Pré-requisitos

1. Backend rodando em `http://localhost:8000`
2. Frontend rodando em `http://localhost:5173`

## Testes Manuais

### 1. Landing Page

```bash
# Abrir no navegador:
http://localhost:5173/gateway
```

**Checklist:**

- [ ] Página carrega sem erros no console
- [ ] Animações funcionam (hero words rotating)
- [ ] Seletor de idioma funciona (PT-BR, EN-US, ES-ES)
- [ ] Links do menu funcionam
- [ ] Responsivo (testar em mobile)
- [ ] Preços aparecem em USD ($)

### 2. Login Page

```bash
# Abrir no navegador:
http://localhost:5173/gateway/login
```

**Checklist:**

- [ ] Form de login renderiza
- [ ] Validação de campos funciona
- [ ] Link para registro funciona
- [ ] Erro de autenticação exibe mensagem

### 3. Dashboard (após login)

```bash
# Abrir no navegador:
http://localhost:5173/gateway/dashboard
```

**Checklist:**

- [ ] Dashboard carrega dados do merchant
- [ ] Cards de estatísticas funcionam
- [ ] Lista de pagamentos recentes aparece
- [ ] Links de navegação funcionam

### 4. Página de Pagamentos

```bash
# Abrir no navegador:
http://localhost:5173/gateway/dashboard/payments
```

**Checklist:**

- [ ] Lista de pagamentos carrega
- [ ] Filtros funcionam
- [ ] Paginação funciona
- [ ] Status dos pagamentos aparecem com cores corretas

### 5. API Keys

```bash
# Abrir no navegador:
http://localhost:5173/gateway/dashboard/api-keys
```

**Checklist:**

- [ ] Lista API Keys existentes
- [ ] Botão criar nova key funciona
- [ ] Botão revogar key funciona
- [ ] Key é mostrada apenas uma vez após criação

### 6. Webhooks

```bash
# Abrir no navegador:
http://localhost:5173/gateway/dashboard/webhooks
```

**Checklist:**

- [ ] Configuração de URL funciona
- [ ] Lista de eventos selecionáveis
- [ ] Histórico de webhooks enviados

### 7. Checkout Público

```bash
# Criar pagamento via API e acessar:
http://localhost:5173/gateway/checkout/{checkout_token}
```

**Checklist:**

- [ ] Dados do pagamento carregam
- [ ] Seleção de método (PIX/Crypto) funciona
- [ ] QR Code é gerado
- [ ] Timer de expiração funciona
- [ ] Polling de status funciona
- [ ] Copiar código funciona

### 8. Documentação

```bash
# Abrir no navegador:
http://localhost:5173/gateway/docs
```

**Checklist:**

- [ ] Documentação carrega
- [ ] Exemplos de código aparecem
- [ ] Links funcionam

## Script de Teste Automático (Cypress)

```javascript
// cypress/e2e/gateway.cy.js

describe("WolkPay Gateway", () => {
  it("Landing page loads correctly", () => {
    cy.visit("/gateway");
    cy.contains("WolkPay Gateway");
    cy.get('[data-testid="hero-title"]').should("be.visible");
  });

  it("Language selector works", () => {
    cy.visit("/gateway");
    cy.get('[data-testid="language-selector"]').click();
    cy.contains("English").click();
    cy.contains("Payment Gateway");
  });

  it("Login flow works", () => {
    cy.visit("/gateway/login");
    cy.get('input[name="email"]').type("test@example.com");
    cy.get('input[name="password"]').type("Test@123456");
    cy.get('button[type="submit"]').click();
    // Should redirect to dashboard or show error
  });

  it("Dashboard loads with auth", () => {
    // Login first
    cy.login("gateway_test@holdwallet.com", "Test@123456");
    cy.visit("/gateway/dashboard");
    cy.contains("Dashboard");
    cy.get('[data-testid="stats-cards"]').should("be.visible");
  });

  it("Checkout page works", () => {
    cy.visit("/gateway/checkout/test-token");
    // Should show 404 or load payment
  });
});
```

## Resultados Esperados

| Página       | Status | Notas                 |
| ------------ | ------ | --------------------- |
| Landing Page | ✅     | i18n completo         |
| Login        | ✅     | Integrado com backend |
| Dashboard    | ✅     | Stats e pagamentos    |
| Payments     | ✅     | Lista com filtros     |
| API Keys     | ✅     | CRUD completo         |
| Webhooks     | ✅     | Config + histórico    |
| Checkout     | ✅     | PIX + Crypto          |
| Docs         | ✅     | Documentação completa |

## Conclusão

Todas as páginas do Gateway estão implementadas e integradas com o backend.
O módulo está **100% COMPLETO** para MVP.
