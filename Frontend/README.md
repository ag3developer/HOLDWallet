# HOLD Wallet - Frontend

Frontend da aplicação HOLD Wallet desenvolvido com React 18, TypeScript, Vite e Tailwind CSS.

## 🚀 Tecnologias

### Core
- **React 18** - Framework frontend moderno
- **TypeScript** - Linguagem tipada
- **Vite** - Build tool ultrarrápido
- **Tailwind CSS** - Framework CSS utility-first

### Estado e Dados
- **Zustand** - Gerenciamento de estado simples e poderoso
- **React Query (TanStack Query)** - Gerenciamento de estado servidor
- **React Hook Form** - Formulários performáticos
- **Zod** - Validação de schemas

### Navegação e UI
- **React Router 6** - Roteamento SPA
- **React Hot Toast** - Notificações
- **Framer Motion** - Animações
- **Radix UI** - Componentes acessíveis
- **Lucide React** - Ícones modernos

### PWA e Mobile
- **Vite PWA** - Progressive Web App
- **Workbox** - Service Worker avançado
- **React Helmet Async** - SEO e meta tags

### Internacionalização
- **i18next** - Sistema completo de tradução
- **react-i18next** - Integração React
- **i18next-browser-languagedetector** - Detecção de idioma

### Criptografia e Web3
- **Web3.js** - Interação blockchain Ethereum
- **Ethers.js** - Biblioteca Ethereum alternativa
- **bip39** - Geração de seed phrases
- **crypto-js** - Funções criptográficas

### Desenvolvimento
- **ESLint** - Linting de código
- **Prettier** - Formatação de código
- **TypeScript** - Tipagem estática

## 📁 Estrutura de Pastas

```
src/
├── components/          # Componentes reutilizáveis
│   ├── ui/             # Componentes base (Button, Input, etc.)
│   ├── layout/         # Componentes de layout (Header, Sidebar)
│   ├── forms/          # Formulários específicos
│   └── features/       # Componentes por funcionalidade
├── pages/              # Páginas da aplicação
│   ├── auth/          # Autenticação (Login, Register)
│   ├── dashboard/     # Dashboard principal
│   ├── wallet/        # Gerenciamento de carteiras
│   ├── p2p/          # Trading P2P
│   ├── chat/         # Sistema de chat
│   ├── profile/      # Perfil do usuário
│   └── settings/     # Configurações
├── stores/            # Stores Zustand
│   ├── useAuthStore.ts
│   ├── useThemeStore.ts
│   └── useWalletStore.ts
├── services/          # Serviços de API
│   ├── api.ts        # Cliente HTTP
│   ├── auth.ts       # Autenticação
│   ├── wallet.ts     # Carteiras
│   └── p2p.ts        # P2P Trading
├── hooks/             # Custom hooks
│   ├── useAuth.ts
│   ├── useWebSocket.ts
│   └── useLocalStorage.ts
├── utils/             # Funções utilitárias
│   ├── format.ts     # Formatação de dados
│   ├── validation.ts # Validações
│   └── crypto.ts     # Funções crypto
├── types/             # Definições TypeScript
│   └── index.ts
├── config/            # Configurações
│   ├── app.ts        # Configurações globais
│   └── i18n.ts       # Configuração i18n
├── locales/           # Traduções
│   ├── pt-BR.json
│   ├── en-US.json
│   ├── es-ES.json
│   ├── zh-CN.json
│   ├── ja-JP.json
│   └── ko-KR.json
└── styles/            # Estilos globais
    └── globals.css
```

## 🛠️ Comandos Disponíveis

```bash
# Desenvolvimento
npm run dev          # Iniciar servidor de desenvolvimento
npm run build        # Build para produção
npm run preview      # Preview do build de produção

# Qualidade de código
npm run lint         # Executar ESLint
npm run lint:fix     # Corrigir problemas do ESLint
npm run type-check   # Verificar tipos TypeScript

# Testes (quando implementados)
npm run test         # Executar testes
npm run test:watch   # Testes em modo watch
npm run test:coverage # Cobertura de testes
```

## 🌐 Internacionalização (i18n)

