'use client'

import { useState, useEffect } from 'react'
import { SeedButton } from './SeedButton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building2, Home, Users, CreditCard, Wrench, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { db } from '@/config/firebase'
import { collection, onSnapshot, query, limit, orderBy } from 'firebase/firestore'
import { Building, Unit, Invoice, MaintenanceTicket } from '@/types/models'

export function AdminView({ profile }: { profile: any }) {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([])
  const [expenses, setExpenses] = useState<any[]>([])

  useEffect(() => {
    const unsubBuildings = onSnapshot(collection(db, 'buildings'), (snap: any) => setBuildings(snap.docs.map((d: any) => d.data() as Building)))
    const unsubUnits = onSnapshot(collection(db, 'units'), (snap: any) => setUnits(snap.docs.map((d: any) => d.data() as Unit)))
    const unsubInvoices = onSnapshot(query(collection(db, 'invoices'), orderBy('createdAt', 'desc')), (snap: any) => setInvoices(snap.docs.map((d: any) => d.data() as Invoice)))
    const unsubTickets = onSnapshot(query(collection(db, 'maintenance_tickets'), orderBy('createdAt', 'desc')), (snap: any) => setTickets(snap.docs.map((d: any) => d.data() as MaintenanceTicket)))
    const unsubExpenses = onSnapshot(query(collection(db, 'expenses'), orderBy('date', 'desc')), (snap: any) => setExpenses(snap.docs.map((d: any) => d.data() as any)))

    return () => {
      unsubBuildings()
      unsubUnits()
      unsubInvoices()
      unsubTickets()
      unsubExpenses()
    }
  }, [])

  const isManager = profile?.role === 'MANAGER'
  // Removed manager filtering per user request so managers see the same global dashboard stats as Super Admin
  const myBuildings = buildings
  const myBuildingIds = myBuildings.map(b => b.id)

  const myUnits = units
  
  const myInvoices = invoices

  const myTickets = tickets
  
  const myExpenses = expenses

  // Calculate KPIs
  const occupiedUnits = myUnits.filter(u => u.status === 'occupied').length
  const occupancyRate = myUnits.length > 0 ? Math.round((occupiedUnits / myUnits.length) * 100) : 0
  
  const monthlyRevenue = myInvoices.reduce((acc, i) => acc + (i.paidAmount || 0), 0)
  const totalExpenses = myExpenses.filter(e => e.status === 'approved' || e.status === 'paid' || !e.status).reduce((acc, e) => acc + e.amount, 0)
  const netProfit = monthlyRevenue - totalExpenses

  const pendingPayments = myInvoices.filter(i => i.status !== 'draft' && i.status !== 'carried_forward').reduce((acc, i) => {
    const total = i.amount + (i.electricityAmount || 0) + (i.generatorAmount || 0) + (i.utilityAmount || 0) + (i.waterAmount || 0) + (i.insuranceAmount || 0) + (i.dieselAmount || 0) + (i.structureMaintenanceAmount || 0) + (i.otherAmount || 0) + (i.previousPendingOutstandingDue || 0) + (i.latePenaltyAmount || 0) + (i.electricityVatAmount || 0);
    return acc + (total - (i.paidAmount || 0));
  }, 0)
  const openTickets = myTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length

  const kpis = [
    { title: 'Total Buildings', value: myBuildings.length.toString(), change: '', trend: 'up', icon: Building2, color: 'bg-blue-500' },
    { title: 'Total Units', value: myUnits.length.toString(), change: '', trend: 'up', icon: Home, color: 'bg-green-500' },
    { title: 'Occupied Units', value: occupiedUnits.toString(), change: `${occupancyRate}%`, trend: 'up', icon: Users, color: 'bg-purple-500' },
    { title: 'Total Revenue', value: `₨ ${monthlyRevenue.toLocaleString()}`, change: '', trend: 'up', icon: DollarSign, color: 'bg-emerald-500' },
    { title: 'Total Expenses', value: `₨ ${totalExpenses.toLocaleString()}`, change: '', trend: 'down', icon: CreditCard, color: 'bg-orange-500' },
    { title: 'Net Profit', value: `₨ ${netProfit.toLocaleString()}`, change: '', trend: netProfit >= 0 ? 'up' : 'down', icon: TrendingUp, color: netProfit >= 0 ? 'bg-indigo-500' : 'bg-red-500' },
    { title: 'Pending Payments', value: `₨ ${pendingPayments.toLocaleString()}`, change: 'Receivable', trend: 'down', icon: CreditCard, color: 'bg-red-500' },
    { title: 'Open Tickets', value: openTickets.toString(), change: '', trend: 'up', icon: Wrench, color: 'bg-yellow-600' },
  ]

  // Temporary mock data for charts since we don't have historical data yet
  const revenueData = [
    { month: 'Jan', revenue: 125000, expenses: 45000 },
    { month: 'Feb', revenue: 132000, expenses: 48000 },
    { month: 'Mar', revenue: 145000, expenses: 52000 },
    { month: 'Apr', revenue: 138000, expenses: 49000 },
    { month: 'May', revenue: 152000, expenses: 55000 },
    { month: 'Jun', revenue: monthlyRevenue || 168000, expenses: totalExpenses || 58000 },
  ]

  const vacantUnits = myUnits.filter(u => u.status === 'vacant').length
  const maintenanceUnits = myUnits.filter(u => u.status === 'maintenance').length
  const reservedUnits = myUnits.filter(u => u.status === 'reserved').length

  const occupancyData = myUnits.length > 0 ? [
    { name: 'Occupied', value: occupiedUnits, color: '#95DBAE' },
    { name: 'Vacant', value: vacantUnits, color: '#F59E0B' },
    { name: 'Reserved', value: reservedUnits, color: '#3B82F6' },
    { name: 'Maintenance', value: maintenanceUnits, color: '#EF4444' },
  ].filter((d: any) => d.value > 0) : [
    { name: 'No Data', value: 1, color: '#e2e8f0' }
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            Welcome back, {profile?.fullName?.split(' ')[0] || 'Admin'}!
            <Badge variant="secondary" className="ml-2 align-middle bg-green-100 text-green-800 hover:bg-green-100">
              {profile?.role}
            </Badge>
          </h2>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Here's the current overview of Sunrise Apartment.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto mt-2 md:mt-0">
          {profile?.role === 'SUPER_ADMIN' && <SeedButton />}
          <Button variant="outline" className="flex-1 md:flex-none h-9 text-sm">Export Reports</Button>
          <Button className="flex-1 md:flex-none bg-emerald-400 hover:bg-emerald-500 text-black h-9 text-sm">Generate Invoice</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {kpis.map((kpi, index) => (
          <Card key={index} className="col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{kpi.title}</p>
                  <p className="text-lg md:text-xl font-bold mt-0.5">{kpi.value}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {kpi.change && (
                      <>
                        {kpi.trend === 'up' ? (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                        <span className={`text-[10px] ${kpi.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                          {kpi.change}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className={`p-2 rounded-lg ${kpi.color}`}>
                  <kpi.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader><CardTitle>Revenue & Expenses</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" tickFormatter={(value) => `₨${value / 1000}K`} />
                <Tooltip formatter={(value: number) => [`₨${value.toLocaleString()}`, '']} />
                <Area type="monotone" dataKey="revenue" stroke="#95DBAE" fill="#95DBAE" fillOpacity={0.3} name="Revenue" />
                <Area type="monotone" dataKey="expenses" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.3} name="Expenses" />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader><CardTitle>Occupancy Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie data={occupancyData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {occupancyData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-4 justify-center mt-4">
              {occupancyData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
