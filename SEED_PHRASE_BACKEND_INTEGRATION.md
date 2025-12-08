# 🔐 Integração Secure Backend - Seed Phrase Verification

## Status: ✅ IMPLEMENTADO

Integração completa entre Frontend e Backend para verificação segura de seed phrase sem revelar dados sensíveis.

---

## 🏗️ Arquitetura

### Backend (Python/FastAPI)

**Arquivo:** `/backend/app/api/v1/endpoints/seed_verification.py`

#### Endpoints Implementados:

1. **POST `/api/v1/wallets/verify-seed-start`**

   - Inicia processo de verificação
   - Gera 3 posições aleatórias (0-11)
   - **NUNCA envia a seed phrase ao frontend**
   - Retorna: `{ required_positions: [int, int, int], attempt_id: string }`

2. **POST `/api/v1/wallets/verify-seed-words`**

   - Valida palavras selecionadas pelo usuário
   - Compara contra seed criptografada no BD
   - Retorna: `{ verified: bool, message: string }`

3. **POST `/api/v1/wallets/export-seed-phrase`**
   - **Apenas após verificação bem-sucedida**
   - Descriptografa e retorna seed completa
   - TODO: Adicionar 2FA/senha/rate-limiting em produção

### Frontend (React/TypeScript)

**Arquivo:** `/Frontend/src/services/seed-verification-service.ts`

```typescript
class SeedVerificationService {
  // 1. Inicia verificação
  async startSeedVerification(walletId: string);

  // 2. Valida seleções
  async verifySeedWords(walletId: string, selectedPositions: number[]);

  // 3. Exporta seed (após sucesso)
  async exportSeedPhrase(walletId: string);
}
```

**Componente:** `/Frontend/src/pages/wallet/SettingsPage.tsx`

```tsx
// Handler unificado com chamadas ao backend
const handleExportSeedPhrase = async () => {
  // 1. Backend gera posições
  const response = await seedVerificationService.startSeedVerification(
    walletId
  );
  setRequiredPositions(response.required_positions);

  // Mostra modal sem dicas
  setShowSeedPhraseModal(true);
};

const handleVerifySeedWords = async (position: number) => {
  // 2. Usuário clica em 3 palavras
  // 3. Backend valida
  const response = await seedVerificationService.verifySeedWords(
    walletId,
    selectedPositions
  );

  if (response.verified) {
    // 4. Obter seed completa
    const seedResponse = await seedVerificationService.exportSeedPhrase(
      walletId
    );
    setSeedPhraseData(seedResponse.seed_phrase);
  }
};
```

---

## 🔒 Fluxo de Segurança

```
┌─────────────────┐
│   User Click    │
│ "Ver Frase"     │
└────────┬────────┘
         │
         ▼
┌──────────────────────────────────┐
│ 1. Frontend → Backend             │
│    startSeedVerification()         │
│    wallet_id: string              │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Backend Validação                 │
│ - Procura wallet no DB            │
│ - Gera 3 random positions (0-11)  │
│ - Não descriptografa seed         │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Frontend Mostra Modal             │
│ - 12 palavras numeradas          │
│ - SEM hints sobre posições       │
│ - Usuário clica 3 palavras       │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ 2. Frontend → Backend             │
│    verifySeedWords()              │
│    wallet_id: string              │
│    selected_positions: [int, int] │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Backend Validação                 │
│ - Obtém wallet + encrypted_seed   │
│ - Descriptografa internamente     │
│ - Extrai palavras nas posições    │
│ - Compara com seleção do usuário  │
│ - NÃO retorna seed ou palavras    │
└────────┬─────────────────────────┘
         │
         ▼ (se correto)
┌──────────────────────────────────┐
│ 3. Frontend → Backend             │
│    exportSeedPhrase()             │
│    wallet_id: string              │
│    (após verificação bem-sucedida)│
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Backend Export                    │
│ - Descriptografa seed             │
│ - Retorna 12-word phrase          │
│ - Log da ação                     │
└────────┬─────────────────────────┘
         │
         ▼
┌──────────────────────────────────┐
│ Frontend Mostra Seed              │
│ - 12 palavras em grid             │
│ - Botão copiar                    │
│ - Avisos de segurança             │
└──────────────────────────────────┘
```

---

## 🎯 Recursos de Segurança

### ✅ Implementado

- [x] Geração de posições aleatórias
- [x] Validação no backend (nunca em frontend)
- [x] Criptografia de seed no BD
- [x] Sem dicas visuais
- [x] Modal com 2 estados (verificação/sucesso)
- [x] Avisos de segurança
- [x] Copy-to-clipboard com toast
- [x] Logging de ações sensíveis
- [x] Responsive design
- [x] Dark mode

