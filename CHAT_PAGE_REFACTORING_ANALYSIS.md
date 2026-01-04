# 📊 Análise de Refatoração: ChatPage.tsx (2490 linhas)

## 🎯 Resumo Executivo

**Arquivo**: `Frontend/src/pages/chat/ChatPage.tsx`
**Linhas**: 2490
**Problema**: Componente monolítico com múltiplas responsabilidades
**Objetivo**: Reduzir para ~500-800 linhas através de extração de hooks, componentes e serviços

---

## 📈 Análise de Complexidade

### Estados Identificados (17 estados principais)

#### Grupo 1: Chat Básico (5 estados)

```typescript
- selectedContact: number
- newMessage: string
- searchTerm: string
- messages: Message[]
- isLoadingMessages: boolean
```

#### Grupo 2: P2P Context (3 estados)

```typescript
- p2pContext: P2POrderLocal | null
- p2pContact: Contact | null
- timeRemaining: string
```

#### Grupo 3: Conexão (2 estados)

```typescript
- chatRoomId: string | null
- connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'error'
```

#### Grupo 4: WebRTC/Chamadas (5 estados)

```typescript
- isCallActive: boolean
- callType: 'audio' | 'video' | null
- callDuration: number
- isAudioEnabled: boolean
- isVideoEnabled: boolean
```

#### Grupo 5: Upload/UI (4 estados)

```typescript
- isTyping: boolean
- uploadProgress: number
- isUploading: boolean
- isSidebarOpen: boolean
```

### useEffect Identificados (9+ hooks)

1. **Sidebar persistence** (linha 162)
2. **Load P2P Order** (linha 179)
3. **P2P Context setup** (linha 351)
4. **P2P Connection** (linha 374)
5. **P2P Main Effect** (linha 379)
6. **Connect Chat** (linha 560)
7. **Countdown timer** (linha 644)
8. **Polling messages** (linha 651)
9. **Call duration** (linha 670)

### Handler Functions Identificadas (12+ funções)

#### Trade Handlers (5 funções)

- `handleConfirmPayment`
- `handleSendReceipt`
- `handleReleaseEscrow`
- `handleReportDispute`
- `handleCancelTrade`

#### Call Handlers (5 funções)

- `handleInitiateAudioCall`
- `handleInitiateVideoCall`
- `handleEndCall`
- `handleToggleAudio`
- `handleToggleVideo`

#### Message Handlers (2 funções)

- `handleSendMessage`
- `handleFileUpload`

---

## 🔍 Oportunidades de Refatoração

### 1. **Custom Hooks a Extrair** ⭐⭐⭐ (Prioridade Alta)

#### Hook 1: `useP2PChat`

**Propósito**: Gerenciar estado P2P completo
**Linhas estimadas**: 200-300 linhas
**Estados incluídos**:

```typescript
-p2pContext - p2pContact - timeRemaining - chatRoomId;
```

**Funções incluídas**:

- `loadP2POrder()`
- `connectP2PChat()`
- `countdown timer logic`
- P2P message polling

**Benefício**: Remove ~300 linhas do componente principal

---

#### Hook 2: `useWebRTCCall`

**Propósito**: Gerenciar chamadas de áudio/vídeo
**Linhas estimadas**: 150-200 linhas
**Estados incluídos**:

```typescript
-isCallActive - callType - callDuration - isAudioEnabled - isVideoEnabled;
```

**Funções incluídas**:

- `handleInitiateAudioCall()`
- `handleInitiateVideoCall()`
- `handleEndCall()`
- `handleToggleAudio()`
- `handleToggleVideo()`
- Call duration interval

**Benefício**: Remove ~200 linhas do componente principal

---

#### Hook 3: `useChatMessages`

**Propósito**: Gerenciar mensagens e polling
**Linhas estimadas**: 100-150 linhas
**Estados incluídos**:

```typescript
-messages - isLoadingMessages - isTyping;
```

**Funções incluídas**:

- `handleSendMessage()`
- Message polling logic
- Message status updates

**Benefício**: Remove ~150 linhas do componente principal

---

#### Hook 4: `useFileUpload`

**Propósito**: Gerenciar upload de arquivos
**Linhas estimadas**: 80-120 linhas
**Estados incluídos**:

```typescript
-uploadProgress - isUploading;
```

**Funções incluídas**:

- `handleFileUpload()`
- Upload progress tracking

**Benefício**: Remove ~100 linhas do componente principal

---

#### Hook 5: `useP2PTradeActions`

**Propósito**: Gerenciar ações de trade P2P
**Linhas estimadas**: 200-250 linhas
**Funções incluídas**:

- `handleConfirmPayment()`
- `handleSendReceipt()`
- `handleReleaseEscrow()`
- `handleReportDispute()`
- `handleCancelTrade()`

**Benefício**: Remove ~250 linhas do componente principal

---

