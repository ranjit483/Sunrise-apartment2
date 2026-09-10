import { NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/config/firebase-admin'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { uid, newPassword, adminUid } = body

    if (!uid || !newPassword || !adminUid) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify the caller is a SUPER_ADMIN
    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    if (!adminDoc.exists) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    const adminData = adminDoc.data()
    if (adminData?.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized: Only Super Admins can reset passwords' },
        { status: 403 }
      )
    }

    // Update the user's password via Firebase Admin Auth
    await adminAuth.updateUser(uid, {
      password: newPassword
    })

    return NextResponse.json({ success: true, message: 'Password updated successfully' })
  } catch (error: any) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reset password' },
      { status: 500 }
    )
  }
}
