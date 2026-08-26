'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { useAuth } from '@/context/AuthContext'
import { db } from '@/config/firebase'
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, limit, where } from 'firebase/firestore'
import { MaintenanceTicket } from '@/types/models'
import { 
  Wrench, CheckCircle, Clock, AlertTriangle, Plus, User, MapPin, 
  Sparkles, Package, ListFilter, Calendar, DollarSign, X, ChevronRight, Activity, FileText, Loader2
} from 'lucide-react'

const priorityColors: Record<string, string> = { 
  critical: 'bg-rose-100 text-rose-800 border-rose-200', 
  high: 'bg-orange-100 text-orange-800 border-orange-200', 
  medium: 'bg-amber-100 text-amber-800 border-amber-200', 
  low: 'bg-gray-100 text-gray-800 border-gray-200' 
}

const statusColors: Record<string, string> = { 
  open: 'bg-blue-100 text-blue-800 border-blue-200', 
  in_progress: 'bg-indigo-100 text-indigo-800 border-indigo-200', 
  resolved: 'bg-emerald-100 text-emerald-800 border-emerald-200', 
  closed: 'bg-gray-100 text-gray-800 border-gray-200' 
}

const CATEGORIES_PRIVATE = ['Plumbing', 'Electrical', 'Carpentry & Masonry', 'Appliance/HVAC']
const CATEGORIES_COMMON = ['Civil Infrastructure', 'Utility Blocks', 'Safety & Security', 'Common Amenities']

const COMMON_LOCATIONS = [
  'Block A Elevator 1', 
  'Block A Elevator 2', 
  'Block B I Elevator 1',
  'Block B I Elevator 2',
  'Block B II Elevator 1',
  'Block B II Elevator 2',
  'Block A Lobby',
  'Block BI Lobby', 
  'Block BII Lobby', 
  'Basement 1 Parking', 
  'Basement 2 Parking', 
  'Block A Ground Floor Parking',
  'Block B I Ground Floor Parking',
  'Block B II Ground Floor Parking',
  'Out Door Privert Parking',
  'Visitor Parking',
  'Society Garbage Area',
  'Children Park',
  'Society Clubhouse Gym', 
  'Community Hall', 
  'Central Water Treatment Plant', 
  'Main Security Gate Boom Barrier',
  'Other'
]

const DEFAULT_STAFF = [
  { uid: 'tech_ramesh', fullName: 'Ramesh Karki', role: 'PLUMBER', specialization: 'Plumbing', contact: '9851034561', availability: 'Available' },
  { uid: 'tech_sunil', fullName: 'Sunil Thapa', role: 'ELECTRICIAN', specialization: 'Electrical', contact: '9851034562', availability: 'Available' },
  { uid: 'tech_anil', fullName: 'Anil Gurung', role: 'GENERAL_STAFF', specialization: 'Civil Infrastructure', contact: '9851034563', availability: 'Available' },
  { uid: 'tech_kiran', fullName: 'Kiran Shrestha', role: 'GENERAL_STAFF', specialization: 'Appliance/HVAC', contact: '9851034564', availability: 'On_Task' },
  { uid: 'tech_madhav', fullName: 'Madhav Bhandari', role: 'GENERAL_STAFF', specialization: 'Carpentry & Masonry', contact: '9851034565', availability: 'Available' }
]

const DEFAULT_INVENTORY = [
  { item_id: 'inv_bulb', item_name: 'LED Light Bulb (18W)', stock_quantity: 45, unit_price: 350 },
  { item_id: 'inv_pipe', item_name: 'PVC Pipe Elbow (1 inch)', stock_quantity: 30, unit_price: 180 },
  { item_id: 'inv_valve', item_name: 'Water Tap Brass Valve', stock_quantity: 20, unit_price: 850 },
  { item_id: 'inv_hinge', item_name: 'Stainless Steel Door Hinge', stock_quantity: 50, unit_price: 220 },
  { item_id: 'inv_wire', item_name: 'Copper Electric Wire Roll (10m)', stock_quantity: 15, unit_price: 1200 },
  { item_id: 'inv_seal', item_name: 'Waterproof Sealing Tape', stock_quantity: 60, unit_price: 90 }
]

