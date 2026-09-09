import { db, auth } from '@/config/firebase'
import { collection, doc, setDoc, updateDoc, arrayUnion, addDoc, getDoc } from 'firebase/firestore'
import { AppNotification, NotificationType, NotificationPriority, NotificationTargetType } from '@/types/models'

/**
 * Plays a pleasant synthesizer audio chime using the browser's native Web Audio API.
 * Does not depend on external sound files or network requests.
 */
export function playNotificationSound() {
  if (typeof window === 'undefined') return

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextClass) return

    const ctx = new AudioContextClass()
    if (ctx.state === 'suspended') {
      ctx.resume()
    }

    const now = ctx.currentTime

    // Oscillator 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(587.33, now)
    gain1.gain.setValueAtTime(0.15, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.3)

    // Oscillator 2: A5 (880 Hz)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(880.0, now + 0.1)
    gain2.gain.setValueAtTime(0.2, now + 0.1)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.1)
    osc2.stop(now + 0.45)

    // Oscillator 3: D6 (1174.66 Hz)
    const osc3 = ctx.createOscillator()
    const gain3 = ctx.createGain()
    osc3.type = 'sine'
    osc3.frequency.setValueAtTime(1174.66, now + 0.2)
    gain3.gain.setValueAtTime(0.25, now + 0.2)
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.65)
    osc3.connect(gain3)
    gain3.connect(ctx.destination)
    osc3.start(now + 0.2)
    osc3.stop(now + 0.65)
  } catch (err) {
    console.debug('Notification sound playback ignored:', err)
  }
}

/**
 * Requests browser push notification permissions and registers the active client.
 */
export async function requestPushPermission(userId?: string): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied'
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission === 'granted' && userId) {
      // Save device subscription preference
      try {
        await setDoc(
          doc(db, 'users', userId),
          {
            preferences: {
              pushNotifications: true,
            },
            lastPushEnabledAt: new Date().toISOString(),
          },
          { merge: true }
        )
      } catch (e) {
        console.error('Failed to update user push preference:', e)
      }
    }
    return permission
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return 'denied'
  }
}

/**
 * Displays a native browser / mobile OS notification.
 */
export function showBrowserNotification(title: string, options?: { body?: string; icon?: string; link?: string; tag?: string }) {
  if (typeof window === 'undefined' || !('Notification' in window)) return

  if (Notification.permission === 'granted') {
    const notifOptions = {
      body: options?.body || '',
      icon: options?.icon || '/icon-192.png',
      badge: '/badge.png',
      tag: options?.tag || `sunrise-${Date.now()}`,
      data: { url: options?.link || '/notifications' },
      vibrate: [200, 100, 200],
      renotify: true,
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((registration) => {
          registration.showNotification(title, notifOptions)
        })
        .catch(() => {
          try {
            const notif = new Notification(title, notifOptions)
            notif.onclick = (event) => {
              event.preventDefault()
              window.focus()
              if (options?.link) window.location.href = options.link
              notif.close()
            }
          } catch (err) {
            console.error('Failed to trigger native notification:', err)
          }
        })
    } else {
      try {
        const notif = new Notification(title, notifOptions)
        notif.onclick = (event) => {
          event.preventDefault()
          window.focus()
          if (options?.link) window.location.href = options.link
          notif.close()
        }
      } catch (err) {
        console.error('Failed to trigger native notification:', err)
      }
    }
  }
}

export interface SendNotificationParams {
  title: string
  body: string
  type?: NotificationType
  priority?: NotificationPriority
  targetType: NotificationTargetType
  targetRoles?: string[]
  targetUserId?: string
  targetUnit?: string
  link?: string
  senderId?: string
  senderName?: string
  data?: Record<string, any>
}

/**
 * Creates and dispatches a live notification in Firestore.
 */
export async function sendNotification(params: SendNotificationParams): Promise<string> {
  const currentUser = auth.currentUser

  const notificationData: Omit<AppNotification, 'id'> = {
    title: params.title.trim(),
    body: params.body.trim(),
    type: params.type || 'announcement',
    priority: params.priority || 'normal',
    targetType: params.targetType,
    targetRoles: params.targetRoles || [],
    targetUserId: params.targetUserId || '',
    targetUnit: params.targetUnit || '',
    link: params.link || '/notifications',
    readBy: [],
    senderId: params.senderId || currentUser?.uid || 'SYSTEM',
    senderName: params.senderName || currentUser?.displayName || 'System Admin',
    createdAt: new Date().toISOString(),
    data: params.data || {},
  }

  const docRef = await addDoc(collection(db, 'notifications'), notificationData)
  return docRef.id
}
