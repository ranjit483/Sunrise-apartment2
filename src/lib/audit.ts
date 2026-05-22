import { collection, addDoc } from 'firebase/firestore'
import { db } from '@/config/firebase'

export interface AuditLogEntry {
  action: string
  targetUid?: string
  performedBy: string
  timestamp: string
  metadata?: Record<string, any>
}

export async function logAuditAction(entry: Omit<AuditLogEntry, 'timestamp'>) {
  try {
    const fullEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date().toISOString()
    }
    
    await addDoc(collection(db, 'audit_logs'), fullEntry)
  } catch (error) {
    console.error('Failed to write audit log:', error)
  }
}
