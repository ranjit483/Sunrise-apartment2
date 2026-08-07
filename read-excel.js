const xlsx = require('xlsx');

const workbook = xlsx.readFile('sunrise Due Details soft.xlsx');
console.log("Sheets:", workbook.SheetNames);

for (let sheetName of workbook.SheetNames) {
  console.log("---- SHEET:", sheetName, "----");
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

  console.log("Total raw rows:", data.length);
  console.log("First 50 rows:");
  data.slice(0, 50).forEach((row, i) => {
    if (row.length > 0) {
      console.log(i, row);
    }
  });
}
