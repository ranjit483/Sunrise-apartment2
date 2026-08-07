'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { collection, query, where, onSnapshot, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { Invoice, Payment } from '@/types/models'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  const [tenants, setTenants] = useState<UserData[]>([])
  const [selectedTenant, setSelectedTenant] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  
  const [totalBilled, setTotalBilled] = useState(0)
  const [totalPaid, setTotalPaid] = useState(0)
  const [balanceDue, setBalanceDue] = useState(0)

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
          <CardContent>
            <Select value={selectedTenant} onValueChange={setSelectedTenant}>
              <SelectTrigger>
                <SelectValue placeholder="Search or select a tenant..." />
              </SelectTrigger>
              <SelectContent>
                {tenants.map(t => (
                  <SelectItem key={t.uid} value={t.uid}>
                    {t.fullName} {t.unitNumber ? `(${t.unitNumber})` : ''}
                  </SelectItem>
                ))}
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
    </DashboardLayout>
  )
}
