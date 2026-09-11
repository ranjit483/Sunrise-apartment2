'use client'

import { useState, useEffect, useMemo } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Printer, Users, UserCheck, Key, Clock, Search } from 'lucide-react'

export default function TenantHistoryReportPage() {
  const [residents, setResidents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap: any) => {
      const rData: any[] = []
      snap.forEach((doc: any) => {
        const d = doc.data()
        if (['SUPER_ADMIN', 'RESIDENT', 'TENANT', 'OWNER', 'MANAGER'].includes(d.role)) {
          rData.push({ id: doc.id, ...d })
        }
      })
      setResidents(rData)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const totalResidentsCount = residents.length
  const ownersCount = residents.filter((r) => r.role === 'OWNER').length
  const tenantsCount = residents.filter((r) => r.role === 'TENANT' || r.role === 'RESIDENT').length
  const approvedCount = residents.filter((r) => r.status === 'approved').length

  const filteredResidents = useMemo(() => {
    return residents.filter((r) => {
      if (roleFilter !== 'all' && r.role !== roleFilter) return false
      if (searchQuery) {
        const qL = searchQuery.toLowerCase()
        const matchName = (r.fullName || r.displayName || '').toLowerCase().includes(qL)
        const matchEmail = (r.email || '').toLowerCase().includes(qL)
        const matchUnit = (r.unitNumber || '').toLowerCase().includes(qL)
        const matchPhone = (r.phone || '').toLowerCase().includes(qL)
        return matchName || matchEmail || matchUnit || matchPhone
      }
      return true
    })
  }, [residents, roleFilter, searchQuery])

  return (
    <DashboardLayout title="Tenant History Report">
      <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:hidden">
          <div>
            <h2 className="text-lg sm:text-3xl font-bold tracking-tight">Tenant & Resident Records</h2>
            <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              Historical & active records of all apartment owners, tenants, and residents
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
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase">Registered Residents</p>
                <p className="text-base sm:text-2xl font-black text-gray-900 mt-0.5">{totalResidentsCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Users className="h-4 w-4 sm:h-6 sm:w-6" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2.5 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase">Apartment Owners</p>
                <p className="text-base sm:text-2xl font-black text-blue-600 mt-0.5">{ownersCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><Key className="h-4 w-4 sm:h-6 sm:w-6" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2.5 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase">Tenants / Renters</p>
                <p className="text-base sm:text-2xl font-black text-emerald-600 mt-0.5">{tenantsCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><UserCheck className="h-4 w-4 sm:h-6 sm:w-6" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2.5 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase">Approved Access</p>
                <p className="text-base sm:text-2xl font-black text-amber-600 mt-0.5">{approvedCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600"><Clock className="h-4 w-4 sm:h-6 sm:w-6" /></div>
            </CardContent>
          </Card>
        </div>

        {/* Resident Records Table */}
        <Card className="print:shadow-none print:border-none">
          <CardHeader className="p-3 sm:p-6 pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm sm:text-lg font-bold">Resident Directory & History</CardTitle>
              <CardDescription className="text-[10px] sm:text-xs">Live registry of apartment unit occupants and contact logs</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[120px] sm:w-[140px] h-8 sm:h-9 text-xs"><SelectValue placeholder="All Roles" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="OWNER">Owner</SelectItem>
                  <SelectItem value="TENANT">Tenant</SelectItem>
                  <SelectItem value="RESIDENT">Resident</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Search resident/unit..."
                className="w-full sm:w-[170px] h-8 sm:h-9 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b text-[10px] sm:text-xs text-muted-foreground uppercase bg-slate-50">
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Resident Name</th>
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Email</th>
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Phone</th>
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Tower & Unit</th>
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Role</th>
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResidents.map((r) => (
                      <tr key={r.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-2 px-3 sm:px-4 font-bold text-gray-900">{r.fullName || r.displayName || 'Resident'}</td>
                        <td className="py-2 px-3 sm:px-4 text-muted-foreground">{r.email}</td>
                        <td className="py-2 px-3 sm:px-4 font-medium">{r.phone || '-'}</td>
                        <td className="py-2 px-3 sm:px-4 font-bold text-indigo-700">{r.buildingId ? `${r.buildingId} / ` : ''}{r.unitNumber || 'Not Set'}</td>
                        <td className="py-2 px-3 sm:px-4">
                          <Badge variant="outline" className="text-[9px] sm:text-xs font-semibold px-1.5 py-0.5">
                            {r.role}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 sm:px-4">
                          <Badge variant={r.status === 'approved' ? 'success' : 'secondary'} className="capitalize text-[9px] sm:text-xs px-1.5 py-0.5">
                            {r.status || 'Pending'}
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
