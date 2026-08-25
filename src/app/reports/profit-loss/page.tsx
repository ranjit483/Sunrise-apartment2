'use client'

import { useState, useEffect, useMemo } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { collection, query, onSnapshot, getDocs, where } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Download, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ProfitLossPage() {
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [dateFilter, setDateFilter] = useState<string>('this_month')

  useEffect(() => {
    setLoading(true)
    
    // Fetch all paid and partial invoices for revenue
    const qInvoices = query(collection(db, 'invoices'), where('status', 'in', ['paid', 'partial']))
    const unsubInvoices = onSnapshot(qInvoices, (snap: any) => {
      const invs: any[] = []
      snap.forEach((doc: any) => invs.push({ id: doc.id, ...doc.data() }))
      setInvoices(invs)
      
      // Fetch all approved/paid expenses
      const qExpenses = query(collection(db, 'expenses')) // We filter status client-side to avoid index requirement for now
      getDocs(qExpenses).then((expSnap: any) => {
        const exps: any[] = []
        expSnap.forEach((doc: any) => exps.push({ id: doc.id, ...doc.data() }))
        setExpenses(exps.filter(e => e.status === 'approved' || e.status === 'paid' || !e.status))
        
        // Fetch all completed payments
        const qPayments = query(collection(db, 'payments'))
        getDocs(qPayments).then((paySnap: any) => {
          const pays: any[] = []
          paySnap.forEach((doc: any) => pays.push({ id: doc.id, ...doc.data() }))
          // Payments that actually resulted in cash/bank balance
          setPayments(pays.filter(p => p.status === 'completed'))
          setLoading(false)
        })
      })
    })

    return () => unsubInvoices()
  }, [])

  const filteredData = useMemo(() => {
    const now = new Date()
    let startDate: Date
    let endDate = new Date() // today

    if (dateFilter === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    } else if (dateFilter === 'last_month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      endDate = new Date(now.getFullYear(), now.getMonth(), 0)
    } else if (dateFilter === 'ytd') {
      startDate = new Date(now.getFullYear(), 0, 1)
    } else {
      startDate = new Date(2000, 0, 1) // all time
    }

    const filteredInvoices = invoices.filter(inv => {
      // Invoices use 'month' (YYYY-MM) or 'createdAt'. We'll use createdAt if available, else month-01
      const invDate = new Date(inv.createdAt ? inv.createdAt : `${inv.month}-01`)
      return invDate >= startDate && invDate <= endDate
    })

    const filteredExpenses = expenses.filter(exp => {
      // Expenses use 'date' (YYYY-MM-DD)
      const expDate = new Date(exp.date || exp.createdAt)
      return expDate >= startDate && expDate <= endDate
    })

    // Compute Revenues
    let totalServiceCharge = 0
    let totalElectricity = 0
    let totalUtility = 0
    let totalWater = 0
    let totalDiesel = 0
    let totalInsurance = 0
    let totalStructureMaintenance = 0
    let totalLatePenalty = 0
    let totalOther = 0
    let totalPartialPayment = 0
    let totalElectricityVat = 0

    filteredInvoices.forEach(inv => {
      if (inv.status === 'partial') {
        // Log all collected cash for partial invoices under 'Partial Payment'
        totalPartialPayment += (inv.paidAmount || 0)
      } else {
        // Once fully paid, split into respective heads
        totalServiceCharge += (inv.amount || 0)
        totalElectricity += (inv.electricityAmount || 0)
        totalElectricityVat += (inv.electricityVatAmount || 0)
        totalUtility += (inv.utilityAmount || 0)
        totalWater += (inv.waterAmount || 0)
        totalDiesel += (inv.generatorAmount || 0) + (inv.dieselAmount || 0)
        totalInsurance += (inv.insuranceAmount || 0)
        totalStructureMaintenance += (inv.structureMaintenanceAmount || 0)
        totalLatePenalty += (inv.latePenaltyAmount || 0)
        totalOther += (inv.otherAmount || 0)
      }
    })

    const totalRevenue = totalServiceCharge + totalElectricity + totalElectricityVat + totalUtility + totalWater + totalDiesel + totalInsurance + totalStructureMaintenance + totalLatePenalty + totalOther + totalPartialPayment

    // Compute Expenses
    const expensesByCategory: Record<string, number> = {}
    let totalExpense = 0

    filteredExpenses.forEach(exp => {
      const cat = exp.category || 'Uncategorized'
      const catLower = cat.toLowerCase()
      if (catLower.includes('bank') || catLower.includes('goble') || catLower.includes('globle') || catLower.includes('ime')) {
        // Exclude Bank Deposits from Operating Expenses in P&L
        return;
      }
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + Number(exp.amount)
      totalExpense += Number(exp.amount)
    })

    // Compute Global Balances (independent of date filter)
    let globalCashBalance = 0
    let globalBankBalance = 0

    payments.forEach(p => {
      if (p.method === 'cash') {
        globalCashBalance += Number(p.amount || 0)
      } else {
        globalBankBalance += Number(p.amount || 0) // qr, online, cheque
      }
    })

    expenses.forEach(exp => {
      const cat = (exp.category || '').toLowerCase()
      if (cat.includes('bank') || cat.includes('goble') || cat.includes('globle') || cat.includes('ime')) {
        // This is a deposit from Cash to Bank
        globalCashBalance -= Number(exp.amount || 0)
        globalBankBalance += Number(exp.amount || 0)
      } else {
        // Normal expense. Default to paying from Bank Account.
        globalBankBalance -= Number(exp.amount || 0)
      }
    })

    // Sort categories alphabetically
    const sortedExpenseCategories = Object.keys(expensesByCategory).sort()

    return {
      totalServiceCharge,
      totalElectricity,
      totalElectricityVat,
      totalUtility,
      totalWater,
      totalDiesel,
      totalInsurance,
      totalStructureMaintenance,
      totalLatePenalty,
      totalOther,
      totalPartialPayment,
      totalRevenue,
      expensesByCategory,
      sortedExpenseCategories,
      totalExpense,
      netProfit: totalRevenue - totalExpense,
      globalCashBalance,
      globalBankBalance
    }
  }, [invoices, expenses, payments, dateFilter])

  return (
    <DashboardLayout title="Profit & Loss Statement">
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
          <div>
            <h2 className="text-3xl font-bold">Profit & Loss</h2>
            <p className="text-muted-foreground">Financial statement of revenues and expenses</p>
          </div>
          <div className="flex gap-2">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="ytd">Year to Date (YTD)</SelectItem>
                <SelectItem value="all_time">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <Card className="bg-white print:shadow-none print:border-none">
            <CardHeader className="text-center border-b pb-6">
              <CardTitle className="text-2xl uppercase tracking-wider">Statement of Profit & Loss</CardTitle>
              <p className="text-muted-foreground mt-2">
                For the period: {dateFilter.replace('_', ' ').toUpperCase()}
              </p>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              <div className="w-full">
                {/* Revenue Section */}
                <div className="mb-8">
                  <h3 className="font-bold text-lg border-b pb-2 mb-4 text-emerald-800">REVENUE (INCOME)</h3>
                  <div className="space-y-3 px-4">
                    {filteredData.totalServiceCharge > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service Charge & Rent Income</span>
                        <span>₨ {filteredData.totalServiceCharge.toLocaleString()}</span>
                      </div>
                    )}
                    {filteredData.totalElectricity > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Electricity Income</span>
                        <span>₨ {filteredData.totalElectricity.toLocaleString()}</span>
                      </div>
                    )}
                    {filteredData.totalElectricityVat > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Electricity Vat 13%</span>
                        <span>₨ {filteredData.totalElectricityVat.toLocaleString()}</span>
                      </div>
                    )}
                    {filteredData.totalUtility > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Utility Income</span>
                        <span>₨ {filteredData.totalUtility.toLocaleString()}</span>
                      </div>
                    )}
                    {filteredData.totalWater > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Water Income</span>
                        <span>₨ {filteredData.totalWater.toLocaleString()}</span>
                      </div>
                    )}
                    {filteredData.totalDiesel > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Diesel Cost Sharing</span>
                        <span>₨ {filteredData.totalDiesel.toLocaleString()}</span>
                      </div>
                    )}
                    {filteredData.totalInsurance > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Insurance Sharing</span>
                        <span>₨ {filteredData.totalInsurance.toLocaleString()}</span>
                      </div>
                    )}
                    {filteredData.totalStructureMaintenance > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Structure Maintenance</span>
                        <span>₨ {filteredData.totalStructureMaintenance.toLocaleString()}</span>
                      </div>
                    )}
                    {filteredData.totalLatePenalty > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Late Penalties</span>
                        <span>₨ {filteredData.totalLatePenalty.toLocaleString()}</span>
                      </div>
                    )}
                    {filteredData.totalOther > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Other Income</span>
                        <span>₨ {filteredData.totalOther.toLocaleString()}</span>
                      </div>
                    )}
                    {filteredData.totalPartialPayment > 0 && (
                      <div className="flex justify-between font-medium text-emerald-700">
                        <span>Partial Payments (Unallocated)</span>
                        <span>₨ {filteredData.totalPartialPayment.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between font-bold text-lg mt-4 px-4 pt-4 border-t border-dashed">
                    <span>Total Revenue</span>
                    <span className="text-emerald-700">₨ {filteredData.totalRevenue.toLocaleString()}</span>
                  </div>
                </div>

                {/* Expenses Section */}
                <div className="mb-8">
                  <h3 className="font-bold text-lg border-b pb-2 mb-4 text-red-800">OPERATING EXPENSES</h3>
                  <div className="space-y-3 px-4">
                    {filteredData.sortedExpenseCategories.length === 0 ? (
                      <p className="text-muted-foreground italic text-sm">No expenses recorded in this period.</p>
                    ) : (
                      filteredData.sortedExpenseCategories.map(cat => (
                        <div key={cat} className="flex justify-between">
                          <span className="text-muted-foreground">{cat}</span>
                          <span>₨ {filteredData.expensesByCategory[cat].toLocaleString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex justify-between font-bold text-lg mt-4 px-4 pt-4 border-t border-dashed">
                    <span>Total Expenses</span>
                    <span className="text-red-700">₨ {filteredData.totalExpense.toLocaleString()}</span>
                  </div>
                </div>

                {/* Net Profit Section */}
                <div className={`mt-12 flex justify-between items-center font-bold text-xl p-4 rounded-lg ${
                  filteredData.netProfit >= 0 ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-900 border border-red-200'
                }`}>
                  <span>NET {filteredData.netProfit >= 0 ? 'PROFIT' : 'LOSS'}</span>
                  <span>₨ {Math.abs(filteredData.netProfit).toLocaleString()}</span>
                </div>
                
                {/* Bank & Cash Balances Section */}
                <div className="mt-8 border-t pt-8">
                  <h3 className="font-bold text-lg border-b pb-2 mb-4 text-blue-800">BANK & CASH BALANCES</h3>
                  <div className="space-y-3 px-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-medium">IME Globle Bank</span>
                      <span className="font-medium text-blue-900">₨ {filteredData.globalBankBalance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground font-medium">Cash</span>
                      <span className="font-medium text-blue-900">₨ {filteredData.globalCashBalance.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
