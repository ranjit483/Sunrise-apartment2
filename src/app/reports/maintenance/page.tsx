'use client'

import { useState, useEffect, useMemo } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Printer, Wrench, CheckCircle, Clock, AlertTriangle, UserCheck } from 'lucide-react'
import { MaintenanceTicket } from '@/types/models'

export default function MaintenanceReportPage() {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [priorityFilter, setPriorityFilter] = useState('all')

  useEffect(() => {
    const qT = query(collection(db, 'maintenance'), orderBy('createdAt', 'desc'))
    const unsubT = onSnapshot(qT, (snap: any) => {
      const tList: MaintenanceTicket[] = []
      snap.forEach((doc: any) => tList.push({ id: doc.id, ...doc.data() } as MaintenanceTicket))
      setTickets(tList)

      const qU = query(collection(db, 'users'))
      onSnapshot(qU, (uSnap: any) => {
        const uList: any[] = []
        uSnap.forEach((doc: any) => uList.push({ id: doc.id, ...doc.data() }))
        setUsers(uList)
        setLoading(false)
      })
    })

    return () => unsubT()
  }, [])

  const totalTickets = tickets.length
  const openCount = tickets.filter((t) => t.status === 'open').length
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length
  const resolvedCount = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length
  
  const checkSlaAlert = (t: MaintenanceTicket) => {
    if (t.status !== 'open') return false
    if (t.priority !== 'critical' && t.priority !== 'high') return false
    const hoursElapsed = (Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60)
    return hoursElapsed > 2
  }
  const slaBreachCount = tickets.filter(checkSlaAlert).length

  // Tech Performance aggregation
  const techStatsMap = useMemo(() => {
    const map: Record<string, { name: string; assigned: number; resolved: number; totalCost: number }> = {}
    
    // Add default tech users
    users.filter((u) => ['PLUMBER', 'ELECTRICIAN', 'GENERAL_STAFF', 'CLEANER'].includes(u.role)).forEach((u) => {
      map[u.fullName || u.uid] = { name: u.fullName || u.email, assigned: 0, resolved: 0, totalCost: 0 }
    })

    tickets.forEach((t) => {
      if (t.assignedTo) {
        if (!map[t.assignedTo]) {
          map[t.assignedTo] = { name: t.assignedTo, assigned: 0, resolved: 0, totalCost: 0 }
        }
        map[t.assignedTo].assigned += 1
        if (t.status === 'resolved' || t.status === 'closed') {
          map[t.assignedTo].resolved += 1
          map[t.assignedTo].totalCost += (t.actualCost || 0)
        }
      }
    })

    return Object.values(map)
  }, [tickets, users])

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
      return true
    })
  }, [tickets, priorityFilter])

  return (
    <DashboardLayout title="Maintenance Report">
      <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:hidden">
          <div>
            <h2 className="text-lg sm:text-3xl font-bold tracking-tight">Maintenance Report</h2>
            <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              Ticket statistics, response times, and technician metrics
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
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase">Total Tickets</p>
                <p className="text-base sm:text-2xl font-black text-gray-900 mt-0.5">{totalTickets}</p>
              </div>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Wrench className="h-4 w-4 sm:h-6 sm:w-6" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2.5 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase">Open / Triage</p>
                <p className="text-base sm:text-2xl font-black text-blue-600 mt-0.5">{openCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><Clock className="h-4 w-4 sm:h-6 sm:w-6" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2.5 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase">Resolved / Closed</p>
                <p className="text-base sm:text-2xl font-black text-emerald-600 mt-0.5">{resolvedCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><CheckCircle className="h-4 w-4 sm:h-6 sm:w-6" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2.5 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase">SLA Breaches</p>
                <p className="text-base sm:text-2xl font-black text-rose-600 mt-0.5">{slaBreachCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-rose-50 text-rose-600"><AlertTriangle className="h-4 w-4 sm:h-6 sm:w-6" /></div>
            </CardContent>
          </Card>
        </div>

        {/* Technician Performance Directory Table */}
        <Card className="print:shadow-none print:border-none">
          <CardHeader className="p-3 sm:p-6 pb-3 border-b">
            <CardTitle className="text-sm sm:text-lg font-bold flex items-center gap-2">
              <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
              Specialized Technician Resolution Metrics
            </CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">Work orders dispatched and resolved by staff member</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b text-[10px] sm:text-xs text-muted-foreground uppercase bg-slate-50">
                    <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Staff Member</th>
                    <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Assigned Tickets</th>
                    <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Resolved Tickets</th>
                    <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Resolution Rate</th>
                    <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Total Material Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {techStatsMap.map((tech) => {
                    const rate = tech.assigned > 0 ? Math.round((tech.resolved / tech.assigned) * 100) : 100
                    return (
                      <tr key={tech.name} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-2 px-3 sm:px-4 font-bold text-gray-900">{tech.name}</td>
                        <td className="py-2 px-3 sm:px-4 font-semibold">{tech.assigned}</td>
                        <td className="py-2 px-3 sm:px-4 font-semibold text-emerald-700">{tech.resolved}</td>
                        <td className="py-2 px-3 sm:px-4">
                          <Badge variant="outline" className="text-[9px] sm:text-xs font-semibold px-1.5 py-0.5">
                            {rate}%
                          </Badge>
                        </td>
                        <td className="py-2 px-3 sm:px-4 font-semibold">₨ {tech.totalCost.toLocaleString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Log Table */}
        <Card className="print:shadow-none print:border-none">
          <CardHeader className="p-3 sm:p-6 pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm sm:text-lg font-bold">Recent Maintenance Logs</CardTitle>
              <CardDescription className="text-[10px] sm:text-xs">Detailed audit log of all maintenance tickets</CardDescription>
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[130px] sm:w-[150px] h-8 sm:h-9 text-xs"><SelectValue placeholder="All Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="critical">Critical / Emergency</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b text-[10px] sm:text-xs text-muted-foreground uppercase bg-slate-50">
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Ticket No</th>
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Title</th>
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Location</th>
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Assigned Tech</th>
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Priority</th>
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((t) => (
                      <tr key={t.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-2 px-3 sm:px-4 font-mono font-bold text-gray-900">{(t as any).ticketNo || t.id.substring(0, 8)}</td>
                        <td className="py-2 px-3 sm:px-4 font-semibold">{t.title}</td>
                        <td className="py-2 px-3 sm:px-4 text-muted-foreground">{t.unitId}</td>
                        <td className="py-2 px-3 sm:px-4 font-medium">{t.assignedTo || 'Unassigned'}</td>
                        <td className="py-2 px-3 sm:px-4">
                          <Badge variant="outline" className="capitalize text-[9px] sm:text-xs px-1.5 py-0.5">
                            {t.priority}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 sm:px-4">
                          <Badge variant={t.status === 'resolved' || t.status === 'closed' ? 'success' : 'secondary'} className="capitalize text-[9px] sm:text-xs px-1.5 py-0.5">
                            {t.status.replace('_', ' ')}
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
