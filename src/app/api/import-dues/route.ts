import { NextResponse } from 'next/server';
import { db as clientDb } from '@/config/firebase';
import { adminDb } from '@/config/firebase-admin';
import { collection, getDocs, updateDoc, doc, writeBatch } from 'firebase/firestore';
import * as xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

const defaultDuesData: Record<string, number> = {
  "A-0": 3914, "B-0": 0, "A-1": 0, "B-1": 5781, "C-1": -4565, "D-1": 42410, "E-1": 0,
  "A-2": 0, "B-2": 0, "C-2": 6017, "D-2": 0, "E-2": 0, "A-3": 0, "B-3": 0, "C-3": 0,
  "D-3": 0, "E-3": 0, "A-4": 0, "B-4": 0, "C-4": 0, "D-4": 8560, "E-4": 0,
  "A-5": 0, "B-5": 0, "C-5": 0, "D-5": 0, "E-5": 4018, "A-6": 0, "B-6": 0, "C-6": 9635,
  "D-6": 0, "E-6": 0, "A-7": 0, "B-7": 0, "C-7": 0, "D-7": 8559, "E-7": 0,
  "A-8": 0, "B-8": 4098, "C-8": 0, "D-8": 0, "E-8": 0, "A-9": 6198, "B-9": 1075,
  "C-9": 0, "D-9": 0, "A-10": 10398, "B-10": 11506, "C-10": 0, "D-10": 0, "E-10": 3866,
  "C-11": 19285, "D-11": 0, "E-11": 24645, "D-12": 0, "E-12": 0,
  "G-1": 0, "H-1": 57565, "I-1": 0, "J-1": 0, "K-1": 15017, "G-2": 0, "H-2": 0, "I-2": 6072,
  "J-2": 6134, "K-2": 0, "L2-2": 2144, "G-3": 0, "H-3": 8764, "I-3": 0, "J-3": 21341,
  "G-4": 0, "H-4": 0, "I-4": 0, "J-4": 4434, "K-4": 0, "L2-4": 0, "G-5": 22579,
  "H-5": 0, "I-5": 111911, "J-5": 0, "K-5": 0, "L1-5": 0, "L2-5": 0, "G-6": 0,
  "H-6": 45138, "I-6": 0, "J-6": 0, "K-6": 0, "L1-6": -1423, "L2-6": 0, "F-7": 3420,
  "G-7": 67092, "H-7": 8369, "I-7": 7830.6, "J-7": 0, "L2-7": 0, "G-8": 0, "H-8": 0,
  "I-8": 0, "J-8": 9996, "K-8": 0, "L1-8": 2433, "L2-8": 0, "F-9": 6542, "G-9": 24879,
  "H-9": 4195, "I-9": 15982, "J-9": 0, "K-9": 0, "L1-9": -2914, "L2-9": -6173, "F-10": 0,
  "G-10": 0, "H-10": 0, "I-10": -7831, "J-10": 4135, "L1-10": 0, "L2-10": 0,
  "F-11": 0, "G-11": 0, "H-11": 0, "I-11": 44674, "J-11": 0, "L1-11": 15878,
  "L2-11": 0, "F-12": 3353, "G-12": 0, "H-12": 6829, "I-12": 6135, "J-12": 4397,
  "L1-12": 0, "L2-12": 12384, "F-13": 6696, "G-13": -4, "H-13": 0, "I-13": 15646,
  "J-13": 0, "K-13": 46889, "L1-13": 0, "L2-13": 0, "F-14": 33970, "G-14": 4615,
  "H-14": 5119, "I-14": 11932, "J-14": 0, "K-14": 0,
  "N-1": 2920, "O1-1": 0, "O2-1": 0, "P1-1": 0, "Q-1": 0, "M-2": 12083,
  "N-2": 0, "O1-2": 0, "O2-2": 4664, "P1-2": -8308, "Q-2": 10574, "M-3": 0,
  "N-3": 0, "O1-3": 0, "O2-3": 0, "P1-3": 0, "Q-3": 0, "M-4": 0,
  "N-4": -2020, "O1-4": 53998, "O2-4": 0, "P1-4": 8503, "P2-4": 0, "Q-4": 0,
  "M-5": 0, "N-5": 0, "O1-5": 0, "O2-5": 0, "P1-5": 0, "Q-5": 3718, "M-6": 4684,
  "N-6": 0, "O1-6": 0, "O2-6": 0, "P-6": 0, "Q-6": 49581, "M-7": 0,
  "N-7": 55873, "O1-7": 0, "O2-7": 98828, "P1-7": 0, "P2-7": 6262, "Q-7": 0,
  "M-8": 0, "N-8": 0, "O1-8": -28619, "O2-8": 15869, "P1-8": 3214, "P2-8": 0,
  "Q-8": 0, "M-9": 2466, "N-9": 0, "O1-9": -3534, "O2-9": 0, "P1-9": 2610,
  "P2-9": 2701, "Q-9": 0, "M-10": 6693, "N-10": 0, "O1-10": 0, "O2-10": 0,
  "P1-10": 0, "P2-10": 0, "Q-10": 0, "M-11": 10721, "N-11": 12876, "O1-11": 3227,
  "O2-11": 10999, "P-11": 20242, "Q-11": 0, "M-12": 2310, "N-12": 23461,
  "O1-12": 8261, "O2-12": 0, "P1-12": 0, "Q-12": 431618, "M-13": 4163,
  "N-13": 0, "O1-13": 2754, "O2-13": 3465, "P1-13": 0, "Q-13": 4524,
  "M-14": 62133, "N-14": 13195, "O1-14": 0, "O2-14": 1727, "P1-14": 1717,
  "Q-14": 0
};

