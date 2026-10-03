require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

let credential = admin.credential.applicationDefault();

if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
  let privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.slice(1, -1);
  } else if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
    privateKey = privateKey.slice(1, -1);
  }
  
  credential = admin.credential.cert({
    projectId,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL.replace(/^"|"$/g, '').replace(/^'|'$/g, ''),
    privateKey: privateKey,
  });
}

if (!admin.apps.length) {
  admin.initializeApp({ credential, projectId });
}

const db = admin.firestore();

async function fixDrafts() {
  const invoicesSnap = await db.collection('invoices').where('status', '==', 'draft').get();
  
  if (invoicesSnap.empty) {
    console.log('No draft invoices found.');
    return;
  }
  
  const allInvoicesSnap = await db.collection('invoices').get();
  const allInvoices = [];
  allInvoicesSnap.forEach(doc => allInvoices.push({ id: doc.id, ...doc.data() }));

  const batch = db.batch();
  let count = 0;

  invoicesSnap.forEach(draftDoc => {
    const draft = draftDoc.data();
    const tenantId = draft.tenantId;
    
    const userPriorInvoices = allInvoices.filter(i => 
      (i.tenantId === tenantId) && 
      i.id !== draftDoc.id && 
      new Date(i.createdAt).getTime() < new Date(draft.createdAt).getTime()
    );

    let prevDueCalculated = 0;
    
    // Sum up any unpaid from prior invoices
    const unpaidInvoices = userPriorInvoices.filter(i => {
      if (['pending', 'overdue', 'partial', 'carried_forward'].includes(i.status)) return true;
      if (i.status === 'paid') {
        const iTotal = i.amount + (i.electricityAmount || 0) + (i.generatorAmount || 0) + (i.utilityAmount || 0) + (i.waterAmount || 0) + (i.insuranceAmount || 0) + (i.dieselAmount || 0) + (i.structureMaintenanceAmount || 0) + (i.otherAmount || 0) + (i.previousPendingOutstandingDue || 0) + (i.latePenaltyAmount || 0) + (i.electricityVatAmount || 0);
        return (i.paidAmount || 0) > iTotal;
      }
      return false;
    });

    for (const oldInv of unpaidInvoices) {
      const iTotal = oldInv.amount + (oldInv.electricityAmount || 0) + (oldInv.generatorAmount || 0) + (oldInv.utilityAmount || 0) + (oldInv.waterAmount || 0) + (oldInv.insuranceAmount || 0) + (oldInv.dieselAmount || 0) + (oldInv.structureMaintenanceAmount || 0) + (oldInv.otherAmount || 0) + (oldInv.previousPendingOutstandingDue || 0) + (oldInv.latePenaltyAmount || 0) + (oldInv.electricityVatAmount || 0);
      prevDueCalculated += (iTotal - (oldInv.paidAmount || 0));
    }

    const correctPrevDue = userPriorInvoices.length === 0 ? (draft.previousPendingOutstandingDue || 0) : prevDueCalculated;
    const finalLatePenalty = correctPrevDue === 0 ? 0 : draft.latePenaltyAmount; 

    if (draft.previousPendingOutstandingDue !== correctPrevDue || draft.latePenaltyAmount !== finalLatePenalty) {
      console.log(`Fixing Draft ${draft.id} for ${draft.unitNumber} - Old Due: ${draft.previousPendingOutstandingDue}, New Due: ${correctPrevDue}`);
      batch.update(draftDoc.ref, {
        previousPendingOutstandingDue: correctPrevDue,
        latePenaltyAmount: finalLatePenalty
      });
      count++;
    }
  });

  if (count > 0) {
    await batch.commit();
    console.log(`Successfully fixed ${count} draft invoices.`);
  } else {
    console.log('All draft invoices are already correct.');
  }
}

fixDrafts().catch(console.error);
