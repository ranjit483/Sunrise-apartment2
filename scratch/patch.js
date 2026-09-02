const fs = require('fs');
const path = 'c:/Users/cwc/Desktop/opencode/src/app/invoices/page.tsx';
let content = fs.readFileSync(path, 'utf8');

const regex1 = /<td className="border border-black p-0\.5 text-right font-medium align-middle">₨ \{\(viewingInvoice\.electricityAmount \|\| 0\)\.toLocaleString\(\)\}<\/td>\s*<\/tr>/;
content = content.replace(regex1, match => match + `
                {viewingInvoice.electricityVatAmount > 0 && (
                  <tr className="border-b border-black">
                    <td className="border border-black p-0.5 text-center align-middle">1.1</td>
                    <td className="border border-black p-0.5 flex items-center justify-between">
                      <strong>Electricity VAT (13%)</strong>
                      <span className="text-[7px] text-gray-600">Government Tax</span>
                    </td>
                    <td className="border border-black p-0.5 text-right font-medium align-middle">₨ {(viewingInvoice.electricityVatAmount || 0).toLocaleString()}</td>
                  </tr>
                )}
`);

const regex2 = /<td className="border border-black p-2 text-right font-medium">₨ \{\(viewingInvoice\.electricityAmount \|\| 0\)\.toLocaleString\(\)\}<\/td>\s*<\/tr>/;
content = content.replace(regex2, match => match + `
                  {viewingInvoice.electricityVatAmount > 0 && (
                    <tr className="border-b border-black">
                      <td className="border border-black p-2 text-center">1.1</td>
                      <td className="border border-black p-2">
                        <div><strong>Electricity VAT (13%)</strong></div>
                        <span className="text-[10px] text-gray-600">Government Tax</span>
                      </td>
                      <td className="border border-black p-2 text-right font-medium">₨ {(viewingInvoice.electricityVatAmount || 0).toLocaleString()}</td>
                    </tr>
                  )}
`);

fs.writeFileSync(path, content, 'utf8');
console.log('Done replacing rows!');
