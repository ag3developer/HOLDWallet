# 📝 Onde o Usuário Cria e Edita o Perfil

## 🎯 Duas Páginas Principais

### 1️⃣ CRIAR NOVO PERFIL

**Rota:** `http://localhost:3000/p2p/trader-setup`
**Arquivo:** `/Frontend/src/pages/p2p/TraderSetupPage.tsx`

```
┌─────────────────────────────────────────────────────────┐
│  ← Criar Perfil de Negociador                           │
│  Configure seu perfil profissional para começar         │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  INFORMAÇÕES BÁSICAS                                     │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Nome Profissional *                                  │ │
│  │ [Ex: João Trader_____________________]               │ │
│  │                                                       │ │
│  │ Bio / Descrição                                      │ │
│  │ [Fale um pouco sobre você..........                 │ │
│  │  ...............................]                     │ │
│  │                                                       │ │
│  │ Foto / Avatar                                        │ │
│  │ [https://exemplo.com/avatar.jpg]  [Upload]          │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  PREFERÊNCIAS DE NEGOCIAÇÃO                              │
│  ┌─────────────────────────────────────────────────────┐ │
│  │ Pedido Mínimo (BRL)    │ Pedido Máximo (BRL)        │ │
│  │ [100_____________]     │ [50000_____________]       │ │
│  │                                                       │ │
│  │ Métodos de Pagamento Aceitos *                       │ │
│  │ Separados por vírgula (ex: PIX,TED,DOC)             │ │
│  │ [PIX,TED__________________________]                  │ │
│  │                                                       │ │
│  │ ☐ Auto-aceitar novos pedidos                         │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  [Cancelar]                    [Criar Perfil]            │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

**Campos Obrigatórios:**

- ✅ Nome Profissional (mínimo 3 caracteres)
- ✅ Métodos de Pagamento

**Campos Opcionais:**

- 📝 Bio/Descrição (máximo 500 caracteres)
- 🖼️ Foto/Avatar (URL)
- 💰 Pedido Mínimo e Máximo em BRL
- ⚙️ Auto-aceitar pedidos (toggle)

---

### 2️⃣ EDITAR PERFIL EXISTENTE

**Rota:** `http://localhost:3000/p2p/trader-profile/edit`
**Arquivo:** `/Frontend/src/pages/p2p/TraderProfileEditPage.tsx`

```
┌─────────────────────────────────────────────────────────┐
│  ← Voltar                                               │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Editar Perfil                                           │
│                                                           │
│  ✓ Perfil atualizado com sucesso!                       │
│                                                           │
│  [Mesmo formulário que CRIAR PERFIL]                     │
│  [Mas com dados pré-preenchidos]                         │
│                                                           │
│  [Cancelar]                    [Salvar Alterações]       │
│                                                           │
│  ────────────────────────────────────────────────────────│
│  ZONA DE PERIGO                                          │
│  [🗑️ Deletar Perfil de Negociador]                      │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de Criação e Edição

### Primeiro Acesso (Criar Perfil)

```
Usuário
  ↓
/p2p/trader-setup (TraderSetupPage)
  ↓ Preenche formulário
  ↓ Clica "Criar Perfil"
  ↓
API: POST /api/v1/trader-profiles
  ↓ Sucesso
  ↓
Redireciona para: /p2p/trader-profile/edit
  ↓
TraderProfileEditPage carrega com dados do perfil criado
```

### Edição Posterior

```
Usuário logado
  ↓
Clica "Editar Perfil" (em UserProfileSection ou TraderProfileView)
  ↓
/p2p/trader-profile/edit (TraderProfileEditPage)
  ↓
useTraderProfile hook busca perfil existente
  ↓
Formulário pré-preenchido com dados atuais
  ↓ Edita campos
  ↓ Clica "Salvar Alterações"
  ↓
API: PUT /api/v1/trader-profiles/me
  ↓ Sucesso
  ↓
Redireciona para: /p2p/trader/:id (perfil público)
```

---

## 📍 Como Acessar as Páginas

### Via Código React

```tsx
// Ir para criar perfil
navigate("/p2p/trader-setup");

// Ir para editar perfil
navigate("/p2p/trader-profile/edit");

// Ir para ver perfil público
navigate(`/p2p/trader/${profile.id}`);
```

### Via Componente UserProfileSection

```tsx
<UserProfileSection
  token={token}
  onEdit={() => navigate("/p2p/trader-profile/edit")}
  showEditButton={true}
/>
```

Clicando no ícone ✎️ (Edit) no canto superior direito do card!

---

## 🔧 Como Funciona Internamente

### Service (traderProfileService.ts)

```typescript
// Criar novo perfil
await traderProfileService.createProfile(data, token);

// Obter meu perfil
const profile = await traderProfileService.getMyProfile(token);

