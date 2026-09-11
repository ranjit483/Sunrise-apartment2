'use client'

import { useState, useEffect, useMemo } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { collection, query, onSnapshot } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Printer, Home, CheckCircle2, AlertCircle, Building2 } from 'lucide-react'

const TOWER_UNITS: Record<string, string[]> = {
  'Tower A': [
    'A-0', 'A-1', 'A-2', 'A-3', 'A-4', 'A-5', 'A-6', 'A-7', 'A-8', 'A-9', 'A-10',
    'B-0', 'B-1', 'B-2', 'B-3', 'B-4', 'B-5', 'B-6', 'B-7', 'B-8', 'B-9', 'B-10',
    'C-1', 'C-2', 'C-3', 'C-4', 'C-5', 'C-6', 'C-7', 'C-8', 'C-9', 'C-10',
    'D-1', 'D-2', 'D-3', 'D-4', 'D-5', 'D-6', 'D-7', 'D-8', 'D-9', 'D-10', 'D-11', 'D-12',
    'E-1', 'E-2', 'E-3', 'E-4', 'E-5', 'E-6', 'E-7', 'E-8', 'E-9', 'E-10', 'E-11', 'E-12'
  ],
  'Tower B I': [
    'F-1', 'F-2', 'F-3', 'F-4', 'F-5', 'F-6', 'F-7', 'F-8', 'F-9', 'F-10', 'F-11', 'F-12', 'F-13', 'F-14',
    'G-1', 'G-2', 'G-3', 'G-4', 'G-5', 'G-6', 'G-7', 'G-8', 'G-9', 'G-10', 'G-11', 'G-12', 'G-13', 'G-14',
    'H-1', 'H-2', 'H-3', 'H-4', 'H-5', 'H-6', 'H-7', 'H-8', 'H-9', 'H-10', 'H-11', 'H-12', 'H-13', 'H-14',
    'I-1', 'I-2', 'I-3', 'I-4', 'I-5', 'I-6', 'I-7', 'I-8', 'I-9', 'I-10', 'I-11', 'I-12', 'I-13', 'I-14',
    'J-1', 'J-2', 'J-3', 'J-4', 'J-5', 'J-6', 'J-7', 'J-8', 'J-9', 'J-10', 'J-11', 'J-12', 'J-13', 'J-14',
    'K-1', 'K-2', 'K-3', 'K-4', 'K-5', 'K-6', 'K-7', 'K-8', 'K-9', 'K-10', 'K-11', 'K-12', 'K-13', 'K-14',
    'L1-1', 'L1-2', 'L1-3', 'L1-4', 'L1-5', 'L1-6', 'L1-7', 'L1-8', 'L1-9', 'L1-10', 'L1-11', 'L1-12', 'L1-13', 'L1-14',
    'L2-1', 'L2-2', 'L2-3', 'L2-4', 'L2-5', 'L2-6', 'L2-7', 'L2-8', 'L2-9', 'L2-10', 'L2-11', 'L2-12', 'L2-13', 'L2-14'
  ],
  'Tower B II': [
    'M-1', 'M-2', 'M-3', 'M-4', 'M-5', 'M-6', 'M-7', 'M-8', 'M-9', 'M-10', 'M-11', 'M-12', 'M-13', 'M-14',
    'N-1', 'N-2', 'N-3', 'N-4', 'N-5', 'N-6', 'N-7', 'N-8', 'N-9', 'N-10', 'N-11', 'N-12', 'N-13', 'N-14',
    'O1-1', 'O1-2', 'O1-3', 'O1-4', 'O1-5', 'O1-6', 'O1-7', 'O1-8', 'O1-9', 'O1-10', 'O1-11', 'O1-12', 'O1-13', 'O1-14',
    'O2-1', 'O2-2', 'O2-3', 'O2-4', 'O2-5', 'O2-6', 'O2-7', 'O2-8', 'O2-9', 'O2-10', 'O2-11', 'O2-12', 'O2-13', 'O2-14',
    'P1-1', 'P1-2', 'P1-3', 'P1-4', 'P1-5', 'P1-6', 'P1-7', 'P1-8', 'P1-9', 'P1-10', 'P1-11', 'P1-12', 'P1-13', 'P1-14',
    'P2-1', 'P2-2', 'P2-3', 'P2-4', 'P2-5', 'P2-6', 'P2-7', 'P2-8', 'P2-9', 'P2-10', 'P2-11', 'P2-12', 'P2-13', 'P2-14',
    'Q-1', 'Q-2', 'Q-3', 'Q-4', 'Q-5', 'Q-6', 'Q-7', 'Q-8', 'Q-9', 'Q-10', 'Q-11', 'Q-12', 'Q-13', 'Q-14'
  ]
}

