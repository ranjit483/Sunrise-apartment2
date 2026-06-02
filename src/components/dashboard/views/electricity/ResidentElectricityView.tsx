'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import { db } from '@/config/firebase'
import { collection, query, where, orderBy, getDocs, doc, setDoc, limit, onSnapshot, getDoc } from 'firebase/firestore'
import { ElectricityReading, Unit, SystemSettings } from '@/types/models'
import { Loader2, Zap, Upload, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
// Assuming we don't have Firebase storage set up yet based on the open questions, 
// we will just take a mock upload or skip it for now and make it optional.

export default function ResidentElectricityView() {
  const { user, profile } = useAuth()
  const [readings, setReadings] = useState<ElectricityReading[]>([])
  const [loading, setLoading] = useState(true)
  const [unit, setUnit] = useState<Unit | null>(null)
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentReadingInput, setCurrentReadingInput] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [pricePerUnit, setPricePerUnit] = useState(15) // Default to 15

  const [previousReading, setPreviousReading] = useState(0)

  useEffect(() => {
    if (!user) return

    const fetchUnitAndSettings = async () => {
      try {
        let foundUnit: Unit | null = null

        // 1. Try matching tenantId
        const q1 = query(collection(db, 'units'), where('tenantId', '==', user.uid))
        const snap1 = await getDocs(q1)
        if (!snap1.empty) {
          foundUnit = snap1.docs[0].data() as Unit
        } else {
          // 2. Try matching ownerId (for RESIDENT role)
          const q2 = query(collection(db, 'units'), where('ownerId', '==', user.uid))
          const snap2 = await getDocs(q2)
          if (!snap2.empty) {
            foundUnit = snap2.docs[0].data() as Unit
          } else if (profile?.unitNumber) {
            // 3. Fallback matching unitNumber string
            const q3 = query(collection(db, 'units'), where('unitNumber', '==', profile.unitNumber))
            const snap3 = await getDocs(q3)
            if (!snap3.empty) {
              foundUnit = snap3.docs[0].data() as Unit
            }
          }
        }

        setUnit(foundUnit)

        // Fetch settings
        const settingsRef = doc(db, 'settings', 'general')
        const settingsSnap = await getDoc(settingsRef)
        if (settingsSnap.exists()) {
          const s = settingsSnap.data() as SystemSettings
          if (s.electricityPricePerUnit) setPricePerUnit(s.electricityPricePerUnit)
        }
      } catch (error) {
        console.error("Error fetching unit:", error)
      }
    }

    fetchUnitAndSettings()
  }, [user, profile])

  useEffect(() => {
    if (!user) return

    // If we have a unit, fetch by unitId. Otherwise fallback to tenantId matching user.uid
    let q;
    if (unit) {
      q = query(
        collection(db, 'electricity_readings'), 
        where('unitId', '==', unit.id),
        orderBy('readingDate', 'desc')
      )
    } else {
      q = query(
        collection(db, 'electricity_readings'), 
        where('tenantId', '==', user.uid),
        orderBy('readingDate', 'desc')
      )
    }

    const unsubscribe = onSnapshot(q, (snapshot: any) => {
      const data: ElectricityReading[] = []
      snapshot.forEach((doc: any) => {
        data.push(doc.data() as ElectricityReading)
      })
      setReadings(data)
      
      if (data.length > 0) {
        setPreviousReading(data[0].currentReading)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [unit, user])

  const handleSubmitReading = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!unit || !user) return

    const currentVal = parseFloat(currentReadingInput)
    if (isNaN(currentVal)) {
      alert("Please enter a valid number")
      return
    }

    if (currentVal < previousReading) {
      alert(`Current reading (${currentVal}) cannot be less than previous reading (${previousReading}).`)
      return
    }

    setIsSubmitting(true)
    try {
      const consumed = currentVal - previousReading
      const total = consumed * pricePerUnit
      const monthStr = new Date().toISOString().substring(0, 7) // YYYY-MM

      const newRef = doc(collection(db, 'electricity_readings'))
      const reading: ElectricityReading = {
        id: newRef.id,
        unitId: unit.id,
        tenantId: user.uid,
        previousReading,
        currentReading: currentVal,
        totalConsumed: consumed,
        pricePerUnit,
        totalBill: total,
        readingDate: new Date().toISOString(),
        status: 'pending_verification',
        photoUrl: photoUrl || '',
        month: monthStr,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      await setDoc(newRef, reading)
      alert("Reading submitted successfully. Waiting for Admin verification.")
      setCurrentReadingInput('')
      setPhotoUrl('')
    } catch (error: any) {
      console.error(error)
      alert("Error submitting reading: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const chartData = readings
    .slice(0, 6)
    .reverse()
    .map(r => ({
      date: new Date(r.readingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      consumed: r.totalConsumed
    }))

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  if (!unit && readings.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          You are not currently assigned to any unit. Please contact management.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Usage Trends</CardTitle>
            <CardDescription>Your electricity consumption over time</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                    <Bar dataKey="consumed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Not enough data to display trends.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Readings</CardTitle>
            <CardDescription>History of your submitted meter readings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {readings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No readings submitted yet.</p>
              ) : (
                readings.map((reading) => (
                  <div key={reading.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50/50">
                    <div className="space-y-1">
                      <p className="font-semibold text-sm">
                        {new Date(reading.readingDate).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {reading.previousReading} → {reading.currentReading} ({reading.totalConsumed} Units)
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-bold text-sm">Rs. {reading.totalBill.toLocaleString()}</p>
                      <div className="flex items-center justify-end gap-1">
                        {reading.status === 'approved' && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
                        {reading.status === 'rejected' && <XCircle className="h-3 w-3 text-red-500" />}
                        {reading.status === 'pending_verification' && <Clock className="h-3 w-3 text-amber-500" />}
                        <span className={`text-[10px] font-medium uppercase ${
                          reading.status === 'approved' ? 'text-emerald-600' :
                          reading.status === 'rejected' ? 'text-red-600' :
                          'text-amber-600'
                        }`}>
                          {reading.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
