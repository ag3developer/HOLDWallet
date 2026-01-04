# 🧪 Guia de Teste: Chat P2P Integration

## ✅ Status da Implementação

**CONCLUÍDO** - Todos os ícones de chat no marketplace P2P agora redirecionam para a página de chat com contexto P2P.

---

## 🚀 Como Testar

### 1. Iniciar o Ambiente

#### Backend

```bash
cd Backend
python main.py
```

#### Frontend

```bash
cd Frontend
npm run dev
```

Acesse: http://localhost:3000

---

### 2. Testar no Marketplace P2P

#### Passo 1: Acessar P2P

```
URL: http://localhost:3000/p2p
```

#### Passo 2: Localizar um Anúncio

- Você verá cards (mobile) ou tabela (desktop) com ordens P2P
- Cada ordem tem:
  - Botão principal: "Comprar" ou "Vender" (verde/vermelho)
  - Ícone de chat: 💬 (MessageCircle)

#### Passo 3: Clicar no Ícone de Chat 💬

**Mobile (Cards)**:

- O ícone fica ao lado direito do botão "Comprar/Vender"
- Ao clicar, você será redirecionado para o chat

**Desktop (Tabela)**:

- O ícone fica na última coluna da tabela
- Ao clicar, você será redirecionado para o chat

#### Passo 4: Verificar Redirecionamento

```
URL esperada: /chat?context=p2p&orderId=XXX&userId=YYY
```

---

### 3. Verificar Funcionalidades do Chat P2P

#### ✅ Card de Contexto P2P

No topo do chat, você deve ver um card azul/roxo com:

- **Ícone da criptomoeda** (Bitcoin, Ethereum, etc.)
- **Tipo de operação**: "Comprar" ou "Vender"
- **Quantidade**: Ex: "0.05 BTC"
- **Total em BRL**: Ex: "R$ 23.000,00"
- **Preço unitário**: Ex: "R$ 460.000,00/BTC"
- **Limites**: Ex: "R$ 1.000,00 - R$ 50.000,00"
- **Métodos de pagamento**: PIX, TED, etc.
- **Prazo**: Ex: "30 min"
- **Botão**: "Ver Detalhes" (abre ordem em nova aba)

#### ✅ Timer de Expiração

Logo abaixo do card P2P:

- **Status ativo**: Fundo laranja, "Tempo restante: 29:45"
- **Últimos 60 segundos**: Fundo vermelho, texto piscando
- **Expirado**: "Negociação expirada!"

#### ✅ Mensagens do Sistema

No início da conversa:

```
ℹ️ Negociação P2P #123 iniciada! Venda de 0.05 BTC por R$ 23.000,00
ℹ️ Aguardando confirmação de pagamento...
```

#### ✅ Botões de Ação Rápida

Se a ordem estiver **ativa**, você verá:

**Mobile (Grid 2x2)**:

```
[✅ Paguei]    [📄 Comprovante]
[⚠️ Disputa]   [❌ Cancelar]
```

**Desktop (Linha horizontal)**:

```
[✅ Confirmar Pagamento]  [📄 Enviar Comprovante]  [⚠️ Reportar]  [❌ Cancelar]
```

#### ✅ Chat Funcional

- **Envio de mensagens de texto**: Digite e envie
- **Status de mensagem**: sending → sent → delivered → read
- **Typing indicator**: "digitando..." quando o outro usuário está escrevendo
- **Mensagens de áudio**: Pressione e segure o microfone 🎤
- **Upload de arquivos**: Clique no 📎 para enviar comprovantes

---

### 4. Testar Página de Detalhes

#### Passo 1: Acessar Detalhes de uma Ordem

```
Método 1: Clicar em "Ver Detalhes" no chat
Método 2: Clicar no botão "Comprar/Vender" no marketplace
```

#### Passo 2: Clicar em "Enviar Mensagem"

- Botão azul com ícone 💬
- Texto: "Conversar com o Vendedor" (desktop) ou "Chat" (mobile)

#### Passo 3: Verificar Redirecionamento

```
URL: /chat?context=p2p&orderId=XXX&userId=YYY
```

---

## 🎯 Casos de Teste

### Teste 1: Marketplace → Chat (Mobile)

