'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { db } from '@/config/firebase'
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore'
import { ElectricityReading, Invoice } from '@/types/models'
import { Loader2, CheckCircle2, XCircle, Clock, Zap } from 'lucide-react'

export default function AdminElectricityView() {
  const [readings, setReadings] = useState<ElectricityReading[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const q = query(
      collection(db, 'electricity_readings'),
      orderBy('readingDate', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const data: ElectricityReading[] = []
      snapshot.forEach((doc: any) => {
        data.push(doc.data() as ElectricityReading)
      })
      setReadings(data)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleApprove = async (reading: ElectricityReading) => {
    if (!confirm("Are you sure you want to approve this reading?")) return
    try {
      const batch = writeBatch(db)

      // 1. Update reading status
      const readingRef = doc(db, 'electricity_readings', reading.id)
      batch.update(readingRef, {
        status: 'approved',
        updatedAt: new Date().toISOString()
      })

      // 2. Create an invoice for this electricity bill
      const invoiceRef = doc(collection(db, 'invoices'))
      const invoice: Invoice = {
        id: invoiceRef.id,
        unitId: reading.unitId,
        tenantId: reading.tenantId,
        month: reading.month || new Date().toISOString().substring(0, 7),
        amount: 0,
        electricityReading: reading.currentReading,
        electricityAmount: reading.totalBill,
        utilityAmount: 0,
        waterAmount: 0,
        otherAmount: 0,
        paidAmount: 0,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // due in 7 days
        status: 'pending', // post it immediately so they can pay it
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      batch.set(invoiceRef, invoice)

      await batch.commit()
      alert("Reading approved and electricity invoice generated successfully.")
    } catch (error: any) {
      console.error(error)
      alert("Error approving reading: " + error.message)
    }
  }

  const handleReject = async (reading: ElectricityReading) => {
    if (!confirm("Are you sure you want to reject this reading?")) return
    try {
      const readingRef = doc(db, 'electricity_readings', reading.id)
      await updateDoc(readingRef, {
        status: 'rejected',
        updatedAt: new Date().toISOString()
      })
    } catch (error: any) {
      console.error(error)
      alert("Error rejecting reading: " + error.message)
    }
  }

  const filteredReadings = readings.filter(r => filter === 'all' || r.status === filter)

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Meter Readings Management</CardTitle>
            <CardDescription>Review and approve resident submissions</CardDescription>
          </div>
          <div className="w-[180px]">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending_verification">Pending Verification</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Tenant ID</TableHead>
                  <TableHead>Readings (Prev → Curr)</TableHead>
                  <TableHead>Consumed</TableHead>
                  <TableHead>Total Bill</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReadings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No readings found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReadings.map((reading) => (
                    <TableRow key={reading.id}>
                      <TableCell>{new Date(reading.readingDate).toLocaleDateString()}</TableCell>
                      <TableCell className="font-mono text-xs">{reading.tenantId.substring(0, 8)}...</TableCell>
                      <TableCell>
                        {reading.previousReading} → <strong>{reading.currentReading}</strong>
                      </TableCell>
                      <TableCell>{reading.totalConsumed} Units</TableCell>
                      <TableCell className="font-bold">Rs. {reading.totalBill.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium uppercase ${
                          reading.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          reading.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {reading.status === 'approved' && <CheckCircle2 className="h-3 w-3" />}
                          {reading.status === 'rejected' && <XCircle className="h-3 w-3" />}
                          {reading.status === 'pending_verification' && <Clock className="h-3 w-3" />}
                          {reading.status.replace('_', ' ')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {reading.status === 'pending_verification' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700"
                              onClick={() => handleApprove(reading)}
                            >
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
                              onClick={() => handleReject(reading)}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {reading.photoUrl && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={reading.photoUrl} target="_blank" rel="noreferrer">View Photo</a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
