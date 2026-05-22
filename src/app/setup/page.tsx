'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '@/config/firebase'
import { Loader2, Shield } from 'lucide-react'

export default function SetupPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [step, setStep] = useState<'check' | 'create' | 'done'>('check')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    checkIfSuperAdminExists()
  }, [])

  const checkIfSuperAdminExists = async () => {
    try {
      const usersCollection = collection(db, 'users')
      const q = await getDocs(usersCollection)
      
      let hasSuperAdmin = false
      q.forEach((doc) => {
        if (doc.data().role === 'SUPER_ADMIN' && doc.data().status === 'approved') {
          hasSuperAdmin = true
        }
      })

      if (hasSuperAdmin) {
        router.push('/')
      } else {
        setStep('create')
      }
    } catch (err) {
      // If error, might be no users yet, show create form
      setStep('create')
    }
  }

  const handleCreateSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const newUser = userCredential.user

      // Create Super Admin profile in Firestore
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

      setStep('done')
      
      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)

    } catch (err: any) {
      console.error('Error creating Super Admin:', err)
      if (err.code === 'auth/email-already-in-use') {
        setError('Email already registered. Please sign in instead.')
      } else {
        setError(err.message || 'Failed to create Super Admin')
      }
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-white to-secondary/20 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <Shield className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Super Admin Created!</h1>
            <p className="text-gray-600">Redirecting to dashboard...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (step === 'create') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-white to-secondary/20 p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mx-auto mb-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Setup Super Admin</CardTitle>
            <CardDescription>Create the first Super Admin account for your system</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSuperAdmin} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg">{error}</div>
              )}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Super Admin'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}