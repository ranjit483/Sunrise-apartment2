import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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

const email = "ranjitmanaraja@gmail.com";
const password = "1234@manaR#";

async function run() {
  let user;
  try {
    console.log("Attempting to create user...");
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    user = cred.user;
    console.log("User created successfully with the new password!");
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      console.log("User already exists. Attempting to sign in with the requested password...");
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        user = cred.user;
        console.log("Signed in successfully! The password is correct.");
      } catch (signInErr) {
        console.error("Failed to sign in:", signInErr.code);
        if (signInErr.code === 'auth/invalid-credential') {
            console.log("\nWARNING: The password you provided is WRONG for this email, or the account was created using 'Sign in with Google' and DOES NOT HAVE a password! You must either use Google Sign-In, or reset the password using Firebase Console.");
        }
        process.exit(1);
      }
    } else {
      console.error("Error creating user:", err.message);
      process.exit(1);
    }
  }

  if (user) {
    console.log("Setting SUPER_ADMIN role in Firestore...");
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: email,
      fullName: "Super Admin",
      role: "SUPER_ADMIN",
      clearance_level: 1,
      status: "approved",
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log("Done! Admin role configured.");
  }
  process.exit(0);
}

run();
