/**
 * Script to create Super Admin user
 * Run with: node create-super-admin.js
 */

const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyB8RQB-IAJGc0iSyeMS3VjfECMiE5t4MfI",
  authDomain: "sunrise-appartmant.firebaseapp.com",
  projectId: "sunrise-appartmant",
  storageBucket: "sunrise-appartmant.firebasestorage.app",
  messagingSenderId: "679939076051",
  appId: "1:679939076051:web:637846465e14c1baa54926"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createSuperAdmin() {
  const email = "ranjitmanaraja@gmail.com";
  const password = "1234@manaR#";

  try {
    console.log("Creating Super Admin user...");

    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log("User created in Auth:", user.uid);

    // Create Super Admin profile in Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: email,
      fullName: "Super Admin",
      phone: "9841234567",
      role: "SUPER_ADMIN",
      status: "approved",
      unitNumber: null,
      profileImage: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      approvedBy: user.uid,
      approvedAt: new Date().toISOString()
    });

    console.log("✅ Super Admin created successfully!");
    console.log("User ID:", user.uid);
    console.log("Email:", email);
    console.log("Role: SUPER_ADMIN");
    console.log("Status: approved");

  } catch (error) {
    console.error("Error:", error.message);
    if (error.code === "auth/email-already-in-use") {
      console.log("\nUser already exists! Getting existing user...");

      // For existing users, we need to update manually - 
      // please go to Firebase Console > Authentication and delete the user first, then run this script
    }
  }
}

createSuperAdmin();