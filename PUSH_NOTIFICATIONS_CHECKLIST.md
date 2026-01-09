# Push Notifications - Checklist de Eventos

## Visão Geral

Este documento lista todos os eventos relevantes para enviar Push Notifications aos usuários do WOLK NOW.
As notificações devem ser enviadas mesmo com o app fechado, direto no celular do usuário.

---

## 🔴 PRIORIDADE ALTA (Críticos - Sempre notificar)

### 💰 Transações & Pagamentos

| Evento                  | Descrição                          | Exemplo de Mensagem                        |
| ----------------------- | ---------------------------------- | ------------------------------------------ |
| `transaction_received`  | Recebeu crypto na carteira         | "Você recebeu 0.5 ETH"                     |
| `transaction_confirmed` | Transação confirmada na blockchain | "Sua transação de 100 USDT foi confirmada" |
| `pix_received`          | Recebeu PIX                        | "PIX de R$ 500,00 recebido"                |
| `large_withdrawal`      | Saque grande detectado             | "Saque de R$ 10.000 realizado"             |

### 🔒 Segurança

| Evento                  | Descrição                    | Exemplo de Mensagem                             |
| ----------------------- | ---------------------------- | ----------------------------------------------- |
| `new_login`             | Login em novo dispositivo    | "Novo login detectado - iPhone, São Paulo"      |
| `suspicious_activity`   | Atividade suspeita           | "Detectamos uma atividade incomum na sua conta" |
| `password_changed`      | Senha alterada               | "Sua senha foi alterada com sucesso"            |
| `2fa_disabled`          | 2FA desativado               | "Autenticação de dois fatores foi desativada"   |
| `failed_login_attempts` | Tentativas de login falhadas | "3 tentativas de login falhadas na sua conta"   |

### 🔄 P2P Trading

| Evento             | Descrição                       | Exemplo de Mensagem                              |
| ------------------ | ------------------------------- | ------------------------------------------------ |
| `order_matched`    | Alguém aceitou sua ordem        | "João aceitou sua ordem de venda de 500 USDT"    |
| `payment_received` | Contraparte confirmou pagamento | "Pagamento de R$ 2.500 confirmado pelo vendedor" |
| `escrow_released`  | Crypto liberado do escrow       | "0.1 BTC foi liberado para sua carteira"         |
| `trade_dispute`    | Disputa aberta no trade         | "Uma disputa foi aberta no trade #12345"         |
| `trade_cancelled`  | Trade cancelado                 | "O trade #12345 foi cancelado"                   |
| `payment_timeout`  | Tempo de pagamento expirando    | "Faltam 5 minutos para confirmar o pagamento"    |

---

## 🟡 PRIORIDADE MÉDIA (Importantes)

### 💬 Chat & Comunicação

| Evento            | Descrição                          | Exemplo de Mensagem                   |
| ----------------- | ---------------------------------- | ------------------------------------- |
| `new_message`     | Nova mensagem no chat P2P          | "João: Já fiz o PIX, pode verificar?" |
| `unread_messages` | Mensagens não lidas (após X tempo) | "Você tem 3 mensagens não lidas"      |

### 📊 Mercado & Preços

| Evento                     | Descrição                    | Exemplo de Mensagem                |
| -------------------------- | ---------------------------- | ---------------------------------- |
| `price_alert`              | Alerta de preço atingido     | "BTC atingiu R$ 500.000!"          |
| `significant_price_change` | Variação significativa (>5%) | "ETH subiu 8.5% nas últimas 24h"   |
| `price_target_reached`     | Meta de preço do usuário     | "USDT atingiu sua meta de R$ 5,20" |

### 📋 Ordens P2P

| Evento                   | Descrição                     | Exemplo de Mensagem                        |
| ------------------------ | ----------------------------- | ------------------------------------------ |
| `order_expired`          | Ordem expirou                 | "Sua ordem de compra de BTC expirou"       |
| `order_partially_filled` | Ordem parcialmente preenchida | "50% da sua ordem foi executada"           |
| `new_offer_on_order`     | Nova proposta na sua ordem    | "Você recebeu uma proposta para sua ordem" |

---

## 🟢 PRIORIDADE BAIXA (Opcionais - Usuário escolhe)

### 📈 Portfolio & Insights

