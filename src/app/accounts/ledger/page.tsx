'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { collection, query, where, onSnapshot, getDocs, orderBy, writeBatch, doc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { Invoice, Payment } from '@/types/models'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Download, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface UserData {
  uid: string
  fullName: string
  role: string
  unitNumber?: string
}

interface LedgerEntry {
  id: string
  date: string
  type: 'invoice' | 'payment'
  description: string
  debit: number
  credit: number
  balance: number
  status: string
  timestamp: string
}

export default function TenantLedgerPage() {
  const formatTenantName = (name?: string, id?: string) => {
    return name || id || 'Unknown Tenant'
  }

  const [tenants, setTenants] = useState<UserData[]>([])
  const [selectedTenant, setSelectedTenant] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [rawInvoices, setRawInvoices] = useState<any[]>([])
  
  const [totalBilled, setTotalBilled] = useState(0)
  const [totalPaid, setTotalPaid] = useState(0)
  const [balanceDue, setBalanceDue] = useState(0)

  const [payingInvoice, setPayingInvoice] = useState<any>(null)
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash'|'cheque'|'qr'>('cash')
  const [receiveAmount, setReceiveAmount] = useState('')
  const [chequeAmount, setChequeAmount] = useState('')
  const [bankName, setBankName] = useState('')
  const [chequeNumber, setChequeNumber] = useState('')

  const handleOpenReceivePayment = (inv: any) => {
    setPayingInvoice(inv)
    setPaymentMethod('cash')
    setReceiveAmount('')
    setChequeAmount('')
    setBankName('')
    setChequeNumber('')
    setIsReceiveModalOpen(true)
  }

  const handleConfirmPayment = async () => {
    if (!payingInvoice) return
    if (paymentMethod === 'cheque' && (!bankName || !chequeNumber)) {
      alert('Please fill in both Bank Name and Cheque Number.')
      return
    }

    setIsPaying(true)
    try {
      const batch = writeBatch(db)
      const paymentRef = doc(collection(db, 'payments'))
      
      const invoiceTotal = payingInvoice.amount + (payingInvoice.electricityAmount || 0) + (payingInvoice.generatorAmount || 0) + (payingInvoice.utilityAmount || 0) + (payingInvoice.waterAmount || 0) + (payingInvoice.insuranceAmount || 0) + (payingInvoice.dieselAmount || 0) + (payingInvoice.structureMaintenanceAmount || 0) + (payingInvoice.otherAmount || 0) + (payingInvoice.previousPendingOutstandingDue || 0) + (payingInvoice.latePenaltyAmount || 0) + (payingInvoice.electricityVatAmount || 0)
      const prevPaid = payingInvoice.paidAmount || 0
      const remainingTotal = invoiceTotal - prevPaid

      const isCheque = paymentMethod === 'cheque'
      const inputAmountStr = isCheque ? chequeAmount : receiveAmount
      const parsedAmount = parseFloat(inputAmountStr)
      const paymentAmount = isNaN(parsedAmount) ? 0 : parsedAmount

      if (paymentAmount <= 0) {
        alert('Please enter a valid payment amount.')
        setIsPaying(false)
        return
      }

      if (paymentAmount > remainingTotal) {
        alert('Payment amount cannot be greater than the remaining balance.')
        setIsPaying(false)
        return
      }
      
      const newPayment: Payment = {
        id: paymentRef.id,
        invoiceId: payingInvoice.id,
        tenantId: payingInvoice.tenantId,
        amount: paymentAmount,
        method: paymentMethod === 'cash' ? 'cash' : paymentMethod === 'cheque' ? 'cheque' : 'qr',
        transactionId: paymentMethod === 'qr' ? 'FON-QR-' + Math.random().toString(36).substring(2, 10).toUpperCase() : 'REC-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        status: isCheque ? 'pending_clearance' : 'completed',
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        receiptNo: 'No.: ' + Math.floor(1000 + Math.random() * 9000),
        receivedFor: `Monthly Bill - ${payingInvoice.month}`
      }

      if (isCheque) {
        newPayment.bankName = bankName
        newPayment.chequeNumber = chequeNumber
      }

      batch.set(paymentRef, newPayment)

      const ref = doc(db, 'invoices', payingInvoice.id)
      
      if (!isCheque) {
        const newPaidAmount = prevPaid + paymentAmount
        const newStatus = newPaidAmount >= invoiceTotal ? 'paid' : 'partial'
        
        batch.update(ref, {
          paidAmount: newPaidAmount,
          status: newStatus,
          updatedAt: new Date().toISOString()
        })
      }

      await batch.commit()
      
      setIsReceiveModalOpen(false)
      alert('Payment recorded successfully!')
    } catch (error: any) {
      console.error('Error confirming payment:', error)
      alert('Failed to record payment: ' + error.message)
    } finally {
      setIsPaying(false)
    }
  }

  // Fetch all users who are tenants or residents
  useEffect(() => {
    const fetchTenants = async () => {
      const q = query(collection(db, 'users'), where('role', 'in', ['TENANT', 'OWNER']))
      const snap = await getDocs(q)
      const data: UserData[] = []
      snap.forEach((doc: any) => {
        data.push(doc.data() as UserData)
      })
      // Sort alphabetically
      data.sort((a, b) => a.fullName.localeCompare(b.fullName))
      setTenants(data)
    }
    fetchTenants()
  }, [])

  // Fetch ledger data when a tenant is selected
  useEffect(() => {
    if (!selectedTenant) {
      setEntries([])
      setRawInvoices([])
      setTotalBilled(0)
      setTotalPaid(0)
      setBalanceDue(0)
      return
    }

    setLoading(true)

    // Listen to Invoices
    const qInvoices = query(collection(db, 'invoices'), where('tenantId', '==', selectedTenant))
    const unsubInvoices = onSnapshot(qInvoices, (invSnap: any) => {
      const invoices: any[] = []
      invSnap.forEach((doc: any) => invoices.push({ id: doc.id, ...doc.data() }))
      setRawInvoices(invoices)
      
      // Listen to Payments
      const qPayments = query(collection(db, 'payments'), where('tenantId', '==', selectedTenant))
      getDocs(qPayments).then((paySnap: any) => {
        const payments: any[] = []
        paySnap.forEach((doc: any) => payments.push({ id: doc.id, ...doc.data() }))
        
        processLedger(invoices, payments)
        setLoading(false)
      })
    })

    return () => unsubInvoices()
  }, [selectedTenant])

  const processLedger = (invoices: any[], payments: any[]) => {
    let rawEntries: Omit<LedgerEntry, 'balance'>[] = []

    let billed = 0
    let paid = 0

    // Process Invoices (Debits)
    invoices.forEach(inv => {
      if (inv.status !== 'draft' && inv.status !== 'cancelled') {
        const totalAmount = inv.amount + (inv.electricityAmount || 0) + (inv.generatorAmount || 0) + (inv.utilityAmount || 0) + (inv.waterAmount || 0) + (inv.insuranceAmount || 0) + (inv.dieselAmount || 0) + (inv.structureMaintenanceAmount || 0) + (inv.otherAmount || 0) + (inv.previousPendingOutstandingDue || 0) + (inv.latePenaltyAmount || 0)
        billed += totalAmount
        rawEntries.push({
          id: inv.id,
          date: inv.createdAt ? inv.createdAt.split('T')[0] : inv.month + '-01',
          timestamp: inv.createdAt || inv.month + '-01T00:00:00Z',
          type: 'invoice',
          description: `Invoice for ${inv.month} (${inv.unitNumber || 'Unit'})`,
          debit: totalAmount,
          credit: 0,
          status: inv.status
        })
      }
    })

    // Process Payments (Credits)
    payments.forEach(pay => {
      if (pay.status === 'completed') {
        paid += pay.amount
        rawEntries.push({
          id: pay.id,
          date: pay.paidAt ? pay.paidAt.split('T')[0] : (pay.createdAt ? pay.createdAt.split('T')[0] : ''),
          timestamp: pay.paidAt || pay.createdAt || '2000-01-01T00:00:00Z',
          type: 'payment',
          description: `Payment via ${pay.method} (Ref: ${pay.transactionId || 'N/A'})`,
          debit: 0,
          credit: pay.amount,
          status: pay.status
        })
      }
    })

    // Sort chronologically by exact timestamp, invoices before payments if exact same time
    rawEntries.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime()
      const timeB = new Date(b.timestamp).getTime()
      if (timeA !== timeB) return timeA - timeB
      
      if (a.type === 'invoice' && b.type === 'payment') return -1
      if (a.type === 'payment' && b.type === 'invoice') return 1
      return 0
    })

    // Calculate running balance
    let currentBalance = 0
    const finalEntries: LedgerEntry[] = rawEntries.map(entry => {
      currentBalance += entry.debit // Add charges
      currentBalance -= entry.credit // Subtract payments
      return {
        ...entry,
        balance: currentBalance
      }
    })

    // finalEntries.reverse()

    setEntries(finalEntries)
    setTotalBilled(billed)
    setTotalPaid(paid)
    setBalanceDue(billed - paid)
  }

  const [tenantSearch, setTenantSearch] = useState('')

  const filteredTenants = tenants.filter(t => {
    if (!tenantSearch) return true;
    const q = tenantSearch.toLowerCase();
    const name = (t.fullName || '').toLowerCase();
    const unit = (t.unitNumber || '').toLowerCase();
    return name.includes(q) || unit.includes(q);
  });

  return (
    <DashboardLayout title="Resident/Tenant Ledger">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Resident/Tenant Ledger</h2>
            <p className="text-muted-foreground">Detailed statement of account for individual tenants</p>
          </div>
          {selectedTenant && (
            <Button variant="outline" className="gap-2" onClick={() => window.print()}>
              <Download className="h-4 w-4" /> Export PDF
            </Button>
          )}
        </div>

        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-lg">Select Tenant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Input 
                placeholder="Search by name or unit..." 
                value={tenantSearch}
                onChange={e => setTenantSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={selectedTenant} onValueChange={setSelectedTenant}>
              <SelectTrigger>
                <SelectValue placeholder="Select a tenant from the list..." />
              </SelectTrigger>
              <SelectContent>
                {filteredTenants.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500 text-center">No tenants found</div>
                ) : (
                  filteredTenants.map(t => (
                    <SelectItem key={t.uid} value={t.uid}>
                      {t.fullName} {t.unitNumber ? `(${t.unitNumber})` : ''}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedTenant && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Total Billed</p>
                  <p className="text-2xl font-bold">₨ {totalBilled.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                  <p className="text-2xl font-bold text-emerald-600">₨ {totalPaid.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className={balanceDue > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground font-medium">Balance Due</p>
                  <p className={`text-2xl font-bold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₨ {balanceDue.toLocaleString()}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Statement of Account</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : entries.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No transactions found for this tenant.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="py-3 px-4 font-medium">Date</th>
                          <th className="py-3 px-4 font-medium">Description</th>
                          <th className="py-3 px-4 font-medium text-right">Debit (Charges)</th>
                          <th className="py-3 px-4 font-medium text-right">Credit (Payments)</th>
                          <th className="py-3 px-4 font-medium text-right">Balance</th>
                          <th className="py-3 px-4 font-medium text-center">Status</th>
                          <th className="py-3 px-4 font-medium text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry, index) => (
                          <tr key={`${entry.id}-${index}`} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="py-3 px-4 whitespace-nowrap">{entry.date}</td>
                            <td className="py-3 px-4">
                              <span className="font-medium">{entry.type === 'invoice' ? 'INV' : 'PAY'}</span> - {entry.description}
                            </td>
                            <td className="py-3 px-4 text-right text-red-600">
                              {entry.debit > 0 ? `₨ ${entry.debit.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-3 px-4 text-right text-emerald-600">
                              {entry.credit > 0 ? `₨ ${entry.credit.toLocaleString()}` : '-'}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold">
                              ₨ {entry.balance.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge variant={entry.type === 'payment' ? 'success' : entry.status === 'paid' ? 'success' : entry.status === 'overdue' ? 'destructive' : 'warning'}>
                                {entry.status.toUpperCase()}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {entry.type === 'invoice' && ['pending', 'partial', 'overdue'].includes(entry.status) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                  onClick={() => {
                                    const inv = rawInvoices.find(i => i.id === entry.id)
                                    if (inv) handleOpenReceivePayment(inv)
                                  }}
                                >
                                  Receive Pay
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* RECEIVE PAYMENT WIZARD DIALOG */}
      <Dialog open={isReceiveModalOpen} onOpenChange={setIsReceiveModalOpen}>
        <DialogContent className="max-w-md no-print">
          <DialogHeader>
            <DialogTitle>Receive Payment - Counter Registry</DialogTitle>
            <DialogDescription>Process resident payments at the society front-desk counter.</DialogDescription>
          </DialogHeader>
          {payingInvoice && (
            <div className="space-y-4 pt-3">
              <div className="bg-gray-50 border p-3.5 rounded-lg space-y-1 text-sm">
                <p><strong>Resident Name:</strong> {formatTenantName(payingInvoice.tenantName, payingInvoice.tenantId)}</p>
                <p><strong>Unit / Apartment:</strong> {payingInvoice.unitNumber}</p>
                <p><strong>For Cycle Month:</strong> {payingInvoice.month}</p>
                <div className="pt-2 mt-2 border-t space-y-2">
                  <div className="flex justify-between items-center text-base text-indigo-700 font-bold">
                    <span>Grand Total Receivable:</span>
                    <span>₨ {(payingInvoice.amount + (payingInvoice.electricityAmount || 0) + (payingInvoice.generatorAmount || 0) + (payingInvoice.utilityAmount || 0) + (payingInvoice.waterAmount || 0) + (payingInvoice.insuranceAmount || 0) + (payingInvoice.dieselAmount || 0) + (payingInvoice.structureMaintenanceAmount || 0) + (payingInvoice.otherAmount || 0) + (payingInvoice.previousPendingOutstandingDue || 0) + (payingInvoice.latePenaltyAmount || 0) + (payingInvoice.electricityVatAmount || 0) - (payingInvoice.paidAmount || 0)).toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center bg-white p-2 rounded border border-indigo-100">
                    <Label className="text-sm font-semibold">
                      {paymentMethod === 'cheque' ? 'Cheque Amount:' : 'Total Pay Amount:'}
                    </Label>
                    <div className="flex items-center gap-1 w-1/2">
                      <span className="font-semibold text-gray-500">₨</span>
                      <Input 
                        type="number"
                        className="h-8 text-right font-bold"
                        value={paymentMethod === 'cheque' ? chequeAmount : receiveAmount}
                        onChange={e => paymentMethod === 'cheque' ? setChequeAmount(e.target.value) : setReceiveAmount(e.target.value)}
                      />
                    </div>
                  </div>

                  {(() => {
                    const invoiceTotal = payingInvoice.amount + (payingInvoice.electricityAmount || 0) + (payingInvoice.generatorAmount || 0) + (payingInvoice.utilityAmount || 0) + (payingInvoice.waterAmount || 0) + (payingInvoice.insuranceAmount || 0) + (payingInvoice.dieselAmount || 0) + (payingInvoice.structureMaintenanceAmount || 0) + (payingInvoice.otherAmount || 0) + (payingInvoice.previousPendingOutstandingDue || 0) + (payingInvoice.latePenaltyAmount || 0) + (payingInvoice.electricityVatAmount || 0)
                    const prevPaid = payingInvoice.paidAmount || 0
                    const remainingTotal = invoiceTotal - prevPaid
                    const parsedAmount = parseFloat(paymentMethod === 'cheque' ? chequeAmount : receiveAmount)
                    const currentPayment = isNaN(parsedAmount) ? 0 : parsedAmount
                    const newRemaining = remainingTotal - currentPayment

                    return (
                      <div className="text-[11px] text-gray-500 font-medium px-1 flex justify-between">
                        <span>Calculate: ₨ {remainingTotal.toLocaleString()} - ₨ {currentPayment.toLocaleString()}</span>
                        <span className={newRemaining > 0 ? "text-amber-600 font-bold" : "text-green-600 font-bold"}>
                          = Remaining: ₨ {newRemaining.toLocaleString()}
                        </span>
                      </div>
                    )
                  })()}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Choose Collection Method</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant={paymentMethod === 'cash' ? 'default' : 'outline'} 
                    className={`text-xs py-2 h-9 font-bold ${paymentMethod === 'cash' ? 'bg-[#95DBAE] text-[#1E293B] hover:bg-[#7BC98E]' : ''}`}
                    onClick={() => setPaymentMethod('cash')}
                  >
                    Cash
                  </Button>
                  <Button 
                    variant={paymentMethod === 'cheque' ? 'default' : 'outline'} 
                    className={`text-xs py-2 h-9 font-bold ${paymentMethod === 'cheque' ? 'bg-[#95DBAE] text-[#1E293B] hover:bg-[#7BC98E]' : ''}`}
                    onClick={() => setPaymentMethod('cheque')}
                  >
                    Cheque
                  </Button>
                  <Button 
                    variant={paymentMethod === 'qr' ? 'default' : 'outline'} 
                    className={`text-xs py-2 h-9 font-bold ${paymentMethod === 'qr' ? 'bg-[#95DBAE] text-[#1E293B] hover:bg-[#7BC98E]' : ''}`}
                    onClick={() => setPaymentMethod('qr')}
                  >
                    Fonepay QR
                  </Button>
                </div>
              </div>

              {paymentMethod === 'cheque' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg animate-in fade-in zoom-in duration-200">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cheque Bank Name</Label>
                    <Input 
                      placeholder="e.g. Nabil Bank" 
                      value={bankName} 
                      onChange={e => setBankName(e.target.value)} 
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Cheque Number</Label>
                    <Input 
                      placeholder="e.g. 02345512" 
                      value={chequeNumber} 
                      onChange={e => setChequeNumber(e.target.value)} 
                      className="bg-white"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'qr' && (
                <div className="flex justify-center p-2 bg-[#E8FFF3] border border-[#95DBAE]/40 rounded-lg animate-in fade-in zoom-in duration-200">
                  <div className="bg-[#007F3E] border-4 border-white text-white p-4 w-72 rounded-2xl shadow-md flex flex-col items-center">
                    <div className="flex justify-between items-center w-full pb-2 mb-2 border-b border-white/20">
                      <div className="bg-white text-[#007F3E] rounded-md px-1.5 py-0.5 text-[9px] font-black tracking-tighter flex items-center">
                        <span className="text-red-500 mr-0.5">fone</span>pay
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-green-100">SCAN & PAY</span>
                    </div>

                    <div className="text-center font-extrabold text-[11px] mb-1.5 text-white truncate max-w-full">
                      SUNRISE APARTMENT WELFARE SOCIETY
                    </div>

                    <div className="bg-white p-2.5 rounded-lg mb-2">
                      <img src="/plain-qr.jpg?v=1" alt="Fonepay QR Code" className="w-[120px] h-[120px] mx-auto object-contain" />
                    </div>

                    <div className="text-[8px] text-green-100 flex flex-col items-center">
                      <span>TERMINAL ID: 2222020001358874</span>
                      <span className="font-semibold text-white">Nakkhu-13, Lalitpur, Nepal</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t mt-4">
                <Button variant="outline" onClick={() => setIsReceiveModalOpen(false)} disabled={isPaying}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleConfirmPayment} 
                  disabled={isPaying} 
                  className="bg-[#95DBAE] text-[#1E293B] hover:bg-[#7BC98E] font-bold"
                >
                  {isPaying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirm Collection
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
