'use client'

import { useState, useEffect, useMemo } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { Loader2, Printer, Users, UserCheck, Wrench, ShieldCheck } from 'lucide-react'

const roleColors: Record<string, string> = {
  PLUMBER: 'bg-orange-100 text-orange-800 border-orange-200',
  ELECTRICIAN: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CLEANER: 'bg-pink-100 text-pink-800 border-pink-200',
  SECURITY_GUARD: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  OFFICE_ASSISTANT: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  MANAGER: 'bg-blue-100 text-blue-800 border-blue-200',
  GENERAL_STAFF: 'bg-gray-100 text-gray-800 border-gray-200',
}

export default function StaffReportPage() {
  const [staff, setStaff] = useState<any[]>([])
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const qU = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
    const unsubU = onSnapshot(qU, (snap: any) => {
      const sData: any[] = []
      snap.forEach((doc: any) => {
        const d = doc.data()
        if (!['SUPER_ADMIN', 'RESIDENT', 'TENANT', 'OWNER'].includes(d.role)) {
          sData.push({ id: doc.id, ...d })
        }
      })
      setStaff(sData)

      const qT = query(collection(db, 'maintenance'))
      onSnapshot(qT, (tSnap: any) => {
        const tData: any[] = []
        tSnap.forEach((doc: any) => tData.push({ id: doc.id, ...doc.data() }))
        setTickets(tData)
        setLoading(false)
      })
    })

    return () => unsubU()
  }, [])

  const activeStaffCount = staff.filter((s) => s.status === 'active' || s.status === 'approved' || !s.status).length
  const plumbersElectriciansCount = staff.filter((s) => ['PLUMBER', 'ELECTRICIAN'].includes(s.role)).length
  const guardsCleanersCount = staff.filter((s) => ['SECURITY_GUARD', 'GUARD', 'CLEANER'].includes(s.role)).length

  // Ticket stats mapped per staff member
  const staffPerformance = useMemo(() => {
    return staff.map((s) => {
      const name = s.fullName || s.displayName || s.email
      const assigned = tickets.filter((t) => t.assignedTo === name || t.assignedTo === s.uid)
      const resolved = assigned.filter((t) => t.status === 'resolved' || t.status === 'closed')
      return {
        ...s,
        name,
        assignedCount: assigned.length,
        resolvedCount: resolved.length,
      }
    })
  }, [staff, tickets])

  return (
    <DashboardLayout title="Staff Report">
      <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:hidden">
          <div>
            <h2 className="text-lg sm:text-3xl font-bold tracking-tight">Staff Performance Report</h2>
            <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              Staff directory, role distribution, and maintenance resolution metrics
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 h-8 sm:h-10 text-xs sm:text-sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Print Report
          </Button>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid gap-2.5 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-2.5 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase">Total Staff</p>
                <p className="text-base sm:text-2xl font-black text-gray-900 mt-0.5">{staff.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Users className="h-4 w-4 sm:h-6 sm:w-6" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2.5 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase">Active / On Duty</p>
                <p className="text-base sm:text-2xl font-black text-emerald-600 mt-0.5">{activeStaffCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><UserCheck className="h-4 w-4 sm:h-6 sm:w-6" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2.5 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase">Plumbers & Techs</p>
                <p className="text-base sm:text-2xl font-black text-amber-600 mt-0.5">{plumbersElectriciansCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600"><Wrench className="h-4 w-4 sm:h-6 sm:w-6" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2.5 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase">Guards & Cleaners</p>
                <p className="text-base sm:text-2xl font-black text-blue-600 mt-0.5">{guardsCleanersCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><ShieldCheck className="h-4 w-4 sm:h-6 sm:w-6" /></div>
            </CardContent>
          </Card>
        </div>

        {/* Staff Directory Table */}
        <Card className="print:shadow-none print:border-none">
          <CardHeader className="p-3 sm:p-6 pb-3 border-b">
            <CardTitle className="text-sm sm:text-lg font-bold">Staff Directory & Performance Logs</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">Staff assignments, specializations, and ticket resolutions</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b text-[10px] sm:text-xs text-muted-foreground uppercase bg-slate-50">
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Staff Member</th>
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Role</th>
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Phone Contact</th>
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Assigned Work</th>
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Resolved</th>
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffPerformance.map((s) => (
                      <tr key={s.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-2 px-3 sm:px-4">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
                              <AvatarFallback className="bg-indigo-100 text-indigo-800 text-[9px] sm:text-xs font-bold">
                                {getInitials(s.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-bold text-gray-900 text-xs sm:text-sm">{s.name}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 sm:px-4">
                          <Badge variant="outline" className={`text-[9px] sm:text-xs font-semibold px-1.5 py-0.5 ${roleColors[s.role] || ''}`}>
                            {s.role ? s.role.replace('_', ' ') : 'GENERAL STAFF'}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 sm:px-4 text-muted-foreground">{s.phone || '-'}</td>
                        <td className="py-2 px-3 sm:px-4 font-semibold">{s.assignedCount}</td>
                        <td className="py-2 px-3 sm:px-4 font-semibold text-emerald-700">{s.resolvedCount}</td>
                        <td className="py-2 px-3 sm:px-4">
                          <Badge variant={s.status === 'active' || s.status === 'approved' ? 'success' : 'secondary'} className="text-[9px] sm:text-xs px-1.5 py-0.5">
                            {s.status || 'Active'}
                          </Badge>
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
