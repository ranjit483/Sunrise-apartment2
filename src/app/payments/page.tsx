'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { db } from '@/config/firebase'
import { collection, onSnapshot, query, where, doc, writeBatch, getDoc, getDocs, updateDoc, orderBy, limit } from 'firebase/firestore'
import { Payment, Invoice } from '@/types/models'
import { Loader2, DollarSign, Eye, Printer, FileText, QrCode, CheckCircle2, AlertCircle, Search } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { numberToWords } from '@/lib/utils'

// Approximation for 2026 AD -> 2083 BS Nepalese date
function getNepaliDate(dateStr: string | Date): { bs: string, ad: string } {
  const adDate = new Date(dateStr)
  if (isNaN(adDate.getTime())) return { bs: '2083-02-17', ad: '2026-05-31' }
  
  const adYear = adDate.getFullYear()
  const adMonth = adDate.getMonth()
  const adDay = adDate.getDate()
  
  let bsYear = adYear + 57
  let bsMonth = 1
  let bsDay = adDay
  
  const nepaliMonthNames = [
    'Baishakh', 'Jestha', 'Asadh', 'Shrawan', 'Bhadra', 'Ashwin', 
    'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
  ]
  
  if (adMonth === 0) {
    bsYear = adYear + 56
    bsMonth = adDay < 15 ? 9 : 10
    bsDay = adDay < 15 ? adDay + 16 : adDay - 14
  } else if (adMonth === 1) {
    bsYear = adYear + 56
    bsMonth = adDay < 13 ? 10 : 11
    bsDay = adDay < 13 ? adDay + 17 : adDay - 12
  } else if (adMonth === 2) {
    bsYear = adYear + 56
    bsMonth = adDay < 14 ? 11 : 12
    bsDay = adDay < 14 ? adDay + 16 : adDay - 13
  } else if (adMonth === 3) {
    bsMonth = adDay < 14 ? 12 : 1
    if (bsMonth === 12) bsYear = adYear + 56
    bsDay = adDay < 14 ? adDay + 17 : adDay - 13
  } else if (adMonth === 4) {
    bsMonth = adDay < 15 ? 1 : 2
    bsDay = adDay < 15 ? adDay + 17 : adDay - 14
  } else if (adMonth === 5) {
    bsMonth = adDay < 15 ? 2 : 3
    bsDay = adDay < 15 ? adDay + 17 : adDay - 14
  } else if (adMonth === 6) {
    bsMonth = adDay < 16 ? 3 : 4
    bsDay = adDay < 16 ? adDay + 16 : adDay - 15
  } else if (adMonth === 7) {
    bsMonth = adDay < 17 ? 4 : 5
    bsDay = adDay < 17 ? adDay + 15 : adDay - 16
  } else if (adMonth === 8) {
    bsMonth = adDay < 17 ? 5 : 6
    bsDay = adDay < 17 ? adDay + 15 : adDay - 16
  } else if (adMonth === 9) {
    bsMonth = adDay < 17 ? 6 : 7
    bsDay = adDay < 17 ? adDay + 15 : adDay - 16
  } else if (adMonth === 10) {
    bsMonth = adDay < 16 ? 7 : 8
    bsDay = adDay < 16 ? adDay + 15 : adDay - 15
  } else {
    bsMonth = adDay < 16 ? 8 : 9
    bsDay = adDay < 16 ? adDay + 15 : adDay - 15
  }
  
  const bsMonthStr = String(bsMonth).padStart(2, '0')
  const bsDayStr = String(bsDay).padStart(2, '0')
  const bsMonthName = nepaliMonthNames[bsMonth - 1]
  
  return {
    bs: `${bsYear}-${bsMonthStr}-${bsDayStr} (${bsMonthName} ${bsDay}, ${bsYear})`,
    ad: adDate.toLocaleDateString('en-NP', { year: 'numeric', month: 'short', day: 'numeric' })
  }
}

