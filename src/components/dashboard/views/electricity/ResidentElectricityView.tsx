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
        // Fetch Unit
        const q = query(collection(db, 'units'), where('tenantId', '==', user.uid))
        const snapshot = await getDocs(q)
        if (!snapshot.empty) {
          const unitData = snapshot.docs[0].data() as Unit
          setUnit(unitData)
        } else if (profile?.unitNumber) {
          // Fallback if tenantId isn't exact but unitNumber exists
          const q2 = query(collection(db, 'units'), where('unitNumber', '==', profile.unitNumber))
          const snap2 = await getDocs(q2)
          if (!snap2.empty) {
             setUnit(snap2.docs[0].data() as Unit)
          }
        }

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
    if (!unit) {
      if (loading) setLoading(false)
      return
    }

    const q = query(
      collection(db, 'electricity_readings'), 
      where('unitId', '==', unit.id),
      orderBy('readingDate', 'desc')
    )

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
  }, [unit])

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

  if (!unit) {
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
            <CardTitle>Submit Meter Reading</CardTitle>
            <CardDescription>Enter your current electricity meter reading</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitReading} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Previous Reading</Label>
                  <Input value={previousReading} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Current Reading *</Label>
                  <Input 
                    type="number" 
                    required 
                    value={currentReadingInput}
                    onChange={(e) => setCurrentReadingInput(e.target.value)}
                    placeholder="e.g. 1540"
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <p className="text-sm text-blue-800 flex justify-between">
                  <span>Consumption:</span>
                  <strong>{currentReadingInput && !isNaN(parseFloat(currentReadingInput)) ? Math.max(0, parseFloat(currentReadingInput) - previousReading) : 0} Units</strong>
                </p>
                <p className="text-sm text-blue-800 flex justify-between mt-1">
                  <span>Est. Bill (at Rs. {pricePerUnit}/unit):</span>
                  <strong>Rs. {currentReadingInput && !isNaN(parseFloat(currentReadingInput)) ? (Math.max(0, parseFloat(currentReadingInput) - previousReading) * pricePerUnit).toLocaleString() : 0}</strong>
                </p>
              </div>

              <div className="space-y-2">
                <Label>Photo Proof (Optional URL for now)</Label>
                <div className="flex gap-2">
                  <Input 
                    type="url"
                    placeholder="Paste image URL here" 
                    value={photoUrl}
                    onChange={e => setPhotoUrl(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Upload feature integration pending storage setup.</p>
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                Submit Reading
              </Button>
            </form>
          </CardContent>
        </Card>

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
