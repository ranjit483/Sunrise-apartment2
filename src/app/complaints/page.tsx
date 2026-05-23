'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { db } from '@/config/firebase'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { Complaint } from '@/types/models'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function ComplaintsPage() {
  const { profile } = useAuth()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return;
    
    const q = query(collection(db, 'complaints'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const cData: Complaint[] = []
      snapshot.forEach((doc: any) => {
        const data = doc.data() as Complaint;
        // Filter for GUARD role
        if (profile.role === 'GUARD') {
          const allowedCategories = ['Parking', 'Security', 'Emergency']
          if (data.category && allowedCategories.includes(data.category)) {
            cData.push({ id: doc.id, ...data })
          }
        } else {
          cData.push({ id: doc.id, ...data })
        }
      })
      setComplaints(cData)
      setLoading(false)
    }, (error) => {
      console.error('Error fetching complaints:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [profile])

  const openCount = complaints.filter(c => c.status === 'open').length
  const inProgressCount = complaints.filter(c => c.status === 'in_progress').length
  const resolvedCount = complaints.filter(c => c.status === 'resolved').length

  return (
    <DashboardLayout title="Complaints">
      <div className="space-y-6">
        <div><h2 className="text-3xl font-bold">Complaints</h2><p className="text-muted-foreground">Track and resolve resident complaints</p></div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Open</p><p className="text-2xl font-bold">{openCount}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">In Progress</p><p className="text-2xl font-bold">{inProgressCount}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Resolved</p><p className="text-2xl font-bold">{resolvedCount}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{complaints.length}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>All Complaints</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : complaints.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No complaints found.</div>
            ) : (
              <table className="w-full">
                <thead><tr className="border-b"><th className="pb-3 text-left">ID</th><th className="pb-3 text-left">Tenant ID</th><th className="pb-3 text-left">Title</th><th className="pb-3 text-left">Category</th><th className="pb-3 text-left">Description</th><th className="pb-3 text-left">Status</th></tr></thead>
                <tbody>
                  {complaints.map((c) => (
                    <tr key={c.id} className="border-b">
                      <td className="py-3 font-medium">{c.id.substring(0,8)}...</td>
                      <td className="py-3">{c.tenantId}</td>
                      <td className="py-3">{c.title}</td>
                      <td className="py-3"><Badge variant="outline">{c.category || 'General'}</Badge></td>
                      <td className="py-3">{c.description}</td>
                      <td className="py-3"><Badge variant={c.status === 'resolved' || c.status === 'closed' ? 'success' : c.status === 'in_progress' ? 'warning' : 'info'}>{c.status.toUpperCase()}</Badge></td>
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