### 2. **Componentes a Extrair** ⭐⭐ (Prioridade Média)

#### Componente 1: `ChatSidebar`

**Propósito**: Lista de contatos e busca
**Props estimadas**:

```typescript
interface ChatSidebarProps {
  contacts: Contact[];
  selectedContact: number;
  onSelectContact: (id: number) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}
```

**Benefício**: Remove ~300-400 linhas do componente principal

---

#### Componente 2: `ChatHeader`

**Propósito**: Header do chat com ações
**Props estimadas**:

```typescript
interface ChatHeaderProps {
  contact: Contact | null;
  onAudioCall: () => void;
  onVideoCall: () => void;
  onToggleInfo: () => void;
}
```

**Benefício**: Remove ~100-150 linhas do componente principal

---

#### Componente 3: `MessageList`

**Propósito**: Lista de mensagens
**Props estimadas**:

```typescript
interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  isLoadingMessages: boolean;
}
```

**Benefício**: Remove ~200-300 linhas do componente principal

---

#### Componente 4: `MessageInput`

**Propósito**: Input de mensagem com ações
**Props estimadas**:

```typescript
interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onFileUpload: (file: File) => void;
  onAudioSend: (blob: Blob) => void;
  isUploading: boolean;
  uploadProgress: number;
}
```

**Benefício**: Remove ~150-200 linhas do componente principal

---

#### Componente 5: `P2PTradePanel`

**Propósito**: Painel de ações de trade P2P
**Props estimadas**:

```typescript
interface P2PTradePanelProps {
  order: P2POrderLocal;
  timeRemaining: string;
  onConfirmPayment: () => void;
  onSendReceipt: (file: File) => void;
  onReleaseEscrow: () => void;
  onReportDispute: () => void;
  onCancelTrade: () => void;
}
```

**Benefício**: Remove ~300-400 linhas do componente principal

---

### 3. **Serviços/Utilitários a Extrair** ⭐ (Prioridade Baixa)

#### Utilitário 1: `chatFormatters.ts`

**Propósito**: Formatação de timestamps, durações, etc.
**Funções**:

```typescript
- formatTimestamp(date: Date): string
- formatCallDuration(seconds: number): string
- formatTimeRemaining(expiresAt: string): string
```

#### Utilitário 2: `contactHelpers.ts`

**Propósito**: Helpers para filtrar/buscar contatos
**Funções**:

```typescript
- filterContacts(contacts: Contact[], searchTerm: string): Contact[]
- sortContactsByActivity(contacts: Contact[]): Contact[]
- getContactById(contacts: Contact[], id: number): Contact | undefined
```

---

## 📋 Plano de Refatoração (5 Fases)

### Fase 1: Extração de Hooks Core (Semana 1)

**Objetivo**: Reduzir de 2490 para ~1800 linhas

1. ✅ Criar `useP2PChat` hook
2. ✅ Criar `useWebRTCCall` hook
3. ✅ Criar `useChatMessages` hook
4. ✅ Testar integração

**Ganho estimado**: ~650 linhas removidas

---

### Fase 2: Extração de Hooks Auxiliares (Semana 1-2)

**Objetivo**: Reduzir de ~1800 para ~1450 linhas

1. ✅ Criar `useFileUpload` hook
2. ✅ Criar `useP2PTradeActions` hook
3. ✅ Testar integração

**Ganho estimado**: ~350 linhas removidas

---

### Fase 3: Extração de Componentes de UI (Semana 2-3)

**Objetivo**: Reduzir de ~1450 para ~800 linhas

1. ✅ Criar `ChatSidebar` component
2. ✅ Criar `MessageList` component
3. ✅ Criar `MessageInput` component
4. ✅ Testar UI e responsividade

**Ganho estimado**: ~650 linhas removidas

---

### Fase 4: Extração de Componentes Especializados (Semana 3)

**Objetivo**: Reduzir de ~800 para ~500 linhas

1. ✅ Criar `ChatHeader` component
2. ✅ Criar `P2PTradePanel` component
3. ✅ Testar fluxo P2P completo

**Ganho estimado**: ~300 linhas removidas

---

### Fase 5: Polimento e Otimização (Semana 4)

**Objetivo**: Otimizar performance e manutenibilidade

1. ✅ Extrair utilitários (`chatFormatters.ts`, `contactHelpers.ts`)
2. ✅ Adicionar React.memo() onde apropriado
3. ✅ Otimizar re-renders com useCallback/useMemo
4. ✅ Documentar APIs dos hooks/componentes
5. ✅ Testes end-to-end

**Ganho qualitativo**: Melhor performance e manutenibilidade

---

## 🎯 Estrutura de Arquivos Proposta