export default function PaymentsPage() {
  const { user, profile } = useAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [pendingInvoices, setPendingInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [isPaying, setIsPaying] = useState(false)

  // Receipt print states
  const [activeReceipt, setActiveReceipt] = useState<Payment | null>(null)
  const [receiptInvoice, setReceiptInvoice] = useState<Invoice | null>(null)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)

  // Single-Modal checkout wizard states
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [usersMap, setUsersMap] = useState<Record<string, string>>({})
  const [unitsMap, setUnitsMap] = useState<Record<string, string>>({})
  const [searchQuery, setSearchQuery] = useState('')

  const formatTenantName = (name: string | null | undefined, tenantId?: string) => {
    if (tenantId && usersMap[tenantId]) return usersMap[tenantId]
    return name || 'Unknown'
  }
  const [checkoutStep, setCheckoutStep] = useState<'statement' | 'online' | 'qr'>('statement')
  const [qrTransactionId, setQrTransactionId] = useState('')
  const [payAmount, setPayAmount] = useState('')

  useEffect(() => {
    if (!profile?.role) return;
    
    const isResident = profile.role === 'RESIDENT' || profile.role === 'TENANT' || profile.role === 'OWNER'
    const canManagePayments = profile.role === 'SUPER_ADMIN' || profile.role === 'MANAGER' || profile.role === 'ACCOUNTANT'

    let q = query(collection(db, 'payments'))
    if (canManagePayments) {
      q = query(collection(db, 'payments'), orderBy('createdAt', 'desc'))
    } else {
      q = query(collection(db, 'payments'), where('tenantId', '==', user?.uid || ''))
    }
    
    const unsubscribePayments = onSnapshot(q, (snapshot: any) => {
      const pData: Payment[] = []
      snapshot.forEach((doc: any) => pData.push(doc.data() as Payment))
      // Sort in JavaScript to guarantee it works without composite indexes
      pData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setPayments(pData)
      setLoading(false)
    }, (error: any) => {
      console.error('Error fetching payments:', error)
      setLoading(false)
    })

    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'))
        const map: Record<string, string> = {}
        const uMap: Record<string, string> = {}
        snap.forEach((doc: any) => {
          const data = doc.data()
          const nameToUse = data.fullName || data.name
          if (nameToUse) {
            map[data.uid || doc.id] = nameToUse
            uMap[data.uid || doc.id] = data.unitNumber || 'N/A'
          }
        })
        setUsersMap(map)
        setUnitsMap(uMap)
      } catch (err) {
        console.error('Error fetching users:', err)
      }
    }
    fetchUsers()

    // Fetch pending invoices
    let unsubscribeInvoices = () => {}
    if (isResident && user?.uid) {
      const invQ = query(collection(db, 'invoices'), where('tenantId', '==', user.uid))
      unsubscribeInvoices = onSnapshot(invQ, (snapshot: any) => {
        const iData: Invoice[] = []
        snapshot.forEach((doc: any) => {
          const inv = { id: doc.id, ...doc.data() } as Invoice
          if (inv.status === 'pending' || inv.status === 'partial' || inv.status === 'overdue') {
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
          if (inv.status === 'pending' || inv.status === 'partial' || inv.status === 'overdue') {
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

  const handlePayConfirm = async () => {
    if (!viewingInvoice) return
    if (checkoutStep === 'qr' && !qrTransactionId.trim()) {
      alert('Please enter the Fonepay Transaction ID to confirm your payment.')
      return
    }

    const invoiceTotal = viewingInvoice.amount + (viewingInvoice.electricityAmount || 0) + (viewingInvoice.generatorAmount || 0) + (viewingInvoice.utilityAmount || 0) + (viewingInvoice.waterAmount || 0) + (viewingInvoice.insuranceAmount || 0) + (viewingInvoice.dieselAmount || 0) + (viewingInvoice.structureMaintenanceAmount || 0) + (viewingInvoice.otherAmount || 0) + (viewingInvoice.previousPendingOutstandingDue || 0) + (viewingInvoice.latePenaltyAmount || 0)
    const prevPaid = viewingInvoice.paidAmount || 0
    const remainingTotal = invoiceTotal - prevPaid
    const parsedAmount = parseFloat(payAmount)

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid payment amount.')
      return
    }
    if (parsedAmount > remainingTotal) {
      alert(`Amount cannot exceed the remaining balance of Rs. ${remainingTotal.toLocaleString()}`)
      return
    }
    
    setIsPaying(true)
    try {
      const batch = writeBatch(db)
      
      const paymentRef = doc(collection(db, 'payments'))
      
      const generatedTrxId = 'TRX-' + Math.random().toString(36).substring(2, 10).toUpperCase()
      const transactionId = checkoutStep === 'qr' ? qrTransactionId.trim() : generatedTrxId
      
      const isResidentPayment = isResident
      
      const newPayment: any = {
        id: paymentRef.id,
        invoiceId: viewingInvoice.id,
        tenantId: viewingInvoice.tenantId || user?.uid || '',
        amount: parsedAmount,
        method: checkoutStep === 'qr' ? 'qr' : 'online',
        transactionId: transactionId,
        status: isResidentPayment ? 'pending_verification' : 'completed',
        createdAt: new Date().toISOString(),
        receiptNo: 'No.: ' + Math.floor(1000 + Math.random() * 9000),
        receivedFor: `Monthly Bill - ${viewingInvoice.month}`
      }

      if (!isResidentPayment) {
        newPayment.paidAt = new Date().toISOString()
      }

      batch.set(paymentRef, newPayment)

      if (!isResidentPayment) {
        const newPaidAmount = prevPaid + parsedAmount
        const newRemaining = invoiceTotal - newPaidAmount
        const newStatus = newRemaining <= 0 ? 'paid' : 'partial'

        // Update invoice status
        const invoiceRef = doc(db, 'invoices', viewingInvoice.id)
        batch.update(invoiceRef, {
          paidAmount: newPaidAmount,
          status: newStatus,
          updatedAt: new Date().toISOString()
        })
      }

      await batch.commit()
      
      // Close details dialog and reset inputs
      setIsInvoiceModalOpen(false)
      setQrTransactionId('')
      
      if (isResidentPayment) {
        alert('Your payment has been submitted and is awaiting Admin verification.')
      } else {
        // Show official printable receipt
        setReceiptInvoice(viewingInvoice)
        setActiveReceipt(newPayment)
        setIsReceiptModalOpen(true)
      }
    } catch (error: any) {
      console.error('Error confirming payment:', error)
      alert('Payment confirmation failed: ' + error.message)
    } finally {
      setIsPaying(false)
    }
  }

  const handleApprovePayment = async (payment: Payment) => {
    try {
      const invRef = doc(db, 'invoices', payment.invoiceId)
      const invSnap = await getDoc(invRef)
      if (!invSnap.exists()) {
        alert("Original invoice not found!")
        return
      }
      
      const invoice = invSnap.data() as Invoice
      const invoiceTotal = invoice.amount + (invoice.electricityAmount || 0) + (invoice.generatorAmount || 0) + (invoice.utilityAmount || 0) + (invoice.waterAmount || 0) + (invoice.insuranceAmount || 0) + (invoice.dieselAmount || 0) + (invoice.structureMaintenanceAmount || 0) + (invoice.otherAmount || 0) + (invoice.previousPendingOutstandingDue || 0) + (invoice.latePenaltyAmount || 0)
      const prevPaid = invoice.paidAmount || 0
      const newPaidAmount = prevPaid + payment.amount
      const newRemaining = invoiceTotal - newPaidAmount
      const newStatus = newRemaining <= 0 ? 'paid' : 'partial'
      
      const batch = writeBatch(db)
      
      batch.update(doc(db, 'payments', payment.id), {
        status: 'completed',
        paidAt: new Date().toISOString()
      })
      
      batch.update(invRef, {
        paidAmount: newPaidAmount,
        status: newStatus,
        updatedAt: new Date().toISOString()
      })
      
      await batch.commit()
      alert("Payment approved successfully!")
    } catch (error: any) {
      console.error('Error approving payment:', error)
      alert("Failed to approve payment: " + error.message)
    }
  }

  const handleRejectPayment = async (paymentId: string) => {
    if (!confirm("Are you sure you want to reject this payment? The resident will need to submit it again.")) return;
    try {
      await updateDoc(doc(db, 'payments', paymentId), {
        status: 'rejected',
        updatedAt: new Date().toISOString()
      })
      alert("Payment rejected.")
    } catch (error: any) {
      console.error('Error rejecting payment:', error)
      alert("Failed to reject payment: " + error.message)
    }
  }

  const handleOpenReceipt = async (payment: Payment) => {
    try {
      const invRef = doc(db, 'invoices', payment.invoiceId)
      const invSnap = await getDoc(invRef)
      if (invSnap.exists()) {
        setReceiptInvoice(invSnap.data() as Invoice)
      } else {
        setReceiptInvoice({
          id: payment.invoiceId,
          unitId: 'N/A',
          tenantId: payment.tenantId,
          unitNumber: 'N/A',
          tenantName: 'Resident',
          month: 'N/A',
          amount: payment.amount,
          dueDate: '',
          status: 'paid',
          createdAt: payment.createdAt,
          updatedAt: payment.createdAt
        })
      }
      setActiveReceipt(payment)
      setIsReceiptModalOpen(true)
    } catch (error: any) {
      console.error('Error loading receipt invoice:', error)
      alert('Failed to load receipt details: ' + error.message)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const isResident = profile?.role === 'RESIDENT' || profile?.role === 'TENANT' || profile?.role === 'OWNER'
  const totalCollected = payments.filter(p => p.status === 'completed').reduce((acc, p) => acc + p.amount, 0)
  
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  const thisMonthCollected = payments.filter(p => {
    if (p.status !== 'completed') return false
    const d = new Date(p.paidAt || p.createdAt)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  }).reduce((acc, p) => acc + p.amount, 0)

  const pendingTotal = pendingInvoices.reduce((acc, i) => acc + i.amount + (i.electricityAmount || 0) + (i.generatorAmount || 0) + (i.utilityAmount || 0) + (i.waterAmount || 0) + (i.insuranceAmount || 0) + (i.dieselAmount || 0) + (i.structureMaintenanceAmount || 0) + (i.otherAmount || 0) + (i.previousPendingOutstandingDue || 0) + (i.latePenaltyAmount || 0) - (i.paidAmount || 0), 0)
  const transactionsCount = payments.length

  const filteredPayments = payments.filter(p => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    const name = formatTenantName(null, p.tenantId).toLowerCase()
    const unit = (unitsMap[p.tenantId] || '').toLowerCase()
    const receipt = (p.receiptNo || '').toLowerCase()
    const method = (p.method || '').toLowerCase()
    const tx = (p.transactionId || '').toLowerCase()
    return name.includes(q) || unit.includes(q) || receipt.includes(q) || method.includes(q) || tx.includes(q)
  })

  return (
    <DashboardLayout title="Payments">
      <div className="space-y-6 no-print">
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
          <div className="grid gap-6 md:grid-cols-3 items-start">
            <Card className="border-red-200 md:col-span-2 shadow-sm">
              <CardHeader><CardTitle className="text-red-600 flex items-center gap-2">Pending Invoices</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingInvoices.map((inv) => {
                    const total = inv.amount + (inv.electricityAmount || 0) + (inv.generatorAmount || 0) + (inv.utilityAmount || 0) + (inv.waterAmount || 0) + (inv.insuranceAmount || 0) + (inv.dieselAmount || 0) + (inv.structureMaintenanceAmount || 0) + (inv.otherAmount || 0) + (inv.previousPendingOutstandingDue || 0) + (inv.latePenaltyAmount || 0)
                    return (
                      <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-red-50/50 gap-4">
                        <div>
                          <p className="font-semibold">Invoice for {inv.month}</p>
                          <p className="text-sm text-muted-foreground">Due Date: {inv.dueDate}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="font-bold text-lg text-indigo-700">₨ {total.toLocaleString()}</p>
                            {inv.paidAmount ? <p className="text-xs text-muted-foreground font-medium mb-1">Paid: ₨{inv.paidAmount.toLocaleString()}</p> : null}
                            <Badge variant={inv.status === 'partial' ? 'warning' : inv.status === 'overdue' ? 'destructive' : 'warning'} className={`uppercase font-semibold text-xs px-2 py-0.5 rounded-full ${inv.status === 'partial' ? 'bg-blue-100 text-blue-800' : ''}`}>{inv.status}</Badge>
                          </div>
                          <Button 
                            onClick={() => {
                              setViewingInvoice(inv)
                              setCheckoutStep('statement')
                              setIsInvoiceModalOpen(true)
                              const rem = total - (inv.paidAmount || 0)
                              setPayAmount(rem.toString())
                            }} 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            View & Pay Invoice
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Quick Fonepay Scan Card on Payments page itself */}
            <Card className="border-emerald-200 shadow-sm">
              <CardHeader className="pb-3 text-center">
                <CardTitle className="text-emerald-700 text-sm font-extrabold tracking-wide uppercase flex items-center justify-center gap-1.5">
                  <QrCode className="h-4 w-4 text-[#007F3E]" />
                  Quick Scan To Pay
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">Sunrise Apartment Welfare Society</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="border border-gray-200 p-2 rounded-xl bg-white shadow-sm mb-4 w-full max-w-[210px]">
                  <img 
                    src="/fonepay-qr.jpg?v=5" 
                    alt="Fonepay QR Code Card" 
                    className="w-full h-auto rounded-lg"
                  />
                </div>
                <div className="text-center text-[10px] text-gray-500 font-semibold space-y-1">
                  <p className="font-bold text-[#007F3E]">Kathmandu/Lalitpur MP</p>
                  <p>Terminal ID: 2222020001358874</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!isResident && payments.filter(p => p.status === 'pending_verification').length > 0 && (
          <Card className="border-amber-200 shadow-sm mb-6">
            <CardHeader className="bg-amber-50 border-b border-amber-100">
              <CardTitle className="text-amber-800 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Pending Verifications
              </CardTitle>
              <CardDescription className="text-amber-700">Resident payments waiting for your approval.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="overflow-x-auto overflow-y-hidden">
                <table className="w-full min-w-[800px] text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-3 text-left">Transaction ID</th>
                      <th className="pb-3 text-left">Tenant ID</th>
                      <th className="pb-3 text-left">Amount</th>
                      <th className="pb-3 text-left">Method</th>
                      <th className="pb-3 text-left">Date (AD)</th>
                      <th className="pb-3 text-left">Status</th>
                      <th className="pb-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.filter(p => p.status === 'pending_verification').map((p) => (
                      <tr key={p.id} className="border-b hover:bg-amber-50/30">
                        <td className="py-3 font-mono text-xs">{p.transactionId || p.id.substring(0, 10).toUpperCase()}</td>
                        <td className="py-3 font-mono text-xs">{p.tenantId.substring(0, 10)}...</td>
                        <td className="py-3 font-bold text-emerald-600">₨ {p.amount.toLocaleString()}</td>
                        <td className="py-3 font-semibold text-xs uppercase text-indigo-700">{p.method.replace('_', ' ')}</td>
                        <td className="py-3">{getNepaliDate(p.createdAt).ad}</td>
                        <td className="py-3">
                          <Badge variant="warning" className="uppercase font-semibold text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            PENDING VERIFICATION
                          </Badge>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleApprovePayment(p)}>
                              Approve
                            </Button>
                            <Button size="sm" variant="destructive" className="h-8" onClick={() => handleRejectPayment(p.id)}>
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle>Payment History</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search payments..."
                className="pl-8 bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : filteredPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No payment history found.</div>
            ) : (
              <div className="overflow-x-auto overflow-y-hidden">
                <table className="w-full min-w-[800px] text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-3 text-left">Receipt Number</th>
                      <th className="pb-3 text-left">Transaction ID</th>
                      {!isResident && <th className="pb-3 text-left">Tenant Details</th>}
                      <th className="pb-3 text-left">Amount</th>
                      <th className="pb-3 text-left">Method</th>
                      <th className="pb-3 text-left">Date (AD)</th>
                      <th className="pb-3 text-left">Status</th>
                      <th className="pb-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPayments.map((p) => (
                      <tr key={p.id} className="border-b hover:bg-gray-50/50">
                        <td className="py-3 font-semibold text-gray-700">{p.receiptNo || 'N/A'}</td>
                        <td className="py-3 font-mono text-xs">{p.transactionId || p.id.substring(0, 10).toUpperCase()}</td>
                        {!isResident && (
                          <td className="py-3">
                            <div className="font-medium">{formatTenantName(null, p.tenantId)}</div>
                            <div className="text-xs text-muted-foreground">Unit: {unitsMap[p.tenantId] || 'N/A'}</div>
                          </td>
                        )}
                        <td className="py-3 font-bold text-emerald-600">₨ {p.amount.toLocaleString()}</td>
                        <td className="py-3 font-semibold text-xs uppercase text-indigo-700">{p.method.replace('_', ' ')}</td>
                        <td className="py-3">{getNepaliDate(p.paidAt || p.createdAt).ad}</td>
                        <td className="py-3">
                          <Badge 
                            variant={p.status === 'completed' ? 'success' : p.status === 'rejected' ? 'destructive' : 'warning'} 
                            className={`uppercase font-semibold text-xs px-2 py-0.5 rounded-full ${
                              p.status === 'completed' ? 'bg-green-100 text-green-800' :
                              p.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {p.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0" 
                            onClick={() => handleOpenReceipt(p)} 
                            title="View/Print Receipt"
                          >
                            <FileText className="h-4 w-4 text-emerald-600 hover:text-emerald-800" />
                          </Button>
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

      {/* RENDER FOR PRINT MODE ONLY */}
      <div className="hidden print:block print-area">
        {activeReceipt && receiptInvoice && (
          <div className="bg-white w-full h-full p-2 max-w-[650px] mx-auto text-black border border-black rounded-sm print-sheet shadow-none flex flex-col justify-between">
            <div>
              <div className="border-b-2 border-black pb-1 mb-2 text-center">
              <h1 className="text-xl font-black tracking-tight text-gray-950">SUNRISE APARTMENT WELFARE SOCIETY</h1>
              <p className="text-[10px] font-semibold text-gray-600">Nakkhu-13, Lalitpur, Phone: 01-5185110</p>
              <div className="inline-block border border-black px-2 py-0.5 rounded-sm bg-gray-50 text-[9px] font-bold mt-1 tracking-widest uppercase">
                OFFICIAL PAYMENT RECEIPT SLIP
              </div>
            </div>

            <div className="flex justify-between items-center text-xs mb-2 px-2">
              <div><strong>Receipt No:</strong> <span className="font-mono font-bold text-sm text-indigo-700">{activeReceipt.receiptNo}</span></div>
              <div className="text-right"><strong>Date:</strong> <span className="font-bold">{getNepaliDate(activeReceipt.createdAt).ad} ({getNepaliDate(activeReceipt.createdAt).bs.split(' (')[0]})</span></div>
            </div>

            <div className="border border-black p-3 rounded-sm bg-gray-50/50 space-y-2 text-xs text-gray-900 relative overflow-hidden leading-snug">
              <div>
                Received with thanks from Mr./Mrs./Ms. <strong className="text-sm underline px-1 text-gray-950 font-bold">{formatTenantName(receiptInvoice.tenantName, receiptInvoice.tenantId)}</strong>, 
                Unit No. <strong className="underline px-1 text-gray-950 font-bold">{receiptInvoice.unitNumber}</strong>, a total sum of 
                Rupees <strong className="underline px-1 text-gray-950 font-bold text-sm">{numberToWords(activeReceipt.amount).replace(' Rupees Only', '')}</strong> 
                Only, on account of <strong className="underline px-1 text-gray-950">{activeReceipt.receivedFor || 'Monthly Invoices'}</strong> 
                for the billing period of <strong className="underline px-1 font-bold">{receiptInvoice.month}</strong>.
              </div>

              <div className="grid grid-cols-2 gap-2 border-t pt-2 mt-1">
                <div><strong>Payment Mode:</strong> <span className="font-bold uppercase text-indigo-600">{activeReceipt.method}</span></div>
                <div className="text-right"><strong>Status:</strong> <span className={`font-bold uppercase ${activeReceipt.status === 'pending_verification' ? 'text-amber-600' : 'text-emerald-600'}`}>{activeReceipt.status === 'pending_verification' ? 'PENDING VERIFICATION' : 'COMPLETED'}</span></div>
                
                {activeReceipt.method === 'cheque' && (
                  <>
                    <div><strong>Cheque No:</strong> <span className="font-bold">{activeReceipt.chequeNumber}</span></div>
                    <div className="text-right"><strong>Bank Name:</strong> <span className="font-bold uppercase">{activeReceipt.bankName}</span></div>
                  </>
                )}
                {activeReceipt.method === 'qr' && (
                  <div className="col-span-2"><strong>Trans ID:</strong> <span className="font-mono text-[10px] font-bold text-indigo-800">{activeReceipt.transactionId}</span></div>
                )}
              </div>
            </div>
            </div>

            <div className="flex justify-between items-end mt-2 pt-1">
              <div className="border border-black bg-gray-100 px-3 py-1.5 text-center rounded-sm">
                <span className="text-[9px] text-gray-600 block uppercase font-bold">Total Amount Paid</span>
                <strong className="text-base font-black text-gray-950 font-mono">₨ {activeReceipt.amount.toLocaleString()}.00</strong>
              </div>

              <div className="text-center w-36">
                <div className="border-b border-black h-8 w-full mx-auto"></div>
                <p className="text-[9px] font-bold uppercase mt-1 text-gray-600">Authorized Signature</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SINGLE UNIFIED BILL STATEMENT & CHECKOUT WIZARD MODAL */}
      <Dialog open={isInvoiceModalOpen} onOpenChange={setIsInvoiceModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto font-sans p-6 text-black no-print">
          {viewingInvoice && (
            <div className="space-y-4 pt-2">
              {checkoutStep === 'statement' ? (
                /* STEP 1: BILL SHEET STATEMENT */
                <div className="bg-white p-6 border rounded-md shadow-sm relative leading-relaxed text-xs">
                  <div className="border-b pb-3 mb-4 text-center">
                    <h1 className="text-lg font-black tracking-tight text-gray-900">SUNRISE APARTMENT WELFARE SOCIETY</h1>
                    <p className="text-[10px] font-semibold text-gray-600">Nakkhu-13, Lalitpur, Phone: 01-5185110</p>
                    <div className="inline-block border border-black px-2 py-0.5 rounded-sm bg-gray-50 text-[9px] font-bold mt-1 tracking-widest uppercase text-gray-800">
                      MONTHLY BILL SHEET STATEMENT
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4 text-xs font-semibold px-1">
                    <div><strong>Invoice Number:</strong> <span className="font-mono">{viewingInvoice.id.substring(0, 8).toUpperCase()}</span></div>
                    <div className="text-right"><strong>Billing period:</strong> <span className="uppercase">{viewingInvoice.month}</span></div>
                    <div><strong>Owner/Tenant:</strong> {viewingInvoice.tenantName || 'Resident'}</div>
                    <div className="text-right"><strong>Unit No:</strong> {viewingInvoice.unitNumber || 'N/A'}</div>
                    <div><strong>Status:</strong> <span className="uppercase text-red-600 font-extrabold">{viewingInvoice.status}</span></div>
                    <div className="text-right"><strong>Due Date:</strong> {viewingInvoice.dueDate}</div>
                  </div>

                  <table className="w-full text-xs border-collapse border border-black mb-5">
                    <thead>
                      <tr className="bg-gray-100 font-bold border-b border-black text-[10px] uppercase text-gray-950">
                        <th className="border border-black p-2 text-center w-10">S.N.</th>
                        <th className="border border-black p-2 text-left">Particulars & Service Details</th>
                        <th className="border border-black p-2 text-right w-32">Amount (₨)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-black">
                        <td className="border border-black p-2 text-center">1.</td>
                        <td className="border border-black p-2">
                          <div><strong>Electricity Charge Including Usage Pool</strong></div>
                          {viewingInvoice.electricityReading ? (
                            <span className="text-[10px] text-gray-600">Current Reading: {viewingInvoice.electricityReading} units (Rate: Rs. 16.80/unit)</span>
                          ) : (
                            <span className="text-[10px] text-gray-600">Meter usage and society power backup</span>
                          )}
                        </td>
                        <td className="border border-black p-2 text-right font-medium">₨ {(viewingInvoice.electricityAmount || 0).toLocaleString()}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border border-black p-2 text-center">2.</td>
                        <td className="border border-black p-2">
                          <div><strong>Backup (Generator / DG meter flat fee)</strong></div>
                          <span className="text-[10px] text-gray-600">Diesel generator standby charge</span>
                        </td>
                        <td className="border border-black p-2 text-right font-medium">₨ 500</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border border-black p-2 text-center">3.</td>
                        <td className="border border-black p-2">
                          <div><strong>Diesel Cost Sharing Standby pool</strong></div>
                          <span className="text-[10px] text-gray-600">Diesel standby maintenance pool sharing</span>
                        </td>
                        <td className="border border-black p-2 text-right font-medium">₨ {(viewingInvoice.dieselAmount || 0).toLocaleString()}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border border-black p-2 text-center">4.</td>
                        <td className="border border-black p-2">
                          <div><strong>Structure/ Maintenance Charge</strong></div>
                          <span className="text-[10px] text-gray-600">Monthly per Sq Ft Basis Bill</span>
                        </td>
                        <td className="border border-black p-2 text-right font-medium">₨ {(viewingInvoice.structureMaintenanceAmount || 0).toLocaleString()}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border border-black p-2 text-center">5.</td>
                        <td className="border border-black p-2">
                          <div><strong>Water Supply & Society Maintenance</strong></div>
                          <span className="text-[10px] text-gray-600">Fixed monthly supply & cleaning pool fee</span>
                        </td>
                        <td className="border border-black p-2 text-right font-medium">₨ {(viewingInvoice.waterAmount || 0).toLocaleString()}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border border-black p-2 text-center">6.</td>
                        <td className="border border-black p-2">
                          <div><strong>Apartment Structure Insurance Contribution</strong></div>
                          <span className="text-[10px] text-gray-600">Welfare pool contribution (Rs 6.20 per Sq Ft)</span>
                        </td>
                        <td className="border border-black p-2 text-right font-medium">₨ {(viewingInvoice.insuranceAmount || 0).toLocaleString()}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border border-black p-2 text-center">7.</td>
                        <td className="border border-black p-2">
                          <div><strong>Other Charges</strong></div>
                          <span className="text-[10px] text-gray-600">Miscellaneous fees</span>
                        </td>
                        <td className="border border-black p-2 text-right font-medium">₨ {(viewingInvoice.otherAmount || 0).toLocaleString()}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border border-black p-2 text-center">8.</td>
                        <td className="border border-black p-2">
                          <div><strong>Previous Pending Outstanding Due</strong></div>
                          <span className="text-[10px] text-gray-600">Brought forward balance from previous cycles</span>
                        </td>
                        <td className="border border-black p-2 text-right font-medium">₨ {(viewingInvoice.previousPendingOutstandingDue || 0).toLocaleString()}</td>
                      </tr>
                      <tr className="border-b border-black">
                        <td className="border border-black p-2 text-center">9.</td>
                        <td className="border border-black p-2">
                          <div><strong>Society Delay / Late Penalty Surcharges</strong></div>
                          <span className="text-[10px] text-gray-600">Applied delay penalty</span>
                        </td>
                        <td className="border border-black p-2 text-right font-medium">₨ {(viewingInvoice.latePenaltyAmount || 0).toLocaleString()}</td>
                      </tr>
                      {viewingInvoice.amount > 0 && (
                        <tr className="border-b border-black">
                          <td className="border border-black p-2 text-center">10.</td>
                          <td className="border border-black p-2">
                            <div><strong>Basic Unit Service Charge</strong></div>
                            <span className="text-[10px] text-gray-600">Apartment basic rent amount</span>
                          </td>
                          <td className="border border-black p-2 text-right font-medium">₨ {viewingInvoice.amount.toLocaleString()}</td>
                        </tr>
                      )}
                      <tr className="bg-gray-100 font-extrabold text-[13px] border-t border-black text-gray-950">
                        <td colSpan={2} className="border border-black p-2 text-right uppercase tracking-wider">Grand Total:</td>
                        <td className="border border-black p-2 text-right font-black">
                          ₨ {(viewingInvoice.amount + (viewingInvoice.electricityAmount || 0) + (viewingInvoice.generatorAmount || 0) + (viewingInvoice.utilityAmount || 0) + (viewingInvoice.waterAmount || 0) + (viewingInvoice.insuranceAmount || 0) + (viewingInvoice.dieselAmount || 0) + (viewingInvoice.structureMaintenanceAmount || 0) + (viewingInvoice.otherAmount || 0) + (viewingInvoice.previousPendingOutstandingDue || 0) + (viewingInvoice.latePenaltyAmount || 0)).toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="border border-black p-3 rounded-sm bg-gray-50 text-[11px] mb-5">
                    <strong className="text-[9px] uppercase text-gray-600 block mb-0.5">Amount in Words:</strong>
                    <div className="font-bold text-gray-900 text-xs">
                      {numberToWords(viewingInvoice.amount + (viewingInvoice.electricityAmount || 0) + (viewingInvoice.generatorAmount || 0) + (viewingInvoice.utilityAmount || 0) + (viewingInvoice.waterAmount || 0) + (viewingInvoice.insuranceAmount || 0) + (viewingInvoice.dieselAmount || 0) + (viewingInvoice.structureMaintenanceAmount || 0) + (viewingInvoice.otherAmount || 0) + (viewingInvoice.previousPendingOutstandingDue || 0) + (viewingInvoice.latePenaltyAmount || 0))}
                    </div>
                  </div>

                  {/* Interactive Payment Choice Block */}
                  {viewingInvoice.status !== 'paid' && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center space-y-3 mt-6">
                      <p className="text-xs text-indigo-900 font-bold flex items-center justify-center gap-1.5">
                        <AlertCircle className="h-4 w-4 text-indigo-700" />
                        Download/View Completed. Select your secure payment method below:
                      </p>
                      <div className="flex flex-wrap justify-center gap-3">

                        <Button
                          onClick={() => setCheckoutStep('qr')}
                          className="bg-[#007F3E] hover:bg-[#00602F] text-white font-bold px-4 py-2 text-xs rounded-lg flex items-center gap-2"
                        >
                          <QrCode className="h-4.5 w-4.5" />
                          Pay via Fonepay QR Code
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : checkoutStep === 'qr' ? (
                /* STEP 2A: FONEPAY QR CHECKOUT VIEW */
                <div className="bg-white p-6 border rounded-md shadow-sm space-y-4 max-w-lg mx-auto leading-relaxed">
                  <div className="border-b pb-2 mb-2">
                    <h2 className="text-base font-bold text-gray-900">Fonepay QR Scan & Pay</h2>
                    <p className="text-[10px] text-gray-500">Scan the official society welfare QR code card below to process.</p>
                  </div>

                  <div className="bg-gray-50 border rounded-lg p-3 text-center">
                    <span className="text-[9px] text-gray-500 uppercase font-bold block">Grand Total Due</span>
                    <strong className="text-lg font-mono text-[#007F3E]">
                      ₨ {(viewingInvoice.amount + (viewingInvoice.electricityAmount || 0) + (viewingInvoice.generatorAmount || 0) + (viewingInvoice.utilityAmount || 0) + (viewingInvoice.waterAmount || 0) + (viewingInvoice.insuranceAmount || 0) + (viewingInvoice.dieselAmount || 0) + (viewingInvoice.structureMaintenanceAmount || 0) + (viewingInvoice.otherAmount || 0) + (viewingInvoice.previousPendingOutstandingDue || 0) + (viewingInvoice.latePenaltyAmount || 0) - (viewingInvoice.paidAmount || 0)).toLocaleString()}.00
                    </strong>
                    <span className="text-[9px] text-gray-400 block mt-0.5">Billing Period: {viewingInvoice.month}</span>
                  </div>

                  {/* High Quality Fonepay QR card image container */}
                  <div className="border border-gray-200 p-2.5 rounded-xl bg-white shadow-sm flex flex-col items-center">
                    <img 
                      src="/fonepay-qr.jpg?v=6" 
                      alt="Fonepay QR Code Card" 
                      className="w-full max-w-[230px] h-auto rounded-lg border shadow-sm"
                    />
                    <div className="text-center text-[9px] text-gray-500 font-bold mt-2 space-y-0.5">
                      <p className="text-[#007F3E] text-xs">Kathmandu/Lalitpur MP</p>
                      <p className="font-mono text-gray-600">Terminal ID: 2222020001358874</p>
                    </div>
                  </div>

                  <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-3.5 space-y-1.5 text-emerald-900 text-xs">
                    <p className="font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                      Payment Steps:
                    </p>
                    <ol className="list-decimal pl-4 space-y-0.5 text-[10px]">
                      <li>Open your mobile banking app or digital wallet (eSewa, Fonepay, Khalti).</li>
                      <li>Scan the QR code card above or upload from your gallery.</li>
                      <li>Initiate payment for your desired amount.</li>
                    </ol>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-700 block">Pay Amount (Rs.) *</label>
                      <input 
                        type="number"
                        placeholder="e.g. 5000" 
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-700 block">Fonepay Transaction ID *</label>
                      <input 
                        type="text" 
                        placeholder="e.g. FPN-9824892A" 
                        value={qrTransactionId}
                        onChange={(e) => setQrTransactionId(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono font-bold uppercase"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-3 border-t">
                    <Button
                      onClick={() => setCheckoutStep('statement')}
                      variant="outline"
                      className="flex-1 font-bold text-xs"
                    >
                      ← Back to Invoice
                    </Button>
                    <Button
                      onClick={handlePayConfirm}
                      disabled={isPaying}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      {isPaying ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
                      Confirm QR Payment
                    </Button>
                  </div>
                </div>
              ) : (
                /* STEP 2B: ONLINE PAYMENT PORTAL GATEWAY SIMULATION */
                <div className="bg-white p-6 border rounded-md shadow-sm space-y-4 max-w-lg mx-auto leading-relaxed">
                  <div className="border-b pb-2 mb-2">
                    <h2 className="text-base font-bold text-gray-900">Secure Online Payment Portal</h2>
                    <p className="text-[10px] text-gray-500">Integrated eSewa, Khalti, or ConnectIPS secure debit.</p>
                  </div>

                  <div className="bg-gray-50 border rounded-lg p-3 text-center">
                    <span className="text-[9px] text-gray-500 uppercase font-bold block">Grand Total Due</span>
                    <strong className="text-lg font-mono text-indigo-700">
                      ₨ {(viewingInvoice.amount + (viewingInvoice.electricityAmount || 0) + (viewingInvoice.generatorAmount || 0) + (viewingInvoice.utilityAmount || 0) + (viewingInvoice.waterAmount || 0) + (viewingInvoice.insuranceAmount || 0) + (viewingInvoice.dieselAmount || 0) + (viewingInvoice.structureMaintenanceAmount || 0) + (viewingInvoice.otherAmount || 0) + (viewingInvoice.previousPendingOutstandingDue || 0) + (viewingInvoice.latePenaltyAmount || 0) - (viewingInvoice.paidAmount || 0)).toLocaleString()}.00
                    </strong>
                    <span className="text-[9px] text-gray-400 block mt-0.5">Billing Period: {viewingInvoice.month}</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-700 block">Pay Amount (Rs.) *</label>
                    <input 
                      type="number"
                      placeholder="e.g. 5000" 
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring font-mono font-bold"
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center space-y-2">
                    <p className="text-[11px] text-blue-900 font-semibold">
                      This represents an integrated eSewa, Khalti, or ConnectIPS online gateway portal.
                    </p>
                    <p className="text-[10px] text-blue-700">
                      Funds will be securely debited from your linked bank account.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-3 border-t">
                    <Button
                      onClick={() => setCheckoutStep('statement')}
                      variant="outline"
                      className="flex-1 font-bold text-xs"
                    >
                      ← Back to Invoice
                    </Button>
                    <Button
                      onClick={handlePayConfirm}
                      disabled={isPaying}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                    >
                      {isPaying ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
                      Complete Online Payment
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PAYMENT RECEIPTS SLIP MODAL */}
      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto no-print">
          <DialogHeader className="border-b pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle>View Payment Receipt Slip</DialogTitle>
              <Button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2 h-8 text-xs">
                <Printer className="h-3.5 w-3.5" />
                Print Receipt Slip (Slip format)
              </Button>
            </div>
          </DialogHeader>

          {activeReceipt && receiptInvoice && (
            <div className="bg-white p-6 text-black border rounded-md shadow-inner my-2 font-sans relative max-w-[600px] mx-auto">
              <div className="border-b pb-3 mb-4 text-center">
                <h1 className="text-lg font-black tracking-tight text-gray-900">SUNRISE APARTMENT WELFARE SOCIETY</h1>
                <p className="text-[10px] font-semibold text-gray-600">Nakkhu-13, Lalitpur, Phone: 01-5185110</p>
                <div className="inline-block border border-black px-2 py-0.5 rounded-sm bg-gray-50 text-[9px] font-bold mt-1 tracking-widest uppercase text-gray-800">
                  OFFICIAL PAYMENT RECEIPT SLIP
                </div>
              </div>

              <div className="flex justify-between items-center text-xs mb-4 px-1">
                <div><strong>Receipt No:</strong> <span className="font-mono font-bold text-sm text-indigo-700">{activeReceipt.receiptNo}</span></div>
                <div className="text-right"><strong>Date:</strong> <span className="font-bold">{getNepaliDate(activeReceipt.createdAt).ad} ({getNepaliDate(activeReceipt.createdAt).bs.split(' (')[0]})</span></div>
              </div>

              <div className="border border-black p-4 rounded-sm bg-gray-50/50 space-y-3 text-xs text-gray-900 relative overflow-hidden leading-relaxed">
                <div>
                  Received with thanks from Mr./Mrs./Ms. <strong className="underline px-1 text-gray-950 font-bold">{formatTenantName(receiptInvoice.tenantName, receiptInvoice.tenantId)}</strong>, 
                  Unit No. <strong className="underline px-1 text-gray-950 font-bold">{receiptInvoice.unitNumber || 'N/A'}</strong>, a total sum of 
                  Rupees <strong className="underline px-1 text-gray-950 font-bold text-xs">{numberToWords(activeReceipt.amount).replace(' Rupees Only', '')}</strong> 
                  Only, on account of <strong className="underline px-1 text-gray-950">{activeReceipt.receivedFor || 'Monthly Invoices'}</strong> 
                  for the billing period of <strong className="underline px-1 font-bold">{receiptInvoice.month}</strong>.
                </div>

                <div className="grid grid-cols-2 gap-2 border-t pt-2.5 mt-1.5">
                  <div><strong>Payment Mode:</strong> <span className="font-bold uppercase text-indigo-600">{activeReceipt.method}</span></div>
                  <div className="text-right"><strong>Status:</strong> <span className={`font-bold uppercase ${activeReceipt.status === 'pending_verification' ? 'text-amber-600' : 'text-emerald-600'}`}>{activeReceipt.status === 'pending_verification' ? 'PENDING VERIFICATION' : 'COMPLETED'}</span></div>
                  
                  {activeReceipt.method === 'cheque' && (
                    <>
                      <div><strong>Cheque No:</strong> <span className="font-bold">{activeReceipt.chequeNumber}</span></div>
                      <div className="text-right"><strong>Bank Name:</strong> <span className="font-bold uppercase">{activeReceipt.bankName}</span></div>
                    </>
                  )}
                  {activeReceipt.method === 'qr' && (
                    <div className="col-span-2"><strong>Transaction ID:</strong> <span className="font-mono font-bold text-indigo-800">{activeReceipt.transactionId}</span></div>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center mt-5 pt-3">
                <div className="border border-black bg-gray-100 px-4 py-2 text-center rounded-sm">
                  <span className="text-[9px] text-gray-600 block uppercase font-bold">Total Amount Paid</span>
                  <strong className="text-base font-black text-gray-900 font-mono">₨ {activeReceipt.amount.toLocaleString()}.00</strong>
                </div>

                <div className="text-center w-36">
                  <div className="border-b border-black h-8 w-full mx-auto"></div>
                  <p className="text-[9px] font-bold uppercase mt-1 text-gray-600">Authorized Signature</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}