| Evento                | Descrição                   | Exemplo de Mensagem                        |
| --------------------- | --------------------------- | ------------------------------------------ |
| `weekly_summary`      | Resumo semanal              | "Seu portfolio cresceu 12% esta semana"    |
| `monthly_report`      | Relatório mensal disponível | "Seu relatório de Janeiro está disponível" |
| `portfolio_milestone` | Marco de portfolio          | "Parabéns! Seu portfolio atingiu R$ 100k"  |

### 🎯 Promoções & Sistema

| Evento                  | Descrição             | Exemplo de Mensagem                           |
| ----------------------- | --------------------- | --------------------------------------------- |
| `fee_promotion`         | Promoção de taxas     | "Taxa zero para trades P2P até domingo!"      |
| `new_feature`           | Nova funcionalidade   | "Novidade: Agora você pode negociar SOL"      |
| `maintenance_scheduled` | Manutenção programada | "Manutenção em 2h - 04:00 às 06:00"           |
| `kyc_reminder`          | Lembrete de KYC       | "Complete seu KYC para aumentar seus limites" |
| `kyc_approved`          | KYC aprovado          | "Seu KYC foi aprovado! Limites aumentados."   |
| `kyc_rejected`          | KYC rejeitado         | "KYC rejeitado. Verifique os documentos."     |

---

## ⚙️ Configurações do Usuário

O usuário deve poder controlar quais notificações receber:

### Categorias de Preferência

```
[ ] Transações e Pagamentos
    [x] Recebimentos
    [x] Confirmações
    [x] Saques grandes

[ ] Segurança
    [x] Novos logins (recomendado: sempre ativo)
    [x] Alterações de senha
    [x] Atividade suspeita

[ ] P2P Trading
    [x] Ordem aceita
    [x] Pagamento confirmado
    [x] Escrow liberado
    [x] Disputas
    [ ] Timeout de pagamento

[ ] Chat
    [x] Novas mensagens
    [ ] Resumo de não lidas

[ ] Mercado
    [ ] Alertas de preço
    [ ] Variações significativas
    [ ] Metas de preço

[ ] Relatórios
    [ ] Resumo semanal
    [ ] Relatório mensal

[ ] Sistema
    [ ] Promoções
    [ ] Novas funcionalidades
    [x] Manutenção programada
    [x] Status do KYC
```

### Horário de Silêncio (Do Not Disturb)

- Permitir configurar horário sem notificações
- Exceção: Segurança sempre notifica

---

## 📱 Requisitos Técnicos

### Frontend (PWA)

1. **Service Worker** - Já implementado ✅
2. **Push API** - Registrar subscription ✅ (`/public/sw-push.js`)
3. **Notification API** - Exibir notificações ✅ (`/src/hooks/usePushNotifications.ts`)
4. **IndexedDB** - Cache de notificações offline ✅
5. **UI de Permissão** - Prompt elegante ✅ (`/src/components/PushNotificationPrompt.tsx`)

### Backend

1. **Web Push Protocol** - Enviar notificações ✅ (`/backend/app/services/push_notification_service.py`)
2. **VAPID Keys** - Autenticação de push ✅ (config + script gerador)
3. **Tabela de Subscriptions** - Armazenar endpoints ✅ (`/backend/app/models/push_subscription.py`)
4. **API Endpoints** - Gerenciar subscriptions ✅ (`/backend/app/routers/notifications.py`)
5. **Preferências do Usuário** - Respeitar configurações ✅

### Banco de Dados

