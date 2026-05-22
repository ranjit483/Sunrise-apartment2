import { NextResponse } from 'next/server'
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/config/firebase'

export async function POST(request: Request) {
  try {
    const { uid, email, status, approvedBy, callerRole, targetRole, role } = await request.json()

    let targetUid = uid

    // If no UID provided, look up by email
    if (!targetUid && email) {
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', email)
      )
      const snapshot = await getDocs(usersQuery)
      if (snapshot.empty) {
        return NextResponse.json(
          { error: 'No user found with that email' },
          { status: 404 }
        )
      }
      targetUid = snapshot.docs[0].id
    }

    if (!targetUid) {
      return NextResponse.json(
        { error: 'Either uid or email is required' },
        { status: 400 }
      )
    }

    // Basic RBAC Clearance Check (Soft enforcement via API - strong enforcement should be in Firestore Rules)
    if (callerRole && targetRole) {
      const { hasClearance } = await import('@/lib/rbac')
      if (!hasClearance(callerRole, targetRole)) {
        return NextResponse.json(
          { error: 'Insufficient clearance level to modify this user' },
          { status: 403 }
        )
      }
    }

    const updateData: any = {
      status: status || 'approved',
      approvedBy: approvedBy || 'system',
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (role) {
      updateData.role = role
    }

    await updateDoc(doc(db, 'users', targetUid), updateData)

    // Trigger Audit Log
    const { logAuditAction } = await import('@/lib/audit')
    await logAuditAction({
      action: 'APPROVE_USER',
      targetUid: targetUid,
      performedBy: approvedBy || 'system',
      metadata: { newStatus: status, newRole: role }
    })

    return NextResponse.json({
      message: 'User status updated successfully',
      uid: targetUid,
      status: status || 'approved',
    })
  } catch (error: any) {
    console.error('Approve user error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'User approval API',
    usage: 'POST with { uid?, email?, status?, approvedBy? }',
  })
}