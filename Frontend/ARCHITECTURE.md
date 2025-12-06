# HOLD Wallet Frontend - Arquitetura Enterprise

## 🏗️ Visão Geral da Arquitetura

### **Stack Tecnológico**
- **React 18** + **TypeScript** - Framework principal
- **Vite** - Build tool moderno e rápido
- **PWA** - Progressive Web App (instalável mobile)
- **Zustand** - State management leve e eficiente
- **React Query** - Data fetching e cache
- **React Router v6** - Roteamento SPA
- **Tailwind CSS** - Styling utility-first
- **React Hook Form** - Formulários performáticos
- **React Icons** - Ícones profissionais (sem emojis)
- **i18next** - Internacionalização completa
- **Socket.io Client** - WebSocket real-time

### **Funcionalidades Core**
- 🏦 **Multi-Wallet Management** - Carteiras Bitcoin/Ethereum/Polygon
- 🤝 **P2P Trading** - Sistema completo compra/venda
- 💬 **Real-time Chat** - WebSocket JWT auth
- ⭐ **Reputation System** - Avaliações e badges
- 🔐 **JWT Authentication** - Login/register seguro
- 🌍 **Multi-language** - PT, EN, ZH, JA, KO
- 📱 **PWA Mobile** - Instalável Android/iOS
- 🎨 **Modern UI/UX** - Design system profissional

## 📁 Estrutura de Pastas Enterprise

