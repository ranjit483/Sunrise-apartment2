export interface Building {
  id: string
  name: string
  address?: string
  totalFloors?: number
  totalUnits?: number
  status?: string
  createdAt?: string
  updatedAt?: string
}

export interface Unit {
  id: string
  buildingId: string
  unitNumber: string
  type: string
  floor: number
  area: number
  rent: number
  status: 'vacant' | 'occupied' | 'reserved' | 'maintenance' | string
  tenantId?: string | null
  tenantName?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface Invoice {
  id: string
  unitId: string
  tenantId: string
  unitNumber?: string
  tenantName?: string
  month: string
  amount: number
  electricityPreviousReading?: number
  electricityReading?: number
  electricityConsumed?: number
  electricityAmount?: number
  generatorReading?: number
  generatorAmount?: number
  utilityAmount?: number
  waterAmount?: number
  insuranceAmount?: number
  dieselAmount?: number
  structureMaintenanceAmount?: number
  otherAmount?: number
  paidAmount?: number
  dueDate: string
  status: 'draft' | 'pending' | 'partial' | 'paid' | 'overdue'
  createdAt: string
  updatedAt: string
}

export interface Payment {
  id: string
  invoiceId: string
  tenantId: string
  amount: number
  method: 'manual' | 'cash' | 'cheque' | 'qr' | string
  transactionId: string
  status: 'completed' | 'pending' | 'pending_clearance' | 'failed' | string
  paidAt?: string
  createdAt: string
  chequeNumber?: string
  bankName?: string
  receiptNo?: string
  receivedFor?: string
}

export interface MaintenanceTicket {
  id: string
  unitId: string
  title: string
  category: string
  priority: 'low' | 'medium' | 'high' | string
  description: string
  status: 'open' | 'in_progress' | 'completed' | 'closed' | string
  assignedTo?: string
  reportedBy: string
  reportedByName?: string
  buildingId?: string
  scope?: string
  attachments?: string[]
  ticketNo?: string
  createdAt: string
  updatedAt?: string
  structuralLocation?: string
  actualCost?: number
}

export interface Visitor {
  id: string
  name: string
  unitId: string
  phone: string
  province?: string
  purpose: string
  vehicleType: 'pedestrian' | '2-wheeler' | '4-wheeler'
  entryTime: string
  exitTime?: string
  status: 'entered' | 'exited' | 'waiting'
  createdAt: string
  licensePlate?: string
  vehicleBrand?: string
  vehicleTypeDetail?: string
  parkingSlot?: string
}

export interface Complaint {
  id: string
  title: string
  description: string
  category?: string
  tenantId: string
  tenantName?: string
  tenantUnit?: string
  status: 'open' | 'in_progress' | 'closed' | 'resolved'
  adminRemarks?: string
  createdAt: string
  updatedAt?: string
}

export interface Lease {
  id: string
  unitId: string
  tenantId: string
  startDate: string
  endDate: string
  rent?: number
  monthlyRent: number
  deposit: number
  status: string
  createdAt?: string
  updatedAt?: string
}

export interface Expense {
  id: string
  accountId: string
  category: string
  description: string
  amount: number
  date: string
  status: 'approved' | 'pending_approval' | 'rejected' | 'paid' | string
  createdAt?: string
  buildingId?: string
  approvedBy?: string
}

export interface ChartOfAccount {
  id: string
  code: string
  name: string
  type: string
  isSystemLocked?: boolean
  createdAt?: string
}

export interface ElectricityReading {
  id: string
  unitId: string
  tenantId: string
  meterType?: 'city' | 'generator'
  previousReading: number
  currentReading: number
  totalConsumed: number
  pricePerUnit: number
  totalBill: number
  readingDate: string
  status: 'pending_verification' | 'approved' | 'rejected'
  photoUrl?: string
  month?: string
  createdAt: string
  updatedAt: string
}


export interface SystemSettings {
  apartmentName: string
  address: string
  contactPhone: string
  invoiceDueDate: number
  lateFeePercent: number
  autoGenerateInvoices: boolean
  sendEmailReminders: boolean
  electricityPricePerUnit?: number
  generatorPricePerUnit?: number
  waterSupplyFlatFee?: number
  insuranceRatePerSqFt?: number
  dieselCostFlatFee?: number
  structureMaintenanceRatePerSqFt?: number
  otherChargesFlatFee?: number
}

export interface UserSettings {
  emailNotifications: boolean
  smsNotifications: boolean
  pushNotifications: boolean
  twoFactorAuth: boolean
  sessionTimeout: number
}
