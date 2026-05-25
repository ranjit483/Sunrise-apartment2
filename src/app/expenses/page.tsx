'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { db } from '@/config/firebase'
import { collection, onSnapshot, query, orderBy, doc, setDoc, updateDoc } from 'firebase/firestore'
import { Expense, ChartOfAccount, Building } from '@/types/models'
import { Loader2, Plus, CheckCircle2, XCircle } from 'lucide-react'

const EXPENSE_CATEGORIES = [
  "Goble Bank LTD.",
  "Staff Salaries",
  "Staff Allowances",
  "Provident Fund (PF) Contribution",
  "Gratuity/Pension Expense",
  "Staff Welfare/Training",
  "Electricity & Water",
  "Communication Expenses",
  "Office Stationery & Supplies",
  "Repair & Maintenance (Office)",
  "Cleaning & Janitorial",
  "Audit Fees",
  "Legal & Professional Charges",
  "Registration & Renewal Fees",
  "Insurance Expenses",
  "Postage & Courier",
  "Advertising & Sales Promotion",
  "Business Travel & Conveyance",
  "Outstation Travel & Lodging",
  "Client Hospitality",
  "Bank Charges & Commission",
  "Interest on Loans",
  "Depreciation",
  "Fines & Penalties",
  "Vehicle Running Expenses",
  "Subscription & Periodicals",
  "Printing & Photocopying",
  "Donations & CSR",
  "Miscellaneous Expenses",
  "Input VAT (Non-Recoverable)",
  "Parties Payment",
  "Elevator",
  "Water Treatment"
]
import { useAuth } from '@/context/AuthContext'

