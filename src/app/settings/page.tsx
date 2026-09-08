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
  electricityPricePerUnit: 15,
  generatorPricePerUnit: 25,
  waterSupplyFlatFee: 0,
  insuranceRatePerSqFt: 0,
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
      <div className="space-y-3 sm:space-y-6">
        <div>
          <h2 className="text-sm sm:text-xl font-bold">Settings</h2>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Manage your preferences and security</p>
        </div>

        {isGlobalAdmin && (
          <>
            <div className="border-b pb-1.5 sm:pb-2 mt-4 sm:mt-8">
              <h3 className="text-sm sm:text-xl font-semibold">System Configuration</h3>
              <p className="text-[10px] sm:text-sm text-muted-foreground">Global settings applied to all users and the apartment building.</p>
            </div>
            
            <div className="grid gap-3 sm:gap-6 md:grid-cols-2">
              <Card>
                <CardHeader className="p-3 sm:p-6 pb-1.5 sm:pb-3">
                  <CardTitle className="text-xs sm:text-2xl font-semibold">Apartment Information</CardTitle>
                  <CardDescription className="text-[10px] sm:text-sm">Basic information about the apartment</CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0 space-y-2.5 sm:space-y-4">
                  <div className="space-y-1 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Apartment Name</Label>
                    <Input className="h-8 text-xs sm:h-10 sm:text-sm" value={globalSettings.apartmentName} onChange={(e) => handleChangeGlobal('apartmentName', e.target.value)} />
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Address</Label>
                    <Input className="h-8 text-xs sm:h-10 sm:text-sm" value={globalSettings.address} onChange={(e) => handleChangeGlobal('address', e.target.value)} />
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Contact Phone</Label>
                    <Input className="h-8 text-xs sm:h-10 sm:text-sm" value={globalSettings.contactPhone} onChange={(e) => handleChangeGlobal('contactPhone', e.target.value)} />
                  </div>
                  <Button className="h-8 text-xs sm:h-10 sm:text-sm" onClick={handleSaveGlobal} disabled={savingGlobal}>{savingGlobal ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-2"/> : null}Save Changes</Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-3 sm:p-6 pb-1.5 sm:pb-3">
                  <CardTitle className="text-xs sm:text-2xl font-semibold">Invoice Settings</CardTitle>
                  <CardDescription className="text-[10px] sm:text-sm">Configure global invoice generation</CardDescription>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 pt-0 space-y-2.5 sm:space-y-4">
                  <div className="space-y-1 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Invoice Due Date</Label>
                    <Input className="h-8 text-xs sm:h-10 sm:text-sm" value={globalSettings.invoiceDueDate} onChange={(e) => handleChangeGlobal('invoiceDueDate', parseInt(e.target.value))} type="number" />
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Late Fee (%)</Label>
                    <Input className="h-8 text-xs sm:h-10 sm:text-sm" value={globalSettings.lateFeePercent} onChange={(e) => handleChangeGlobal('lateFeePercent', parseInt(e.target.value))} type="number" />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs sm:text-sm">Auto-generate Invoices</Label>
                    <Switch className="scale-75 sm:scale-100 origin-right" checked={globalSettings.autoGenerateInvoices} onCheckedChange={(c) => handleChangeGlobal('autoGenerateInvoices', c)} />
                  </div>
                  <div className="space-y-1 sm:space-y-2 pt-1.5 sm:pt-2 border-t mt-1.5 sm:mt-2">
                    <Label className="text-xs sm:text-sm">Electricity Price Per Unit (Rs.)</Label>
                    <Input className="h-8 text-xs sm:h-10 sm:text-sm" value={globalSettings.electricityPricePerUnit || ''} onChange={(e) => handleChangeGlobal('electricityPricePerUnit', parseFloat(e.target.value) || 0)} type="number" />
                    <p className="text-[10px] sm:text-xs text-muted-foreground">This rate is used to calculate the monthly City electricity bills based on meter readings.</p>
                  </div>
                  <div className="space-y-1 sm:space-y-2 pt-1.5 sm:pt-2 border-t mt-1.5 sm:mt-2">
                    <Label className="text-xs sm:text-sm">Generator (DG) Price Per Unit (Rs.)</Label>
                    <Input className="h-8 text-xs sm:h-10 sm:text-sm" value={globalSettings.generatorPricePerUnit || ''} onChange={(e) => handleChangeGlobal('generatorPricePerUnit', parseFloat(e.target.value) || 0)} type="number" />
                    <p className="text-[10px] sm:text-xs text-muted-foreground">This rate is used to calculate the monthly Generator electricity bills based on meter readings.</p>
                  </div>
                  <div className="space-y-1 sm:space-y-2 pt-1.5 sm:pt-2 border-t mt-1.5 sm:mt-2">
                    <Label className="text-xs sm:text-sm">Water Supply Flat Fee (Rs.)</Label>
                    <Input className="h-8 text-xs sm:h-10 sm:text-sm" value={globalSettings.waterSupplyFlatFee || ''} onChange={(e) => handleChangeGlobal('waterSupplyFlatFee', parseFloat(e.target.value) || 0)} type="number" />
                    <p className="text-[10px] sm:text-xs text-muted-foreground">This is the fixed monthly flat fee for Water Supply & Society Maintenance.</p>
                  </div>
                  <div className="space-y-1 sm:space-y-2 pt-1.5 sm:pt-2 border-t mt-1.5 sm:mt-2">
                    <Label className="text-xs sm:text-sm">Insurance Rate Per Sq Ft (Rs.)</Label>
                    <Input className="h-8 text-xs sm:h-10 sm:text-sm" value={globalSettings.insuranceRatePerSqFt || ''} onChange={(e) => handleChangeGlobal('insuranceRatePerSqFt', parseFloat(e.target.value) || 0)} type="number" />
                    <p className="text-[10px] sm:text-xs text-muted-foreground">This rate is used to calculate the Apartment Structure Insurance Contribution based on Unit area (Sq Ft).</p>
                  </div>
                  <div className="space-y-1 sm:space-y-2 pt-1.5 sm:pt-2 border-t mt-1.5 sm:mt-2">
                    <Label className="text-xs sm:text-sm">Diesel Cost Sharing Flat Fee (Rs.)</Label>
                    <Input className="h-8 text-xs sm:h-10 sm:text-sm" value={globalSettings.dieselCostFlatFee || ''} onChange={(e) => handleChangeGlobal('dieselCostFlatFee', parseFloat(e.target.value) || 0)} type="number" />
                    <p className="text-[10px] sm:text-xs text-muted-foreground">This is the fixed monthly flat fee for Diesel Cost Sharing Standby pool.</p>
                  </div>
                  <div className="space-y-1 sm:space-y-2 pt-1.5 sm:pt-2 border-t mt-1.5 sm:mt-2">
                    <Label className="text-xs sm:text-sm">Structure/Maintenance Rate Per Sq Ft (Rs.)</Label>
                    <Input className="h-8 text-xs sm:h-10 sm:text-sm" value={globalSettings.structureMaintenanceRatePerSqFt || ''} onChange={(e) => handleChangeGlobal('structureMaintenanceRatePerSqFt', parseFloat(e.target.value) || 0)} type="number" />
                    <p className="text-[10px] sm:text-xs text-muted-foreground">This rate is used to calculate the Monthly Service Charge per Sq Ft.</p>
                  </div>
                  <div className="space-y-1 sm:space-y-2 pt-1.5 sm:pt-2 border-t mt-1.5 sm:mt-2">
                    <Label className="text-xs sm:text-sm">Other Charges Flat Fee (Rs.)</Label>
                    <Input className="h-8 text-xs sm:h-10 sm:text-sm" value={globalSettings.otherChargesFlatFee || ''} onChange={(e) => handleChangeGlobal('otherChargesFlatFee', parseFloat(e.target.value) || 0)} type="number" />
                    <p className="text-[10px] sm:text-xs text-muted-foreground">This is the fixed monthly flat fee for Other Charges.</p>
                  </div>
                  <div className="flex items-center justify-between pt-1.5 sm:pt-2 border-t mt-1.5 sm:mt-2">
                    <Label className="text-xs sm:text-sm">Send Email Reminders</Label>
                    <Switch className="scale-75 sm:scale-100 origin-right" checked={globalSettings.sendEmailReminders} onCheckedChange={(c) => handleChangeGlobal('sendEmailReminders', c)} />
                  </div>
                  <Button className="h-8 text-xs sm:h-10 sm:text-sm" onClick={handleSaveGlobal} disabled={savingGlobal}>{savingGlobal ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-2"/> : null}Save Changes</Button>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        <div className="border-b pb-1.5 sm:pb-2 mt-4 sm:mt-8">
          <h3 className="text-sm sm:text-xl font-semibold">Personal Preferences</h3>
          <p className="text-[10px] sm:text-sm text-muted-foreground">Manage your personal notifications and account security.</p>
        </div>

        <div className="grid gap-3 sm:gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="p-3 sm:p-6 pb-1.5 sm:pb-3">
              <CardTitle className="text-xs sm:text-2xl font-semibold">Notification Settings</CardTitle>
              <CardDescription className="text-[10px] sm:text-sm">Configure how you receive alerts</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 space-y-2.5 sm:space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs sm:text-sm">Email Notifications</Label>
                <Switch className="scale-75 sm:scale-100 origin-right" checked={userSettings.emailNotifications} onCheckedChange={(c) => handleChangeUser('emailNotifications', c)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs sm:text-sm">SMS Notifications</Label>
                <Switch className="scale-75 sm:scale-100 origin-right" checked={userSettings.smsNotifications} onCheckedChange={(c) => handleChangeUser('smsNotifications', c)} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs sm:text-sm">Push Notifications</Label>
                <Switch className="scale-75 sm:scale-100 origin-right" checked={userSettings.pushNotifications} onCheckedChange={(c) => handleChangeUser('pushNotifications', c)} />
              </div>
              <Button className="h-8 text-xs sm:h-10 sm:text-sm" onClick={handleSaveUser} disabled={savingUser}>{savingUser ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-2"/> : null}Save Preferences</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-3 sm:p-6 pb-1.5 sm:pb-3">
              <CardTitle className="text-xs sm:text-2xl font-semibold">Security Settings</CardTitle>
              <CardDescription className="text-[10px] sm:text-sm">Manage your account security and password</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0 space-y-3 sm:space-y-6">
              <div className="space-y-2.5 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-xs sm:text-sm">Two-Factor Authentication</Label>
                  <Switch className="scale-75 sm:scale-100 origin-right" checked={userSettings.twoFactorAuth} onCheckedChange={(c) => handleChangeUser('twoFactorAuth', c)} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs sm:text-sm">Session Timeout (minutes)</Label>
                  <Input value={userSettings.sessionTimeout} onChange={(e) => handleChangeUser('sessionTimeout', parseInt(e.target.value))} type="number" className="w-16 h-8 text-xs sm:w-20 sm:h-10 sm:text-sm" />
                </div>
                <Button onClick={handleSaveUser} disabled={savingUser} variant="outline" className="w-full h-8 text-xs sm:h-10 sm:text-sm">{savingUser ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-2"/> : null}Save Security Preferences</Button>
              </div>
              
              <div className="border-t pt-3 sm:pt-4 space-y-2.5 sm:space-y-4">
                <Label className="text-xs sm:text-lg font-medium">Change Password</Label>
                {passwordError && <p className="text-[10px] sm:text-sm text-red-500">{passwordError}</p>}
                {passwordSuccess && <p className="text-[10px] sm:text-sm text-green-500">{passwordSuccess}</p>}
                <div className="space-y-1 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">New Password</Label>
                  <Input type="password" className="h-8 text-xs sm:h-10 sm:text-sm" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="space-y-1 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Confirm New Password</Label>
                  <Input type="password" className="h-8 text-xs sm:h-10 sm:text-sm" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
                <Button onClick={handleChangePassword} disabled={savingPassword} className="w-full h-8 text-xs sm:h-10 sm:text-sm">
                  {savingPassword ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-2"/> : null}
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