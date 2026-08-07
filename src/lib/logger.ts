import { db } from '@/config/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

export async function logActivity(userId: string, userEmail: string, action: string, details: string = '') {
  try {
    await addDoc(collection(db, 'activity_logs'), {
      userId,
      userEmail,
      action,
      details,
      timestamp: serverTimestamp()
    })
  } catch (error) {
    console.error('Failed to log activity:', error)
  }
}