export default function ExpensesPage() {
  const { profile, user } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    accountId: '',
    buildingId: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    const unsubExp = onSnapshot(query(collection(db, 'expenses'), orderBy('date', 'desc')), (snapshot: any) => {
      const eData: Expense[] = []
      snapshot.forEach((doc: any) => eData.push({ id: doc.id, ...doc.data() } as Expense))
      setExpenses(eData)
      setLoading(false)
    })

    const unsubAcc = onSnapshot(query(collection(db, 'chart_of_accounts')), (snapshot: any) => {
      const acc: ChartOfAccount[] = []
      snapshot.forEach((doc: any) => {
        const data = doc.data() as ChartOfAccount
        if (data.type === 'Expense') acc.push(data)
      })
      setAccounts(acc)
    })

    const unsubBuild = onSnapshot(query(collection(db, 'buildings')), (snapshot: any) => {
      const bData: Building[] = []
      snapshot.forEach((doc: any) => bData.push({ id: doc.id, ...doc.data() } as Building))
      setBuildings(bData)
    })

    return () => {
      unsubExp()
      unsubAcc()
      unsubBuild()
    }
  }, [])

  const canApprove = profile?.role === 'SUPER_ADMIN' || profile?.role === 'ACCOUNTANT'
  const isManager = profile?.role === 'MANAGER'

  // If manager, filter expenses to only show their buildings (assuming we filter client-side for now, but ideally server-side)
  // For now, Managers just submit. Super Admins see all.
  const filteredExpenses = expenses

  const handleSave = async () => {
    if (!formData.accountId || !formData.amount || !formData.date) {
      alert('Please fill required fields.')
      return
    }
    
    setIsSaving(true)
    try {
      // Allow selectedAcc fallback if they had an old id, but new ones will just use the string.
      const selectedAcc = accounts.find(a => a.id === formData.accountId)
      const categoryName = selectedAcc ? selectedAcc.name : formData.accountId

      const id = `exp-${Date.now()}`
      const ref = doc(db, 'expenses', id)
      
      const payload: Expense = {
        id,
        accountId: formData.accountId, // Store the string selection or old id
        buildingId: formData.buildingId || undefined,
        category: categoryName || 'Uncategorized',
        description: formData.description,
        amount: Number(formData.amount),
        date: formData.date,
        status: canApprove ? 'approved' : 'pending_approval',
        approvedBy: canApprove ? user?.uid : undefined,
        createdAt: new Date().toISOString()
      }

      await setDoc(ref, payload)
      setIsModalOpen(false)
      setFormData({ accountId: '', buildingId: '', description: '', amount: '', date: new Date().toISOString().split('T')[0] })
      alert('Expense recorded successfully!')
    } catch (error: any) {
      console.error('Error saving expense:', error)
      alert('Failed to save expense.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: Expense['status']) => {
    if (!canApprove) return
    try {
      await updateDoc(doc(db, 'expenses', id), {
        status: newStatus,
        approvedBy: user?.uid
      })
    } catch (error: any) {
      console.error('Error updating status:', error)
      alert('Failed to update status.')
    }
  }

  const approvedExpenses = filteredExpenses.filter(e => e.status === 'approved' || e.status === 'paid' || !e.status) // backward compat for old expenses
  const totalExpenses = approvedExpenses.reduce((acc, e) => acc + e.amount, 0)
  const pendingCount = filteredExpenses.filter(e => e.status === 'pending_approval').length

  return (
    <DashboardLayout title="Expenses">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Expenses</h2>
            <p className="text-muted-foreground">Track and manage property expenses</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Record Expense
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Total Approved</p><p className="text-2xl font-bold">₨ {totalExpenses.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Pending Approvals</p><p className="text-2xl font-bold text-yellow-600">{pendingCount}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Recent Expenses</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : filteredExpenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No expenses found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-3 px-2">Date</th>
                      <th className="pb-3 px-2">Category</th>
                      <th className="pb-3 px-2">Description</th>
                      <th className="pb-3 px-2">Building</th>
                      <th className="pb-3 px-2 text-right">Amount</th>
                      <th className="pb-3 px-2 text-center">Status</th>
                      {canApprove && <th className="pb-3 px-2 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((e) => (
                      <tr key={e.id} className="border-b">
                        <td className="py-3 px-2">{e.date}</td>
                        <td className="py-3 px-2 font-medium">{e.category}</td>
                        <td className="py-3 px-2">{e.description}</td>
                        <td className="py-3 px-2 text-sm text-muted-foreground">
                          {buildings.find(b => b.id === e.buildingId)?.name || 'General'}
                        </td>
                        <td className="py-3 px-2 text-right font-bold text-destructive">₨ {e.amount.toLocaleString()}</td>
                        <td className="py-3 px-2 text-center">
                          <Badge variant={e.status === 'approved' || e.status === 'paid' ? 'success' : e.status === 'rejected' ? 'destructive' : 'warning'}>
                            {(e.status || 'approved').replace('_', ' ').toUpperCase()}
                          </Badge>
                        </td>
                        {canApprove && (
                          <td className="py-3 px-2 text-right">
                            {e.status === 'pending_approval' && (
                              <div className="flex items-center justify-end gap-2">
                                <Button size="sm" variant="outline" className="text-green-600 hover:bg-green-50" onClick={() => handleUpdateStatus(e.id, 'approved')}>
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleUpdateStatus(e.id, 'rejected')}>
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record New Expense</DialogTitle>
            <DialogDescription>Submit an expense for {canApprove ? 'direct recording' : 'approval'}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Expense Account Category *</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.accountId}
                onChange={(e) => setFormData({...formData, accountId: e.target.value})}
              >
                <option value="">Select an account...</option>
                {EXPENSE_CATEGORIES.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label>Building (Optional)</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.buildingId}
                onChange={(e) => setFormData({...formData, buildingId: e.target.value})}
              >
                <option value="">General / Headquarters</option>
                {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                placeholder="e.g. Fixing pipe in Building A" 
                value={formData.description} 
                onChange={(e) => setFormData({...formData, description: e.target.value})} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (₨) *</Label>
                <Input 
                  type="number"
                  placeholder="0.00" 
                  value={formData.amount} 
                  onChange={(e) => setFormData({...formData, amount: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input 
                  type="date"
                  value={formData.date} 
                  onChange={(e) => setFormData({...formData, date: e.target.value})} 
                />
              </div>
            </div>

            <Button className="w-full mt-4" onClick={handleSave} disabled={isSaving || !formData.accountId || !formData.amount}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {canApprove ? 'Save Expense' : 'Submit for Approval'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}