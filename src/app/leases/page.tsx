'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { db } from '@/config/firebase'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { Lease } from '@/types/models'
import { Loader2 } from 'lucide-react'

export default function LeasesPage() {
  const [leases, setLeases] = useState<Lease[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'leases'), orderBy('startDate', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lData: Lease[] = []
      snapshot.forEach((doc) => {
        lData.push(doc.data() as Lease)
      })
      setLeases(lData)
      setLoading(false)
    }, (error) => {
      console.error('Error fetching leases:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const activeLeases = leases.filter(l => l.status === 'active').length
  const pendingRenewal = leases.filter(l => l.status === 'pending_renewal').length
  const totalDeposits = leases.reduce((acc, l) => acc + l.deposit, 0)

  return (
    <DashboardLayout title="Lease Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Leases</h2>
            <p className="text-muted-foreground">Manage lease agreements and contracts</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Active Leases</p><p className="text-2xl font-bold">{activeLeases}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Expiring Soon</p><p className="text-2xl font-bold">{pendingRenewal}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Pending Renewal</p><p className="text-2xl font-bold">{pendingRenewal}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Total Deposits</p><p className="text-2xl font-bold">₨ {totalDeposits.toLocaleString()}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>All Leases</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : leases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No leases found. Please seed the database.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 text-left">Unit ID</th>
                    <th className="pb-3 text-left">Tenant ID</th>
                    <th className="pb-3 text-left">Start Date</th>
                    <th className="pb-3 text-left">End Date</th>
                    <th className="pb-3 text-left">Monthly Rent</th>
                    <th className="pb-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leases.map((lease) => (
                    <tr key={lease.id} className="border-b">
                      <td className="py-3 font-medium">{lease.unitId}</td>
                      <td className="py-3">{lease.tenantId}</td>
                      <td className="py-3">{lease.startDate}</td>
                      <td className="py-3">{lease.endDate}</td>
                      <td className="py-3">₨{lease.monthlyRent.toLocaleString()}</td>
                      <td className="py-3"><Badge variant={lease.status === 'active' ? 'success' : 'warning'}>{lease.status}</Badge></td>
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