export async function GET() {
  return handleImport();
}

export async function POST() {
  return handleImport();
}

async function handleImport() {
  try {
    const duesByUnit: Record<string, number> = {};

    // 1. Load defaults first
    Object.entries(defaultDuesData).forEach(([u, due]) => {
      duesByUnit[u.trim().toUpperCase()] = due;
    });

    // 2. Try reading from Excel file if present
    const filePath = path.join(process.cwd(), 'sunrise Due Details soft.xlsx');
    if (fs.existsSync(filePath)) {
      try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[1] || workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

        for (let i = 0; i < data.length; i++) {
          const row = data[i] as any[];
          if (row && row.length >= 4) {
            let unitNo = row[1]?.toString().trim();
            let dueStr = row[3];
            let dueAmount = parseFloat(dueStr);
            if (unitNo && !isNaN(dueAmount)) {
              duesByUnit[unitNo.toUpperCase()] = dueAmount;
            }
          }
        }
      } catch (e) {
        console.error('Error reading excel file:', e);
      }
    }

    const userUpdatesCount = { matched: 0, updated: 0 };
    const invoiceUpdatesCount = { matched: 0, updated: 0 };

    if (adminDb) {
      // Update Users
      const usersSnap = await adminDb.collection('users').get();
      const userPromises: Promise<any>[] = [];

      usersSnap.forEach((userDoc: any) => {
        const uData = userDoc.data();
        const unitNo = (uData.unitNumber || uData.unit || '').toString().trim().toUpperCase();
        if (unitNo && duesByUnit.hasOwnProperty(unitNo)) {
          const due = duesByUnit[unitNo];
          userPromises.push(userDoc.ref.update({ previousPendingOutstandingDue: due }));
          userUpdatesCount.matched++;
        }
      });
      if (userPromises.length > 0) {
        await Promise.all(userPromises);
        userUpdatesCount.updated = userPromises.length;
      }

      // Update Invoices (specifically Asadh 2083 or all invoices)
      const invoicesSnap = await adminDb.collection('invoices').get();
      const invPromises: Promise<any>[] = [];

      invoicesSnap.forEach((invDoc: any) => {
        const invData = invDoc.data();
        const m = (invData.month || '').toString().toLowerCase();
        if (m.includes('asadh') || m.includes('2083')) {
          const unitNo = (invData.unitNumber || invData.unitId || '').toString().trim().toUpperCase();
          if (unitNo && duesByUnit.hasOwnProperty(unitNo)) {
            const due = duesByUnit[unitNo];
            invPromises.push(invDoc.ref.update({ previousPendingOutstandingDue: due }));
            invoiceUpdatesCount.matched++;
          }
        }
      });
      if (invPromises.length > 0) {
        await Promise.all(invPromises);
        invoiceUpdatesCount.updated = invPromises.length;
      }
    } else {
      // Client SDK fallback
      const usersSnap = await getDocs(collection(clientDb, 'users'));
      const batch = writeBatch(clientDb);
      usersSnap.forEach((userDoc: any) => {
        const uData = userDoc.data();
        const unitNo = (uData.unitNumber || '').toString().trim().toUpperCase();
        if (unitNo && duesByUnit.hasOwnProperty(unitNo)) {
          const due = duesByUnit[unitNo];
          batch.update(doc(clientDb, 'users', userDoc.id), { previousPendingOutstandingDue: due });
          userUpdatesCount.updated++;
        }
      });
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      message: 'Previous dues updated successfully for users and invoices!',
      userUpdatesCount,
      invoiceUpdatesCount,
      totalUnits: Object.keys(duesByUnit).length
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