```
frontend/
├── public/
│   ├── icons/                     # PWA icons (144x144 até 512x512)
│   ├── manifest.json              # PWA manifest
│   └── sw.js                      # Service Worker
├── src/
│   ├── components/                # Componentes reutilizáveis
│   │   ├── ui/                    # UI primitivos
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Button.test.tsx
│   │   │   │   └── index.ts
│   │   │   ├── Modal/
│   │   │   ├── Input/
│   │   │   ├── Card/
│   │   │   ├── Badge/
│   │   │   ├── LoadingSpinner/
│   │   │   ├── Toast/
│   │   │   └── index.ts           # Barrel export
│   │   ├── layout/                # Layout components
│   │   │   ├── Header/
│   │   │   ├── Sidebar/
│   │   │   ├── Footer/
│   │   │   └── AppLayout/
│   │   ├── wallet/                # Wallet específicos
│   │   │   ├── WalletCard/
│   │   │   ├── WalletBalance/
│   │   │   ├── TransactionHistory/
│   │   │   ├── SendTransaction/
│   │   │   └── ReceiveAddress/
│   │   ├── p2p/                   # P2P Trading
│   │   │   ├── OrderBook/
│   │   │   ├── OrderForm/
│   │   │   ├── TradeHistory/
│   │   │   ├── MatchCard/
│   │   │   └── DisputePanel/
│   │   ├── chat/                  # Chat components
│   │   │   ├── ChatWindow/
│   │   │   ├── MessageList/
│   │   │   ├── MessageInput/
│   │   │   ├── FileUpload/
│   │   │   └── UserStatus/
│   │   ├── reputation/            # Reputation system
│   │   │   ├── UserProfile/
│   │   │   ├── ReputationCard/
│   │   │   ├── ReviewForm/
│   │   │   ├── BadgeDisplay/
│   │   │   └── LeaderBoard/
│   │   └── auth/                  # Authentication
│   │       ├── LoginForm/
│   │       ├── RegisterForm/
│   │       ├── ProtectedRoute/
│   │       └── AuthGuard/
│   ├── pages/                     # Páginas da aplicação
│   │   ├── Dashboard/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── components/
│   │   │   │   ├── PortfolioOverview/
│   │   │   │   ├── RecentTransactions/
│   │   │   │   └── MarketSummary/
│   │   │   └── index.ts
│   │   ├── Wallet/
│   │   │   ├── WalletDashboard.tsx
│   │   │   ├── WalletDetails.tsx
│   │   │   ├── CreateWallet.tsx
│   │   │   └── components/
│   │   ├── P2P/
│   │   │   ├── P2PMarket.tsx
│   │   │   ├── MyOrders.tsx
│   │   │   ├── TradeDetails.tsx
│   │   │   └── components/
│   │   ├── Chat/
│   │   │   ├── ChatDashboard.tsx
│   │   │   ├── ChatRoom.tsx
│   │   │   └── components/
│   │   ├── Profile/
│   │   │   ├── UserProfile.tsx
│   │   │   ├── ReputationDashboard.tsx
│   │   │   ├── Settings.tsx
│   │   │   └── components/
│   │   ├── Auth/
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── ForgotPassword.tsx
│   │   │   └── ResetPassword.tsx
│   │   └── NotFound/
│   │       └── NotFound.tsx
│   ├── hooks/                     # Custom React hooks
│   │   ├── useAuth.ts             # Authentication state
│   │   ├── useWebSocket.ts        # WebSocket connection
│   │   ├── useWallet.ts           # Wallet operations
│   │   ├── useP2P.ts              # P2P trading logic
│   │   ├── useChat.ts             # Chat functionality
│   │   ├── useReputation.ts       # Reputation system
│   │   ├── useNotifications.ts    # Toast notifications
│   │   ├── useLocalStorage.ts     # LocalStorage helper
│   │   ├── useDebounce.ts         # Debounce utility
│   │   └── useInfiniteScroll.ts   # Infinite scroll
│   ├── services/                  # API e serviços externos
│   │   ├── api/                   # API calls
│   │   │   ├── auth.ts            # Auth endpoints
│   │   │   ├── wallet.ts          # Wallet endpoints
│   │   │   ├── p2p.ts             # P2P endpoints
│   │   │   ├── chat.ts            # Chat endpoints
│   │   │   ├── reputation.ts      # Reputation endpoints
│   │   │   ├── blockchain.ts      # Blockchain endpoints
│   │   │   └── index.ts
│   │   ├── websocket/             # WebSocket services
│   │   │   ├── chatService.ts     # Chat WebSocket
│   │   │   ├── p2pService.ts      # P2P notifications
│   │   │   └── index.ts
│   │   ├── crypto/                # Crypto operations
│   │   │   ├── bitcoin.ts         # Bitcoin utils
│   │   │   ├── ethereum.ts        # Ethereum utils
│   │   │   ├── polygon.ts         # Polygon utils
│   │   │   ├── wallet-core.ts     # Core wallet logic
│   │   │   └── index.ts
│   │   ├── storage/               # Storage utilities
│   │   │   ├── secureStorage.ts   # Encrypted storage
│   │   │   ├── preferences.ts     # User preferences
│   │   │   └── cache.ts           # Cache management
│   │   └── notifications/         # Push notifications
│   │       ├── pushService.ts     # PWA push notifications
│   │       └── toastService.ts    # In-app notifications
│   ├── stores/                    # Zustand global state
│   │   ├── authStore.ts           # Authentication state
│   │   ├── walletStore.ts         # Wallet state
│   │   ├── p2pStore.ts            # P2P trading state
│   │   ├── chatStore.ts           # Chat state
│   │   ├── reputationStore.ts     # Reputation state
│   │   ├── uiStore.ts             # UI state (theme, etc)
│   │   └── index.ts               # Combined stores
│   ├── utils/                     # Utility functions
│   │   ├── format/                # Formatters
│   │   │   ├── currency.ts        # Currency formatting
│   │   │   ├── date.ts            # Date formatting
│   │   │   ├── address.ts         # Address formatting
│   │   │   └── number.ts          # Number formatting
│   │   ├── validation/            # Validation schemas
│   │   │   ├── auth.ts            # Auth validation
│   │   │   ├── wallet.ts          # Wallet validation
│   │   │   ├── p2p.ts             # P2P validation
│   │   │   └── schemas.ts         # Combined schemas
│   │   ├── crypto/                # Crypto utilities
│   │   │   ├── encryption.ts      # Encryption helpers
│   │   │   ├── hashing.ts         # Hash functions
│   │   │   └── signatures.ts      # Signature verification
│   │   ├── constants/             # App constants
│   │   │   ├── api.ts             # API endpoints
│   │   │   ├── routes.ts          # Route paths
│   │   │   ├── config.ts          # App config
│   │   │   └── crypto.ts          # Crypto constants
│   │   └── helpers/               # Helper functions
│   │       ├── clipboard.ts       # Clipboard operations
│   │       ├── download.ts        # File download
│   │       ├── qrcode.ts          # QR code generation
│   │       └── url.ts             # URL utilities
│   ├── styles/                    # Styling
│   │   ├── globals.css            # Global styles
│   │   ├── components.css         # Component styles
│   │   ├── themes/                # Theme definitions
│   │   │   ├── light.css          # Light theme
│   │   │   ├── dark.css           # Dark theme
│   │   │   └── themes.ts          # Theme config
│   │   └── tailwind.css           # Tailwind imports
│   ├── locales/                   # Internationalization
│   │   ├── en/                    # English
│   │   │   ├── common.json        # Common translations
│   │   │   ├── auth.json          # Auth translations
│   │   │   ├── wallet.json        # Wallet translations
│   │   │   ├── p2p.json           # P2P translations
│   │   │   ├── chat.json          # Chat translations
│   │   │   └── reputation.json    # Reputation translations
│   │   ├── pt/                    # Portuguese
│   │   ├── zh/                    # Chinese
│   │   ├── ja/                    # Japanese
│   │   ├── ko/                    # Korean
│   │   └── index.ts               # i18n configuration
│   ├── types/                     # TypeScript definitions
│   │   ├── api.ts                 # API response types
│   │   ├── auth.ts                # Auth types
│   │   ├── wallet.ts              # Wallet types
│   │   ├── p2p.ts                 # P2P types
│   │   ├── chat.ts                # Chat types
│   │   ├── reputation.ts          # Reputation types
│   │   ├── ui.ts                  # UI component types
│   │   └── global.d.ts            # Global type declarations
│   ├── config/                    # Configuration files
│   │   ├── env.ts                 # Environment config
│   │   ├── api.ts                 # API configuration
│   │   ├── routes.ts              # Route definitions
│   │   ├── theme.ts               # Theme configuration
│   │   └── i18n.ts                # Internationalization config
│   ├── tests/                     # Test files
│   │   ├── __mocks__/             # Mock files
│   │   ├── utils/                 # Test utilities
│   │   ├── setup.ts               # Test setup
│   │   └── coverage/              # Coverage reports
│   ├── App.tsx                    # Root component
│   ├── main.tsx                   # Entry point
│   ├── vite-env.d.ts              # Vite types
│   └── index.html                 # HTML template
├── package.json                   # Dependencies
├── vite.config.ts                 # Vite configuration
├── tailwind.config.js             # Tailwind configuration
├── tsconfig.json                  # TypeScript configuration
├── vitest.config.ts               # Test configuration
├── .env.example                   # Environment variables
├── .gitignore                     # Git ignore
├── .eslintrc.js                   # ESLint configuration
├── .prettierrc                    # Prettier configuration
├── README.md                      # Documentation
└── DEPLOYMENT.md                  # Deployment guide
```

