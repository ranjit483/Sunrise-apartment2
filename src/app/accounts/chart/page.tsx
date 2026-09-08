'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { db } from '@/config/firebase'
import { collection, onSnapshot, query, doc, setDoc, deleteDoc } from 'firebase/firestore'
import { ChartOfAccount } from '@/types/models'
import { Loader2, Plus, Edit2, Trash2, Lock } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function ChartOfAccountsPage() {
  const { profile } = useAuth()
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null)

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'Expense' as ChartOfAccount['type']
  })

  useEffect(() => {
    const q = query(collection(db, 'chart_of_accounts'))
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const data: ChartOfAccount[] = []
      snapshot.forEach((doc: any) => data.push(doc.data() as ChartOfAccount))
      setAccounts(data.sort((a, b) => a.code.localeCompare(b.code)))
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const handleOpenModal = (account?: ChartOfAccount) => {
    if (account) {
      setEditingAccount(account)
      setFormData({
        code: account.code,
        name: account.name,
        type: account.type
      })
    } else {
      setEditingAccount(null)
      setFormData({ code: '', name: '', type: 'Expense' })
    }
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.code || !formData.name) {
      alert('Please fill all required fields.')
      return
    }

    setIsSaving(true)
    try {
      const id = editingAccount ? editingAccount.id : `acc-${Date.now()}`
      const ref = doc(db, 'chart_of_accounts', id)
      
      const payload: ChartOfAccount = {
        id,
        code: formData.code,
        name: formData.name,
        type: formData.type,
        isSystemLocked: editingAccount ? editingAccount.isSystemLocked : false,
        createdAt: editingAccount ? editingAccount.createdAt : new Date().toISOString()
      }

      await setDoc(ref, payload)
      setIsModalOpen(false)
    } catch (error: any) {
      console.error('Error saving account:', error)
      alert('Failed to save account: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (account: ChartOfAccount) => {
    if (account.isSystemLocked) {
      alert('System locked accounts cannot be deleted.')
      return
    }
    if (!confirm(`Are you sure you want to delete ${account.name}?`)) return

    try {
      await deleteDoc(doc(db, 'chart_of_accounts', account.id))
    } catch (error: any) {
      console.error('Error deleting account:', error)
      alert('Failed to delete account: ' + error.message)
    }
  }

  const canManage = profile?.role === 'SUPER_ADMIN' || profile?.role === 'ACCOUNTANT'

  return (
    <DashboardLayout title="Chart of Accounts">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold">Chart of Accounts</h2>
            <p className="text-xs text-muted-foreground">Manage financial account categories</p>
          </div>
          {canManage && (
            <Button onClick={() => handleOpenModal()} size="sm" className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Add Account
            </Button>
          )}
        </div>

        <Card>
          <CardHeader className="py-3"><CardTitle className="text-base font-bold">All Accounts</CardTitle></CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No accounts found. Please run the database seed to load standard accounts.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="py-2 px-3 font-semibold text-gray-600">Code</th>
                      <th className="py-2 px-3 font-semibold text-gray-600">Name</th>
                      <th className="py-2 px-3 font-semibold text-gray-600">Type</th>
                      <th className="py-2 px-3 font-semibold text-gray-600">Status</th>
                      {canManage && <th className="py-2 px-3 font-semibold text-gray-600 text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((acc) => (
                      <tr key={acc.id} className="border-b hover:bg-muted/50 transition-colors">
                        <td className="py-2 px-3 font-semibold">{acc.code}</td>
                        <td className="py-2 px-3">{acc.name}</td>
                        <td className="py-2 px-3">
                          <Badge variant={acc.type === 'Revenue' ? 'success' : acc.type === 'Expense' ? 'destructive' : 'default'} className="text-[10px] px-2 py-0.5">
                            {acc.type}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">
                          {acc.isSystemLocked ? (
                            <div className="flex items-center text-[10px] text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded-md w-max">
                              <Lock className="h-3 w-3 mr-1" /> Locked
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-2 py-0.5">Custom</Badge>
                          )}
                        </td>
                        {canManage && (
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {!acc.isSystemLocked && (
                                <>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleOpenModal(acc)}>
                                    <Edit2 className="h-3.5 w-3.5 text-blue-500" />
                                  </Button>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(acc)}>
                                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                  </Button>
                                </>
                              )}
                            </div>
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
            <DialogTitle>{editingAccount ? 'Edit Account' : 'Add New Account'}</DialogTitle>
            <DialogDescription>Add a new category to track income or expenses.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Account Code</Label>
              <Input 
                placeholder="e.g. 5500" 
                value={formData.code} 
                onChange={(e) => setFormData({...formData, code: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Account Name</Label>
              <Input 
                placeholder="e.g. Internet Bill" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value as any})}
              >
                <option value="Revenue">Revenue</option>
                <option value="Expense">Expense</option>
                <option value="Asset">Asset</option>
                <option value="Liability">Liability</option>
                <option value="Equity">Equity</option>
              </select>
            </div>
            <Button className="w-full mt-4" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