export default function OccupancyReportPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [towerFilter, setTowerFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'users'))
    const unsub = onSnapshot(q, (snap: any) => {
      const fetched: any[] = []
      snap.forEach((doc: any) => fetched.push({ id: doc.id, ...doc.data() }))
      setUsers(fetched)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  // Map occupied units by unit number
  const occupiedUnitsMap = useMemo(() => {
    const map: Record<string, any> = {}
    users.forEach((u) => {
      if (u.unitNumber && u.status === 'approved') {
        map[u.unitNumber] = u
      }
    })
    return map
  }, [users])

  // Build full list of all units in the society
  const allUnitsList = useMemo(() => {
    const list: Array<{ unitNumber: string; tower: string; resident?: any; isOccupied: boolean }> = []
    Object.entries(TOWER_UNITS).forEach(([tower, units]) => {
      units.forEach((unitNumber) => {
        const resident = occupiedUnitsMap[unitNumber]
        list.push({
          unitNumber,
          tower,
          resident,
          isOccupied: !!resident,
        })
      })
    })
    return list
  }, [occupiedUnitsMap])

  const totalUnitsCount = allUnitsList.length
  const occupiedCount = allUnitsList.filter((u) => u.isOccupied).length
  const vacantCount = totalUnitsCount - occupiedCount
  const occupancyRate = totalUnitsCount > 0 ? Math.round((occupiedCount / totalUnitsCount) * 100) : 0

  const filteredUnits = useMemo(() => {
    return allUnitsList.filter((u) => {
      if (towerFilter !== 'all' && u.tower !== towerFilter) return false
      if (statusFilter === 'occupied' && !u.isOccupied) return false
      if (statusFilter === 'vacant' && u.isOccupied) return false
      if (searchQuery) {
        const qL = searchQuery.toLowerCase()
        const matchUnit = u.unitNumber.toLowerCase().includes(qL)
        const matchTower = u.tower.toLowerCase().includes(qL)
        const matchResident = u.resident?.fullName?.toLowerCase().includes(qL)
        return matchUnit || matchTower || matchResident
      }
      return true
    })
  }, [allUnitsList, towerFilter, statusFilter, searchQuery])

  return (
    <DashboardLayout title="Occupancy Report">
      <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:hidden">
          <div>
            <h2 className="text-lg sm:text-3xl font-bold tracking-tight">Occupancy Report</h2>
            <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              Current society unit occupancy status & tower distribution
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
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase">Total Units</p>
                <p className="text-base sm:text-2xl font-black text-gray-900 mt-0.5">{totalUnitsCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600"><Building2 className="h-4 w-4 sm:h-6 sm:w-6" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2.5 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase">Occupied Units</p>
                <p className="text-base sm:text-2xl font-black text-emerald-600 mt-0.5">{occupiedCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><CheckCircle2 className="h-4 w-4 sm:h-6 sm:w-6" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2.5 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase">Vacant Units</p>
                <p className="text-base sm:text-2xl font-black text-amber-600 mt-0.5">{vacantCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600"><AlertCircle className="h-4 w-4 sm:h-6 sm:w-6" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2.5 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase">Occupancy Rate</p>
                <p className="text-base sm:text-2xl font-black text-indigo-700 mt-0.5">{occupancyRate}%</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><Home className="h-4 w-4 sm:h-6 sm:w-6" /></div>
            </CardContent>
          </Card>
        </div>

        {/* Tower Breakdown Cards */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          {Object.entries(TOWER_UNITS).map(([tower, units]) => {
            const towerOccupied = units.filter((u) => occupiedUnitsMap[u]).length
            const towerRate = Math.round((towerOccupied / units.length) * 100)
            return (
              <Card key={tower} className="bg-slate-50/50">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex justify-between items-center mb-1.5">
                    <h4 className="font-bold text-xs sm:text-sm text-gray-900">{tower}</h4>
                    <Badge variant="outline" className="text-[9px] sm:text-xs font-semibold">{towerRate}% Occupied</Badge>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden mb-2">
                    <div className="bg-indigo-600 h-full transition-all" style={{ width: `${towerRate}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground font-medium">
                    <span>Total: {units.length}</span>
                    <span className="text-emerald-700">Occupied: {towerOccupied}</span>
                    <span className="text-amber-700">Vacant: {units.length - towerOccupied}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Filtered Unit List Table */}
        <Card className="print:shadow-none print:border-none">
          <CardHeader className="p-3 sm:p-6 pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm sm:text-lg font-bold">Apartment Unit Directory</CardTitle>
              <CardDescription className="text-[10px] sm:text-xs">Live occupancy status of all society apartments</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Select value={towerFilter} onValueChange={setTowerFilter}>
                <SelectTrigger className="w-[120px] sm:w-[150px] h-8 sm:h-9 text-xs"><SelectValue placeholder="All Towers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Towers</SelectItem>
                  {Object.keys(TOWER_UNITS).map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[110px] sm:w-[130px] h-8 sm:h-9 text-xs"><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="vacant">Vacant</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Search unit/resident..."
                className="w-full sm:w-[160px] h-8 sm:h-9 text-xs"
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
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Unit Number</th>
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Tower / Block</th>
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Resident Name</th>
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Role</th>
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUnits.map((u) => (
                      <tr key={u.unitNumber} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-2 px-3 sm:px-4 font-bold text-gray-900">{u.unitNumber}</td>
                        <td className="py-2 px-3 sm:px-4 text-muted-foreground">{u.tower}</td>
                        <td className="py-2 px-3 sm:px-4 font-medium">{u.resident ? u.resident.fullName : <span className="text-muted-foreground italic">Vacant Unit</span>}</td>
                        <td className="py-2 px-3 sm:px-4">
                          {u.resident ? (
                            <Badge variant="outline" className="text-[9px] sm:text-xs font-semibold px-1.5 py-0.5">
                              {u.resident.role}
                            </Badge>
                          ) : '-'}
                        </td>
                        <td className="py-2 px-3 sm:px-4">
                          <Badge variant={u.isOccupied ? 'success' : 'secondary'} className="text-[9px] sm:text-xs px-1.5 py-0.5">
                            {u.isOccupied ? 'Occupied' : 'Vacant'}
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
