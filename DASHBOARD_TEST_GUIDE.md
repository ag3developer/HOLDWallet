# 🧪 Dashboard - Guia de Teste

## 📋 Checklist de Funcionalidades

### ✅ Dashboard Carregada com Dados Reais

#### Cards de Informações (Topo)

- [ ] **Saldo Total** mostra o total consolidado em BRL
- [ ] **Ordens P2P Ativas** exibe número real de ordens ativas
- [ ] **Reputação** mostra status (Verificado/Novo) baseado no perfil do usuário

#### Seção "Suas Carteiras"

- [ ] Lista todas as carteiras criadas
- [ ] Mostra saldo por rede (Bitcoin, Ethereum, Polygon, etc.)
- [ ] Permite expandir/colapsar carteiras
- [ ] Filtro por redes ativado (Modo de Visualização)

#### Atividade Recente

- [ ] Mostra histórico de transações
- [ ] Exibe data/hora das atividades
- [ ] Ícones corretos para cada tipo de transação

#### Portfolio Analytics

- [ ] Distribuição de ativos
- [ ] Performance 24h, 7d
- [ ] Número de trades realizados

---

## 🔘 Botões de Ações Rápidas - Navegação

### 1️⃣ Criar Ordem P2P

```
👁️ Visual: Ícone de Dólar (azul)
📍 Localização: Seção "Ações Rápidas", 1º botão
🔗 Ação esperada: Navega para /app/p2p/create-order
✅ Teste: Clique no botão → Deve ir para página de criar ordem P2P
```

**Como testar:**

1. Abra http://localhost:3000/dashboard
2. Clique no botão "Criar Ordem P2P" (ícone azul com cifrão)
3. Verifique se é redirecionado para a página de criação de ordem

**Resultado esperado:**

- URL muda para `/app/p2p/create-order`
- Carrega página de criação de ordem P2P

---

### 2️⃣ Enviar Crypto

```
👁️ Visual: Ícone de Envio (verde)
📍 Localização: Seção "Ações Rápidas", 2º botão
🔗 Ação esperada: Navega para /app/wallet
✅ Teste: Clique no botão → Deve ir para página de carteira
```

**Como testar:**

1. No dashboard, clique no botão "Enviar Crypto" (ícone verde com seta)
2. Verifique se é redirecionado para a página de carteira

**Resultado esperado:**

- URL muda para `/app/wallet`
- Carrega página de gerenciamento de carteira

---

### 3️⃣ Receber

```
👁️ Visual: Ícone de Download (roxo)
📍 Localização: Seção "Ações Rápidas", 3º botão
🔗 Ação esperada: Navega para /app/wallet
✅ Teste: Clique no botão → Deve ir para página de carteira
```

**Como testar:**

1. No dashboard, clique no botão "Receber" (ícone roxo com seta para baixo)
2. Verifique se é redirecionado para a página de carteira

**Resultado esperado:**

- URL muda para `/app/wallet`
- Carrega página de gerenciamento de carteira

---

### 4️⃣ Chat P2P

```
👁️ Visual: Ícone de Mensagem (laranja)
📍 Localização: Seção "Ações Rápidas", 4º botão
🔗 Ação esperada: Navega para /app/chat
✅ Teste: Clique no botão → Deve ir para página de chat
```

**Como testar:**

1. No dashboard, clique no botão "Chat P2P" (ícone laranja com bolha)
2. Verifique se é redirecionado para a página de chat

**Resultado esperado:**

- URL muda para `/app/chat`
- Carrega página de chat P2P

---

## 📊 Dados Sendo Carregados do Backend

### Wallets API

- **Endpoint**: `GET /api/v1/wallets`
- **Dados**: Lista de todas as carteiras do usuário
- **Hook**: `useWallets()`
- **Exibição**: Seção "Suas Carteiras"

### Wallet Balances API

- **Endpoint**: `GET /api/v1/wallets/{wallet_id}/balances?include_tokens=true`
- **Dados**: Saldo por rede para cada carteira
- **Hook**: `useMultipleWalletBalances()`
- **Exibição**: Card "Saldo Total" + Saldos por rede

### Transactions API

- **Endpoint**: `GET /api/v1/transactions`
- **Dados**: Histórico de transações
- **Hook**: `useTransactions()`
- **Exibição**: Seção "Atividade Recente"

### P2P Orders API

- **Endpoint**: `GET /api/v1/p2p/orders`
- **Dados**: Ordens P2P do usuário
- **Hook**: `useP2POrders()`
- **Exibição**: Card "Ordens P2P Ativas"

### Current User API

- **Endpoint**: `GET /api/v1/users/me`
- **Dados**: Informações do usuário autenticado
- **Hook**: `useCurrentUser()`
- **Exibição**: Verificação de status, nome, etc.

---

## 🌐 Rotas Utilizadas

| Página          | Rota                    | Componente      |
| --------------- | ----------------------- | --------------- |
| Dashboard       | `/app/dashboard`        | DashboardPage   |
| P2P Criar Ordem | `/app/p2p/create-order` | CreateOrderPage |
| Carteira        | `/app/wallet`           | WalletPage      |
| Chat P2P        | `/app/chat`             | ChatPage        |

---

## 🎨 Responsive Design - Testar em Diferentes Tamanhos

### Mobile (< 640px)

- [ ] Dashboard cards em 1 coluna
- [ ] Botões de ações em 2 colunas
- [ ] Scroll horizontal suave
- [ ] Texto legível

### Tablet (640px - 1024px)

- [ ] Dashboard cards em 2 colunas
- [ ] Botões de ações em 2 colunas
- [ ] Layout equilibrado
- [ ] Toque funciona em botões

### Desktop (> 1024px)

- [ ] Dashboard cards em 3 colunas
- [ ] Botões de ações em 4 colunas
- [ ] Hover effects funcionando
- [ ] Mouse over mostra feedback visual

---

## 🌙 Dark Mode

- [ ] Dashboard carrega em dark mode
- [ ] Todos os cards visíveis
- [ ] Contraste adequado
- [ ] Cores consistentes com tema escuro

---

## ⚡ Performance

- [ ] Dashboard carrega em < 3 segundos
- [ ] Dados reais carregam sem delay perceptível
- [ ] Scroll suave sem travamentos
- [ ] Navegação rápida entre páginas

---

## 🐛 Debugging

### Abrir Console do Navegador (F12)

```javascript
// Verificar se dados estão sendo carregados
console.log("Dashboard Props");

// Verificar erros de API
// Abrir aba "Network" para ver requisições
```

### APIs que devem estar sendo chamadas:

1. `GET /api/v1/wallets` - ✅
2. `GET /api/v1/wallets/{id}/balances` - ✅
3. `GET /api/v1/transactions` - ✅
4. `GET /api/v1/p2p/orders` - ✅
5. `GET /api/v1/users/me` - ✅

---

## ✅ Conclusão

Se todos os testes acima passarem ✓, a Dashboard está **100% funcional** com:

- ✅ Dados reais do backend
- ✅ Navegação funcional em todos os botões
- ✅ Layout responsivo
- ✅ Dark mode
- ✅ Performance otimizada

**Status**: 🚀 PRONTO PARA PRODUÇÃO
