# WolkNow Development Standards

Technical specification document for consistent development across the WolkNow platform.

Version: 1.1
Last Updated: January 2026

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Overview](#project-overview)
3. [Technology Stack](#technology-stack)
4. [Code Standards](#code-standards)
5. [UI/UX Guidelines](#uiux-guidelines)
6. [Component Architecture](#component-architecture)
7. [Responsive Design](#responsive-design)
8. [Icon System](#icon-system)
9. [Color System](#color-system)
10. [Typography](#typography)
11. [Spacing and Layout](#spacing-and-layout)
12. [Dark Mode](#dark-mode)
13. [PWA Requirements](#pwa-requirements)
14. [Performance Guidelines](#performance-guidelines)
15. [Accessibility](#accessibility)
16. [Testing Standards](#testing-standards)
17. [API Integration](#api-integration)
18. [Error Handling](#error-handling)
19. [Security Guidelines](#security-guidelines)
20. [File Structure](#file-structure)
21. [Git Workflow](#git-workflow)

---

## Getting Started

### Project Structure Overview

```
HOLDWallet/                    # Root workspace
├── Frontend/                  # React/Vite Application
│   ├── src/
│   │   ├── components/       # Shared components
│   │   ├── pages/            # Page components
│   │   ├── services/         # API services
│   │   ├── stores/           # Zustand stores
│   │   ├── hooks/            # Custom hooks
│   │   ├── types/            # TypeScript types
│   │   ├── utils/            # Utility functions
│   │   ├── locales/          # i18n translations
│   │   ├── config/           # App configuration
│   │   ├── styles/           # Global styles
│   │   └── assets/           # Static assets
│   ├── public/               # Public assets
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── backend/                   # FastAPI Application
│   ├── app/
│   │   ├── api/              # API endpoints
│   │   ├── routers/          # Route handlers
│   │   ├── services/         # Business logic
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── clients/          # External API clients
│   │   ├── core/             # Core configuration
│   │   ├── db/               # Database setup
│   │   ├── middleware/       # Custom middleware
│   │   ├── utils/            # Utility functions
│   │   └── main.py           # App entry point
│   ├── alembic/              # DB migrations
│   ├── requirements.txt
│   └── .env
│
├── start-dev.sh              # Development startup script
├── scripts/                  # Utility scripts
└── *.md                      # Documentation files
```

### Prerequisites

Before starting development, ensure you have the following installed:

| Tool       | Version      | Check Command           | Installation                  |
| ---------- | ------------ | ----------------------- | ----------------------------- |
| Node.js    | 18.x or 20.x | `node --version`        | https://nodejs.org            |
| Python     | 3.11+        | `python3 --version`     | https://python.org            |
| Git        | Latest       | `git --version`         | https://git-scm.com           |
| VS Code    | Latest       | -                       | https://code.visualstudio.com |
| PostgreSQL | 15+          | `pg_isready` (optional) | For production database       |

### VS Code Extensions (Required)

Install these extensions for the best development experience:

```plaintext
dbaeumer.vscode-eslint          # ESLint integration
esbenp.prettier-vscode          # Code formatting
bradlc.vscode-tailwindcss       # TailwindCSS IntelliSense
ms-python.python                # Python support
ms-python.vscode-pylance        # Python type checking
formulahendry.auto-rename-tag   # Auto rename HTML/JSX tags
christian-kohler.path-intellisense  # Path autocomplete
```

### Clone the Repository

```bash
git clone https://github.com/ag3developer/HOLDWallet.git
cd HOLDWallet
```

### Environment Setup

#### 1. Frontend Setup

```bash
# Navigate to frontend directory (note: capital F)
cd Frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Required environment variables:
# VITE_API_URL=http://localhost:8000/api/v1
# VITE_APP_NAME=WolkNow
```

**Frontend Environment Files:**

- `.env.development` - Development settings
- `.env.production` - Production settings
- `.env.local` - Local overrides (git ignored)

#### 2. Backend Setup

```bash
# Navigate to backend directory (note: lowercase)
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# macOS/Linux:
source venv/bin/activate

# Windows:
# .\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Required environment variables:
# DATABASE_URL=postgresql://user:pass@localhost:5432/holdwallet
# SECRET_KEY=your-secret-key-here
# CORS_ORIGINS=http://localhost:3000
```

**Backend Environment Files:**

- `.env` - Main configuration
- `.env.local` - Local overrides
- `.env.production` - Production settings

### Running the Application

#### Option 1: Automated Script (Recommended)

```bash
# From the root HOLDWallet directory
chmod +x start-dev.sh
./start-dev.sh
```

This script will:

1. Check Python and Node.js versions
2. Verify available ports (8000, 3000)
3. Install missing dependencies if needed
4. Start Backend on port 8000
5. Start Frontend on port 3000
6. Handle graceful shutdown with Ctrl+C

#### Option 2: Manual Start (Two Terminals)

**Terminal 1 - Backend:**

```bash
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 - Frontend:**

```bash
cd Frontend
npm run dev
```

### Access Points

| Service      | URL                            | Description           |
| ------------ | ------------------------------ | --------------------- |
| Frontend App | `http://localhost:3000`        | Web Application       |
| Backend API  | `http://localhost:8000`        | REST API              |
| Swagger Docs | `http://localhost:8000/docs`   | Interactive API Docs  |
| ReDoc        | `http://localhost:8000/redoc`  | Alternative API Docs  |
| Health Check | `http://localhost:8000/health` | Backend health status |

### Verify Installation

After starting both services, verify everything is working:

```bash
# Test backend health
curl http://localhost:8000/health

# Test prices endpoint
curl "http://localhost:8000/api/v1/prices/batch?symbols=BTC,ETH,USDT&fiat=brl"

# Open frontend in browser
open http://localhost:3000
```

### Development Workflow

```plaintext
1. Pull latest changes
   git pull origin main

2. Create feature branch
   git checkout -b feature/your-feature-name

3. Make changes and test locally
   - Frontend: Changes auto-reload via Vite HMR
   - Backend: Changes auto-reload via Uvicorn --reload

4. Commit with conventional commits
   git add .
   git commit -m "feat(scope): description"

5. Push and create PR
   git push origin feature/your-feature-name
```

### Quick Commands Reference

#### Frontend Commands

```bash
# Start development server (port 3000)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Run linter
npm run lint

# Fix lint errors automatically
npm run lint:fix

# Run TypeScript type check
npm run type-check

# Format code with Prettier
npm run format

# Run tests
npm run test

# Run tests with UI
npm run test:ui
```

#### Backend Commands

```bash
# Activate virtual environment first!
source venv/bin/activate

# Start server with auto-reload
python -m uvicorn app.main:app --reload --port 8000

# Run all tests
pytest

# Run tests with coverage
pytest --cov=app

# Format code with Black
black .

# Check types with mypy
mypy app/

# Run database migrations
alembic upgrade head

# Create new migration
alembic revision --autogenerate -m "description"
```

### Troubleshooting Common Issues

#### Issue: Port already in use

```bash
# Kill process on port 3000 (Frontend)
lsof -ti:3000 | xargs kill -9

# Kill process on port 8000 (Backend)
lsof -ti:8000 | xargs kill -9

# Or find and kill specific process
lsof -i :3000
kill -9 <PID>
```

#### Issue: Node modules corruption

```bash
cd Frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

#### Issue: Python virtual environment issues

```bash
cd backend
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

#### Issue: Database connection failed

```bash
# For local development with SQLite (easier setup)
# In backend/.env set:
DATABASE_URL=sqlite:///./holdwallet.db

# For PostgreSQL, check if running:
pg_isready

# Start PostgreSQL (macOS with Homebrew):
brew services start postgresql
```

#### Issue: CORS errors in browser

```bash
# Ensure backend .env has correct CORS settings:
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Restart backend after changing .env
```

#### Issue: Import errors in TypeScript

```bash
# Clear Vite cache
cd Frontend
rm -rf node_modules/.vite
npm run dev
```

---

## Project Overview

WolkNow is a Progressive Web Application (PWA) for cryptocurrency wallet management, trading, and portfolio intelligence. The application must work seamlessly across all devices and screen sizes.

### Target Platforms

| Platform             | Priority | Minimum Support   |
| -------------------- | -------- | ----------------- |
| iOS Safari (PWA)     | High     | iOS 14+           |
| Android Chrome (PWA) | High     | Android 8+        |
| Desktop Chrome       | High     | Latest 2 versions |
| Desktop Firefox      | Medium   | Latest 2 versions |
| Desktop Safari       | Medium   | Latest 2 versions |
| Desktop Edge         | Low      | Latest 2 versions |

---

## Technology Stack

### Frontend

| Technology      | Version | Purpose              |
| --------------- | ------- | -------------------- |
| React           | 18.x    | UI Framework         |
| TypeScript      | 5.x     | Type Safety          |
| Vite            | 5.x     | Build Tool           |
| TailwindCSS     | 3.x     | Styling              |
| Zustand         | 4.x     | State Management     |
| React Query     | 5.x     | Server State         |
| React Router    | 6.x     | Routing              |
| Lucide React    | Latest  | Icons                |
| React Hot Toast | Latest  | Notifications        |
| i18next         | Latest  | Internationalization |

### Backend

| Technology | Version | Purpose       |
| ---------- | ------- | ------------- |
| Python     | 3.11+   | Runtime       |
| FastAPI    | 0.100+  | API Framework |
| SQLAlchemy | 2.x     | ORM           |
| PostgreSQL | 15+     | Database      |
| Redis      | 7+      | Cache         |
| Celery     | 5.x     | Task Queue    |

---

## Code Standards

### TypeScript/React Rules

```typescript
// DO: Use functional components with TypeScript
interface ComponentProps {
  readonly title: string;
  readonly onAction: () => void;
  readonly isLoading?: boolean;
}

export function MyComponent({
  title,
  onAction,
  isLoading = false,
}: ComponentProps) {
  // Component logic
}

// DON'T: Use class components or any type
class MyComponent extends React.Component {} // BAD
const data: any = {}; // BAD
```

### Naming Conventions

| Type        | Convention                          | Example                   |
| ----------- | ----------------------------------- | ------------------------- |
| Components  | PascalCase                          | `UserProfile.tsx`         |
| Hooks       | camelCase with use prefix           | `useWalletBalance.ts`     |
| Services    | kebab-case                          | `wallet-service.ts`       |
| Constants   | SCREAMING_SNAKE_CASE                | `MAX_RETRY_COUNT`         |
| Functions   | camelCase                           | `calculateTotal()`        |
| Interfaces  | PascalCase with I prefix (optional) | `UserData` or `IUserData` |
| Types       | PascalCase                          | `PaymentMethod`           |
| CSS Classes | kebab-case (Tailwind)               | `bg-blue-600`             |

### File Organization

```
// Each component file should follow this structure:

// 1. Imports (external first, then internal)
import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Wallet, ArrowRight } from 'lucide-react'

import { apiClient } from '@/services/api'
import { useWalletStore } from '@/stores/useWalletStore'

// 2. Types/Interfaces
interface WalletCardProps {
  readonly balance: number
  readonly symbol: string
}

// 3. Constants (if needed)
const REFRESH_INTERVAL = 30000

// 4. Helper functions (if needed)
const formatBalance = (value: number): string => {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2 })
}

// 5. Component
export function WalletCard({ balance, symbol }: WalletCardProps) {
  // hooks first
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)

  // effects
  useEffect(() => {
    // effect logic
  }, [])

  // handlers
  const handleClick = () => {
    // handler logic
  }

  // render
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

---

## UI/UX Guidelines

### Critical Rules

1. **NO EMOJIS IN CODE** - Use Lucide React icons instead
2. **Always support dark mode** - Every component must work in both themes
3. **Mobile-first design** - Start with mobile layout, then expand
4. **Touch-friendly targets** - Minimum 44x44px for interactive elements
5. **Loading states** - Every async operation must show loading feedback
6. **Error states** - Every operation must handle and display errors gracefully

### Prohibited Patterns

```tsx
// NEVER DO THIS:

// 1. Emojis in JSX
<span>🔥 Hot Deal</span>  // BAD

// 2. Hardcoded colors
<div style={{ color: '#3B82F6' }}>  // BAD

// 3. Fixed pixel widths on containers
<div style={{ width: '400px' }}>  // BAD

// 4. Inline styles for theming
<div style={{ backgroundColor: 'white' }}>  // BAD

// 5. Non-responsive text
<h1 className="text-4xl">Title</h1>  // BAD - no responsive variant
```

### Required Patterns

```tsx
// ALWAYS DO THIS:

// 1. Lucide icons instead of emojis
import { Flame } from 'lucide-react'
<span className="flex items-center gap-1">
  <Flame className="w-4 h-4 text-orange-500" />
  Hot Deal
</span>

// 2. Tailwind classes for colors
<div className="text-blue-600 dark:text-blue-400">

// 3. Responsive widths
<div className="w-full max-w-md">

// 4. Dark mode support
<div className="bg-white dark:bg-gray-800">

// 5. Responsive text
<h1 className="text-2xl md:text-3xl lg:text-4xl">Title</h1>
```

---

## Component Architecture

### Component Types

| Type     | Location                          | Purpose                     |
| -------- | --------------------------------- | --------------------------- |
| Pages    | `src/pages/`                      | Route-level components      |
| Features | `src/pages/[feature]/components/` | Feature-specific components |
| Shared   | `src/components/`                 | Reusable across features    |
| UI       | `src/components/ui/`              | Base UI primitives          |
| Layout   | `src/components/layout/`          | Layout components           |

### Component Template

```tsx
import React, { useState, useEffect, useCallback } from "react";
import { Loader, AlertCircle, CheckCircle } from "lucide-react";

// Types
interface MyComponentProps {
  /** Unique identifier */
  readonly id: string;
  /** Display title */
  readonly title: string;
  /** Callback when action is triggered */
  readonly onAction?: (id: string) => void;
  /** Optional loading state override */
  readonly isLoading?: boolean;
  /** Optional className for custom styling */
  readonly className?: string;
}

// Constants
const ANIMATION_DURATION = 300;

/**
 * MyComponent - Brief description of what it does
 *
 * @example
 * <MyComponent
 *   id="123"
 *   title="Example"
 *   onAction={(id) => console.log(id)}
 * />
 */
export function MyComponent({
  id,
  title,
  onAction,
  isLoading = false,
  className = "",
}: MyComponentProps) {
  // State
  const [internalState, setInternalState] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Effects
  useEffect(() => {
    // Setup logic
    return () => {
      // Cleanup logic
    };
  }, [id]);

  // Handlers
  const handleAction = useCallback(() => {
    if (onAction) {
      onAction(id);
    }
  }, [id, onAction]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader className="w-6 h-6 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
        <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
      </div>
    );
  }

  // Main render
  return (
    <div
      className={`
        bg-white dark:bg-gray-800 
        border border-gray-200 dark:border-gray-700 
        rounded-xl shadow-sm
        p-4
        ${className}
      `}
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {title}
      </h3>

      <button
        onClick={handleAction}
        className="
          mt-4 w-full
          flex items-center justify-center gap-2
          px-4 py-2
          bg-blue-600 hover:bg-blue-700 
          text-white font-medium
          rounded-lg
          transition-colors
          disabled:opacity-50 disabled:cursor-not-allowed
        "
      >
        <CheckCircle className="w-4 h-4" />
        Confirm
      </button>
    </div>
  );
}
```

---

## Responsive Design

### Breakpoints (Tailwind Default)

| Breakpoint | Min Width | Target Devices              |
| ---------- | --------- | --------------------------- |
| (default)  | 0px       | Mobile phones               |
| `sm`       | 640px     | Large phones, small tablets |
| `md`       | 768px     | Tablets                     |
| `lg`       | 1024px    | Small laptops               |
| `xl`       | 1280px    | Desktops                    |
| `2xl`      | 1536px    | Large desktops              |

### Mobile-First Approach

```tsx
// CORRECT: Mobile-first (start small, add larger)
<div className="
  p-4 md:p-6 lg:p-8
  text-sm md:text-base lg:text-lg
  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4
">

// INCORRECT: Desktop-first
<div className="
  p-8 sm:p-4
  text-lg sm:text-sm
">
```

### Responsive Patterns

```tsx
// Container
<div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

// Grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">

// Flex direction
<div className="flex flex-col md:flex-row gap-4">

// Hide/Show
<div className="hidden md:block">Desktop only</div>
<div className="block md:hidden">Mobile only</div>

// Text size
<h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold">

// Spacing
<div className="p-4 sm:p-6 md:p-8 lg:p-10">

// Width
<div className="w-full sm:w-auto sm:min-w-[200px] md:min-w-[300px]">
```

### Touch Targets

```tsx
// Minimum 44x44px for touch targets
<button className="min-h-[44px] min-w-[44px] p-3">
  <Icon className="w-5 h-5" />
</button>

// For icon-only buttons
<button className="p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
  <Settings className="w-5 h-5" />
</button>
```

---

## Icon System

### IMPORTANT: No Emojis

All icons must come from Lucide React. Never use emojis in the codebase.

### Icon Import Pattern

```tsx
// Import only the icons you need
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Settings,
  User,
  Bell,
  Search,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Download,
  Upload,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Shield,
  Clock,
  Calendar,
  Filter,
  SortAsc,
  SortDesc,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Star,
  Heart,
  Share2,
  Send,
  QrCode,
  Scan,
  CreditCard,
  Banknote,
  Building2,
  Globe,
  Smartphone,
  Laptop,
  Moon,
  Sun,
  Loader,
} from "lucide-react";
```

### Icon Sizing Standards

| Context          | Size Class                 | Pixel Size |
| ---------------- | -------------------------- | ---------- |
| Inline text      | `w-4 h-4`                  | 16px       |
| Buttons (small)  | `w-4 h-4`                  | 16px       |
| Buttons (medium) | `w-5 h-5`                  | 20px       |
| Buttons (large)  | `w-6 h-6`                  | 24px       |
| Headers          | `w-6 h-6`                  | 24px       |
| Feature icons    | `w-8 h-8`                  | 32px       |
| Empty states     | `w-12 h-12` to `w-16 h-16` | 48-64px    |

### Icon Color Patterns

```tsx
// Status colors
<CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />  // Success
<XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />          // Error
<AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />  // Warning
<Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />           // Info

// Trend colors
<TrendingUp className="w-4 h-4 text-green-600" />    // Positive
<TrendingDown className="w-4 h-4 text-red-600" />    // Negative

// Neutral/Interactive
<Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
<ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />

// Loading
<Loader className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
```

### Emoji to Icon Mapping

| Emoji     | Lucide Icon                    | Usage               |
| --------- | ------------------------------ | ------------------- |
| Fire, Hot | `Flame`                        | Hot deals, trending |
| Money     | `Banknote`, `DollarSign`       | Payments, prices    |
| Rocket    | `Zap`, `TrendingUp`            | Fast, growth        |
| Lock      | `Lock`, `Shield`               | Security            |
| Check     | `CheckCircle`, `Check`         | Success, complete   |
| Warning   | `AlertTriangle`, `AlertCircle` | Warnings            |
| Error     | `XCircle`, `X`                 | Errors, close       |
| Info      | `Info`, `HelpCircle`           | Information         |
| Star      | `Star`                         | Favorites, ratings  |
| Heart     | `Heart`                        | Likes               |
| Clock     | `Clock`                        | Time, pending       |
| Calendar  | `Calendar`                     | Dates, scheduling   |
| Chart     | `BarChart3`, `LineChart`       | Analytics           |
| Wallet    | `Wallet`                       | Wallet features     |
| Send      | `Send`, `ArrowUpRight`         | Transfers           |
| Receive   | `ArrowDownLeft`, `Download`    | Receiving           |
| Swap      | `ArrowLeftRight`, `RefreshCw`  | Exchange            |
| QR        | `QrCode`, `Scan`               | QR codes            |
| Settings  | `Settings`, `Cog`              | Configuration       |
| User      | `User`, `UserCircle`           | Profile             |
| Bell      | `Bell`, `BellRing`             | Notifications       |
| Search    | `Search`                       | Search              |
| Menu      | `Menu`, `MoreVertical`         | Menus               |
| Copy      | `Copy`, `Clipboard`            | Copy to clipboard   |
| Link      | `ExternalLink`, `Link`         | External links      |
| Eye       | `Eye`, `EyeOff`                | Show/hide           |
| Edit      | `Edit`, `Pencil`               | Edit                |
| Delete    | `Trash2`, `X`                  | Delete              |
| Add       | `Plus`, `PlusCircle`           | Add new             |
| Remove    | `Minus`, `MinusCircle`         | Remove              |

---

## Color System

### Brand Colors (Tailwind)

| Color     | Light Mode  | Dark Mode   | Usage              |
| --------- | ----------- | ----------- | ------------------ |
| Primary   | `blue-600`  | `blue-500`  | CTAs, links, focus |
| Secondary | `gray-600`  | `gray-400`  | Secondary text     |
| Success   | `green-600` | `green-400` | Success states     |
| Warning   | `amber-600` | `amber-400` | Warnings           |
| Error     | `red-600`   | `red-400`   | Errors             |
| Info      | `blue-500`  | `blue-400`  | Information        |

### Background Colors

```tsx
// Page background
<div className="bg-gray-50 dark:bg-gray-900">

// Card background
<div className="bg-white dark:bg-gray-800">

// Elevated card
<div className="bg-white dark:bg-gray-800 shadow-lg">

// Input background
<input className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600" />

// Hover states
<button className="hover:bg-gray-100 dark:hover:bg-gray-700">
```

### Text Colors

```tsx
// Primary text
<p className="text-gray-900 dark:text-white">

// Secondary text
<p className="text-gray-600 dark:text-gray-400">

// Muted text
<p className="text-gray-500 dark:text-gray-500">

// Link text
<a className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
```

### Border Colors

```tsx
// Default border
<div className="border border-gray-200 dark:border-gray-700">

// Focus border
<input className="focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">

// Divider
<hr className="border-gray-200 dark:border-gray-700" />
```

---

## Typography

### Font Family

```tsx
// System font stack (configured in Tailwind)
font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
             "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

### Text Sizes

| Class       | Size | Line Height | Usage                  |
| ----------- | ---- | ----------- | ---------------------- |
| `text-xs`   | 12px | 16px        | Captions, badges       |
| `text-sm`   | 14px | 20px        | Secondary text, inputs |
| `text-base` | 16px | 24px        | Body text              |
| `text-lg`   | 18px | 28px        | Subheadings            |
| `text-xl`   | 20px | 28px        | Card titles            |
| `text-2xl`  | 24px | 32px        | Section titles         |
| `text-3xl`  | 30px | 36px        | Page titles            |
| `text-4xl`  | 36px | 40px        | Hero titles            |

### Responsive Typography

```tsx
// Page title
<h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">

// Section title
<h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">

// Card title
<h3 className="text-lg font-semibold text-gray-900 dark:text-white">

// Body text
<p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">

// Caption
<span className="text-xs text-gray-500 dark:text-gray-500">
```

---

## Spacing and Layout

### Spacing Scale

| Class          | Size | Usage            |
| -------------- | ---- | ---------------- |
| `p-1`, `m-1`   | 4px  | Tight spacing    |
| `p-2`, `m-2`   | 8px  | Compact elements |
| `p-3`, `m-3`   | 12px | Small padding    |
| `p-4`, `m-4`   | 16px | Default padding  |
| `p-5`, `m-5`   | 20px | Medium padding   |
| `p-6`, `m-6`   | 24px | Large padding    |
| `p-8`, `m-8`   | 32px | Section spacing  |
| `p-10`, `m-10` | 40px | Page padding     |

### Common Layout Patterns

```tsx
// Page container
<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
    {/* Content */}
  </div>
</div>

// Card
<div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">

// Card grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">

// Form layout
<form className="space-y-4 sm:space-y-6">

// List
<ul className="space-y-2 sm:space-y-3">

// Flex with gap
<div className="flex items-center gap-2 sm:gap-3">
```

---

## Dark Mode

### Implementation Rules

1. Every component MUST support both light and dark modes
2. Use `dark:` prefix for dark mode variants
3. Test all components in both modes before committing

### Pattern Examples

```tsx
// Background
<div className="bg-white dark:bg-gray-800">
<div className="bg-gray-50 dark:bg-gray-900">
<div className="bg-gray-100 dark:bg-gray-700">

// Text
<p className="text-gray-900 dark:text-white">
<p className="text-gray-600 dark:text-gray-400">
<p className="text-gray-500 dark:text-gray-500">

// Borders
<div className="border-gray-200 dark:border-gray-700">
<div className="border-gray-300 dark:border-gray-600">

// Status backgrounds
<div className="bg-green-50 dark:bg-green-900/20">
<div className="bg-red-50 dark:bg-red-900/20">
<div className="bg-amber-50 dark:bg-amber-900/20">
<div className="bg-blue-50 dark:bg-blue-900/20">

// Status text
<span className="text-green-700 dark:text-green-300">
<span className="text-red-700 dark:text-red-300">
<span className="text-amber-700 dark:text-amber-300">
<span className="text-blue-700 dark:text-blue-300">

// Interactive
<button className="
  bg-blue-600 hover:bg-blue-700
  dark:bg-blue-600 dark:hover:bg-blue-500
  text-white
">

// Hover states
<div className="hover:bg-gray-100 dark:hover:bg-gray-700">
```

---

## PWA Requirements

### Service Worker

The application must work offline for critical features.

```typescript
// vite.config.ts
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "WolkNow",
        short_name: "WolkNow",
        description: "Cryptocurrency Wallet & Trading",
        theme_color: "#2563eb",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});
```

### Safe Area Handling (iOS)

```tsx
// For iOS notch and home indicator
<div className="pb-safe pt-safe">{/* Content */}</div>;

// In tailwind.config.js
module.exports = {
  theme: {
    extend: {
      padding: {
        safe: "env(safe-area-inset-bottom)",
      },
    },
  },
};
```

### Touch Handling

```tsx
// Prevent double-tap zoom on buttons
<button className="touch-manipulation">

// Prevent pull-to-refresh in specific areas
<div className="overscroll-none">
```

### Viewport Meta

```html
<!-- In index.html -->
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
/>
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta
  name="apple-mobile-web-app-status-bar-style"
  content="black-translucent"
/>
```

---

## Performance Guidelines

### Image Optimization

```tsx
// Use lazy loading for images
<img
  src={imageUrl}
  alt="Description"
  loading="lazy"
  className="w-full h-auto"
/>

// Use srcset for responsive images
<img
  src={image}
  srcSet={`${image} 1x, ${image2x} 2x`}
  alt="Description"
/>
```

### Code Splitting

```tsx
// Lazy load pages
const PortfolioPage = lazy(() => import('@/pages/portfolio/PortfolioPage'))

// Use Suspense with fallback
<Suspense fallback={<PageLoader />}>
  <PortfolioPage />
</Suspense>
```

### Memoization

```tsx
// Memoize expensive components
const ExpensiveList = memo(function ExpensiveList({ items }: Props) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
});

// Memoize callbacks
const handleClick = useCallback(() => {
  // handler logic
}, [dependency]);

// Memoize computed values
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.name.localeCompare(b.name));
}, [items]);
```

### Bundle Size

1. Import only what you need from libraries
2. Use tree-shakeable imports
3. Analyze bundle with `npm run build -- --analyze`

```tsx
// GOOD: Named imports
import { format } from "date-fns";

// BAD: Default import of entire library
import dateFns from "date-fns";
```

---

## Accessibility

### ARIA Labels

```tsx
// Icon-only buttons must have aria-label
<button aria-label="Close dialog" className="p-2">
  <X className="w-5 h-5" />
</button>

// Form inputs must have labels
<label htmlFor="email" className="sr-only">Email</label>
<input id="email" type="email" />
```

### Keyboard Navigation

```tsx
// All interactive elements must be keyboard accessible
<button
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  tabIndex={0}
>

// Focus visible styles
<button className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
```

### Color Contrast

Minimum contrast ratios (WCAG AA):

- Normal text: 4.5:1
- Large text: 3:1
- UI components: 3:1

---

## Testing Standards

### Unit Tests

```typescript
// Component test example
import { render, screen, fireEvent } from "@testing-library/react";
import { WalletCard } from "./WalletCard";

describe("WalletCard", () => {
  it("renders balance correctly", () => {
    render(<WalletCard balance={100} symbol="BTC" />);
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("calls onAction when clicked", () => {
    const handleAction = jest.fn();
    render(<WalletCard balance={100} symbol="BTC" onAction={handleAction} />);
    fireEvent.click(screen.getByRole("button"));
    expect(handleAction).toHaveBeenCalled();
  });
});
```

### E2E Tests

```typescript
// Playwright test example
import { test, expect } from "@playwright/test";

test("user can view portfolio", async ({ page }) => {
  await page.goto("/portfolio");
  await expect(page.locator("h1")).toContainText("Portfolio");
});
```

---

## API Integration

### API Client Pattern

```typescript
// services/api.ts
import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for auth
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### React Query Usage

```typescript
// hooks/useWallet.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api";

export function useWalletBalance() {
  return useQuery({
    queryKey: ["wallet", "balance"],
    queryFn: () => apiClient.get("/wallet/balance").then((res) => res.data),
    staleTime: 30000,
    refetchInterval: 60000,
  });
}

export function useSendTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendTransactionData) =>
      apiClient.post("/wallet/send", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}
```

---

## Error Handling

### Error Boundary

```tsx
// components/ErrorBoundary.tsx
import { Component, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center p-8">
            <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Something went wrong
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Please try refreshing the page
            </p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

### Toast Notifications

```tsx
import toast from "react-hot-toast";

// Success
toast.success("Transaction completed");

// Error
toast.error("Failed to process transaction");

// Custom with icon
toast.custom((t) => (
  <div
    className={`
    ${t.visible ? "animate-enter" : "animate-leave"}
    max-w-md w-full bg-white dark:bg-gray-800 shadow-lg rounded-lg
    pointer-events-auto flex ring-1 ring-black ring-opacity-5
  `}
  >
    {/* Custom content */}
  </div>
));
```

---

## Security Guidelines

### Input Validation

```tsx
// Always validate and sanitize user input
const sanitizeInput = (input: string): string => {
  return input.trim().replace(/<[^>]*>/g, '')
}

// Use controlled inputs
const [value, setValue] = useState('')
<input
  value={value}
  onChange={(e) => setValue(sanitizeInput(e.target.value))}
/>
```

### Sensitive Data

```tsx
// Never log sensitive data
console.log("Processing transaction..."); // OK
console.log(`Private key: ${privateKey}`); // NEVER

// Use environment variables for secrets
const apiKey = import.meta.env.VITE_API_KEY;
```

### XSS Prevention

```tsx
// React escapes by default, but be careful with:

// DANGEROUS - avoid
<div dangerouslySetInnerHTML={{ __html: userContent }} />;

// If you must render HTML, sanitize first
import DOMPurify from "dompurify";
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />;
```

---

## File Structure

### Complete Project Structure

```plaintext
HOLDWallet/                         # Root Workspace
│
├── Frontend/                       # React/Vite Frontend Application
│   ├── public/
│   │   ├── icons/                 # Crypto icons (SVG)
│   │   ├── images/                # Static images
│   │   └── locales/               # i18n translation files
│   │
│   ├── src/
│   │   ├── components/            # Shared/Reusable Components
│   │   │   ├── layout/            # Layout components
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   └── MobileNav.tsx
│   │   │   │
│   │   │   ├── ui/                # Base UI primitives
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Input.tsx
│   │   │   │   ├── Card.tsx
│   │   │   │   ├── Modal.tsx
│   │   │   │   └── Spinner.tsx
│   │   │   │
│   │   │   └── shared/            # Shared business components
│   │   │       ├── CryptoIcon.tsx
│   │   │       ├── PriceDisplay.tsx
│   │   │       └── EmptyState.tsx
│   │   │
│   │   ├── pages/                 # Page Components (Routes)
│   │   │   ├── dashboard/
│   │   │   │   ├── DashboardPage.tsx
│   │   │   │   └── components/    # Dashboard-specific components
│   │   │   │
│   │   │   ├── wallet/
│   │   │   │   ├── WalletPage.tsx
│   │   │   │   └── components/
│   │   │   │
│   │   │   ├── portfolio/
│   │   │   │   ├── PortfolioPage.tsx
│   │   │   │   └── components/
│   │   │   │
│   │   │   ├── p2p/               # P2P Marketplace
│   │   │   │   ├── P2PPage.tsx
│   │   │   │   └── components/
│   │   │   │
│   │   │   ├── instant-trade/     # OTC Trading
│   │   │   │   ├── InstantTradePage.tsx
│   │   │   │   └── components/
│   │   │   │
│   │   │   └── settings/
│   │   │       ├── SettingsPage.tsx
│   │   │       └── components/
│   │   │
│   │   ├── services/              # API & External Services
│   │   │   ├── api.ts             # Axios instance & interceptors
│   │   │   ├── wallet-service.ts
│   │   │   ├── price-service.ts
│   │   │   └── p2p-service.ts
│   │   │
│   │   ├── stores/                # Zustand State Stores
│   │   │   ├── useAuthStore.ts
│   │   │   ├── useWalletStore.ts
│   │   │   └── useThemeStore.ts
│   │   │
│   │   ├── hooks/                 # Custom React Hooks
│   │   │   ├── useWallet.ts
│   │   │   ├── usePrices.ts
│   │   │   └── useMediaQuery.ts
│   │   │
│   │   ├── utils/                 # Utility Functions
│   │   │   ├── format.ts          # Number/currency formatting
│   │   │   ├── validation.ts      # Input validation
│   │   │   └── constants.ts       # App constants
│   │   │
│   │   ├── types/                 # TypeScript Type Definitions
│   │   │   ├── wallet.ts
│   │   │   ├── trading.ts
│   │   │   └── api.ts
│   │   │
│   │   ├── config/                # App Configuration
│   │   │   └── networks.ts        # Blockchain network configs
│   │   │
│   │   ├── locales/               # i18n translations
│   │   │   ├── en/
│   │   │   └── pt/
│   │   │
│   │   ├── styles/                # Global Styles
│   │   │   └── globals.css
│   │   │
│   │   ├── App.tsx                # Main App component
│   │   ├── main.tsx               # Entry point
│   │   └── vite-env.d.ts
│   │
│   ├── .env.example               # Environment template
│   ├── .env.development           # Dev environment
│   ├── .env.production            # Prod environment
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── vercel.json                # Vercel deployment config
│
├── backend/                        # FastAPI Backend Application
│   ├── app/
│   │   ├── api/                   # API Version Routers
│   │   │   └── v1/
│   │   │       └── endpoints/
│   │   │
│   │   ├── routers/               # Route Handlers
│   │   │   ├── auth.py            # Authentication routes
│   │   │   ├── wallet.py          # Wallet routes
│   │   │   ├── prices.py          # Price routes
│   │   │   ├── p2p.py             # P2P routes
│   │   │   └── transactions.py    # Transaction routes
│   │   │
│   │   ├── services/              # Business Logic
│   │   │   ├── wallet_service.py
│   │   │   ├── price_service.py
│   │   │   ├── blockchain_service.py
│   │   │   └── p2p_service.py
│   │   │
│   │   ├── models/                # SQLAlchemy Models
│   │   │   ├── user.py
│   │   │   ├── wallet.py
│   │   │   ├── transaction.py
│   │   │   └── p2p_order.py
│   │   │
│   │   ├── schemas/               # Pydantic Schemas
│   │   │   ├── user.py
│   │   │   ├── wallet.py
│   │   │   └── transaction.py
│   │   │
│   │   ├── clients/               # External API Clients
│   │   │   ├── coingecko.py       # CoinGecko price client
│   │   │   ├── blockchain.py      # Web3 blockchain client
│   │   │   └── bb_pix.py          # Banco do Brasil PIX
│   │   │
│   │   ├── core/                  # Core Configuration
│   │   │   ├── config.py          # Settings
│   │   │   ├── security.py        # JWT/Auth
│   │   │   └── deps.py            # Dependencies
│   │   │
│   │   ├── db/                    # Database Setup
│   │   │   ├── base.py
│   │   │   ├── session.py
│   │   │   └── init_db.py
│   │   │
│   │   ├── middleware/            # Custom Middleware
│   │   │   └── cors.py
│   │   │
│   │   ├── utils/                 # Utility Functions
│   │   │   ├── crypto.py
│   │   │   └── helpers.py
│   │   │
│   │   └── main.py                # FastAPI App Entry Point
│   │
│   ├── alembic/                   # Database Migrations
│   │   ├── versions/              # Migration files
│   │   └── env.py
│   │
│   ├── tests/                     # Test Files
│   │   └── ...
│   │
│   ├── .env.example
│   ├── .env
│   ├── requirements.txt           # Python dependencies
│   ├── alembic.ini
│   └── Procfile                   # Heroku/Railway deployment
│
├── scripts/                        # Utility Scripts
│   └── ...
│
├── start-dev.sh                    # Development startup script
├── deploy-backend.sh               # Backend deployment script
│
└── *.md                            # Documentation files
    ├── WOLKNOW_DEVELOPMENT_STANDARDS.md   # This file
    ├── WOLKNOW_AI_PORTFOLIO_INTELLIGENCE.md
    └── README.md
```

---

## Git Workflow

### Branch Naming

| Type     | Pattern                | Example                   |
| -------- | ---------------------- | ------------------------- |
| Feature  | `feature/description`  | `feature/ai-predictions`  |
| Bugfix   | `fix/description`      | `fix/qrcode-safari`       |
| Hotfix   | `hotfix/description`   | `hotfix/auth-crash`       |
| Refactor | `refactor/description` | `refactor/wallet-service` |

### Commit Messages

```plaintext
type(scope): description

[optional body]

[optional footer]
```

Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting (no code change)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance

Examples:

```
feat(portfolio): add AI prediction cards
fix(trading): resolve QR code display on Safari iOS
docs(readme): update installation instructions
refactor(wallet): extract balance calculation to hook
```

### Pull Request Template

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-reviewed code
- [ ] No console.log statements
- [ ] No hardcoded values
- [ ] Dark mode supported
- [ ] Mobile responsive
- [ ] Accessibility checked
```

---

## Quick Reference Card

### Do's

1. Use Lucide React icons (never emojis)
2. Support dark mode on every component
3. Use mobile-first responsive design
4. Add loading and error states
5. Use TypeScript strictly
6. Follow file naming conventions
7. Write meaningful commit messages
8. Test on mobile devices

### Don'ts

1. Use emojis in code
2. Hardcode colors or sizes
3. Skip dark mode variants
4. Ignore accessibility
5. Use `any` type
6. Leave console.log in production
7. Use inline styles for theming
8. Skip error handling

---

Document maintained by WolkNow Development Team
For questions, contact the technical lead.
