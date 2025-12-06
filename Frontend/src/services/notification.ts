import { type Notification as AppNotification, ApiResponse, PaginatedResponse } from '@/types'
import { apiClient } from './api'

interface NotificationFilters {
  type?: string
  isRead?: boolean
  startDate?: string
  endDate?: string
}

interface NotificationSettings {
  push: boolean
  email: boolean
  sms: boolean
  trading: boolean
  chat: boolean
  security: boolean
}

class NotificationService {
  // Get user notifications
  async getNotifications(page = 1, limit = 20, filters?: NotificationFilters): Promise<PaginatedResponse<AppNotification>> {
    const params = { page: page.toString(), limit: limit.toString(), ...filters }
    const response = await apiClient.get<PaginatedResponse<AppNotification>>('/notifications', { params })
    return response.data
  }

  // Get specific notification
  async getNotification(notificationId: string): Promise<AppNotification> {
    const response = await apiClient.get<ApiResponse<AppNotification>>(`/notifications/${notificationId}`)
    return response.data.data
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<void> {
    await apiClient.post(`/notifications/${notificationId}/read`)
  }

  // Mark all notifications as read
  async markAllAsRead(): Promise<void> {
    await apiClient.post('/notifications/read-all')
  }

  // Delete notification
  async deleteNotification(notificationId: string): Promise<void> {
    await apiClient.delete(`/notifications/${notificationId}`)
  }

  // Delete all notifications
  async deleteAll(): Promise<void> {
    await apiClient.delete('/notifications')
  }

  // Get unread count
  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<ApiResponse<{ count: number }>>('/notifications/unread-count')
    return response.data.data.count
  }

  // Get notification settings
  async getSettings(): Promise<NotificationSettings> {
    const response = await apiClient.get<ApiResponse<NotificationSettings>>('/notifications/settings')
    return response.data.data
  }

  // Update notification settings
  async updateSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    const response = await apiClient.put<ApiResponse<NotificationSettings>>('/notifications/settings', settings)
    return response.data.data
  }

  // Subscribe to push notifications
  async subscribeToPush(subscription: PushSubscription): Promise<void> {
    const keys = subscription.getKey ? {
      p256dh: subscription.getKey('p256dh'),
      auth: subscription.getKey('auth')
    } : { p256dh: null, auth: null }

    await apiClient.post('/notifications/push/subscribe', {
      endpoint: subscription.endpoint,
      keys
    })
  }

  // Unsubscribe from push notifications
  async unsubscribeFromPush(): Promise<void> {
    await apiClient.post('/notifications/push/unsubscribe')
  }

  // Test push notification
  async testPush(): Promise<void> {
    await apiClient.post('/notifications/push/test')
  }

  // Send notification (admin only)
  async sendNotification(notification: {
    userIds?: string[]
    type: string
    title: string
    message: string
    data?: Record<string, any>
  }): Promise<void> {
    await apiClient.post('/notifications/send', notification)
  }

  // Browser notification utilities
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications')
    }

    if (Notification.permission === 'granted') {
      return Notification.permission
    }

    const permission = await Notification.requestPermission()
    return permission
  }

  showBrowserNotification(title: string, options?: NotificationOptions): globalThis.Notification | null {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return null
    }

    return new Notification(title, {
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      ...options
    })
  }

  // Service Worker registration for push notifications
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push messaging is not supported')
      return null
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('Service Worker registered:', registration)
      return registration
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      return null
    }
  }

  async subscribeToPushNotifications(): Promise<PushSubscription | null> {
    const registration = await this.registerServiceWorker()
    if (!registration) {
      return null
    }

    try {
      // Check if already subscribed
      const existingSubscription = await registration.pushManager.getSubscription()
      if (existingSubscription) {
        return existingSubscription
      }

      // Get VAPID public key from server
      const response = await apiClient.get<ApiResponse<{ publicKey: string }>>('/notifications/push/vapid-key')
      const publicKey = response.data.data.publicKey

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(publicKey)
      })

      // Send subscription to server
      await this.subscribeToPush(subscription)
      
      return subscription
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error)
      return null
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }
}

export const notificationService = new NotificationService()
