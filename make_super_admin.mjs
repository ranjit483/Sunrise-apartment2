import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB8RQB-IAJGc0iSyeMS3VjfECMiE5t4MfI",
  authDomain: "sunrise-appartmant.firebaseapp.com",
  projectId: "sunrise-appartmant",
  storageBucket: "sunrise-appartmant.firebasestorage.app",
  messagingSenderId: "679939076051",
  appId: "1:679939076051:web:637846465e14c1baa54926"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const email = "ranjitmanaraja@gmail.com";

async function run() {
  console.log(`Looking for user with email ${email}...`);
  const q = query(collection(db, 'users'), where('email', '==', email));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    console.log("User document not found in Firestore. Please sign in with Google once to create the account, then run this script again.");
    process.exit(1);
  }

  const userDoc = snapshot.docs[0];
  console.log(`Found user ${userDoc.id}. Making them SUPER_ADMIN...`);
  
  await updateDoc(doc(db, 'users', userDoc.id), {
    role: 'SUPER_ADMIN',
    clearance_level: 1,
    status: 'approved'
  });
  
  console.log("Successfully granted SUPER_ADMIN rights!");
  process.exit(0);
}

run();
