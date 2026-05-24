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

    setSaving(true)
    try {
      const userRef = doc(db, 'users', editingUser.uid)
      await updateDoc(userRef, {
        fullName: editingUser.fullName,
        phone: editingUser.phone,
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

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Total Users</p><p className="text-2xl font-bold">{filteredUsers.length}</p></CardContent></Card>
          <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Active Users</p><p className="text-2xl font-bold">{activeUsers.length}</p></CardContent></Card>
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
                  <th className="pb-3 text-left">Unit</th>
                  <th className="pb-3 text-left">Status</th>
                  {isAuthorized('manage_users') && <th className="pb-3 text-left">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.uid} className="border-b">
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
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(user.uid, user.role)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
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
        <DialogContent>
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
                <Input value={editingUser.phone} onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Unit/Apartment</Label>
                <Input value={editingUser.unitNumber || ''} onChange={(e) => setEditingUser({...editingUser, unitNumber: e.target.value})} placeholder="e.g. A-101" />
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