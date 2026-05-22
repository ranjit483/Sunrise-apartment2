'use client'

import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, Download, FileText } from 'lucide-react'

export default function ReportsPage() {
  return (
    <DashboardLayout title="Reports & Analytics">
      <div className="space-y-6">
        <div><h2 className="text-3xl font-bold">Reports</h2><p className="text-muted-foreground">View and export analytical reports</p></div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-100"><BarChart3 className="h-6 w-6 text-blue-600" /></div>
                <div><p className="font-medium">Occupancy Report</p><p className="text-sm text-muted-foreground">Current occupancy status</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-100"><FileText className="h-6 w-6 text-green-600" /></div>
                <div><p className="font-medium">Financial Report</p><p className="text-sm text-muted-foreground">Revenue and expenses</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-purple-100"><BarChart3 className="h-6 w-6 text-purple-600" /></div>
                <div><p className="font-medium">Maintenance Report</p><p className="text-sm text-muted-foreground">Ticket statistics</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-yellow-100"><FileText className="h-6 w-6 text-yellow-600" /></div>
                <div><p className="font-medium">Utility Report</p><p className="text-sm text-muted-foreground">Consumption analytics</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-orange-100"><BarChart3 className="h-6 w-6 text-orange-600" /></div>
                <div><p className="font-medium">Staff Report</p><p className="text-sm text-muted-foreground">Performance metrics</p></div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-cyan-100"><FileText className="h-6 w-6 text-cyan-600" /></div>
                <div><p className="font-medium">Tenant History</p><p className="text-sm text-muted-foreground">Tenant records</p></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}