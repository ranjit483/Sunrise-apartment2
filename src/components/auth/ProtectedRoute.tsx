'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Loader2 } from 'lucide-react'
import { useRBAC } from '@/hooks/useRBAC'

const publicPaths = ['/', '/auth/signin']

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth()
  const { clearanceLevel } = useRBAC()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return

    const isPublicPath = publicPaths.some(path => pathname === path || pathname.startsWith(path + '/'))

    if (!user) {
      if (!isPublicPath) {
        router.push('/')
      }
      return
    }

    if (profile) {
      // Automatically redirect all authenticated users to the dashboard
      if (pathname === '/' || pathname === '/auth/signin') {
        router.push('/dashboard')
      }

      // Restrict access to admin routes for users with clearance > 2 (Owner, Manager, Staff, Guard, Tenant)
      if (pathname.startsWith('/admin') && clearanceLevel > 2) {
        router.push('/dashboard')
      }
    }
  }, [user, profile, loading, router, pathname, clearanceLevel])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Profile still loading from Firestore — show loading state
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}