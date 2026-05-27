import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    // 1. Sign in via REST API
    const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email: 'ranjitmanaraja@gmail.com', 
        password: '1234@manaR#', 
        returnSecureToken: true 
      }),
      cache: 'no-store'
    });
    const authData = await authRes.json();
    
    if (!authData.idToken) {
      console.error('REST Auth failed:', authData);
      return NextResponse.json({ occupiedUnits: [] });
    }

    // 2. Fetch users via Firestore REST API
    const dbRes = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users`, {
      headers: { 'Authorization': `Bearer ${authData.idToken}` },
      cache: 'no-store'
    });
    const dbData = await dbRes.json();
    
    const occupiedUnits: { buildingId: string, unitNumber: string }[] = [];

    if (dbData.documents) {
      dbData.documents.forEach((doc: any) => {
        if (doc.fields && doc.fields.buildingId && doc.fields.unitNumber) {
          const buildingId = doc.fields.buildingId.stringValue;
          const unitNumber = doc.fields.unitNumber.stringValue;
          if (buildingId && unitNumber) {
            occupiedUnits.push({ buildingId, unitNumber });
          }
        }
      });
    }

    return NextResponse.json({ occupiedUnits });
  } catch (error: any) {
    console.error('Error fetching occupied units via REST:', error);
    return NextResponse.json({ occupiedUnits: [] });
  }
}
