# 🔐 Solução: Erro 403 (Forbidden) - Token não encontrado

## Problema

```
[API] ❌ No token found in any localStorage location
POST http://localhost:8000/wallets/send 403 (Forbidden)
```

## Causas Possíveis

1. **Sessão expirada** - O token JWT expirou após login
2. **Não autenticado** - Usuário tentou acessar sem fazer login
3. **Token removido** - LocalStorage foi limpo
4. **Browser diferente** - Login em um browser, mas testando em outro

## Solução

### ✅ Solução Rápida: Fazer Login Novamente

1. Acesse a página de **Login** da aplicação
2. Digite as credenciais:
   - Email: `app@holdwallet.com`
   - Senha: `Abc123@@`
3. Clique em **Entrar**
4. Verifique se o console mostra: `✅ Token found in Zustand store`
5. Tente enviar a transação novamente

### 🔍 Verificar Token no Console

1. Abra o **Console** do navegador (F12)
2. Execute:

```javascript
const auth = JSON.parse(localStorage.getItem("hold-wallet-auth"));
console.log("Token:", auth?.state?.token?.substring(0, 50) + "...");
```

3. Se não aparecer token, execute novo login

### 🛠️ Debug Detalhado

Se o problema persistir, abra o console e procure por:

- `[API] ✅ Token found in Zustand store` - Token carregado com sucesso
- `[API] ✅ Token found in localStorage` - Token recuperado do localStorage
- `[API] ❌ No token found in any localStorage location` - Token ausente

### 🔄 Fluxo de Autenticação Esperado

```
1. Login → Token salvo em localStorage + Zustand store
   ↓
2. Cada requisição → Procura token em:
   a) Zustand store (memória)
   b) localStorage (persistência)
   c) Fallback - todas as chaves
   ↓
3. Se token válido → Requisição com header Authorization
   ↓
4. Se token ausente → Redireciona para login
   ↓
5. Se token expirado (401) → Tenta refresh
```

## Código Relacionado

**Arquivo**: `Frontend/src/services/api.ts`

- Método `getStoredToken()` - Procura pelo token
- Método `handleAuthError()` - Redireciona para login
- Interceptor de resposta - Trata 401 e 403

**Arquivo**: `Frontend/src/stores/useAuthStore.ts`

- Estado persistido em localStorage
- Mantém token em memória

## ✨ Melhorias Implementadas

1. ✅ Recuperação automática de token do localStorage para memória (Zustand)
2. ✅ Tratamento explícito de erro 403 (Forbidden)
3. ✅ Logs detalhados do processo de autenticação
4. ✅ Redirecionamento automático para login quando token não existe

## Próximas Vezes

Após fazer login:

- O token ficará persistido no localStorage
- Será carregado automaticamente na próxima sessão
- Será mantido em memória para melhor performance

Se ainda enfrentar problemas, verifique:

1. Se o backend está rodando (`python run.py`)
2. Se o localStorage não foi limpo
3. Se está usando a URL correta (`http://localhost:3000`)