```sql
-- Tabela de subscriptions
CREATE TABLE push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    device_info JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    last_used_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Tabela de preferências
CREATE TABLE notification_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    transactions BOOLEAN DEFAULT TRUE,
    security BOOLEAN DEFAULT TRUE,
    p2p_trading BOOLEAN DEFAULT TRUE,
    chat BOOLEAN DEFAULT TRUE,
    market BOOLEAN DEFAULT FALSE,
    reports BOOLEAN DEFAULT FALSE,
    system BOOLEAN DEFAULT TRUE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 📋 Próximos Passos

1. [x] Revisar e aprovar lista de eventos
2. [x] Definir prioridades finais
3. [x] Implementar frontend (hook + service worker)
4. [x] Implementar backend (endpoints + service)
5. [x] Criar tela de preferências no frontend
6. [ ] Gerar chaves VAPID (script: `backend/scripts/generate_vapid_keys.py`)
7. [ ] Adicionar chaves ao `.env` de produção
8. [ ] Executar migration do banco (`alembic upgrade head`)
9. [ ] Instalar pywebpush (`pip install pywebpush`)
10. [ ] Integrar envio de push nos eventos reais (P2P, Security, Chat)
11. [ ] Testar em iOS e Android
12. [ ] Deploy gradual

---

## ✅ Arquivos Implementados

### Frontend

- `Frontend/src/hooks/usePushNotifications.ts` - Hook React para gerenciar subscriptions
- `Frontend/src/components/PushNotificationPrompt.tsx` - UI de prompt elegante
- `Frontend/src/pages/NotificationSettingsPage.tsx` - Página de configurações
- `Frontend/public/sw-push.js` - Service Worker para push events
- `Frontend/vite.config.ts` - Configurado para importar sw-push.js

### Backend

- `backend/app/routers/notifications.py` - API endpoints
- `backend/app/services/push_notification_service.py` - Serviço de envio
- `backend/app/models/push_subscription.py` - Modelos SQLAlchemy
- `backend/app/core/config.py` - Variáveis VAPID adicionadas
- `backend/scripts/generate_vapid_keys.py` - Script gerador de chaves
- `backend/alembic/versions/20260601_create_push_notification_tables.py` - Migration
- `backend/requirements.txt` - pywebpush adicionado

---

## �️ ROADMAP TÉCNICO

### Fase 1: Infraestrutura Base (1-2 dias)

#### 1.1 Backend - Configuração VAPID

```python
# Gerar chaves VAPID (executar uma vez)
from py_vapid import Vapid

vapid = Vapid()
vapid.generate_keys()
print(vapid.public_key)  # Chave pública (frontend)
print(vapid.private_key) # Chave privada (backend)
```

**Arquivos a criar:**

- `backend/app/core/push_config.py` - Configuração VAPID
- `backend/app/models/push_subscription.py` - Model SQLAlchemy
- `backend/app/models/notification_preferences.py` - Preferências

#### 1.2 Migrations do Banco

```bash
# Criar migrations
alembic revision --autogenerate -m "add_push_notifications_tables"
alembic upgrade head
```

**Tabelas:**

- `push_subscriptions` - Endpoints dos dispositivos
- `notification_preferences` - Preferências do usuário
- `notification_queue` - Fila de envio (opcional, se usar Celery)

---

### Fase 2: Backend - API Endpoints (2-3 dias)

#### 2.1 Endpoints a Implementar

```
POST   /api/v1/notifications/subscribe      # Registrar subscription
DELETE /api/v1/notifications/unsubscribe    # Remover subscription
GET    /api/v1/notifications/preferences    # Buscar preferências
PUT    /api/v1/notifications/preferences    # Atualizar preferências
POST   /api/v1/notifications/test           # Enviar notificação de teste
GET    /api/v1/notifications/vapid-key      # Retornar chave pública VAPID
```

#### 2.2 Serviço de Push

```python
# backend/app/services/push_notification_service.py

from pywebpush import webpush, WebPushException
import json

class PushNotificationService:
    def __init__(self):
        self.vapid_private_key = settings.VAPID_PRIVATE_KEY
        self.vapid_claims = {
            "sub": f"mailto:{settings.VAPID_EMAIL}"
        }

    async def send_push(
        self,
        user_id: int,
        title: str,
        body: str,
        data: dict = None,
        category: str = "system"
    ):
        # 1. Verificar preferências do usuário
        prefs = await self.get_user_preferences(user_id)
        if not self.should_send(prefs, category):
            return False

        # 2. Verificar quiet hours
        if self.is_quiet_hours(prefs) and category != "security":
            return False

        # 3. Buscar todas as subscriptions ativas do usuário
        subscriptions = await self.get_active_subscriptions(user_id)

        # 4. Enviar para cada dispositivo
        payload = json.dumps({
            "title": title,
            "body": body,
            "icon": "/icons/icon-192x192.png",
            "badge": "/icons/badge-72x72.png",
            "data": data or {},
            "tag": category,
            "timestamp": int(time.time() * 1000)
        })

        for sub in subscriptions:
            try:
                webpush(
                    subscription_info={
                        "endpoint": sub.endpoint,
                        "keys": {
                            "p256dh": sub.p256dh,
                            "auth": sub.auth
                        }
                    },
                    data=payload,
                    vapid_private_key=self.vapid_private_key,
                    vapid_claims=self.vapid_claims
                )
            except WebPushException as e:
                if e.response.status_code == 410:
                    # Subscription expirou, remover
                    await self.remove_subscription(sub.id)

        return True
