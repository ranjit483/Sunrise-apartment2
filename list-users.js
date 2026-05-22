/**
 * Script to list all users in Firestore
 * Run with: node list-users.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function listUsers() {
  try {
    console.log('Fetching users from Firestore...\n');
    
    const querySnapshot = await getDocs(collection(db, 'users'));
    
    if (querySnapshot.empty) {
      console.log('No users found in Firestore.');
      return;
    }

    console.log('Users in Firestore:\n');
    console.log('=' .repeat(80));
    
    querySnapshot.forEach((doc) => {
      const user = doc.data();
      console.log(`ID: ${doc.id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.fullName}`);
      console.log(`  Phone: ${user.phone}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  Status: ${user.status}`);
      console.log(`  Created: ${user.createdAt}`);
      console.log('-'.repeat(80));
    });

    console.log(`\nTotal users: ${querySnapshot.size}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

listUsers();