// Atualizar perfil
await traderProfileService.updateProfile(data, token);
```

### Hook (useTraderProfile.ts)

```typescript
const { profile, loading, error, createProfile, updateProfile, refetch } = useTraderProfile()

// Criar
await createProfile({ display_name: "João", ... })

// Atualizar
await updateProfile({ display_name: "João Silva", ... })

// Recarregar dados
await refetch()
```

---

## 🎯 Exemplo Prático

### Cenário 1: Criar Perfil pela Primeira Vez

1. Usuário acessa `http://localhost:3000/p2p/trader-setup`
2. Vê o formulário "Criar Perfil de Negociador"
3. Preenche:
   - **Nome:** "João Silva Trader"
   - **Bio:** "Negociador profissional com 5 anos de experiência"
   - **Avatar:** URL da foto
   - **Mín:** 100 BRL
   - **Máx:** 50000 BRL
   - **Métodos:** "PIX,TED,DOC"
4. Clica "Criar Perfil"
5. Sistema envia: `POST /api/v1/trader-profiles`
6. Perfil criado! Redireciona para `/p2p/trader-profile/edit`

### Cenário 2: Editar Perfil Existente

1. Usuário em qualquer página clica no botão "✎️" do seu perfil
2. Vai para `/p2p/trader-profile/edit`
3. Vê formulário pré-preenchido com dados atuais
4. Muda o campo **Bio:**
   - De: "Negociador profissional com 5 anos de experiência"
   - Para: "Negociador profissional com 6 anos de experiência! 🚀"
5. Clica "Salvar Alterações"
6. Sistema envia: `PUT /api/v1/trader-profiles/me`
7. Perfil atualizado! Redireciona para `/p2p/trader/{profile_id}`

---

## 🛡️ Validações

### Campo: Display Name

- ✅ Obrigatório
- ✅ Mínimo 3 caracteres
- ✅ Máximo 100 caracteres

### Campo: Bio

- ⭕ Opcional
- ✅ Máximo 500 caracteres

### Campo: Avatar URL

- ⭕ Opcional
- ✅ Deve ser URL válida

### Campo: Métodos de Pagamento

- ✅ Obrigatório
- ✅ Separados por vírgula
- ✅ Exemplos: "PIX,TED,DOC,Bitcoin,Outro Método"

### Campo: Pedidos Mínimo/Máximo

- ⭕ Opcionais
- ✅ Números positivos
- ✅ Em BRL (Real)

---

## 📱 Responsividade

- ✅ Desktop: Layout full
- ✅ Tablet: Ajusta coluna
- ✅ Mobile: Stack vertical

---

## 🌓 Dark Mode

- ✅ Suporta light e dark mode
- ✅ Cores ajustadas automaticamente
- ✅ Ícones Lucide react com cores temáticas

---

## 🔐 Autenticação

Ambas as páginas requerem:

- ✅ Usuário logado (`token` no localStorage)
- ✅ Token válido passado no header Authorization
- ✅ Se não autenticado, redireciona para `/login`

---

## ❌ Tratamento de Erros

### Se perfil não existe (Editar)

- Mostra mensagem: "Você ainda não tem um perfil de negociador"
- Oferece botão: "Criar Perfil Agora"
- Redireciona para `/p2p/trader-setup`

### Se erro na criação

- Mostra alerta vermelho com mensagem de erro
- Formulário continua preenchido
- Usuário pode corrigir e tentar novamente

### Se erro na atualização

- Mostra alerta vermelho com mensagem
- Dados não são perdidos
- Usuário pode tentar novamente

---

## 🧪 Para Testar Localmente

```bash
# 1. Certifique que backend está rodando
cd HOLDWallet/backend
python -m uvicorn app.main:app --reload

# 2. Certifique que frontend está rodando
cd HOLDWallet/Frontend
npm run dev

# 3. Abra o navegador
http://localhost:3000/p2p/trader-setup

# 4. Crie seu primeiro perfil!
```

---

## 📊 Estado do Componente (useState)

### TraderSetupPage

```typescript
formData: {
  display_name: string;
  bio: string;
  avatar_url: string;
  min_order_amount: number;
  max_order_amount: number;
  accepted_payment_methods: string;
  auto_accept_orders: boolean;
}
error: string | null;
loading: boolean;
```

### TraderProfileEditPage

```typescript
formData: {
  display_name: string;
  bio: string;
  avatar_url: string;
  min_order_amount: string;
  max_order_amount: string;
  accepted_payment_methods: string;
  auto_accept_orders: boolean;
}
submitting: boolean;
submitError: string | null;
success: boolean;
```

---

## 🎨 Componentes Relacionados

- **UserProfileSection** - Card que mostra seu perfil (com botão Editar)
- **TraderProfileView** - Página pública do perfil
- **TraderProfileCard** - Card compacto (usado em listagens)
- **useTraderProfile** - Hook com lógica de gerenciamento
