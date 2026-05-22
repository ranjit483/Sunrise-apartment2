'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Home, CreditCard, Wrench, FileText, Download } from 'lucide-react'
import { db } from '@/config/firebase'
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore'
import { Invoice, MaintenanceTicket, Lease } from '@/types/models'

export function TenantView({ profile }: { profile: any }) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([])
  const [leases, setLeases] = useState<Lease[]>([])

  useEffect(() => {
    if (!profile?.uid) return;

    const unsubInvoices = onSnapshot(query(collection(db, 'invoices'), where('tenantId', '==', profile.uid)), (snap) => {
      setInvoices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice)))
    })
    
    const unsubTickets = onSnapshot(query(collection(db, 'maintenance'), where('reportedBy', '==', profile.uid)), (snap) => {
      setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() } as MaintenanceTicket)))
    })

    const unsubLeases = onSnapshot(query(collection(db, 'leases'), where('tenantId', '==', profile.uid)), (snap) => {
      setLeases(snap.docs.map(d => ({ id: d.id, ...d.data() } as Lease)))
    })

    return () => {
      unsubInvoices()
      unsubTickets()
      unsubLeases()
    }
  }, [profile?.uid])

  const pendingInvoices = invoices.filter(i => i.status === 'pending' || i.status === 'overdue')
  const totalBalance = pendingInvoices.reduce((acc, i) => acc + i.amount, 0)
  
  const activeTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length
  const activeLease = leases.find(l => l.status === 'active')

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold">Welcome, {profile?.fullName || 'Resident'}!</h2>
            <Badge variant="secondary" className="hidden sm:inline-flex">{profile?.role}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">Here is the summary for your unit: {profile?.unitNumber || 'N/A'}</p>
        </div>
        <div className="flex gap-2">
          {totalBalance > 0 && <Button>Pay Due Balance</Button>}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className={`text-3xl font-bold mt-1 ${totalBalance > 0 ? 'text-red-500' : 'text-green-500'}`}>₨ {totalBalance.toLocaleString()}</p>
              {totalBalance > 0 && <p className="text-xs text-muted-foreground mt-1">Please pay at earliest</p>}
            </div>
            <div className={`p-3 rounded-full ${totalBalance > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              <CreditCard className={`h-6 w-6 ${totalBalance > 0 ? 'text-red-500' : 'text-green-500'}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Tickets</p>
              <p className="text-3xl font-bold mt-1">{activeTickets}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Wrench className="h-6 w-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">My Lease</p>
              <p className="text-xl font-bold mt-1">{activeLease ? 'Active' : 'No Active Lease'}</p>
              {activeLease && <p className="text-xs text-muted-foreground mt-1">Valid until {activeLease.endDate}</p>}
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Home className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>Your billing statements</CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices found.</p>
            ) : (
              <div className="space-y-4">
                {invoices.slice(0, 5).map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{invoice.month}</p>
                        <p className="text-sm text-muted-foreground">Rent & Utilities</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">₨{invoice.amount.toLocaleString()}</p>
                        <Badge variant={invoice.status === 'paid' ? 'success' : invoice.status === 'pending' ? 'warning' : 'destructive'}>{invoice.status.toUpperCase()}</Badge>
                      </div>
                      <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Maintenance Requests</CardTitle>
            <CardDescription>Track the status of your reported issues</CardDescription>
          </CardHeader>
          <CardContent>
            {tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No maintenance requests found.</p>
            ) : (
              <div className="space-y-4">
                {tickets.slice(0, 5).map(ticket => (
                  <div key={ticket.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{ticket.title}</p>
                      <p className="text-sm text-muted-foreground">Priority: {ticket.priority}</p>
                    </div>
                    <Badge variant={ticket.status === 'resolved' ? 'success' : ticket.status === 'in_progress' ? 'default' : 'secondary'}>{ticket.status.replace('_', ' ').toUpperCase()}</Badge>
                  </div>
                ))}
              </div>
            )}
            <Button variant="outline" className="w-full mt-4">Raise New Request</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
