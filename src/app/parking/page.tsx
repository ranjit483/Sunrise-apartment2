'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { db } from '@/config/firebase'
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  setDoc, 
  deleteDoc, 
  writeBatch,
  getDocs
} from 'firebase/firestore'
import { 
  Car, 
  Plus, 
  Trash2, 
  User, 
  Search, 
  Loader2, 
  Filter, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  Wrench, 
  Briefcase,
  Layers,
  ArrowRightLeft,
  Calendar,
  AlertCircle,
  Clock,
  UserCheck
} from 'lucide-react'

// Extended ParkingSlot interface to support dynamic categorization and assignees
interface ExtendedParkingSlot {
  id: string
  slotNumber: string
  unitId?: string | null
  vehicleNumber?: string | null
  vehicleModel?: string | null
  monthlyFee: number
  status: 'available' | 'occupied' | 'maintenance'
  category: 'resident' | 'tenant' | 'visitor' | 'staff'
  assignedTo?: string | null
  assignedAt?: string | null
  createdAt: string
  updatedAt: string
}

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

export default function ParkingPage() {
  const { profile } = useAuth()
  const [parkingSlots, setParkingSlots] = useState<ExtendedParkingSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Filters state
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'resident' | 'tenant' | 'visitor' | 'staff'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'occupied' | 'maintenance'>('all')

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<ExtendedParkingSlot | null>(null)

  // Form state - Add Slot
  const [newSlotNumber, setNewSlotNumber] = useState('')
  const [newCategory, setNewCategory] = useState<'resident' | 'tenant' | 'visitor' | 'staff'>('resident')
  const [newMonthlyFee, setNewMonthlyFee] = useState('2000')

  // Form state - Assign Slot
  const [assignTower, setAssignTower] = useState('')
  const [assignUnit, setAssignUnit] = useState('')
  const [assigneeName, setAssigneeName] = useState('')
  const [assignVehicleNo, setAssignVehicleNo] = useState('')
  const [assignVehicleBrand, setAssignVehicleBrand] = useState('Honda')
  const [assignVehicleType, setAssignVehicleType] = useState('Car')
  const [assignStatus, setAssignStatus] = useState<'available' | 'occupied' | 'maintenance'>('occupied')

  const [residents, setResidents] = useState<any[]>([])
  const [activeVisitors, setActiveVisitors] = useState<any[]>([])
  const [selectedResidentId, setSelectedResidentId] = useState('')
  const [selectedVisitorId, setSelectedVisitorId] = useState('')

  useEffect(() => {
    if (!isAssignOpen) return

    const fetchResidents = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'))
        const resList: any[] = []
        querySnapshot.forEach((doc: any) => {
          const data = doc.data()
          if (data.status === 'approved' && (data.role === 'RESIDENT' || data.role === 'TENANT')) {
            resList.push({ id: doc.id, ...data })
          }
        })
        setResidents(resList)
      } catch (err) {
        console.error('Error fetching residents:', err)
      }
    }

    const fetchActiveVisitors = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'visitors'))
        const visList: any[] = []
        querySnapshot.forEach((doc: any) => {
          const data = doc.data()
          if (data.status === 'entered') {
            visList.push({ id: doc.id, ...data })
          }
        })
        setActiveVisitors(visList)
      } catch (err) {
        console.error('Error fetching visitors:', err)
      }
    }

    fetchResidents()
    fetchActiveVisitors()
  }, [isAssignOpen])

  useEffect(() => {
    const q = query(collection(db, 'parking'), orderBy('slotNumber', 'asc'))
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const pData: ExtendedParkingSlot[] = []
      snapshot.forEach((doc: any) => {
        const data = doc.data()
        pData.push({ 
          id: doc.id, 
          slotNumber: data.slotNumber || '',
          unitId: data.unitId || '',
          vehicleNumber: data.vehicleNumber || '',
          vehicleModel: data.vehicleModel || '',
          monthlyFee: Number(data.monthlyFee) || 0,
          status: data.status || 'available',
          category: data.category || 'resident',
          assignedTo: data.assignedTo || '',
          assignedAt: data.assignedAt || '',
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt || ''
        } as ExtendedParkingSlot)
      })
      setParkingSlots(pData)
      setLoading(false)
    }, (error: any) => {
      console.error('Error fetching parking slots:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Auto-seeding base society parking grid
  const handleAutoSeed = async () => {
    if (!confirm('This will seed a base layout of 25 parking spots. Proceed?')) return
    setSeeding(true)
    try {
      const batch = writeBatch(db)
      const now = new Date().toISOString()
      
      const seedSpots: Omit<ExtendedParkingSlot, 'id'>[] = []
      
      // Seed Resident spots (R-101 to R-110)
      for (let i = 1; i <= 10; i++) {
        seedSpots.push({
          slotNumber: `R-${100 + i}`,
          category: 'resident',
          monthlyFee: 2500,
          status: 'available',
          createdAt: now,
          updatedAt: now
        })
      }
      // Seed Tenant spots (T-201 to T-208)
      for (let i = 1; i <= 8; i++) {
        seedSpots.push({
          slotNumber: `T-${200 + i}`,
          category: 'tenant',
          monthlyFee: 2000,
          status: 'available',
          createdAt: now,
          updatedAt: now
        })
      }
      // Seed Visitor spots (V-01 to V-05)
      for (let i = 1; i <= 5; i++) {
        seedSpots.push({
          slotNumber: `V-0${i}`,
          category: 'visitor',
          monthlyFee: 0,
          status: 'available',
          createdAt: now,
          updatedAt: now
        })
      }
      // Seed Staff spots (S-301 to S-302)
      for (let i = 1; i <= 2; i++) {
        seedSpots.push({
          slotNumber: `S-30${i}`,
          category: 'staff',
          monthlyFee: 1000,
          status: 'available',
          createdAt: now,
          updatedAt: now
        })
      }

      seedSpots.forEach((spot) => {
        const docRef = doc(collection(db, 'parking'), spot.slotNumber)
        batch.set(docRef, spot)
      })

      await batch.commit()
      alert('Database parking grid seeded successfully!')
    } catch (err: any) {
      console.error('Error seeding parking slots:', err)
      alert('Failed to seed: ' + err.message)
    } finally {
      setSeeding(false)
    }
  }

  // Create single parking slot
  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSlotNumber.trim()) return
    setSubmitting(true)
    try {
      const now = new Date().toISOString()
      const slotId = newSlotNumber.trim().toUpperCase()
      const newSlot: Omit<ExtendedParkingSlot, 'id'> = {
        slotNumber: slotId,
        category: newCategory,
        monthlyFee: Number(newMonthlyFee) || 0,
        status: 'available',
        createdAt: now,
        updatedAt: now
      }

      await setDoc(doc(db, 'parking', slotId), newSlot)
      setNewSlotNumber('')
      setIsCreateOpen(false)
    } catch (err: any) {
      console.error('Error creating parking slot:', err)
      alert('Failed to create: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Open Assign dialog for slot
  const handleOpenAssign = (slot: ExtendedParkingSlot) => {
    setSelectedSlot(slot)
    setAssignTower(slot.unitId ? slot.unitId.split(' / ')[0] || '' : '')
    setAssignUnit(slot.unitId ? slot.unitId.split(' / ')[1] || '' : '')
    setAssigneeName(slot.assignedTo || '')
    setAssignVehicleNo(slot.vehicleNumber || '')
    
    // Parse Brand and Type from vehicleModel (e.g. "Honda (Car)")
    const modelStr = slot.vehicleModel || ''
    const matches = modelStr.match(/^([^\(]+)\s*\(([^)]+)\)$/)
    if (matches) {
      setAssignVehicleBrand(matches[1].trim())
      setAssignVehicleType(matches[2].trim())
    } else {
      setAssignVehicleBrand(modelStr || 'Honda')
      setAssignVehicleType('Car')
    }
    
    setAssignStatus(slot.status)
    setSelectedResidentId('')
    setSelectedVisitorId('')
    setIsAssignOpen(true)
  }

  const handleSelectResident = (resId: string) => {
    setSelectedResidentId(resId)
    if (resId === 'custom') {
      setAssigneeName('')
      setAssignTower('')
      setAssignUnit('')
      return
    }
    const selectedRes = residents.find(r => r.id === resId)
    if (selectedRes) {
      setAssigneeName(selectedRes.fullName)
      setAssignTower(selectedRes.buildingId || '')
      setAssignUnit(selectedRes.unitNumber || '')
    }
  }

  const handleSelectVisitor = (visId: string) => {
    setSelectedVisitorId(visId)
    if (visId === 'custom') {
      setAssigneeName('')
      setAssignTower('')
      setAssignUnit('')
      setAssignVehicleNo('')
      return
    }
    const selectedVis = activeVisitors.find(v => v.id === visId)
    if (selectedVis) {
      setAssigneeName(selectedVis.name)
      if (selectedVis.unitId && selectedVis.unitId.includes(' / ')) {
        setAssignTower(selectedVis.unitId.split(' / ')[0] || '')
        setAssignUnit(selectedVis.unitId.split(' / ')[1] || '')
      } else {
        setAssignTower(selectedVis.unitId || '')
        setAssignUnit('')
      }
      setAssignVehicleNo(selectedVis.licensePlate || '')
      setAssignVehicleBrand(selectedVis.vehicleBrand || 'Honda')
    }
  }

  // Save Assignment
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSlot) return
    setSubmitting(true)
    try {
      const now = new Date().toISOString()
      const isOccupied = assignStatus === 'occupied'
      
      const updatedSpot: Partial<ExtendedParkingSlot> = {
        status: assignStatus,
        unitId: isOccupied && assignTower && assignUnit ? `${assignTower} / ${assignUnit}` : isOccupied && assignTower ? assignTower : null,
        assignedTo: isOccupied ? assigneeName : null,
        vehicleNumber: isOccupied ? assignVehicleNo : null,
        vehicleModel: isOccupied ? `${assignVehicleBrand} (${assignVehicleType})` : null,
        assignedAt: isOccupied ? (selectedSlot.assignedAt || now) : null,
        updatedAt: now
      }

      await setDoc(doc(db, 'parking', selectedSlot.id), updatedSpot, { merge: true })
      setIsAssignOpen(false)
      setSelectedSlot(null)
    } catch (err: any) {
      console.error('Error assigning parking slot:', err)
      alert('Failed to assign: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Quick Release Slot
  const handleReleaseSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to release and clear this parking slot?')) return
    try {
      await setDoc(doc(db, 'parking', slotId), {
        status: 'available',
        unitId: null,
        assignedTo: null,
        vehicleNumber: null,
        vehicleModel: null,
        assignedAt: null,
        updatedAt: new Date().toISOString()
      }, { merge: true })
    } catch (err: any) {
      console.error('Error releasing slot:', err)
      alert('Failed to release: ' + err.message)
    }
  }

  // Delete parking slot
  const handleDeleteSlot = async (slotId: string) => {
    if (!confirm('Are you sure you want to permanently delete this parking slot from database?')) return
    try {
      await deleteDoc(doc(db, 'parking', slotId))
    } catch (err: any) {
      console.error('Error deleting slot:', err)
      alert('Failed to delete: ' + err.message)
    }
  }

  // Filter calculations
  const filteredSlots = parkingSlots.filter((p) => {
    const matchesSearch = 
      p.slotNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.unitId && p.unitId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.vehicleNumber && p.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.assignedTo && p.assignedTo.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter

    return matchesSearch && matchesCategory && matchesStatus
  })

  // Counters
  const occupiedCount = parkingSlots.filter(p => p.status === 'occupied').length
  const availableCount = parkingSlots.filter(p => p.status === 'available').length
  const maintenanceCount = parkingSlots.filter(p => p.status === 'maintenance').length
  
  // Dynamic monthly billing fees
  const monthlyRevenue = parkingSlots
    .filter(p => p.status === 'occupied' && p.category !== 'visitor')
    .reduce((acc, p) => acc + (p.monthlyFee || 0), 0)

  // Sub-categories count
  const residentCount = parkingSlots.filter(p => p.category === 'resident').length
  const tenantCount = parkingSlots.filter(p => p.category === 'tenant').length
  const visitorCount = parkingSlots.filter(p => p.category === 'visitor').length
  const staffCount = parkingSlots.filter(p => p.category === 'staff').length

  const getCategoryBadgeColor = (category: string) => {
    if (category === 'resident') return 'bg-blue-50 text-blue-700 border-blue-200'
    if (category === 'tenant') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    if (category === 'visitor') return 'bg-purple-50 text-purple-700 border-purple-200'
    return 'bg-slate-50 text-slate-700 border-slate-200'
  }

  const isResidentOrTenant = profile?.role === 'RESIDENT' || profile?.role === 'TENANT'
  const userUnitId = profile ? `${profile.buildingId} / ${profile.unitNumber}`.toLowerCase() : ''
  const myAssignedSlots = parkingSlots.filter(p => 
    p.status === 'occupied' && (
      (p.unitId && p.unitId.toLowerCase() === userUnitId) ||
      (profile?.fullName && p.assignedTo && p.assignedTo.toLowerCase() === profile.fullName.toLowerCase())
    )
  )

  if (isResidentOrTenant) {
    return (
      <DashboardLayout title="My Parking Space">
        <div className="space-y-6 max-w-3xl mx-auto pb-8">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">My Parking Spot</h2>
            <p className="text-muted-foreground">View your assigned vehicle bay and lease credentials</p>
          </div>

          {myAssignedSlots.length === 0 ? (
            <Card className="rounded-3xl border-slate-100 shadow-lg p-6 text-center">
              <CardContent className="space-y-4 pt-4">
                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-full w-fit mx-auto">
                  <Car className="h-10 w-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">No Parking Spot Assigned</h3>
                <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
                  There is currently no parking slot linked to your unit (<span className="font-semibold text-indigo-600">{profile?.buildingId || 'None'} / {profile?.unitNumber || 'None'}</span>).
                </p>
                <div className="p-3 bg-amber-50 rounded-2xl text-xs text-amber-700 font-semibold border border-amber-100 flex items-center gap-2 max-w-md mx-auto">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>Please contact the Management Office to assign a dedicated parking space for your vehicle.</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            myAssignedSlots.map((slot) => (
              <Card key={slot.id} className="rounded-3xl border-slate-100 shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
                <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 md:p-8 relative">
                  <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-xs uppercase font-bold tracking-widest text-indigo-300">Sunrise Parking Grid</span>
                      <h3 className="text-4xl font-extrabold tracking-tight">{slot.slotNumber}</h3>
                    </div>
                    <Badge className="bg-emerald-500 text-white font-extrabold uppercase rounded-full px-3 py-1 text-xs">
                      Active Assignment
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-6 md:p-8 space-y-6 text-sm">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-50 text-slate-500 rounded-xl mt-0.5">
                          <UserCheck className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assignee Name</p>
                          <p className="font-bold text-slate-800 text-base mt-0.5">{slot.assignedTo}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-50 text-slate-500 rounded-xl mt-0.5">
                          <Layers className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Unit Association</p>
                          <p className="font-bold text-slate-800 text-base mt-0.5">{slot.unitId}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-50 text-slate-500 rounded-xl mt-0.5">
                          <Badge variant="outline" className="capitalize text-[10px] font-semibold">{slot.category}</Badge>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Parking Category</p>
                          <p className="font-bold text-slate-800 text-base mt-0.5 capitalize">{slot.category} Leased Bay</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-50 text-slate-500 rounded-xl mt-0.5">
                          <Car className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registered Vehicle</p>
                          <p className="font-bold text-slate-900 text-base mt-0.5">{slot.vehicleNumber || 'No Plate Linked'}</p>
                          {slot.vehicleModel && <p className="text-xs text-slate-500 font-medium mt-0.5">{slot.vehicleModel}</p>}
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-50 text-slate-500 rounded-xl mt-0.5">
                          <Calendar className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assigned Date & Time</p>
                          <p className="font-bold text-slate-800 text-base mt-0.5">
                            {slot.assignedAt ? new Date(slot.assignedAt).toLocaleDateString([], {dateStyle: 'medium'}) : 'N/A'}
                          </p>
                        </div>
                      </div>

                      {slot.category !== 'visitor' && (
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl mt-0.5">
                            <span className="font-bold text-xs">₨</span>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Monthly Fee</p>
                            <p className="font-bold text-indigo-700 text-lg mt-0.5">₨ {slot.monthlyFee}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="h-4 w-4" />
                    <span>SLA Policy: Vehicles must park strictly in their assigned bays. Parking in fire lanes leads to towing.</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Parking Management">
      <div className="space-y-6 max-w-7xl mx-auto pb-8">
        
        {/* Header Hero Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Parking Space Control Center</h2>
            <p className="text-muted-foreground">Manage Resident, Tenant, Visitor, and Office Staff vehicle bays dynamically</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {profile?.role === 'SUPER_ADMIN' && parkingSlots.length === 0 && (
              <Button 
                onClick={handleAutoSeed} 
                disabled={seeding}
                variant="outline" 
                className="border-indigo-200 hover:bg-indigo-50 text-indigo-700 font-semibold"
              >
                {seeding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4 text-indigo-500 animate-pulse" />
                )}
                Auto-Seed Base Grid
              </Button>
            )}

            {profile?.role === 'SUPER_ADMIN' && (
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 font-semibold flex items-center gap-2">
                    <Plus className="h-4.5 w-4.5" />
                    Create Parking Slot
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Create New Parking Slot</DialogTitle>
                    <DialogDescription>Add a physical vehicle bay to the society parking grid.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateSlot} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="slotNo">Slot ID / Number *</Label>
                      <Input 
                        id="slotNo" 
                        required 
                        placeholder="e.g. R-105, V-09, S-305" 
                        value={newSlotNumber} 
                        onChange={(e) => setNewSlotNumber(e.target.value)} 
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cat">Parking Category *</Label>
                      <Select 
                        value={newCategory} 
                        onValueChange={(val: any) => {
                          setNewCategory(val)
                          if (val === 'visitor') setNewMonthlyFee('0')
                          else if (val === 'staff') setNewMonthlyFee('1000')
                          else setNewMonthlyFee('2000')
                        }}
                      >
                        <SelectTrigger id="cat"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="resident">Resident Parking (Lease)</SelectItem>
                          <SelectItem value="tenant">Tenant Parking (Lease)</SelectItem>
                          <SelectItem value="visitor">Visitor Parking (Short-term)</SelectItem>
                          <SelectItem value="staff">Office Staff Parking</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fee">Monthly Rental Fee (₨)</Label>
                      <Input 
                        id="fee" 
                        type="number" 
                        required 
                        disabled={newCategory === 'visitor'}
                        value={newMonthlyFee} 
                        onChange={(e) => setNewMonthlyFee(e.target.value)} 
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                      <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                      <Button type="submit" disabled={submitting}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Slot
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="rounded-2xl border-slate-100 shadow-sm"><CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-500">Total Bays Grid</p>
              <Layers className="h-5 w-5 text-indigo-500" />
            </div>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">{parkingSlots.length}</p>
            <div className="flex gap-2 mt-2 text-[10px] text-slate-400 font-medium">
              <span>{residentCount} Res</span>•<span>{tenantCount} Ten</span>•<span>{visitorCount} Vis</span>•<span>{staffCount} Staff</span>
            </div>
          </CardContent></Card>

          <Card className="rounded-2xl border-slate-100 shadow-sm"><CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-500">Occupied Spots</p>
              <Car className="h-5 w-5 text-amber-500 animate-pulse" />
            </div>
            <p className="text-3xl font-extrabold text-slate-950 mt-2">{occupiedCount}</p>
            <p className="text-xs text-amber-600 font-semibold mt-1">Active Parking assignments</p>
          </CardContent></Card>

          <Card className="rounded-2xl border-slate-100 shadow-sm"><CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-500">Available Slots</p>
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            </div>
            <p className="text-3xl font-extrabold text-emerald-600 mt-2">{availableCount}</p>
            <p className="text-xs text-emerald-600 font-semibold mt-1">Ready for occupancy</p>
          </CardContent></Card>

          <Card className="rounded-2xl border-slate-100 shadow-sm"><CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-500">Monthly Billing Revenue</p>
              <span className="font-bold text-xs text-slate-400">SAWS</span>
            </div>
            <p className="text-3xl font-extrabold text-indigo-600 mt-2">₨ {monthlyRevenue.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1">Calculated from leased spots</p>
          </CardContent></Card>
        </div>

        {/* Filter Navigation Panel */}
        <div className="flex flex-col md:flex-row items-center gap-4 justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
            {(['all', 'resident', 'tenant', 'visitor', 'staff'] as const).map((cat) => (
              <Button
                key={cat}
                variant={categoryFilter === cat ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-xl capitalize font-semibold ${
                  categoryFilter === cat 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {cat} Spots
              </Button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
            {/* Status Dropdown */}
            <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
              <SelectTrigger className="w-full sm:w-40 rounded-xl border-slate-200">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available Only</SelectItem>
                <SelectItem value="occupied">Occupied Only</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search slot, unit, vehicle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 rounded-xl border-slate-200 focus-visible:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Parking Grid Table */}
        <Card className="rounded-2xl border-slate-100 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-indigo-600" /></div>
            ) : filteredSlots.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <AlertCircle className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-500">No parking slots matched filters</p>
                <p className="text-xs text-slate-400 mt-1">Try resetting search string or active categorization filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-600 font-semibold">
                      <th className="p-4">Slot ID</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Unit Assignment</th>
                      <th className="p-4">Assignee Info</th>
                      <th className="p-4">Vehicle Details</th>
                      <th className="p-4">Monthly Fee</th>
                      <th className="p-4">Status</th>
                      {profile?.role === 'SUPER_ADMIN' || profile?.role === 'MANAGER' ? <th className="p-4 text-right">Actions</th> : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {filteredSlots.map((slot) => (
                      <tr key={slot.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 font-bold text-slate-900">{slot.slotNumber}</td>
                        <td className="p-4">
                          <Badge variant="outline" className={`capitalize font-semibold text-[10px] rounded-full border px-2 py-0.5 ${getCategoryBadgeColor(slot.category)}`}>
                            {slot.category}
                          </Badge>
                        </td>
                        <td className="p-4 font-semibold text-indigo-700">{slot.unitId || '—'}</td>
                        <td className="p-4">
                          {slot.assignedTo ? (
                            <div className="flex items-center gap-1.5 font-medium text-slate-800">
                              <User className="h-3.5 w-3.5 text-slate-400" />
                              <span>{slot.assignedTo}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-normal">—</span>
                          )}
                        </td>
                        <td className="p-4 text-xs font-semibold text-slate-800">
                          {slot.vehicleNumber ? (
                            <div className="space-y-0.5">
                              <p className="font-semibold text-slate-900">{slot.vehicleNumber}</p>
                              {slot.vehicleModel && <p className="text-[10px] text-slate-400 font-normal">{slot.vehicleModel}</p>}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-normal">—</span>
                          )}
                        </td>
                        <td className="p-4 font-medium text-slate-900">
                          {slot.category === 'visitor' ? (
                            <span className="text-xs text-slate-400 italic">No Charge</span>
                          ) : (
                            <span>₨ {slot.monthlyFee}</span>
                          )}
                        </td>
                        <td className="p-4">
                          <Badge 
                            variant={
                              slot.status === 'occupied' 
                                ? 'success' 
                                : slot.status === 'maintenance' 
                                  ? 'destructive' 
                                  : 'warning'
                            }
                            className="capitalize rounded-full font-bold px-2.5"
                          >
                            {slot.status}
                          </Badge>
                        </td>
                        
                        {/* Manager & Admin actions */}
                        {(profile?.role === 'SUPER_ADMIN' || profile?.role === 'MANAGER') && (
                          <td className="p-4 text-right">
                            <div className="flex justify-end items-center gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-semibold text-xs py-1 px-2.5 rounded-lg flex items-center gap-1"
                                onClick={() => handleOpenAssign(slot)}
                              >
                                <ArrowRightLeft className="h-3.5 w-3.5" />
                                {slot.status === 'occupied' ? 'Modify' : 'Assign'}
                              </Button>
                              
                              {slot.status === 'occupied' && (
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 font-semibold text-xs py-1 px-2.5 rounded-lg"
                                  onClick={() => handleReleaseSlot(slot.id)}
                                >
                                  Release
                                </Button>
                              )}

                              {profile?.role === 'SUPER_ADMIN' && (
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1 rounded-lg"
                                  onClick={() => handleDeleteSlot(slot.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ASSIGN / MODIFY DIALOG MODAL */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Car className="h-5.5 w-5.5 text-indigo-600" />
              Configure Parking Spot: {selectedSlot?.slotNumber}
            </DialogTitle>
            <DialogDescription>
              Assign the spot to a Resident, Tenant, Staff, or Visitor, or configure maintenance status.
            </DialogDescription>
          </DialogHeader>
          
          {selectedSlot && (
            <form onSubmit={handleSaveAssignment} className="space-y-4 pt-4">
              
              <div className="space-y-2">
                <Label htmlFor="status">Availability Status *</Label>
                <Select value={assignStatus} onValueChange={(val: any) => setAssignStatus(val)}>
                  <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available (Vacant)</SelectItem>
                    <SelectItem value="occupied">Occupied (Assigned)</SelectItem>
                    <SelectItem value="maintenance">Maintenance (Out of Order)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {assignStatus === 'occupied' && (
                <>
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-bold text-slate-800 text-sm">Assignee Association</h4>

                    {/* Resident Link Dropdown (for Resident/Tenant slots) */}
                    {(selectedSlot.category === 'resident' || selectedSlot.category === 'tenant') && (
                      <div className="space-y-2">
                        <Label htmlFor="linkRes">Link Approved Resident/Tenant Account</Label>
                        <Select value={selectedResidentId || 'custom'} onValueChange={handleSelectResident}>
                          <SelectTrigger id="linkRes"><SelectValue placeholder="Choose resident/tenant..." /></SelectTrigger>
                          <SelectContent className="max-h-[200px]">
                            <SelectItem value="custom">-- Manual / Custom Entry --</SelectItem>
                            {residents.map((res) => (
                              <SelectItem key={res.id} value={res.id}>
                                {res.fullName} {res.buildingId ? `(${res.buildingId} / ${res.unitNumber})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Visitor Link Dropdown (for Visitor slots) */}
                    {selectedSlot.category === 'visitor' && (
                      <div className="space-y-2">
                        <Label htmlFor="linkVis">Link Active Checked-in Visitor</Label>
                        <Select value={selectedVisitorId || 'custom'} onValueChange={handleSelectVisitor}>
                          <SelectTrigger id="linkVis"><SelectValue placeholder="Choose active visitor..." /></SelectTrigger>
                          <SelectContent className="max-h-[200px]">
                            <SelectItem value="custom">-- Manual / Custom Entry --</SelectItem>
                            {activeVisitors.map((vis) => (
                              <SelectItem key={vis.id} value={vis.id}>
                                {vis.name} {vis.unitId ? `(${vis.unitId})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="twr">Tower / Location</Label>
                        <Select value={assignTower} onValueChange={(val) => { setAssignTower(val); setAssignUnit(''); }}>
                          <SelectTrigger id="twr"><SelectValue placeholder="Tower..." /></SelectTrigger>
                          <SelectContent>
                            {Object.keys(TOWER_UNITS).map(tower => (
                              <SelectItem key={tower} value={tower}>{tower}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="unt">Unit / Room</Label>
                        <Select value={assignUnit} onValueChange={setAssignUnit} disabled={!assignTower}>
                          <SelectTrigger id="unt"><SelectValue placeholder="Unit..." /></SelectTrigger>
                          <SelectContent>
                            {assignTower && TOWER_UNITS[assignTower].map(unit => (
                              <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">Assignee Full Name *</Label>
                      <Input 
                        id="name" 
                        required 
                        placeholder="e.g. John Resident, Plumber Hari, etc." 
                        value={assigneeName} 
                        onChange={(e) => setAssigneeName(e.target.value)} 
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <h4 className="font-bold text-slate-800 text-sm">Vehicle Credentials</h4>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="vNo">Vehicle License Plate *</Label>
                        <Input 
                          id="vNo" 
                          required 
                          placeholder="e.g. BA-1234, Koshi 4323" 
                          value={assignVehicleNo} 
                          onChange={(e) => setAssignVehicleNo(e.target.value)} 
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="vBrand">Brand *</Label>
                          <Select value={assignVehicleBrand} onValueChange={setAssignVehicleBrand}>
                            <SelectTrigger id="vBrand"><SelectValue placeholder="Select brand" /></SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              {['Honda', 'Suzuki', 'Hyundai', 'Tata', 'Toyota', 'Yamaha', 'Bajaj', 'Mahindra', 'Kia', 'BYD', 'Deepal', 'GWM', 'BMW', 'Mercedes-Benz', 'Audi', 'Others'].map(brand => (
                                <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="vType">Type *</Label>
                          <Select value={assignVehicleType} onValueChange={setAssignVehicleType}>
                            <SelectTrigger id="vType"><SelectValue placeholder="Select type" /></SelectTrigger>
                            <SelectContent>
                              {['Car', 'SUV', 'Van', 'Bike', 'Scooter', 'Other'].map(vtype => (
                                <SelectItem key={vtype} value={vtype}>{vtype}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Spot Settings
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}