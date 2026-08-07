const fs = require('fs');

const path = 'src/app/invoices/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldVariationsCode = `      const variations = [
        targetMonthStr, 
        invoiceMonth, 
        invoiceMonth.replace('Asadha', 'Asadh'), 
        invoiceMonth.replace('Asadh', 'Asadha'),
        invoiceMonth.replace('Ashadh', 'Asadh'),
        invoiceMonth.replace('Ashadha', 'Asadh'),
        invoiceMonth.replace('Asadh', 'Ashadh'),
        invoiceMonth.replace('Asadha', 'Ashadh'),
        invoiceMonth.replace('Jestha', 'Jesth'),
        invoiceMonth.replace('Jesth', 'Jestha')
      ].filter(Boolean);`;

const newVariationsCode = `      const base = invoiceMonth.trim();
      const parts = base.split(' ');
      let monthPart = parts[0];
      let yearPart = parts[1] || '';

      let normalized = [monthPart];
      if (monthPart.toLowerCase().includes('asad')) {
        normalized = ['Asadh', 'Asadha', 'Ashadh', 'Ashadha'];
      } else if (monthPart.toLowerCase().includes('jest')) {
        normalized = ['Jesth', 'Jestha'];
      } else if (monthPart.toLowerCase().includes('bais')) {
        normalized = ['Baishakh', 'Baisakh'];
      } else if (monthPart.toLowerCase().includes('shraw')) {
        normalized = ['Shrawan', 'Sawan'];
      } else if (monthPart.toLowerCase().includes('bhad')) {
        normalized = ['Bhadra', 'Bhadau'];
      }

      let rawVariations = [targetMonthStr, base];
      normalized.forEach(n => {
        rawVariations.push(n);
        if (yearPart) {
          rawVariations.push(\`\${n} \${yearPart}\`);
        } else {
          rawVariations.push(\`\${n} 2083\`);
          rawVariations.push(\`\${n} 2084\`);
          rawVariations.push(\`\${n} 2026\`);
        }
      });
      const variations = Array.from(new Set(rawVariations)).filter(Boolean);`;

if (content.includes(oldVariationsCode)) {
  content = content.replace(oldVariationsCode, newVariationsCode);
  fs.writeFileSync(path, content, 'utf8');
  console.log('Variations code updated successfully!');
} else {
  console.log('Old variations code not found.');
}
