'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Mail, Bell, ClipboardList } from 'lucide-react'
import { db } from '@/config/firebase'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { Visitor, Complaint } from '@/types/models'

export function StaffView({ profile }: { profile: any }) {
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [complaints, setComplaints] = useState<Complaint[]>([])

  useEffect(() => {
    const unsubVis = onSnapshot(query(collection(db, 'visitors'), orderBy('createdAt', 'desc')), (snap: any) => {
      setVisitors(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Visitor)))
    })
    const unsubComp = onSnapshot(query(collection(db, 'complaints'), orderBy('createdAt', 'desc')), (snap: any) => {
      setComplaints(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Complaint)))
    })

    return () => {
      unsubVis()
      unsubComp()
    }
  }, [])

  const activeVisitors = visitors.filter(v => v.status === 'entered').length
  const newComplaints = complaints.filter(c => c.status === 'open').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold">Welcome, {profile?.fullName || 'Staff'}!</h2>
            <Badge variant="secondary" className="hidden sm:inline-flex">{profile?.role}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">Here is your daily operational overview.</p>
        </div>
        <div className="flex gap-2">
          <Button>Register Visitor</Button>
          <Button variant="outline">Log Delivery</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <div className="p-3 bg-blue-100 rounded-full mb-4">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
            <p className="text-3xl font-bold">{activeVisitors}</p>
            <p className="text-sm text-muted-foreground mt-1">Active Visitors</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <div className="p-3 bg-green-100 rounded-full mb-4">
              <Mail className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-3xl font-bold">0</p>
            <p className="text-sm text-muted-foreground mt-1">Pending Deliveries</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <div className="p-3 bg-yellow-100 rounded-full mb-4">
              <ClipboardList className="h-6 w-6 text-yellow-500" />
            </div>
            <p className="text-3xl font-bold">{newComplaints}</p>
            <p className="text-sm text-muted-foreground mt-1">New Complaints</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <div className="p-3 bg-purple-100 rounded-full mb-4">
              <Bell className="h-6 w-6 text-purple-500" />
            </div>
            <p className="text-3xl font-bold">0</p>
            <p className="text-sm text-muted-foreground mt-1">Announcements</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Visitors</CardTitle>
            <CardDescription>People currently checked in or recently departed.</CardDescription>
          </CardHeader>
          <CardContent>
            {visitors.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent visitors.</p>
            ) : (
              <div className="space-y-4">
                {visitors.slice(0, 5).map((visitor) => (
                  <div key={visitor.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{visitor.name}</p>
                      <p className="text-sm text-muted-foreground">{visitor.purpose} - Unit {visitor.unitId}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={visitor.status === 'entered' ? 'default' : 'outline'}>
                        {visitor.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Complaints</CardTitle>
            <CardDescription>Latest complaints from residents.</CardDescription>
          </CardHeader>
          <CardContent>
            {complaints.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent complaints.</p>
            ) : (
              <div className="space-y-4">
                {complaints.slice(0, 5).map((comp) => (
                  <div key={comp.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex gap-3 items-center">
                      <ClipboardList className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{comp.title}</p>
                        <p className="text-sm text-muted-foreground">Tenant: {comp.tenantId}</p>
                      </div>
                    </div>
                    <Badge variant={comp.status === 'open' ? 'warning' : 'success'}>{comp.status.toUpperCase()}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
