'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/context/NotificationContext'
import { useAuth } from '@/context/AuthContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Bell,
  CheckCheck,
  Megaphone,
  CreditCard,
  Wrench,
  UsersRound,
  ShieldAlert,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Volume2,
} from 'lucide-react'
import { AppNotification } from '@/types/models'
import { playNotificationSound } from '@/lib/notifications'

export function NotificationBell() {
  const router = useRouter()
  const { user } = useAuth()
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    pushPermission,
    enablePushNotifications,
  } = useNotifications()

  const recentNotifications = notifications.slice(0, 6)

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'billing':
        return <CreditCard className="h-4 w-4 text-emerald-600" />
      case 'maintenance':
        return <Wrench className="h-4 w-4 text-amber-600" />
      case 'visitor':
        return <UsersRound className="h-4 w-4 text-blue-600" />
      case 'security':
        return <ShieldAlert className="h-4 w-4 text-red-600" />
      case 'complaint':
        return <MessageSquare className="h-4 w-4 text-purple-600" />
      case 'announcement':
      default:
        return <Megaphone className="h-4 w-4 text-indigo-600" />
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-100 text-red-700 animate-pulse">
            URGENT
          </span>
        )
      case 'high':
        return (
          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-100 text-amber-700">
            HIGH
          </span>
        )
      default:
        return null
    }
  }

  const formatTimestamp = (dateString: string) => {
    if (!dateString) return 'Recently'
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays === 1) return 'Yesterday'
      if (diffDays < 7) return `${diffDays}d ago`
      return date.toLocaleDateString()
    } catch {
      return 'Recently'
    }
  }

  const handleNotificationClick = async (notif: AppNotification) => {
    await markAsRead(notif.id)
    if (notif.link) {
      router.push(notif.link)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full hover:bg-muted"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-foreground" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] rounded-full flex items-center justify-center animate-in zoom-in-50 duration-200">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[320px] sm:w-[380px] p-0 shadow-2xl rounded-xl border z-50">
        {/* Header */}
        <div className="p-3 sm:p-4 bg-slate-50/80 dark:bg-slate-900/80 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm sm:text-base">Live Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5 font-bold bg-primary/20 text-primary">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => playNotificationSound()}
              title="Test Notification Chime"
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <Volume2 className="h-3.5 w-3.5" />
            </button>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-primary/10"
              >
                <CheckCheck className="h-3 w-3" /> Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Push Notification Enable Banner if not granted */}
        {pushPermission === 'default' && (
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-medium">
              <Sparkles className="h-4 w-4 text-indigo-600 flex-shrink-0" />
              <span>Enable mobile & desktop push alerts</span>
            </div>
            <Button
              size="sm"
              variant="default"
              onClick={() => enablePushNotifications()}
              className="h-6 text-[10px] px-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              Enable
            </Button>
          </div>
        )}

        {/* Notifications List */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
          {recentNotifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p className="text-xs sm:text-sm font-medium">No notifications yet</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Live updates and announcements will appear here.</p>
            </div>
          ) : (
            recentNotifications.map((notif) => {
              const isUnread = !notif.readBy?.includes(user?.uid || '') // check read status
              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3 sm:p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                    isUnread
                      ? 'bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5 border shadow-2xs">
                    {getTypeIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                        {notif.title}
                      </p>
                      {getPriorityBadge(notif.priority)}
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {notif.body}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-gray-400 font-medium">
                        {formatTimestamp(notif.createdAt)}
                      </span>
                      {notif.link && (
                        <span className="text-[10px] text-primary flex items-center gap-0.5 hover:underline font-semibold">
                          View details <ExternalLink className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-2 bg-slate-50 dark:bg-slate-900 border-t text-center">
          <Link
            href="/notifications"
            className="text-xs text-primary hover:underline font-bold block py-1"
          >
            Open Notification Center &rarr;
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
