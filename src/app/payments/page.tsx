'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { db } from '@/config/firebase'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { Payment } from '@/types/models'
import { Loader2 } from 'lucide-react'

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'payments'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const pData: Payment[] = []
      snapshot.forEach((doc: any) => {
        pData.push(doc.data() as Payment)
      })
      setPayments(pData)
      setLoading(false)
    }, (error: any) => {
      console.error('Error fetching payments:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const totalCollected = payments.filter(p => p.status === 'completed').reduce((acc, p) => acc + p.amount, 0)
  const transactionsCount = payments.length

  return (
    <DashboardLayout title="Payments">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Payments</h2>
          <p className="text-muted-foreground">Track payment collections and receipts</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Total Collected</p><p className="text-2xl font-bold">₨ {totalCollected.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">This Month</p><p className="text-2xl font-bold">₨ {totalCollected.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold">₨ 0</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Transactions</p><p className="text-2xl font-bold">{transactionsCount}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Recent Payments</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No payments found. Please seed the database.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 text-left">Invoice ID</th>
                    <th className="pb-3 text-left">Tenant ID</th>
                    <th className="pb-3 text-left">Amount</th>
                    <th className="pb-3 text-left">Method</th>
                    <th className="pb-3 text-left">Date</th>
                    <th className="pb-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b">
                      <td className="py-3 font-medium">{p.invoiceId.substring(0,8)}...</td>
                      <td className="py-3">{p.tenantId}</td>
                      <td className="py-3">₨{p.amount.toLocaleString()}</td>
                      <td className="py-3">{p.method.replace('_', ' ')}</td>
                      <td className="py-3">{new Date(p.paidAt).toLocaleDateString()}</td>
                      <td className="py-3"><Badge variant="success">{p.status}</Badge></td>
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