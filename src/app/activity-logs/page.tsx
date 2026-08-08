'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { db } from '@/config/firebase'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { Loader2, Activity, User, Clock, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Badge } from '@/components/ui/badge'

interface ActivityLog {
  id: string
  userId: string
  userEmail: string
  userRole: string
  userName: string
  action: string
  details: string
  timestamp: any
}

export default function ActivityLogsPage() {
  const { profile } = useAuth()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Only SUPER_ADMIN can view logs (enforced by component rendering as well, but good for security)
    if (profile?.role !== 'SUPER_ADMIN') {
      setLoading(false)
      return
    }

    const q = query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc'), limit(100))
    
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const logsData: ActivityLog[] = []
      snapshot.forEach((doc: any) => {
        logsData.push({ id: doc.id, ...doc.data() } as ActivityLog)
      })
      setLogs(logsData)
      setLoading(false)
    }, (error: any) => {
      console.error("Error fetching logs:", error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [profile])

  if (profile && profile.role !== 'SUPER_ADMIN') {
    return (
      <DashboardLayout title="Access Denied">
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
          <ShieldAlert className="h-16 w-16 text-red-500" />
          <h2 className="text-2xl font-bold">Unauthorized Access</h2>
          <p className="text-muted-foreground">Only Super Administrators can view the activity logs.</p>
        </div>
      </DashboardLayout>
    )
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'LOGIN': return 'bg-blue-100 text-blue-800'
      case 'LOGOUT': return 'bg-slate-100 text-slate-800'
      case 'CREATE_USER':
      case 'CREATE_INVOICE':
      case 'CREATE_LEASE':
        return 'bg-green-100 text-green-800'
      case 'UPDATE_USER':
      case 'UPDATE_INVOICE':
      case 'UPDATE_LEASE':
        return 'bg-amber-100 text-amber-800'
      case 'APPROVE_USER':
        return 'bg-emerald-100 text-emerald-800'
      case 'RECEIVE_PAYMENT':
        return 'bg-indigo-100 text-indigo-800'
      case 'DELETE_RECORD':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Just now'
    
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate()
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000)
    } else {
      date = new Date(timestamp)
    }

    if (isNaN(date.getTime())) return 'Unknown Date'
    
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date)
  }

  return (
    <DashboardLayout title="System Activity Logs">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Activity Logs</h2>
          <p className="text-muted-foreground">Monitor system-wide user actions and authentications in real-time.</p>
        </div>

        <Card>
          <CardHeader className="bg-slate-50 border-b">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-600" />
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Showing the last 100 system events</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center items-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center p-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p>No activity logs recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 bg-gray-50 uppercase border-b">
                    <tr>
                      <th className="px-6 py-3 font-semibold">User</th>
                      <th className="px-6 py-3 font-semibold">Role</th>
                      <th className="px-6 py-3 font-semibold">Action</th>
                      <th className="px-6 py-3 font-semibold">Details</th>
                      <th className="px-6 py-3 font-semibold">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                              {log.userName ? log.userName.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{log.userName}</div>
                              <div className="text-xs text-gray-500">{log.userEmail}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-medium text-gray-600 border px-2 py-1 rounded bg-white">
                            {log.userRole.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className={`${getActionColor(log.action)} border-none shadow-sm`}>
                            {log.action.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-gray-600 max-w-xs truncate" title={log.details}>
                          {log.details}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-xs flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {formatDate(log.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