1. Acesse `/p2p` no mobile ou redimensione a janela
2. Localize um card de ordem
3. Clique no ícone 💬 ao lado do botão verde/vermelho
4. ✅ **Resultado**: Redirecionado para chat com contexto P2P

### Teste 2: Marketplace → Chat (Desktop)

1. Acesse `/p2p` em tela grande
2. Visualize a tabela de ordens
3. Clique no ícone 💬 na última coluna
4. ✅ **Resultado**: Redirecionado para chat com contexto P2P

### Teste 3: Detalhes → Chat

1. Acesse `/p2p/order/123` (qualquer ordem)
2. Role até o card do vendedor (lado esquerdo)
3. Clique em "Enviar Mensagem"
4. ✅ **Resultado**: Redirecionado para chat com contexto P2P

### Teste 4: Parâmetros da URL

1. Após redirecionamento, inspecione a URL
2. ✅ **Deve conter**: `context=p2p`, `orderId=XXX`, `userId=YYY`

### Teste 5: Card P2P Carrega Dados

1. No chat, verifique o card azul/roxo no topo
2. ✅ **Deve mostrar**: quantidade, preço, métodos, timer

### Teste 6: Timer Funciona

1. Observe o timer abaixo do card P2P
2. ✅ **Deve contar**: regressivamente (ex: 29:59 → 29:58)
3. ✅ **Últimos 60s**: fundo muda para vermelho

### Teste 7: Botões de Ação

1. Role até os botões abaixo do chat
2. ✅ **Mobile**: Grid 2x2
3. ✅ **Desktop**: Linha horizontal
4. Clique em "Confirmar Pagamento"
5. ✅ **Resultado**: Mensagem do sistema aparece

### Teste 8: Mensagens de Sistema

1. No histórico do chat, procure mensagens cinzas
2. ✅ **Deve ter**: "Negociação P2P #123 iniciada!"

### Teste 9: Enviar Mensagem

1. Digite "Olá" no campo de mensagem
2. Clique em enviar ou pressione Enter
3. ✅ **Resultado**: Mensagem aparece com status "sending" → "sent"

### Teste 10: Hover no Ícone de Chat

1. Passe o mouse sobre o ícone 💬
2. ✅ **Resultado**:
   - Cor muda para azul
   - Background fica azul claro
   - Transição suave

---

## 🐛 Troubleshooting

### Problema: Não redireciona ao clicar no ícone

**Solução**:

- Verifique o console do navegador (F12)
- Procure por erros de `navigate`
- Confirme que o `orderId` e `userId` existem

### Problema: Card P2P não aparece no chat

**Solução**:

- Verifique a URL: deve ter `context=p2p`
- Abra o console e procure por erros do `chatP2PService`
- Confirme que o backend está rodando

### Problema: Timer não funciona

**Solução**:

- Verifique se `expiresAt` está presente nos dados
- Abra o DevTools e inspecione `p2pContext.expiresAt`

### Problema: Botões de ação não aparecem

**Solução**:

- Confirme que `p2pContext.status === 'active'`
- Ordens completadas/canceladas não mostram botões

### Problema: "ID do trader não encontrado"

**Solução**:

- A ordem pode não ter `user.id` ou `user_id`
- Verifique a resposta da API no Network tab (F12)

---

## 📊 Checklist Final

Antes de considerar o teste completo, verifique:

- [ ] Ícone de chat clicável no marketplace (mobile)
- [ ] Ícone de chat clicável no marketplace (desktop)
- [ ] Botão "Enviar Mensagem" clicável na página de detalhes
- [ ] Redirecionamento correto para `/chat?context=p2p&...`
- [ ] Card P2P aparece no topo do chat
- [ ] Timer de expiração funciona
- [ ] Mensagens de sistema aparecem
- [ ] Botões de ação P2P visíveis
- [ ] Chat funcional (envio/recebimento)
- [ ] Hover no ícone muda cor para azul

---

## ✅ Tudo Funcionando?

Se todos os testes passaram, **parabéns!** 🎉

A integração está **100% funcional** e pronta para produção.

---

**Data**: 4 de janeiro de 2026
**Status**: ✅ PRONTO PARA TESTAR
