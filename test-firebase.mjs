import { initializeApp } from 'firebase/app';
import { getFirestore, doc } from 'firebase/firestore';

try {
  const app = initializeApp({
    apiKey: undefined,
    projectId: undefined,
  });
  console.log('App initialized');
  const db = getFirestore(app);
  console.log('Firestore initialized', typeof db, db ? db.type : '');
  
  const ref = doc(db, 'users', '123');
  console.log('Doc created', ref.path);
} catch (e) {
  console.error('Error:', e.message);
}
