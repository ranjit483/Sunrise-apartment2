'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { db } from '@/config/firebase'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { Expense } from '@/types/models'
import { Loader2 } from 'lucide-react'

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'expenses'), orderBy('date', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const eData: Expense[] = []
      snapshot.forEach((doc: any) => {
        eData.push(doc.data() as Expense)
      })
      setExpenses(eData)
      setLoading(false)
    }, (error: any) => {
      console.error('Error fetching expenses:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0)
  const staffSalary = expenses.filter(e => e.category === 'Staff Salary').reduce((acc, e) => acc + e.amount, 0)
  const maintenance = expenses.filter(e => e.category === 'Maintenance' || e.category === 'Repair').reduce((acc, e) => acc + e.amount, 0)

  return (
    <DashboardLayout title="Expenses">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Expenses</h2>
          <p className="text-muted-foreground">Track and manage expenses</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Total Expenses</p><p className="text-2xl font-bold">₨ {totalExpenses.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">This Month</p><p className="text-2xl font-bold">₨ {totalExpenses.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Staff Salary</p><p className="text-2xl font-bold">₨ {staffSalary.toLocaleString()}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Maintenance</p><p className="text-2xl font-bold">₨ {maintenance.toLocaleString()}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Recent Expenses</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No expenses found. Please seed the database.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 text-left">Category</th>
                    <th className="pb-3 text-left">Description</th>
                    <th className="pb-3 text-left">Amount</th>
                    <th className="pb-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className="border-b">
                      <td className="py-3">{e.category}</td>
                      <td className="py-3">{e.description}</td>
                      <td className="py-3">₨{e.amount.toLocaleString()}</td>
                      <td className="py-3">{e.date}</td>
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