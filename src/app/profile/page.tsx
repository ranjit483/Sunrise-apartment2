'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, User as UserIcon, Mail, Phone, Home, Shield, Activity, Camera, Building2 } from 'lucide-react'
import Link from 'next/link'

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    buildingId: '',
    unitNumber: '',
  })

  // Load existing profile data
  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || '',
        phone: profile.phone || '',
        buildingId: profile.buildingId || '',
        unitNumber: profile.unitNumber || '',
      })
    }
  }, [profile])

  const isRestricted = profile?.role === 'TENANT' || profile?.role === 'RESIDENT'

  const getInitials = (name: string) => {
    if (!name || typeof name !== 'string') return 'U'
    return name
      .split(' ')
      .map((n) => n[0] || '')
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setSuccessMsg('')
    setErrorMsg('')

    try {
      const userRef = doc(db, 'users', user.uid)
      await updateDoc(userRef, {
        fullName: formData.fullName,
        phone: formData.phone,
        buildingId: formData.buildingId,
        unitNumber: formData.unitNumber,
        updatedAt: new Date().toISOString(),
      })

      await refreshProfile()
      setSuccessMsg('Profile updated successfully!')
    } catch (err: any) {
      console.error('Error updating profile:', err)
      setErrorMsg(err.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  if (!profile) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-2 sm:p-4 max-w-4xl space-y-3 sm:space-y-6">
      <div className="flex flex-col gap-1 sm:gap-2">
        <h1 className="text-lg sm:text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-[10px] sm:text-sm text-muted-foreground">
          View and manage your personal information
        </p>
      </div>

      <div className="grid gap-3 sm:gap-6 md:grid-cols-3">
        {/* Left Column: Read-Only Overview */}
        <Card className="md:col-span-1">
          <CardHeader className="text-center p-3 sm:p-6 pb-2">
            <div className="mx-auto mb-2 sm:mb-4 relative w-16 h-16 sm:w-24 sm:h-24">
              <Avatar className="w-16 h-16 sm:w-24 sm:h-24 border-2 sm:border-4 border-background shadow-md">
                <AvatarImage src={profile.profileImage || ''} alt={profile.fullName} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm sm:text-2xl font-bold">
                  {getInitials(profile.fullName || 'User')}
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-sm sm:text-xl font-bold">{profile.fullName}</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">{profile.email}</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 space-y-2 sm:space-y-4 pt-2 sm:pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-[10px] sm:text-sm text-muted-foreground">
                <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                Role
              </div>
              <Badge variant="secondary" className="font-medium text-[9px] sm:text-xs px-1.5 py-0.5">
                {profile.role ? profile.role.replace('_', ' ') : 'UNKNOWN'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center text-[10px] sm:text-sm text-muted-foreground">
                <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                Status
              </div>
              <Badge variant={profile.status === 'approved' ? 'default' : 'destructive'} className="font-medium capitalize text-[9px] sm:text-xs px-1.5 py-0.5">
                {profile.status}
              </Badge>
            </div>
            {profile.clearance_level && (
              <div className="flex items-center justify-between">
                <div className="flex items-center text-[10px] sm:text-sm text-muted-foreground">
                  <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  Clearance
                </div>
                <span className="text-[10px] sm:text-sm font-medium">Level {profile.clearance_level}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Edit Form */}
        <Card className="md:col-span-2">
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-sm sm:text-xl font-bold">Personal Details</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">
              Update your contact information and apartment details.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleUpdateProfile}>
            <CardContent className="p-3 sm:p-6 space-y-3 sm:space-y-4 pt-0">
              {successMsg && (
                <div className="p-2 sm:p-3 bg-green-50 text-green-600 rounded-md text-[10px] sm:text-sm border border-green-200">
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="p-2 sm:p-3 bg-red-50 text-red-600 rounded-md text-[10px] sm:text-sm border border-red-200">
                  {errorMsg}
                </div>
              )}

              <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="fullName" className="text-[10px] sm:text-sm font-semibold">Full Name</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-2.5 top-2 sm:top-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      placeholder="Your full name"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className={`pl-8 sm:pl-9 h-8 sm:h-10 text-xs sm:text-sm ${isRestricted ? 'bg-muted cursor-not-allowed opacity-75' : ''}`}
                      disabled={isRestricted}
                      readOnly={isRestricted}
                      required
                    />
                  </div>
                  {isRestricted && <p className="text-[9px] sm:text-[10px] text-muted-foreground">Name cannot be changed without manager permission.</p>}
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="email" className="text-[10px] sm:text-sm font-semibold">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-2 sm:top-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      value={profile.email}
                      className="pl-8 sm:pl-9 h-8 sm:h-10 text-xs sm:text-sm bg-muted cursor-not-allowed opacity-75"
                      disabled
                      readOnly
                    />
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground">Email cannot be changed here.</p>
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="phone" className="text-[10px] sm:text-sm font-semibold">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-2 sm:top-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      placeholder="e.g. 9841234567"
                      value={formData.phone}
                      maxLength={10}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '')
                        setFormData({ ...formData, phone: value })
                      }}
                      pattern="^9\d{9}$"
                      title="Phone number must be exactly 10 digits and start with 9"
                      className="pl-8 sm:pl-9 h-8 sm:h-10 text-xs sm:text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="buildingId" className="text-[10px] sm:text-sm font-semibold">Building - Tower</Label>
                  <div className="relative">
                    <Building2 className="absolute left-2.5 top-2 sm:top-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    <Input
                      id="buildingId"
                      placeholder="e.g. Tower A"
                      value={formData.buildingId}
                      onChange={(e) => setFormData({ ...formData, buildingId: e.target.value })}
                      className={`pl-8 sm:pl-9 h-8 sm:h-10 text-xs sm:text-sm ${isRestricted ? 'bg-muted cursor-not-allowed opacity-75' : ''}`}
                      disabled={isRestricted}
                      readOnly={isRestricted}
                    />
                  </div>
                  {isRestricted && <p className="text-[9px] sm:text-[10px] text-muted-foreground">Tower cannot be changed without manager permission.</p>}
                </div>

                <div className="space-y-1 sm:space-y-2">
                  <Label htmlFor="unitNumber" className="text-[10px] sm:text-sm font-semibold">Unit / Apartment Number</Label>
                  <div className="relative">
                    <Home className="absolute left-2.5 top-2 sm:top-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    <Input
                      id="unitNumber"
                      placeholder="e.g. A-101"
                      value={formData.unitNumber}
                      onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                      className={`pl-8 sm:pl-9 h-8 sm:h-10 text-xs sm:text-sm ${isRestricted ? 'bg-muted cursor-not-allowed opacity-75' : ''}`}
                      disabled={isRestricted}
                      readOnly={isRestricted}
                    />
                  </div>
                  {isRestricted && <p className="text-[9px] sm:text-[10px] text-muted-foreground">Unit cannot be changed without manager permission.</p>}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t p-3 sm:p-6 pt-3 sm:pt-4">
              <Button type="submit" disabled={loading} size="sm" className="h-8 sm:h-10 text-xs sm:text-sm">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      <div className="flex justify-end pt-2 sm:pt-4">
        <Button asChild size="sm" style={{ backgroundColor: '#95DBAE', color: '#1a3622' }} className="hover:opacity-90 transition-opacity h-8 sm:h-10 text-xs sm:text-sm">
          <Link href="/dashboard">
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}
