'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from 'next/navigation'
import { db } from '@/config/firebase'
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore'
import { Loader2 } from 'lucide-react'
import { format } from 'date-fns'

interface ActivityLog {
  id: string
  userId: string
  userEmail: string
  action: string
  details: string
  timestamp: Date | null
}

export default function ActivityLogsPage() {
  const { profile, loading: authLoading } = useAuth()
  const router = useRouter()
  
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!authLoading && profile?.role !== 'SUPER_ADMIN') {
      router.push('/dashboard')
    }
  }, [profile, authLoading, router])

  useEffect(() => {
    async function fetchLogs() {
      if (!profile || profile.role !== 'SUPER_ADMIN') return
      
      try {
        setLoading(true)
        const q = query(
          collection(db, 'activity_logs'),
          orderBy('timestamp', 'desc'),
          limit(500)
        )
        const snapshot = await getDocs(q)
        const fetchedLogs = snapshot.docs.map((doc: any) => {
          const data = doc.data()
          return {
            id: doc.id,
            userId: data.userId || '',
            userEmail: data.userEmail || '',
            action: data.action || '',
            details: data.details || '',
            timestamp: data.timestamp?.toDate() || null
          }
        })
        setLogs(fetchedLogs)
      } catch (error) {
        console.error('Failed to fetch logs:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchLogs()
  }, [profile])

  if (authLoading || (profile && profile.role !== 'SUPER_ADMIN')) {
    return (
      <DashboardLayout title="Activity Logs">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  const filteredLogs = logs.filter(log => 
    log.userEmail.toLowerCase().includes(search.toLowerCase()) ||
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.details.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <DashboardLayout title="Activity Logs">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Activity Logs</h2>
          <p className="text-muted-foreground">Monitor system access and user activities</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-4 md:p-6">
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <input
              type="text"
              placeholder="Search by email, action, or details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:max-w-sm px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <div className="text-sm text-gray-500">
              Showing top {logs.length} recent logs
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b">
                <tr>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">User Email</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                      Loading logs...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      No activity logs found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                        {log.timestamp ? format(log.timestamp, 'PPpp') : 'Unknown Date'}
                      </td>
                      <td className="px-4 py-3 font-medium">{log.userEmail}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          log.action === 'LOGIN' ? 'bg-emerald-100 text-emerald-800' :
                          log.action === 'LOGOUT' ? 'bg-amber-100 text-amber-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
