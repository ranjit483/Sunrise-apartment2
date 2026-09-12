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
import { collection, onSnapshot, query, orderBy, doc, setDoc, updateDoc, limit } from 'firebase/firestore'
import { Expense, ChartOfAccount, Building } from '@/types/models'
import { Loader2, Plus, CheckCircle2, XCircle } from 'lucide-react'
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
        acc.push({ ...data, id: doc.id })
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
      
      const payload: any = {
        id,
        accountId: formData.accountId,
        category: categoryName || 'Uncategorized',
        description: formData.description,
        amount: Number(formData.amount),
        date: formData.date,
        status: canApprove ? 'approved' : 'pending_approval',
        createdAt: new Date().toISOString()
      }

      if (formData.buildingId) {
        payload.buildingId = formData.buildingId
      }

      if (canApprove && user?.uid) {
        payload.approvedBy = user.uid
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
      <div className="space-y-3 sm:space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-3xl font-bold tracking-tight">Expenses</h2>
            <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">Track and manage property expenses</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} size="sm" className="gap-1.5 h-8 sm:h-10 text-xs sm:text-sm px-2.5 sm:px-4">
            <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Record Expense
          </Button>
        </div>

        <div className="grid gap-2 sm:gap-4 grid-cols-2 md:grid-cols-4">
          <Card><CardContent className="p-2.5 sm:p-6"><p className="text-[10px] sm:text-sm font-medium text-muted-foreground">Total Approved</p><p className="text-sm sm:text-2xl font-bold mt-0.5 sm:mt-1">₨ {totalExpenses.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="p-2.5 sm:p-6"><p className="text-[10px] sm:text-sm font-medium text-muted-foreground">Pending Approvals</p><p className="text-sm sm:text-2xl font-bold text-yellow-600 mt-0.5 sm:mt-1">{pendingCount}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3"><CardTitle className="text-sm sm:text-xl font-bold">Recent Expenses</CardTitle></CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {loading ? (
              <div className="flex justify-center py-6 sm:py-8"><Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" /></div>
            ) : filteredExpenses.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-xs sm:text-sm text-muted-foreground">No expenses found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b text-[10px] sm:text-xs uppercase text-muted-foreground font-semibold">
                      <th className="pb-2 px-1.5 sm:px-2">Date</th>
                      <th className="pb-2 px-1.5 sm:px-2">Category</th>
                      <th className="pb-2 px-1.5 sm:px-2">Description</th>
                      <th className="pb-2 px-1.5 sm:px-2">Building</th>
                      <th className="pb-2 px-1.5 sm:px-2 text-right">Amount</th>
                      <th className="pb-2 px-1.5 sm:px-2 text-center">Status</th>
                      {canApprove && <th className="pb-2 px-1.5 sm:px-2 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((e) => (
                      <tr key={e.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-1.5 sm:py-3 px-1.5 sm:px-2 text-[10px] sm:text-sm">{e.date}</td>
                        <td className="py-1.5 sm:py-3 px-1.5 sm:px-2 font-semibold text-xs sm:text-sm text-gray-900">{e.category}</td>
                        <td className="py-1.5 sm:py-3 px-1.5 sm:px-2 text-[10px] sm:text-sm">{e.description}</td>
                        <td className="py-1.5 sm:py-3 px-1.5 sm:px-2 text-[10px] sm:text-sm text-muted-foreground">
                          {buildings.find(b => b.id === e.buildingId)?.name || 'General'}
                        </td>
                        <td className="py-1.5 sm:py-3 px-1.5 sm:px-2 text-right font-bold text-destructive text-xs sm:text-sm">₨ {e.amount.toLocaleString()}</td>
                        <td className="py-1.5 sm:py-3 px-1.5 sm:px-2 text-center">
                          <Badge variant={e.status === 'approved' || e.status === 'paid' ? 'success' : e.status === 'rejected' ? 'destructive' : 'warning'} className="text-[9px] sm:text-xs px-1.5 py-0.5">
                            {(e.status || 'approved').replace('_', ' ').toUpperCase()}
                          </Badge>
                        </td>
                        {canApprove && (
                          <td className="py-1.5 sm:py-3 px-1.5 sm:px-2 text-right">
                            {e.status === 'pending_approval' && (
                              <div className="flex items-center justify-end gap-1.5">
                                <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-green-600 hover:bg-green-50" onClick={() => handleUpdateStatus(e.id, 'approved')}>
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-red-600 hover:bg-red-50" onClick={() => handleUpdateStatus(e.id, 'rejected')}>
                                  <XCircle className="h-3.5 w-3.5" />
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-xl font-bold">Record New Expense</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">Submit an expense for {canApprove ? 'direct recording' : 'approval'}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1 sm:space-y-2">
              <Label className="text-xs sm:text-sm font-semibold">Expense Account Category *</Label>
              <select 
                className="flex h-8 sm:h-10 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs sm:text-sm"
                value={formData.accountId}
                onChange={(e) => setFormData({...formData, accountId: e.target.value})}
              >
                <option value="">Select an account...</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.name}>{acc.name} ({acc.type})</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1 sm:space-y-2">
              <Label className="text-xs sm:text-sm font-semibold">Building (Optional)</Label>
              <select 
                className="flex h-8 sm:h-10 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs sm:text-sm"
                value={formData.buildingId}
                onChange={(e) => setFormData({...formData, buildingId: e.target.value})}
              >
                <option value="">General / Headquarters</option>
                {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>

            <div className="space-y-1 sm:space-y-2">
              <Label className="text-xs sm:text-sm font-semibold">Description</Label>
              <Input 
                placeholder="e.g. Fixing pipe in Building A" 
                value={formData.description} 
                onChange={(e) => setFormData({...formData, description: e.target.value})} 
                className="h-8 sm:h-10 text-xs sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-xs sm:text-sm font-semibold">Amount (₨) *</Label>
                <Input 
                  type="number"
                  placeholder="0.00" 
                  value={formData.amount} 
                  onChange={(e) => setFormData({...formData, amount: e.target.value})} 
                  className="h-8 sm:h-10 text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-1 sm:space-y-2">
                <Label className="text-xs sm:text-sm font-semibold">Date *</Label>
                <Input 
                  type="date"
                  value={formData.date} 
                  onChange={(e) => setFormData({...formData, date: e.target.value})} 
                  className="h-8 sm:h-10 text-xs sm:text-sm"
                />
              </div>
            </div>

            <Button className="w-full mt-3 h-8 sm:h-10 text-xs sm:text-sm" onClick={handleSave} disabled={isSaving || !formData.accountId || !formData.amount}>
              {isSaving ? <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin mr-2" /> : null}
              {canApprove ? 'Save Expense' : 'Submit for Approval'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}