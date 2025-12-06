# 🔧 Solução Temporária: Forçar 2FA

## 🎯 Problema Identificado

**Backend:** 2FA está HABILITADO (`is_enabled = 1`)  
**Frontend:** Hook `use2FAStatus` retorna `enabled: false` ou não está funcionando

## ✅ SOLUÇÃO TEMPORÁRIA

### Opção 1: Forçar 2FA no Modal (Quick Fix)

Edite `WalletPage.tsx` linha ~1508:

```typescript
<SendConfirmationModal
  // ...outras props
  requires2FA={true}  // ← FORÇAR para true temporariamente
/>
```

Isso vai fazer o campo 2FA aparecer SEMPRE.

### Opção 2: Desabilitar 2FA no Backend (Para testar sem 2FA)

```bash
cd backend
sqlite3 holdwallet.db "UPDATE two_factor_auth SET is_enabled = 0;"
```

## 🔍 PRÓXIMO PASSO: Debugar Hook

O hook `use2FAStatus` não está funcionando corretamente. Vou investigar por quê.

**Por favor, me diga:**
1. Aparece `[WalletPage] 2FA Status:` no console quando carrega a página?
2. Qual opção você prefere: Forçar 2FA ou desabilitar temporariamente?
