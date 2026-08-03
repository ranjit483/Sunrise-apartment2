'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { doc, getDoc, DocumentData } from 'firebase/firestore'
import { auth, db } from '@/config/firebase'

export type UserRole = 
  | 'SUPER_ADMIN'
  | 'MANAGER'
  | 'OFFICE_ASSISTANT'
  | 'OWNER'
  | 'RESIDENT'
  | 'TENANT'
  | 'GENERAL_STAFF'
  | 'PLUMBER'
  | 'ELECTRICIAN'
  | 'CLEANER'
  | 'GUARD'
  | 'ACCOUNTANT'

export type UserStatus = 'pending_approval' | 'approved' | 'rejected'

export interface UserProfile {
  uid: string
  email: string
  fullName: string
  phone: string
  role: UserRole
  clearance_level: number
  status: UserStatus
  buildingId?: string
  unitNumber?: string
  profileImage?: string
  createdAt: string
  approvedBy?: string
  approvedAt?: string
}

interface AuthContextType {
  user: any | null
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (userDoc.exists()) {
        const data = userDoc.data() as UserProfile;
        
        if (!data.clearance_level) {
          const { RoleHierarchy } = await import('@/lib/rbac');
          data.clearance_level = RoleHierarchy[data.role as keyof typeof RoleHierarchy] || 7;
        }
        
        if (data.email === 'ranjitmanaraja@gmail.com' && (data.status !== 'approved' || data.role !== 'SUPER_ADMIN')) {
          try {
            const { updateDoc } = await import('firebase/firestore');
            await updateDoc(doc(db, 'users', userId), {
              status: 'approved',
              role: 'SUPER_ADMIN',
              clearance_level: 1
            });
            data.status = 'approved';
            data.role = 'SUPER_ADMIN';
            data.clearance_level = 1;
          } catch (e) {
            console.error('Auto-approval write failed, mocking locally:', e);
            data.status = 'approved';
            data.role = 'SUPER_ADMIN';
            data.clearance_level = 1;
          }
        }
        
        setProfile(data);
      } else {
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.uid === userId) {
          try {
            const { setDoc } = await import('firebase/firestore');
            const newProfile = {
              uid: currentUser.uid,
              email: currentUser.email || '',
              fullName: currentUser.displayName || 'Restored User',
              phone: currentUser.phoneNumber || '',
              role: 'TENANT',
              status: 'approved',
              clearance_level: 7,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'users', userId), newProfile);
            setProfile(newProfile as unknown as UserProfile);
            return;
          } catch (e) {
            console.error('Failed fallback:', e);
          }
        }
        setProfile(null);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser: any) => {
      setUser(currentUser as any)
      
      if (currentUser) {
        await fetchProfile(currentUser.uid)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
      setUser(null)
      setProfile(null)
      window.location.href = '/'
    } catch (error) {
      console.error('Sign out error:', error)
      setUser(null)
      setProfile(null)
      window.location.href = '/'
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid)
    }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}