O frontend suporta múltiplos idiomas:

- **Português (pt-BR)** - Idioma principal
- **Inglês (en-US)** - Internacional
- **Espanhol (es-ES)** - Mercado hispano
- **Chinês Simplificado (zh-CN)** - Mercado asiático
- **Japonês (ja-JP)** - Mercado japonês
- **Coreano (ko-KR)** - Mercado coreano

### Uso de traduções

```typescript
import { useTranslation } from 'react-i18next'

const MyComponent = () => {
  const { t } = useTranslation()
  
  return (
    <h1>{t('common.welcome', 'Bem-vindo')}</h1>
  )
}
```

## 📱 Progressive Web App (PWA)

O frontend é uma PWA completa com:

- **Instalação** - Pode ser instalada como app nativo
- **Offline** - Funciona parcialmente sem internet
- **Push Notifications** - Notificações push
- **Background Sync** - Sincronização em background

### Recursos PWA

- ✅ Web App Manifest
- ✅ Service Worker
- ✅ Offline fallbacks
- ✅ Update prompts
- ✅ Install prompts

## 🎨 Sistema de Design

### Cores Principais

```css
/* Light Mode */
--primary-50: #eff6ff
--primary-500: #3b82f6  /* Cor principal */
--primary-900: #1e3a8a

/* Success */
--success-500: #22c55e

/* Danger */
--danger-500: #ef4444

/* Warning */
--warning-500: #f59e0b
```

### Tipografia

- **Fonte Principal**: Inter (Google Fonts)
- **Fonte Mono**: Fira Code

### Componentes Base

Todos os componentes seguem o design system:

- `Button` - Botões com variantes
- `Input` - Campos de entrada
- `Card` - Cards responsivos
- `Modal` - Modais acessíveis
- `Toast` - Notificações

## 🔐 Segurança

### Práticas implementadas

- **CSP Headers** - Content Security Policy
- **Token JWT** - Autenticação segura
- **Refresh Tokens** - Renovação automática
- **Input Validation** - Validação rigorosa
- **XSS Protection** - Proteção contra XSS
- **HTTPS Only** - Apenas conexões seguras

### Criptografia Client-Side

- **Carteiras HD** - Hierarchical Deterministic
- **Seed Phrases** - BIP39 compatível
- **Private Keys** - Nunca enviadas ao servidor
- **Local Encryption** - Dados locais criptografados

## 🔗 Integração com Backend

### API REST

```typescript
// Configuração automática de interceptors
const apiClient = new ApiClient()

// Headers automáticos
- Authorization: Bearer <token>
- Content-Type: application/json
- X-Request-ID: <uuid>
```

### WebSocket

```typescript
// Chat em tempo real
const chatSocket = useWebSocket('/ws/chat')

// Trading updates
const tradingSocket = useWebSocket('/ws/trading')

// Notifications
const notificationSocket = useWebSocket('/ws/notifications')
```

## 📊 Performance

### Otimizações implementadas

- **Code Splitting** - Lazy loading de rotas
- **Tree Shaking** - Remoção de código morto
- **Bundle Analysis** - Análise de bundles
- **Image Optimization** - Otimização de imagens
- **Caching Strategy** - Cache inteligente

### Métricas alvo

- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

## 🚀 Deploy

### Build de Produção

```bash
npm run build
```

### Variáveis de Ambiente

Configurar no `.env`:

```bash
VITE_API_URL=https://api.holdwallet.com
VITE_WS_URL=wss://api.holdwallet.com
VITE_APP_VERSION=1.0.0
```

### Deploy Automático

- **Vercel** - Recomendado para frontend
- **Netlify** - Alternativa popular
- **AWS S3 + CloudFront** - Enterprise

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma feature branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

### Padrões de código

- Usar TypeScript sempre
- Seguir ESLint + Prettier
- Componentes funcionais apenas
- Hooks para lógica
- Testes obrigatórios

## 📝 Licença

Projeto proprietário - HOLD Wallet Team

---

**Versão**: 1.0.0  
**Node.js**: >= 18.0.0  
**npm**: >= 8.0.0
