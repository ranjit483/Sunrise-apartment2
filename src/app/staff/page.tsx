'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { db } from '@/config/firebase'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { Loader2 } from 'lucide-react'

// Using any for User to avoid circular dependencies and typing complexities for now
interface StaffUser {
  uid: string
  email: string
  fullName?: string
  displayName?: string
  role: string
  status: string
  phone?: string
  createdAt: string
}

const roleColors: Record<string, string> = { PLUMBER: 'bg-orange-100 text-orange-800', ELECTRICIAN: 'bg-yellow-100 text-yellow-800', CLEANER: 'bg-pink-100 text-pink-800', SECURITY_GUARD: 'bg-indigo-100 text-indigo-800', OFFICE_ASSISTANT: 'bg-cyan-100 text-cyan-800', MANAGER: 'bg-blue-100 text-blue-800', GENERAL_STAFF: 'bg-gray-100 text-gray-800' }

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const sData: StaffUser[] = []
      snapshot.forEach((doc: any) => {
        const data = doc.data() as StaffUser
        // Filter out non-staff roles
        if (!['SUPER_ADMIN', 'RESIDENT', 'TENANT'].includes(data.role)) {
          sData.push(data)
        }
      })
      setStaff(sData)
      setLoading(false)
    }, (error: any) => {
      console.error('Error fetching staff:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const activeStaff = staff.filter(s => s.status === 'active').length

  return (
    <DashboardLayout title="Staff Management">
      <div className="space-y-6">
        <div><h2 className="text-3xl font-bold">Staff</h2><p className="text-muted-foreground">Manage staff members and their tasks</p></div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Total Staff</p><p className="text-2xl font-bold">{staff.length}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Active</p><p className="text-2xl font-bold">{activeStaff}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">On Duty</p><p className="text-2xl font-bold">{activeStaff}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Monthly Salary</p><p className="text-2xl font-bold">₨ -</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>All Staff</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : staff.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No staff members found. Please seed the database.</div>
            ) : (
              <table className="w-full">
                <thead><tr className="border-b"><th className="pb-3 text-left">Staff</th><th className="pb-3 text-left">Role</th><th className="pb-3 text-left">Phone</th><th className="pb-3 text-left">Assigned Tickets</th><th className="pb-3 text-left">Status</th></tr></thead>
                <tbody>
                  {staff.map((s) => {
                    const name = s.fullName || s.displayName || 'Unknown Staff'
                    return (
                    <tr key={s.uid} className="border-b">
                      <td className="py-3"><div className="flex items-center gap-3"><Avatar className="h-9 w-9"><AvatarFallback className="bg-primary text-primary-foreground text-xs">{getInitials(name)}</AvatarFallback></Avatar><span className="font-medium">{name}</span></div></td>
                      <td className="py-3"><Badge variant="outline" className={roleColors[s.role] || ''}>{s.role.replace('_', ' ')}</Badge></td>
                      <td className="py-3">{s.phone || '-'}</td>
                      <td className="py-3">0</td>
                      <td className="py-3"><Badge variant={s.status === 'active' ? 'success' : 'secondary'}>{s.status}</Badge></td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}