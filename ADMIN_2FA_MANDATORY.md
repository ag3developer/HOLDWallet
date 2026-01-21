# 🔐 2FA Obrigatório para Administradores

## Implementação Concluída: 21/01/2026

### Resumo

Implementação de verificação 2FA (Authy/Google Authenticator) **obrigatória** para todos os usuários com `is_admin = true` no login.

---

## 🛡️ Fluxo de Segurança

### 1. Usuário Admin Tenta Login

```
email: admin@wolknow.com
password: ********
```

### 2. Backend Verifica

- ✅ Email/senha válidos
- ✅ Usuário ativo
- 🔍 **Verifica se é admin (`is_admin = true`)**

### 3. Se Admin sem 2FA Configurado

```json
{
  "status": 403,
  "detail": {
    "code": "ADMIN_2FA_REQUIRED",
    "message": "Administradores devem configurar 2FA antes de acessar. Entre em contato com o suporte."
  }
}
```

**BLOQUEIO TOTAL** - Admin não consegue acessar sem 2FA configurado.

### 4. Se Admin com 2FA Configurado (sem código)

```json
{
  "requires_2fa": true,
  "is_admin": true,
  "message": "Código 2FA obrigatório para administradores",
  "user_email": "admin@wolknow.com"
}
```

Frontend exibe tela de verificação 2FA.

### 5. Se Admin com Código 2FA Inválido

```json
{
  "status": 401,
  "detail": "Código 2FA inválido"
}
```

### 6. Se Admin com Código 2FA Válido

✅ Login autorizado, acesso ao painel admin.

---

## 📁 Arquivos Modificados

### Backend

#### `/backend/app/routers/auth.py`

- Importou `TwoFactorAuth`, `two_factor_service`, `crypto_service`
- Adicionou verificação de 2FA obrigatório para admins no endpoint `/login`
- Bloqueia admin sem 2FA configurado (403)
- Retorna `requires_2fa: true` quando admin precisa digitar código
- Verifica código TOTP via pyotp

#### `/backend/app/schemas/auth.py`

- Adicionou `two_factor_code: Optional[str]` ao `LoginRequest`

### Frontend

#### `/Frontend/src/types/index.ts`

- Adicionou `two_factor_code?: string` ao `LoginRequest`
- Adicionou `requires_2fa?: boolean`, `is_admin?: boolean`, `message?: string` ao `AuthResponse`

#### `/Frontend/src/hooks/useAuth.ts`

- Modificou `useLogin` para detectar `requires_2fa` e não navegar automaticamente

#### `/Frontend/src/pages/auth/LoginPage.tsx`

- Adicionou novo step `'admin-2fa'`
- Adicionou estado `adminEmail` para mostrar email do admin
- Modificou `handleSubmit` para detectar resposta de 2FA necessário
- Adicionou UI especial para verificação 2FA de admin (cor amber/laranja)

---

## 🎨 UI do 2FA Admin

A tela de verificação 2FA para admin é diferenciada:

- Borda **amber** (laranja) em vez de verde
- Ícone de **escudo** (FiShield)
- Título: "🛡️ Verificação de Administrador"
- Mostra o email do admin sendo verificado
- Botão: "Verificar e Entrar"

---

## ⚙️ Como Configurar 2FA para Admin

1. Admin faz login (se ainda não tem 2FA, será bloqueado)
2. Usar endpoint `/auth/2fa/setup` para gerar QR code
3. Escanear com Authy/Google Authenticator
4. Verificar com `/auth/2fa/verify`
5. Agora o admin pode fazer login com 2FA

---

## 🧪 Teste Manual

### Cenário 1: Admin sem 2FA configurado

```bash
curl -X POST https://api.wolknow.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@wolknow.com", "password": "senha123"}'

# Esperado: 403 ADMIN_2FA_REQUIRED
```

### Cenário 2: Admin com 2FA, sem código

```bash
curl -X POST https://api.wolknow.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@wolknow.com", "password": "senha123"}'

# Esperado: { "requires_2fa": true, "is_admin": true, ... }
```

### Cenário 3: Admin com código 2FA válido

```bash
curl -X POST https://api.wolknow.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@wolknow.com", "password": "senha123", "two_factor_code": "123456"}'

# Esperado: { "access_token": "...", "user": {...} }
```

---

## 🔒 Segurança Adicional

### Registros de Auditoria

Todas as tentativas são registradas:

- `admin_2fa_not_configured` - Admin tentou logar sem 2FA
- `invalid_2fa_code` - Código 2FA inválido
- `login` com sucesso - Após 2FA verificado

### Proteção contra Hackers

Mesmo que um hacker obtenha a senha do admin:

1. ❌ Não consegue logar sem o código 2FA
2. ❌ O código muda a cada 30 segundos
3. ❌ Precisa ter acesso físico ao celular do admin

---

## 📊 Status

- ✅ Backend implementado
- ✅ Frontend implementado
- ✅ UI diferenciada para admin
- ⏳ Testes pendentes
- ⏳ Deploy pendente

---

**Autor:** HOLD Wallet Security Team  
**Data:** 21/01/2026  
**Criticidade:** 🔴 ALTA - Proteção contra acessos não autorizados
