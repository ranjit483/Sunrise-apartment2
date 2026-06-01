'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { useAuth } from '@/context/AuthContext'
import { Loader2 } from 'lucide-react'
import AdminElectricityView from '@/components/dashboard/views/electricity/AdminElectricityView'
import ResidentElectricityView from '@/components/dashboard/views/electricity/ResidentElectricityView'

export default function ElectricityPage() {
  const { profile, loading } = useAuth()
  
  if (loading || !profile) {
    return (
      <DashboardLayout title="Electricity Billing">
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  const isAdmin = ['SUPER_ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(profile.role)

  return (
    <DashboardLayout title="Electricity Billing">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Electricity Billing</h2>
          <p className="text-muted-foreground">Manage and view electricity meter readings and billing.</p>
        </div>
        {isAdmin ? <AdminElectricityView /> : <ResidentElectricityView />}
      </div>
    </DashboardLayout>
  )
}
