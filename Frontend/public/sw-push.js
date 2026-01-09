/**
 * WOLK NOW - Push Notification Service Worker
 * =============================================
 *
 * Este arquivo adiciona suporte a Push Notifications ao Service Worker.
 * É importado pelo SW principal gerado pelo Workbox.
 */

// Listener para eventos de Push
self.addEventListener('push', event => {
  console.log('[SW Push] Push recebido:', event)

  if (!event.data) {
    console.warn('[SW Push] Push sem dados')
    return
  }

  let data
  try {
    data = event.data.json()
  } catch (e) {
    console.error('[SW Push] Erro ao parsear dados:', e)
    data = {
      title: 'WOLK NOW',
      body: event.data.text(),
    }
  }

  const title = data.title || 'WOLK NOW'
  const options = {
    body: data.body || '',
    icon: data.icon || '/images/logos/wn-icon.png',
    badge: data.badge || '/images/logos/wn-icon.png',
    tag: data.tag || 'default',
    data: data.data || {},
    vibrate: data.vibrate || [100, 50, 100],
    requireInteraction: data.priority === 'high',
    timestamp: data.timestamp || Date.now(),
    // Ações (botões na notificação)
    actions: data.actions || [],
    // Configurações adicionais
    silent: data.silent || false,
    renotify: data.renotify || false,
  }

  console.log('[SW Push] Mostrando notificação:', title, options)

  event.waitUntil(self.registration.showNotification(title, options))
})

// Listener para clique na notificação
self.addEventListener('notificationclick', event => {
  console.log('[SW Push] Notificação clicada:', event)

  event.notification.close()

  const data = event.notification.data || {}
  const url = data.link || data.url || '/'
  const action = event.action

  // Se clicou em uma ação específica
  if (action) {
    console.log('[SW Push] Ação clicada:', action)
    // Pode adicionar lógica específica por ação aqui
  }

  // Abrir ou focar na janela do app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Verificar se já existe uma janela aberta
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Focar na janela existente e navegar
          return client.focus().then(() => {
            if (url !== '/') {
              client.navigate(url)
            }
          })
        }
      }
      // Se não existe, abrir nova janela
      return clients.openWindow(url)
    })
  )
})

// Listener para fechar notificação
self.addEventListener('notificationclose', event => {
  console.log('[SW Push] Notificação fechada:', event)
  // Pode adicionar analytics aqui se quiser
})

// Listener para subscription change (renovação)
self.addEventListener('pushsubscriptionchange', event => {
  console.log('[SW Push] Subscription mudou:', event)

  // Re-inscrever automaticamente
  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: event.oldSubscription?.options?.applicationServerKey,
      })
      .then(subscription => {
        // Enviar nova subscription para o backend
        return fetch('/api/v1/notifications/subscribe/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')))),
            auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')))),
            old_endpoint: event.oldSubscription?.endpoint,
          }),
        })
      })
  )
})

console.log('[SW Push] Service Worker de Push carregado')
