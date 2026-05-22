'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { doc, setDoc, getDoc, collection, getDocs, query, where, deleteDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, getAuth, signOut } from 'firebase/auth'
import { auth } from '@/config/firebase'
import { Loader2, Plus, Trash2, Check, X } from 'lucide-react'

export default function AdminAddPage() {
  const [email, setEmail] = useState('ranjitmanaraja@gmail.com')
  const [password, setPassword] = useState('1234@manaR#')
  const [fullName, setFullName] = useState('Super Admin')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  const createSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      // Try to sign in first - if user exists
      try {
        await signInWithEmailAndPassword(auth, email, password)
        // User exists, get UID
        const user = auth.currentUser
        if (user) {
          // Check if profile exists
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          if (userDoc.exists()) {
            await setDoc(doc(db, 'users', user.uid), {
              ...userDoc.data(),
              role: 'SUPER_ADMIN',
              status: 'approved',
              approvedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }, { merge: true })
            setMessage('✅ Super Admin updated successfully!')
          } else {
            // Create new profile
            await setDoc(doc(db, 'users', user.uid), {
              uid: user.uid,
              email: email,
              fullName: fullName,
              phone: '',
              role: 'SUPER_ADMIN',
              status: 'approved',
              unitNumber: null,
              profileImage: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              approvedBy: user.uid,
              approvedAt: new Date().toISOString()
            })
            setMessage('✅ Super Admin created successfully!')
          }
        }
      } catch (signInError: any) {
        // If sign in fails, try to create new user
        if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/wrong-password') {
          // Create new user
          const userCredential = await createUserWithEmailAndPassword(auth, email, password)
          const newUser = userCredential.user
          
          await setDoc(doc(db, 'users', newUser.uid), {
            uid: newUser.uid,
            email: email,
            fullName: fullName,
            phone: '',
            role: 'SUPER_ADMIN',
            status: 'approved',
            unitNumber: null,
            profileImage: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            approvedBy: newUser.uid,
            approvedAt: new Date().toISOString()
          })
          setMessage('✅ Super Admin created successfully!')
        } else {
          throw signInError
        }
      }

      // Sign out after creating admin
      await signOut(auth)
      
    } catch (err: any) {
      console.error('Error:', err)
      setError(err.message || 'Failed to create Super Admin')
    } finally {
      setLoading(false)
    }
  }

  const loadAllUsers = async () => {
    setLoadingUsers(true)
    try {
      const snapshot = await getDocs(collection(db, 'users'))
      const userList: any[] = []
      snapshot.forEach((doc) => {
        userList.push(doc.data())
      })
      setUsers(userList)
    } catch (err) {
      console.error('Error loading users:', err)
    } finally {
      setLoadingUsers(false)
    }
  }

  const deleteUser = async (uid: string) => {
    if (!confirm('Delete this user?')) return
    try {
      await deleteDoc(doc(db, 'users', uid))
      setUsers(users.filter(u => u.uid !== uid))
    } catch (err) {
      console.error('Error deleting user:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Create Super Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createSuperAdmin} className="space-y-4">
              {message && (
                <div className="p-3 bg-green-100 text-green-700 rounded-lg">{message}</div>
              )}
              {error && (
                <div className="p-3 bg-red-100 text-red-700 rounded-lg">{error}</div>
              )}
              
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Super Admin"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Password</Label>
                <Input 
                  type="password"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Create Super Admin
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>All Users</CardTitle>
            <Button variant="outline" size="sm" onClick={loadAllUsers}>
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
            ) : users.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No users found</div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <div key={u.uid} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{u.fullName}</p>
                      <p className="text-sm text-gray-500">{u.email}</p>
                      <div className="flex gap-2 mt-1">
                        <span className={`text-xs px-2 py-1 rounded ${u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-200'}`}>
                          {u.role}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${u.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {u.status}
                        </span>
                      </div>
                    </div>
                    {u.role !== 'SUPER_ADMIN' && (
                      <Button size="sm" variant="ghost" onClick={() => deleteUser(u.uid)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}