'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { db } from '@/config/firebase'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { MaintenanceTicket } from '@/types/models'
import { Loader2 } from 'lucide-react'

const priorityColors: Record<string, string> = { critical: 'bg-red-100 text-red-800', high: 'bg-orange-100 text-orange-800', medium: 'bg-yellow-100 text-yellow-800', low: 'bg-gray-100 text-gray-800' }
const statusColors: Record<string, string> = { open: 'bg-blue-100 text-blue-800', in_progress: 'bg-purple-100 text-purple-800', resolved: 'bg-green-100 text-green-800', closed: 'bg-gray-100 text-gray-800' }

export default function MaintenancePage() {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'maintenance'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const tData: MaintenanceTicket[] = []
      snapshot.forEach((doc: any) => {
        tData.push(doc.data() as MaintenanceTicket)
      })
      setTickets(tData)
      setLoading(false)
    }, (error: any) => {
      console.error('Error fetching maintenance tickets:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const openCount = tickets.filter(t => t.status === 'open').length
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length
  const completedCount = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length

  return (
    <DashboardLayout title="Maintenance">
      <div className="space-y-6">
        <div><h2 className="text-3xl font-bold">Maintenance</h2><p className="text-muted-foreground">Manage maintenance tickets and requests</p></div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Open</p><p className="text-2xl font-bold">{openCount}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">In Progress</p><p className="text-2xl font-bold">{inProgressCount}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Completed</p><p className="text-2xl font-bold">{completedCount}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Total Tickets</p><p className="text-2xl font-bold">{tickets.length}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>All Tickets</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No maintenance tickets found.</div>
            ) : (
              <table className="w-full">
                <thead><tr className="border-b"><th className="pb-3 text-left">ID</th><th className="pb-3 text-left">Unit ID</th><th className="pb-3 text-left">Issue</th><th className="pb-3 text-left">Priority</th><th className="pb-3 text-left">Status</th><th className="pb-3 text-left">Assigned</th></tr></thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id} className="border-b">
                      <td className="py-3 font-medium">{t.id.substring(0,8)}...</td>
                      <td className="py-3">{t.unitId}</td>
                      <td className="py-3">{t.title}</td>
                      <td className="py-3"><Badge variant="outline" className={priorityColors[t.priority] || ''}>{t.priority.toUpperCase()}</Badge></td>
                      <td className="py-3"><Badge variant="outline" className={statusColors[t.status] || ''}>{t.status.toUpperCase().replace('_', ' ')}</Badge></td>
                      <td className="py-3">{t.assignedTo || 'Unassigned'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}