### 🔄 TODO - Produção

- [ ] 2FA obrigatório para exportar seed
- [ ] Confirmação por senha
- [ ] Rate limiting (máx 3 tentativas)
- [ ] Session/temporary key validation
- [ ] IP logging
- [ ] Audit trail completo
- [ ] Verificação de dispositivo confiável
- [ ] SMS/Email confirmação

---

## 📦 Dependências

### Backend

```python
# Já existem no projeto
- FastAPI
- SQLAlchemy
- cryptography (Fernet)
- mnemonic (BIP39)
```

### Frontend

```typescript
// Já existem no projeto
- React
- React-hot-toast
- Lucide-react
- Tailwind CSS
- TypeScript
```

---

## 🚀 Como Usar

### Backend - Registrar Rota

✅ Já feito em `/backend/app/main.py`:

```python
from app.api.v1.endpoints import seed_verification

app.include_router(
    seed_verification.router,
    prefix="/api/v1/wallets",
    tags=["seed-verification"]
)
```

### Frontend - Configurar API URL

```tsx
// No .env.example
VITE_API_URL=http://localhost:8000/api/v1
```

### Testar

```bash
# Terminal 1: Backend
cd backend
python -m uvicorn app.main:app --reload

# Terminal 2: Frontend
cd Frontend
npm run dev

# Abrir Settings → Backup → "Ver Frase de Recuperação"
```

---

## 🔍 Variáveis de Ambiente

### Backend `.env`

```env
# Deve estar configurado
ENCRYPTION_KEY=sua_chave_secreta_aqui

# Opcional
DEBUG=True
CORS_ORIGINS=["http://localhost:5173"]
```

### Frontend `.env.local`

```env
VITE_API_URL=http://localhost:8000/api/v1
```

---

## 📝 Notas Importantes

1. **Seed Phrase REAL**

   - O código now busca do banco via `decrypt_seed()`
   - Não mais mock hardcoded
   - Requer wallet existing no DB

2. **Validação**

   - Backend valida contra encrypted_seed no BD
   - Frontend apenas clica e envia positions
   - Comparação acontece no servidor (seguro)

3. **Fluxo Correto**

   - Usuário clica "Ver Frase"
   - Backend gera 3 posições aleatórias
   - Frontend mostra 12 palavras (SEM dicas)
   - Usuário compara com papel e clica 3 palavras
   - Backend valida
   - Se correto: retorna seed completa

4. **Sem Dicas Visuais**
   - ✅ Sem highlight em âmbar
   - ✅ Sem mensagem de posições
   - ✅ Apenas feedback de acerto/erro no final

---

## 🧪 Teste Manual

### Cenário 1: Sucesso

1. Clique "Ver Frase de Recuperação"
2. Modal abre com 12 palavras
3. Selecione as 3 palavras correspondentes às posições (aleatórias)
4. Sucesso! Vê todas as 12 palavras

### Cenário 2: Falha

1. Clique "Ver Frase de Recuperação"
2. Selecione 3 palavras erradas
3. Erro: "Seleção incorreta. Tente novamente."
4. Posições são regeneradas

---

## 🐛 Debugging

### Logs

```bash
# Backend
tail -f backend/server.log | grep -i seed

# Frontend
# DevTools Console - seeds-verification-service.ts chamadas
```

### Verificar Seed no BD

```bash
cd backend
python backend/show_wallet_seed.py
```

---

## 📊 Comparação: Antes vs Depois

| Aspecto          | Antes               | Depois              |
| ---------------- | ------------------- | ------------------- |
| Seed Storage     | Hardcoded mock      | BD encriptado       |
| Validação        | Frontend (inseguro) | Backend (seguro)    |
| Dicas Visuais    | Sim (inseguro)      | Não (seguro)        |
| API Call         | Nenhuma             | 3 endpoints         |
| Palavra Revelada | Na validação        | Apenas após sucesso |
| Logging          | Nenhum              | Ações sensíveis     |

---

## ✅ Checklist - Integração Completa

- [x] Backend endpoint criado (`seed_verification.py`)
- [x] Rotas registradas no `main.py`
- [x] Frontend service criado (`seed-verification-service.ts`)
- [x] SettingsPage refatorado
- [x] Handlers conectados ao backend
- [x] Modal sem mock data
- [x] Build testado e passando
- [x] Estados properly typed
- [x] Error handling completo
- [x] Toast notifications
- [x] Documentação

---

**Status:** Pronto para teste em ambiente local/staging! 🚀

Próximas melhorias:

1. Integrar com autenticação real (user_id vs hardcoded wallet_id)
2. Adicionar 2FA obrigatório
3. Implementar rate limiting
4. Adicionar session management
5. Audit logging completo
