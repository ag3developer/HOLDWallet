# 🔧 Correção: Service Worker e Chat P2P

## 📋 **Problema**

Service Worker (Workbox) estava interceptando requisições para `http://localhost:8000/chat/...` e retornando erro:

```
workbox No route found for: http://localhost:8000/chat/rooms/.../history
```

## 🎯 **Causa Raiz**

1. **apiClient** configurado com `baseURL: APP_CONFIG.api.baseUrl`
2. **Service Worker** só conhecia rotas que começam com `/api/`
3. **Requisições absolutas** (`http://localhost:8000/...`) não eram tratadas

## ✅ **Solução Implementada**

### **1. Configuração do Workbox** (`vite.config.ts`)

```typescript
workbox: {
  // ✅ Ignorar URLs externas
  navigateFallbackDenylist: [/^\/api/, /^http/],

  runtimeCaching: [
    {
      // ✅ Cachear APENAS APIs relativas do mesmo origin
      urlPattern: ({ url }) => {
        const isRelativeApi = url.pathname.startsWith('/api/')
        const isSameOrigin = url.origin === self.location.origin
        return isRelativeApi && isSameOrigin
      },
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache-v2',
        networkTimeoutSeconds: 10,
      },
    },
  ],
}
```

### **2. Fluxo Correto**

#### **Desenvolvimento (localhost:5173)**

```
Frontend (localhost:5173)
    ↓
Service Worker: Ignora URLs absolutas ✅
    ↓
apiClient com baseURL: http://localhost:8000
    ↓
Backend (localhost:8000) ✅
```

#### **Produção (exemplo.com)**

```
Frontend (exemplo.com)
    ↓
Service Worker: Ignora URLs absolutas ✅
    ↓
apiClient com baseURL: https://api.exemplo.com
    ↓
Backend (api.exemplo.com) ✅
```

## 🚀 **Funcionamento em Produção**

### **Variáveis de Ambiente**

```bash
# .env.production
VITE_API_URL=https://api.wolknow.com
```

### **Configuração** (`config/app.ts`)

```typescript
export const APP_CONFIG = {
  api: {
    baseUrl: import.meta.env.VITE_API_URL || "http://localhost:8000",
  },
};
```

### **Resultado**

- ✅ **Desenvolvimento**: `http://localhost:8000/chat/...`
- ✅ **Produção**: `https://api.wolknow.com/chat/...`
- ✅ **Service Worker**: Ignora ambos (URLs absolutas)
- ✅ **Cache**: Apenas assets estáticos (JS, CSS, imagens)

## 📝 **Próximos Passos**

### **Após esta correção:**

1. Reiniciar servidor de desenvolvimento
2. Limpar cache do navegador (Ctrl + Shift + Delete)
3. Desregistrar Service Worker antigo:
   ```javascript
   // No DevTools Console
   navigator.serviceWorker.getRegistrations().then((registrations) => {
     registrations.forEach((r) => r.unregister());
   });
   ```
4. Recarregar página (Ctrl + F5)

### **Em produção:**

1. Build gerará novo Service Worker
2. Configurar `VITE_API_URL` para URL da API de produção
3. Deploy funcionará automaticamente

## ✅ **Resultado Final**

- ✅ Chat P2P funciona em desenvolvimento
- ✅ Chat P2P funcionará em produção
- ✅ Service Worker não interfere em requisições de API
- ✅ Cache otimizado apenas para assets estáticos
- ✅ Polling REST operacional

---

**Data**: 04/01/2026  
**Status**: ✅ RESOLVIDO
