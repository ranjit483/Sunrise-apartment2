import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Bell, UsersRound, Car, ShieldCheck, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { collection, query, onSnapshot, where } from 'firebase/firestore'
import { db } from '@/config/firebase'

export function GuardView({ profile }: { profile: any }) {
  const [openComplaints, setOpenComplaints] = useState(0)

  useEffect(() => {
    // We can only count complaints that the guard is allowed to see.
    // However, since we don't have category-based filtering in firestore right now
    // due to missing composite indexes, we'll fetch all open complaints and filter in memory.
    const q = query(collection(db, 'complaints'), where('status', 'in', ['open', 'in_progress']))
    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      let count = 0;
      const allowedCategories = ['Parking', 'Security', 'Emergency']
      snapshot.forEach((doc: any) => {
        const data = doc.data()
        if (data.category && allowedCategories.includes(data.category)) {
          count++
        }
      })
      setOpenComplaints(count)
    })
    return () => unsubscribe()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Guard Dashboard
          </h2>
          <p className="text-muted-foreground mt-1">Welcome back, {profile.fullName}. Here is your security overview.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/visitors">
            <button className="px-4 py-2 bg-green-400 hover:bg-green-500 text-green-950 font-medium rounded-md shadow-sm transition-colors">
              Register Visitor
            </button>
          </Link>
          <Link href="/visitors">
            <button className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-blue-900 font-medium rounded-md shadow-sm transition-colors">
              Log Delivery
            </button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">Security & Emergency</CardTitle>
            <Bell className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{openComplaints}</div>
            <p className="text-xs text-blue-600 mt-1">Open complaints</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-800">Visitor Management</CardTitle>
            <UsersRound className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">Logbook</div>
            <p className="text-xs text-green-600 mt-1">Track entries & exits</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-orange-800">Parking Control</CardTitle>
            <Car className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">Active</div>
            <p className="text-xs text-orange-600 mt-1">Manage visitor parking</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pt-4">
        <Link href="/visitors" className="block group">
          <Card className="h-full hover:shadow-md transition-all border-l-4 border-l-green-500 hover:border-l-green-600">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg group-hover:text-green-700 transition-colors">
                Visitor Logs
                <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </CardTitle>
              <CardDescription>Register new visitors, track entry/exit times, and verify host units.</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/parking" className="block group">
          <Card className="h-full hover:shadow-md transition-all border-l-4 border-l-orange-500 hover:border-l-orange-600">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg group-hover:text-orange-700 transition-colors">
                Parking Allocations
                <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </CardTitle>
              <CardDescription>View assigned slots and manage temporary visitor parking spaces.</CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/complaints" className="block group">
          <Card className="h-full hover:shadow-md transition-all border-l-4 border-l-blue-500 hover:border-l-blue-600">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg group-hover:text-blue-700 transition-colors">
                Security Incidents
                <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </CardTitle>
              <CardDescription>Review and respond to parking disputes, security alerts, and emergencies.</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  )
}
