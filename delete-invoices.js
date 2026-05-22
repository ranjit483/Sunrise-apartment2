const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

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
const auth = getAuth(app);

async function deleteAllInvoices() {
  try {
    console.log("Signing in as super admin...");
    await signInWithEmailAndPassword(auth, "ranjitmanaraja@gmail.com", "1234@manaR#");
    console.log("Signed in successfully.");

    console.log("Fetching invoices...");
    const invoicesRef = collection(db, 'invoices');
    const snapshot = await getDocs(invoicesRef);
    
    if (snapshot.empty) {
      console.log('No invoices found.');
      return;
    }
    
    let count = 0;
    for (const d of snapshot.docs) {
      await deleteDoc(doc(db, 'invoices', d.id));
      count++;
    }
    console.log(`Successfully deleted ${count} invoices.`);
  } catch (error) {
    console.error("Error deleting invoices:", error);
  }
}

deleteAllInvoices();
