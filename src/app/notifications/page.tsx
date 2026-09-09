'use client'

import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/context/AuthContext'
import { useNotifications } from '@/context/NotificationContext'
import { db } from '@/config/firebase'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import {
  Bell,
  Send,
  CheckCheck,
  Trash2,
  ExternalLink,
  Volume2,
  Sparkles,
  Megaphone,
  CreditCard,
  Wrench,
  UsersRound,
  ShieldAlert,
  MessageSquare,
  Search,
  Filter,
  Users,
  Home,
  User,
  AlertTriangle,
  Zap,
  Droplet,
  Loader2,
} from 'lucide-react'
import { AppNotification, NotificationType, NotificationPriority, NotificationTargetType, Unit } from '@/types/models'
import { playNotificationSound } from '@/lib/notifications'
import Link from 'next/link'

export default function NotificationsPage() {
  const { user, profile } = useAuth()
  const {
    notifications,
    unreadCount,
    loading,
    pushPermission,
    enablePushNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    sendLiveNotification,
  } = useNotifications()

  // Inbox state
  const [activeTab, setActiveTab] = useState<string>('all')
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('all_targets')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Dispatch Modal state
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // Form fields
  const [formTitle, setFormTitle] = useState('')
  const [formBody, setFormBody] = useState('')
  const [formType, setFormType] = useState<NotificationType>('announcement')
  const [formPriority, setFormPriority] = useState<NotificationPriority>('normal')
  const [formTargetType, setFormTargetType] = useState<NotificationTargetType>('all')
  const [formTargetRoleGroup, setFormTargetRoleGroup] = useState<string>('residents')
  const [formTargetUnit, setFormTargetUnit] = useState<string>('')
  const [formTargetUserId, setFormTargetUserId] = useState<string>('')
  const [formLink, setFormLink] = useState<string>('/notifications')

  // Dynamic dropdown data
  const [units, setUnits] = useState<Unit[]>([])
  const [allUsers, setAllUsers] = useState<any[]>([])

  const canBroadcast =
    profile?.role === 'SUPER_ADMIN' ||
    profile?.role === 'MANAGER' ||
    profile?.role === 'OFFICE_ASSISTANT' ||
    profile?.role === 'GUARD'

  useEffect(() => {
    const fetchData = async () => {
      try {
        const uSnap = await getDocs(collection(db, 'units'))
        const uList: Unit[] = []
        uSnap.forEach((d: any) => uList.push({ id: d.id, ...d.data() } as Unit))
        uList.sort((a, b) => a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true }))
        setUnits(uList)

        const userSnap = await getDocs(collection(db, 'users'))
        const usrList: any[] = []
        userSnap.forEach((d: any) => usrList.push({ id: d.id, ...d.data() }))
        usrList.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''))
        setAllUsers(usrList)
      } catch (err) {
        console.error('Error fetching units/users for notification composer:', err)
      }
    }

    if (canBroadcast) {
      fetchData()
    }
  }, [canBroadcast])

  // Template Quick-Apply
  const applyTemplate = (templateKey: string) => {
    switch (templateKey) {
      case 'power':
        setFormTitle('⚡ Scheduled Power / Generator Maintenance')
        setFormBody('Please be informed that city power will undergo scheduled maintenance from 2:00 PM to 4:00 PM today. Standby DG generator will be operational.')
        setFormType('maintenance')
        setFormPriority('high')
        setFormTargetType('all')
        setFormLink('/electricity')
        break
      case 'water':
        setFormTitle('💧 Water Supply Schedule Update')
        setFormBody('Overhead water tank cleaning is scheduled for tomorrow between 10:00 AM and 1:00 PM. Please store sufficient water in advance.')
        setFormType('announcement')
        setFormPriority('normal')
        setFormTargetType('all')
        setFormLink('/notifications')
        break
      case 'billing':
        setFormTitle('💰 Monthly Invoices & Billing Ready')
        setFormBody('Monthly invoices for rent, electricity, and society maintenance charges have been posted. Please review and process payments before the due date.')
        setFormType('billing')
        setFormPriority('high')
        setFormTargetType('role')
        setFormTargetRoleGroup('residents')
        setFormLink('/invoices')
        break
      case 'security':
        setFormTitle('🚨 Security Alert & Gate Protocols')
        setFormBody('Society gate security protocols are in effect. All visitors must be registered at the main gate checkpoint. Please cooperate with on-duty guards.')
        setFormType('security')
        setFormPriority('urgent')
        setFormTargetType('all')
        setFormLink('/visitors')
        break
      case 'lift':
        setFormTitle('🔧 Elevator Servicing in Progress')
        setFormBody('Block A elevator is currently undergoing scheduled preventive servicing. Expected completion time is within 45 minutes.')
        setFormType('maintenance')
        setFormPriority('normal')
        setFormTargetType('all')
        setFormLink('/maintenance')
        break
      case 'greetings':
        setFormTitle('👋 Greetings from Sunrise Management')
        setFormBody('Wishing all residents a wonderful day ahead! Please reach out to the management office for any assistance.')
        setFormType('announcement')
        setFormPriority('normal')
        setFormTargetType('all')
        setFormLink('/dashboard')
        break
      case 'publicNotice':
        setFormTitle('📢 Public Notice')
        setFormBody('Please be informed that a general community meeting will be held this coming Saturday at the clubhouse. All residents are requested to attend.')
        setFormType('announcement')
        setFormPriority('normal')
        setFormTargetType('all')
        setFormLink('/notifications')
        break
    }
  }

  // Handle Dispatch
  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim() || !formBody.trim()) {
      alert('Please enter both title and message.')
      return
    }

    setIsSending(true)
    try {
      let targetRoles: string[] = []

      if (formTargetType === 'role') {
        switch (formTargetRoleGroup) {
          case 'residents':
            targetRoles = ['RESIDENT', 'OWNER', 'TENANT']
            break
          case 'tenants':
            targetRoles = ['TENANT']
            break
          case 'owners':
            targetRoles = ['OWNER']
            break
          case 'staff':
            targetRoles = ['PLUMBER', 'ELECTRICIAN', 'CLEANER', 'GENERAL_STAFF']
            break
          case 'guards':
            targetRoles = ['GUARD']
            break
          case 'management':
            targetRoles = ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT', 'OFFICE_ASSISTANT']
            break
        }
      }

      await sendLiveNotification({
        title: formTitle,
        body: formBody,
        type: formType,
        priority: formPriority,
        targetType: formTargetType,
        targetRoles: formTargetType === 'role' ? targetRoles : undefined,
        targetUnit: formTargetType === 'unit' ? formTargetUnit : undefined,
        targetUserId: formTargetType === 'individual' ? formTargetUserId : undefined,
        link: formLink.trim() || '/notifications',
        senderId: user?.uid,
        senderName: profile?.fullName || 'Sunrise Admin',
      })

      playNotificationSound()
      alert('Live Push Notification & Broadcast dispatched successfully!')
      setIsComposerOpen(false)
      setFormTitle('')
      setFormBody('')
      setFormLink('/notifications')
    } catch (err: any) {
      console.error('Failed to dispatch notification:', err)
      alert('Failed to send notification: ' + err.message)
    } finally {
      setIsSending(false)
    }
  }

  // Filter notifications list
  const filteredNotifications = notifications.filter((notif) => {
    // Tab filter
    if (activeTab === 'unread') {
      if (notif.readBy?.includes(user?.uid || '')) return false
    } else if (activeTab !== 'all') {
      if (notif.type !== activeTab) return false
    }

    // Target Audience filter
    if (targetTypeFilter !== 'all_targets') {
      if (notif.targetType !== targetTypeFilter) return false
    }

    // Search query filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase()
      const matchTitle = notif.title.toLowerCase().includes(q)
      const matchBody = notif.body.toLowerCase().includes(q)
      const matchSender = notif.senderName?.toLowerCase().includes(q)
      const matchUnit = notif.targetUnit?.toLowerCase().includes(q)
      if (!matchTitle && !matchBody && !matchSender && !matchUnit) return false
    }

    return true
  })

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'billing':
        return <CreditCard className="h-5 w-5 text-emerald-600" />
      case 'maintenance':
        return <Wrench className="h-5 w-5 text-amber-600" />
      case 'visitor':
        return <UsersRound className="h-5 w-5 text-blue-600" />
      case 'security':
        return <ShieldAlert className="h-5 w-5 text-red-600" />
      case 'complaint':
        return <MessageSquare className="h-5 w-5 text-purple-600" />
      case 'announcement':
      default:
        return <Megaphone className="h-5 w-5 text-indigo-600" />
    }
  }

  const formatTimestamp = (dateString: string) => {
    if (!dateString) return 'Just now'
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(date)
    } catch {
      return dateString
    }
  }

  return (
    <DashboardLayout title="Notifications Center">
      <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-3xl font-bold tracking-tight">Notifications Center</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Real-time mobile & web push alerts, group messages, and society announcements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => playNotificationSound()}
              className="h-8 text-xs sm:h-9 sm:text-sm gap-1.5"
            >
              <Volume2 className="h-4 w-4 text-indigo-600" /> Test Sound
            </Button>

            {pushPermission === 'default' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => enablePushNotifications()}
                className="h-8 text-xs sm:h-9 sm:text-sm gap-1.5 border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100"
              >
                <Sparkles className="h-4 w-4" /> Enable Push
              </Button>
            )}

            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllAsRead()}
                className="h-8 text-xs sm:h-9 sm:text-sm gap-1.5"
              >
                <CheckCheck className="h-4 w-4 text-emerald-600" /> Mark All Read
              </Button>
            )}

            {canBroadcast && (
              <Button
                onClick={() => setIsComposerOpen(true)}
                className="h-8 text-xs sm:h-9 sm:text-sm gap-1.5 bg-[#95DBAE] text-[#1E293B] hover:bg-[#7BC98E] font-bold"
              >
                <Send className="h-4 w-4" /> New Broadcast Alert
              </Button>
            )}
          </div>
        </div>

        {/* Push Status Banner */}
        {pushPermission === 'granted' ? (
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-lg flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold">Live Push Notifications Active</span>
              <span className="text-emerald-700 hidden sm:inline">— You will receive instant notifications on this device.</span>
            </div>
          </div>
        ) : pushPermission === 'default' ? (
          <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-indigo-900">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-600 flex-shrink-0" />
              <span>Enable live mobile & desktop push alerts to stay notified of visitor arrivals, bills, and emergency notices.</span>
            </div>
            <Button
              size="sm"
              onClick={() => enablePushNotifications()}
              className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold w-fit"
            >
              Turn On Notifications
            </Button>
          </div>
        ) : null}

        {/* Main Inbox Card */}
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-3 border-b space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                <TabsList className="grid grid-cols-3 sm:grid-cols-7 h-auto p-1 text-xs gap-1 bg-muted/60">
                  <TabsTrigger value="all" className="text-xs py-1.5">
                    All ({notifications.length})
                  </TabsTrigger>
                  <TabsTrigger value="unread" className="text-xs py-1.5 font-semibold text-indigo-700">
                    Unread ({unreadCount})
                  </TabsTrigger>
                  <TabsTrigger value="announcement" className="text-xs py-1.5">
                    Notice
                  </TabsTrigger>
                  <TabsTrigger value="billing" className="text-xs py-1.5">
                    Billing
                  </TabsTrigger>
                  <TabsTrigger value="maintenance" className="text-xs py-1.5">
                    Repair
                  </TabsTrigger>
                  <TabsTrigger value="visitor" className="text-xs py-1.5">
                    Visitor
                  </TabsTrigger>
                  <TabsTrigger value="security" className="text-xs py-1.5">
                    Security
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                <Select value={targetTypeFilter} onValueChange={setTargetTypeFilter}>
                  <SelectTrigger className="h-8 text-xs sm:h-9 sm:text-xs w-full sm:w-44 bg-background">
                    <SelectValue placeholder="All Target Audiences" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="all_targets">🎯 All Audiences</SelectItem>
                    <SelectItem value="all">📢 All Society</SelectItem>
                    <SelectItem value="role">👥 Group Role</SelectItem>
                    <SelectItem value="unit">🏢 Specific Unit</SelectItem>
                    <SelectItem value="individual">👤 Individual</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative w-full sm:w-56">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search notifications..."
                    className="pl-9 h-8 text-xs sm:h-9 sm:text-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Bell className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">No notifications found</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                  {searchQuery ? `No alerts match "${searchQuery}".` : 'You have caught up with all live updates.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredNotifications.map((notif) => {
                  const isUnread = !notif.readBy?.includes(user?.uid || '')

                  return (
                    <div
                      key={notif.id}
                      className={`p-3.5 sm:p-5 transition-colors flex items-start gap-3 sm:gap-4 ${
                        isUnread
                          ? 'bg-indigo-50/40 dark:bg-indigo-950/20'
                          : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Icon */}
                      <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 border shadow-xs">
                        {getTypeIcon(notif.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-xs sm:text-base text-gray-900 dark:text-gray-100">
                              {notif.title}
                            </h4>
                            {notif.priority === 'urgent' && (
                              <Badge variant="destructive" className="text-[9px] px-1.5 py-0 animate-pulse font-bold">
                                URGENT
                              </Badge>
                            )}
                            {notif.priority === 'high' && (
                              <Badge className="text-[9px] px-1.5 py-0 font-semibold bg-amber-500 text-white">
                                HIGH
                              </Badge>
                            )}
                            {isUnread && (
                              <span className="h-2 w-2 rounded-full bg-indigo-600" title="Unread" />
                            )}
                          </div>
                          <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                            {formatTimestamp(notif.createdAt)}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {notif.body}
                        </p>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[11px] text-muted-foreground">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-600 dark:text-gray-400">
                              From: {notif.senderName || 'System Admin'}
                            </span>
                            <span>•</span>
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-medium uppercase text-slate-700 dark:text-slate-300">
                              {notif.targetType === 'all'
                                ? '📢 All Society'
                                : notif.targetType === 'unit'
                                ? `🏢 Unit ${notif.targetUnit}`
                                : notif.targetType === 'role'
                                ? `👥 Group: ${notif.targetRoles?.join(', ')}`
                                : notif.targetType === 'individual'
                                ? (notif.targetUserId === user?.uid ? '👤 Direct to You' : '👤 Individual User')
                                : '📢 Announcement'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {isUnread && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => markAsRead(notif.id)}
                                className="h-7 text-[11px] px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                              >
                                <CheckCheck className="h-3.5 w-3.5 mr-1" /> Mark Read
                              </Button>
                            )}

                            {notif.link && (
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="h-7 text-[11px] px-2.5 font-semibold text-primary"
                                onClick={() => markAsRead(notif.id)}
                              >
                                <Link href={notif.link}>
                                  Action Link <ExternalLink className="h-3 w-3 ml-1" />
                                </Link>
                              </Button>
                            )}

                            {canBroadcast && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteNotification(notif.id)}
                                className="h-7 text-[11px] px-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ADMIN BROADCAST COMPOSER DIALOG */}
        <Dialog open={isComposerOpen} onOpenChange={setIsComposerOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <Send className="h-5 w-5 text-indigo-600" />
                Compose Live Broadcast & Push Alert
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Dispatch real-time mobile push notifications, in-app alerts, and chimes to society residents and staff.
              </DialogDescription>
            </DialogHeader>

            {/* Quick Templates */}
            <div className="space-y-1.5 pt-2">
              <Label className="text-xs text-muted-foreground font-semibold">⚡ Quick Notice Templates:</Label>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate('power')}
                  className="h-7 text-[10px] sm:text-xs px-2"
                >
                  ⚡ Power / DG
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate('water')}
                  className="h-7 text-[10px] sm:text-xs px-2"
                >
                  💧 Water Schedule
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate('billing')}
                  className="h-7 text-[10px] sm:text-xs px-2"
                >
                  💰 Monthly Bills
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate('security')}
                  className="h-7 text-[10px] sm:text-xs px-2"
                >
                  🚨 Security Alert
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate('lift')}
                  className="h-7 text-[10px] sm:text-xs px-2"
                >
                  🔧 Lift Maintenance
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate('greetings')}
                  className="h-7 text-[10px] sm:text-xs px-2"
                >
                  👋 Greetings
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate('publicNotice')}
                  className="h-7 text-[10px] sm:text-xs px-2"
                >
                  📢 Public Notice
                </Button>
              </div>
            </div>

            <form onSubmit={handleDispatch} className="space-y-4 pt-2">
              {/* Target Audience Section */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border rounded-lg space-y-3">
                <Label className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  Select Target Audience (Live Reach)
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Button
                    type="button"
                    variant={formTargetType === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormTargetType('all')}
                    className={`h-9 text-xs font-bold ${
                      formTargetType === 'all' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : ''
                    }`}
                  >
                    📢 All Society
                  </Button>
                  <Button
                    type="button"
                    variant={formTargetType === 'role' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormTargetType('role')}
                    className={`h-9 text-xs font-bold ${
                      formTargetType === 'role' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : ''
                    }`}
                  >
                    👥 Group Role
                  </Button>
                  <Button
                    type="button"
                    variant={formTargetType === 'unit' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormTargetType('unit')}
                    className={`h-9 text-xs font-bold ${
                      formTargetType === 'unit' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : ''
                    }`}
                  >
                    🏢 Specific Unit
                  </Button>
                  <Button
                    type="button"
                    variant={formTargetType === 'individual' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormTargetType('individual')}
                    className={`h-9 text-xs font-bold ${
                      formTargetType === 'individual' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : ''
                    }`}
                  >
                    👤 Individual
                  </Button>
                </div>

                {/* Sub-selector for Group Role */}
                {formTargetType === 'role' && (
                  <div className="space-y-1.5 pt-2 border-t">
                    <Label className="text-xs font-semibold">Choose Role Group</Label>
                    <Select value={formTargetRoleGroup} onValueChange={setFormTargetRoleGroup}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="residents">🏡 All Residents & Owners (Residents, Owners, Tenants)</SelectItem>
                        <SelectItem value="tenants">🔑 Tenants Only</SelectItem>
                        <SelectItem value="owners">🏷️ Apartment Owners Only</SelectItem>
                        <SelectItem value="staff">🛠️ Maintenance Staff (Plumbers, Electricians, Cleaners)</SelectItem>
                        <SelectItem value="guards">👮 Security Guards (Main Gate)</SelectItem>
                        <SelectItem value="management">💼 Management & Office (Admins, Managers, Accountants)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Sub-selector for Unit */}
                {formTargetType === 'unit' && (
                  <div className="space-y-1.5 pt-2 border-t">
                    <Label className="text-xs font-semibold">Choose Apartment Unit</Label>
                    <Select value={formTargetUnit} onValueChange={setFormTargetUnit}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select an apartment unit" />
                      </SelectTrigger>
                      <SelectContent className="text-xs max-h-52">
                        {units.map((u) => (
                          <SelectItem key={u.id} value={u.unitNumber}>
                            Unit {u.unitNumber} {u.tenantName ? `(${u.tenantName})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Sub-selector for Individual User */}
                {formTargetType === 'individual' && (
                  <div className="space-y-1.5 pt-2 border-t">
                    <Label className="text-xs font-semibold">Choose Resident / Staff Member</Label>
                    <Select value={formTargetUserId} onValueChange={setFormTargetUserId}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent className="text-xs max-h-52">
                        {allUsers.map((u) => (
                          <SelectItem key={u.uid || u.id} value={u.uid || u.id}>
                            {u.fullName || 'User'} ({u.email || u.role}) {u.unitNumber ? `- Unit ${u.unitNumber}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Title and Message */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Notification Category</Label>
                    <Select value={formType} onValueChange={(v: NotificationType) => setFormType(v)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="announcement">📢 Announcement / Notice</SelectItem>
                        <SelectItem value="billing">💰 Billing & Invoices</SelectItem>
                        <SelectItem value="maintenance">🔧 Repair & Maintenance</SelectItem>
                        <SelectItem value="visitor">👤 Visitor & Gate Alert</SelectItem>
                        <SelectItem value="security">🚨 Security & Safety</SelectItem>
                        <SelectItem value="complaint">📝 Complaint Resolution</SelectItem>
                        <SelectItem value="system">⚙️ System Update</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Priority Level</Label>
                    <Select value={formPriority} onValueChange={(v: NotificationPriority) => setFormPriority(v)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="text-xs">
                        <SelectItem value="normal">Normal Priority</SelectItem>
                        <SelectItem value="high">High Priority</SelectItem>
                        <SelectItem value="urgent">Urgent / Emergency Alert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Alert Title *</Label>
                  <Input
                    required
                    placeholder="e.g. ⚡ Scheduled Generator Maintenance"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="h-9 text-xs sm:text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Message Body *</Label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Enter detailed notification content..."
                    value={formBody}
                    onChange={(e) => setFormBody(e.target.value)}
                    className="w-full p-2.5 border rounded-md text-xs sm:text-sm bg-background focus:outline-hidden focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Deep Action Link (Optional)</Label>
                  <Input
                    placeholder="e.g. /invoices, /maintenance, /visitors"
                    value={formLink}
                    onChange={(e) => setFormLink(e.target.value)}
                    className="h-9 text-xs sm:text-sm"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsComposerOpen(false)}
                  disabled={isSending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSending}
                  className="bg-[#95DBAE] text-[#1E293B] hover:bg-[#7BC98E] font-bold"
                >
                  {isSending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Send className="h-4 w-4 mr-1.5" /> Dispatch Live Push Notification
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
