# 🔍 Debug: Token 2FA Não Sendo Enviado

## ❌ Erro Atual
```
POST http://localhost:8000/wallets/send 403 (Forbidden)
"2FA token required. Please provide your authenticator code."
```

## 🔎 Diagnóstico Implementado

### Logs Adicionados:

1. **SendConfirmationModal.tsx** (linha ~299)
   ```typescript
   console.log('[SendModal] Confirming with:', {
     requires2FA,
     twoFactorToken,
     tokenLength: twoFactorToken.length,
     willSendToken: requires2FA ? twoFactorToken : undefined
   });
   ```

2. **WalletPage.tsx** (linha ~346)
   ```typescript
   console.log('[DEBUG] Sending transaction:', {
     wallet_id: selectedWallet.walletId,
     has_2fa_token: !!twoFactorToken,
     token_length: twoFactorToken?.length,
     token_value: twoFactorToken
   })
   ```

3. **sendService.ts** (linha ~139)
   ```typescript
   console.log('[SendService] Sending transaction:', {
     // ...existing logs
     has_2fa_token: !!data.two_factor_token,
     token_length: data.two_factor_token?.length
   });
   ```

## 🧪 Como Testar

1. **Abrir DevTools** (F12)
2. **Ir para Console**
3. **Tentar enviar transação:**
   - Wallet → Enviar
   - Preencher valor e endereço
   - Abrir modal de confirmação
   - **VERIFICAR:** O campo 2FA aparece?
   - Digitar código de 6 dígitos
   - Clicar "Confirmar Envio"

4. **Analisar logs no console:**

### Cenário A: Campo 2FA NÃO aparece
```
[SendModal] Confirming with: { requires2FA: false, ... }
```
**Problema:** Hook `use2FAStatus` não está retornando `enabled: true`

**Solução:** Verificar:
- `/two-factor/status` endpoint funciona?
- User tem 2FA habilitado no backend?
- Token JWT válido?

### Cenário B: Campo 2FA aparece mas token não vai
```
[SendModal] Confirming with: { 
  requires2FA: true, 
  twoFactorToken: "123456",
  willSendToken: "123456" 
}
[DEBUG] Sending transaction: { 
  has_2fa_token: false,  ← ❌ PROBLEMA AQUI
  token_value: undefined 
}
```
**Problema:** Token não está sendo passado do modal para WalletPage

### Cenário C: Token vai mas não chega ao backend
```
[DEBUG] Sending transaction: { 
  has_2fa_token: true, 
  token_value: "123456" 
}
[SendService] Sending transaction: { 
  has_2fa_token: false  ← ❌ PROBLEMA AQUI
}
```
**Problema:** Token não está sendo incluído no objeto da mutation

## 🔧 Possíveis Causas

### 1. Hook `use2FAStatus` não funciona
```bash
# Testar endpoint manualmente
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/two-factor/status
```

Deve retornar:
```json
{
  "enabled": true,
  "email": "user@example.com"
}
```

### 2. Prop `requires2FA` não está sendo passada
Verificar em `WalletPage.tsx` linha ~1503:
```typescript
<SendConfirmationModal
  // ...outras props
  requires2FA={twoFAStatus?.enabled}  // ← Deve estar aqui
/>
```

### 3. Estado local do modal não atualiza
No `SendConfirmationModal`, verificar se o input funciona:
```typescript
onChange={(e) => {
  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
  setTwoFactorToken(value);  // ← Estado atualiza?
  console.log('Token digitado:', value);  // ← Adicionar este log
}}
```

## ✅ Checklist de Verificação

- [ ] Backend rodando (`python run.py`)
- [ ] Frontend rodando (`npm run dev`)
- [ ] DevTools aberto no navegador
- [ ] User logado com JWT válido
- [ ] 2FA habilitado para o user (verificar em Settings)
- [ ] Console mostra logs ao clicar "Confirmar Envio"

## 📊 Análise dos Logs

### Log Esperado (✅ Funcionando):
```
[SendModal] Confirming with: {
  requires2FA: true,
  twoFactorToken: "123456",
  tokenLength: 6,
  willSendToken: "123456"
}

[DEBUG] Sending transaction: {
  wallet_id: "uuid...",
  has_2fa_token: true,
  token_length: 6,
  token_value: "123456"
}

[SendService] Sending transaction: {
  wallet_id: "uuid...",
  has_2fa_token: true,
  token_length: 6
}

✅ Transaction success!
```

### Log Atual (❌ Bug):
```
[SendModal] Confirming with: { ??? }
[DEBUG] Sending transaction: { has_2fa_token: ??? }
[SendService] Transaction error: "2FA token required"
```

## 🎯 Próximos Passos

1. **Executar teste** e coletar logs completos
2. **Identificar** em qual ponto o token se perde
3. **Corrigir** baseado no cenário identificado
4. **Remover logs de debug** depois (token_value é sensível!)

---

**Status:** 🔍 DIAGNÓSTICO EM ANDAMENTO
**Aguardando:** Logs do console do navegador
