'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { db } from '@/config/firebase'
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch, getDocs, getDoc } from 'firebase/firestore'
import { ElectricityReading, Invoice, Unit, SystemSettings } from '@/types/models'
import { Loader2, CheckCircle2, XCircle, Clock, Zap, Edit2, Search } from 'lucide-react'

export default function AdminElectricityView() {
  const [readings, setReadings] = useState<ElectricityReading[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const [units, setUnits] = useState<Unit[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [selectedUnit, setSelectedUnit] = useState<string>('')
  const [meterType, setMeterType] = useState<'city' | 'generator'>('city')
  const [cityPricePerUnit, setCityPricePerUnit] = useState(15)
  const [generatorPricePerUnit, setGeneratorPricePerUnit] = useState(25)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentReadingInput, setCurrentReadingInput] = useState('')
  const [readingMonth, setReadingMonth] = useState('')

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingReading, setEditingReading] = useState<ElectricityReading | null>(null)
  const [editPrev, setEditPrev] = useState('')
  const [editCurr, setEditCurr] = useState('')
  const [editMonth, setEditMonth] = useState('')

  const handleEditClick = (reading: ElectricityReading) => {
    setEditingReading(reading)
    setEditPrev(reading.previousReading.toString())
    setEditCurr(reading.currentReading.toString())
    setEditMonth(reading.month || '')
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingReading) return
    const prev = parseFloat(editPrev)
    const curr = parseFloat(editCurr)
    if (isNaN(prev) || isNaN(curr)) {
      alert("Please enter valid numbers.")
      return
    }
    if (curr < prev) {
      alert("Current reading cannot be less than previous.")
      return
    }
    if (!editMonth.trim()) {
      alert("Please enter a reading month.")
      return
    }
    
    try {
      const consumed = curr - prev
      const total = consumed * editingReading.pricePerUnit
      await updateDoc(doc(db, 'electricity_readings', editingReading.id), {
        previousReading: prev,
        currentReading: curr,
        totalConsumed: consumed,
        totalBill: total,
        month: editMonth.trim()
      })
      setIsEditModalOpen(false)
      setEditingReading(null)
    } catch (e) {
      console.error(e)
      alert("Failed to update reading")
    }
  }

  useEffect(() => {
    const fetchUnitsAndSettings = async () => {
      try {
        const uSnap = await getDocs(collection(db, 'units'))
        const uData: Unit[] = []
        uSnap.forEach((doc: any) => uData.push({ id: doc.id, ...doc.data() } as Unit))
        
        // Sort units alphanumerically (e.g. A-1, A-2, A-10)
        uData.sort((a, b) => a.unitNumber.localeCompare(b.unitNumber, undefined, { numeric: true, sensitivity: 'base' }))
        
        setUnits(uData)

        const userSnap = await getDocs(collection(db, 'users'))
        const userData: any[] = []
        userSnap.forEach((doc: any) => userData.push({ id: doc.id, ...doc.data() }))
        setUsers(userData)

        const sSnap = await getDoc(doc(db, 'settings', 'general'))
        if (sSnap.exists()) {
          const s = sSnap.data() as SystemSettings
          if (s.electricityPricePerUnit) setCityPricePerUnit(s.electricityPricePerUnit)
          if (s.generatorPricePerUnit) setGeneratorPricePerUnit(s.generatorPricePerUnit)
        }
      } catch (e) {
        console.error(e)
      }
    }
    fetchUnitsAndSettings()

    const q = query(
      collection(db, 'electricity_readings'),
      orderBy('readingDate', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const data: ElectricityReading[] = []
      snapshot.forEach((doc: any) => {
        data.push({ id: doc.id, ...doc.data() } as ElectricityReading)
      })
      setReadings(data)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Calculate previous reading dynamically based on selected unit AND meter type
  const previousReading = selectedUnit 
    ? readings.find(r => r.unitId === selectedUnit && r.status !== 'rejected' && (r.meterType || 'city') === meterType)?.currentReading || 0
    : 0
    
  const currentPricePerUnit = meterType === 'city' ? cityPricePerUnit : generatorPricePerUnit;

  const handleRecordReading = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUnit) {
      alert("Please select a unit")
      return
    }

    const currentVal = parseFloat(currentReadingInput)
    if (isNaN(currentVal)) {
      alert("Please enter a valid number")
      return
    }

    if (currentVal < previousReading) {
      alert(`Current reading (${currentVal}) cannot be less than previous reading (${previousReading}).`)
      return
    }

    if (!readingMonth.trim()) {
      alert("Please enter the Reading Month (e.g. Asadh 2083)")
      return
    }

    const unitObj = units.find(u => u.id === selectedUnit)
    if (!unitObj) return

    setIsSubmitting(true)
    try {
      const consumed = currentVal - previousReading
      const total = consumed * currentPricePerUnit
      

      const reading: ElectricityReading = {
        id: doc(collection(db, 'electricity_readings')).id,
        unitId: unitObj.id,
        tenantId: unitObj.tenantId || '',
        meterType,
        previousReading,
        currentReading: currentVal,
        totalConsumed: consumed,
        pricePerUnit: currentPricePerUnit,
        totalBill: total,
        readingDate: new Date().toISOString(),
        status: 'approved',
        photoUrl: '',
        month: readingMonth.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      await writeBatch(db).set(doc(db, 'electricity_readings', reading.id), reading).commit()

      alert("Reading recorded successfully.")
      setCurrentReadingInput('')
      setSelectedUnit('')
      setReadingMonth('')
    } catch (error: any) {
      console.error(error)
      alert("Error recording reading: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApprove = async (reading: ElectricityReading) => {
    if (!confirm("Are you sure you want to approve this reading?")) return
    try {
      const batch = writeBatch(db)

      // 1. Update reading status
      const readingRef = doc(db, 'electricity_readings', reading.id)
      batch.update(readingRef, {
        status: 'approved',
        updatedAt: new Date().toISOString()
      })

      // 2. Create an invoice for this electricity bill
      const invoiceRef = doc(collection(db, 'invoices'))
      const invoice: Invoice = {
        id: invoiceRef.id,
        unitId: reading.unitId,
        tenantId: reading.tenantId,
        month: reading.month || new Date().toISOString().substring(0, 7),
        amount: 0,
        electricityReading: reading.currentReading,
        electricityAmount: reading.totalBill,
        utilityAmount: 0,
        waterAmount: 0,
        otherAmount: 0,
        paidAmount: 0,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // due in 7 days
        status: 'pending', // post it immediately so they can pay it
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      batch.set(invoiceRef, invoice)

      await batch.commit()
      alert("Reading approved and electricity invoice generated successfully.")
    } catch (error: any) {
      console.error(error)
      alert("Error approving reading: " + error.message)
    }
  }

  const handleReject = async (reading: ElectricityReading) => {
    if (!confirm("Are you sure you want to reject this reading?")) return
    try {
      const readingRef = doc(db, 'electricity_readings', reading.id)
      await updateDoc(readingRef, {
        status: 'rejected',
        updatedAt: new Date().toISOString()
      })
    } catch (error: any) {
      console.error(error)
      alert("Error rejecting reading: " + error.message)
    }
  }

  const filteredReadings = readings.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false
    
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim()
      const rUnit = units.find(u => u.id === r.unitId);
      const rUser = users.find(u => 
        (r.tenantId && (u.uid === r.tenantId || u.id === r.tenantId)) || 
        (rUnit && u.unitNumber === rUnit.unitNumber)
      );
      const tenantName = rUser?.fullName || rUnit?.tenantName || 'Unknown Tenant';
      const unitNumber = rUnit?.unitNumber || '';
      
      if (!tenantName.toLowerCase().includes(q) && !unitNumber.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  })

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <>
    <div className="space-y-6">
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-xl">Record Meter Reading</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Enter the current electricity meter reading for a unit</CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
          <form onSubmit={handleRecordReading} className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm">Select Unit</Label>
                <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                  <SelectTrigger className="h-8 text-xs sm:h-10 sm:text-sm">
                    <SelectValue placeholder="Select a unit" />
                  </SelectTrigger>
                  <SelectContent className="text-xs sm:text-sm">
                    {units.map(u => (
                      <SelectItem key={u.id} value={u.id} className="text-xs sm:text-sm">
                        {u.unitNumber} {u.tenantName ? `(${u.tenantName})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm">Meter Type</Label>
                <Select value={meterType} onValueChange={(v: 'city' | 'generator') => setMeterType(v)}>
                  <SelectTrigger className="h-8 text-xs sm:h-10 sm:text-sm">
                    <SelectValue placeholder="Select meter type" />
                  </SelectTrigger>
                  <SelectContent className="text-xs sm:text-sm">
                    <SelectItem value="city" className="text-xs sm:text-sm">City Electricity</SelectItem>
                    <SelectItem value="generator" className="text-xs sm:text-sm">Generator (DG)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm">Previous Reading</Label>
                <Input value={selectedUnit ? previousReading : '-'} disabled className="bg-muted h-8 text-xs sm:h-10 sm:text-sm" />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm">Current Reading *</Label>
                <Input 
                  type="number" 
                  required 
                  value={currentReadingInput}
                  onChange={(e) => setCurrentReadingInput(e.target.value)}
                  placeholder="e.g. 1540"
                  disabled={!selectedUnit}
                  className="h-8 text-xs sm:h-10 sm:text-sm"
                />
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm">Reading Month *</Label>
                <Input 
                  required 
                  value={readingMonth}
                  onChange={(e) => setReadingMonth(e.target.value)}
                  placeholder="e.g. Asadh 2083"
                  disabled={!selectedUnit}
                  className="h-8 text-xs sm:h-10 sm:text-sm"
                />
              </div>
            </div>

            {selectedUnit && currentReadingInput && !isNaN(parseFloat(currentReadingInput)) && (
              <div className="bg-blue-50 p-2.5 sm:p-3 rounded-lg border border-blue-100 flex flex-col sm:flex-row gap-2 sm:gap-6 text-xs sm:text-sm">
                <p className="text-blue-800">
                  <span>Consumption: </span>
                  <strong>{Math.max(0, parseFloat(currentReadingInput) - previousReading)} Units</strong>
                </p>
                <p className="text-blue-800">
                  <span>Est. Bill (at Rs. {currentPricePerUnit}/unit): </span>
                  <strong>Rs. {(Math.max(0, parseFloat(currentReadingInput) - previousReading) * currentPricePerUnit).toLocaleString()}</strong>
                </p>
              </div>
            )}

            <Button type="submit" className="w-full md:w-auto h-8 text-xs sm:h-10 sm:text-sm" disabled={isSubmitting || !selectedUnit}>
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin mr-2" /> : <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2" />}
              Submit Reading & Auto-Approve
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 sm:p-6 pb-2">
          <div>
            <CardTitle className="text-base sm:text-xl">Meter Readings Management</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Review and approve resident submissions</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-2.5 top-2 sm:top-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              <Input
                placeholder="Search tenant or unit..."
                className="pl-8 sm:pl-9 w-full sm:w-[220px] h-8 text-xs sm:h-10 sm:text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-[180px]">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="h-8 text-xs sm:h-10 sm:text-sm">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="text-xs sm:text-sm">
                  <SelectItem value="all" className="text-xs sm:text-sm">All Statuses</SelectItem>
                  <SelectItem value="pending_verification" className="text-xs sm:text-sm">Pending Verification</SelectItem>
                  <SelectItem value="approved" className="text-xs sm:text-sm">Approved</SelectItem>
                  <SelectItem value="rejected" className="text-xs sm:text-sm">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
          <div className="rounded-md border overflow-x-auto">
            <Table className="w-full text-xs sm:text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] sm:text-xs h-8 sm:h-10 px-2 sm:px-4">Date</TableHead>
                  <TableHead className="text-[10px] sm:text-xs h-8 sm:h-10 px-2 sm:px-4">Reading Month</TableHead>
                  <TableHead className="text-[10px] sm:text-xs h-8 sm:h-10 px-2 sm:px-4">Resident/Tenant ID</TableHead>
                  <TableHead className="text-[10px] sm:text-xs h-8 sm:h-10 px-2 sm:px-4">Meter Type</TableHead>
                  <TableHead className="text-[10px] sm:text-xs h-8 sm:h-10 px-2 sm:px-4">Readings (Prev → Curr)</TableHead>
                  <TableHead className="text-[10px] sm:text-xs h-8 sm:h-10 px-2 sm:px-4">Consumed</TableHead>
                  <TableHead className="text-[10px] sm:text-xs h-8 sm:h-10 px-2 sm:px-4">Total Bill</TableHead>
                  <TableHead className="text-[10px] sm:text-xs h-8 sm:h-10 px-2 sm:px-4">Status</TableHead>
                  <TableHead className="text-[10px] sm:text-xs h-8 sm:h-10 px-2 sm:px-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReadings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-xs sm:text-sm">
                      No readings found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReadings.map((reading) => {
                    const rUnit = units.find(u => u.id === reading.unitId);
                    const rUser = users.find(u => 
                      (reading.tenantId && (u.uid === reading.tenantId || u.id === reading.tenantId)) || 
                      (rUnit && u.unitNumber === rUnit.unitNumber)
                    );
                    const tenantName = rUser?.fullName || rUnit?.tenantName || 'Unknown Tenant';
                    return (
                    <TableRow key={reading.id}>
                      <TableCell className="py-2 px-2 sm:py-4 sm:px-4 text-xs sm:text-sm">{new Date(reading.readingDate).toLocaleDateString()}</TableCell>
                      <TableCell className="py-2 px-2 sm:py-4 sm:px-4 text-xs sm:text-sm">{reading.month || 'N/A'}</TableCell>
                      <TableCell className="py-2 px-2 sm:py-4 sm:px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 text-xs sm:text-sm">{tenantName}</span>
                          <span className="text-[10px] sm:text-xs text-muted-foreground">{rUnit ? rUnit.unitNumber : 'Unknown Unit'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-2 sm:py-4 sm:px-4">
                        <div className={`inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded text-[10px] sm:text-xs font-semibold ${
                          (!reading.meterType || reading.meterType === 'city') ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {(!reading.meterType || reading.meterType === 'city') ? 'City' : 'DG'}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-2 sm:py-4 sm:px-4 text-xs sm:text-sm">
                        {reading.previousReading} → <strong>{reading.currentReading}</strong>
                      </TableCell>
                      <TableCell className="py-2 px-2 sm:py-4 sm:px-4 text-xs sm:text-sm">{reading.totalConsumed} Units</TableCell>
                      <TableCell className="py-2 px-2 sm:py-4 sm:px-4 text-xs sm:text-sm font-bold">Rs. {reading.totalBill.toLocaleString()}</TableCell>
                      <TableCell className="py-2 px-2 sm:py-4 sm:px-4">
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium uppercase ${
                          reading.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          reading.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {reading.status === 'approved' && <CheckCircle2 className="h-3 w-3" />}
                          {reading.status === 'rejected' && <XCircle className="h-3 w-3" />}
                          {reading.status === 'pending_verification' && <Clock className="h-3 w-3" />}
                          {reading.status.replace('_', ' ')}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 px-2 sm:py-4 sm:px-4 text-right space-x-1 sm:space-x-2 whitespace-nowrap">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="mr-1 sm:mr-2 h-7 text-[10px] px-2 sm:h-8 sm:text-xs sm:px-3"
                          onClick={() => handleEditClick(reading)}
                        >
                          <Edit2 className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        {reading.status === 'pending_verification' && (
                          <>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 text-[10px] px-2 sm:h-8 sm:text-xs sm:px-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700"
                              onClick={() => handleApprove(reading)}
                            >
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 text-[10px] px-2 sm:h-8 sm:text-xs sm:px-3 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
                              onClick={() => handleReject(reading)}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {reading.photoUrl && (
                          <Button size="sm" variant="ghost" className="h-7 text-[10px] px-2 sm:h-8 sm:text-xs sm:px-3" asChild>
                            <a href={reading.photoUrl} target="_blank" rel="noreferrer">View Photo</a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Meter Reading</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reading Month</Label>
              <Input 
                type="text" 
                value={editMonth} 
                onChange={e => setEditMonth(e.target.value)} 
                placeholder="e.g. Asadh 2083"
              />
            </div>
            <div className="space-y-2">
              <Label>Previous Reading</Label>
              <Input 
                type="number" 
                value={editPrev} 
                onChange={e => setEditPrev(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>Current Reading</Label>
              <Input 
                type="number" 
                value={editCurr} 
                onChange={e => setEditCurr(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
