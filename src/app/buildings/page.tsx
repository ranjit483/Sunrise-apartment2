'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { db } from '@/config/firebase'
import { collection, onSnapshot, query, orderBy, doc, setDoc, deleteDoc } from 'firebase/firestore'
import { Building } from '@/types/models'
import { Loader2, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRBAC } from '@/hooks/useRBAC'

export default function BuildingsPage() {
  const [buildings, setBuildings] = useState<Building[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { isAuthorized } = useRBAC()
  
  const [newBuilding, setNewBuilding] = useState({
    name: '',
    address: '',
    totalFloors: 1,
    totalUnits: 1,
    status: 'active' as const
  })

  useEffect(() => {
    const unsubBuildings = onSnapshot(query(collection(db, 'buildings'), orderBy('name')), (snapshot: any) => {
      const bData: Building[] = []
      snapshot.forEach((doc: any) => {
        bData.push(doc.data() as Building)
      })
      setBuildings(bData)
      setLoading(false)
    }, (error: any) => {
      console.error('Error fetching buildings:', error)
      setLoading(false)
    })

    const unsubUnits = onSnapshot(collection(db, 'units'), (snapshot: any) => {
      const uData: any[] = []
      snapshot.forEach((doc: any) => {
        uData.push(doc.data())
      })
      setUnits(uData)
    }, (error: any) => {
      console.error('Error fetching units:', error)
    })

    return () => {
      unsubBuildings()
      unsubUnits()
    }
  }, [])

  const handleAddBuilding = async () => {
    if (!newBuilding.name || !newBuilding.address) {
      alert('Please fill in all required fields.')
      return
    }
    
    setIsSubmitting(true)
    try {
      const newBuildingRef = doc(collection(db, 'buildings'))
      await setDoc(newBuildingRef, {
        id: newBuildingRef.id,
        name: newBuilding.name,
        address: newBuilding.address,
        totalFloors: Number(newBuilding.totalFloors),
        totalUnits: Number(newBuilding.totalUnits),
        status: newBuilding.status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      setIsAddModalOpen(false)
      setNewBuilding({ name: '', address: '', totalFloors: 1, totalUnits: 1, status: 'active' })
    } catch (error: any) {
      console.error('Error adding building:', error)
      alert('Failed to add building: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteBuilding = async (id: string) => {
    if (!confirm('Are you sure you want to delete this building? This cannot be undone.')) return
    setDeleting(id)
    try {
      await deleteDoc(doc(db, 'buildings', id))
    } catch (error: any) {
      console.error('Error deleting building:', error)
      alert('Failed to delete building: ' + error.message)
    } finally {
      setDeleting(null)
    }
  }

  const totalBuildings = buildings.length
  const totalUnits = buildings.reduce((acc, b) => acc + (b.totalUnits || 0), 0)
  
  const occupiedUnits = units.filter(u => u.status === 'occupied').length
  const vacantUnits = units.filter(u => u.status === 'vacant').length

  return (
    <DashboardLayout title="Buildings Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Buildings</h2>
            <p className="text-muted-foreground">Manage apartment buildings and floors</p>
          </div>
          {isAuthorized('manage_apartments') && (
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button>Add Building</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Building</DialogTitle>
                  <DialogDescription>Create a new building to start adding units to it.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Building Name</Label>
                    <Input placeholder="e.g. Tower A" value={newBuilding.name} onChange={e => setNewBuilding({...newBuilding, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input placeholder="123 Main St" value={newBuilding.address} onChange={e => setNewBuilding({...newBuilding, address: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Total Floors</Label>
                      <Input type="number" min="1" value={newBuilding.totalFloors} onChange={e => setNewBuilding({...newBuilding, totalFloors: Number(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Total Units</Label>
                      <Input type="number" min="1" value={newBuilding.totalUnits} onChange={e => setNewBuilding({...newBuilding, totalUnits: Number(e.target.value)})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={newBuilding.status} onValueChange={(v: any) => setNewBuilding({...newBuilding, status: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleAddBuilding} disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create Building
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Total Buildings</p><p className="text-2xl font-bold">{totalBuildings}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Total Units</p><p className="text-2xl font-bold">{totalUnits}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Occupied</p><p className="text-2xl font-bold">{occupiedUnits}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Vacant</p><p className="text-2xl font-bold">{vacantUnits}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>All Buildings</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : buildings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No buildings found. Click "Add Building" to create one.</div>
            ) : (
              <div className="overflow-x-auto overflow-y-hidden"><table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 text-left">Building</th>
                    <th className="pb-3 text-left">Address</th>
                    <th className="pb-3 text-left">Floors</th>
                    <th className="pb-3 text-left">Units</th>
                    <th className="pb-3 text-left">Status</th>
                    {isAuthorized('manage_apartments') && <th className="pb-3 text-left">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {buildings.map((b) => (
                    <tr key={b.id} className="border-b">
                      <td className="py-3 font-medium">{b.name}</td>
                      <td className="py-3 text-muted-foreground">{b.address}</td>
                      <td className="py-3">{b.totalFloors}</td>
                      <td className="py-3">{b.totalUnits}</td>
                      <td className="py-3">
                        <Badge variant={b.status === 'active' ? 'default' : 'secondary'} className={b.status === 'active' ? 'bg-green-100 text-green-800' : ''}>
                          {b.status}
                        </Badge>
                      </td>
                      {isAuthorized('manage_apartments') && (
                        <td className="py-3">
                          {deleting === b.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteBuilding(b.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}