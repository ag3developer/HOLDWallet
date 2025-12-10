# 🧪 Guia de Teste - User Profile Section

## ✅ Como Testar a Nova Implementação

### **Pré-requisitos:**

1. ✅ Backend rodando em `http://127.0.0.1:8000`
2. ✅ Frontend rodando em `http://localhost:3000`
3. ✅ Usuário autenticado com token JWT válido
4. ✅ Perfil de trader já configurado no backend

---

## 🚀 Teste 1: Verificar Renderização

### **Passos:**

1. Abrir browser e navegar para `http://localhost:3000/p2p/create-order`
2. Aguardar carregamento da página
3. Verificar coluna direita

### **Esperado:**

- ✅ Card "Seu Perfil" apareça acima do "Resumo da Ordem"
- ✅ Avatar do usuário renderizado (ou fallback com iniciais)
- ✅ Nome do trader exibido
- ✅ Rating em estrelas visível
- ✅ 4 cards com estatísticas:
  - Taxa de Sucesso (%)
  - Total de Negociações (número)
  - Negociações Concluídas (número)
  - Status (Ativo/Inativo)
- ✅ Botão de edição (ícone de lápis) no canto superior direito

---

## 🧪 Teste 2: Botão de Edição

### **Passos:**

1. Clicar no botão de edição (ícone de lápis)
2. Observar navegação

### **Esperado:**

- ✅ Navegar para `/p2p/trader-profile`
- ✅ Página de edição de perfil abrir

---

## 🎨 Teste 3: Modo Dark/Light

### **Passos:**

1. Observar componente em modo light (padrão)
2. Alternar para modo dark (se houver toggle de tema)
3. Verificar cores

### **Esperado:**

- ✅ Modo Light:
  - Fundo branco
  - Texto cinza-escuro/preto
  - Borders cinza claro
- ✅ Modo Dark:
  - Fundo cinza-escuro
  - Texto branco
  - Borders cinza escuro
  - Contraste adequado

---

## 📊 Teste 4: Dados Carregados Corretamente

### **Passos:**

1. Abrir DevTools (F12)
2. Ir para aba Network
3. Recarregar página
4. Buscar requisição para `/api/v1/trader-profiles/me`
5. Verificar response

### **Esperado:**

```json
{
  "id": "uuid-aqui",
  "display_name": "João Silva",
  "avatar_url": "https://...",
  "bio": "Bio do trader",
  "is_verified": true,
  "verification_level": "advanced",
  "total_trades": 342,
  "completed_trades": 337,
  "success_rate": 0.985,
  "average_rating": 4.8,
  "total_reviews": 127,
  "min_order_amount": 100,
  "max_order_amount": 50000,
  "is_active": true,
  ...
}
```

---

## ⚠️ Teste 5: Estados de Erro

### **Cenário 1: Sem Autenticação**

**Como reproduzir:**

1. Fazer logout
2. Ir para `/p2p/create-order`

**Esperado:**

- ⚠️ Mensagem: "Perfil não configurado"
- ⚠️ Texto adicional: "Complete seu perfil de trader para criar ordens P2P"

### **Cenário 2: Perfil Não Encontrado (Backend)**

**Como reproduzir:**

1. Interromper backend
2. Recarregar página
3. Observar console

**Esperado:**

- ⏳ Mostrar "Carregando seu perfil..." por um momento
- ⚠️ Depois mostrar mensagem de erro
- ❌ Não fazer crash da página

### **Cenário 3: Resposta Lenta**

**Como reproduzir:**

1. Abrir DevTools (F12)
2. Ir para aba Network
3. Limitar velocidade (Throttle: Fast 3G)
4. Recarregar página

**Esperado:**

- ⏳ Spinner de loading aparecer
- ✅ Dados carregarem depois (sem timeout)
- ❌ Não mostrar erros
- ❌ Não fazer duplicate requests

---

## 📱 Teste 6: Responsividade

### **Desktop (1280px+)**

**Passos:**

1. Abrir em resolução 1280px ou maior
2. Observar layout

**Esperado:**

- ✅ 3 colunas: Formulário (66%) + Perfil/Resumo/Saldos (34%)
- ✅ Componente UserProfileSection com largura reduzida
- ✅ Todos os elementos visíveis

### **Tablet (768px - 1024px)**

**Passos:**

1. Redimensionar para 768px
2. Observar layout

**Esperado:**

- ✅ 2 colunas: Formulário + Coluna direita
- ✅ Componente se ajusta

### **Mobile (<768px)**

**Passos:**

1. Redimensionar para 375px (iPhone)
2. Observar layout

**Esperado:**

- ✅ Stack vertical (1 coluna)
- ✅ Formulário em cima
- ✅ Perfil/Resumo/Saldos embaixo
- ✅ Sem scroll horizontal
- ✅ Todos elementos legíveis

---

## 🎯 Teste 7: Integração com Formulário

### **Passos:**

1. Preencher formulário de criação de ordem
2. Verificar se perfil continua visível e sticky
3. Rolar a página

**Esperado:**

- ✅ Perfil permanece visível (sticky)
- ✅ Não interfere com o formulário
- ✅ Resumo atualiza conforme preço/quantidade
- ✅ Saldos se atualizam ao selecionar moeda

---

## 💻 Teste 8: Console Sem Erros

