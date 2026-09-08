'use client'

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc, arrayUnion, writeBatch, deleteDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { useAuth } from '@/context/AuthContext'
import { AppNotification, NotificationType, NotificationPriority, NotificationTargetType } from '@/types/models'
import { playNotificationSound, requestPushPermission, showBrowserNotification, sendNotification, SendNotificationParams } from '@/lib/notifications'

interface NotificationContextType {
  notifications: AppNotification[]
  unreadCount: number
  loading: boolean
  pushPermission: NotificationPermission | 'unsupported'
  enablePushNotifications: () => Promise<NotificationPermission>
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  sendLiveNotification: (params: SendNotificationParams) => Promise<string>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('default')
  
  // Track whether initial query snapshot has loaded to prevent sound chime on initial page load
  const isInitialLoadRef = useRef(true)
  const previousIdsRef = useRef<Set<string>>(new Set())

  // Check initial push permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPermission(Notification.permission)
    } else {
      setPushPermission('unsupported')
    }
  }, [])

  // Listen to Firestore notifications in real-time
  useEffect(() => {
    if (!user || !profile) {
      setNotifications([])
      setLoading(false)
      isInitialLoadRef.current = true
      previousIdsRef.current.clear()
      return
    }

    setLoading(true)
    const q = query(
      collection(db, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(100)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot: any) => {
        const userRole = profile.role
        const userUnit = profile.unitNumber?.trim().toLowerCase()
        const userUid = user.uid

        const matchedNotifications: AppNotification[] = []
        const currentBatchIds = new Set<string>()
        let hasNewNotificationForSound = false
        let newestNotifForPush: AppNotification | null = null

        snapshot.forEach((docSnap: any) => {
          const notif = { id: docSnap.id, ...docSnap.data() } as AppNotification
          currentBatchIds.add(notif.id)

          // Check targeting relevance for current user
          let isRelevant = false

          if (notif.targetType === 'all') {
            isRelevant = true
          } else if (notif.targetType === 'role') {
            if (notif.targetRoles && notif.targetRoles.length > 0) {
              isRelevant = notif.targetRoles.includes(userRole)
            } else {
              isRelevant = true
            }
          } else if (notif.targetType === 'unit') {
            if (userUnit && notif.targetUnit) {
              isRelevant = notif.targetUnit.trim().toLowerCase() === userUnit
            }
          } else if (notif.targetType === 'individual') {
            isRelevant = notif.targetUserId === userUid
          }

          if (isRelevant) {
            matchedNotifications.push(notif)

            // If not initial load and this is a brand-new notification not seen before
            if (!isInitialLoadRef.current && !previousIdsRef.current.has(notif.id)) {
              hasNewNotificationForSound = true
              if (!newestNotifForPush) {
                newestNotifForPush = notif
              }
            }
          }
        })

        // Trigger live audio chime & native push when a new notification arrives
        if (hasNewNotificationForSound) {
          playNotificationSound()
          if (newestNotifForPush) {
            const notif = newestNotifForPush as AppNotification
            showBrowserNotification(notif.title, {
              body: notif.body,
              link: notif.link || '/notifications',
              tag: notif.id,
            })
          }
        }

        previousIdsRef.current = currentBatchIds
        isInitialLoadRef.current = false
        setNotifications(matchedNotifications)
        setLoading(false)
      },
      (error: any) => {
        console.error('Error listening to notifications:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user, profile])

  // Calculate unread count
  const unreadCount = user
    ? notifications.filter((n) => !n.readBy?.includes(user.uid)).length
    : 0

  // Mark single notification as read
  const markAsRead = async (notificationId: string) => {
    if (!user) return
    try {
      const notifRef = doc(db, 'notifications', notificationId)
      await updateDoc(notifRef, {
        readBy: arrayUnion(user.uid),
      })
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  // Mark all relevant notifications as read
  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return
    try {
      const batch = writeBatch(db)
      const unreadNotifs = notifications.filter((n) => !n.readBy?.includes(user.uid))
      
      unreadNotifs.forEach((n) => {
        const notifRef = doc(db, 'notifications', n.id)
        batch.update(notifRef, {
          readBy: arrayUnion(user.uid),
        })
      })

      await batch.commit()
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  // Delete / dismiss notification
  const deleteNotification = async (notificationId: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', notificationId))
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  // Enable push notifications
  const enablePushNotifications = async (): Promise<NotificationPermission> => {
    const perm = await requestPushPermission(user?.uid)
    setPushPermission(perm)
    return perm
  }

  // Send live notification helper
  const sendLiveNotification = async (params: SendNotificationParams): Promise<string> => {
    return sendNotification(params)
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        pushPermission,
        enablePushNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        sendLiveNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
