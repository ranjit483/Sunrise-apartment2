import * as xlsx from 'xlsx';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from './src/config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function importDues() {
  console.log('Signing in as admin...');
  await signInWithEmailAndPassword(auth, "ranjitmanaraja@gmail.com", "1234@manaR#");
  
  console.log('Loading Excel...');
  const workbook = xlsx.readFile('sunrise Due Details soft.xlsx');
  const sheetName = workbook.SheetNames[1]; // Sheet2
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

  const duesByUnit: Record<string, number> = {};

  for (let i = 4; i < data.length; i++) {
    const row = data[i] as any[];
    if (row && row.length >= 4) {
      let unitNo = row[1]?.toString().trim();
      let dueStr = row[3];
      let dueAmount = parseFloat(dueStr);
      if (isNaN(dueAmount)) dueAmount = 0;

      if (unitNo) {
        duesByUnit[unitNo] = dueAmount;
      }
    }
  }

  console.log(`Found ${Object.keys(duesByUnit).length} unique units with due amounts in Excel.`);
  
  console.log('Fetching users from Firestore...');
  const usersRef = collection(db, 'users');
  const usersSnapshot = await getDocs(usersRef);
  console.log(`Found ${usersSnapshot.size} users in Firestore.`);

  let matched = 0;
  let updated = 0;

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const unitNumber = userData.unitNumber;
    
    if (unitNumber && duesByUnit.hasOwnProperty(unitNumber)) {
      matched++;
      const due = duesByUnit[unitNumber];
      
      console.log(`Updating user ${userData.fullName} (Unit ${unitNumber}) with due amount: Rs ${due}`);
      await updateDoc(doc(db, 'users', userDoc.id), {
        previousPendingOutstandingDue: due
      });
      updated++;
    }
  }

  console.log(`Import complete! Matched ${matched} users and updated ${updated} documents.`);
  process.exit(0);
}

importDues().catch(console.error);
