import { NextResponse } from 'next/server';
import { adminDb } from '@/config/firebase-admin';

export async function GET() {
  try {
    const invoicesSnap = await adminDb.collection('invoices').get();
    const allInvoices: any[] = [];
    const draftDocs: any[] = [];
    
    invoicesSnap.forEach(doc => {
      const data = { id: doc.id, ...doc.data() };
      allInvoices.push(data);
      if (data.status === 'draft') {
        draftDocs.push({ doc, data });
      }
    });

    if (draftDocs.length === 0) {
      return NextResponse.json({ success: true, message: 'No draft invoices found.' });
    }

    const batch = adminDb.batch();
    let count = 0;

    for (const { doc: draftDoc, data: draft } of draftDocs) {
      const tenantId = draft.tenantId;
      
      const userPriorInvoices = allInvoices.filter(i => 
        (i.tenantId === tenantId) && 
        i.id !== draft.id && 
        (new Date(i.createdAt).getTime() < new Date(draft.createdAt).getTime() || i.status !== 'draft')
      );

      let prevDueCalculated = 0;
      
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
        batch.update(draftDoc.ref, {
          previousPendingOutstandingDue: correctPrevDue,
          latePenaltyAmount: finalLatePenalty
        });
        count++;
      }
    }

    if (count > 0) {
      await batch.commit();
      return NextResponse.json({ success: true, fixedCount: count });
    } else {
      return NextResponse.json({ success: true, message: 'All draft invoices are already correct.', fixedCount: 0 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
