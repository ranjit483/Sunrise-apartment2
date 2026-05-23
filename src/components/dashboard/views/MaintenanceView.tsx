'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Wrench, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { db } from '@/config/firebase'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { MaintenanceTicket } from '@/types/models'

export function MaintenanceView({ profile }: { profile: any }) {
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([])

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'maintenance'), orderBy('createdAt', 'desc')), (snap: any) => {
      setTickets(snap.docs.map((d: any) => ({ id: d.id, ...d.data() } as MaintenanceTicket)))
    })

    return () => unsub()
  }, [])

  const pendingTasks = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length
  const urgentIssues = tickets.filter(t => t.priority === 'critical' || t.priority === 'high').length
  const completedToday = tickets.filter(t => t.status === 'resolved').length // Ideally check if resolvedAt is today, keeping it simple for now

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold">Welcome, {profile?.fullName || 'Maintenance Staff'}!</h2>
            <Badge variant="secondary" className="hidden sm:inline-flex">{profile?.role}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">Here are your assigned work orders for today.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Tasks</p>
              <p className="text-3xl font-bold mt-1 text-orange-500">{pendingTasks}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Clock className="h-6 w-6 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Urgent/High Issues</p>
              <p className="text-3xl font-bold mt-1 text-red-500">{urgentIssues}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Resolved Tasks</p>
              <p className="text-3xl font-bold mt-1 text-green-500">{completedToday}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Task List</CardTitle>
          <CardDescription>Click on a task to mark it as resolved or update its status.</CardDescription>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks assigned.</p>
          ) : (
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex gap-4 items-start">
                    <div className="mt-1">
                      <Wrench className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-lg">{ticket.title}</p>
                        <Badge variant={ticket.priority === 'critical' ? 'destructive' : ticket.priority === 'high' ? 'warning' : 'secondary'}>
                          {ticket.priority.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-md mt-1 text-muted-foreground">{ticket.description}</p>
                      <p className="text-sm text-muted-foreground mt-1">Reported By: {ticket.reportedBy} | Unit: {ticket.unitId}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <Badge variant={ticket.status === 'in_progress' ? 'default' : ticket.status === 'resolved' ? 'success' : 'outline'}>{ticket.status.replace('_', ' ').toUpperCase()}</Badge>
                    <Button size="sm" variant="outline">Update Status</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
