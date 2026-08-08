import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import * as firestore from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = firestore.getFirestore(app)

const firestoreFunctions = {
  doc: firestore.doc,
  getDoc: firestore.getDoc,
  setDoc: firestore.setDoc,
  updateDoc: firestore.updateDoc,
  collection: firestore.collection,
  query: firestore.query,
  where: firestore.where,
  orderBy: firestore.orderBy,
  onSnapshot: firestore.onSnapshot
}

export { app, auth, db, firestoreFunctions as firestore }