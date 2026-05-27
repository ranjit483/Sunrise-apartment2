import * as admin from 'firebase-admin';

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// Parse the service account key if it exists
let credential = admin.credential.applicationDefault();
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    credential = admin.credential.cert(serviceAccount);
  } catch (error) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', error);
  }
}

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential,
      projectId,
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

const adminDb = admin.firestore();

export { adminDb };
