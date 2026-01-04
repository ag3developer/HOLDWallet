# 🐛 Debug: Chat P2P não carrega dados da ordem

## 📋 Problema Relatado

Quando clico em um anúncio para falar com o vendedor:

- ✅ Chat abre
- ❌ Chat aparece em branco
- ❌ Não aparece a proposta da oferta (card P2P)

---

## 🔍 Diagnóstico Implementado

### 1. Logs Adicionados no ChatPage

Agora o componente ChatPage está logando cada etapa:

```typescript
// Ao iniciar carregamento
console.log("🔍 Carregando ordem P2P:", { urlContext, urlOrderId, urlUserId });

// Ao chamar API
console.log("📡 Chamando API: /p2p/orders/" + urlOrderId);

// Ao receber resposta
console.log("✅ Ordem recebida do backend:", orderData);

// Após mapear dados
console.log("🗺️ Contexto P2P mapeado:", mappedContext);

// Ao selecionar contato
console.log("👤 Selecionando contato:", urlUserId);

// Em caso de erro
console.error("❌ Erro ao carregar ordem P2P:", error);
console.error(
  "📋 Detalhes do erro:",
  error instanceof Error ? error.message : error
);

// Ao usar fallback
console.log("⚠️ Usando dados mock como fallback");
```

### 2. Logs Adicionados no chatP2PService

```typescript
// Ao chamar getOrder
console.log("🔍 [chatP2PService] getOrder chamado com orderId:", orderId);

// Ao receber resposta
console.log("✅ [chatP2PService] Resposta da API:", response.data);

// Em caso de erro
console.error("❌ [chatP2PService] Erro ao buscar ordem:", error);
```

---

## 🧪 Como Testar

### Passo 1: Abrir Console do Navegador

1. Pressione **F12** ou **Cmd+Option+I** (Mac)
2. Vá para a aba **Console**
3. Limpe o console (ícone 🚫 ou Cmd+K)

### Passo 2: Navegar para P2P

```
URL: http://localhost:3000/p2p
```

### Passo 3: Clicar no Ícone de Chat 💬

- Clique em qualquer ícone de MessageCircle
- Observe os logs no console

---

## 📊 Cenários Possíveis

### ✅ Cenário 1: Sucesso Total

Logs esperados:

```
🔍 Carregando ordem P2P: { urlContext: 'p2p', urlOrderId: '123', urlUserId: '456' }
📡 Chamando API: /p2p/orders/123
🔍 [chatP2PService] getOrder chamado com orderId: 123
✅ [chatP2PService] Resposta da API: { success: true, data: {...} }
✅ Ordem recebida do backend: { id: '123', type: 'buy', ... }
🗺️ Contexto P2P mapeado: { orderId: '123', coin: 'BTC', ... }
👤 Selecionando contato: 456
```

**Resultado**: Card P2P deve aparecer no topo do chat ✅

---

### ❌ Cenário 2: Erro 404 - Ordem Não Encontrada

Logs esperados:

```
🔍 Carregando ordem P2P: { urlContext: 'p2p', urlOrderId: '999', urlUserId: '456' }
📡 Chamando API: /p2p/orders/999
🔍 [chatP2PService] getOrder chamado com orderId: 999
❌ [chatP2PService] Erro ao buscar ordem: AxiosError: Request failed with status code 404
❌ Erro ao carregar ordem P2P: AxiosError: ...
📋 Detalhes do erro: Request failed with status code 404
⚠️ Usando dados mock como fallback
```

**Causa**: Ordem não existe no backend
**Solução**: Verificar se o `orderId` está correto

---

### ❌ Cenário 3: Erro 500 - Backend

Logs esperados:

```
🔍 Carregando ordem P2P: { urlContext: 'p2p', urlOrderId: '123', urlUserId: '456' }
📡 Chamando API: /p2p/orders/123
🔍 [chatP2PService] getOrder chamado com orderId: 123
❌ [chatP2PService] Erro ao buscar ordem: AxiosError: Request failed with status code 500
❌ Erro ao carregar ordem P2P: AxiosError: ...
📋 Detalhes do erro: Request failed with status code 500
⚠️ Usando dados mock como fallback
```

