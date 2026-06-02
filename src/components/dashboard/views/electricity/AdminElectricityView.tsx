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
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch, getDocs, getDoc, setDoc, where } from 'firebase/firestore'
import { ElectricityReading, Invoice, Unit, SystemSettings } from '@/types/models'
import { Loader2, CheckCircle2, XCircle, Clock, Zap, Edit2 } from 'lucide-react'

export default function AdminElectricityView() {
  const [readings, setReadings] = useState<ElectricityReading[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const [units, setUnits] = useState<Unit[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [selectedUnit, setSelectedUnit] = useState<string>('')
  const [pricePerUnit, setPricePerUnit] = useState(15)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentReadingInput, setCurrentReadingInput] = useState('')

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingReading, setEditingReading] = useState<ElectricityReading | null>(null)
  const [editPrev, setEditPrev] = useState('')
  const [editCurr, setEditCurr] = useState('')

  const handleEditClick = (reading: ElectricityReading) => {
    setEditingReading(reading)
    setEditPrev(reading.previousReading.toString())
    setEditCurr(reading.currentReading.toString())
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
    
    try {
      const consumed = curr - prev
      const total = consumed * editingReading.pricePerUnit
      await updateDoc(doc(db, 'electricity_readings', editingReading.id), {
        previousReading: prev,
        currentReading: curr,
        totalConsumed: consumed,
        totalBill: total
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
          if (s.electricityPricePerUnit) setPricePerUnit(s.electricityPricePerUnit)
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

  // Calculate previous reading dynamically based on selected unit
  const previousReading = selectedUnit 
    ? readings.find(r => r.unitId === selectedUnit && r.status !== 'rejected')?.currentReading || 0
    : 0

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

    const unitObj = units.find(u => u.id === selectedUnit)
    if (!unitObj) return

    setIsSubmitting(true)
    try {
      const consumed = currentVal - previousReading
      const total = consumed * pricePerUnit
      const monthStr = new Date().toISOString().substring(0, 7)

      const batch = writeBatch(db)

      const newRef = doc(collection(db, 'electricity_readings'))
      const reading: ElectricityReading = {
        id: newRef.id,
        unitId: unitObj.id,
        tenantId: unitObj.tenantId || '',
        previousReading,
        currentReading: currentVal,
        totalConsumed: consumed,
        pricePerUnit,
        totalBill: total,
        readingDate: new Date().toISOString(),
        status: 'approved', // Auto approve since admin is doing it
        photoUrl: '',
        month: monthStr,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      batch.set(newRef, reading)

      // Auto generate invoice
      const invoiceRef = doc(collection(db, 'invoices'))
      const invoice: Invoice = {
        id: invoiceRef.id,
        unitId: unitObj.id,
        tenantId: unitObj.tenantId || '',
        month: monthStr,
        amount: 0,
        electricityReading: currentVal,
        electricityAmount: total,
        utilityAmount: 0,
        waterAmount: 0,
        otherAmount: 0,
        paidAmount: 0,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      batch.set(invoiceRef, invoice)

      await batch.commit()
      alert("Reading recorded and invoice generated successfully.")
      setCurrentReadingInput('')
      setSelectedUnit('')
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

  const filteredReadings = readings.filter(r => filter === 'all' || r.status === filter)

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <>
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Record Meter Reading</CardTitle>
          <CardDescription>Enter the current electricity meter reading for a unit</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRecordReading} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Select Unit</Label>
                <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.unitNumber} {u.tenantName ? `(${u.tenantName})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Previous Reading</Label>
                <Input value={selectedUnit ? previousReading : '-'} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Current Reading *</Label>
                <Input 
                  type="number" 
                  required 
                  value={currentReadingInput}
                  onChange={(e) => setCurrentReadingInput(e.target.value)}
                  placeholder="e.g. 1540"
                  disabled={!selectedUnit}
                />
              </div>
            </div>

            {selectedUnit && currentReadingInput && !isNaN(parseFloat(currentReadingInput)) && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex gap-6">
                <p className="text-sm text-blue-800">
                  <span>Consumption: </span>
                  <strong>{Math.max(0, parseFloat(currentReadingInput) - previousReading)} Units</strong>
                </p>
                <p className="text-sm text-blue-800">
                  <span>Est. Bill (at Rs. {pricePerUnit}/unit): </span>
                  <strong>Rs. {(Math.max(0, parseFloat(currentReadingInput) - previousReading) * pricePerUnit).toLocaleString()}</strong>
                </p>
              </div>
            )}

            <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting || !selectedUnit}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
              Submit Reading & Auto-Approve
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Meter Readings Management</CardTitle>
            <CardDescription>Review and approve resident submissions</CardDescription>
          </div>
          <div className="w-[180px]">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending_verification">Pending Verification</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Resident/Tenant ID</TableHead>
                  <TableHead>Readings (Prev → Curr)</TableHead>
                  <TableHead>Consumed</TableHead>
                  <TableHead>Total Bill</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReadings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
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
                      <TableCell>{new Date(reading.readingDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{tenantName}</span>
                          <span className="text-xs text-muted-foreground">{rUnit ? rUnit.unitNumber : 'Unknown Unit'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {reading.previousReading} → <strong>{reading.currentReading}</strong>
                      </TableCell>
                      <TableCell>{reading.totalConsumed} Units</TableCell>
                      <TableCell className="font-bold">Rs. {reading.totalBill.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium uppercase ${
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
                      <TableCell className="text-right space-x-2 whitespace-nowrap">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="mr-2"
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
                              className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700"
                              onClick={() => handleApprove(reading)}
                            >
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700"
                              onClick={() => handleReject(reading)}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {reading.photoUrl && (
                          <Button size="sm" variant="ghost" asChild>
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