### **Passos:**

1. Abrir DevTools
2. Ir para aba Console
3. Recarregar página
4. Observar por 10 segundos

**Esperado:**

- ✅ Sem errors (vermelho)
- ✅ Sem warnings relacionados ao componente
- ✅ Logs de debug podem aparecer (normais)

**Logs esperados:**

```
[WalletService] 📤 Fetching balances...
[WalletService] ✅ Response received
[CreateOrder] Wallet ID set: xxx
```

---

## 🔄 Teste 9: Atualização de Token

### **Passos:**

1. Estar autenticado na página
2. Em outra aba, fazer logout
3. Voltar para aba original
4. Verificar se perfil atualiza

**Esperado:**

- ⚠️ Componente detecta mudança de token
- ✅ Recarrega dados ou mostra erro
- ❌ Sem crash

---

## 📊 Teste 10: Verificação de Badges

### **Premium User:**

- Badge dourada com ícone Award
- Texto "Premium"

### **Advanced User:**

- Badge azul com ícone Shield
- Texto "Advanced"

### **Basic User:**

- Badge cinza com ícone CheckCircle
- Texto "Verificado"

### **Unverified User:**

- Sem badge

**Como testar:**

1. Usar diferentes contas com níveis de verificação diferentes
2. Verificar badges corretos aparecem

---

## 🔐 Teste 11: Segurança

### **Token Handling:**

```typescript
// ✅ Token deve ser passado em header
Authorization: Bearer {token}

// ✅ Nunca deve aparecer no console
// ❌ Nunca deve ser exposado na URL
// ❌ Nunca deve estar em localStorage sem proteção
```

### **Passos:**

1. DevTools → Network
2. Ver requisições `/trader-profiles/me`
3. Verificar header Authorization

**Esperado:**

- ✅ Token presente no header
- ✅ Resposta com status 200
- ✅ Sem exposição desnecessária

---

## ✅ Checklist Final de Testes

| Teste           | Desktop | Tablet | Mobile | Status |
| --------------- | ------- | ------ | ------ | ------ |
| Renderização    | ✓       | ✓      | ✓      |        |
| Botão Editar    | ✓       | ✓      | ✓      |        |
| Dark Mode       | ✓       | ✓      | ✓      |        |
| Dados Carregam  | ✓       | ✓      | ✓      |        |
| Erro Handling   | ✓       | ✓      | ✓      |        |
| Responsividade  | ✓       | ✓      | ✓      |        |
| Integração Form | ✓       | ✓      | ✓      |        |
| Console Limpo   | ✓       | ✓      | ✓      |        |
| Token Atualiza  | ✓       | ✓      | ✓      |        |
| Segurança       | ✓       | ✓      | ✓      |        |
| Badges OK       | ✓       | ✓      | ✓      |        |
| Sticky Position | ✓       | ✓      | -      |        |

---

## 🐛 Troubleshooting

### **Problema: Componente não aparece**

**Solução:**

- [ ] Verificar import em CreateOrderPage.tsx
- [ ] Verificar console para erros
- [ ] Verificar se token está sendo passado
- [ ] Verificar build (npm run build)

### **Problema: Dados não carregam**

**Solução:**

- [ ] Backend deve estar rodando
- [ ] Verificar endpoint `/api/v1/trader-profiles/me`
- [ ] Token deve ser válido
- [ ] Ver response no DevTools Network

### **Problema: Estilos não aplicam (Dark Mode)**

**Solução:**

- [ ] Tailwind CSS deve estar configurado
- [ ] Verificar classe dark em HTML root
- [ ] Recarregar página

### **Problema: Botão de editar não funciona**

**Solução:**

- [ ] Verificar se rota `/p2p/trader-profile` existe
- [ ] Verificar se useNavigate está disponível
- [ ] Verificar console para erros

---

## 📸 Screenshots de Referência

### **O que deve aparecer:**

```
┌─────────────────────────────────────────┐
│ CRIAR ORDEM P2P                  ← ↑   │
├─────────────────────────────────────────┤
│                          │ Seu Perfil ✏️ │
│ Formulário              │ ┌────────────┐│
│                          │ │ 👤 João   ││
│ ├─ Tipo                 │ │ ⭐⭐⭐⭐½  ││
│ ├─ Moeda                │ │ 98.5% OK   ││
│ ├─ Preço                │ │ 342 trades ││
│ ├─ Quantidade           │ └────────────┘│
│ ├─ Limites              │ ┌────────────┐│
│ ├─ Métodos              │ │ Resumo     ││
│ └─ Criar Ordem          │ │ (dinâmico) ││
│                          │ └────────────┘│
│                          │ ┌────────────┐│
│                          │ │ Saldos     ││
│                          │ │ (criptos)  ││
│                          │ └────────────┘│
└─────────────────────────────────────────┘
```

---

## 🎓 Documentação

- **Código:** `/Frontend/src/components/trader/UserProfileSection.tsx`
- **Integração:** `/Frontend/src/pages/p2p/CreateOrderPage.tsx` (linha 734-740)
- **Service:** `/Frontend/src/services/traderProfileService.ts`
- **API:** `GET /api/v1/trader-profiles/me`

---

**Data:** 10 de dezembro de 2025
**Status:** ✅ PRONTO PARA TESTE
