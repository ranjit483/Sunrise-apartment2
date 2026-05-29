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

const FLOORS = Array.from({length: 14}, (_, i) => i + 1)
const UNIT_TYPES = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5 BHK']

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
    type: '1 BHK',
    floor: 1,
    area: 500,
    rent: 10000,
    status: 'vacant' as const
  })

  const [editingUnit, setEditingUnit] = useState<Unit | null>(null)

  useEffect(() => {
    const unsubUnits = onSnapshot(query(collection(db, 'units'), orderBy('unitNumber')), (snapshot: any) => {
      const uData: Unit[] = []
      snapshot.forEach((doc: any) => {
        uData.push(doc.data() as Unit)
      })
      setUnits(uData)
      setLoading(false)
    }, (error: any) => {
      console.error('Error fetching units:', error)
      setLoading(false)
    })

    const unsubBuildings = onSnapshot(query(collection(db, 'buildings'), orderBy('name')), (snapshot: any) => {
      const bData: Building[] = []
      snapshot.forEach((doc: any) => {
        bData.push(doc.data() as Building)
      })
      setBuildings(bData)
    }, (error: any) => {
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
      setNewUnit({ buildingId: '', unitNumber: '', type: '1 BHK', floor: 1, area: 500, rent: 10000, status: 'vacant' })
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
                      <Select value={newUnit.unitNumber} onValueChange={(v: string) => setNewUnit({...newUnit, unitNumber: v})} disabled={!newUnit.buildingId}>
                        <SelectTrigger><SelectValue placeholder="Select unit..." /></SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {newUnit.buildingId && TOWER_UNITS[buildings.find(b => b.id === newUnit.buildingId)?.name || '']?.map(unit => (
                            <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Floor</Label>
                      <Select value={newUnit.floor.toString()} onValueChange={(v: string) => setNewUnit({...newUnit, floor: Number(v)})}>
                        <SelectTrigger><SelectValue placeholder="Select floor..." /></SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                          {FLOORS.map(floor => (
                            <SelectItem key={floor} value={floor.toString()}>{floor}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={newUnit.type} onValueChange={(v: string) => setNewUnit({...newUnit, type: v})}>
                        <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                        <SelectContent>
                          {UNIT_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    <Select value={editingUnit.unitNumber} onValueChange={(v: string) => setEditingUnit({...editingUnit, unitNumber: v})} disabled={!editingUnit.buildingId}>
                      <SelectTrigger><SelectValue placeholder="Select unit..." /></SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {editingUnit.buildingId && TOWER_UNITS[buildings.find(b => b.id === editingUnit.buildingId)?.name || '']?.map(unit => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Floor</Label>
                    <Select value={editingUnit.floor.toString()} onValueChange={(v: string) => setEditingUnit({...editingUnit, floor: Number(v)})}>
                      <SelectTrigger><SelectValue placeholder="Select floor..." /></SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {FLOORS.map(floor => (
                          <SelectItem key={floor} value={floor.toString()}>{floor}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={editingUnit.type} onValueChange={(v: string) => setEditingUnit({...editingUnit, type: v})}>
                      <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                      <SelectContent>
                        {UNIT_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
              <div className="overflow-x-auto overflow-y-hidden"><table className="w-full min-w-[800px]">
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
                    const b = buildings.find((bld: any) => bld.id === u.buildingId)
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
                                isAuthorized('delete_records') && (
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteUnit(u.id)}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                )
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table></div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}