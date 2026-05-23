'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { db } from '@/config/firebase'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { SystemSettings, UserSettings } from '@/types/models'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { updatePassword } from 'firebase/auth'

const defaultSystemSettings: SystemSettings = {
  apartmentName: 'Sunrise Apartment',
  address: 'Nakhhu-13, Lalitpur, Nepal',
  contactPhone: '01-5555555',
  invoiceDueDate: 25,
  lateFeePercent: 2,
  autoGenerateInvoices: true,
  sendEmailReminders: true,
}

const defaultUserSettings: UserSettings = {
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: true,
  twoFactorAuth: false,
  sessionTimeout: 30
}

export default function SettingsPage() {
  const { user, profile } = useAuth()
  const [globalSettings, setGlobalSettings] = useState<SystemSettings>(defaultSystemSettings)
  const [userSettings, setUserSettings] = useState<UserSettings>(defaultUserSettings)
  const [loading, setLoading] = useState(true)
  const [savingGlobal, setSavingGlobal] = useState(false)
  const [savingUser, setSavingUser] = useState(false)
  
  // Password change state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const isGlobalAdmin = profile?.role === 'SUPER_ADMIN' || profile?.role === 'MANAGER'

  useEffect(() => {
    if (!user) return;

    let unsubGlobal: () => void = () => {};
    let unsubUser: () => void = () => {};

    // Only subscribe to global settings if authorized
    if (isGlobalAdmin) {
      const globalRef = doc(db, 'settings', 'general')
      unsubGlobal = onSnapshot(globalRef, (docSnap: any) => {
        if (docSnap.exists()) {
          setGlobalSettings(docSnap.data() as SystemSettings)
        }
      })
    }

    // Always subscribe to user settings
    const userRef = doc(db, 'users', user.uid)
    unsubUser = onSnapshot(userRef, (docSnap: any) => {
      if (docSnap.exists()) {
        const data = docSnap.data()
        if (data.preferences) {
           setUserSettings(data.preferences as UserSettings)
        }
      }
      // If we are not a global admin, we are ready once user settings load.
      // If we are a global admin, we'll assume both load around the same time.
      setLoading(false)
    })

    return () => {
      unsubGlobal()
      unsubUser()
    }
  }, [user, isGlobalAdmin])

  const handleSaveGlobal = async () => {
    setSavingGlobal(true)
    try {
      await setDoc(doc(db, 'settings', 'general'), globalSettings)
    } catch (error) {
      console.error('Error saving global settings:', error)
    } finally {
      setSavingGlobal(false)
    }
  }

  const handleSaveUser = async () => {
    if (!user) return;
    setSavingUser(true)
    try {
      await setDoc(doc(db, 'users', user.uid), { preferences: userSettings }, { merge: true })
    } catch (error) {
      console.error('Error saving user settings:', error)
    } finally {
      setSavingUser(false)
    }
  }

  const handleChangeGlobal = (field: keyof SystemSettings, value: any) => {
    setGlobalSettings(prev => ({ ...prev, [field]: value }))
  }

  const handleChangeUser = (field: keyof UserSettings, value: any) => {
    setUserSettings(prev => ({ ...prev, [field]: value }))
  }

  const handleChangePassword = async () => {
    setPasswordError('')
    setPasswordSuccess('')
    if (!newPassword || newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match or are empty.")
      return
    }
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.")
      return
    }

    if (!user) return;

    setSavingPassword(true)
    try {
      await updatePassword(user, newPassword)
      setPasswordSuccess("Password updated successfully!")
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      console.error('Error updating password:', error)
      if (error.code === 'auth/requires-recent-login') {
        setPasswordError("For security reasons, you must log out and log back in before changing your password.")
      } else {
        setPasswordError(error.message || "Failed to update password.")
      }
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout title="Settings">
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Settings">
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Settings</h2>
          <p className="text-muted-foreground">Manage your preferences and security</p>
        </div>

        {isGlobalAdmin && (
          <>
            <div className="border-b pb-2 mt-8">
              <h3 className="text-xl font-semibold">System Configuration</h3>
              <p className="text-sm text-muted-foreground">Global settings applied to all users and the apartment building.</p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Apartment Information</CardTitle>
                  <CardDescription>Basic information about the apartment</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Apartment Name</Label>
                    <Input value={globalSettings.apartmentName} onChange={(e) => handleChangeGlobal('apartmentName', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input value={globalSettings.address} onChange={(e) => handleChangeGlobal('address', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Phone</Label>
                    <Input value={globalSettings.contactPhone} onChange={(e) => handleChangeGlobal('contactPhone', e.target.value)} />
                  </div>
                  <Button onClick={handleSaveGlobal} disabled={savingGlobal}>{savingGlobal ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}Save Changes</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Invoice Settings</CardTitle>
                  <CardDescription>Configure global invoice generation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Invoice Due Date</Label>
                    <Input value={globalSettings.invoiceDueDate} onChange={(e) => handleChangeGlobal('invoiceDueDate', parseInt(e.target.value))} type="number" />
                  </div>
                  <div className="space-y-2">
                    <Label>Late Fee (%)</Label>
                    <Input value={globalSettings.lateFeePercent} onChange={(e) => handleChangeGlobal('lateFeePercent', parseInt(e.target.value))} type="number" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Auto-generate Invoices</Label>
                    <Switch checked={globalSettings.autoGenerateInvoices} onCheckedChange={(c) => handleChangeGlobal('autoGenerateInvoices', c)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Send Email Reminders</Label>
                    <Switch checked={globalSettings.sendEmailReminders} onCheckedChange={(c) => handleChangeGlobal('sendEmailReminders', c)} />
                  </div>
                  <Button onClick={handleSaveGlobal} disabled={savingGlobal}>{savingGlobal ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}Save Changes</Button>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        <div className="border-b pb-2 mt-8">
          <h3 className="text-xl font-semibold">Personal Preferences</h3>
          <p className="text-sm text-muted-foreground">Manage your personal notifications and account security.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure how you receive alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Email Notifications</Label>
                <Switch checked={userSettings.emailNotifications} onCheckedChange={(c) => handleChangeUser('emailNotifications', c)} />
              </div>
              <div className="flex items-center justify-between">
                <Label>SMS Notifications</Label>
                <Switch checked={userSettings.smsNotifications} onCheckedChange={(c) => handleChangeUser('smsNotifications', c)} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Push Notifications</Label>
                <Switch checked={userSettings.pushNotifications} onCheckedChange={(c) => handleChangeUser('pushNotifications', c)} />
              </div>
              <Button onClick={handleSaveUser} disabled={savingUser}>{savingUser ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}Save Preferences</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security and password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Two-Factor Authentication</Label>
                  <Switch checked={userSettings.twoFactorAuth} onCheckedChange={(c) => handleChangeUser('twoFactorAuth', c)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Session Timeout (minutes)</Label>
                  <Input value={userSettings.sessionTimeout} onChange={(e) => handleChangeUser('sessionTimeout', parseInt(e.target.value))} type="number" className="w-20" />
                </div>
                <Button onClick={handleSaveUser} disabled={savingUser} variant="outline" className="w-full">{savingUser ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}Save Security Preferences</Button>
              </div>
              
              <div className="border-t pt-4 space-y-4">
                <Label className="text-lg font-medium">Change Password</Label>
                {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
                {passwordSuccess && <p className="text-sm text-green-500">{passwordSuccess}</p>}
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
                <Button onClick={handleChangePassword} disabled={savingPassword} className="w-full">
                  {savingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                  Update Password
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}