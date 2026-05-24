'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { db } from '@/config/firebase'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { Visitor } from '@/types/models'
import { Loader2 } from 'lucide-react'

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'visitors'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const vData: Visitor[] = []
      snapshot.forEach((doc: any) => {
        vData.push(doc.data() as Visitor)
      })
      setVisitors(vData)
      setLoading(false)
    }, (error: any) => {
      console.error('Error fetching visitors:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const currentlyInside = visitors.filter(v => v.status === 'entered').length
  const pendingApproval = visitors.filter(v => v.status === 'waiting').length

  return (
    <DashboardLayout title="Visitor Management">
      <div className="space-y-6">
        <div><h2 className="text-3xl font-bold">Visitors</h2><p className="text-muted-foreground">Track visitor entries and exits</p></div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Today</p><p className="text-2xl font-bold">{visitors.length}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Currently Inside</p><p className="text-2xl font-bold">{currentlyInside}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">This Week</p><p className="text-2xl font-bold">{visitors.length}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Pending Approval</p><p className="text-2xl font-bold">{pendingApproval}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Recent Visitors</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : visitors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No visitors found. Please seed the database.</div>
            ) : (
              <div className="overflow-x-auto overflow-y-hidden"><table className="w-full min-w-[800px]">
                <thead><tr className="border-b"><th className="pb-3 text-left">Name</th><th className="pb-3 text-left">Unit ID</th><th className="pb-3 text-left">Phone</th><th className="pb-3 text-left">Purpose</th><th className="pb-3 text-left">Entry Time</th><th className="pb-3 text-left">Status</th></tr></thead>
                <tbody>
                  {visitors.map((v) => (
                    <tr key={v.id} className="border-b">
                      <td className="py-3 font-medium">{v.name}</td>
                      <td className="py-3">{v.unitId}</td>
                      <td className="py-3">{v.phone}</td>
                      <td className="py-3">{v.purpose}</td>
                      <td className="py-3">{v.entryTime}</td>
                      <td className="py-3"><Badge variant={v.status === 'entered' ? 'success' : v.status === 'waiting' ? 'warning' : 'secondary'}>{v.status.toUpperCase()}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}