```
Frontend/src/
├── pages/
│   └── chat/
│       └── ChatPage.tsx              (500 linhas - componente principal)
│
├── hooks/
│   └── chat/
│       ├── useP2PChat.ts             (300 linhas)
│       ├── useWebRTCCall.ts          (200 linhas)
│       ├── useChatMessages.ts        (150 linhas)
│       ├── useFileUpload.ts          (100 linhas)
│       └── useP2PTradeActions.ts     (250 linhas)
│
├── components/
│   └── chat/
│       ├── ChatSidebar.tsx           (350 linhas)
│       ├── ChatHeader.tsx            (150 linhas)
│       ├── MessageList.tsx           (250 linhas)
│       ├── MessageInput.tsx          (200 linhas)
│       ├── P2PTradePanel.tsx         (350 linhas)
│       ├── CallModal.tsx             (já existe)
│       ├── AudioMessageInput.tsx     (já existe)
│       └── AudioMessage.tsx          (já existe)
│
└── utils/
    └── chat/
        ├── chatFormatters.ts         (100 linhas)
        └── contactHelpers.ts         (100 linhas)
```

---

## 🚀 Próximos Passos Imediatos

### Ação 1: Começar com `useP2PChat` hook

**Por quê?**: É o maior bloco independente e resolve o problema atual do `userId`

**Arquivo a criar**: `Frontend/src/hooks/chat/useP2PChat.ts`

**Conteúdo inicial**:

```typescript
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { chatP2PService } from "@/services/chatP2P";
import { ChatP2PValidator } from "@/services/chatP2PValidator";

export const useP2PChat = () => {
  const [searchParams] = useSearchParams();
  const [p2pContext, setP2PContext] = useState(null);
  const [chatRoomId, setChatRoomId] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState("");

  // ✅ FIX: Usar URL param ao invés de localStorage
  const urlUserId = searchParams.get("userId");
  const urlOrderId = searchParams.get("orderId");
  const context = searchParams.get("context");

  // ... implementação

  return {
    p2pContext,
    chatRoomId,
    timeRemaining,
    connectP2PChat: () => {
      /* ... */
    },
    disconnectP2PChat: () => {
      /* ... */
    },
  };
};
```

---

### Ação 2: Integrar `useP2PChat` no ChatPage

**Objetivo**: Substituir lógica P2P inline pelo hook

**Antes (ChatPage.tsx - linha 420)**:

```typescript
const currentUserId = localStorage.getItem("userId") || ""; // ❌ Retorna vazio
```

**Depois (ChatPage.tsx)**:

```typescript
const { p2pContext, chatRoomId, timeRemaining, connectP2PChat } = useP2PChat();
```

---

## 📊 Métricas de Sucesso

### Antes da Refatoração

- ❌ Linhas: 2490
- ❌ Complexidade ciclomática: ~80+
- ❌ Número de responsabilidades: 8+
- ❌ Testabilidade: Difícil (componente monolítico)
- ❌ Manutenibilidade: Baixa

### Depois da Refatoração (Meta)

- ✅ Linhas (ChatPage.tsx): ~500
- ✅ Complexidade ciclomática: ~20
- ✅ Número de responsabilidades: 2-3
- ✅ Testabilidade: Alta (hooks/componentes isolados)
- ✅ Manutenibilidade: Alta
- ✅ Performance: Melhorada (componentes memorizados)

---

## 🔧 Prioridade de Execução

**Ordem recomendada**:

1. **URGENTE**: Criar `useP2PChat` e fixar bug do `userId` vazio ⭐⭐⭐
2. **ALTO**: Extrair `useWebRTCCall` e `useChatMessages` ⭐⭐
3. **MÉDIO**: Criar componentes `ChatSidebar`, `MessageList`, `MessageInput` ⭐
4. **BAIXO**: Extrair utilitários e otimizações de performance

---

## 💡 Notas Importantes

### Considerações de Performance

- Usar `React.memo()` nos componentes extraídos
- Usar `useCallback()` para funções passadas como props
- Usar `useMemo()` para listas filtradas/ordenadas

### Considerações de Estado

- Considerar usar Context API para compartilhar estado entre componentes
- Avaliar se Zustand pode gerenciar estado de chat global
- Manter localStorage apenas para preferências de UI (sidebar open/closed)

### Considerações de Testes

- Cada hook deve ter arquivo de teste `.test.ts`
- Componentes devem ter testes de integração `.test.tsx`
- Manter cobertura de testes > 80%

---

## 📝 Conclusão

Este componente de 2490 linhas pode ser reduzido para **~500 linhas** através de:

- ✅ 5 Custom Hooks (~1000 linhas extraídas)
- ✅ 5 Componentes UI (~1300 linhas extraídas)
- ✅ 2 Utilitários (~200 linhas extraídas)

**Ganho total estimado**: ~2000 linhas extraídas
**Tempo estimado**: 3-4 semanas
**ROI**: Alta manutenibilidade, testabilidade e performance

---

**Criado**: $(date)
**Próxima revisão**: Após implementação da Fase 1
