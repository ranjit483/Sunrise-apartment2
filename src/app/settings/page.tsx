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
import { SystemSettings } from '@/types/models'
import { Loader2 } from 'lucide-react'

const defaultSettings: SystemSettings = {
  apartmentName: 'Sunrise Apartment',
  address: 'Nakhhu-13, Lalitpur, Nepal',
  contactPhone: '01-5555555',
  invoiceDueDate: 25,
  lateFeePercent: 2,
  autoGenerateInvoices: true,
  sendEmailReminders: true,
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: true,
  twoFactorAuth: false,
  sessionTimeout: 30
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const docRef = doc(db, 'settings', 'general')
    const unsubscribe = onSnapshot(docRef, (docSnap: any) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as SystemSettings)
      }
      setLoading(false)
    }, (error: any) => {
      console.error('Error fetching settings:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await setDoc(doc(db, 'settings', 'general'), settings)
      // Show success toast here if toast was implemented
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: keyof SystemSettings, value: any) => {
    setSettings(prev => ({ ...prev, [field]: value }))
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
        <div><h2 className="text-3xl font-bold">Settings</h2><p className="text-muted-foreground">Manage system settings and preferences</p></div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Apartment Information</CardTitle>
              <CardDescription>Basic information about the apartment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Apartment Name</Label>
                <Input value={settings.apartmentName} onChange={(e) => handleChange('apartmentName', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={settings.address} onChange={(e) => handleChange('address', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input value={settings.contactPhone} onChange={(e) => handleChange('contactPhone', e.target.value)} />
              </div>
              <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}Save Changes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Invoice Settings</CardTitle>
              <CardDescription>Configure invoice generation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Invoice Due Date</Label>
                <Input value={settings.invoiceDueDate} onChange={(e) => handleChange('invoiceDueDate', parseInt(e.target.value))} type="number" />
              </div>
              <div className="space-y-2">
                <Label>Late Fee (%)</Label>
                <Input value={settings.lateFeePercent} onChange={(e) => handleChange('lateFeePercent', parseInt(e.target.value))} type="number" />
              </div>
              <div className="flex items-center justify-between">
                <Label>Auto-generate Invoices</Label>
                <Switch checked={settings.autoGenerateInvoices} onCheckedChange={(c) => handleChange('autoGenerateInvoices', c)} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Send Email Reminders</Label>
                <Switch checked={settings.sendEmailReminders} onCheckedChange={(c) => handleChange('sendEmailReminders', c)} />
              </div>
              <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}Save Changes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Email Notifications</Label>
                <Switch checked={settings.emailNotifications} onCheckedChange={(c) => handleChange('emailNotifications', c)} />
              </div>
              <div className="flex items-center justify-between">
                <Label>SMS Notifications</Label>
                <Switch checked={settings.smsNotifications} onCheckedChange={(c) => handleChange('smsNotifications', c)} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Push Notifications</Label>
                <Switch checked={settings.pushNotifications} onCheckedChange={(c) => handleChange('pushNotifications', c)} />
              </div>
              <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}Save Changes</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure security options</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Two-Factor Authentication</Label>
                <Switch checked={settings.twoFactorAuth} onCheckedChange={(c) => handleChange('twoFactorAuth', c)} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Session Timeout (minutes)</Label>
                <Input value={settings.sessionTimeout} onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value))} type="number" className="w-20" />
              </div>
              <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}Save Changes</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}