export default function MaintenancePage() {
  const { profile } = useAuth()
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [staff, setStaff] = useState<any[]>([])

  useEffect(() => {
    const q = query(collection(db, 'users'))
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const sData: any[] = []
      snapshot.forEach((doc: any) => {
        const u = doc.data()
        if (['PLUMBER', 'ELECTRICIAN', 'GENERAL_STAFF', 'CLEANER', 'GUARD', 'MANAGER', 'OFFICE_ASSISTANT'].includes(u.role)) {
          sData.push({ uid: doc.id, ...u })
        }
      })
      setStaff(sData)
    }, (error: any) => {
      console.error('Error fetching staff users:', error)
    })

    return () => unsubscribe()
  }, [])
  
  // Modals state
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false)
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [isPartsOpen, setIsPartsOpen] = useState(false)
  const [isResolveOpen, setIsResolveOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null)

  // Raise Request Form State
  const [scope, setScope] = useState<'Internal_Unit' | 'Common_Area'>('Internal_Unit')
  const [category, setCategory] = useState('')
  const [structuralLocation, setStructuralLocation] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('low')
  const [photoUrl, setPhotoUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Assignment & parts selection state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all')

  // Resolve dialog form state
  const [resolutionSummary, setResolutionSummary] = useState('')
  const [actualCost, setActualCost] = useState('0')

  useEffect(() => {
    let q;
    const isAdminOrManager = profile ? ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(profile.role) : false
    
    if (isAdminOrManager) {
      q = query(collection(db, 'maintenance'), orderBy('createdAt', 'desc'))
    } else {
      q = query(
        collection(db, 'maintenance'), 
        where('reportedBy', '==', profile?.uid || '')
      )
    }

    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const tData: MaintenanceTicket[] = []
      snapshot.forEach((doc: any) => {
        tData.push({ id: doc.id, ...doc.data() } as MaintenanceTicket)
      })
      setTickets(tData)
      setLoading(false)
    }, (error: any) => {
      console.error('Error fetching maintenance tickets:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Auto select category if scope changes
  useEffect(() => {
    setCategory('')
    setStructuralLocation('')
  }, [scope])

  // Get matching tickets for current user role
  const isStaffOrTech = profile ? ['PLUMBER', 'ELECTRICIAN', 'CLEANER', 'GUARD', 'GENERAL_STAFF'].includes(profile.role) : false
  const isAdminOrManager = profile ? ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(profile.role) : false
  const staffListToDisplay = staff.length > 0 ? staff : DEFAULT_STAFF

  const baseTickets = tickets.filter(t => {
    // 1. Role boundaries
    if (isStaffOrTech) {
      // Techs only see tickets assigned to them
      if (t.assignedTo !== profile?.fullName && t.assignedTo !== profile?.uid) return false
    } else if (!isAdminOrManager) {
      // Residents/Tenants only see their own reported tickets
      if (t.reportedBy !== profile?.uid && t.reportedBy !== profile?.fullName) return false
    }
    return true
  })

  const filteredTickets = baseTickets.filter(t => {
    // 2. Status filter
    if (statusFilter !== 'all' && t.status !== statusFilter) return false

    // 3. Search query filter
    if (searchQuery) {
      const queryLower = searchQuery.toLowerCase()
      return (
        t.title.toLowerCase().includes(queryLower) ||
        t.description.toLowerCase().includes(queryLower) ||
        (t.unitId && t.unitId.toLowerCase().includes(queryLower)) ||
        (t.structuralLocation && t.structuralLocation.toLowerCase().includes(queryLower))
      )
    }

    return true
  })

  // Selected ticket dynamic reference
  const currentTicket = tickets.find(t => t.id === selectedTicket?.id) || selectedTicket

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setIsSubmitting(true)

    try {
      const now = new Date().toISOString()
      const ticketId = `SR-MAINT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
      
      const newTicket: Omit<MaintenanceTicket, 'id'> & { ticketNo: string, reportedByName: string } = {
        ticketNo: ticketId,
        title,
        description,
        category,
        priority,
        status: 'open',
        reportedBy: profile.uid,
        reportedByName: profile.fullName,
        buildingId: profile.buildingId || 'Main',
        unitId: scope === 'Internal_Unit' ? `${profile.buildingId || ''} / ${profile.unitNumber || ''}` : 'Common Area',
        scope,
        attachments: photoUrl ? [photoUrl] : [],
        createdAt: now,
        updatedAt: now
      }

      if (scope === 'Common_Area') {
        newTicket.structuralLocation = structuralLocation
      }

      await addDoc(collection(db, 'maintenance'), newTicket)

      // Reset
      setTitle('')
      setDescription('')
      setCategory('')
      setStructuralLocation('')
      setPhotoUrl('')
      setPriority('low')
      setIsNewRequestOpen(false)
    } catch (error) {
      console.error('Error creating maintenance request:', error)
      alert('Failed to submit request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAssignTechnician = async (tech: any) => {
    if (!currentTicket) return
    try {
      const ticketRef = doc(db, 'maintenance', currentTicket.id)
      await updateDoc(ticketRef, {
        status: 'in_progress',
        assignedTo: tech.fullName,
        updatedAt: new Date().toISOString()
      })
      setIsAssignOpen(false)
    } catch (error) {
      console.error('Error assigning technician:', error)
      alert('Failed to assign technician')
    }
  }

  const handleAllocatePart = async (part: typeof DEFAULT_INVENTORY[0]) => {
    if (!currentTicket) return
    try {
      const ticketRef = doc(db, 'maintenance', currentTicket.id)
      // Grab existing allocated parts or init empty array
      const currentParts = (currentTicket as any).allocatedParts || []
      
      // Look if part already added
      const existingPartIndex = currentParts.findIndex((p: any) => p.name === part.item_name)
      let updatedParts = [...currentParts]
      
      if (existingPartIndex > -1) {
        updatedParts[existingPartIndex].quantity += 1
        updatedParts[existingPartIndex].cost += part.unit_price
      } else {
        updatedParts.push({
          name: part.item_name,
          quantity: 1,
          cost: part.unit_price
        })
      }

      // Sum estimated cost
      const newEstimatedCost = updatedParts.reduce((sum: number, p: any) => sum + p.cost, 0)

      await updateDoc(ticketRef, {
        allocatedParts: updatedParts,
        estimatedCost: newEstimatedCost,
        updatedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error allocating parts:', error)
      alert('Failed to allocate parts')
    }
  }

  const handleResolveTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentTicket) return
    try {
      const ticketRef = doc(db, 'maintenance', currentTicket.id)
      await updateDoc(ticketRef, {
        status: 'resolved',
        remarks: resolutionSummary,
        actualCost: Number(actualCost) || 0,
        updatedAt: new Date().toISOString()
      })
      setResolutionSummary('')
      setActualCost('0')
      setIsResolveOpen(false)
    } catch (error) {
      console.error('Error resolving ticket:', error)
      alert('Failed to resolve ticket')
    }
  }

  const handleCloseTicket = async (ticketId: string) => {
    if (!confirm('Are you sure you want to close this maintenance ticket?')) return
    try {
      const ticketRef = doc(db, 'maintenance', ticketId)
      await updateDoc(ticketRef, {
        status: 'closed',
        updatedAt: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error closing ticket:', error)
      alert('Failed to close ticket')
    }
  }

  // SLA Alert condition: Critical/High priorities open for longer than 2 hours
  const checkSlaAlert = (ticket: MaintenanceTicket) => {
    if (ticket.status !== 'open') return false
    if (ticket.priority !== 'critical' && ticket.priority !== 'high') return false
    const hoursElapsed = (Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60)
    return hoursElapsed > 2
  }

  // Count summaries
  const openCount = baseTickets.filter(t => t.status === 'open').length
  const inProgressCount = baseTickets.filter(t => t.status === 'in_progress').length
  const completedCount = baseTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length
  const slaAlertCount = baseTickets.filter(t => checkSlaAlert(t)).length

  return (
    <DashboardLayout title="Maintenance Management">
      <div className="space-y-6 max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
              <Wrench className="h-6 w-6 md:h-8 md:w-8 text-indigo-600 animate-pulse" />
              Repair & Maintenance
            </h2>
            <p className="text-muted-foreground mt-1">
              {isAdminOrManager 
                ? 'Society Operations Control Center & Inventory Dispatch Panel' 
                : isStaffOrTech 
                  ? 'Technician Work Queue & Active Work Orders' 
                  : 'Track and report structural & internal apartment maintenance'}
            </p>
          </div>
          
          {/* Action button visible only to Residents/Tenants or Admins */}
          {!isStaffOrTech && (
            <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-md transition-all duration-200 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Raise New Request
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg rounded-xl shadow-2xl border-indigo-100 max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-indigo-500" />
                    File Maintenance Ticket
                  </DialogTitle>
                  <DialogDescription>
                    Fill in details about the issue. Our management team will triage and dispatch a specialized technician immediately.
                  </DialogDescription>
                </DialogHeader>
                <div className="overflow-y-auto p-1 -mx-1">
                  <form onSubmit={handleSubmitRequest} className="space-y-4 pt-2">
                  
                  {/* Scope Selector */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Scope of Issue *</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        type="button" 
                        variant={scope === 'Internal_Unit' ? 'default' : 'outline'}
                        onClick={() => setScope('Internal_Unit')}
                        className={`w-full justify-center ${scope === 'Internal_Unit' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
                      >
                        In-Apartment (Private Unit)
                      </Button>
                      <Button 
                        type="button" 
                        variant={scope === 'Common_Area' ? 'default' : 'outline'}
                        onClick={() => setScope('Common_Area')}
                        className={`w-full justify-center ${scope === 'Common_Area' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : ''}`}
                      >
                        Common Area (Infrastructure)
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Category Selector */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Category *</Label>
                      <Select required value={category} onValueChange={setCategory}>
                        <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                        <SelectContent>
                          {scope === 'Internal_Unit' 
                            ? CATEGORIES_PRIVATE.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)
                            : CATEGORIES_COMMON.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)
                          }
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Conditional Structural Location Dropdown */}
                    {scope === 'Common_Area' && (
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold">Location *</Label>
                        <Select required value={structuralLocation} onValueChange={setStructuralLocation}>
                          <SelectTrigger><SelectValue placeholder="Select Location" /></SelectTrigger>
                          <SelectContent>
                            {COMMON_LOCATIONS.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Unit Number */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Unit Number</Label>
                      <Input disabled value={profile?.unitNumber ? `${profile.buildingId || ''} - ${profile.unitNumber}` : 'General'} />
                    </div>
                  </div>

                  {/* Title */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Short Issue Title *</Label>
                    <Input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Toilet tank leaking, Elevator B stuck" />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Detailed Description *</Label>
                    <textarea 
                      required 
                      value={description} 
                      onChange={e => setDescription(e.target.value)} 
                      rows={3} 
                      className="w-full text-sm rounded-md border border-input bg-transparent px-3 py-2 shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      placeholder="Please provide precise details of the issue to speed up diagnostic assignment."
                    />
                  </div>

                  {/* Priority Indicators */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Priority Level *</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['low', 'medium', 'high', 'critical'] as const).map(p => (
                        <Button
                          key={p}
                          type="button"
                          variant={priority === p ? 'default' : 'outline'}
                          onClick={() => setPriority(p)}
                          className={`capitalize text-xs font-semibold h-9 ${
                            priority === p 
                              ? p === 'critical' ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                                : p === 'high' ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                                : p === 'medium' ? 'bg-amber-600 hover:bg-amber-700 text-white' 
                                : 'bg-gray-700 hover:bg-gray-800 text-white' 
                              : ''
                          }`}
                        >
                          {p === 'critical' ? 'Emergency' : p}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Emergency alert warning */}
                  {priority === 'critical' && (
                    <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs font-medium flex gap-2 animate-bounce">
                      <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">EMERGENCY NOTICE:</span> For active gas leaks, structural fires, or active flooding, please contact the security desk immediately at <span className="font-bold text-red-900 underline">ext. 911</span>.
                      </div>
                    </div>
                  )}

                  {/* Multimedia Link */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Photo Evidence URL (Optional)</Label>
                    <Input value={photoUrl} onChange={e => setPhotoUrl(e.target.value)} placeholder="e.g. https://imagehost.com/evidence.jpg" />
                  </div>

                  <div className="flex justify-end gap-3 pt-3">
                    <Button type="button" variant="outline" onClick={() => setIsNewRequestOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]">
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit Request'}
                    </Button>
                  </div>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

        {/* Dashboard Metric summary cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-md transition-all duration-300 border-l-4 border-l-blue-500 overflow-hidden relative">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Open / Triage</p>
                  <p className="text-xl md:text-2xl font-extrabold text-gray-900 mt-0.5">{openCount}</p>
                </div>
                <div className="p-2 rounded-full bg-blue-50 text-blue-600">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
              <div className="absolute bottom-0 right-0 w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all duration-300 border-l-4 border-l-indigo-500 overflow-hidden relative">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">In Progress</p>
                  <p className="text-xl md:text-2xl font-extrabold text-gray-900 mt-0.5">{inProgressCount}</p>
                </div>
                <div className="p-2 rounded-full bg-indigo-50 text-indigo-600">
                  <Wrench className="h-5 w-5 animate-spin-slow" />
                </div>
              </div>
              <div className="absolute bottom-0 right-0 w-24 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all duration-300 border-l-4 border-l-emerald-500 overflow-hidden relative">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Completed</p>
                  <p className="text-xl md:text-2xl font-extrabold text-gray-900 mt-0.5">{completedCount}</p>
                </div>
                <div className="p-2 rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle className="h-5 w-5" />
                </div>
              </div>
              <div className="absolute bottom-0 right-0 w-24 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-all duration-300 border-l-4 border-l-rose-500 overflow-hidden relative bg-rose-50/10">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">SLA Breaches</p>
                  <p className="text-xl md:text-2xl font-extrabold text-rose-600 mt-0.5">{slaAlertCount}</p>
                </div>
                <div className="p-2 rounded-full bg-rose-50 text-rose-600">
                  <AlertTriangle className="h-5 w-5 animate-bounce" />
                </div>
              </div>
              <div className="absolute bottom-0 right-0 w-24 h-1 bg-gradient-to-r from-rose-500 to-red-500" />
            </CardContent>
          </Card>
        </div>

        {/* Dynamic Split Screen Workspace */}
        <div className="grid gap-6 lg:grid-cols-3">
          
          {/* Left panel - Work orders list */}
          <div className={`lg:col-span-2 space-y-4 min-w-0 ${currentTicket ? 'hidden lg:block' : 'block'}`}>
            <Card className="shadow-sm border-gray-200">
              <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <ListFilter className="h-5 w-5 text-gray-500" />
                    All Service Requests
                  </CardTitle>
                  <CardDescription>Filter and search maintenance logs</CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full sm:w-auto">
                  <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                    <SelectTrigger className="w-full sm:w-[130px] h-9"><SelectValue placeholder="All Status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    placeholder="Search query..." 
                    className="w-full sm:w-[180px] h-9" 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex justify-center items-center py-12"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
                ) : filteredTickets.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    No matching requests or work orders found.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                    {filteredTickets.map((t) => (
                      <div 
                        key={t.id} 
                        onClick={() => setSelectedTicket(t)}
                        className={`p-3 sm:p-4 hover:bg-indigo-50/20 cursor-pointer transition-all flex items-start justify-between gap-2 sm:gap-4 ${
                          selectedTicket?.id === t.id ? 'bg-indigo-50/40 border-l-4 border-l-indigo-600' : ''
                        }`}
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600 font-semibold">
                              {(t as any).ticketNo || t.id.substring(0, 8)}
                            </span>
                            <Badge variant="outline" className={`capitalize text-[10px] ${priorityColors[t.priority]}`}>
                              {t.priority === 'critical' ? 'Emergency' : t.priority}
                            </Badge>
                            {checkSlaAlert(t) && (
                              <Badge className="bg-rose-600 text-white animate-pulse text-[10px]">
                                SLA Breach
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-bold text-gray-900 truncate">{t.title}</h4>
                          <p className="text-sm text-gray-500 line-clamp-1">{t.description}</p>
                          
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 font-medium">
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {t.unitId} {t.structuralLocation ? `(${t.structuralLocation})` : ''}</span>
                            <span className="flex items-center gap-1"><User className="h-3 w-3" /> Reported: { (t as any).reportedByName || 'Resident' }</span>
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(t.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 items-end justify-between self-stretch flex-shrink-0 ml-2">
                          <Badge variant="outline" className={`capitalize text-xs font-semibold whitespace-nowrap ${statusColors[t.status]}`}>
                            {t.status.replace('_', ' ')}
                          </Badge>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right panel - Active details dashboard */}
          <div className={`lg:col-span-1 min-w-0 ${!currentTicket ? 'hidden lg:block' : 'block'}`}>
            {currentTicket ? (
              <Card className="shadow-md border-indigo-100 sticky top-6">
                <CardHeader className="bg-indigo-50/30 border-b pb-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-gray-500">{(currentTicket as any).ticketNo || currentTicket.id.substring(0, 8)}</span>
                      <CardTitle className="text-xl font-black text-gray-900 mt-0.5">{currentTicket.title}</CardTitle>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedTicket(null)}><X className="h-4 w-4" /></Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Badge className={`capitalize font-semibold ${priorityColors[currentTicket.priority]}`}>{currentTicket.priority === 'critical' ? 'Emergency' : currentTicket.priority}</Badge>
                    <Badge className={`capitalize font-semibold ${statusColors[currentTicket.status]}`}>{currentTicket.status.replace('_', ' ')}</Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-5 text-sm">
                  
                  {/* Description Box */}
                  <div className="space-y-1.5 bg-gray-50 p-3 rounded-lg border">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Report Description</p>
                    <p className="text-gray-700 leading-relaxed">{currentTicket.description}</p>
                  </div>

                  {/* Metadata fields */}
                  <div className="grid grid-cols-2 gap-4 border-b pb-4">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase">Scope & Location</p>
                      <p className="font-semibold text-gray-800 mt-0.5 capitalize">{currentTicket.scope ? currentTicket.scope.replace('_', ' ') : 'Internal Unit'}</p>
                      <p className="text-xs text-gray-500">{currentTicket.unitId} {currentTicket.structuralLocation ? `(${currentTicket.structuralLocation})` : ''}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase">Issue Category</p>
                      <p className="font-semibold text-gray-800 mt-0.5">{currentTicket.category}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase">Reported By</p>
                      <p className="font-semibold text-gray-800 mt-0.5">{(currentTicket as any).reportedByName || 'Resident'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase">Assigned Service Tech</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <p className="font-semibold text-indigo-700 flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {currentTicket.assignedTo || 'Waiting Assignment'}
                        </p>
                        {isAdminOrManager && (currentTicket.status === 'open' || currentTicket.status === 'in_progress') && (
                          <button 
                            type="button"
                            onClick={() => setIsAssignOpen(true)} 
                            className="text-[10px] bg-slate-100 hover:bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100 font-bold ml-1"
                            title="Re-assign technician"
                          >
                            Change
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                   {/* Consumed Spare Parts/Billing */}
                   <div className="space-y-3 border-b pb-4">
                     <div className="flex justify-between items-center">
                       <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                          <Package className="h-3.5 w-3.5" />
                          Consumable Spare Parts
                        </p>
                        {/* Allocate parts button visible only to admins and while ticket in-progress */}
                        {isAdminOrManager && currentTicket.status === 'in_progress' && (
                          <Dialog open={isPartsOpen} onOpenChange={setIsPartsOpen}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 h-7 px-2 font-medium">
                                <Plus className="h-3 w-3 mr-1" /> Add Parts
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md rounded-xl border-indigo-50">
                              <DialogHeader>
                                <DialogTitle className="font-bold flex items-center gap-2">
                                  <Package className="h-5 w-5 text-indigo-600" />
                                  Deduct Society Store Inventory
                                </DialogTitle>
                                <DialogDescription>Select society inventory spare parts to allocate for this ticket. Estimated costs will update instantly.</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-3 pt-2 max-h-[300px] overflow-y-auto">
                                {DEFAULT_INVENTORY.map(part => (
                                  <div key={part.item_id} className="flex justify-between items-center p-3 rounded-lg border hover:bg-gray-50 transition">
                                    <div>
                                      <p className="font-semibold text-gray-800">{part.item_name}</p>
                                      <p className="text-xs text-gray-500">In Stock: {part.stock_quantity} | Price: ₨{part.unit_price}</p>
                                    </div>
                                    <Button 
                                      size="sm" 
                                      className="bg-indigo-600 text-white hover:bg-indigo-700" 
                                      onClick={() => handleAllocatePart(part)}
                                    >
                                      Allocate
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                      
                      {/* List allocated parts */}
                      {(currentTicket as any).allocatedParts && (currentTicket as any).allocatedParts.length > 0 ? (
                        <div className="space-y-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                          {(currentTicket as any).allocatedParts.map((p: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-xs text-gray-700 font-medium">
                              <span>{p.name} (x{p.quantity})</span>
                              <span className="font-semibold">₨{p.cost}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-xs border-t pt-2 font-bold text-gray-900">
                            <span>Estimated Parts Cost:</span>
                            <span>₨{(currentTicket as any).estimatedCost || 0}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No society inventory parts allocated yet.</p>
                      )}
                    </div>

                    {/* Financials & Costs summary */}
                  <div className="bg-indigo-50/30 border border-indigo-100 p-3.5 rounded-xl space-y-2">
                    <div className="flex justify-between text-xs font-medium text-gray-500">
                      <span>Inventory Estimate:</span>
                      <span>₨{(currentTicket as any).estimatedCost || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-indigo-100/60 pt-2">
                      <span>Total Actual cost:</span>
                      <span className="text-indigo-700 text-lg">
                        ₨{currentTicket.actualCost && currentTicket.actualCost > 0 
                          ? currentTicket.actualCost 
                          : ((currentTicket as any).estimatedCost || 0)}
                      </span>
                    </div>
                    {(currentTicket.actualCost || ((currentTicket as any).estimatedCost && (currentTicket as any).estimatedCost > 0)) ? (
                      <div className="p-2 rounded bg-indigo-50 border border-indigo-100 text-[11px] text-indigo-800 font-medium flex gap-1 items-start">
                        <FileText className="h-3 w-3 flex-shrink-0 mt-0.5" />
                        {currentTicket.status === 'resolved' || currentTicket.status === 'closed'
                          ? 'Actual cost has been automatically charged and posted to the Monthly Apartment Maintenance Ledger.'
                          : 'Allocated parts cost is estimated and will be charged to the Maintenance Ledger upon resolution.'}
                      </div>
                    ) : null}
                  </div>

                  {/* Action workflows based on roles */}
                  <div className="pt-2 space-y-2">
                    
                     {/* 1. Admin Triage & Assignment */}
                    {isAdminOrManager && (currentTicket.status === 'open' || currentTicket.status === 'in_progress') && (
                      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full bg-indigo-600 text-white hover:bg-indigo-700 font-bold shadow flex items-center justify-center gap-2">
                            <Activity className="h-4 w-4" />
                            {currentTicket.status === 'open' ? 'Dispatch Specialized Staff' : 'Re-assign / Change Staff'}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-xl border-indigo-50">
                          <DialogHeader>
                            <DialogTitle className="font-bold flex items-center gap-2">
                              <Sparkles className="h-5 w-5 text-indigo-600" />
                              Triage Assignment Engine
                            </DialogTitle>
                            <DialogDescription>
                              Select from specialized technicians with matching skills. The status will transition to "In Progress".
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3 pt-2 max-h-[300px] overflow-y-auto">
                            {staffListToDisplay.map(tech => (
                              <div key={tech.uid} className="flex justify-between items-center p-3 rounded-lg border hover:bg-gray-50 transition">
                                <div>
                                  <p className="font-bold text-gray-800">{tech.fullName}</p>
                                  <p className="text-xs text-gray-500">
                                    Specialization: <span className="font-semibold text-indigo-600">{tech.specialization || tech.role.replace('_', ' ')}</span> | Status: <span className="font-semibold text-emerald-600">{tech.availability || 'Available'}</span>
                                  </p>
                                </div>
                                <Button 
                                  size="sm" 
                                  className="bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold"
                                  onClick={() => handleAssignTechnician(tech)}
                                >
                                  Dispatch
                                </Button>
                              </div>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    {(isStaffOrTech || isAdminOrManager) && currentTicket.status === 'in_progress' && (
                      <Dialog open={isResolveOpen} onOpenChange={(open) => {
                        if (open) {
                          setActualCost(String((currentTicket as any).estimatedCost || 0))
                        }
                        setIsResolveOpen(open)
                      }}>
                        <DialogTrigger asChild>
                          <Button className="w-full bg-emerald-600 text-white hover:bg-emerald-700 font-bold flex items-center justify-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Mark Work Order Resolved
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md rounded-xl border-emerald-50">
                          <DialogHeader>
                            <DialogTitle className="font-bold flex items-center gap-2 text-emerald-900">
                              <CheckCircle className="h-5 w-5 text-emerald-600" />
                              Complete Resolution Details
                            </DialogTitle>
                            <DialogDescription>Provide details about the diagnostic fix and total material/labor cost to close out the task.</DialogDescription>
                          </DialogHeader>
                          <form onSubmit={handleResolveTicket} className="space-y-4 pt-2">
                            <div className="space-y-2">
                              <Label className="text-sm font-semibold">Diagnostic Resolution Remarks *</Label>
                              <textarea 
                                required 
                                value={resolutionSummary} 
                                onChange={e => setResolutionSummary(e.target.value)} 
                                rows={3}
                                className="w-full text-sm rounded-md border border-input bg-transparent px-3 py-2 shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                placeholder="Explain what was fixed, parts replaced, or general remarks..."
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-semibold">Total Material/Labor Cost (₨) *</Label>
                              <Input 
                                type="number" 
                                required 
                                value={actualCost} 
                                onChange={e => setActualCost(e.target.value)} 
                                placeholder="e.g. 1500" 
                              />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                              <Button type="button" variant="outline" onClick={() => setIsResolveOpen(false)}>Cancel</Button>
                              <Button type="submit" className="bg-emerald-600 text-white hover:bg-emerald-700">Complete & Resolve</Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}

                    {/* 3. Resident Verification & Closing */}
                    {!isStaffOrTech && currentTicket.status === 'resolved' && (
                      <Button 
                        onClick={() => handleCloseTicket(currentTicket.id)}
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Verify Fix & Close Ticket
                      </Button>
                    )}

                    {/* Final state */}
                    {currentTicket.status === 'closed' && (
                      <div className="p-3 text-center rounded bg-gray-100 border text-gray-500 font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2">
                        <CheckCircle className="h-4 w-4 text-gray-400" />
                        Completed & Archived
                      </div>
                    )}
                  </div>

                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed border-2 border-gray-300 shadow-none flex flex-col justify-center items-center py-20 px-6 sticky top-6">
                <Wrench className="h-12 w-12 text-gray-300 animate-pulse mb-3" />
                <p className="text-sm font-bold text-gray-500 text-center">No Active Request Selected</p>
                <p className="text-xs text-gray-400 text-center mt-1">Select any maintenance request from the triage list to view operational workflows, logs, allocated inventory, and status controls.</p>
              </Card>
            )}
          </div>

        </div>

      </div>
    </DashboardLayout>
  )
}