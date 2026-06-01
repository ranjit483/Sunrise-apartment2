'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { db } from '@/config/firebase'
import { collection, onSnapshot, query, orderBy, getDocs, doc, writeBatch, where, updateDoc } from 'firebase/firestore'
import { Invoice, Unit, Payment } from '@/types/models'
import { Loader2, Plus, Send, Edit2, CheckCircle2, Eye, Printer, FileText, Check, DollarSign } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { numberToWords } from '@/lib/utils'

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  paid: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  overdue: 'bg-red-100 text-red-800',
}

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

export default function InvoicesPage() {
  const { profile } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [usersMap, setUsersMap] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, 'users'))
        const map: Record<string, string> = {}
        snap.forEach(doc => {
          const data = doc.data()
          if (data.name) {
            map[data.uid || doc.id] = data.name
          }
        })
        setUsersMap(map)
      } catch (err) {
        console.error('Error fetching users:', err)
      }
    }
    fetchUsers()
  }, [])

  const formatTenantName = (name: string | null | undefined, tenantId?: string) => {
    if (tenantId && usersMap[tenantId]) return usersMap[tenantId]
    return name || 'Unknown'
  }
  
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isPostingDrafts, setIsPostingDrafts] = useState(false)
  
  const [invoiceMonth, setInvoiceMonth] = useState('')
  const [invoiceDueDate, setInvoiceDueDate] = useState('')

  // Receive payment wizard states
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null)
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'cheque' | 'qr'>('cash')
  const [bankName, setBankName] = useState('')
  const [chequeNumber, setChequeNumber] = useState('')
  const [isPaying, setIsPaying] = useState(false)

  // Document viewing states
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null)
  const [isViewBillModalOpen, setIsViewBillModalOpen] = useState(false)
  
  const [activeReceipt, setActiveReceipt] = useState<Payment | null>(null)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)
  const [receiptInvoice, setReceiptInvoice] = useState<Invoice | null>(null)

  const canManageInvoices = profile?.role && ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT', 'OFFICE_ASSISTANT'].includes(profile.role)

  useEffect(() => {
    const now = new Date()
    const monthStr = now.toLocaleString('default', { month: 'long', year: 'numeric' })
    setInvoiceMonth(monthStr)
    
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 5)
    setInvoiceDueDate(nextMonth.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    const q = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const bData: Invoice[] = []
      snapshot.forEach((doc: any) => {
        bData.push(doc.data() as Invoice)
      })
      setInvoices(bData)
      setLoading(false)
    }, (error: any) => {
      console.error('Error fetching invoices:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleGenerateDrafts = async () => {
    if (!invoiceMonth || !invoiceDueDate) {
      alert('Please provide the billing month and due date.')
      return
    }

    setIsGenerating(true)
    try {
      const usersQuery = query(collection(db, 'users'), where('status', '==', 'approved'))
      const usersSnapshot = await getDocs(usersQuery)
      
      const targetUsers: any[] = []
      usersSnapshot.forEach((doc: any) => {
        const u = doc.data()
        if (['TENANT', 'RESIDENT', 'OWNER'].includes(u.role)) {
          targetUsers.push(u)
        }
      })

      if (targetUsers.length === 0) {
        alert('No active or approved tenants/owners found to generate invoices for.')
        setIsGenerating(false)
        return
      }

      const unitsSnapshot = await getDocs(collection(db, 'units'))
      const unitsByNumber: Record<string, Unit> = {}
      unitsSnapshot.forEach((doc: any) => {
        const u = doc.data() as Unit
        if (u.unitNumber) {
          unitsByNumber[u.unitNumber.toLowerCase().trim()] = u
        }
      })

      const batch = writeBatch(db)
      let count = 0
      
      for (const user of targetUsers) {
        const unitNumberKey = user.unitNumber ? user.unitNumber.toLowerCase().trim() : ''
        const matchingUnit = unitsByNumber[unitNumberKey]
        
        const invoiceRef = doc(collection(db, 'invoices'))
        batch.set(invoiceRef, {
          id: invoiceRef.id,
          unitId: matchingUnit ? matchingUnit.id : 'N/A',
          tenantId: user.uid || user.id,
          unitNumber: matchingUnit ? matchingUnit.unitNumber : (user.unitNumber || 'N/A'),
          tenantName: user.name || user.email || 'Unknown',
          month: invoiceMonth,
          amount: matchingUnit ? (matchingUnit.rent || 0) : 0,
          electricityReading: 0,
          electricityAmount: 0,
          utilityAmount: 0,
          waterAmount: 0,
          otherAmount: 0,
          dueDate: invoiceDueDate,
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
        count++
      }

      await batch.commit()
      alert(`Successfully generated ${count} draft invoices! Please review them before posting.`)
      setIsGenerateModalOpen(false)
    } catch (error: any) {
      console.error('Error generating drafts:', error)
      alert('Failed to generate drafts: ' + error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePostAllDrafts = async () => {
    const drafts = invoices.filter(i => i.status === 'draft')
    if (drafts.length === 0) {
      alert('No draft invoices to post.')
      return
    }

    if (!confirm(`Are you sure you want to officially post ${drafts.length} draft invoices to pending status? They will become visible to users.`)) return

    setIsPostingDrafts(true)
    try {
      const batch = writeBatch(db)
      for (const invoice of drafts) {
        const ref = doc(db, 'invoices', invoice.id)
        batch.update(ref, {
          status: 'pending',
          updatedAt: new Date().toISOString()
        })
      }
      await batch.commit()
      alert(`Successfully posted ${drafts.length} invoices!`)
    } catch (error: any) {
      console.error('Error posting drafts:', error)
      alert('Failed to post drafts: ' + error.message)
    } finally {
      setIsPostingDrafts(false)
    }
  }

  const handleClearAllInvoices = async () => {
    if (!confirm('DANGER: Are you sure you want to permanently delete ALL invoices? This action cannot be undone.')) return
    
    try {
      const snapshot = await getDocs(collection(db, 'invoices'))
      if (snapshot.empty) {
        alert('No invoices to delete.')
        return
      }

      const batch = writeBatch(db)
      let count = 0
      snapshot.forEach((doc: any) => {
        batch.delete(doc.ref)
        count++
      })
      await batch.commit()
      alert(`Successfully deleted ${count} invoices!`)
    } catch (error: any) {
      alert('Failed to delete invoices: ' + error.message)
    }
  }

  const handleOpenReceivePayment = (invoice: Invoice) => {
    setPayingInvoice(invoice)
    setPaymentMethod('cash')
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
      const totalAmount = payingInvoice.amount + (payingInvoice.electricityAmount || 0) + (payingInvoice.utilityAmount || 0) + (payingInvoice.waterAmount || 0) + (payingInvoice.otherAmount || 0)
      
      const newPayment: Payment = {
        id: paymentRef.id,
        invoiceId: payingInvoice.id,
        tenantId: payingInvoice.tenantId,
        amount: totalAmount,
        method: paymentMethod === 'cash' ? 'cash' : paymentMethod === 'cheque' ? 'cheque' : 'qr',
        transactionId: paymentMethod === 'qr' ? 'FON-QR-' + Math.random().toString(36).substring(2, 10).toUpperCase() : 'REC-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        status: 'completed',
        paidAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        receiptNo: 'No.: ' + Math.floor(1000 + Math.random() * 9000),
        receivedFor: `Monthly Bill - ${payingInvoice.month}`
      }

      if (paymentMethod === 'cheque') {
        newPayment.bankName = bankName
        newPayment.chequeNumber = chequeNumber
      }

      batch.set(paymentRef, newPayment)

      const ref = doc(db, 'invoices', payingInvoice.id)
      batch.update(ref, {
        status: 'paid',
        updatedAt: new Date().toISOString()
      })

      await batch.commit()
      
      setIsReceiveModalOpen(false)
      
      // Automatically load and show the receipt to print
      setReceiptInvoice(payingInvoice)
      setActiveReceipt(newPayment)
      setIsReceiptModalOpen(true)
      
      setPayingInvoice(null)
    } catch (error: any) {
      console.error('Error marking as paid:', error)
      alert('Failed to mark as paid: ' + error.message)
    } finally {
      setIsPaying(false)
    }
  }

  const handleViewReceiptForInvoice = async (invoice: Invoice) => {
    try {
      const q = query(collection(db, 'payments'), where('invoiceId', '==', invoice.id))
      const snapshot = await getDocs(q)
      if (snapshot.empty) {
        alert('No payment record found for this invoice.')
        return
      }
      const pDoc = snapshot.docs[0].data() as Payment
      setReceiptInvoice(invoice)
      setActiveReceipt(pDoc)
      setIsReceiptModalOpen(true)
    } catch (error: any) {
      console.error('Error fetching receipt:', error)
      alert('Error fetching receipt: ' + error.message)
    }
  }

  const handleUpdateInvoice = async () => {
    if (!editingInvoice) return
    setIsUpdating(true)
    try {
      const ref = doc(db, 'invoices', editingInvoice.id)
      await updateDoc(ref, {
        amount: Number(editingInvoice.amount),
        electricityReading: Number(editingInvoice.electricityReading || 0),
        electricityAmount: Number(editingInvoice.electricityAmount || 0),
        utilityAmount: Number(editingInvoice.utilityAmount || 0),
        waterAmount: Number(editingInvoice.waterAmount || 0),
        otherAmount: Number(editingInvoice.otherAmount || 0),
        dueDate: editingInvoice.dueDate,
        updatedAt: new Date().toISOString()
      })
      setIsEditModalOpen(false)
      setEditingInvoice(null)
    } catch (error: any) {
      console.error('Error updating invoice:', error)
      alert('Failed to update invoice: ' + error.message)
    } finally {
      setIsUpdating(false)
    }
  }

  const openEditModal = (inv: Invoice) => {
    setEditingInvoice(inv)
    setIsEditModalOpen(true)
  }

  const openViewBillModal = (inv: Invoice) => {
    setViewingInvoice(inv)
    setIsViewBillModalOpen(true)
  }

  const handlePrint = () => {
    window.print()
  }

  const draftCount = invoices.filter(i => i.status === 'draft').length
  const pendingCount = invoices.filter(i => i.status === 'pending').length
  const overdueCount = invoices.filter(i => i.status === 'overdue').length
  const collectedAmount = invoices.filter(i => i.status === 'paid').reduce((acc, i) => acc + i.amount + (i.electricityAmount || 0) + (i.utilityAmount || 0) + (i.waterAmount || 0) + (i.otherAmount || 0), 0)
  const outstandingAmount = invoices.filter(i => i.status === 'pending' || i.status === 'overdue').reduce((acc, i) => acc + i.amount + (i.electricityAmount || 0) + (i.utilityAmount || 0) + (i.waterAmount || 0) + (i.otherAmount || 0), 0)

  return (
    <DashboardLayout title="Invoices & Billing">
      <div className="space-y-6 no-print">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Invoices</h2>
            <p className="text-muted-foreground">Manage monthly invoices and billing</p>
          </div>
          
          {canManageInvoices && (
            <div className="flex gap-3">
              {draftCount > 0 && (
                <Button onClick={handlePostAllDrafts} disabled={isPostingDrafts} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                  {isPostingDrafts ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Post All Drafts ({draftCount})
                </Button>
              )}
              
              <Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-[#95DBAE] hover:bg-[#7BC98E] text-[#1E293B] font-semibold">
                    <Plus className="h-4 w-4" />
                    Generate Draft Invoices
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate Draft Invoices</DialogTitle>
                    <DialogDescription>
                      This will generate draft invoices for all active tenants/owners. You can review and edit them (e.g. adding electricity charges) before posting them.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Billing Month</Label>
                      <Input 
                        placeholder="e.g. Baishakh 2083" 
                        value={invoiceMonth} 
                        onChange={e => setInvoiceMonth(e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input 
                        type="date" 
                        value={invoiceDueDate} 
                        onChange={e => setInvoiceDueDate(e.target.value)} 
                      />
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-4">
                      <Button variant="outline" onClick={() => setIsGenerateModalOpen(false)} disabled={isGenerating}>
                        Cancel
                      </Button>
                      <Button onClick={handleGenerateDrafts} disabled={isGenerating} className="gap-2 bg-[#95DBAE] text-[#1E293B] hover:bg-[#7BC98E]">
                        {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
                        Generate Drafts
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button onClick={handleClearAllInvoices} variant="destructive" className="gap-2">
                Clear All Invoices
              </Button>
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Drafts / Pending</p><p className="text-2xl font-bold">{draftCount} / {pendingCount}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Collected</p><p className="text-2xl font-bold">₨ {collectedAmount.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Overdue</p><p className="text-2xl font-bold text-red-500">{overdueCount}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Outstanding Total</p><p className="text-2xl font-bold">₨ {outstandingAmount.toLocaleString()}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>All Invoices</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No invoices found. Generate invoices to get started.</div>
            ) : (
              <div className="overflow-x-auto overflow-y-hidden">
                <table className="w-full min-w-[850px] text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-3 text-left">Invoice ID</th>
                      <th className="pb-3 text-left">Unit</th>
                      <th className="pb-3 text-left">Resident/Tenant</th>
                      <th className="pb-3 text-left">Month</th>
                      <th className="pb-3 text-left">Due Date</th>
                      <th className="pb-3 text-left">Rent</th>
                      <th className="pb-3 text-left">Electricity</th>
                      <th className="pb-3 text-left">Utility</th>
                      <th className="pb-3 text-left">Water</th>
                      <th className="pb-3 text-left">Other</th>
                      <th className="pb-3 text-left">Total</th>
                      <th className="pb-3 text-left">Status</th>
                      <th className="pb-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => {
                      const total = inv.amount + (inv.electricityAmount || 0) + (inv.utilityAmount || 0) + (inv.waterAmount || 0) + (inv.otherAmount || 0)
                      return (
                        <tr key={inv.id} className="border-b hover:bg-gray-50/50">
                          <td className="py-3 font-medium">{inv.id.substring(0, 8)}...</td>
                          <td className="py-3 font-semibold text-gray-700">{inv.unitNumber || (inv.unitId !== 'N/A' ? inv.unitId.substring(0,8) + '...' : 'N/A')}</td>
                          <td className="py-3">{formatTenantName(inv.tenantName, inv.tenantId)}</td>
                          <td className="py-3">{inv.month}</td>
                          <td className="py-3">{inv.dueDate}</td>
                          <td className="py-3">₨ {inv.amount.toLocaleString()}</td>
                          <td className="py-3">₨ {(inv.electricityAmount || 0).toLocaleString()}</td>
                          <td className="py-3">₨ {(inv.utilityAmount || 0).toLocaleString()}</td>
                          <td className="py-3">₨ {(inv.waterAmount || 0).toLocaleString()}</td>
                          <td className="py-3">₨ {(inv.otherAmount || 0).toLocaleString()}</td>
                          <td className="py-3 font-semibold text-indigo-700">₨ {total.toLocaleString()}</td>
                          <td className="py-3">
                            <Badge variant="outline" className={`${statusColors[inv.status] || ''} font-semibold uppercase text-xs px-2 py-0.5 rounded-full`}>
                              {inv.status}
                            </Badge>
                          </td>
                          <td className="py-3">
                            <div className="flex gap-1.5 items-center">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0" 
                                onClick={() => openViewBillModal(inv)} 
                                title="View/Print Bill"
                              >
                                <Eye className="h-4 w-4 text-indigo-600 hover:text-indigo-800" />
                              </Button>

                              {inv.status === 'draft' && canManageInvoices && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0" 
                                  onClick={() => openEditModal(inv)} 
                                  title="Edit Draft"
                                >
                                  <Edit2 className="h-4 w-4 text-blue-500 hover:text-blue-700" />
                                </Button>
                              )}

                              {inv.status === 'pending' && canManageInvoices && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-xs h-7 px-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200" 
                                  onClick={() => handleOpenReceivePayment(inv)}
                                >
                                  Receive Pay
                                </Button>
                              )}

                              {inv.status === 'paid' && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0" 
                                  onClick={() => handleViewReceiptForInvoice(inv)} 
                                  title="Print Receipt slip"
                                >
                                  <FileText className="h-4 w-4 text-emerald-600 hover:text-emerald-800" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* RENDER FOR PRINT MODE ONLY */}
      <div className="hidden print-area block">
        {/* If viewing invoice details */}
        {viewingInvoice && (
          <div className="bg-white p-8 max-w-[800px] mx-auto text-black border border-black rounded-sm print-sheet shadow-none">
            <div className="text-center border-b pb-4 mb-6">
              <h1 className="text-2xl font-black tracking-tight text-gray-900">SUNRISE APARTMENT WELFARE SOCIETY</h1>
              <p className="text-sm font-medium text-gray-700">Nakkhu-13, Lalitpur, Nepal | Phone: 01-5185110</p>
              <div className="inline-block border border-black font-extrabold px-3 py-0.5 rounded-sm bg-gray-50 text-xs mt-2 uppercase tracking-widest text-gray-950">
                Monthly Invoice Bill Sheet
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-2 text-sm mb-6 border border-black p-4 rounded-sm bg-gray-50">
              <div><strong>Unit Number:</strong> {viewingInvoice.unitNumber}</div>
              <div className="text-right"><strong>Invoice No:</strong> {viewingInvoice.id.substring(0, 10).toUpperCase()}</div>
              <div><strong>Owner/Tenant:</strong> {formatTenantName(viewingInvoice.tenantName, viewingInvoice.tenantId)}</div>
              <div className="text-right"><strong>Date (AD):</strong> {getNepaliDate(viewingInvoice.createdAt).ad}</div>
              <div><strong>Billing Month:</strong> <span className="uppercase font-bold">{viewingInvoice.month}</span></div>
              <div className="text-right"><strong>Date (BS):</strong> {getNepaliDate(viewingInvoice.createdAt).bs.split(' (')[0]}</div>
              <div className="text-red-700 font-bold"><strong>Payment Status:</strong> {viewingInvoice.status.toUpperCase()}</div>
              <div className="text-right font-bold text-red-700"><strong>Due Date:</strong> {getNepaliDate(viewingInvoice.dueDate).ad}</div>
            </div>

            <table className="w-full text-sm border-collapse border border-black mb-6">
              <thead>
                <tr className="bg-gray-100 font-bold border-b border-black text-xs uppercase text-gray-950">
                  <th className="border border-black p-2 text-center w-12">S.N.</th>
                  <th className="border border-black p-2 text-left">Particulars & Service Details</th>
                  <th className="border border-black p-2 text-right w-36">Amount (₨)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-black">
                  <td className="border border-black p-2 text-center">1.</td>
                  <td className="border border-black p-2">
                    <div><strong>Electricity Charge Including Usage Pool</strong></div>
                    {viewingInvoice.electricityReading ? (
                      <span className="text-xs text-gray-600">Current Reading: {viewingInvoice.electricityReading} units (Rate: Rs. 16.80/unit)</span>
                    ) : (
                      <span className="text-xs text-gray-600">Meter usage and society power backup</span>
                    )}
                  </td>
                  <td className="border border-black p-2 text-right font-medium">₨ {(viewingInvoice.electricityAmount || 0).toLocaleString()}</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="border border-black p-2 text-center">2.</td>
                  <td className="border border-black p-2">
                    <div><strong>Backup (Generator / DG meter flat fee)</strong></div>
                    <span className="text-xs text-gray-600">Diesel generator standby charge</span>
                  </td>
                  <td className="border border-black p-2 text-right font-medium">₨ 500</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="border border-black p-2 text-center">3.</td>
                  <td className="border border-black p-2">
                    <div><strong>Diesel Cost Sharing Standby pool</strong></div>
                    <span className="text-xs text-gray-600">Diesel standby maintenance pool sharing</span>
                  </td>
                  <td className="border border-black p-2 text-right font-medium">₨ 850</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="border border-black p-2 text-center">4.</td>
                  <td className="border border-black p-2">
                    <div><strong>Monthly Service Charge per Sq Ft</strong></div>
                    <span className="text-xs text-gray-600">Sunrise welfare operations rate (Rs 1.75 per Sq Ft)</span>
                  </td>
                  <td className="border border-black p-2 text-right font-medium">₨ {(viewingInvoice.utilityAmount || 0).toLocaleString()}</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="border border-black p-2 text-center">5.</td>
                  <td className="border border-black p-2">
                    <div><strong>Water Supply & Society Maintenance</strong></div>
                    <span className="text-xs text-gray-600">Fixed monthly supply & cleaning pool fee</span>
                  </td>
                  <td className="border border-black p-2 text-right font-medium">₨ {(viewingInvoice.waterAmount || 0).toLocaleString()}</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="border border-black p-2 text-center">6.</td>
                  <td className="border border-black p-2">
                    <div><strong>Apartment Structure Insurance Contribution</strong></div>
                    <span className="text-xs text-gray-600">Welfare pool contribution (Rs 6.20 per Sq Ft)</span>
                  </td>
                  <td className="border border-black p-2 text-right font-medium">₨ {(viewingInvoice.otherAmount || 0).toLocaleString()}</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="border border-black p-2 text-center">7.</td>
                  <td className="border border-black p-2">
                    <div><strong>Delay Charge on Structural Insurance</strong></div>
                    <span className="text-xs text-gray-600">Late penalty fee on insurance pool</span>
                  </td>
                  <td className="border border-black p-2 text-right font-medium">₨ 0.00</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="border border-black p-2 text-center">8.</td>
                  <td className="border border-black p-2">
                    <div><strong>Previous Pending Outstanding Due</strong></div>
                    <span className="text-xs text-gray-600">Brought forward balance from previous cycles</span>
                  </td>
                  <td className="border border-black p-2 text-right font-medium">₨ 0.00</td>
                </tr>
                <tr className="border-b border-black">
                  <td className="border border-black p-2 text-center">9.</td>
                  <td className="border border-black p-2">
                    <div><strong>Society Delay / Late Penalty Surcharges</strong></div>
                    <span className="text-xs text-gray-600">Applied delay penalty</span>
                  </td>
                  <td className="border border-black p-2 text-right font-medium">₨ 0.00</td>
                </tr>
                {viewingInvoice.amount > 0 && (
                  <tr className="border-b border-black">
                    <td className="border border-black p-2 text-center">10.</td>
                    <td className="border border-black p-2">
                      <div><strong>Basic Unit Rent</strong></div>
                      <span className="text-xs text-gray-600">Apartment basic rent amount</span>
                    </td>
                    <td className="border border-black p-2 text-right font-medium">₨ {viewingInvoice.amount.toLocaleString()}</td>
                  </tr>
                )}
                <tr className="bg-gray-100 font-extrabold text-base border-t border-black text-gray-950">
                  <td colSpan={2} className="border border-black p-2.5 text-right uppercase tracking-wider">Grand Total:</td>
                  <td className="border border-black p-2.5 text-right font-black">
                    ₨ {(viewingInvoice.amount + (viewingInvoice.electricityAmount || 0) + (viewingInvoice.utilityAmount || 0) + (viewingInvoice.waterAmount || 0) + (viewingInvoice.otherAmount || 0)).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="border border-black p-3.5 rounded-sm bg-gray-50 mb-6 text-sm">
              <strong className="text-xs uppercase text-gray-600 block mb-1">Amount in Words:</strong>
              <div className="font-bold text-gray-900 text-[15px]">
                {numberToWords(viewingInvoice.amount + (viewingInvoice.electricityAmount || 0) + (viewingInvoice.utilityAmount || 0) + (viewingInvoice.waterAmount || 0) + (viewingInvoice.otherAmount || 0))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 items-end mt-12 pt-8 border-t border-dashed">
              <div className="text-center w-52">
                <div className="border-b border-black h-12 w-full mx-auto"></div>
                <p className="text-xs font-bold uppercase mt-2 text-gray-700">Resident Signature</p>
              </div>
              <div className="text-center w-52 ml-auto">
                <div className="border-b border-black h-12 w-full mx-auto"></div>
                <p className="text-xs font-bold uppercase mt-2 text-gray-700">Society Authorized Signatory & Seal</p>
              </div>
            </div>
          </div>
        )}

        {/* If viewing payment receipt slip */}
        {activeReceipt && receiptInvoice && (
          <div className="bg-white p-6 max-w-[650px] mx-auto text-black border border-black rounded-sm print-sheet shadow-none my-8">
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
                Received with thanks from Mr./Mrs./Ms. <strong className="text-sm underline px-1 text-gray-950 font-bold">{formatTenantName(receiptInvoice.tenantName, receiptInvoice.tenantId)}</strong>, 
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

      {/* EDIT MODAL DIALOG */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="no-print">
          <DialogHeader>
            <DialogTitle>Edit Draft Invoice</DialogTitle>
            <DialogDescription>Update the invoice details, including electricity readings and charges.</DialogDescription>
          </DialogHeader>
          {editingInvoice && (
            <div className="space-y-4 pt-4">
              <div className="bg-gray-50 p-3 rounded-md text-sm mb-2 border">
                <p><strong>Unit:</strong> {editingInvoice.unitNumber || editingInvoice.unitId}</p>
                <p><strong>Tenant:</strong> {formatTenantName(editingInvoice.tenantName || editingInvoice.tenantId, editingInvoice.tenantId)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rent Amount (₨)</Label>
                  <Input 
                    type="number" 
                    value={editingInvoice.amount} 
                    onChange={e => setEditingInvoice({...editingInvoice, amount: Number(e.target.value)})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input 
                    type="date" 
                    value={editingInvoice.dueDate} 
                    onChange={e => setEditingInvoice({...editingInvoice, dueDate: e.target.value})} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Electricity Reading</Label>
                  <Input 
                    type="number" 
                    value={editingInvoice.electricityReading || 0} 
                    onChange={e => setEditingInvoice({...editingInvoice, electricityReading: Number(e.target.value)})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Electricity Amount (₨)</Label>
                  <Input 
                    type="number" 
                    value={editingInvoice.electricityAmount || 0} 
                    onChange={e => setEditingInvoice({...editingInvoice, electricityAmount: Number(e.target.value)})} 
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Utility Amount (₨)</Label>
                  <Input 
                    type="number" 
                    value={editingInvoice.utilityAmount || 0} 
                    onChange={e => setEditingInvoice({...editingInvoice, utilityAmount: Number(e.target.value)})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Water Amount (₨)</Label>
                  <Input 
                    type="number" 
                    value={editingInvoice.waterAmount || 0} 
                    onChange={e => setEditingInvoice({...editingInvoice, waterAmount: Number(e.target.value)})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Other Amount (₨)</Label>
                  <Input 
                    type="number" 
                    value={editingInvoice.otherAmount || 0} 
                    onChange={e => setEditingInvoice({...editingInvoice, otherAmount: Number(e.target.value)})} 
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isUpdating}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateInvoice} disabled={isUpdating} className="bg-[#95DBAE] text-[#1E293B] hover:bg-[#7BC98E] font-semibold">
                  {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                <p className="text-base text-indigo-700 pt-1 border-t mt-1.5 flex justify-between font-bold">
                  <span>Grand Total Receivable:</span>
                  <span>₨ {(payingInvoice.amount + (payingInvoice.electricityAmount || 0) + (payingInvoice.utilityAmount || 0) + (payingInvoice.waterAmount || 0) + (payingInvoice.otherAmount || 0)).toLocaleString()}</span>
                </p>
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

      {/* VIEW BILL SHEETS MODAL */}
      <Dialog open={isViewBillModalOpen} onOpenChange={setIsViewBillModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto no-print">
          <DialogHeader className="border-b pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle>View Monthly Bill Sheet</DialogTitle>
              <Button onClick={handlePrint} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-2 h-8 text-xs">
                <Printer className="h-3.5 w-3.5" />
                Print Bill (A4)
              </Button>
            </div>
          </DialogHeader>

          {viewingInvoice && (
            <div className="bg-white p-6 text-black border rounded-md shadow-inner my-2 font-sans relative">
              <div className="text-center border-b pb-4 mb-5">
                <h1 className="text-xl font-black tracking-tight text-gray-900">SUNRISE APARTMENT WELFARE SOCIETY</h1>
                <p className="text-xs font-semibold text-gray-600">Nakkhu-13, Lalitpur, Nepal | Phone: 01-5185110</p>
                <span className="inline-block border border-black font-extrabold px-2 py-0.5 rounded-sm bg-gray-50 text-[10px] mt-2 uppercase tracking-wider text-gray-900">
                  Monthly Invoice Bill
                </span>
              </div>

              <div className="grid grid-cols-2 gap-y-1.5 text-xs mb-5 border p-3 rounded-md bg-gray-50">
                <div><strong>Unit Number:</strong> {viewingInvoice.unitNumber}</div>
                <div className="text-right"><strong>Invoice No:</strong> {viewingInvoice.id.substring(0, 10).toUpperCase()}</div>
                <div><strong>Owner/Tenant:</strong> {formatTenantName(viewingInvoice.tenantName, viewingInvoice.tenantId)}</div>
                <div className="text-right"><strong>Date (AD):</strong> {getNepaliDate(viewingInvoice.createdAt).ad}</div>
                <div><strong>Billing Month:</strong> <span className="uppercase font-bold">{viewingInvoice.month}</span></div>
                <div className="text-right"><strong>Date (BS):</strong> {getNepaliDate(viewingInvoice.createdAt).bs.split(' (')[0]}</div>
                <div className="text-red-700 font-bold"><strong>Status:</strong> {viewingInvoice.status.toUpperCase()}</div>
                <div className="text-right font-bold text-red-700"><strong>Due Date:</strong> {getNepaliDate(viewingInvoice.dueDate).ad}</div>
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
                    <td className="border border-black p-2 text-right font-medium">₨ 850</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border border-black p-2 text-center">4.</td>
                    <td className="border border-black p-2">
                      <div><strong>Monthly Service Charge per Sq Ft</strong></div>
                      <span className="text-[10px] text-gray-600">Sunrise welfare operations rate (Rs 1.75 per Sq Ft)</span>
                    </td>
                    <td className="border border-black p-2 text-right font-medium">₨ {(viewingInvoice.utilityAmount || 0).toLocaleString()}</td>
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
                    <td className="border border-black p-2 text-right font-medium">₨ {(viewingInvoice.otherAmount || 0).toLocaleString()}</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border border-black p-2 text-center">7.</td>
                    <td className="border border-black p-2">
                      <div><strong>Delay Charge on Structural Insurance contribution</strong></div>
                      <span className="text-[10px] text-gray-600">Late penalty fee on insurance pool</span>
                    </td>
                    <td className="border border-black p-2 text-right font-medium">₨ 0.00</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border border-black p-2 text-center">8.</td>
                    <td className="border border-black p-2">
                      <div><strong>Previous Pending Outstanding Due</strong></div>
                      <span className="text-[10px] text-gray-600">Brought forward balance from previous cycles</span>
                    </td>
                    <td className="border border-black p-2 text-right font-medium">₨ 0.00</td>
                  </tr>
                  <tr className="border-b border-black">
                    <td className="border border-black p-2 text-center">9.</td>
                    <td className="border border-black p-2">
                      <div><strong>Society Delay / Late Penalty Surcharges</strong></div>
                      <span className="text-[10px] text-gray-600">Applied delay penalty</span>
                    </td>
                    <td className="border border-black p-2 text-right font-medium">₨ 0.00</td>
                  </tr>
                  {viewingInvoice.amount > 0 && (
                    <tr className="border-b border-black">
                      <td className="border border-black p-2 text-center">10.</td>
                      <td className="border border-black p-2">
                        <div><strong>Basic Unit Rent</strong></div>
                        <span className="text-[10px] text-gray-600">Apartment basic rent amount</span>
                      </td>
                      <td className="border border-black p-2 text-right font-medium">₨ {viewingInvoice.amount.toLocaleString()}</td>
                    </tr>
                  )}
                  <tr className="bg-gray-100 font-extrabold text-[13px] border-t border-black text-gray-950">
                    <td colSpan={2} className="border border-black p-2 text-right uppercase tracking-wider">Grand Total:</td>
                    <td className="border border-black p-2 text-right font-black">
                      ₨ {(viewingInvoice.amount + (viewingInvoice.electricityAmount || 0) + (viewingInvoice.utilityAmount || 0) + (viewingInvoice.waterAmount || 0) + (viewingInvoice.otherAmount || 0)).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="border border-black p-3 rounded-sm bg-gray-50 mb-5 text-[11px]">
                <strong className="text-[9px] uppercase text-gray-600 block mb-0.5">Amount in Words:</strong>
                <div className="font-bold text-gray-900 text-xs">
                  {numberToWords(viewingInvoice.amount + (viewingInvoice.electricityAmount || 0) + (viewingInvoice.utilityAmount || 0) + (viewingInvoice.waterAmount || 0) + (viewingInvoice.otherAmount || 0))}
                </div>
              </div>

              {/* Embedded Fonepay scan card inside Bill Modal */}
              <div className="flex flex-col items-center bg-[#E8FFF3] border border-[#95DBAE]/40 p-4 rounded-xl max-w-sm mx-auto mb-6 text-white shadow-sm">
                <div className="bg-[#007F3E] border-4 border-white text-white p-3.5 w-full rounded-2xl flex flex-col items-center">
                  <div className="flex justify-between items-center w-full pb-1.5 mb-1.5 border-b border-white/20">
                    <div className="bg-white text-[#007F3E] rounded-md px-1.5 py-0.5 text-[8px] font-black tracking-tighter flex items-center">
                      <span className="text-red-500 mr-0.5">fone</span>pay
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-wider text-green-100">SCAN TO PAY</span>
                  </div>

                  <div className="text-center font-extrabold text-[10px] mb-1.5 text-white truncate max-w-full">
                    SUNRISE APARTMENT WELFARE SOCIETY
                  </div>

                  <div className="bg-white p-2 rounded-lg mb-1.5">
                    <svg width="90" height="90" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto">
                      <rect x="0" y="0" width="30" height="30" fill="black"/>
                      <rect x="5" y="5" width="20" height="20" fill="white"/>
                      <rect x="10" y="10" width="10" height="10" fill="black"/>
                      
                      <rect x="90" y="0" width="30" height="30" fill="black"/>
                      <rect x="95" y="5" width="20" height="20" fill="white"/>
                      <rect x="100" y="10" width="10" height="10" fill="black"/>
                      
                      <rect x="0" y="90" width="30" height="30" fill="black"/>
                      <rect x="5" y="95" width="20" height="20" fill="white"/>
                      <rect x="10" y="100" width="10" height="10" fill="black"/>
                      
                      <rect x="40" y="10" width="8" height="20" fill="black"/>
                      <rect x="60" y="5" width="15" height="8" fill="black"/>
                      <rect x="50" y="45" width="20" height="20" fill="black"/>
                      <rect x="15" y="45" width="12" height="12" fill="black"/>
                      <rect x="80" y="45" width="18" height="18" fill="black"/>
                      <rect x="90" y="90" width="20" height="20" fill="black"/>
                      <rect x="55" y="85" width="20" height="12" fill="black"/>
                      
                      <circle cx="60" cy="60" r="10" fill="#E11D48"/>
                      <polygon points="56,60 60,56 64,60 60,64" fill="white"/>
                    </svg>
                  </div>

                  <div className="text-[7px] text-green-100 flex flex-col items-center">
                    <span>TERMINAL ID: 2222020001358874</span>
                    <span className="font-semibold text-white">Nakkhu-13, Lalitpur, Nepal</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-end mt-8 pt-6 border-t border-dashed">
                <div className="text-center w-40">
                  <div className="border-b border-black h-8 w-full mx-auto"></div>
                  <p className="text-[9px] font-bold uppercase mt-1 text-gray-700">Resident Signature</p>
                </div>
                <div className="text-center w-40 ml-auto">
                  <div className="border-b border-black h-8 w-full mx-auto"></div>
                  <p className="text-[9px] font-bold uppercase mt-1 text-gray-700">Authorized Signatory & Seal</p>
                </div>
              </div>
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