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
        if (!['SUPER_ADMIN', 'RESIDENT', 'TENANT', 'OWNER'].includes(data.role)) {
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
      <div className="space-y-3 sm:space-y-6">
        <div>
          <h2 className="text-lg sm:text-3xl font-bold tracking-tight">Staff</h2>
          <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">Manage staff members and their tasks</p>
        </div>

        <div className="grid gap-2 sm:gap-4 grid-cols-2 md:grid-cols-4">
          <Card><CardContent className="p-2.5 sm:p-6"><p className="text-[10px] sm:text-sm text-muted-foreground font-medium">Total Staff</p><p className="text-sm sm:text-2xl font-bold mt-0.5 sm:mt-1">{staff.length}</p></CardContent></Card>
          <Card><CardContent className="p-2.5 sm:p-6"><p className="text-[10px] sm:text-sm text-muted-foreground font-medium">Active</p><p className="text-sm sm:text-2xl font-bold mt-0.5 sm:mt-1">{activeStaff}</p></CardContent></Card>
          <Card><CardContent className="p-2.5 sm:p-6"><p className="text-[10px] sm:text-sm text-muted-foreground font-medium">On Duty</p><p className="text-sm sm:text-2xl font-bold mt-0.5 sm:mt-1">{activeStaff}</p></CardContent></Card>
          <Card><CardContent className="p-2.5 sm:p-6"><p className="text-[10px] sm:text-sm text-muted-foreground font-medium">Monthly Salary</p><p className="text-sm sm:text-2xl font-bold mt-0.5 sm:mt-1">₨ -</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3"><CardTitle className="text-sm sm:text-xl font-bold">All Staff</CardTitle></CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" /></div>
            ) : staff.length === 0 ? (
              <div className="text-center py-8 text-xs sm:text-sm text-muted-foreground">No staff members found. Please seed the database.</div>
            ) : (
              <div className="overflow-x-auto overflow-y-hidden"><table className="w-full min-w-[600px] text-xs sm:text-sm">
                <thead><tr className="border-b text-[10px] sm:text-xs text-muted-foreground uppercase"><th className="pb-2 text-left font-semibold">Staff</th><th className="pb-2 text-left font-semibold">Role</th><th className="pb-2 text-left font-semibold">Phone</th><th className="pb-2 text-left font-semibold">Assigned Tickets</th><th className="pb-2 text-left font-semibold">Status</th></tr></thead>
                <tbody>
                  {staff.map((s) => {
                    const name = s.fullName || s.displayName || 'Unknown Staff'
                    return (
                    <tr key={s.uid} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-1.5 sm:py-3"><div className="flex items-center gap-2 sm:gap-3"><Avatar className="h-6 w-6 sm:h-9 sm:w-9"><AvatarFallback className="bg-primary text-primary-foreground text-[9px] sm:text-xs">{getInitials(name)}</AvatarFallback></Avatar><span className="font-semibold text-xs sm:text-sm text-gray-900">{name}</span></div></td>
                      <td className="py-1.5 sm:py-3"><Badge variant="outline" className={`text-[9px] sm:text-xs px-1.5 py-0.5 ${roleColors[s.role] || ''}`}>{s.role.replace('_', ' ')}</Badge></td>
                      <td className="py-1.5 sm:py-3 text-[10px] sm:text-sm">{s.phone || '-'}</td>
                      <td className="py-1.5 sm:py-3 text-[10px] sm:text-sm">0</td>
                      <td className="py-1.5 sm:py-3"><Badge variant={s.status === 'active' ? 'success' : 'secondary'} className="text-[9px] sm:text-xs px-1.5 py-0.5">{s.status}</Badge></td>
                    </tr>
                    )
                  })}
                </tbody>
              </table></div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}