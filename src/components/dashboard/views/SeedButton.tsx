'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { db } from '@/config/firebase'
import { collection, writeBatch, doc } from 'firebase/firestore'
import { Loader2 } from 'lucide-react'

export function SeedButton() {
  const [seeding, setSeeding] = useState(false)

  const handleSeedData = async () => {
    if (!confirm('Are you sure you want to seed default buildings, units, and system data?')) return

    setSeeding(true)
    try {
      const batch = writeBatch(db)

      // 1. Seed Buildings
      const b1Ref = doc(db, 'buildings', 'tower-a')
      batch.set(b1Ref, {
        id: 'tower-a',
        name: 'Tower A',
        address: 'Nakkhu-13, Lalitpur',
        totalFloors: 10,
        createdAt: new Date().toISOString()
      })

      const b2Ref = doc(db, 'buildings', 'tower-b-i')
      batch.set(b2Ref, {
        id: 'tower-b-i',
        name: 'Tower B I',
        address: 'Nakkhu-13, Lalitpur',
        totalFloors: 14,
        createdAt: new Date().toISOString()
      })

      // 2. Seed some default Units in Tower A
      const units = [
        { id: 'a-101', buildingId: 'tower-a', unitNumber: 'A-101', type: '2 BHK', floor: 1, area: 1200, rent: 18000, status: 'occupied' },
        { id: 'a-102', buildingId: 'tower-a', unitNumber: 'A-102', type: '3 BHK', floor: 1, area: 1500, rent: 25000, status: 'vacant' },
        { id: 'a-201', buildingId: 'tower-a', unitNumber: 'A-201', type: '2 BHK', floor: 2, area: 1200, rent: 18500, status: 'occupied' },
        { id: 'a-001', buildingId: 'tower-a', unitNumber: 'A-001', type: '1 BHK', floor: 0, area: 800, rent: 12000, status: 'vacant' }
      ]

      units.forEach(u => {
        const uRef = doc(db, 'units', u.id)
        batch.set(uRef, {
          ...u,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      })

      await batch.commit()
      alert('Database seeded successfully with core Sunrise Apartment data!')
    } catch (error: any) {
      console.error('Error seeding database:', error)
      alert('Failed to seed database: ' + error.message)
    } finally {
      setSeeding(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      onClick={handleSeedData} 
      disabled={seeding}
      className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
    >
      {seeding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Seed Database
    </Button>
  )
}
