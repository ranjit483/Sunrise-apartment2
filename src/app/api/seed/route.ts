import { NextResponse } from 'next/server'
import { db } from '@/config/firebase'
import { collection, writeBatch, doc } from 'firebase/firestore'
import { Building, Unit, Lease, Invoice, Payment, MaintenanceTicket } from '@/types/models'

// Temporary route to seed dummy data
export async function POST() {
  try {
    const batch = writeBatch(db)

    // 1. Buildings
    const buildings: Omit<Building, 'id'>[] = [
      { name: 'Building A', address: 'Nakhhu-13, Lalitpur', totalFloors: 5, totalUnits: 15, status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Building B', address: 'Nakhhu-13, Lalitpur', totalFloors: 6, totalUnits: 18, status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Building C', address: 'Nakhhu-13, Lalitpur', totalFloors: 4, totalUnits: 12, status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { name: 'Building D', address: 'Nakhhu-13, Lalitpur', totalFloors: 5, totalUnits: 13, status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ]

    const buildingRefs = buildings.map(b => {
      const ref = doc(collection(db, 'buildings'))
      batch.set(ref, { ...b, id: ref.id })
      return ref
    })

    // 2. Units (create a few units for Building A)
    const bId = buildingRefs[0].id
    const units: Omit<Unit, 'id'>[] = [
      { buildingId: bId, unitNumber: 'A-101', type: 'Apartment', floor: 1, area: 1200, rent: 45000, status: 'occupied', tenantId: 'tenant-1', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { buildingId: bId, unitNumber: 'A-102', type: 'Apartment', floor: 1, area: 1100, rent: 42000, status: 'vacant', tenantId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { buildingId: bId, unitNumber: 'A-201', type: 'Apartment', floor: 2, area: 1400, rent: 55000, status: 'occupied', tenantId: 'tenant-2', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { buildingId: buildingRefs[1].id, unitNumber: 'B-101', type: 'Studio', floor: 1, area: 800, rent: 35000, status: 'occupied', tenantId: 'tenant-3', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ]

    const unitRefs = units.map(u => {
      const ref = doc(collection(db, 'units'))
      batch.set(ref, { ...u, id: ref.id })
      return ref
    })

    // 3. Leases
    const leases: Omit<Lease, 'id'>[] = [
      { unitId: unitRefs[0].id, tenantId: 'tenant-1', startDate: '2025-06-01', endDate: '2026-05-31', monthlyRent: 45000, deposit: 90000, status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { unitId: unitRefs[2].id, tenantId: 'tenant-2', startDate: '2025-08-01', endDate: '2026-07-31', monthlyRent: 55000, deposit: 110000, status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { unitId: unitRefs[3].id, tenantId: 'tenant-3', startDate: '2025-09-01', endDate: '2026-08-31', monthlyRent: 35000, deposit: 70000, status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ]

    leases.forEach(l => {
      const ref = doc(collection(db, 'leases'))
      batch.set(ref, { ...l, id: ref.id })
    })

    // 4. Invoices & Payments
    const invoices: Omit<Invoice, 'id'>[] = [
      { unitId: unitRefs[0].id, tenantId: 'tenant-1', month: 'May 2026', amount: 52000, dueDate: '2026-05-25', status: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { unitId: unitRefs[2].id, tenantId: 'tenant-2', month: 'May 2026', amount: 62000, dueDate: '2026-05-25', status: 'paid', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { unitId: unitRefs[3].id, tenantId: 'tenant-3', month: 'May 2026', amount: 45000, dueDate: '2026-05-25', status: 'paid', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { unitId: unitRefs[0].id, tenantId: 'tenant-1', month: 'April 2026', amount: 52000, dueDate: '2026-04-25', status: 'paid', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ]

    invoices.forEach((inv, i) => {
      const ref = doc(collection(db, 'invoices'))
      batch.set(ref, { ...inv, id: ref.id })
      
      // If paid, create a payment record
      if (inv.status === 'paid') {
        const pRef = doc(collection(db, 'payments'))
        batch.set(pRef, {
          id: pRef.id,
          invoiceId: ref.id,
          tenantId: inv.tenantId,
          amount: inv.amount,
          method: 'BANK TRANSFER',
          transactionId: `TXN-${Math.floor(Math.random() * 1000000)}`,
          status: 'completed',
          paidAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        } as Payment)
      }
    })

    // 5. Maintenance Tickets
    const tickets: Omit<MaintenanceTicket, 'id'>[] = [
      { title: 'Water heater not working', description: 'No hot water in bathroom', category: 'Plumbing', priority: 'high', status: 'in_progress', reportedBy: 'tenant-1', buildingId: bId, unitId: unitRefs[0].id, attachments: [], createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
      { title: 'Broken window lock', description: 'Window in master bedroom won\'t lock', category: 'Carpentry', priority: 'medium', status: 'resolved', reportedBy: 'tenant-1', buildingId: bId, unitId: unitRefs[0].id, attachments: [], createdAt: new Date(Date.now() - 14 * 86400000).toISOString(), updatedAt: new Date().toISOString() },
    ]

    tickets.forEach(t => {
      const ref = doc(collection(db, 'maintenance_tickets'))
      batch.set(ref, { ...t, id: ref.id })
    })

    await batch.commit()

    return NextResponse.json({ success: true, message: 'Database seeded successfully' })
  } catch (error: any) {
    console.error('Seed error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
