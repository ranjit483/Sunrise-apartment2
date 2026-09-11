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
      <div className="space-y-3 sm:space-y-4 max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 sm:gap-3 print:hidden">
          <div>
            <h2 className="text-base sm:text-xl font-bold tracking-tight">Profit & Loss</h2>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Financial statement of revenues and expenses</p>
          </div>
          <div className="flex gap-2">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[120px] sm:w-[150px] h-8 sm:h-9 text-xs">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_month">This Month</SelectItem>
                <SelectItem value="last_month">Last Month</SelectItem>
                <SelectItem value="ytd">Year to Date (YTD)</SelectItem>
                <SelectItem value="all_time">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-1.5 h-8 sm:h-9 text-xs px-2.5 sm:px-3" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <Card className="bg-white print:shadow-none print:border-none">
            <CardHeader className="text-center border-b pb-2 sm:pb-3 p-3 sm:p-4">
              <CardTitle className="text-xs sm:text-base font-bold uppercase tracking-wider">Statement of Profit & Loss</CardTitle>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">
                For the period: {dateFilter.replace('_', ' ').toUpperCase()}
              </p>
            </CardHeader>
            <CardContent className="p-2 sm:p-4">
              <div className="w-full">
                {/* Revenue Section */}
                <div className="mb-3 sm:mb-6">
                  <h3 className="font-bold text-xs sm:text-sm border-b pb-1 sm:pb-1.5 mb-2 sm:mb-3 text-emerald-800">REVENUE (INCOME)</h3>
                  <div className="space-y-1 sm:space-y-2 px-2 sm:px-3">
                    {filteredData.totalServiceCharge > 0 && (
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground text-[10px] sm:text-xs">Service Charge & Rent Income</span>
                        <span className="font-medium">₨ {filteredData.totalServiceCharge.toLocaleString()}</span>
                      </div>
                    )}
                    {filteredData.totalElectricity > 0 && (
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground text-[10px] sm:text-xs">Electricity Income</span>
                        <span className="font-medium">₨ {filteredData.totalElectricity.toLocaleString()}</span>
                      </div>
                    )}
                    {filteredData.totalElectricityVat > 0 && (
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground text-[10px] sm:text-xs">Electricity Vat 13%</span>
                        <span className="font-medium">₨ {filteredData.totalElectricityVat.toLocaleString()}</span>
                      </div>
                    )}
                    {filteredData.totalUtility > 0 && (
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground text-[10px] sm:text-xs">Utility Income</span>
                        <span className="font-medium">₨ {filteredData.totalUtility.toLocaleString()}</span>
                      </div>
                    )}
                    {filteredData.totalWater > 0 && (
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground text-[10px] sm:text-xs">Water Income</span>
                        <span className="font-medium">₨ {filteredData.totalWater.toLocaleString()}</span>
                      </div>
                    )}
                    {filteredData.totalDiesel > 0 && (
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground text-[10px] sm:text-xs">Diesel Cost Sharing</span>
                        <span className="font-medium">₨ {filteredData.totalDiesel.toLocaleString()}</span>
                      </div>
                    )}
                    {filteredData.totalInsurance > 0 && (
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground text-[10px] sm:text-xs">Insurance Sharing</span>
                        <span className="font-medium">₨ {filteredData.totalInsurance.toLocaleString()}</span>
                      </div>
                    )}
                    {filteredData.totalStructureMaintenance > 0 && (
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground text-[10px] sm:text-xs">Structure Maintenance</span>
                        <span className="font-medium">₨ {filteredData.totalStructureMaintenance.toLocaleString()}</span>
                      </div>
                    )}
                    {filteredData.totalLatePenalty > 0 && (
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground text-[10px] sm:text-xs">Late Penalties</span>
                        <span className="font-medium">₨ {filteredData.totalLatePenalty.toLocaleString()}</span>
                      </div>
                    )}
                    {filteredData.totalOther > 0 && (
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground text-[10px] sm:text-xs">Other Income</span>
                        <span className="font-medium">₨ {filteredData.totalOther.toLocaleString()}</span>
                      </div>
                    )}
                    {filteredData.totalPartialPayment > 0 && (
                      <div className="flex justify-between font-medium text-emerald-700 text-xs sm:text-sm">
                        <span className="text-[10px] sm:text-xs">Partial Payments (Unallocated)</span>
                        <span className="font-bold">₨ {filteredData.totalPartialPayment.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between font-bold text-xs sm:text-sm mt-2 sm:mt-3 px-2 sm:px-3 pt-2 sm:pt-3 border-t border-dashed">
                    <span>Total Revenue</span>
                    <span className="text-emerald-700 font-extrabold">₨ {filteredData.totalRevenue.toLocaleString()}</span>
                  </div>
                </div>

                {/* Expenses Section */}
                <div className="mb-3 sm:mb-6">
                  <h3 className="font-bold text-xs sm:text-sm border-b pb-1 sm:pb-1.5 mb-2 sm:mb-3 text-red-800">OPERATING EXPENSES</h3>
                  <div className="space-y-1 sm:space-y-2 px-2 sm:px-3">
                    {filteredData.sortedExpenseCategories.length === 0 ? (
                      <p className="text-muted-foreground italic text-[10px] sm:text-xs">No expenses recorded in this period.</p>
                    ) : (
                      filteredData.sortedExpenseCategories.map(cat => (
                        <div key={cat} className="flex justify-between text-xs sm:text-sm">
                          <span className="text-muted-foreground text-[10px] sm:text-xs">{cat}</span>
                          <span className="font-medium">₨ {filteredData.expensesByCategory[cat].toLocaleString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex justify-between font-bold text-xs sm:text-sm mt-2 sm:mt-3 px-2 sm:px-3 pt-2 sm:pt-3 border-t border-dashed">
                    <span>Total Expenses</span>
                    <span className="text-red-700 font-extrabold">₨ {filteredData.totalExpense.toLocaleString()}</span>
                  </div>
                </div>

                {/* Net Profit Section */}
                <div className={`mt-4 sm:mt-6 flex justify-between items-center font-bold text-xs sm:text-sm p-2.5 sm:p-3.5 rounded-lg ${
                  filteredData.netProfit >= 0 ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-red-50 text-red-900 border border-red-200'
                }`}>
                  <span className="tracking-wide">NET {filteredData.netProfit >= 0 ? 'PROFIT' : 'LOSS'}</span>
                  <span className="font-extrabold text-sm sm:text-base">₨ {Math.abs(filteredData.netProfit).toLocaleString()}</span>
                </div>
                
                {/* Bank & Cash Balances Section */}
                <div className="mt-3 sm:mt-6 border-t pt-3 sm:pt-6">
                  <h3 className="font-bold text-xs sm:text-sm border-b pb-1 sm:pb-1.5 mb-2 sm:mb-3 text-blue-800">BANK & CASH BALANCES</h3>
                  <div className="space-y-1 sm:space-y-2 px-2 sm:px-3">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground font-medium text-[10px] sm:text-xs">IME Globle Bank</span>
                      <span className="font-bold text-blue-900">₨ {filteredData.globalBankBalance.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground font-medium text-[10px] sm:text-xs">Cash</span>
                      <span className="font-bold text-blue-900">₨ {filteredData.globalCashBalance.toLocaleString()}</span>
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
