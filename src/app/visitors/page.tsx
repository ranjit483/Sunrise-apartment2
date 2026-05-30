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

const TOWER_UNITS: Record<string, string[]> = {
  'Tower A': [
    'A-0', 'A-1', 'A-2', 'A-3', 'A-4', 'A-5', 'A-6', 'A-7', 'A-8', 'A-9', 'A-10',
    'B-0', 'B-1', 'B-2', 'B-3', 'B-4', 'B-5', 'B-6', 'B-7', 'B-8', 'B-9', 'B-10',
    'C-1', 'C-2', 'C-3', 'C-4', 'C-5', 'C-6', 'C-7', 'C-8', 'C-9', 'C-10',
    'D-1', 'D-2', 'D-3', 'D-4', 'D-5', 'D-6', 'D-7', 'D-8', 'D-9', 'D-10', 'D-11', 'D-12',
    'E-1', 'E-2', 'E-3', 'E-4', 'E-5', 'E-6', 'E-7', 'E-8', 'E-9', 'E-10', 'E-11', 'E-12'
  ],
  'Tower BI': [
    'F-1', 'F-2', 'F-3', 'F-4', 'F-5', 'F-6', 'F-7', 'F-8', 'F-9', 'F-10', 'F-11', 'F-12', 'F-13', 'F-14',
    'G-1', 'G-2', 'G-3', 'G-4', 'G-5', 'G-6', 'G-7', 'G-8', 'G-9', 'G-10', 'G-11', 'G-12', 'G-13', 'G-14',
    'H-1', 'H-2', 'H-3', 'H-4', 'H-5', 'H-6', 'H-7', 'H-8', 'H-9', 'H-10', 'H-11', 'H-12', 'H-13', 'H-14',
    'I-1', 'I-2', 'I-3', 'I-4', 'I-5', 'I-6', 'I-7', 'I-8', 'I-9', 'I-10', 'I-11', 'I-12', 'I-13', 'I-14',
    'J-1', 'J-2', 'J-3', 'J-4', 'J-5', 'J-6', 'J-7', 'J-8', 'J-9', 'J-10', 'J-11', 'J-12', 'J-13', 'J-14',
    'K-1', 'K-2', 'K-3', 'K-4', 'K-5', 'K-6', 'K-7', 'K-8', 'K-9', 'K-10', 'K-11', 'K-12', 'K-13', 'K-14',
    'L1-1', 'L1-2', 'L1-3', 'L1-4', 'L1-5', 'L1-6', 'L1-7', 'L1-8', 'L1-9', 'L1-10', 'L1-11', 'L1-12', 'L1-13', 'L1-14',
    'L2-1', 'L2-2', 'L2-3', 'L2-4', 'L2-5', 'L2-6', 'L2-7', 'L2-8', 'L2-9', 'L2-10', 'L2-11', 'L2-12', 'L2-13', 'L2-14'
  ],
  'Tower B II': [
    'M-1', 'M-2', 'M-3', 'M-4', 'M-5', 'M-6', 'M-7', 'M-8', 'M-9', 'M-10', 'M-11', 'M-12', 'M-13', 'M-14',
    'N-1', 'N-2', 'N-3', 'N-4', 'N-5', 'N-6', 'N-7', 'N-8', 'N-9', 'N-10', 'N-11', 'N-12', 'N-13', 'N-14',
    'O1-1', 'O1-2', 'O1-3', 'O1-4', 'O1-5', 'O1-6', 'O1-7', 'O1-8', 'O1-9', 'O1-10', 'O1-11', 'O1-12', 'O1-13', 'O1-14',
    'O2-1', 'O2-2', 'O2-3', 'O2-4', 'O2-5', 'O2-6', 'O2-7', 'O2-8', 'O2-9', 'O2-10', 'O2-11', 'O2-12', 'O2-13', 'O2-14',
    'P1-1', 'P1-2', 'P1-3', 'P1-4', 'P1-5', 'P1-6', 'P1-7', 'P1-8', 'P1-9', 'P1-10', 'P1-11', 'P1-12', 'P1-13', 'P1-14',
    'P2-1', 'P2-2', 'P2-3', 'P2-4', 'P2-5', 'P2-6', 'P2-7', 'P2-8', 'P2-9', 'P2-10', 'P2-11', 'P2-12', 'P2-13', 'P2-14',
    'Q-1', 'Q-2', 'Q-3', 'Q-4', 'Q-5', 'Q-6', 'Q-7', 'Q-8', 'Q-9', 'Q-10', 'Q-11', 'Q-12', 'Q-13', 'Q-14'
  ],
  'Office': ['A', 'B'],
  'Others': ['A']
}

