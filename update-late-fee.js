const fs = require('fs');

const path = 'src/app/invoices/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add lateFeePercent setting
content = content.replace(
  "const otherFlatFee = settingsData.otherChargesFlatFee || 0",
  "const otherFlatFee = settingsData.otherChargesFlatFee || 0\n      const lateFeePercent = settingsData.lateFeePercent || 0"
);

// 2. Add latePenaltyAmount logic in handleGenerateDrafts
content = content.replace(
  "const gAmount = readingData?.generator ? readingData.generator.totalBill : 0;",
  "const gAmount = readingData?.generator ? readingData.generator.totalBill : 0;\n\n        const prevDue = user.previousPendingOutstandingDue || 0;\n        const latePenaltyAmount = Math.round(prevDue * (lateFeePercent / 100));"
);

// 3. Add to batch.set
content = content.replace(
  "previousPendingOutstandingDue: user.previousPendingOutstandingDue || 0,",
  "previousPendingOutstandingDue: prevDue,\n          latePenaltyAmount: latePenaltyAmount,"
);

// 4. Update all total sum calculations
// They have various variable names: invoice, payingInvoice, i, inv, viewingInvoice
content = content.replace(/\+ \(invoice\.previousPendingOutstandingDue \|\| 0\)/g, "+ (invoice.previousPendingOutstandingDue || 0) + (invoice.latePenaltyAmount || 0)");
content = content.replace(/\+ \(payingInvoice\.previousPendingOutstandingDue \|\| 0\)/g, "+ (payingInvoice.previousPendingOutstandingDue || 0) + (payingInvoice.latePenaltyAmount || 0)");
content = content.replace(/\+ \(i\.previousPendingOutstandingDue \|\| 0\)/g, "+ (i.previousPendingOutstandingDue || 0) + (i.latePenaltyAmount || 0)");
content = content.replace(/\+ \(inv\.previousPendingOutstandingDue \|\| 0\)/g, "+ (inv.previousPendingOutstandingDue || 0) + (inv.latePenaltyAmount || 0)");
content = content.replace(/\+ \(viewingInvoice\.previousPendingOutstandingDue \|\| 0\)/g, "+ (viewingInvoice.previousPendingOutstandingDue || 0) + (viewingInvoice.latePenaltyAmount || 0)");

// 5. Update UI rendering of late penalty (Print View)
content = content.replace(
  '<td className="border border-black p-0.5 text-right font-medium align-middle">₨ 0.00</td>',
  '<td className="border border-black p-0.5 text-right font-medium align-middle">₨ {(viewingInvoice.latePenaltyAmount || 0).toLocaleString()}</td>'
);

// 6. Update UI rendering of late penalty (Modal View)
content = content.replace(
  '<td className="border border-black p-2 text-right font-medium">₨ 0.00</td>',
  '<td className="border border-black p-2 text-right font-medium">₨ {(viewingInvoice.latePenaltyAmount || 0).toLocaleString()}</td>'
);

fs.writeFileSync(path, content, 'utf8');
console.log('Replacements completed successfully.');
