# 🗺️ MAPA VISUAL - Onde o Usuário Cria/Edita Perfil

## 📍 LOCALIZAÇÃO NO PROJETO

```
Frontend/
├── src/
│   ├── pages/p2p/
│   │   ├── ✅ TraderSetupPage.tsx          ← CRIAR novo perfil
│   │   ├── ✅ TraderProfileEditPage.tsx    ← EDITAR perfil existente
│   │   └── ✅ TraderProfileView.tsx        ← Ver perfil público
│   │
│   ├── components/trader/
│   │   ├── UserProfileSection.tsx          ← Card com botão "Editar"
│   │   └── TraderProfileCard.tsx           ← Card resumido
│   │
│   ├── hooks/
│   │   └── ✅ useTraderProfile.ts          ← Lógica de gerenciamento
│   │
│   └── services/
│       └── ✅ traderProfileService.ts      ← Chamadas API
```

---

## 🔗 FLUXO DE NAVEGAÇÃO

```
USUÁRIO NOVO
    ↓
Acessa /p2p
    ↓
Clica "Criar Perfil de Trader"
    ↓
┌─────────────────────────────────────────┐
│ 📄 TraderSetupPage                      │
│ URL: /p2p/trader-setup                  │
│                                          │
│ ✓ Nome Profissional                     │
│ ✓ Bio                                   │
│ ✓ Avatar                                │
│ ✓ Mín/Máx de Ordem                      │
│ ✓ Métodos de Pagamento                  │
│ ✓ Auto-accept toggle                    │
│                                          │
│ [Cancelar] [Criar Perfil]               │
└─────────────────────────────────────────┘
    ↓ Clica "Criar Perfil"
    ↓ POST /api/v1/trader-profiles
    ↓
Redireciona para:
    ↓
┌─────────────────────────────────────────┐
│ 📝 TraderProfileEditPage                │
│ URL: /p2p/trader-profile/edit           │
│                                          │
│ [Mesmo formulário pré-preenchido]       │
│                                          │
│ [Cancelar] [Salvar Alterações]          │
│                                          │
│ ⚠️ ZONA DE PERIGO                       │
│ [Deletar Perfil]                        │
└─────────────────────────────────────────┘
    ↓ Clica "Salvar"
    ↓ PUT /api/v1/trader-profiles/me
    ↓
Redireciona para:
    ↓
┌─────────────────────────────────────────┐
│ 👁️ TraderProfileView                    │
│ URL: /p2p/trader/:id                    │
│                                          │
│ [Perfil Público com todas as stats]     │
│                                          │
│ [Editar] [Negociar]                     │
└─────────────────────────────────────────┘
```

---

## 🎯 ACESSO RÁPIDO - Botão Editar

```
EM QUALQUER PÁGINA COM UserProfileSection:

┌──────────────────────────────────────────┐
│ Seu Perfil                      [✎️]     │  ← Clique aqui!
├──────────────────────────────────────────┤
│ [Avatar] João Silva                 ✓   │
│ Profissional com 5 anos                 │
├──────────────────────────────────────────┤
│ ⭐⭐⭐⭐⭐ 4.8 (328 avaliações)           │
├──────────────────────────────────────────┤
│ Taxa Sucesso: 97.95%                    │
│ Negociações: 335/342                    │
└──────────────────────────────────────────┘
        ↓ Clica [✎️]
        ↓
Vai para: /p2p/trader-profile/edit
```

---

## 📱 PÁGINAS COMPLETAS

### PÁGINA 1: CRIAR PERFIL (TraderSetupPage)

**URL:** `http://localhost:3000/p2p/trader-setup`

