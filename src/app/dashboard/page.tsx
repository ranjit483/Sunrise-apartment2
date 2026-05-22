'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Loader2 } from 'lucide-react'

import { AdminView } from '@/components/dashboard/views/AdminView'
import { TenantView } from '@/components/dashboard/views/TenantView'
import { StaffView } from '@/components/dashboard/views/StaffView'
import { MaintenanceView } from '@/components/dashboard/views/MaintenanceView'

export default function DashboardPage() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/')
      }
    }
  }, [user, profile, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-gray-500">Loading your dashboard...</p>
      </div>
    )
  }

  if (!user) return null;

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm text-center max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Profile Not Found</h2>
          <p className="text-gray-600 mb-6">Your user profile could not be found in the database. You may need to create a new account or contact support.</p>
          <button onClick={() => {
            const { signOut } = require('firebase/auth');
            const { auth } = require('@/config/firebase');
            signOut(auth).then(() => window.location.href = '/');
          }} className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors">
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  const renderDashboardView = () => {
    switch (profile.role) {
      case 'SUPER_ADMIN':
      case 'MANAGER':
        return <AdminView profile={profile} />
      case 'OFFICE_ASSISTANT':
      case 'GENERAL_STAFF':
        return <StaffView profile={profile} />
      case 'RESIDENT':
      case 'TENANT':
        return <TenantView profile={profile} />
      case 'PLUMBER':
      case 'ELECTRICIAN':
      case 'CLEANER':
        return <MaintenanceView profile={profile} />
      default:
        return (
          <div className="text-center py-10">
            <h2 className="text-2xl font-bold text-muted-foreground">Your role has not been fully configured yet.</h2>
          </div>
        )
    }
  }

  return (
    <DashboardLayout title="Dashboard">
      {renderDashboardView()}
    </DashboardLayout>
  )
}