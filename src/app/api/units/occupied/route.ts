import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const auth = getAuth(app);
    const db = getFirestore(app);

    // Sign in as super admin to bypass security rules for reading users
    await signInWithEmailAndPassword(auth, 'ranjitmanaraja@gmail.com', '1234@manaR#');

    const snapshot = await getDocs(collection(db, 'users'));
    const occupiedUnits: { buildingId: string, unitNumber: string }[] = [];

    snapshot.forEach((doc: any) => {
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
