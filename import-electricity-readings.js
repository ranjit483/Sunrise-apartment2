const xlsx = require('./temp_xlsx/node_modules/xlsx');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, collection, getDocs, setDoc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

// Initialize Firebase
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

async function run() {
  console.log('Signing in as Super Admin...');
  await signInWithEmailAndPassword(auth, "ranjitmanaraja@gmail.com", "1234@manaR#");
  console.log('Signed in successfully.');

  console.log('Loading Excel file...');
  const workbook = xlsx.readFile('unit electricity bill-soft.xlsx');
  const sheetName = workbook.SheetNames[0];
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { range: 1 }); // Skip first row which is just "Asadh 2083"

  console.log(`Found ${data.length} rows in Excel.`);

  // 1. Fetch existing units to map unitNumber -> unitId
  const unitsSnapshot = await getDocs(collection(db, 'units'));
  const existingUnitsMap = {};
  unitsSnapshot.forEach(doc => {
    const u = doc.data();
    existingUnitsMap[u.unitNumber] = u.id;
  });

  // 2. Fetch users to map unitNumber -> userId
  const usersSnapshot = await getDocs(collection(db, 'users'));
  const usersMap = {};
  usersSnapshot.forEach(doc => {
    const u = doc.data();
    if (u.unitNumber) {
      usersMap[u.unitNumber] = doc.id;
    }
  });

  // 3. Process each row
  let createdReadings = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const unitNumber = String(row['Unit No'] || '').trim();
    if (!unitNumber || unitNumber === 'undefined' || unitNumber === '-') continue;

    const currentReading = parseFloat(row['Electricity Current Asadh 2083 (Meter) Unit']) || 0;
    const previousReading = parseFloat(row['Electricity Previous (Meter)Jesth 2083 Unit']) || 0;
    const totalConsumed = parseFloat(row['Electricity charge Unit']) || 0;
    const pricePerUnit = parseFloat(row['Electricity charge Rate']) || 0;
    const totalBill = parseFloat(row['Electricity charge Amount']) || 0;

    const unitId = existingUnitsMap[unitNumber];
    const tenantId = usersMap[unitNumber] || 'unknown';

    if (!unitId) {
      console.log(`Warning: Unit ${unitNumber} not found in database.`);
      continue;
    }

    const readingRef = doc(collection(db, 'electricity_readings'));
    await setDoc(readingRef, {
      id: readingRef.id,
      unitId: unitId,
      tenantId: tenantId,
      meterType: 'city',
      previousReading: previousReading,
      currentReading: currentReading,
      totalConsumed: totalConsumed,
      pricePerUnit: pricePerUnit,
      totalBill: totalBill,
      readingDate: new Date().toISOString(),
      status: 'approved', // Auto-approve seeded records
      month: 'Asadh 2083',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    createdReadings++;
  }

  console.log('Import completed successfully!');
  console.log(`Electricity Readings created: ${createdReadings}`);
  process.exit(0);
}

run().catch(console.error);
