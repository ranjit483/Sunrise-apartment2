const fs = require('fs');
const path = 'c:/Users/cwc/Desktop/opencode/src/app/invoices/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// The regex we used before had $1 evaluated as empty by powershell.
// We need to match: + (invoice.previousPendingOutstandingDue || 0) + (.latePenaltyAmount || 0) + (.electricityVatAmount || 0)
// and replace with: + (invoice.previousPendingOutstandingDue || 0) + (invoice.latePenaltyAmount || 0) + (invoice.electricityVatAmount || 0)

// Let's find all occurrences of `.latePenaltyAmount` and extract the prefix.
content = content.replace(/\+ \(([a-zA-Z0-9_]+)\.previousPendingOutstandingDue \|\| 0\) \+ \(\.latePenaltyAmount \|\| 0\) \+ \(\.electricityVatAmount \|\| 0\)/g, '+ ($1.previousPendingOutstandingDue || 0) + ($1.latePenaltyAmount || 0) + ($1.electricityVatAmount || 0)');

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed syntax errors!');
