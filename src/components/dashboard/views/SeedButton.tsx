'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { db } from '@/config/firebase'
import { writeBatch, doc, collection } from 'firebase/firestore'

export function SeedButton() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSeed = async () => {
    if (!confirm('Are you sure you want to seed the database? This will insert dummy data.')) return;
    
    setLoading(true)
    try {
      const batch = writeBatch(db)

      // 1. Buildings
      const b1 = doc(collection(db, 'buildings'))
      batch.set(b1, { id: b1.id, name: 'Building A', address: 'Nakhhu-13, Lalitpur', totalFloors: 5, totalUnits: 15, status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      
      const b2 = doc(collection(db, 'buildings'))
      batch.set(b2, { id: b2.id, name: 'Building B', address: 'Nakhhu-13, Lalitpur', totalFloors: 6, totalUnits: 18, status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })

      // 2. Units (Building A)
      const u1 = doc(collection(db, 'units'))
      batch.set(u1, { id: u1.id, buildingId: b1.id, unitNumber: 'A-101', type: 'Apartment', floor: 1, area: 1200, rent: 45000, status: 'occupied', tenantId: 'tenant-1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      
      const u2 = doc(collection(db, 'units'))
      batch.set(u2, { id: u2.id, buildingId: b1.id, unitNumber: 'A-102', type: 'Apartment', floor: 1, area: 1100, rent: 42000, status: 'vacant', tenantId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      
      const u3 = doc(collection(db, 'units'))
      batch.set(u3, { id: u3.id, buildingId: b1.id, unitNumber: 'A-201', type: 'Apartment', floor: 2, area: 1400, rent: 55000, status: 'occupied', tenantId: 'tenant-2', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })

      // 3. Leases
      const l1 = doc(collection(db, 'leases'))
      batch.set(l1, { id: l1.id, unitId: u1.id, tenantId: 'tenant-1', startDate: '2025-06-01', endDate: '2026-05-31', monthlyRent: 45000, deposit: 90000, status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      
      const l2 = doc(collection(db, 'leases'))
      batch.set(l2, { id: l2.id, unitId: u3.id, tenantId: 'tenant-2', startDate: '2025-08-01', endDate: '2026-07-31', monthlyRent: 55000, deposit: 110000, status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })

      // 4. Invoices & Payments
      const inv1 = doc(collection(db, 'invoices'))
      batch.set(inv1, { id: inv1.id, unitId: u1.id, tenantId: 'tenant-1', month: 'May 2026', amount: 52000, dueDate: '2026-05-25', status: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })

      const inv2 = doc(collection(db, 'invoices'))
      batch.set(inv2, { id: inv2.id, unitId: u3.id, tenantId: 'tenant-2', month: 'May 2026', amount: 62000, dueDate: '2026-05-25', status: 'paid', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      
      const p1 = doc(collection(db, 'payments'))
      batch.set(p1, { id: p1.id, invoiceId: inv2.id, tenantId: 'tenant-2', amount: 62000, method: 'BANK TRANSFER', transactionId: 'TXN-884920', status: 'completed', paidAt: new Date().toISOString(), createdAt: new Date().toISOString() })

      // 5. Maintenance Tickets
      const t1 = doc(collection(db, 'maintenance'))
      batch.set(t1, { id: t1.id, title: 'Water heater not working', description: 'No hot water in bathroom', category: 'Plumbing', priority: 'high', status: 'in_progress', reportedBy: 'tenant-1', buildingId: b1.id, unitId: u1.id, attachments: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })

      // 6. Expenses
      const exp1 = doc(collection(db, 'expenses'))
      batch.set(exp1, { id: exp1.id, category: 'Staff Salary', description: 'Monthly salaries', amount: 125000, date: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() })

      const exp2 = doc(collection(db, 'expenses'))
      batch.set(exp2, { id: exp2.id, category: 'Maintenance', description: 'Lift repair', amount: 15000, date: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() })

      // 7. Visitors
      const vis1 = doc(collection(db, 'visitors'))
      batch.set(vis1, { id: vis1.id, name: 'John Doe', unitId: 'A-101', phone: '9841234567', purpose: 'Delivery', entryTime: new Date().toISOString(), status: 'entered', createdAt: new Date().toISOString() })

      // 8. Complaints
      const comp1 = doc(collection(db, 'complaints'))
      batch.set(comp1, { id: comp1.id, tenantId: 'tenant-1', title: 'Noise from upstairs', description: 'Loud music at night', status: 'open', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })

      // 9. Parking
      const park1 = doc(collection(db, 'parking'))
      batch.set(park1, { id: park1.id, slotNumber: 'P-001', unitId: 'A-101', vehicleNumber: 'BA-1234', vehicleModel: 'Toyota', monthlyFee: 2000, status: 'occupied', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      const park2 = doc(collection(db, 'parking'))
      batch.set(park2, { id: park2.id, slotNumber: 'P-002', unitId: null, vehicleNumber: null, vehicleModel: null, monthlyFee: 2000, status: 'available', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })

      // 10. Settings
      const settingsRef = doc(db, 'settings', 'general')
      batch.set(settingsRef, {
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
      })

      await batch.commit()
      setDone(true)
      alert('Database seeded successfully! Now please refresh the page to see live data.')
    } catch (e: any) {
      console.error(e)
      alert('Failed to seed: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button 
      variant="destructive" 
      onClick={handleSeed}
      disabled={loading || done}
    >
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {done ? 'Database Seeded!' : 'Seed Database'}
    </Button>
  )
}
