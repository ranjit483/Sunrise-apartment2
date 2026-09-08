import { NextResponse } from 'next/server'
import { db } from '@/config/firebase'
import { collection, addDoc } from 'firebase/firestore'
import { AppNotification } from '@/types/models'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      title,
      body: messageBody,
      type = 'announcement',
      priority = 'normal',
      targetType = 'all',
      targetRoles = [],
      targetUserId = '',
      targetUnit = '',
      link = '/notifications',
      senderId = 'SYSTEM',
      senderName = 'System Admin',
      data = {},
    } = body

    if (!title || !messageBody) {
      return NextResponse.json(
        { success: false, error: 'Title and body are required' },
        { status: 400 }
      )
    }

    const notificationData: Omit<AppNotification, 'id'> = {
      title: title.trim(),
      body: messageBody.trim(),
      type,
      priority,
      targetType,
      targetRoles,
      targetUserId,
      targetUnit,
      link,
      readBy: [],
      senderId,
      senderName,
      createdAt: new Date().toISOString(),
      data,
    }

    const docRef = await addDoc(collection(db, 'notifications'), notificationData)

    return NextResponse.json({
      success: true,
      id: docRef.id,
      notification: { id: docRef.id, ...notificationData },
    })
  } catch (error: any) {
    console.error('API send notification error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to dispatch notification' },
      { status: 500 }
    )
  }
}
