'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp, getDocs, collection, query, orderBy } from 'firebase/firestore'
import { auth, db } from '@/config/firebase'
import { Building, Unit } from '@/types/models'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Eye, EyeOff, Loader2, Building2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type AuthMode = 'signin' | 'signup'
type UserRole = 'MANAGER' | 'OFFICE_ASSISTANT' | 'RESIDENT' | 'TENANT' | 'GENERAL_STAFF' | 'PLUMBER' | 'ELECTRICIAN' | 'CLEANER' | 'GUARD' | 'ACCOUNTANT'

const roles: { value: UserRole; label: string; description: string }[] = [
  { value: 'MANAGER', label: 'Manager', description: 'Manage properties and staff' },
  { value: 'OFFICE_ASSISTANT', label: 'Office Assistant', description: 'Administrative duties' },
  { value: 'RESIDENT', label: 'Resident', description: 'Apartment resident/owner' },
  { value: 'TENANT', label: 'Tenant', description: 'Rent apartments' },
  { value: 'GENERAL_STAFF', label: 'General Staff', description: 'General building staff' },
  { value: 'PLUMBER', label: 'Plumber', description: 'Maintenance - Plumbing' },
  { value: 'ELECTRICIAN', label: 'Electrician', description: 'Maintenance - Electrical' },
  { value: 'CLEANER', label: 'Cleaner', description: 'Maintenance - Cleaning' },
  { value: 'GUARD', label: 'Guard', description: 'Security personnel' },
  { value: 'ACCOUNTANT', label: 'Accountant', description: 'Manage finances and billing' },
]

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const router = useRouter()
  const { user, profile, loading: authLoading, refreshProfile } = useAuth()
  const [mode, setMode] = useState<AuthMode>('signin')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const [buildings, setBuildings] = useState<Building[]>([])
  const [units, setUnits] = useState<Unit[]>([])

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    role: '' as UserRole | '',
    buildingId: '',
    unitNumber: '',
  })

  // Fetch buildings and units
  useEffect(() => {
    if (open) {
      const fetchBuildingsAndUnits = async () => {
        try {
          const bSnap = await getDocs(query(collection(db, 'buildings'), orderBy('name')))
          const bData = bSnap.docs.map((doc: any) => doc.data() as Building)
          setBuildings(bData)

          const uSnap = await getDocs(query(collection(db, 'units'), orderBy('unitNumber')))
          const uData = uSnap.docs.map((doc: any) => doc.data() as Unit)
          setUnits(uData)
        } catch (error) {
          console.error('Error fetching buildings and units:', error)
        }
      }
      fetchBuildingsAndUnits()
    }
  }, [open])

  // Handle redirect after successful auth
  useEffect(() => {
    if (user && profile && !authLoading) {
      router.push('/dashboard')
    }
  }, [user, profile, authLoading, router])

  const resetForm = () => {
    setFormData({ email: '', password: '', fullName: '', phone: '', role: '', buildingId: '', unitNumber: '' })
    setError('')
  }

  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode)
    resetForm()
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (mode === 'signup') {
        if (!formData.role || !formData.fullName || !formData.phone || !formData.buildingId || !formData.unitNumber) {
          setError('Please fill in all required fields')
          setLoading(false)
          return
        }

        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password)
        const user = userCredential.user

        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: formData.email,
          fullName: formData.fullName,
          phone: formData.phone,
          role: formData.role,
          status: 'approved',
          buildingId: formData.buildingId,
          unitNumber: formData.unitNumber,
          profileImage: user.photoURL || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })

        await refreshProfile()
      } else {
        await signInWithEmailAndPassword(auth, formData.email, formData.password)
        await refreshProfile()
      }


      onOpenChange(false)
    } catch (err: any) {
      console.error('Auth error:', err)
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered')
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address')
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password')
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email')
      } else {
        setError(err.message || 'Authentication failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleAuth = async () => {
    setLoading(true)
    setError('')

    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)
      const user = result.user

      const existingDoc = await getDoc(doc(db, 'users', user.uid))

      if (!existingDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          fullName: user.displayName || '',
          phone: user.phoneNumber || '',
          role: 'TENANT',
          status: 'approved',
          buildingId: '',
          unitNumber: '',
          profileImage: user.photoURL || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }

      await refreshProfile()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Google auth error:', err)
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed')
      } else {
        setError(err.message || 'Google sign-in failed')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <DialogTitle>{mode === 'signin' ? 'Welcome Back' : 'Create Account'}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    placeholder="9841234567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>I am a... *</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          <div>
                            <p className="font-medium">{role.label}</p>
                            <p className="text-xs text-muted-foreground">{role.description}</p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tower *</Label>
                  <Select
                    value={formData.buildingId}
                    onValueChange={(value) => setFormData({ ...formData, buildingId: value, unitNumber: '' })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Tower" />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings.map((building) => (
                        <SelectItem key={building.id} value={building.id}>
                          {building.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Unit *</Label>
                  <Select
                    value={formData.unitNumber}
                    onValueChange={(value) => setFormData({ ...formData, unitNumber: value })}
                    disabled={!formData.buildingId}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {units
                        .filter((unit) => unit.buildingId === formData.buildingId)
                        .map((unit) => (
                        <SelectItem key={unit.id} value={unit.unitNumber}>
                          {unit.unitNumber} - {unit.type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Please wait...
                </>
              ) : mode === 'signin' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button type="button" variant="outline" className="w-full" onClick={handleGoogleAuth} disabled={loading}>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Sign in with Google
          </Button>

          <div className="text-center text-sm">
            {mode === 'signin' ? (
              <>
                Don't have an account?{' '}
                <button type="button" className="text-primary hover:underline" onClick={() => handleModeSwitch('signup')}>
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button type="button" className="text-primary hover:underline" onClick={() => handleModeSwitch('signin')}>
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}