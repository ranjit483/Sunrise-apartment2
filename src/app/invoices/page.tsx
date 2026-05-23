'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { db } from '@/config/firebase'
import { collection, onSnapshot, query, orderBy, getDocs, doc, writeBatch, where, updateDoc } from 'firebase/firestore'
import { Invoice, Unit } from '@/types/models'
import { Loader2, Plus, Send, Edit2, CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  paid: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  overdue: 'bg-red-100 text-red-800',
}

export default function InvoicesPage() {
  const { profile } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isPostingDrafts, setIsPostingDrafts] = useState(false)
  
  const [invoiceMonth, setInvoiceMonth] = useState('')
  const [invoiceDueDate, setInvoiceDueDate] = useState('')

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
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bData: Invoice[] = []
      snapshot.forEach((doc: any) => {
        bData.push(doc.data() as Invoice)
      })
      setInvoices(bData)
      setLoading(false)
    }, (error) => {
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
          month: invoiceMonth,
          amount: matchingUnit ? (matchingUnit.rent || 0) : 0,
          electricityReading: 0,
          electricityAmount: 0,
          dueDate: invoiceDueDate,
          status: 'draft', // Generated as DRAFT initially
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
        // Note: Firestore batches have a 500 operation limit. Assuming < 500 invoices for now.
      })
      await batch.commit()
      alert(`Successfully deleted ${count} invoices!`)
    } catch (error: any) {
      console.error('Error deleting invoices:', error)
      alert('Failed to delete invoices: ' + error.message)
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

  const draftCount = invoices.filter(i => i.status === 'draft').length
  const pendingCount = invoices.filter(i => i.status === 'pending').length
  const overdueCount = invoices.filter(i => i.status === 'overdue').length
  const collectedAmount = invoices.filter(i => i.status === 'paid').reduce((acc, i) => acc + i.amount + (i.electricityAmount || 0), 0)
  const outstandingAmount = invoices.filter(i => i.status === 'pending' || i.status === 'overdue').reduce((acc, i) => acc + i.amount + (i.electricityAmount || 0), 0)

  return (
    <DashboardLayout title="Invoices & Billing">
      <div className="space-y-6">
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
                  <Button className="gap-2">
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
                        placeholder="e.g. May 2026" 
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
                      <Button onClick={handleGenerateDrafts} disabled={isGenerating} className="gap-2 bg-primary">
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
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Overdue</p><p className="text-2xl font-bold">{overdueCount}</p></CardContent></Card>
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
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 text-left">Invoice ID</th>
                    <th className="pb-3 text-left">Unit</th>
                    <th className="pb-3 text-left">Month</th>
                    <th className="pb-3 text-left">Due Date</th>
                    <th className="pb-3 text-left">Rent</th>
                    <th className="pb-3 text-left">Electricity</th>
                    <th className="pb-3 text-left">Total</th>
                    <th className="pb-3 text-left">Status</th>
                    {canManageInvoices && <th className="pb-3 text-left">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const total = inv.amount + (inv.electricityAmount || 0)
                    return (
                      <tr key={inv.id} className="border-b">
                        <td className="py-3 font-medium">{inv.id.substring(0, 8)}...</td>
                        <td className="py-3">{inv.unitId.substring(0,8)}...</td>
                        <td className="py-3">{inv.month}</td>
                        <td className="py-3">{inv.dueDate}</td>
                        <td className="py-3">₨ {inv.amount.toLocaleString()}</td>
                        <td className="py-3">₨ {(inv.electricityAmount || 0).toLocaleString()}</td>
                        <td className="py-3 font-semibold text-primary">₨ {total.toLocaleString()}</td>
                        <td className="py-3"><Badge variant="outline" className={statusColors[inv.status] || ''}>{inv.status.toUpperCase()}</Badge></td>
                        {canManageInvoices && (
                          <td className="py-3">
                            {inv.status === 'draft' && (
                              <Button variant="ghost" size="sm" onClick={() => openEditModal(inv)}>
                                <Edit2 className="h-4 w-4 text-blue-500" />
                              </Button>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Draft Invoice</DialogTitle>
            <DialogDescription>Update the invoice details, including electricity readings and charges.</DialogDescription>
          </DialogHeader>
          {editingInvoice && (
            <div className="space-y-4 pt-4">
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
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isUpdating}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateInvoice} disabled={isUpdating}>
                  {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}