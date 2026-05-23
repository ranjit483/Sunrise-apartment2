'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, ArrowLeft } from 'lucide-react'

export default function AdminApprovePage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  // Auth guard: redirect if not authenticated or not admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/')
        return
      }
      if (profile && profile.role !== 'SUPER_ADMIN' && profile.role !== 'MANAGER') {
        router.push('/dashboard')
        return
      }
    }
  }, [user, profile, authLoading, router])

  useEffect(() => {
    if (!user || authLoading) return
    if (profile && profile.role !== 'SUPER_ADMIN' && profile.role !== 'MANAGER') return

    const fetchPendingUsers = async () => {
      try {
        const q = query(collection(db, 'users'), where('status', '==', 'pending_approval'))
        const snapshot = await getDocs(q)
        const pendingUsers: any[] = []
        snapshot.forEach((doc: any) => {
          pendingUsers.push({ id: doc.id, ...doc.data() })
        })
        setUsers(pendingUsers)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchPendingUsers()
  }, [user, profile, authLoading])

  const approveUser = async (userId: string) => {
    setUpdating(userId)
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: user?.uid || 'unknown',
        updatedAt: new Date().toISOString()
      })
      setUsers(users.filter(u => u.id !== userId))
    } catch (error) {
      console.error('Error approving:', error)
    } finally {
      setUpdating(null)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user || !profile) return null
  if (profile.role !== 'SUPER_ADMIN' && profile.role !== 'MANAGER') return null

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" className="mb-4 -ml-4 text-muted-foreground" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to previous page
        </Button>
        <h1 className="text-2xl font-bold mb-6">Pending User Approvals</h1>
        
        {users.length === 0 ? (
          <Card>
            <CardContent className="p-6">No pending users</CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {users.map(user => (
              <Card key={user.id}>
                <CardHeader>
                  <CardTitle>{user.fullName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">Email: {user.email}</p>
                  <p className="text-sm text-gray-600">Role: {user.role}</p>
                  <p className="text-sm text-gray-600">Phone: {user.phone}</p>
                  <Button 
                    className="mt-4" 
                    onClick={() => approveUser(user.id)}
                    disabled={updating === user.id}
                  >
                    {updating === user.id ? 'Approving...' : 'Approve'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}