**Causa**: Erro no backend ao processar requisição
**Solução**: Verificar logs do backend

---

### ❌ Cenário 4: Backend Offline

Logs esperados:

```
🔍 Carregando ordem P2P: { urlContext: 'p2p', urlOrderId: '123', urlUserId: '456' }
📡 Chamando API: /p2p/orders/123
🔍 [chatP2PService] getOrder chamado com orderId: 123
❌ [chatP2PService] Erro ao buscar ordem: AxiosError: Network Error
❌ Erro ao carregar ordem P2P: AxiosError: ...
📋 Detalhes do erro: Network Error
⚠️ Usando dados mock como fallback
```

**Causa**: Backend não está rodando
**Solução**: Iniciar o backend

---

### ⚠️ Cenário 5: Parâmetros Faltando na URL

Logs esperados:

```
ℹ️ Não é contexto P2P ou falta orderId: { urlContext: null, urlOrderId: null }
```

**Causa**: URL não tem `?context=p2p&orderId=XXX`
**Solução**: Verificar navegação no P2PPage

---

### ⚠️ Cenário 6: Dados Incorretos do Backend

Logs esperados:

```
✅ Ordem recebida do backend: { id: '123', cryptocurrency: undefined, ... }
🗺️ Contexto P2P mapeado: { coin: undefined, amount: '0', ... }
```

**Causa**: Backend retorna campos vazios/undefined
**Solução**: Verificar estrutura da resposta da API

---

## 🔧 Checklist de Depuração

Execute os seguintes checks:

### 1. Backend está rodando?

```bash
curl http://localhost:8000/health
# Deve retornar: {"status": "ok"}
```

### 2. Rota da ordem existe?

```bash
curl http://localhost:8000/p2p/orders/1
# Deve retornar dados da ordem
```

### 3. URL está correta?

- ✅ Deve ter: `/chat?context=p2p&orderId=123&userId=456`
- ❌ Não pode faltar nenhum parâmetro

### 4. Token de autenticação?

- Verifique no localStorage: `localStorage.getItem('token')`
- Se for null, faça login novamente

### 5. CORS habilitado no backend?

- Backend deve permitir requisições do frontend
- Verifique headers CORS

---

## 🛠️ Soluções Rápidas

### Solução 1: Usar Dados Mock

Se o backend não está funcionando, os dados mock são carregados automaticamente como fallback.

**Para verificar se está usando mock**:

```
Procure no console: "⚠️ Usando dados mock como fallback"
```

### Solução 2: Verificar Estrutura da API

A API deve retornar:

```json
{
  "success": true,
  "data": {
    "id": "123",
    "type": "buy",
    "cryptocurrency": "BTC",
    "amount": "0.05",
    "price": "460000",
    "total": "23000",
    "min_amount": "1000",
    "max_amount": "50000",
    "fiat_currency": "BRL",
    "payment_methods": ["PIX"],
    "time_limit": 30,
    "status": "active",
    "user_id": "456"
  }
}
```

### Solução 3: Limpar Cache

```javascript
// No console do navegador
localStorage.clear();
sessionStorage.clear();
location.reload();
```

---

## 📞 O Que Fazer Agora

1. **Abra o console** (F12)
2. **Navegue para** http://localhost:3000/p2p
3. **Clique no ícone de chat** 💬
4. **Copie todos os logs** que aparecerem
5. **Me envie os logs** para análise

---

## 🎯 Próximos Passos Após Debug

Dependendo dos logs:

### Se backend retornar 404:

- Precisamos criar ordens de teste no banco

### Se backend retornar 500:

- Precisamos corrigir a rota no backend

### Se backend offline:

- Precisamos iniciar o servidor

### Se dados faltando:

- Precisamos ajustar o mapeamento no frontend

---

**Status**: Aguardando logs do console 🔍
**Data**: 4 de janeiro de 2026
