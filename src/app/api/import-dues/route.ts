import { NextResponse } from 'next/server';
import { db as clientDb } from '@/config/firebase';
import { adminDb } from '@/config/firebase-admin';
import { collection, getDocs, updateDoc, doc, writeBatch } from 'firebase/firestore';
import * as xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';

const defaultDuesData: Record<string, number> = {
  "A-0": 0, "B-0": 18791, "A-1": 5829, "B-1": 0, "C-1": 14444, "D-1": 64544, "E-1": 738,
  "A-2": 0, "B-2": 0, "C-2": 1001, "D-2": 0, "E-2": 0, "A-3": 0, "B-3": 0, "C-3": 0,
  "D-3": 0, "E-3": 0, "A-4": 0, "B-4": 5462, "C-4": 19622, "D-4": 7781, "E-4": 0,
  "A-5": 0, "B-5": 0, "C-5": 0, "D-5": 14510, "E-5": 0, "A-6": 0, "B-6": 0, "C-6": 6491,
  "D-6": 15763, "E-6": 0, "A-7": 8458, "B-7": 0, "C-7": 0, "D-7": 7781, "E-7": 0,
  "A-8": 0, "B-8": 7633, "C-8": 0, "D-8": 0, "E-8": 0, "A-9": 0, "B-9": 0, "C-9": 0,
  "D-9": 4109, "A-10": 11564, "B-10": 7633, "C-10": 0, "D-10": 4529, "E-10": 0,
  "C-11": 14627, "D-11": 16588, "E-11": 16326, "D-12": 0, "E-12": 0,
  "G-1": 0, "H-1": 50689, "I-1": 0, "J-1": 0, "K-1": 8361, "G-2": 0, "H-2": 0, "I-2": 0,
  "J-2": 0, "K-2": 0, "L2-2": 0, "G-3": 6967, "H-3": 0, "I-3": 7631, "J-3": 15827,
  "G-4": 0, "H-4": 0, "I-4": 0, "J-4": 10514, "K-4": 0, "L2-4": 11950, "G-5": 28718,
  "H-5": 0, "I-5": 104912, "J-5": 0, "K-5": 11420, "L1-5": 0, "L2-5": 1925, "G-6": 0,
  "H-6": 38444, "I-6": 0, "J-6": 0, "K-6": 0, "L1-6": 4116, "L2-6": 0, "F-7": 0,
  "G-7": 60205, "H-7": 7609, "I-7": 0, "J-7": 0, "L2-7": 0, "G-8": 14772, "H-8": 3640,
  "I-8": 0, "J-8": 23546, "K-8": 0, "L1-8": 0, "L2-8": -50, "F-9": 15390, "G-9": 21079,
  "H-9": 0, "I-9": 12299, "J-9": -8, "K-9": -1, "L1-9": 5788, "L2-9": -6173, "F-10": 0,
  "G-10": 11143, "H-10": 17818, "I-10": 25385, "J-10": 0, "L1-10": 3788, "L2-10": 0,
  "F-11": 0, "G-11": 19192, "H-11": 0, "I-11": 38175, "J-11": 0, "L1-11": 13875,
  "L2-11": 0, "F-12": 0, "G-12": 0, "H-12": 14777, "I-12": 6364, "J-12": 22340,
  "L1-12": 0, "L2-12": 10038, "F-13": 0, "G-13": 0, "H-13": 0, "I-13": 11906,
  "J-13": 4454, "K-13": 40876, "L1-13": 0, "L2-13": 0, "F-14": 28972, "G-14": 0,
  "H-14": 0, "I-14": 5333, "J-14": 0, "K-14": 6573,
  "N-1": 10717, "O1-1": -1, "O2-1": 10816, "P1-1": 0, "Q-1": 0, "M-2": 9480,
  "N-2": 9555, "O1-2": 0, "O2-2": 4573, "P1-2": 36705, "Q-2": 6119, "M-3": 49,
  "N-3": 0, "O1-3": 47, "O2-3": 0, "P1-3": 0, "Q-3": 22796, "M-4": 3138,
  "N-4": 2571, "O1-4": 51096, "O2-4": 0, "P1-4": 6028, "P2-4": 0, "Q-4": 14139,
  "M-5": 0, "N-5": 0, "O1-5": 0, "O2-5": 2499, "P1-5": 0, "Q-5": 0, "M-6": 0,
  "N-6": 6203, "O1-6": 20, "O2-6": 2079, "P-6": 0, "Q-6": 46947, "M-7": 0,
  "N-7": 50405, "O1-7": 0, "O2-7": 93773, "P1-7": 0, "P2-7": 3329, "Q-7": 15281,
  "M-8": 0, "N-8": 0, "O1-8": -30216.32, "O2-8": 13231, "P1-8": 0, "P2-8": 0,
  "Q-8": 0, "M-9": 0, "N-9": -83, "O1-9": 11504, "O2-9": 0, "P1-9": 7919,
  "P2-9": 3357, "Q-9": 10235, "M-10": 3222, "N-10": 3313, "O1-10": 0,
  "O2-10": 14008, "P1-10": 0, "P2-10": 0, "Q-10": 0, "M-11": 5507, "N-11": 9555,
  "O1-11": 1598, "O2-11": 7872, "P-11": 12648, "Q-11": 0, "M-12": -102.76,
  "N-12": 18122, "O1-12": 6234, "O2-12": 0, "P1-12": 12999, "Q-12": 418115,
  "M-13": 0, "N-13": 2571, "O1-13": 8302, "O2-13": 3150, "P1-13": 0,
  "Q-13": 6641, "M-14": 56890, "N-14": 9868, "O1-14": 0, "O2-14": 0,
  "P1-14": 0, "Q-14": 184
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
