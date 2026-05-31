'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Shield, LogOut, Car, UserCheck, Clock, UserX, Loader2 } from 'lucide-react'
import { db } from '@/config/firebase'
import { collection, onSnapshot, query, orderBy, where, doc, updateDoc } from 'firebase/firestore'
import { Visitor } from '@/types/models'

export function GuardView({ profile }: { profile: any }) {
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const q = query(collection(db, 'visitors'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const vData: Visitor[] = []
      snapshot.forEach((doc: any) => {
        vData.push({ id: doc.id, ...doc.data() } as Visitor)
      })
      setVisitors(vData)
      setLoading(false)
    }, (error: any) => {
      console.error('Error fetching visitors for Guard:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleCheckOut = async (visitorId: string) => {
    if (!confirm('Are you sure you want to check out this visitor?')) return
    try {
      const visitorRef = doc(db, 'visitors', visitorId)
      await updateDoc(visitorRef, {
        status: 'exited',
        exitTime: new Date().toISOString()
      })
      alert('Visitor checked out successfully!')
    } catch (error) {
      console.error('Error checking out visitor:', error)
      alert('Failed to check out visitor')
    }
  }

  const activeVisitors = visitors.filter(v => v.status === 'entered')

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold">Welcome, Officer {profile?.fullName?.split(' ')[0] || 'Guard'}!</h2>
            <Badge variant="secondary" className="bg-[#95DBAE] text-[#1E293B] hover:bg-[#7BC98E] font-bold">
              {profile?.role}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">Sunrise Apartment Gate Security & Visitor Monitoring console.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-green-100">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <div className="p-3 bg-[#E8FFF3] rounded-full mb-3 text-[#007F3E]">
              <Users className="h-6 w-6" />
            </div>
            <p className="text-3xl font-bold text-gray-800">{activeVisitors.length}</p>
            <p className="text-sm font-semibold text-muted-foreground mt-0.5">Currently Inside Apartment</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <div className="p-3 bg-indigo-50 rounded-full mb-3 text-indigo-500">
              <Car className="h-6 w-6" />
            </div>
            <p className="text-3xl font-bold text-gray-800">
              {activeVisitors.filter(v => v.vehicleType !== 'pedestrian').length}
            </p>
            <p className="text-sm font-semibold text-muted-foreground mt-0.5">Vehicles inside Parking</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <div className="p-3 bg-emerald-50 rounded-full mb-3 text-emerald-600">
              <UserCheck className="h-6 w-6" />
            </div>
            <p className="text-3xl font-bold text-gray-800">
              {visitors.filter(v => v.status === 'exited').length}
            </p>
            <p className="text-sm font-semibold text-muted-foreground mt-0.5">Total Exits Logged Today</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Active Visitors Currently Inside</CardTitle>
            <CardDescription>Gate registry checkouts and vehicle slots.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : activeVisitors.length === 0 ? (
              <p className="text-center py-6 text-sm text-muted-foreground">No active visitors currently registered inside Sunrise Apartment.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-3 font-semibold">Visitor Name</th>
                      <th className="pb-3 font-semibold">Contact</th>
                      <th className="pb-3 font-semibold">Host / Unit</th>
                      <th className="pb-3 font-semibold">Vehicle & Plate</th>
                      <th className="pb-3 font-semibold">Parking slot</th>
                      <th className="pb-3 font-semibold">Entry Time</th>
                      <th className="pb-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeVisitors.map((vis) => (
                      <tr key={vis.id} className="border-b hover:bg-gray-50/50">
                        <td className="py-3 font-semibold">{vis.name}</td>
                        <td className="py-3">{vis.phone}</td>
                        <td className="py-3">{vis.unitId}</td>
                        <td className="py-3">
                          {vis.vehicleType === 'pedestrian' ? (
                            <Badge variant="outline">Pedestrian</Badge>
                          ) : (
                            <div className="flex flex-col">
                              <Badge className="bg-[#95DBAE] text-[#1E293B] w-max font-semibold text-[10px]">
                                {vis.vehicleTypeDetail || vis.vehicleType}
                              </Badge>
                              {vis.licensePlate && <span className="text-xs text-gray-500 font-mono mt-0.5">{vis.province} {vis.licensePlate}</span>}
                            </div>
                          )}
                        </td>
                        <td className="py-3 font-semibold text-indigo-700">{vis.parkingSlot || 'N/A'}</td>
                        <td className="py-3 text-xs text-gray-600">
                          {new Date(vis.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleCheckOut(vis.id)}
                            className="h-8 text-xs border-red-200 text-red-700 bg-red-50/30 hover:bg-red-50"
                          >
                            <LogOut className="h-3 w-3 mr-1.5" />
                            Log Checkout
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
