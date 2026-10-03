import { NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';

export async function GET() {
  try {
    const invoicesSnap = await adminDb.collection('invoices').where('unitNumber', '==', 'A-0').get();
    const invs: any[] = [];
    invoicesSnap.forEach(doc => invs.push({id: doc.id, ...doc.data()}));
    return NextResponse.json(invs);
  } catch(e: any) {
    return NextResponse.json({error: e.message});
  }
}
