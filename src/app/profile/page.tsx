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
import { Loader2, User as UserIcon, Mail, Phone, Home, Shield, Activity, Camera } from 'lucide-react'
import Link from 'next/link'

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    unitNumber: '',
  })

  // Load existing profile data
  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || '',
        phone: profile.phone || '',
        unitNumber: profile.unitNumber || '',
      })
    }
  }, [profile])

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
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground">
          View and manage your personal information
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Read-Only Overview */}
        <Card className="md:col-span-1">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 relative w-24 h-24">
              <Avatar className="w-24 h-24 border-4 border-background shadow-md">
                <AvatarImage src={profile.profileImage || ''} alt={profile.fullName} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                  {getInitials(profile.fullName || 'User')}
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle>{profile.fullName}</CardTitle>
            <CardDescription>{profile.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-muted-foreground">
                <Shield className="w-4 h-4 mr-2" />
                Role
              </div>
              <Badge variant="secondary" className="font-medium">
                {profile.role ? profile.role.replace('_', ' ') : 'UNKNOWN'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-muted-foreground">
                <Activity className="w-4 h-4 mr-2" />
                Status
              </div>
              <Badge variant={profile.status === 'approved' ? 'default' : 'destructive'} className="font-medium capitalize">
                {profile.status}
              </Badge>
            </div>
            {profile.clearance_level && (
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Shield className="w-4 h-4 mr-2" />
                  Clearance
                </div>
                <span className="text-sm font-medium">Level {profile.clearance_level}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column: Edit Form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Personal Details</CardTitle>
            <CardDescription>
              Update your contact information and apartment details.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleUpdateProfile}>
            <CardContent className="space-y-4">
              {successMsg && (
                <div className="p-3 bg-green-50 text-green-600 rounded-md text-sm border border-green-200">
                  {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-200">
                  {errorMsg}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      placeholder="Your full name"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      value={profile.email}
                      className="pl-9 bg-muted"
                      disabled
                      readOnly
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Email cannot be changed here.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      placeholder="e.g. 9841234567"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unitNumber">Unit / Apartment Number</Label>
                  <div className="relative">
                    <Home className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="unitNumber"
                      placeholder="e.g. A-101"
                      value={formData.unitNumber}
                      onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end border-t pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

      <div className="flex justify-end pt-4">
        <Button asChild style={{ backgroundColor: '#95DBAE', color: '#1a3622' }} className="hover:opacity-90 transition-opacity">
          <Link href="/dashboard">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Back to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}
