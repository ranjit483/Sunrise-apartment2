'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, Download, FileText } from 'lucide-react'
import Link from 'next/link'

export default function ReportsPage() {
  return (
    <DashboardLayout title="Reports & Analytics">
      <div className="space-y-3 sm:space-y-6">
        <div>
          <h2 className="text-lg sm:text-3xl font-bold tracking-tight">Reports</h2>
          <p className="text-[10px] sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">View and export analytical reports</p>
        </div>

        <div className="grid gap-2.5 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center gap-2.5 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg bg-blue-100"><BarChart3 className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" /></div>
                <div><p className="font-semibold text-xs sm:text-base">Occupancy Report</p><p className="text-[10px] sm:text-sm text-muted-foreground">Current occupancy status</p></div>
              </div>
            </CardContent>
          </Card>
          <Link href="/reports/profit-loss">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center gap-2.5 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-lg bg-green-100"><FileText className="h-4 w-4 sm:h-6 sm:w-6 text-green-600" /></div>
                  <div><p className="font-semibold text-xs sm:text-base">Financial Report</p><p className="text-[10px] sm:text-sm text-muted-foreground">Profit & Loss Statement</p></div>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center gap-2.5 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg bg-purple-100"><BarChart3 className="h-4 w-4 sm:h-6 sm:w-6 text-purple-600" /></div>
                <div><p className="font-semibold text-xs sm:text-base">Maintenance Report</p><p className="text-[10px] sm:text-sm text-muted-foreground">Ticket statistics</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center gap-2.5 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg bg-yellow-100"><FileText className="h-4 w-4 sm:h-6 sm:w-6 text-yellow-600" /></div>
                <div><p className="font-semibold text-xs sm:text-base">Utility Report</p><p className="text-[10px] sm:text-sm text-muted-foreground">Consumption analytics</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center gap-2.5 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg bg-orange-100"><BarChart3 className="h-4 w-4 sm:h-6 sm:w-6 text-orange-600" /></div>
                <div><p className="font-semibold text-xs sm:text-base">Staff Report</p><p className="text-[10px] sm:text-sm text-muted-foreground">Performance metrics</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-3 sm:p-6">
              <div className="flex items-center gap-2.5 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-lg bg-cyan-100"><FileText className="h-4 w-4 sm:h-6 sm:w-6 text-cyan-600" /></div>
                <div><p className="font-semibold text-xs sm:text-base">Tenant History</p><p className="text-[10px] sm:text-sm text-muted-foreground">Tenant records</p></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}