'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Home, CreditCard, Wrench, FileText, Download, Car, AlertCircle, Clock, UserCheck, Layers, Calendar } from 'lucide-react'
import Link from 'next/link'
import { db } from '@/config/firebase'
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore'
import { Invoice, MaintenanceTicket, Lease } from '@/types/models'

export function TenantView({ profile }: { profile: any }) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([])
  const [leases, setLeases] = useState<Lease[]>([])
  const [parkingSlot, setParkingSlot] = useState<any>(null)
  const [loadingParking, setLoadingParking] = useState(true)

  useEffect(() => {
    if (!profile?.uid) return;

    const unsubInvoices = onSnapshot(query(collection(db, 'invoices'), where('tenantId', '==', profile.uid)), (snap: any) => {
      const allInvoices = snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Invoice))
      setInvoices(allInvoices.filter((i: Invoice) => i.status !== 'draft'))
    })
    
    const unsubTickets = onSnapshot(query(collection(db, 'maintenance'), where('reportedBy', '==', profile.uid)), (snap: any) => {
      setTickets(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as MaintenanceTicket)))
    })

    const unsubLeases = onSnapshot(query(collection(db, 'leases'), where('tenantId', '==', profile.uid)), (snap: any) => {
      setLeases(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Lease)))
    })

    const userUnitId = profile?.buildingId && profile?.unitNumber ? `${profile.buildingId} / ${profile.unitNumber}`.toLowerCase() : ''
    const unsubParking = onSnapshot(collection(db, 'parking'), (snap: any) => {
      const slots = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }))
      const mySlot = slots.find((p: any) => 
        p.status === 'occupied' && (
          (userUnitId && p.unitId && p.unitId.toLowerCase() === userUnitId) ||
          (profile?.fullName && p.assignedTo && p.assignedTo.toLowerCase() === profile.fullName.toLowerCase())
        )
      )
      setParkingSlot(mySlot || null)
      setLoadingParking(false)
    })

    return () => {
      unsubInvoices()
      unsubTickets()
      unsubLeases()
      unsubParking()
    }
  }, [profile?.uid, profile?.buildingId, profile?.unitNumber, profile?.fullName])

  const pendingInvoices = invoices.filter(i => i.status === 'pending' || i.status === 'overdue')
  const totalBalance = pendingInvoices.reduce((acc, i) => acc + i.amount + (i.electricityAmount || 0) + (i.utilityAmount || 0) + (i.waterAmount || 0) + (i.otherAmount || 0), 0)
  
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
          {totalBalance > 0 && (
            <Link href="/payments">
              <Button>Pay Due Balance</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
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

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">My Parking Spot</p>
              <p className="text-xl font-bold mt-1">
                {loadingParking ? 'Loading...' : (parkingSlot ? parkingSlot.slotNumber : 'No Spot')}
              </p>
              {!loadingParking && parkingSlot && (
                <p className="text-xs text-muted-foreground mt-1 capitalize">{parkingSlot.category} Spot</p>
              )}
            </div>
            <div className="p-3 bg-indigo-100 rounded-full">
              <Car className="h-6 w-6 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Parking Space Information */}
      {!loadingParking && (
        <Card className="rounded-3xl border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300">
          {!parkingSlot ? (
            <CardContent className="p-6 text-center space-y-4">
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full w-fit mx-auto">
                <Car className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No Parking Spot Assigned</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
                There is currently no parking slot linked to your unit (<span className="font-semibold text-indigo-600">{profile?.buildingId || 'None'} / {profile?.unitNumber || 'None'}</span>).
              </p>
              <div className="p-3 bg-amber-50 rounded-2xl text-xs text-amber-700 font-semibold border border-amber-100 flex items-center gap-2 max-w-md mx-auto">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Please contact the Management Office to assign a dedicated parking space for your vehicle.</span>
              </div>
            </CardContent>
          ) : (
            <div>
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 relative">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-300">My Leased Parking Bay</span>
                    <h3 className="text-2xl font-extrabold tracking-tight">{parkingSlot.slotNumber}</h3>
                  </div>
                  <Badge className="bg-emerald-500 text-white font-extrabold uppercase rounded-full px-2.5 py-0.5 text-[10px]">
                    Active Assignment
                  </Badge>
                </div>
              </div>

              <CardContent className="p-6 space-y-6 text-sm">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-50 text-slate-500 rounded-xl mt-0.5">
                        <UserCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assignee Name</p>
                        <p className="font-bold text-slate-800 text-sm mt-0.5">{parkingSlot.assignedTo || 'Unspecified'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-50 text-slate-500 rounded-xl mt-0.5">
                        <Layers className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Unit Association</p>
                        <p className="font-bold text-slate-800 text-sm mt-0.5">{parkingSlot.unitId || 'Unspecified'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-50 text-slate-500 rounded-xl mt-0.5">
                        <Badge variant="outline" className="capitalize text-[8px] font-semibold">{parkingSlot.category}</Badge>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Parking Category</p>
                        <p className="font-bold text-slate-800 text-sm mt-0.5 capitalize">{parkingSlot.category} Leased Bay</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-50 text-slate-500 rounded-xl mt-0.5">
                        <Car className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registered Vehicle</p>
                        <p className="font-bold text-slate-900 text-sm mt-0.5">{parkingSlot.vehicleNumber || 'No Plate Linked'}</p>
                        {parkingSlot.vehicleModel && <p className="text-xs text-slate-500 font-medium mt-0.5">{parkingSlot.vehicleModel}</p>}
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-50 text-slate-500 rounded-xl mt-0.5">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assigned Date & Time</p>
                        <p className="font-bold text-slate-800 text-sm mt-0.5">
                          {parkingSlot.assignedAt ? new Date(parkingSlot.assignedAt).toLocaleDateString([], {dateStyle: 'medium'}) : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {parkingSlot.category !== 'visitor' && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl mt-0.5">
                          <span className="font-bold text-xs">₨</span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Monthly Fee</p>
                          <p className="font-bold text-indigo-700 text-sm mt-0.5">₨ {parkingSlot.monthlyFee}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span>SLA Policy: Vehicles must park strictly in their assigned bays. Parking in fire lanes leads to towing.</span>
                </div>
              </CardContent>
            </div>
          )}
        </Card>
      )}

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
                        <p className="font-medium">₨{(invoice.amount + (invoice.electricityAmount || 0) + (invoice.utilityAmount || 0) + (invoice.waterAmount || 0) + (invoice.otherAmount || 0)).toLocaleString()}</p>
                        <Badge variant={invoice.status === 'paid' ? 'success' : invoice.status === 'pending' ? 'warning' : 'destructive'}>{invoice.status.toUpperCase()}</Badge>
                      </div>
                      <Link href="/payments">
                        <Button variant="ghost" size="icon" title="View & Pay in Payments"><Download className="h-4 w-4" /></Button>
                      </Link>
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
            <Link href="/maintenance">
              <Button variant="outline" className="w-full mt-4">Raise New Request</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
