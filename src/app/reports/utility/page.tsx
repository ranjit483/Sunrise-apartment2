'use client'

import { useState, useEffect, useMemo } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Printer, Zap, Droplets, Flame, DollarSign } from 'lucide-react'

export default function UtilityReportPage() {
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [periodFilter, setPeriodFilter] = useState('all')

  useEffect(() => {
    const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap: any) => {
      const invs: any[] = []
      snap.forEach((doc: any) => invs.push({ id: doc.id, ...doc.data() }))
      setInvoices(invs)
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const filteredInvoices = useMemo(() => {
    if (periodFilter === 'all') return invoices
    return invoices.filter((inv) => inv.month === periodFilter)
  }, [invoices, periodFilter])

  // Compute utility totals
  const stats = useMemo(() => {
    let totalElecUnits = 0
    let totalElecAmount = 0
    let totalElecVatAmount = 0
    let totalWaterAmount = 0
    let totalDieselAmount = 0
    let totalUtilityAmount = 0

    filteredInvoices.forEach((inv) => {
      totalElecUnits += Number(inv.electricityConsumed || 0)
      totalElecAmount += Number(inv.electricityAmount || 0)
      totalElecVatAmount += Number(inv.electricityVatAmount || 0)
      totalWaterAmount += Number(inv.waterAmount || 0)
      totalDieselAmount += Number(inv.generatorAmount || 0) + Number(inv.dieselAmount || 0)
      totalUtilityAmount += Number(inv.utilityAmount || 0)
    })

    return {
      totalElecUnits,
      totalElecAmount,
      totalElecVatAmount,
      totalWaterAmount,
      totalDieselAmount,
      totalUtilityAmount,
      totalCombined: totalElecAmount + totalElecVatAmount + totalWaterAmount + totalDieselAmount + totalUtilityAmount
    }
  }, [filteredInvoices])

  // Get unique months list for filter
  const monthsList = useMemo(() => {
    const setM = new Set<string>()
    invoices.forEach((inv) => {
      if (inv.month) setM.add(inv.month)
    })
    return Array.from(setM).sort().reverse()
  }, [invoices])

  return (
    <DashboardLayout title="Utility Report">
      <div className="space-y-4 sm:space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 print:hidden">
          <div>
            <h2 className="text-lg sm:text-3xl font-bold tracking-tight">Utility Report</h2>
            <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              Consumption analytics for Electricity (NEA), Water Plant, Generator Diesel & Shared Utilities
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[130px] sm:w-[160px] h-8 sm:h-10 text-xs sm:text-sm"><SelectValue placeholder="All Months" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {monthsList.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-1.5 h-8 sm:h-10 text-xs sm:text-sm" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Print Report
            </Button>
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid gap-2.5 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-2.5 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase">Electricity (kWh)</p>
                <p className="text-base sm:text-2xl font-black text-amber-600 mt-0.5">{stats.totalElecUnits.toLocaleString()} kWh</p>
                <p className="text-[9px] sm:text-xs text-muted-foreground">₨ {stats.totalElecAmount.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600"><Zap className="h-4 w-4 sm:h-6 sm:w-6" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2.5 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase">Water Revenue</p>
                <p className="text-base sm:text-2xl font-black text-blue-600 mt-0.5">₨ {stats.totalWaterAmount.toLocaleString()}</p>
                <p className="text-[9px] sm:text-xs text-muted-foreground">Central Plant</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600"><Droplets className="h-4 w-4 sm:h-6 sm:w-6" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2.5 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase">Diesel Generator</p>
                <p className="text-base sm:text-2xl font-black text-rose-600 mt-0.5">₨ {stats.totalDieselAmount.toLocaleString()}</p>
                <p className="text-[9px] sm:text-xs text-muted-foreground">Power Backup</p>
              </div>
              <div className="p-2 rounded-lg bg-rose-50 text-rose-600"><Flame className="h-4 w-4 sm:h-6 sm:w-6" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-2.5 sm:p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase">Total Utilities Billed</p>
                <p className="text-base sm:text-2xl font-black text-emerald-600 mt-0.5">₨ {stats.totalCombined.toLocaleString()}</p>
                <p className="text-[9px] sm:text-xs text-muted-foreground">All Heads</p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><DollarSign className="h-4 w-4 sm:h-6 sm:w-6" /></div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice Consumption Table */}
        <Card className="print:shadow-none print:border-none">
          <CardHeader className="p-3 sm:p-6 pb-3 border-b">
            <CardTitle className="text-sm sm:text-lg font-bold">Unit Utility Billing Logs</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">Detailed meter reading and utility breakdown per apartment</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b text-[10px] sm:text-xs text-muted-foreground uppercase bg-slate-50">
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Unit No</th>
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Resident Name</th>
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Month</th>
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Elec Units</th>
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Elec Cost</th>
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Water Cost</th>
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Diesel Cost</th>
                      <th className="py-2.5 px-3 sm:px-4 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-2 px-3 sm:px-4 font-bold text-gray-900">{inv.unitNumber || inv.unitId}</td>
                        <td className="py-2 px-3 sm:px-4 font-medium">{inv.tenantName || 'Resident'}</td>
                        <td className="py-2 px-3 sm:px-4 text-muted-foreground font-mono">{inv.month}</td>
                        <td className="py-2 px-3 sm:px-4 font-semibold text-amber-700">{inv.electricityConsumed || 0} kWh</td>
                        <td className="py-2 px-3 sm:px-4 font-semibold">₨ {(inv.electricityAmount || 0).toLocaleString()}</td>
                        <td className="py-2 px-3 sm:px-4 font-semibold">₨ {(inv.waterAmount || 0).toLocaleString()}</td>
                        <td className="py-2 px-3 sm:px-4 font-semibold">₨ {((inv.generatorAmount || 0) + (inv.dieselAmount || 0)).toLocaleString()}</td>
                        <td className="py-2 px-3 sm:px-4">
                          <Badge variant={inv.status === 'paid' ? 'success' : 'secondary'} className="capitalize text-[9px] sm:text-xs px-1.5 py-0.5">
                            {inv.status}
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
