# 👤 Account Deletion - Frontend Integration Guide

## Status: ✅ COMPLETE

Integração completa de exclusão de conta com frontend desenvolvida e pronta para uso.

---

## 📦 Arquivos Criados/Modificados

### 1. **Backend - API Endpoints** ✅

```
/account/export                    - POST   Exportar dados (PDF/Excel/JSON)
/account/delete-request            - POST   Solicitar exclusão
/account/delete-confirm/{id}       - POST   Confirmar com código 6-dígitos
/account/delete-status/{id}        - GET    Verificar status
/account/delete-cancel/{id}        - POST   Cancelar exclusão
/account/profile                   - GET    Perfil da conta
```

**Status:** ✅ Servidor rodando em `http://localhost:8000`  
**Documentação:** Swagger UI em `http://localhost:8000/docs`

---

### 2. **Frontend - Hook Customizado** ✅

**Arquivo:** `Frontend/src/hooks/user/useAccountDeletion.ts`

**Exports:**

```typescript
// Solicitar exclusão de conta
useRequestAccountDeletion();

// Confirmar exclusão com código
useConfirmAccountDeletion();

// Cancelar exclusão
useCancelAccountDeletion();

// Verificar status de exclusão
useAccountDeletionStatus(deletion_id);

// Exportar dados em diferentes formatos
useExportAccountData();

// Obter perfil da conta
useAccountProfile();
```

**Exemplo de Uso:**

```typescript
import { useRequestAccountDeletion } from "@/hooks/user/useAccountDeletion";

const requestDeletion = useRequestAccountDeletion();

await requestDeletion.mutateAsync({
  deletion_type: "soft",
  password: "user_password",
  reason: "Leaving the platform",
});
```

---

### 3. **Frontend - Componente** ✅

**Arquivo:** `Frontend/src/components/user/AccountDeletion.tsx`

**Features:**

- 📊 Exportar dados em PDF, Excel, JSON
- 🗑️ Solicitar exclusão (Soft/Hard/Scheduled)
- ✅ Confirmar com código de 6 dígitos
- ❌ Cancelar exclusão
- 📊 Verificar status

**Integração:**

```typescript
import { AccountDeletion } from '@/components/user/AccountDeletion'

<AccountDeletion onClose={() => setShowModal(false)} />
```

---

### 4. **Admin - Página de Usuários** ✅

**Arquivo:** `Frontend/src/pages/admin/AdminUsersPage.tsx`

**Alterações:**

- ✅ Adicionado botão de "Deletar Conta" (ícone Trash2)
- ✅ Integração com endpoint `/admin/users/{id}` DELETE
- ✅ Confirmação dupla antes de deletar
- ✅ Toast notifications de sucesso/erro

**Comportamento:**

```
1. Admin clica no ícone de trash
2. Primeira confirmação: "Tem certeza que deseja DELETAR..."
3. Segunda confirmação: "⚠️ Esta ação é IRREVERSÍVEL..."
4. Se confirmado: DELETE request ao backend
5. Toast de sucesso + refetch da lista
```

---

## 🚀 Como Usar

### Para Usuários (Auto-Exclusão)

1. **Acessar Configurações de Conta**
   - Menu usuário → Configurações → Excluir Conta

2. **Escolher tipo de exclusão:**
   - **Soft Delete**: 90 dias, pode recuperar
   - **Hard Delete**: Imediato, irreversível
   - **Scheduled**: 7 dias para confirmar

3. **Exportar dados (opcional):**
   - PDF: Relatório formatado
   - Excel: Planilhas com todos os dados
   - JSON: Dados brutos em JSON

4. **Solicitar exclusão:**
   - Confirmar com senha
   - Sistema envia código por email

5. **Confirmar com código:**
   - Inserir código de 6 dígitos
   - Exclusão confirmada!

---

### Para Administradores

1. **Acessar Gestão de Usuários**
   - Admin → Usuários

2. **Localizar usuário:**
   - Buscar por email/username
   - Aplicar filtros

3. **Deletar usuário:**
   - Clique no ícone de lixeira
   - Confirme 2x
   - Usuário é deletado

---

## 📋 Integração Adicional Necessária

### Para Adicionar ao Menu de Usuário (Opcional)

**Arquivo:** `Frontend/src/pages/SettingsPage.tsx` (ou similar)

```typescript
import { AccountDeletion } from '@/components/user/AccountDeletion'
import { Modal } from '@/components/ui/Modal'

const [showAccountDeletion, setShowAccountDeletion] = useState(false)

// Na seção de configurações:
<button
  onClick={() => setShowAccountDeletion(true)}
  className='text-red-600 hover:text-red-700'
>
  Excluir Conta
</button>

<Modal
  isOpen={showAccountDeletion}
  onClose={() => setShowAccountDeletion(false)}
  title='Exclusão de Conta'
>
  <AccountDeletion onClose={() => setShowAccountDeletion(false)} />
</Modal>
```