## 🌍 Sistema de Internacionalização

### **Idiomas Suportados**
- 🇧🇷 **Português** (pt) - Mercado principal
- 🇺🇸 **English** (en) - Mercado global
- 🇨🇳 **中文** (zh) - Mercado chinês
- 🇯🇵 **日本語** (ja) - Mercado japonês
- 🇰🇷 **한국어** (ko) - Mercado coreano

### **Estrutura i18n**
```typescript
// locales/pt/common.json
{
  "app": {
    "title": "HOLD Wallet",
    "subtitle": "Carteira Crypto P2P"
  },
  "navigation": {
    "dashboard": "Painel",
    "wallet": "Carteira",
    "p2p": "P2P Trading",
    "chat": "Chat",
    "profile": "Perfil"
  },
  "actions": {
    "login": "Entrar",
    "register": "Registrar",
    "send": "Enviar",
    "receive": "Receber",
    "buy": "Comprar",
    "sell": "Vender"
  }
}
```

## 🎨 Design System

### **Core Styles**
```typescript
// Theme Configuration
export const theme = {
  colors: {
    primary: {
      50: '#f0f9ff',
      500: '#3b82f6',
      900: '#1e3a8a'
    },
    success: {
      50: '#f0fdf4',
      500: '#10b981',
      900: '#064e3b'
    },
    warning: {
      50: '#fffbeb',
      500: '#f59e0b',
      900: '#78350f'
    },
    danger: {
      50: '#fef2f2',
      500: '#ef4444',
      900: '#7f1d1d'
    }
  },
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem'
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem'
  }
}
```

## 📱 PWA Configuration

### **Manifest.json**
```json
{
  "name": "HOLD Wallet - P2P Crypto Trading",
  "short_name": "HOLD Wallet",
  "description": "Carteira digital P2P com chat e sistema de reputação",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1e3a8a",
  "theme_color": "#3b82f6",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## 🔐 Segurança Frontend

### **Princípios de Segurança**
- ✅ **Client-side Encryption** - Chaves privadas NUNCA saem do device
- ✅ **Secure Storage** - LocalStorage criptografado
- ✅ **JWT Rotation** - Refresh tokens automáticos
- ✅ **XSS Protection** - Sanitização de inputs
- ✅ **CSRF Protection** - Tokens anti-CSRF
- ✅ **Content Security Policy** - CSP headers
- ✅ **Secure Communication** - HTTPS + WSS only

### **Wallet Security**
```typescript
// Exemplo: Secure Wallet Management
class WalletManager {
  private encryptedStorage: SecureStorage;
  
  async createWallet(password: string): Promise<Wallet> {
    const mnemonic = generateMnemonic();
    const encryptedMnemonic = await encrypt(mnemonic, password);
    
    // NUNCA enviar para backend
    this.encryptedStorage.set('wallet_data', encryptedMnemonic);
    
    return {
      id: uuid(),
      addresses: deriveAddresses(mnemonic),
      // Apenas metadata pública
    };
  }
}
```

## 📊 Estado Global (Zustand)

### **Store Structure**
```typescript
// stores/authStore.ts
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

