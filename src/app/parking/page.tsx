'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { db } from '@/config/firebase'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { ParkingSlot } from '@/types/models'
import { Loader2 } from 'lucide-react'

export default function ParkingPage() {
  const [parkingSlots, setParkingSlots] = useState<ParkingSlot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'parking'), orderBy('slotNumber', 'asc'))
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const pData: ParkingSlot[] = []
      snapshot.forEach((doc: any) => {
        pData.push({ id: doc.id, ...doc.data() } as ParkingSlot)
      })
      setParkingSlots(pData)
      setLoading(false)
    }, (error: any) => {
      console.error('Error fetching parking slots:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const occupiedCount = parkingSlots.filter(p => p.status === 'occupied').length
  const availableCount = parkingSlots.filter(p => p.status === 'available').length
  const monthlyRevenue = parkingSlots.filter(p => p.status === 'occupied').reduce((acc, p) => acc + (p.monthlyFee || 0), 0)

  return (
    <DashboardLayout title="Parking Management">
      <div className="space-y-6">
        <div><h2 className="text-3xl font-bold">Parking</h2><p className="text-muted-foreground">Manage parking slots and vehicles</p></div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Total Slots</p><p className="text-2xl font-bold">{parkingSlots.length}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Occupied</p><p className="text-2xl font-bold">{occupiedCount}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Available</p><p className="text-2xl font-bold">{availableCount}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Monthly Revenue</p><p className="text-2xl font-bold">₨ {monthlyRevenue.toLocaleString()}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>All Parking Slots</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : parkingSlots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No parking slots found. Please seed the database.</div>
            ) : (
              <table className="w-full">
                <thead><tr className="border-b"><th className="pb-3 text-left">Slot</th><th className="pb-3 text-left">Unit</th><th className="pb-3 text-left">Vehicle</th><th className="pb-3 text-left">Model</th><th className="pb-3 text-left">Fee</th><th className="pb-3 text-left">Status</th></tr></thead>
                <tbody>
                  {parkingSlots.map((p) => (
                    <tr key={p.id} className="border-b">
                      <td className="py-3 font-medium">{p.slotNumber}</td>
                      <td className="py-3">{p.unitId || '-'}</td>
                      <td className="py-3">{p.vehicleNumber || '-'}</td>
                      <td className="py-3">{p.vehicleModel || '-'}</td>
                      <td className="py-3">₨{p.monthlyFee}</td>
                      <td className="py-3"><Badge variant={p.status === 'occupied' ? 'success' : p.status === 'available' ? 'warning' : 'info'}>{p.status.toUpperCase()}</Badge></td>
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