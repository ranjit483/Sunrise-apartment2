'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { db } from '@/config/firebase'
import { collection, onSnapshot, query, orderBy, where, doc, writeBatch, getDoc, getDocs } from 'firebase/firestore'
import { Payment, Invoice } from '@/types/models'
import { Loader2, DollarSign, Eye, Printer, FileText } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
  const [isPaying, setIsPaying] = useState<string | null>(null)

  // Dialog and receipt print states
  const [activeReceipt, setActiveReceipt] = useState<Payment | null>(null)
  const [receiptInvoice, setReceiptInvoice] = useState<Invoice | null>(null)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)

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
      
      const newPayment: Payment = {
        id: paymentRef.id,
        invoiceId: invoice.id,
        tenantId: invoice.tenantId,
        amount: totalAmount,
        method: 'online',
        transactionId: 'TRX-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        status: 'completed',
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        receiptNo: 'No.: ' + Math.floor(1000 + Math.random() * 9000),
        receivedFor: `Monthly Bill - ${invoice.month}`
      }

      batch.set(paymentRef, newPayment)

      // Update invoice status
      const invoiceRef = doc(db, 'invoices', invoice.id)
      batch.update(invoiceRef, {
        status: 'paid',
        updatedAt: new Date().toISOString()
      })

      await batch.commit()
      
      // Set to view/print receipt
      setReceiptInvoice(invoice)
      setActiveReceipt(newPayment)
      setIsReceiptModalOpen(true)
    } catch (error: any) {
      console.error('Error processing payment:', error)
      alert('Payment failed: ' + error.message)
    } finally {
      setIsPaying(null)
    }
  }

  const handleOpenReceipt = async (payment: Payment) => {
    try {
      const invRef = doc(db, 'invoices', payment.invoiceId)
      const invSnap = await getDoc(invRef)
      if (invSnap.exists()) {
        setReceiptInvoice(invSnap.data() as Invoice)
      } else {
        // Mock fallback if invoice was deleted
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
                          <p className="font-bold text-lg text-indigo-700">₨ {total.toLocaleString()}</p>
                          <Badge variant="warning" className="uppercase font-semibold text-xs px-2 py-0.5 rounded-full">{inv.status}</Badge>
                        </div>
                        <Button 
                          onClick={() => handlePayInvoice(inv)} 
                          disabled={isPaying === inv.id} 
                          className="bg-[#95DBAE] text-[#1E293B] hover:bg-[#7BC98E] font-semibold"
                        >
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
              <div className="overflow-x-auto overflow-y-hidden">
                <table className="w-full min-w-[800px] text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-3 text-left">Receipt Number</th>
                      <th className="pb-3 text-left">Transaction ID</th>
                      {!isResident && <th className="pb-3 text-left">Tenant ID</th>}
                      <th className="pb-3 text-left">Amount</th>
                      <th className="pb-3 text-left">Method</th>
                      <th className="pb-3 text-left">Date (AD)</th>
                      <th className="pb-3 text-left">Status</th>
                      <th className="pb-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="border-b hover:bg-gray-50/50">
                        <td className="py-3 font-semibold text-gray-700">{p.receiptNo || 'N/A'}</td>
                        <td className="py-3 font-mono text-xs">{p.transactionId || p.id.substring(0, 10).toUpperCase()}</td>
                        {!isResident && <td className="py-3 font-mono text-xs">{p.tenantId.substring(0, 10)}...</td>}
                        <td className="py-3 font-bold text-emerald-600">₨ {p.amount.toLocaleString()}</td>
                        <td className="py-3 font-semibold text-xs uppercase text-indigo-700">{p.method.replace('_', ' ')}</td>
                        <td className="py-3">{getNepaliDate(p.paidAt || p.createdAt).ad}</td>
                        <td className="py-3">
                          <Badge variant="success" className="bg-green-100 text-green-800 uppercase font-semibold text-xs px-2 py-0.5 rounded-full">
                            {p.status}
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
      <div className="hidden print-area block">
        {activeReceipt && receiptInvoice && (
          <div className="bg-white p-6 max-w-[650px] mx-auto text-black border border-black rounded-sm print-sheet shadow-none">
            <div className="border-b pb-3 mb-4 text-center">
              <h1 className="text-xl font-black tracking-tight text-gray-950">SUNRISE APARTMENT WELFARE SOCIETY</h1>
              <p className="text-[11px] font-semibold text-gray-600">Nakkhu-13, Lalitpur, Phone: 01-5185110</p>
              <div className="inline-block border border-black px-2 py-0.5 rounded-sm bg-gray-50 text-[10px] font-bold mt-1.5 tracking-widest uppercase">
                OFFICIAL PAYMENT RECEIPT SLIP
              </div>
            </div>

            <div className="flex justify-between items-center text-xs mb-4 px-2">
              <div><strong>Receipt No:</strong> <span className="font-mono font-bold text-sm text-indigo-700">{activeReceipt.receiptNo}</span></div>
              <div className="text-right"><strong>Date:</strong> <span className="font-bold">{getNepaliDate(activeReceipt.createdAt).ad} ({getNepaliDate(activeReceipt.createdAt).bs.split(' (')[0]})</span></div>
            </div>

            <div className="border border-black p-4 rounded-sm bg-gray-50/50 space-y-3.5 text-xs text-gray-900 relative overflow-hidden leading-relaxed">
              <div>
                Received with thanks from Mr./Mrs./Ms. <strong className="text-sm underline px-1 text-gray-950 font-bold">{receiptInvoice.tenantName}</strong>, 
                Unit No. <strong className="underline px-1 text-gray-950 font-bold">{receiptInvoice.unitNumber}</strong>, a total sum of 
                Rupees <strong className="underline px-1 text-gray-950 font-bold text-sm">{numberToWords(activeReceipt.amount).replace(' Rupees Only', '')}</strong> 
                Only, on account of <strong className="underline px-1 text-gray-950">{activeReceipt.receivedFor || 'Monthly Invoices'}</strong> 
                for the billing period of <strong className="underline px-1 font-bold">{receiptInvoice.month}</strong>.
              </div>

              <div className="grid grid-cols-2 gap-4 border-t pt-3 mt-2">
                <div><strong>Payment Mode:</strong> <span className="font-bold uppercase text-indigo-600">{activeReceipt.method}</span></div>
                <div className="text-right"><strong>Status:</strong> <span className="font-bold uppercase text-emerald-600">COMPLETED</span></div>
                
                {activeReceipt.method === 'cheque' && (
                  <>
                    <div><strong>Cheque No:</strong> <span className="font-bold">{activeReceipt.chequeNumber}</span></div>
                    <div className="text-right"><strong>Bank Name:</strong> <span className="font-bold uppercase">{activeReceipt.bankName}</span></div>
                  </>
                )}
                {activeReceipt.method === 'qr' && (
                  <div className="col-span-2"><strong>Trans ID:</strong> <span className="font-mono text-[11px] font-bold text-indigo-800">{activeReceipt.transactionId}</span></div>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center mt-6 pt-4">
              <div className="border border-black bg-gray-100 px-4 py-2 text-center rounded-sm">
                <span className="text-[10px] text-gray-600 block uppercase font-bold">Total Amount Paid</span>
                <strong className="text-lg font-black text-gray-950 font-mono">₨ {activeReceipt.amount.toLocaleString()}.00</strong>
              </div>

              <div className="text-center w-40">
                <div className="border-b border-black h-10 w-full mx-auto"></div>
                <p className="text-[10px] font-bold uppercase mt-1 text-gray-600">Authorized Signature</p>
              </div>
            </div>
          </div>
        )}
      </div>

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
                  Received with thanks from Mr./Mrs./Ms. <strong className="underline px-1 text-gray-950 font-bold">{receiptInvoice.tenantName}</strong>, 
                  Unit No. <strong className="underline px-1 text-gray-950 font-bold">{receiptInvoice.unitNumber}</strong>, a total sum of 
                  Rupees <strong className="underline px-1 text-gray-950 font-bold text-xs">{numberToWords(activeReceipt.amount).replace(' Rupees Only', '')}</strong> 
                  Only, on account of <strong className="underline px-1 text-gray-950">{activeReceipt.receivedFor || 'Monthly Invoices'}</strong> 
                  for the billing period of <strong className="underline px-1 font-bold">{receiptInvoice.month}</strong>.
                </div>

                <div className="grid grid-cols-2 gap-2 border-t pt-2.5 mt-1.5">
                  <div><strong>Payment Mode:</strong> <span className="font-bold uppercase text-indigo-600">{activeReceipt.method}</span></div>
                  <div className="text-right"><strong>Status:</strong> <span className="font-bold uppercase text-emerald-600">COMPLETED</span></div>
                  
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