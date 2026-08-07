const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./firebase-service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function run() {
  const q = await db.collection('users').where('unitNumber', '==', 'O2-1').get();
  q.forEach(doc => console.log('Mamata user:', doc.data()));
  
  const q2 = await db.collection('invoices').orderBy('createdAt', 'desc').limit(2).get();
  q2.forEach(doc => console.log('Latest invoice:', doc.id, doc.data()));
  
  process.exit(0);
}
run().catch(console.error);
