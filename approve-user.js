/**
 * Script to approve a user
 * Run with: node approve-user.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc, collection, getDocs } = require('firebase/firestore');

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

async function approveUser() {
  const email = "ranjitmanaraja@gmail.com";

  try {
    console.log('Searching for user with email:', email);

    // Get all users and find the one with matching email
    const querySnapshot = await getDocs(collection(db, 'users'));
    let foundUser = null;

    querySnapshot.forEach((doc) => {
      const user = doc.data();
      if (user.email === email) {
        foundUser = { id: doc.id, ...user };
      }
    });

    if (!foundUser) {
      console.log('User not found!');
      return;
    }

    console.log('Found user:', foundUser);
    console.log('Current status:', foundUser.status);

    // Update status to approved
    await updateDoc(doc(db, 'users', foundUser.id), {
      status: 'approved',
      approvedAt: new Date().toISOString()
    });

    console.log('✅ User approved successfully!');
    console.log('User ID:', foundUser.id);
    console.log('New Status: approved');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

approveUser();