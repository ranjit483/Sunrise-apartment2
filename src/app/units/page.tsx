'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { db } from '@/config/firebase'
import { collection, onSnapshot, query, orderBy, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { Unit, Building } from '@/types/models'
import { Loader2, Trash2, Edit2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRBAC } from '@/hooks/useRBAC'

const statusColors: Record<string, string> = {
  occupied: 'bg-green-100 text-green-800',
  vacant: 'bg-yellow-100 text-yellow-800',
  reserved: 'bg-blue-100 text-blue-800',
  maintenance: 'bg-red-100 text-red-800',
}

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [loading, setLoading] = useState(true)

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { isAuthorized } = useRBAC()

  const [newUnit, setNewUnit] = useState({
    buildingId: '',
    unitNumber: '',
    type: '1BHK',
    floor: 1,
    area: 500,
    rent: 10000,
    status: 'vacant' as const
  })

  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)

  useEffect(() => {
    const unsubUnits = onSnapshot(query(collection(db, 'units'), orderBy('unitNumber')), (snapshot) => {
      const uData: Unit[] = []
      snapshot.forEach((doc) => {
        uData.push(doc.data() as Unit)
      })
      setUnits(uData)
      setLoading(false)
    }, (error) => {
      console.error('Error fetching units:', error)
      setLoading(false)
    })

    const unsubBuildings = onSnapshot(query(collection(db, 'buildings'), orderBy('name')), (snapshot) => {
      const bData: Building[] = []
      snapshot.forEach((doc) => {
        bData.push(doc.data() as Building)
      })
      setBuildings(bData)
    }, (error) => {
      console.error('Error fetching buildings:', error)
    })

    return () => {
      unsubUnits()
      unsubBuildings()
    }
  }, [])

  const handleAddUnit = async () => {
    if (!newUnit.buildingId || !newUnit.unitNumber) {
      alert('Please fill in Building and Unit Number fields.')
      return
    }
    
    setIsSubmitting(true)
    try {
      const newUnitRef = doc(collection(db, 'units'))
      await setDoc(newUnitRef, {
        id: newUnitRef.id,
        buildingId: newUnit.buildingId,
        unitNumber: newUnit.unitNumber,
        type: newUnit.type,
        floor: Number(newUnit.floor),
        area: Number(newUnit.area),
        rent: Number(newUnit.rent),
        status: newUnit.status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      setIsAddModalOpen(false)
      setNewUnit({ buildingId: '', unitNumber: '', type: '1BHK', floor: 1, area: 500, rent: 10000, status: 'vacant' })
    } catch (error: any) {
      console.error('Error adding unit:', error)
      alert('Failed to add unit: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateUnit = async () => {
    if (!editingUnit || !editingUnit.buildingId || !editingUnit.unitNumber) {
      alert('Please fill in Building and Unit Number fields.')
      return
    }
    
    setIsSubmitting(true)
    try {
      await updateDoc(doc(db, 'units', editingUnit.id), {
        buildingId: editingUnit.buildingId,
        unitNumber: editingUnit.unitNumber,
        type: editingUnit.type,
        floor: Number(editingUnit.floor),
        area: Number(editingUnit.area),
        rent: Number(editingUnit.rent),
        status: editingUnit.status,
        updatedAt: new Date().toISOString()
      })
      setIsEditModalOpen(false)
      setEditingUnit(null)
    } catch (error: any) {
      console.error('Error updating unit:', error)
      alert('Failed to update unit: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteUnit = async (id: string) => {
    if (!confirm('Are you sure you want to delete this unit?')) return
    setDeleting(id)
    try {
      await deleteDoc(doc(db, 'units', id))
    } catch (error: any) {
      console.error('Error deleting unit:', error)
      alert('Failed to delete unit: ' + error.message)
    } finally {
      setDeleting(null)
    }
  }

  const openEditModal = (unit: Unit) => {
    setEditingUnit(unit)
    setIsEditModalOpen(true)
  }

  return (
    <DashboardLayout title="Units Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Units</h2>
            <p className="text-muted-foreground">Manage apartment units</p>
          </div>
          {isAuthorized('manage_apartments') && (
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button>Add Unit</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Unit</DialogTitle>
                  <DialogDescription>Create a new apartment unit and assign it to a building.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Building</Label>
                    <Select value={newUnit.buildingId} onValueChange={(v: string) => setNewUnit({...newUnit, buildingId: v})}>
                      <SelectTrigger><SelectValue placeholder="Select building..." /></SelectTrigger>
                      <SelectContent>
                        {buildings.map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Unit Number</Label>
                      <Input placeholder="e.g. 101" value={newUnit.unitNumber} onChange={e => setNewUnit({...newUnit, unitNumber: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Floor</Label>
                      <Input type="number" min="1" value={newUnit.floor} onChange={e => setNewUnit({...newUnit, floor: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Input placeholder="e.g. 2BHK" value={newUnit.type} onChange={e => setNewUnit({...newUnit, type: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Area (sq ft)</Label>
                      <Input type="number" min="1" value={newUnit.area} onChange={e => setNewUnit({...newUnit, area: Number(e.target.value)})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Rent (₨)</Label>
                      <Input type="number" min="0" value={newUnit.rent} onChange={e => setNewUnit({...newUnit, rent: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={newUnit.status} onValueChange={(v: any) => setNewUnit({...newUnit, status: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vacant">Vacant</SelectItem>
                          <SelectItem value="occupied">Occupied</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="reserved">Reserved</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleAddUnit} disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Unit
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Edit Unit Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Unit</DialogTitle>
              <DialogDescription>Modify the details of this apartment unit.</DialogDescription>
            </DialogHeader>
            {editingUnit && (
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Building</Label>
                  <Select value={editingUnit.buildingId} onValueChange={(v: string) => setEditingUnit({...editingUnit, buildingId: v})}>
                    <SelectTrigger><SelectValue placeholder="Select building..." /></SelectTrigger>
                    <SelectContent>
                      {buildings.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Unit Number</Label>
                    <Input placeholder="e.g. 101" value={editingUnit.unitNumber} onChange={e => setEditingUnit({...editingUnit, unitNumber: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Floor</Label>
                    <Input type="number" min="1" value={editingUnit.floor} onChange={e => setEditingUnit({...editingUnit, floor: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Input placeholder="e.g. 2BHK" value={editingUnit.type} onChange={e => setEditingUnit({...editingUnit, type: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Area (sq ft)</Label>
                    <Input type="number" min="1" value={editingUnit.area} onChange={e => setEditingUnit({...editingUnit, area: Number(e.target.value)})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Rent (₨)</Label>
                    <Input type="number" min="0" value={editingUnit.rent} onChange={e => setEditingUnit({...editingUnit, rent: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={editingUnit.status} onValueChange={(v: any) => setEditingUnit({...editingUnit, status: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vacant">Vacant</SelectItem>
                        <SelectItem value="occupied">Occupied</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="reserved">Reserved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
                  <Button onClick={handleUpdateUnit} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader><CardTitle>All Units</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : units.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No units found. Click "Add Unit" to create one.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 text-left">Unit</th>
                    <th className="pb-3 text-left">Building</th>
                    <th className="pb-3 text-left">Type</th>
                    <th className="pb-3 text-left">Area</th>
                    <th className="pb-3 text-left">Rent</th>
                    <th className="pb-3 text-left">Status</th>
                    {isAuthorized('manage_apartments') && <th className="pb-3 text-left">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {units.map((u) => {
                    const b = buildings.find(bld => bld.id === u.buildingId)
                    return (
                      <tr key={u.id} className="border-b">
                        <td className="py-3 font-medium">{u.unitNumber}</td>
                        <td className="py-3">{b ? b.name : u.buildingId.substring(0,8) + '...'}</td>
                        <td className="py-3">{u.type}</td>
                        <td className="py-3">{u.area} sq ft</td>
                        <td className="py-3">₨{u.rent.toLocaleString()}</td>
                        <td className="py-3"><Badge variant="outline" className={statusColors[u.status] || ''}>{u.status}</Badge></td>
                        {isAuthorized('manage_apartments') && (
                          <td className="py-3">
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => openEditModal(u)}>
                                <Edit2 className="h-4 w-4 text-blue-500" />
                              </Button>
                              {deleting === u.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              ) : (
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteUnit(u.id)}>
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}