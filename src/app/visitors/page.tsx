'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { db } from '@/config/firebase'
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc } from 'firebase/firestore'
import { Visitor } from '@/types/models'
import { Loader2, Car, User, LogOut, Bike } from 'lucide-react'

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)

  // Modal State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form State
  const [name, setName] = useState('')
  const [unitId, setUnitId] = useState('')
  const [phone, setPhone] = useState('')
  const [purpose, setPurpose] = useState('')
  const [vehicleType, setVehicleType] = useState<'pedestrian' | '2-wheeler' | '4-wheeler'>('pedestrian')
  const [licensePlate, setLicensePlate] = useState('')
  const [vehicleBrand, setVehicleBrand] = useState('')
  const [parkingSlot, setParkingSlot] = useState('')

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
      console.error('Error fetching visitors:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleRegisterVisitor = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const now = new Date().toISOString()
      const newVisitor: Omit<Visitor, 'id'> = {
        name,
        unitId,
        phone,
        purpose,
        vehicleType,
        entryTime: now,
        status: 'entered',
        createdAt: now,
      }

      if (vehicleType !== 'pedestrian') {
        newVisitor.licensePlate = licensePlate
        newVisitor.vehicleBrand = vehicleBrand
        newVisitor.parkingSlot = parkingSlot
      }

      await addDoc(collection(db, 'visitors'), newVisitor)
      
      // Reset form
      setName('')
      setUnitId('')
      setPhone('')
      setPurpose('')
      setVehicleType('pedestrian')
      setLicensePlate('')
      setVehicleBrand('')
      setParkingSlot('')
      setIsRegisterModalOpen(false)
    } catch (error) {
      console.error('Error adding visitor:', error)
      alert('Failed to register visitor')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCheckOut = async (visitorId: string) => {
    if (!confirm('Are you sure you want to check out this visitor?')) return
    try {
      const now = new Date().toISOString()
      await updateDoc(doc(db, 'visitors', visitorId), {
        status: 'exited',
        exitTime: now
      })
    } catch (error) {
      console.error('Error checking out visitor:', error)
      alert('Failed to check out visitor')
    }
  }

  const currentlyInside = visitors.filter(v => v.status === 'entered').length
  const pendingApproval = visitors.filter(v => v.status === 'waiting').length

  const getVehicleIcon = (type?: string) => {
    if (type === '4-wheeler') return <Car className="h-4 w-4 mr-1 text-blue-500" />
    if (type === '2-wheeler') return <Bike className="h-4 w-4 mr-1 text-orange-500" />
    return <User className="h-4 w-4 mr-1 text-gray-500" />
  }

  return (
    <DashboardLayout title="Visitor Management">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Logbook Management</h2>
            <p className="text-muted-foreground">Track visitor entries, exits, and vehicles</p>
          </div>
          
          <Dialog open={isRegisterModalOpen} onOpenChange={setIsRegisterModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">Register Visitor</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>New Visitor Registration</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleRegisterVisitor} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Host Unit *</Label>
                    <Select required value={unitId} onValueChange={setUnitId}>
                      <SelectTrigger><SelectValue placeholder="Select unit..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Tower A / A-0">Tower A / A-0</SelectItem>
                        <SelectItem value="Tower A / A-1">Tower A / A-1</SelectItem>
                        <SelectItem value="Tower A / A-2">Tower A / A-2</SelectItem>
                        <SelectItem value="Tower A / A-3">Tower A / A-3</SelectItem>
                        <SelectItem value="Tower A / B-0">Tower A / B-0</SelectItem>
                        <SelectItem value="Tower A / B-1">Tower A / B-1</SelectItem>
                        <SelectItem value="Tower A / B-2">Tower A / B-2</SelectItem>
                        <SelectItem value="Tower A / B-3">Tower A / B-3</SelectItem>
                        <SelectItem value="Tower A / C-1">Tower A / C-1</SelectItem>
                        <SelectItem value="Tower A / C-2">Tower A / C-2</SelectItem>
                        <SelectItem value="Tower A / C-3">Tower A / C-3</SelectItem>
                        <SelectItem value="Tower A / D-1">Tower A / D-1</SelectItem>
                        <SelectItem value="Tower A / D-2">Tower A / D-2</SelectItem>
                        <SelectItem value="Tower A / D-3">Tower A / D-3</SelectItem>
                        <SelectItem value="Tower B I / G-1">Tower B I / G-1</SelectItem>
                        <SelectItem value="Tower B I / G-2">Tower B I / G-2</SelectItem>
                        <SelectItem value="Tower B I / G-3">Tower B I / G-3</SelectItem>
                        <SelectItem value="Tower B II / G-1">Tower B II / G-1</SelectItem>
                        <SelectItem value="Tower B II / G-2">Tower B II / G-2</SelectItem>
                        <SelectItem value="Tower B II / G-3">Tower B II / G-3</SelectItem>
                        <SelectItem value="Office">Office</SelectItem>
                        <SelectItem value="Others">Others</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Phone *</Label>
                    <Input required value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Purpose of Visit *</Label>
                  <Select required value={purpose} onValueChange={setPurpose}>
                    <SelectTrigger><SelectValue placeholder="Select purpose..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Guest">Guest</SelectItem>
                      <SelectItem value="Delivery">Delivery</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Meade">Meade</SelectItem>
                      <SelectItem value="Driver">Driver</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <Label className="font-semibold text-gray-700">Vehicle Profiling</Label>
                  <Select value={vehicleType} onValueChange={(v: any) => setVehicleType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pedestrian">Pedestrian (No Vehicle)</SelectItem>
                      <SelectItem value="2-wheeler">2-Wheeler (Bike/Scooter)</SelectItem>
                      <SelectItem value="4-wheeler">4-Wheeler (Car/Van)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {vehicleType !== 'pedestrian' && (
                  <div className="space-y-4 pt-2 pb-2 bg-gray-50 p-3 rounded-md border">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>License Plate</Label>
                        <Input value={licensePlate} onChange={e => setLicensePlate(e.target.value)} placeholder="e.g. BA 1 PA 1234" />
                      </div>
                      <div className="space-y-2">
                        <Label>Vehicle Brand</Label>
                        <Input value={vehicleBrand} onChange={e => setVehicleBrand(e.target.value)} placeholder="e.g. Honda" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Assigned Parking Slot</Label>
                      <Input value={parkingSlot} onChange={e => setParkingSlot(e.target.value)} placeholder="e.g. V-01" />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsRegisterModalOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Check In Visitor
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Today's Total</p><p className="text-2xl font-bold">{visitors.length}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Currently Inside</p><p className="text-2xl font-bold text-green-600">{currentlyInside}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">This Week</p><p className="text-2xl font-bold">{visitors.length}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Pending Approval</p><p className="text-2xl font-bold text-yellow-600">{pendingApproval}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Live Logbook Data</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : visitors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No visitors logged yet. Click "Register Visitor" to start.</div>
            ) : (
              <div className="overflow-x-auto overflow-y-hidden">
                <table className="w-full min-w-[1000px]">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-3 text-left">Visitor Info</th>
                      <th className="pb-3 text-left">Destination</th>
                      <th className="pb-3 text-left">Vehicle Info</th>
                      <th className="pb-3 text-left">Timing</th>
                      <th className="pb-3 text-left">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitors.map((v) => (
                      <tr key={v.id} className="border-b hover:bg-gray-50">
                        <td className="py-3">
                          <p className="font-medium">{v.name}</p>
                          <p className="text-xs text-muted-foreground">{v.phone} • {v.purpose}</p>
                        </td>
                        <td className="py-3 font-medium text-blue-700">{v.unitId}</td>
                        <td className="py-3">
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className="w-fit flex items-center">
                              {getVehicleIcon(v.vehicleType)}
                              {v.vehicleType ? v.vehicleType.charAt(0).toUpperCase() + v.vehicleType.slice(1) : 'Unknown'}
                            </Badge>
                            {v.vehicleType && v.vehicleType !== 'pedestrian' && (
                              <div className="text-xs text-muted-foreground">
                                {v.licensePlate} {v.parkingSlot ? `(Slot: ${v.parkingSlot})` : ''}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          <p className="text-xs"><span className="font-semibold">In:</span> {new Date(v.entryTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                          {v.exitTime && (
                            <p className="text-xs text-gray-500"><span className="font-semibold">Out:</span> {new Date(v.exitTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                          )}
                        </td>
                        <td className="py-3">
                          <Badge variant={v.status === 'entered' ? 'success' : v.status === 'waiting' ? 'warning' : 'secondary'}>
                            {v.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3 text-right">
                          {v.status === 'entered' ? (
                            <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" onClick={() => handleCheckOut(v.id)}>
                              <LogOut className="h-4 w-4 mr-1" />
                              Check Out
                            </Button>
                          ) : (
                            <span className="text-xs text-gray-400">Completed</span>
                          )}
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
    </DashboardLayout>
  )
}