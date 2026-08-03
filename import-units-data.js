const xlsx = require('./temp_excel/node_modules/xlsx');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, updateDoc, collection, getDocs, setDoc, query, where } = require('firebase/firestore');
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

function formatEmail(name, unit) {
  const firstName = name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanUnit = unit.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${firstName}${cleanUnit}@sunrise.com`;
}

async function run() {
  console.log('Signing in as Super Admin...');
  await signInWithEmailAndPassword(auth, "ranjitmanaraja@gmail.com", "1234@manaR#");
  console.log('Signed in successfully.');

  console.log('Loading Excel file...');
  const workbook = xlsx.readFile('sunrisesoft.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);

  console.log(`Found ${data.length} rows in Excel.`);

  // 1. Fetch buildings to get their IDs
  const buildingsSnapshot = await getDocs(collection(db, 'buildings'));
  const buildingsMap = {};
  buildingsSnapshot.forEach(doc => {
    const b = doc.data();
    buildingsMap[b.name] = b.id;
  });

  // Map "A" -> "Tower A", "BI" -> "Tower B I", "BII" -> "Tower B II", "B-I" -> "Tower B I", etc.
  const getBuildingName = (towerStr) => {
    if (!towerStr) return null;
    const t = String(towerStr).trim().toUpperCase();
    if (t === 'A') return 'Tower A';
    if (t === 'BI' || t === 'B-I' || t === 'B I') return 'Tower B I';
    if (t === 'BII' || t === 'B-II' || t === 'B II') return 'Tower B II';
    return null;
  };

  // 2. Fetch existing units to avoid duplicates if possible
  const unitsSnapshot = await getDocs(collection(db, 'units'));
  const existingUnitsMap = {}; // Key: UnitNumber -> UnitDoc
  unitsSnapshot.forEach(doc => {
    const u = doc.data();
    existingUnitsMap[u.unitNumber] = { id: doc.id, ...u };
  });

  // 3. Process each row
  let createdUnits = 0;
  let updatedUnits = 0;
  let createdUsers = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row['Unit'] || !row['Tower']) continue;

    const unitNumber = String(row['Unit']).trim();
    const towerStr = String(row['Tower']).trim();
    const ownerName = row["Owner's Name"] ? String(row["Owner's Name"]).trim() : '';
    const area = parseFloat(row['Area(Sq.ft.)']) || 0;
    const rent = Math.round(area * 1.75);

    const bName = getBuildingName(towerStr);
    const buildingId = bName ? buildingsMap[bName] : null;

    if (!buildingId) {
      console.log(`Warning: Could not find building ID for tower '${towerStr}' on unit ${unitNumber}`);
      continue;
    }

    let unitId;

    if (existingUnitsMap[unitNumber]) {
      // Update existing
      unitId = existingUnitsMap[unitNumber].id;
      await updateDoc(doc(db, 'units', unitId), {
        buildingId: buildingId,
        area: area,
        rent: rent,
        tenantName: ownerName || null,
        status: ownerName ? 'occupied' : 'vacant',
        type: '3 BHK', // default
        updatedAt: new Date().toISOString()
      });
      updatedUnits++;
    } else {
      // Create new
      const unitRef = doc(collection(db, 'units'));
      unitId = unitRef.id;
      await setDoc(unitRef, {
        id: unitId,
        buildingId: buildingId,
        unitNumber: unitNumber,
        type: '3 BHK', // default
        floor: parseInt(unitNumber.split('-')[1]) || 1,
        area: area,
        rent: rent,
        status: ownerName ? 'occupied' : 'vacant',
        tenantName: ownerName || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      createdUnits++;
      existingUnitsMap[unitNumber] = { id: unitId }; // update cache
    }

    // Create resident user if ownerName exists
    if (ownerName && ownerName.toLowerCase() !== 'flat' && ownerName.toLowerCase() !== 'sunrisesoft' && ownerName !== '-') {
      const email = formatEmail(ownerName, unitNumber);
      
      // Check if user with this email or unit already exists
      const userQ = query(collection(db, 'users'), where('email', '==', email));
      const userSnap = await getDocs(userQ);
      
      if (userSnap.empty) {
        const userRef = doc(collection(db, 'users'));
        await setDoc(userRef, {
          uid: userRef.id,
          email: email,
          fullName: ownerName,
          phone: '',
          role: 'OWNER',
          status: 'approved',
          unitNumber: unitNumber,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        createdUsers++;
      }
    }
  }

  console.log('Import completed successfully!');
  console.log(`Units created: ${createdUnits}`);
  console.log(`Units updated: ${updatedUnits}`);
  console.log(`Resident Users created: ${createdUsers}`);
  process.exit(0);
}

run().catch(console.error);