const PROVINCES = ['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudur Pashchim']
const VEHICLE_BRANDS = ['Suzuki', 'Hyundai', 'Tata', 'Toyota', 'Mahindra', 'Honda', 'Kia', 'BYD', 'Bajaj', 'Yamaha', 'Nissan', 'Ford', 'Volkswagen', 'Mitsubishi', 'Deepal', 'GWM', 'BMW', 'Mercedes-Benz', 'Audi', 'Eicher', 'Hero', 'Others']

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [loading, setLoading] = useState(true)

  // Modal State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Form State
  const [name, setName] = useState('')
  const [hostTower, setHostTower] = useState('')
  const [hostUnit, setHostUnit] = useState('')
  const [phone, setPhone] = useState('')
  const [province, setProvince] = useState('')
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
        unitId: `${hostTower} / ${hostUnit}`,
        phone,
        province,
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
      setHostTower('')
      setHostUnit('')
      setPhone('')
      setProvince('')
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
            <DialogContent className="max-w-md max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Visitor Registration</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleRegisterVisitor} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Host Tower *</Label>
                    <Select required value={hostTower} onValueChange={(v) => { setHostTower(v); setHostUnit(''); }}>
                      <SelectTrigger><SelectValue placeholder="Tower..." /></SelectTrigger>
                      <SelectContent>
                        {Object.keys(TOWER_UNITS).map(tower => (
                          <SelectItem key={tower} value={tower}>{tower}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Unit *</Label>
                    <Select required disabled={!hostTower} value={hostUnit} onValueChange={setHostUnit}>
                      <SelectTrigger><SelectValue placeholder="Unit..." /></SelectTrigger>
                      <SelectContent>
                        {hostTower && TOWER_UNITS[hostTower].map(unit => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Phone *</Label>
                    <Input 
                      required 
                      value={phone} 
                      maxLength={10}
                      onChange={e => {
                        const value = e.target.value.replace(/[^0-9]/g, '')
                        setPhone(value)
                      }} 
                      pattern="^9\d{9}$"
                      title="Phone number must be exactly 10 digits and start with 9"
                      placeholder="e.g. 9841234567" 
                    />
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
                    <div className="space-y-2">
                      <Label className="font-semibold text-gray-700">License Plate</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500 font-medium">Province *</Label>
                          <Select required value={province} onValueChange={setProvince}>
                            <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {PROVINCES.map(prov => (
                                <SelectItem key={prov} value={prov}>{prov}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500 font-medium">Vehical Number *</Label>
                          <Input required={province !== ''} value={licensePlate} onChange={e => setLicensePlate(e.target.value)} placeholder="Vehical Number" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-gray-500 font-medium">Type Of</Label>
                          <Select value={vehicleBrand} onValueChange={setVehicleBrand}>
                            <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {VEHICLE_BRANDS.map(brand => (
                                <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Assigned Parking Slot</Label>
                      <Input value={parkingSlot} onChange={e => setParkingSlot(e.target.value)} placeholder="e.g. V-1" />
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
                      <th className="pb-3 text-left">Parking Slot</th>
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
                              <div className="text-xs text-muted-foreground mt-0.5 font-medium">
                                {v.province ? `${v.province} ` : ''}{v.licensePlate}
                                {v.vehicleBrand ? ` • ${v.vehicleBrand}` : ''}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          {v.vehicleType !== 'pedestrian' && v.parkingSlot ? (
                            <span className="font-semibold text-gray-700">{v.parkingSlot}</span>
                          ) : (
                            <span className="text-gray-400 font-normal">—</span>
                          )}
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