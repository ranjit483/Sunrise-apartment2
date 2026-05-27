import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // If the service account is not provided, we can't fetch securely, so return empty array
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      return NextResponse.json({ occupiedUnits: [] });
    }

    const { adminDb } = await import('@/config/firebase-admin');
    
    const snapshot = await adminDb.collection('users').get();
    const occupiedUnits: { buildingId: string, unitNumber: string }[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.buildingId && data.unitNumber) {
        occupiedUnits.push({
          buildingId: data.buildingId,
          unitNumber: data.unitNumber
        });
      }
    });

    return NextResponse.json({ occupiedUnits });
  } catch (error: any) {
    console.error('Error fetching occupied units:', error);
    // On error, return empty array so UI doesn't crash
    return NextResponse.json({ occupiedUnits: [] });
  }
}
