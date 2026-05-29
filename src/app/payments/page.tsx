'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { db } from '@/config/firebase'
import { collection, onSnapshot, query, orderBy, where, doc, writeBatch } from 'firebase/firestore'
import { Payment, Invoice } from '@/types/models'
import { Loader2, DollarSign } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function PaymentsPage() {
  const { user, profile } = useAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [pendingInvoices, setPendingInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [isPaying, setIsPaying] = useState<string | null>(null)

  useEffect(() => {
    if (!profile?.role) return;
    
    const isResident = profile.role === 'RESIDENT' || profile.role === 'TENANT'

    // Fetch payments
    let q = query(collection(db, 'payments'), orderBy('createdAt', 'desc'))
    if (isResident && user?.uid) {
      q = query(collection(db, 'payments'), where('tenantId', '==', user.uid), orderBy('createdAt', 'desc'))
    }
    
    const unsubscribePayments = onSnapshot(q, (snapshot: any) => {
      const pData: Payment[] = []
      snapshot.forEach((doc: any) => pData.push(doc.data() as Payment))
      setPayments(pData)
      setLoading(false)
    }, (error: any) => {
      console.error('Error fetching payments:', error)
      setLoading(false)
    })

    // Fetch pending invoices for calculating pending totals
    let unsubscribeInvoices = () => {}
    if (isResident && user?.uid) {
      const invQ = query(collection(db, 'invoices'), where('tenantId', '==', user.uid))
      unsubscribeInvoices = onSnapshot(invQ, (snapshot: any) => {
        const iData: Invoice[] = []
        snapshot.forEach((doc: any) => {
          const inv = { id: doc.id, ...doc.data() } as Invoice
          if (inv.status === 'pending' || inv.status === 'overdue') {
            iData.push(inv)
          }
        })
        setPendingInvoices(iData)
      })
    } else if (!isResident) {
      const invQ = query(collection(db, 'invoices'))
      unsubscribeInvoices = onSnapshot(invQ, (snapshot: any) => {
        const iData: Invoice[] = []
        snapshot.forEach((doc: any) => {
          const inv = { id: doc.id, ...doc.data() } as Invoice
          if (inv.status === 'pending' || inv.status === 'overdue') {
            iData.push(inv)
          }
        })
        setPendingInvoices(iData)
      })
    }

    return () => {
      unsubscribePayments()
      unsubscribeInvoices()
    }
  }, [profile, user])

  const handlePayInvoice = async (invoice: Invoice) => {
    if (!confirm('Proceed to pay this invoice?')) return
    setIsPaying(invoice.id)
    try {
      const batch = writeBatch(db)
      
      // Create payment record
      const paymentRef = doc(collection(db, 'payments'))
      const totalAmount = invoice.amount + (invoice.electricityAmount || 0) + (invoice.utilityAmount || 0) + (invoice.waterAmount || 0) + (invoice.otherAmount || 0)
      
      batch.set(paymentRef, {
        id: paymentRef.id,
        invoiceId: invoice.id,
        tenantId: invoice.tenantId,
        amount: totalAmount,
        method: 'online',
        transactionId: 'TRX-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        status: 'completed',
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      })

      // Update invoice status
      const invoiceRef = doc(db, 'invoices', invoice.id)
      batch.update(invoiceRef, {
        status: 'paid',
        updatedAt: new Date().toISOString()
      })

      await batch.commit()
      alert('Payment successful!')
    } catch (error: any) {
      console.error('Error processing payment:', error)
      alert('Payment failed: ' + error.message)
    } finally {
      setIsPaying(null)
    }
  }

  const isResident = profile?.role === 'RESIDENT' || profile?.role === 'TENANT'
  const totalCollected = payments.filter(p => p.status === 'completed').reduce((acc, p) => acc + p.amount, 0)
  
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const thisMonthCollected = payments.filter(p => {
    if (p.status !== 'completed') return false
    const d = new Date(p.paidAt || p.createdAt)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  }).reduce((acc, p) => acc + p.amount, 0)

  const pendingTotal = pendingInvoices.reduce((acc, i) => acc + i.amount + (i.electricityAmount || 0) + (i.utilityAmount || 0) + (i.waterAmount || 0) + (i.otherAmount || 0), 0)
  const transactionsCount = payments.length

  return (
    <DashboardLayout title="Payments">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">{isResident ? 'My Payments' : 'Payments'}</h2>
          <p className="text-muted-foreground">{isResident ? 'Manage your invoices and payment history' : 'Track payment collections and receipts'}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">{isResident ? 'Total Paid' : 'Total Collected'}</p><p className="text-2xl font-bold">₨ {totalCollected.toLocaleString()}</p></CardContent></Card>
          {isResident && <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Due Balance</p><p className="text-2xl font-bold text-red-500">₨ {pendingTotal.toLocaleString()}</p></CardContent></Card>}
          {!isResident && <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">This Month</p><p className="text-2xl font-bold">₨ {thisMonthCollected.toLocaleString()}</p></CardContent></Card>}
          {!isResident && <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold">₨ {pendingTotal.toLocaleString()}</p></CardContent></Card>}
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Transactions</p><p className="text-2xl font-bold">{transactionsCount}</p></CardContent></Card>
        </div>

        {isResident && pendingInvoices.length > 0 && (
          <Card className="border-red-200">
            <CardHeader><CardTitle className="text-red-600">Pending Invoices</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingInvoices.map((inv) => {
                  const total = inv.amount + (inv.electricityAmount || 0) + (inv.utilityAmount || 0) + (inv.waterAmount || 0) + (inv.otherAmount || 0)
                  return (
                    <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-red-50/50 gap-4">
                      <div>
                        <p className="font-semibold">Invoice for {inv.month}</p>
                        <p className="text-sm text-muted-foreground">Due Date: {inv.dueDate}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-bold text-lg">₨ {total.toLocaleString()}</p>
                          <Badge variant="warning">{inv.status.toUpperCase()}</Badge>
                        </div>
                        <Button onClick={() => handlePayInvoice(inv)} disabled={isPaying === inv.id} className="bg-primary">
                          {isPaying === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4 mr-2" />}
                          Pay Online
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No payment history found.</div>
            ) : (
              <div className="overflow-x-auto overflow-y-hidden"><table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 text-left">Transaction ID</th>
                    {!isResident && <th className="pb-3 text-left">Tenant ID</th>}
                    <th className="pb-3 text-left">Amount</th>
                    <th className="pb-3 text-left">Method</th>
                    <th className="pb-3 text-left">Date</th>
                    <th className="pb-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b">
                      <td className="py-3 font-medium">{p.transactionId || (p.id.substring(0,8) + '...')}</td>
                      {!isResident && <td className="py-3">{p.tenantId}</td>}
                      <td className="py-3 font-bold text-green-600">₨ {p.amount.toLocaleString()}</td>
                      <td className="py-3">{p.method.replace('_', ' ').toUpperCase()}</td>
                      <td className="py-3">{new Date(p.paidAt).toLocaleDateString()}</td>
                      <td className="py-3"><Badge variant="success">{p.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}