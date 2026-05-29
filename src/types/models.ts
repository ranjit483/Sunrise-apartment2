import type { UserRole } from '@/context/AuthContext'

export type BuildingStatus = 'active' | 'maintenance' | 'inactive'
export type UnitStatus = 'vacant' | 'occupied' | 'maintenance' | 'reserved'
export type LeaseStatus = 'active' | 'pending_renewal' | 'expired' | 'terminated'
export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded'
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical'

export interface ChartOfAccount {
  id: string
  code: string
  name: string
  type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'
  isSystemLocked: boolean
  createdAt: string
}

export interface Building {
  id: string
  name: string
  address: string
  totalFloors: number
  totalUnits: number
  status: BuildingStatus
  managerId?: string
  createdAt: string
  updatedAt: string
}

export interface Unit {
  id: string
  buildingId: string
  unitNumber: string
  type: string
  floor: number
  area: number
  rent: number
  status: UnitStatus
  tenantId?: string | null
  createdAt: string
  updatedAt: string
}

export interface Lease {
  id: string
  unitId: string
  tenantId: string
  startDate: string
  endDate: string
  monthlyRent: number
  deposit: number
  status: LeaseStatus
  createdAt: string
  updatedAt: string
}

export interface Invoice {
  id: string
  unitId: string
  tenantId: string
  unitNumber?: string
  tenantName?: string
  month: string
  amount: number
  electricityReading?: number
  electricityAmount?: number
  utilityAmount?: number
  waterAmount?: number
  otherAmount?: number
  dueDate: string
  status: InvoiceStatus
  createdAt: string
  updatedAt: string
}

export interface Payment {
  id: string
  invoiceId: string
  tenantId: string
  amount: number
  method: string
  transactionId: string
  status: PaymentStatus
  paidAt: string
  createdAt: string
}

export interface MaintenanceTicket {
  id: string
  title: string
  description: string
  category: string
  priority: TicketPriority
  status: TicketStatus
  reportedBy: string
  assignedTo?: string | null
  buildingId: string
  unitId: string
  attachments: string[]
  createdAt: string
  updatedAt: string
  scope?: 'Internal_Unit' | 'Common_Area'
  structuralLocation?: string
  allocatedParts?: { name: string; quantity: number; cost: number }[]
  estimatedCost?: number
  actualCost?: number
  remarks?: string
  ticketNo?: string
  reportedByName?: string
}

export interface Complaint {
  id: string
  tenantId: string
  title: string
  description: string
  category?: string
  status: TicketStatus
  createdAt: string
  updatedAt: string
}

export interface AuditLog {
  id: string
  action: string
  performedBy: string
  targetId: string
  metadata: Record<string, any>
  timestamp: string
}

export interface Expense {
  id: string
  accountId?: string
  buildingId?: string
  category: string
  description: string
  amount: number
  date: string
  status: 'pending_approval' | 'approved' | 'rejected' | 'paid'
  receiptUrl?: string
  approvedBy?: string
  createdAt: string
}

export interface Visitor {
  id: string
  name: string
  unitId: string
  phone: string
  province?: string
  purpose: string
  vehicleType?: 'pedestrian' | '2-wheeler' | '4-wheeler'
  licensePlate?: string
  vehicleBrand?: string
  parkingSlot?: string
  entryTime: string
  exitTime?: string
  status: 'entered' | 'exited' | 'waiting'
  createdAt: string
}

export interface ParkingSlot {
  id: string
  slotNumber: string
  unitId?: string | null
  vehicleNumber?: string | null
  vehicleModel?: string | null
  monthlyFee: number
  status: 'available' | 'occupied' | 'visitor' | 'maintenance'
  createdAt: string
  updatedAt: string
}

export interface SystemSettings {
  id?: string
  apartmentName: string
  address: string
  contactPhone: string
  invoiceDueDate: number
  lateFeePercent: number
  autoGenerateInvoices: boolean
  sendEmailReminders: boolean
}

export interface UserSettings {
  emailNotifications: boolean
  smsNotifications: boolean
  pushNotifications: boolean
  twoFactorAuth: boolean
  sessionTimeout: number
}