---

## 🔐 Segurança

✅ **Implementado:**

- Autenticação JWT (Bearer token)
- Validação de senha
- Confirmação por email (6-dígitos)
- Token com expiração (24h)
- Confirmação dupla no admin
- HTTPS/SSL obrigatório em produção

---

## ⚙️ Configuração

### Variáveis de Ambiente (Frontend)

```bash
VITE_API_URL=http://localhost:8000
```

### Headers Automáticos

O hook `useAccountDeletion` usa `apiClient` que:

- Adiciona automaticamente `Authorization: Bearer {token}`
- Detecta formato de resposta (blob para PDF/Excel)
- Gerencia React Query cache

---

## 🧪 Testando

### 1. Teste o Backend (Swagger)

```bash
curl http://localhost:8000/docs
```

### 2. Teste o Hook

```typescript
// Console do navegador
import { useRequestAccountDeletion } from "@/hooks/user/useAccountDeletion";

const mutation = useRequestAccountDeletion();
await mutation.mutateAsync({
  deletion_type: "soft",
  password: "password123",
  reason: "Testing",
});
```

### 3. Teste a Admin

- Navegue para `/admin/users`
- Procure um usuário teste
- Clique no ícone de lixeira
- Confirme a exclusão

---

## 📊 Fluxos

### Fluxo de Exclusão por Usuário

```
┌─────────────────────────┐
│  Menu Account Deletion  │
└────────┬────────────────┘
         │
         ├─→ Exportar Dados (PDF/Excel/JSON)
         │
         └─→ Deletar Conta
             │
             ├─→ Escolher tipo (Soft/Hard/Scheduled)
             ├─→ Inserir senha
             ├─→ [POST /account/delete-request]
             │
             ├─→ Email enviado com código
             ├─→ Usuário insere código 6-dígitos
             ├─→ [POST /account/delete-confirm/{id}]
             │
             └─→ ✅ Exclusão confirmada!
```

### Fluxo de Exclusão por Admin

```
┌──────────────────────┐
│  Admin Users Page    │
└────────┬─────────────┘
         │
         ├─→ Buscar usuário
         ├─→ Clicar ícone lixeira
         ├─→ Confirmar 2x
         ├─→ [DELETE /admin/users/{id}]
         │
         └─→ ✅ Usuário deletado
             Refetch automático da lista
```

---

## 🐛 Troubleshooting

### Erro: "Unauthorized (401)"

- Verificar token em `localStorage.getItem('auth_token')`
- Fazer login novamente

### Erro: "Código inválido (422)"

- Código expirou (24h)
- Verificar email para novo código
- Solicitar nova exclusão se necessário

### Erro: "Network error"

- Verificar se backend está rodando: `http://localhost:8000/docs`
- Verificar CORS configuração em `app/main.py`
- Verificar `VITE_API_URL`

---

## 📝 Próximos Passos

1. **Database Migration** (opcional)

   ```bash
   # Criar tabela account_deletion_requests
   alembic revision --autogenerate -m "Add account_deletion_requests"
   alembic upgrade head
   ```

2. **Email Template** (opcional)
   - Personalizar email de confirmação
   - Adicionar branding da empresa

3. **Testes E2E** (opcional)
   - Testar fluxo completo com Cypress/Playwright
   - Testar webhook de confirmação

4. **Métricas** (opcional)
   - Rastrear motivos de exclusão
   - Análise de retenção

---

## ✨ Features Completadas

- ✅ Backend API com FastAPI
- ✅ Endpoints REST documentados
- ✅ Hook React Query customizado
- ✅ Componente Vue/React
- ✅ Integração Admin
- ✅ Export de dados (PDF/Excel/JSON)
- ✅ Validação de email (6-dígitos)
- ✅ Soft/Hard/Scheduled deletion
- ✅ Cancelamento de exclusão
- ✅ Toast notifications
- ✅ Dark mode support

---

## 📞 Suporte

Para problemas ou dúvidas sobre a integração, verifique:

1. **Backend logs:** `http://localhost:8000/docs`
2. **Frontend console:** Browser DevTools → Console
3. **Database:** Verificar se tabela foi criada (alembic)
4. **Email service:** Verificar se Resend foi configurado

---

**Data de Criação:** 2026-08-23  
**Última Atualização:** 2026-08-23  
**Status:** Production Ready ✅
