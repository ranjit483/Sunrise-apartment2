'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import { Loader2, Trash2, Edit2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { useRBAC } from '@/hooks/useRBAC'

interface UserData {
  id: string
  uid: string
  email: string
  fullName: string
  phone: string
  role: string
  status: string
  unitNumber?: string
  buildingId?: string
  clearance_level?: number
  createdAt?: string
}

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800',
  ADMIN: 'bg-indigo-100 text-indigo-800',
  MANAGER: 'bg-blue-100 text-blue-800',
  OWNER: 'bg-amber-100 text-amber-800',
  TENANT: 'bg-emerald-100 text-emerald-800',
  OFFICE_STAFF: 'bg-cyan-100 text-cyan-800',
  GUARD: 'bg-red-100 text-red-800',
  ACCOUNTANT: 'bg-teal-100 text-teal-800',
  RESIDENT: 'bg-amber-100 text-amber-800',
}

const roleLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  OWNER: 'Owner',
  TENANT: 'Tenant',
  OFFICE_STAFF: 'Office Staff',
  PLUMBER: 'Plumber',
  GUARD: 'Guard',
  ACCOUNTANT: 'Accountant',
  RESIDENT: 'Resident',
}

const TOWER_UNITS: Record<string, string[]> = {
  'Tower A': [
    'A-0', 'A-1', 'A-2', 'A-3', 'A-4', 'A-5', 'A-6', 'A-7', 'A-8', 'A-9', 'A-10',
    'B-0', 'B-1', 'B-2', 'B-3', 'B-4', 'B-5', 'B-6', 'B-7', 'B-8', 'B-9', 'B-10',
    'C-1', 'C-2', 'C-3', 'C-4', 'C-5', 'C-6', 'C-7', 'C-8', 'C-9', 'C-10',
    'D-1', 'D-2', 'D-3', 'D-4', 'D-5', 'D-6', 'D-7', 'D-8', 'D-9', 'D-10', 'D-11', 'D-12',
    'E-1', 'E-2', 'E-3', 'E-4', 'E-5', 'E-6', 'E-7', 'E-8', 'E-9', 'E-10', 'E-11', 'E-12'
  ],
  'Tower B I': [
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

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [saving, setSaving] = useState(false)
  
  const { isAuthorized, canManageUser, role: currentUserRole } = useRBAC()

  const handleUpdateUser = async () => {
    if (!editingUser) return
    if (!canManageUser(editingUser.role as any)) {
      alert('You do not have the required clearance to modify this user.')
      return
    }

    // Phone number validation: must start with 9 and be exactly 10 digits
    if (!/^9\d{9}$/.test(editingUser.phone)) {
      alert('Phone number must be exactly 10 digits and start with 9.')
      return
    }

    if (editingUser.buildingId && editingUser.unitNumber) {
      const isOccupied = users.some(u => 
        u.uid !== editingUser.uid && 
        u.buildingId === editingUser.buildingId && 
        u.unitNumber === editingUser.unitNumber
      )
      
      if (isOccupied) {
        alert('This unit is already assigned to another user.')
        return
      }
    }

    setSaving(true)
    try {
      const userRef = doc(db, 'users', editingUser.uid)
      await updateDoc(userRef, {
        fullName: editingUser.fullName,
        phone: editingUser.phone,
        buildingId: editingUser.buildingId,
        unitNumber: editingUser.unitNumber,
        role: editingUser.role,
        status: editingUser.status,
        updatedAt: new Date().toISOString()
      })
      
      setUsers(users.map(u => u.uid === editingUser.uid ? editingUser : u))
      setEditingUser(null)
    } catch (error: any) {
      console.error('Error updating user:', error)
      alert('Failed to update user: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (userUid: string, userRole: any) => {
    if (!canManageUser(userRole)) {
      alert('You do not have the required clearance to modify this user.')
      return
    }
    
    if (!confirm('Are you sure you want to delete this user? This will only remove from Firestore, not from Firebase Auth.')) {
      return
    }
    setDeleting(userUid)
    try {
      await deleteDoc(doc(db, 'users', userUid))
      setUsers(users.filter(u => u.uid !== userUid))
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user')
    } finally {
      setDeleting(null)
    }
  }

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const q = query(collection(db, 'users'))
        const querySnapshot = await getDocs(q)
        const fetchedUsers: UserData[] = []
        querySnapshot.forEach((doc: any) => {
          const data = doc.data()
          fetchedUsers.push({
            id: doc.id,
            uid: data.uid || doc.id,
            email: data.email || '',
            fullName: data.fullName || '',
            phone: data.phone || '',
            role: data.role || 'TENANT',
            status: data.status || 'pending_approval',
            buildingId: data.buildingId || '',
            unitNumber: data.unitNumber || '',
            createdAt: data.createdAt || ''
          })
        })
        
        // Sort in memory instead of relying on Firestore index
        fetchedUsers.sort((a, b) => {
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        setUsers(fetchedUsers)
      } catch (error: any) {
        console.error('Error fetching users:', error)
        alert('Failed to fetch users: ' + error.message)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const filteredUsers = users.filter(u => {
    if (currentUserRole === 'SUPER_ADMIN') return true;
    // Hide SUPER_ADMIN users from anyone who is not a SUPER_ADMIN
    if (u.role === 'SUPER_ADMIN') return false;
    return true;
  });

  const activeUsers = filteredUsers.filter(u => u.status === 'approved')
  const residents = filteredUsers.filter(u => u.role === 'OWNER' || u.role === 'RESIDENT')
  const tenants = filteredUsers.filter(u => u.role === 'TENANT')
  const staff = filteredUsers.filter(u => ['PLUMBER', 'GUARD', 'OFFICE_STAFF', 'MANAGER', 'ACCOUNTANT'].includes(u.role))

  if (loading) {
    return (
      <DashboardLayout title="User Management">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="User Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Users</h2>
            <p className="text-muted-foreground">Manage system users and roles</p>
          </div>
          {isAuthorized('manage_users') && (
            <Dialog>
              <DialogTrigger asChild>
                <Button>Add User</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite New User</DialogTitle>
                  <DialogDescription>
                    To add a new user to the system, please ask them to sign up using the public registration page. Once they have registered, you can approve their account and assign them a specific role from the <b>User Approvals</b> tab.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex justify-end pt-4">
                  <Button variant="outline" onClick={() => window.location.href = '/'}>Go to Login/Register</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Total Users</p><p className="text-2xl font-bold">{filteredUsers.length}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Active Users</p><p className="text-2xl font-bold">{activeUsers.length}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Resident</p><p className="text-2xl font-bold">{residents.length}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Tenants</p><p className="text-2xl font-bold">{tenants.length}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Staff</p><p className="text-2xl font-bold">{staff.length}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>All Users</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto overflow-y-hidden"><table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b">
                  <th className="pb-3 text-left">User</th>
                  <th className="pb-3 text-left">Phone</th>
                  <th className="pb-3 text-left">Role</th>
                  <th className="pb-3 text-left">Building</th>
                  <th className="pb-3 text-left">Unit</th>
                  <th className="pb-3 text-left">Status</th>
                  {isAuthorized('manage_users') && <th className="pb-3 text-left">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.uid} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">{getInitials(user.fullName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.fullName}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">{user.phone}</td>
                    <td className="py-3"><Badge className={roleColors[user.role] || 'bg-gray-100'}>{roleLabels[user.role] || user.role}</Badge></td>
                    <td className="py-3">{user.buildingId || '-'}</td>
                    <td className="py-3">{user.unitNumber || '-'}</td>
                    <td className="py-3"><Badge variant={user.status === 'approved' ? 'success' : user.status === 'rejected' ? 'destructive' : 'secondary'}>{user.status === 'pending_approval' ? 'Pending' : user.status}</Badge></td>
                    {isAuthorized('manage_users') && (
                      <td className="py-3">
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setEditingUser(user)}>
                            <Edit2 className="h-4 w-4 text-blue-500" />
                          </Button>
                          {deleting === user.uid ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            isAuthorized('delete_records') && (
                              <Button variant="ghost" size="sm" onClick={() => handleDelete(user.uid, user.role)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table></div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-md max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details, role, and approval status.</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={editingUser.fullName} onChange={(e) => setEditingUser({...editingUser, fullName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input 
                  value={editingUser.phone} 
                  maxLength={10}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, '')
                    setEditingUser({...editingUser, phone: value})
                  }} 
                  pattern="^9\d{9}$"
                  title="Phone number must be exactly 10 digits and start with 9"
                  placeholder="e.g. 9841234567"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tower / Building</Label>
                  <Select 
                    value={editingUser.buildingId || 'none'} 
                    onValueChange={(val) => {
                      const finalVal = val === 'none' ? '' : val;
                      setEditingUser({...editingUser, buildingId: finalVal, unitNumber: ''});
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select tower..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None / Empty</SelectItem>
                      {Object.keys(TOWER_UNITS).map(tower => (
                        <SelectItem key={tower} value={tower}>{tower}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unit / Apartment</Label>
                  <Select 
                    value={editingUser.unitNumber || 'none'} 
                    onValueChange={(val) => {
                      const finalVal = val === 'none' ? '' : val;
                      setEditingUser({...editingUser, unitNumber: finalVal});
                    }}
                    disabled={!editingUser.buildingId}
                  >
                    <SelectTrigger><SelectValue placeholder="Select unit..." /></SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      <SelectItem value="none">None / Empty</SelectItem>
                      {editingUser.buildingId && TOWER_UNITS[editingUser.buildingId] ? (
                        TOWER_UNITS[editingUser.buildingId].map(unit => (
                          <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>Select tower first</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={editingUser.role} onValueChange={(val) => setEditingUser({...editingUser, role: val})}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {currentUserRole === 'SUPER_ADMIN' && (
                      <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                    )}
                    {(currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'MANAGER') && (
                      <SelectItem value="MANAGER">Manager</SelectItem>
                    )}
                    <SelectItem value="OFFICE_ASSISTANT">Office Assistant</SelectItem>
                    <SelectItem value="RESIDENT">Resident</SelectItem>
                    <SelectItem value="TENANT">Tenant</SelectItem>
                    <SelectItem value="GENERAL_STAFF">General Staff</SelectItem>
                    <SelectItem value="PLUMBER">Plumber</SelectItem>
                    <SelectItem value="CLEANER">Cleaner</SelectItem>
                    <SelectItem value="GUARD">Guard</SelectItem>
                    <SelectItem value="ACCOUNTANT">Accountant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editingUser.status} onValueChange={(val) => setEditingUser({...editingUser, status: val})}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending_approval">Pending Approval</SelectItem>
                    <SelectItem value="rejected">Disapproved/Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setEditingUser(null)} disabled={saving}>Cancel</Button>
                <Button onClick={handleUpdateUser} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}