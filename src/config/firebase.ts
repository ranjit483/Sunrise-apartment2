import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'
import { getFirestore, Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB8RQB-IAJGc0iSyeMS3VjfECMiE5t4MfI",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "sunrise-appartmant.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "sunrise-appartmant",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "sunrise-appartmant.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "679939076051",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:679939076051:web:637846465e14c1baa54926",
}

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig)
const auth: Auth = getAuth(app)
const db: Firestore = getFirestore(app)

export { app, auth, db }