```

#### 2.3 Integração com Eventos Existentes

**Locais para adicionar chamadas de push:**

| Arquivo                           | Evento               | Push                   |
| --------------------------------- | -------------------- | ---------------------- |
| `services/transaction_service.py` | Transação recebida   | `transaction_received` |
| `services/p2p_service.py`         | Trade aceito         | `order_matched`        |
| `services/p2p_service.py`         | Pagamento confirmado | `payment_received`     |
| `services/p2p_service.py`         | Escrow liberado      | `escrow_released`      |
| `services/auth_service.py`        | Novo login           | `new_login`            |
| `services/chat_service.py`        | Nova mensagem        | `new_message`          |

---

### Fase 3: Frontend - Service Worker (1-2 dias)

#### 3.1 Atualizar Service Worker

```typescript
// public/sw-push.js (ou adicionar ao SW existente)

self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body,
    icon: data.icon || "/icons/icon-192x192.png",
    badge: data.badge || "/icons/badge-72x72.png",
    tag: data.tag || "default",
    data: data.data,
    vibrate: [100, 50, 100],
    actions: data.actions || [],
    requireInteraction: data.priority === "high",
    timestamp: data.timestamp,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data;
  const url = data?.link || "/";

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // Se já tem uma janela aberta, foca nela
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Senão, abre uma nova
      return clients.openWindow(url);
    })
  );
});
```

#### 3.2 Hook usePushNotifications

```typescript
// src/hooks/usePushNotifications.ts

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/services/api";

interface PushState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
}

export const usePushNotifications = () => {
  const [state, setState] = useState<PushState>({
    isSupported: false,
    permission: "default",
    isSubscribed: false,
    isLoading: true,
    error: null,
  });

  // Verificar suporte
  useEffect(() => {
    const isSupported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    setState((prev) => ({
      ...prev,
      isSupported,
      permission: isSupported ? Notification.permission : "denied",
      isLoading: false,
    }));

    if (isSupported) {
      checkSubscription();
    }
  }, []);

  // Verificar se já está inscrito
  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setState((prev) => ({ ...prev, isSubscribed: !!subscription }));
    } catch (error) {
      console.error("Erro ao verificar subscription:", error);
    }
  };

  // Solicitar permissão e inscrever
  const subscribe = useCallback(async () => {
    if (!state.isSupported) return false;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // 1. Pedir permissão
      const permission = await Notification.requestPermission();
      setState((prev) => ({ ...prev, permission }));

      if (permission !== "granted") {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Permissão negada",
        }));
        return false;
      }

      // 2. Buscar chave VAPID do backend
      const {
        data: { vapid_key },
      } = await apiClient.get("/notifications/vapid-key");

      // 3. Registrar subscription
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid_key),
      });

      // 4. Enviar para o backend
      await apiClient.post("/notifications/subscribe", {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey("p256dh")),
          auth: arrayBufferToBase64(subscription.getKey("auth")),
        },
        device_info: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
        },
      });

      setState((prev) => ({
        ...prev,
        isSubscribed: true,
        isLoading: false,
      }));
      return true;
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message,
      }));
      return false;
    }
  }, [state.isSupported]);

  // Cancelar inscrição
  const unsubscribe = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await apiClient.delete("/notifications/unsubscribe", {
          data: { endpoint: subscription.endpoint },
        });
      }

      setState((prev) => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }));
      return true;
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message,
      }));
      return false;
    }
  }, []);

  return {
    ...state,
    subscribe,
    unsubscribe,
    checkSubscription,
  };
};

// Helpers
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}
```

---

### Fase 4: Frontend - UI Components (1 dia)

#### 4.1 Componente de Opt-in

```typescript
// src/components/PushNotificationPrompt.tsx