```
┌──────────────────────────────────────────────────────┐
│  ← Criar Perfil de Negociador                        │
│     Configure seu perfil profissional                │
├──────────────────────────────────────────────────────┤
│                                                       │
│ 📋 INFORMAÇÕES BÁSICAS                              │
│ ────────────────────────────────────                 │
│ Nome Profissional *                                  │
│ [João Trader_____________________________]            │
│                                                       │
│ Bio / Descrição                                      │
│ [Negociador com 5 anos.....................         │
│  .........................................]           │
│                                                       │
│ Foto / Avatar                                        │
│ [https://exemplo.com/avatar.jpg] [📁 Upload]        │
│                                                       │
│ 🎯 PREFERÊNCIAS DE NEGOCIAÇÃO                        │
│ ────────────────────────────────────                 │
│ Mín (R$)        │  Máx (R$)                          │
│ [100_______]    │  [50000_____]                      │
│                                                       │
│ Métodos de Pagamento Aceitos *                       │
│ [PIX,TED,DOC______________________]                  │
│                                                       │
│ ☐ Auto-aceitar novos pedidos                         │
│                                                       │
│ [Cancelar]                  [Criar Perfil]           │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

### PÁGINA 2: EDITAR PERFIL (TraderProfileEditPage)

**URL:** `http://localhost:3000/p2p/trader-profile/edit`

```
┌──────────────────────────────────────────────────────┐
│  ← Voltar                                            │
├──────────────────────────────────────────────────────┤
│                                                       │
│ ✓ Perfil atualizado com sucesso! 🎉                 │
│                                                       │
│ 📝 Editar Perfil                                     │
│                                                       │
│ 📋 INFORMAÇÕES BÁSICAS                              │
│ ────────────────────────────────────                 │
│ Nome Profissional *                                  │
│ [João Silva Trader_____________________]             │
│                                                       │
│ [MESMO LAYOUT DE CRIAR PERFIL]                       │
│ [MAS PRÉ-PREENCHIDO COM DADOS ATUAIS]               │
│                                                       │
│ [Cancelar]                  [Salvar Alterações]      │
│                                                       │
│ ────────────────────────────────────                 │
│ ⚠️ ZONA DE PERIGO                                    │
│ [🗑️ Deletar Perfil de Negociador]                   │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

## 🧠 LÓGICA INTERNA

### TraderSetupPage (Criar)

```javascript
// Estado
const [formData, setFormData] = useState({
  display_name: "",
  bio: "",
  avatar_url: "",
  min_order_amount: 100,
  max_order_amount: 50000,
  accepted_payment_methods: "PIX,TED",
  auto_accept_orders: false,
});

// Ao submeter
const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    // Chama hook useTraderProfile
    await createProfile(formData);

    // Redireciona para edição
    navigate("/p2p/trader-profile/edit");
  } catch (err) {
    console.error(err);
  }
};
```

### TraderProfileEditPage (Editar)

```javascript
// Estado
const [formData, setFormData] = useState({...})
const [submitting, setSubmitting] = useState(false)
const [success, setSuccess] = useState(false)

// Ao carregar, preencher com dados existentes
useEffect(() => {
  if (profile) {
    setFormData({
      display_name: profile.display_name,
      bio: profile.bio,
      avatar_url: profile.avatar_url,
      min_order_amount: profile.min_order_amount,
      max_order_amount: profile.max_order_amount,
      accepted_payment_methods: profile.accepted_payment_methods,
      auto_accept_orders: profile.auto_accept_orders,
    })
  }
}, [profile])

// Ao submeter
const handleSubmit = async (e) => {
  e.preventDefault()
  try {
    // Chama hook useTraderProfile
    await updateProfile(formData)

    // Mostra sucesso
    setSuccess(true)

    // Redireciona após 1.5s
    setTimeout(() => {
      navigate(`/p2p/trader/${profile?.id}`)
    }, 1500)
  } catch (err) {
    setSubmitError(err.message)
  }
}
```

---

## 🔄 COMPONENTES QUE SE CONECTAM

```
CreateOrderPage
    ↓
<UserProfileSection />
    ├─ token={authToken}
    ├─ onEdit={() => navigate('/p2p/trader-profile/edit')}
    └─ showEditButton={true}
            ↓
    Clica [✎️] → /p2p/trader-profile/edit
            ↓
        TraderProfileEditPage
            ├─ useTraderProfile()
            ├─ traderProfileService.getMyProfile()
            └─ traderProfileService.updateProfile()
```

---

## 📊 DADOS QUE FLUEM

### Criar Perfil

```
Frontend (TraderSetupPage)
    ↓