// stores/walletStore.ts
interface WalletState {
  wallets: Wallet[];
  activeWallet: Wallet | null;
  balances: Record<string, Balance>;
  createWallet: (data: CreateWalletData) => Promise<void>;
  selectWallet: (walletId: string) => void;
  updateBalances: () => Promise<void>;
}
```

## 🤝 Integração P2P Trading

### **Componentes P2P**
- **OrderBook** - Lista de ordens compra/venda
- **OrderForm** - Criar/editar ordens
- **TradeHistory** - Histórico de trades
- **MatchCard** - Detalhes do match
- **EscrowPanel** - Status do escrow
- **DisputePanel** - Sistema de disputas
- **PaymentMethods** - Métodos de pagamento

### **WebSocket P2P**
```typescript
// Real-time P2P updates
const useP2PWebSocket = () => {
  const socket = useWebSocket('/ws/p2p');
  
  useEffect(() => {
    socket.on('order_matched', (data) => {
      // Atualizar UI com novo match
    });
    
    socket.on('payment_confirmed', (data) => {
      // Atualizar status do pagamento
    });
  }, [socket]);
};
```

## 💬 Sistema de Chat

### **Chat Features**
- **Real-time Messaging** - WebSocket com JWT
- **File Upload** - Comprovantes até 10MB
- **Message History** - Histórico persistente
- **Online Status** - Status dos usuários
- **Typing Indicators** - Indicadores de digitação
- **Read Receipts** - Confirmação de leitura

### **Chat WebSocket**
```typescript
// services/websocket/chatService.ts
class ChatService {
  private socket: Socket;
  
  connect(token: string, roomId: string) {
    this.socket = io(`/ws/chat/${roomId}`, {
      auth: { token }
    });
    
    this.socket.on('message', this.handleMessage);
    this.socket.on('file_uploaded', this.handleFileUpload);
  }
  
  sendMessage(content: string) {
    this.socket.emit('send_message', { content });
  }
}
```

## ⭐ Sistema de Reputação

### **Reputation Components**
- **UserProfile** - Perfil do trader
- **ReputationCard** - Score e nível
- **ReviewForm** - Formulário de avaliação
- **BadgeDisplay** - Exibição de badges
- **LeaderBoard** - Ranking de traders
- **FraudAlert** - Alertas de fraude

## 🚀 Performance & Otimizações

### **Estratégias de Performance**
- ✅ **Code Splitting** - Lazy loading de páginas
- ✅ **Bundle Optimization** - Tree shaking
- ✅ **Image Optimization** - WebP + lazy loading
- ✅ **Caching Strategy** - Service Worker cache
- ✅ **Virtual Scrolling** - Listas grandes
- ✅ **Memoization** - React.memo + useMemo
- ✅ **Web Workers** - Heavy computations

### **Monitoring**
- **Web Vitals** - Core Web Vitals tracking
- **Error Boundary** - Error handling
- **Performance API** - Metrics collection
- **User Analytics** - Usage tracking

## 🧪 Testing Strategy

### **Test Types**
- **Unit Tests** - Vitest + React Testing Library
- **Integration Tests** - API integration
- **E2E Tests** - Playwright
- **Visual Tests** - Chromatic
- **Performance Tests** - Lighthouse CI

### **Coverage Targets**
- **Components**: 90%+
- **Hooks**: 85%+
- **Utils**: 95%+
- **Services**: 80%+

## 📱 Mobile Optimization

### **PWA Features**
- ✅ **Offline Support** - Service Worker caching
- ✅ **Install Prompt** - Add to homescreen
- ✅ **Push Notifications** - Trading alerts
- ✅ **Background Sync** - Sync when online
- ✅ **Responsive Design** - Mobile-first approach
- ✅ **Touch Gestures** - Swipe navigation
- ✅ **Dark Mode** - Battery optimization

### **Mobile UX**
- **Bottom Navigation** - Thumb-friendly navigation
- **Gesture Navigation** - Swipe gestures
- **Haptic Feedback** - Touch feedback
- **Optimized Forms** - Mobile keyboards
- **Quick Actions** - Shortcuts importantes

---

## 🎯 Próximos Passos

1. **Setup Inicial** - Criar projeto Vite + TypeScript
2. **Design System** - Implementar componentes base
3. **Routing** - Configurar React Router
4. **Authentication** - Sistema de login/register
5. **Wallet Management** - Carteiras e transações
6. **P2P Trading** - Sistema completo P2P
7. **Chat System** - WebSocket chat
8. **Reputation** - Sistema de avaliações
9. **PWA Setup** - Service Worker + manifest
10. **Testing** - Testes automatizados
11. **Deployment** - CI/CD pipeline

**Arquitetura pronta para desenvolvimento enterprise! 🚀**
