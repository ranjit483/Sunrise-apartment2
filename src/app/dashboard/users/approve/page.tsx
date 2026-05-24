'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle, XCircle, UserPlus, Users, Trash2 } from 'lucide-react'
import { doc, updateDoc, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'

interface UserItem {
  uid: string
  email: string
  fullName: string
  phone: string
  role: string
  status: string
  createdAt: string
}

export default function ApproveUsersPage() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()
  const [allUsers, setAllUsers] = useState<UserItem[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [approving, setApproving] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/')
      } else if (profile && profile.status === 'pending_approval') {
        router.push('/awaiting-approval')
      } else if (profile && profile.role !== 'SUPER_ADMIN') {
        router.push('/dashboard')
      }
    }
  }, [user, profile, loading, router])

  useEffect(() => {
    if (profile?.role === 'SUPER_ADMIN') {
      fetchAllUsers()
    }
  }, [profile])

  const fetchAllUsers = async () => {
    try {
      const usersCollection = collection(db, 'users')
      const snapshot = await getDocs(usersCollection)
      
      const users: UserItem[] = []
      snapshot.forEach((doc: any) => {
        users.push(doc.data() as UserItem)
      })
      
      setAllUsers(users)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const approveUser = async (userId: string) => {
    setApproving(userId)
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: 'approved',
        approvedBy: user?.uid,
        approvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      fetchAllUsers()
    } catch (error) {
      console.error('Error approving user:', error)
    } finally {
      setApproving(null)
    }
  }

  const rejectUser = async (userId: string) => {
    setApproving(userId)
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: 'rejected',
        rejectedBy: user?.uid,
        rejectedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      fetchAllUsers()
    } catch (error) {
      console.error('Error rejecting user:', error)
    } finally {
      setApproving(null)
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    
    try {
      await deleteDoc(doc(db, 'users', userId))
      fetchAllUsers()
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  if (loading || !user || profile?.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const pendingUsers = allUsers.filter(u => u.status === 'pending_approval')
  const approvedUsers = allUsers.filter(u => u.status === 'approved')

  return (
    <DashboardLayout title="User Management">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">User Management</h2>
            <p className="text-muted-foreground">Manage all registered users</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-100">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{allUsers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-yellow-100">
                  <UserPlus className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{pendingUsers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-100">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold">{approvedUsers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Users */}
        {pendingUsers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Pending User Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingUsers.map((pendingUser) => (
                  <div key={pendingUser.uid} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{pendingUser.fullName}</p>
                      <p className="text-sm text-muted-foreground">{pendingUser.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{pendingUser.role}</Badge>
                        <Badge variant="warning">Pending</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => rejectUser(pendingUser.uid)} disabled={approving === pendingUser.uid}>
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button size="sm" onClick={() => approveUser(pendingUser.uid)} disabled={approving === pendingUser.uid}>
                        {approving === pendingUser.uid ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Users */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : allUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No users found</p>
                <p className="text-sm">Create a Super Admin user in Firebase Console</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="overflow-x-auto overflow-y-hidden"><table className="w-full min-w-[800px]">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-3 text-left">Name</th>
                      <th className="pb-3 text-left">Email</th>
                      <th className="pb-3 text-left">Role</th>
                      <th className="pb-3 text-left">Status</th>
                      <th className="pb-3 text-left">Created</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((u) => (
                      <tr key={u.uid} className="border-b">
                        <td className="py-3">{u.fullName || '-'}</td>
                        <td className="py-3">{u.email}</td>
                        <td className="py-3">
                          <Badge variant={u.role === 'SUPER_ADMIN' ? 'default' : 'outline'}>
                            {u.role}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Badge variant={u.status === 'approved' ? 'success' : u.status === 'rejected' ? 'destructive' : 'warning'}>
                            {u.status}
                          </Badge>
                        </td>
                        <td className="py-3">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
                        <td className="py-3 text-right">
                          {u.role !== 'SUPER_ADMIN' && (
                            <Button size="sm" variant="ghost" onClick={() => deleteUser(u.uid)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}