formData = {
  display_name: "João",
  bio: "...",
  avatar_url: "...",
  min_order_amount: 100,
  max_order_amount: 50000,
  accepted_payment_methods: "PIX,TED",
  auto_accept_orders: false
}
    ↓
useTraderProfile.createProfile(formData)
    ↓
traderProfileService.createProfile(data, token)
    ↓
API: POST /api/v1/trader-profiles
    ↓ com Authorization: Bearer {token}
    ↓
Backend
    ↓ Retorna TraderProfile criado
    ↓
Frontend armazena em contexto/hook
    ↓
Redireciona para /p2p/trader-profile/edit
```

### Editar Perfil

```
Frontend (TraderProfileEditPage)
    ↓
useEffect → busca perfil com getMyProfile()
    ↓
formData é preenchido com dados existentes
    ↓
Usuário edita campos
    ↓
handleSubmit() → updateProfile(formData)
    ↓
traderProfileService.updateProfile(data, token)
    ↓
API: PUT /api/v1/trader-profiles/me
    ↓ com Authorization: Bearer {token}
    ↓
Backend atualiza registro
    ↓ Retorna TraderProfile atualizado
    ↓
Frontend mostra sucesso
    ↓
Redireciona para /p2p/trader/:id
```

---

## ✅ CHECKLIST DE CAMPOS

### Campos Obrigatórios (\*)

- ✅ **display_name** - Nome Profissional (3-100 chars)
- ✅ **accepted_payment_methods** - Métodos de Pagamento

### Campos Opcionais

- ⭕ **bio** - Descrição (até 500 chars)
- ⭕ **avatar_url** - URL da foto
- ⭕ **min_order_amount** - Mínimo em BRL
- ⭕ **max_order_amount** - Máximo em BRL
- ⭕ **auto_accept_orders** - Toggle (default: false)

---

## 🧪 PARA TESTAR

### Passo 1: Criar Perfil

```
1. Abrir: http://localhost:3000/p2p/trader-setup
2. Preencher formulário
3. Clicar "Criar Perfil"
4. Deve ir para /p2p/trader-profile/edit
```

### Passo 2: Editar Perfil

```
1. Estar em /p2p/trader-profile/edit
2. Mudar algum campo
3. Clicar "Salvar Alterações"
4. Ver mensagem de sucesso
5. Redirecionar para /p2p/trader/:id
```

### Passo 3: Ver na CreateOrderPage

```
1. Ir para http://localhost:3000/p2p/create-order
2. No lado direito deve aparecer UserProfileSection
3. Clique no [✎️] para editar
4. Deve ir para /p2p/trader-profile/edit
```

---

## 🎨 ESTILO E RESPONSIVIDADE

### Desktop

- ✅ Layout full (max-width: 2xl)
- ✅ Colunas ajustadas
- ✅ Formulário em 2 colunas (onde aplicável)

### Tablet/Mobile

- ✅ Stack vertical
- ✅ Inputs full width
- ✅ Botões stacked

### Dark Mode

- ✅ Cores ajustadas automáticamente
- ✅ Ícones Lucide com paleta temática
- ✅ Backgrounds e borders adaptados

---

## 🚨 POSSÍVEIS ERROS

| Erro                           | Solução                      |
| ------------------------------ | ---------------------------- |
| "Display name is required"     | Preencher display_name       |
| "Payment methods required"     | Preencher métodos            |
| "Min/Max order must be number" | Usar apenas números          |
| "Not authenticated"            | Fazer login primeiro         |
| "Profile not found"            | Criar perfil antes de editar |

---

## 📞 SUPORTE

Dúvidas sobre as páginas?

1. **TraderSetupPage** - `/Frontend/src/pages/p2p/TraderSetupPage.tsx` (229 linhas)
2. **TraderProfileEditPage** - `/Frontend/src/pages/p2p/TraderProfileEditPage.tsx` (421 linhas)
3. **useTraderProfile** - `/Frontend/src/hooks/useTraderProfile.ts`
4. **traderProfileService** - `/Frontend/src/services/traderProfileService.ts`

Todos os arquivos têm comentários explicativos! 🎯
