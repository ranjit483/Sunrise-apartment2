const fs = require('fs');
const files = [
  'buildings/page.tsx', 
  'complaints/page.tsx', 
  'dashboard/users/approve/page.tsx', 
  'expenses/page.tsx', 
  'invoices/page.tsx', 
  'leases/page.tsx', 
  'maintenance/page.tsx', 
  'parking/page.tsx', 
  'payments/page.tsx', 
  'staff/page.tsx', 
  'units/page.tsx', 
  'users/page.tsx', 
  'visitors/page.tsx'
];

files.forEach(f => {
  const p = 'src/app/' + f;
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(/<table className="w-full">/g, '<div className="overflow-x-auto overflow-y-hidden"><table className="w-full min-w-[800px]">');
  c = c.replace(/<\/table>/g, '</table></div>');
  fs.writeFileSync(p, c);
  console.log('Fixed', f);
});
