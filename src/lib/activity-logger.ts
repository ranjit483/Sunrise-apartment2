import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/config/firebase'

export type ActivityAction = 
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE_USER'
  | 'UPDATE_USER'
  | 'APPROVE_USER'
  | 'CREATE_INVOICE'
  | 'UPDATE_INVOICE'
  | 'RECEIVE_PAYMENT'
  | 'CREATE_LEASE'
  | 'UPDATE_LEASE'
  | 'DELETE_RECORD'
  | 'OTHER'

export interface ActivityLog {
  id?: string
  userId: string
  userEmail: string
  userRole: string
  userName: string
  action: ActivityAction
  details: string
  timestamp: any
}

export const logActivity = async (
  profile: { uid: string, email: string, role: string, fullName?: string, name?: string },
  action: ActivityAction,
  details: string
) => {
  try {
    if (!profile || !profile.uid) return;
    
    const logEntry = {
      userId: profile.uid,
      userEmail: profile.email || 'unknown@email.com',
      userRole: profile.role || 'UNKNOWN',
      userName: profile.fullName || profile.name || 'Unknown User',
      action,
      details,
      timestamp: serverTimestamp(),
    }

    await addDoc(collection(db, 'activityLogs'), logEntry)
  } catch (error) {
    console.error('Failed to log activity:', error)
  }
}