import { Bell, BellOff, X } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export const PushNotificationPrompt = () => {
  const { isSupported, permission, isSubscribed, isLoading, subscribe } =
    usePushNotifications();

  // Não mostrar se não suportado ou já inscrito
  if (!isSupported || isSubscribed || permission === "denied") {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 
                    bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border 
                    border-gray-200 dark:border-gray-700 p-4 z-50
                    animate-in slide-in-from-bottom duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
          <Bell className="w-6 h-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Ativar Notificações
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Receba alertas de transações, trades P2P e segurança em tempo real.
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={subscribe}
              disabled={isLoading}
              className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 
                         text-white text-sm font-medium rounded-lg
                         disabled:opacity-50 transition-colors"
            >
              {isLoading ? "Ativando..." : "Ativar"}
            </button>
            <button
              className="py-2 px-4 text-gray-500 hover:text-gray-700
                         dark:text-gray-400 dark:hover:text-gray-200
                         text-sm font-medium transition-colors"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

#### 4.2 Tela de Preferências

```typescript
// src/pages/settings/NotificationPreferencesPage.tsx

// Adicionar na página de configurações existente
// Toggle para cada categoria de notificação
// Configuração de quiet hours
```

---

### Fase 5: Testes & QA (1-2 dias)

#### 5.1 Checklist de Testes

**Android (Chrome):**

- [ ] Solicitar permissão funciona
- [ ] Receber push com app aberto
- [ ] Receber push com app em background
- [ ] Receber push com app fechado
- [ ] Clicar na notificação abre o app
- [ ] Clicar na notificação navega para tela correta

**iOS (Safari - PWA instalado):**

- [ ] Prompt de instalação do PWA aparece
- [ ] Após instalar, permissão funciona
- [ ] Receber push com PWA aberto
- [ ] Receber push com PWA em background
- [ ] Badge no ícone do app
- [ ] Som da notificação

**Desktop (Chrome/Edge):**

- [ ] Permissão funciona
- [ ] Notificações aparecem no sistema
- [ ] Clique navega corretamente

#### 5.2 Testes de Integração

```bash
# Testar envio de push manualmente
curl -X POST http://localhost:8000/api/v1/notifications/test \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Teste", "body": "Notificação de teste"}'
```

---

### Fase 6: Deploy & Monitoramento (1 dia)

#### 6.1 Variáveis de Ambiente

```bash
# Backend (.env)
VAPID_PUBLIC_KEY=BEl62...
VAPID_PRIVATE_KEY=xxx...
VAPID_EMAIL=contato@wolknow.com

# Frontend (.env)
VITE_VAPID_PUBLIC_KEY=BEl62...
```

#### 6.2 Monitoramento

- **Métricas a acompanhar:**

  - Taxa de opt-in (% de usuários que ativam)
  - Taxa de entrega (pushes enviados vs entregues)
  - Taxa de clique (CTR das notificações)
  - Subscriptions ativas vs expiradas

- **Alertas:**
  - Muitas subscriptions expirando (410 errors)
  - Taxa de entrega < 90%
  - Fila de notificações crescendo

---

## 📊 Estimativa de Tempo Total

| Fase      | Descrição                 | Tempo Estimado |
| --------- | ------------------------- | -------------- |
| 1         | Infraestrutura Base       | 1-2 dias       |
| 2         | Backend - API             | 2-3 dias       |
| 3         | Frontend - Service Worker | 1-2 dias       |
| 4         | Frontend - UI             | 1 dia          |
| 5         | Testes & QA               | 1-2 dias       |
| 6         | Deploy & Monitoramento    | 1 dia          |
| **Total** |                           | **7-11 dias**  |

---

## �📝 Notas

- **iOS**: Requer instalação do PWA na home screen (iOS 16.4+)
- **Android**: Funciona direto no Chrome
- **Rate Limiting**: Máximo 10 pushes/hora por usuário
- **Payload**: Máximo 4KB por notificação
- **TTL**: Notificações expiram em 24h se não entregues

---

## 🔗 Referências

- [Web Push Protocol](https://web.dev/push-notifications-overview/)
- [VAPID Keys](https://blog.mozilla.org/services/2016/08/23/sending-vapid-identified-webpush-notifications-via-mozillas-push-service/)
- [Service Worker Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [iOS PWA Push Support](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)

---

_Documento criado em: Janeiro 2026_
_Última atualização: 08/01/2026_
