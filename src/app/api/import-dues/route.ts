import { NextResponse } from 'next/server';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import * as xlsx from 'xlsx';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'sunrise Due Details soft.xlsx');
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[1]; // Sheet2
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    const duesByUnit: Record<string, number> = {};

    // Row 4 onwards are data rows (index 3 onwards)
    // ['A', 'A-0', 'Renu Malik', 0]
    for (let i = 4; i < data.length; i++) {
      const row = data[i] as any[];
      if (row && row.length >= 4) {
        let unitNo = row[1]?.toString().trim();
        let dueStr = row[3];
        let dueAmount = parseFloat(dueStr);
        if (isNaN(dueAmount)) dueAmount = 0;

        if (unitNo) {
          // In db, unit numbers might not have the block prefix, or they might. Let's store by what's in the excel.
          duesByUnit[unitNo] = dueAmount;
        }
      }
    }

    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    const updates = [];
    const notFoundUnits = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const unitNumber = userData.unitNumber;
      
      if (unitNumber && duesByUnit.hasOwnProperty(unitNumber)) {
        const due = duesByUnit[unitNumber];
        updates.push({
          id: userDoc.id,
          unitNumber,
          due,
          name: userData.fullName
        });
        
        // await updateDoc(doc(db, 'users', userDoc.id), {
        //   previousPendingOutstandingDue: due
        // });
      } else if (unitNumber) {
        notFoundUnits.push(unitNumber);
      }
    }

    return NextResponse.json({
      success: true,
      totalExcelRecords: Object.keys(duesByUnit).length,
      matchedUsers: updates.length,
      updates,
      notFoundUnits,
      sampleDues: Object.entries(duesByUnit).slice(0, 5)
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
