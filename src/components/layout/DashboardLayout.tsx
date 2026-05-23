'use client'

import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'
import { useAuth } from '@/context/AuthContext'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { signOut } from 'firebase/auth'
import { auth } from '@/config/firebase'

interface DashboardLayoutProps {
  children: React.ReactNode
  title?: string
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (profile && profile.status !== 'approved') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-sm text-center max-w-md">
          <h2 className="text-2xl font-bold text-amber-600 mb-2">
            {profile.status === 'rejected' ? 'Account Disapproved' : 'Account Pending Approval'}
          </h2>
          <p className="text-gray-600 mb-6">
            {profile.status === 'rejected' 
              ? 'Your account access has been revoked or disapproved by an administrator. Please contact management if you believe this is an error.'
              : 'Your account is currently pending approval by an administrator. You will be able to access your dashboard once approved.'}
          </p>
          <button onClick={() => {
            signOut(auth).then(() => router.push('/'));
          }} className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors">
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen} 
      />
      <div className={`main-content transition-all duration-300 ${collapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <Navbar title={title} setMobileOpen={setMobileOpen} />
        <main className="p-4 md:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}