const fs = require("fs");
const path = require("path");
const DIR = path.join(__dirname, "../content/scenarios/invoice-reconciliation");

const invoices = JSON.parse(fs.readFileSync(path.join(DIR, "invoices.json")));
const payments = JSON.parse(fs.readFileSync(path.join(DIR, "payments.json")));
const vendors = JSON.parse(fs.readFileSync(path.join(DIR, "vendors.json")));
const depts = JSON.parse(fs.readFileSync(path.join(DIR, "departments.json")));

const vendorMap = Object.fromEntries(vendors.map(v => [v.vendor_id, v]));
const deptMap = Object.fromEntries(depts.map(d => [d.dept_id, d]));

// Compute amount paid per invoice_id
const paidMap = {};
for (const p of payments) {
  if (!p.invoice_id.startsWith("INV-2024-VOID")) {
    paidMap[p.invoice_id] = (paidMap[p.invoice_id] || 0) + p.amount_paid;
  }
}

const today = new Date("2024-09-01");

// Analyze all invoices
const analyzed = invoices.map((inv, i) => {
  const paid = paidMap[inv.invoice_id] || 0;
  const balance = parseFloat((inv.amount - paid).toFixed(2));
  let status = paid === 0 ? "Unpaid" : balance > 0 ? "Partial" : "Paid";
  const overdue = status !== "Paid" && new Date(inv.due_date) < today;
  return { idx: i, ...inv, vendor_name: vendorMap[inv.vendor_id]?.vendor_name || "", dept_name: deptMap[inv.dept_id]?.dept_name || "", paid, balance, status, overdue };
});

// Find key examples
const partial = analyzed.filter(a => a.status === "Partial");
const overdue = analyzed.filter(a => a.overdue);
const missing = analyzed.filter(a => !a.vendor_id);

// Duplicate IDs
const idCounts = {};
for (const inv of invoices) idCounts[inv.invoice_id] = (idCounts[inv.invoice_id] || 0) + 1;
const dupIds = Object.entries(idCounts).filter(([,c]) => c > 1).map(([id]) => id);
const dupEntries = analyzed.filter(a => dupIds.includes(a.invoice_id));

console.log("=== FIRST 5 INVOICES ===");
analyzed.slice(0, 5).forEach(a => console.log(`Row${a.idx+1}: ${a.invoice_id} | ${a.vendor_id}=${a.vendor_name} | ${a.dept_id}=${a.dept_name} | amount=${a.amount} | paid=${a.paid} | status=${a.status} | overdue=${a.overdue}`));

console.log("\n=== FIRST 3 PARTIAL PAYMENTS ===");
partial.slice(0, 3).forEach(a => console.log(`Row${a.idx+1}: ${a.invoice_id} | amount=${a.amount} | paid=${a.paid} | balance=${a.balance} | due=${a.due_date} | overdue=${a.overdue}`));

console.log("\n=== FIRST 3 OVERDUE (NON-PAID) ===");
overdue.slice(0, 3).forEach(a => console.log(`Row${a.idx+1}: ${a.invoice_id} | vendor=${a.vendor_name} | amount=${a.amount} | paid=${a.paid} | status=${a.status} | due=${a.due_date}`));

console.log("\n=== DUPLICATE ENTRIES ===");
dupEntries.forEach(a => console.log(`Row${a.idx+1}: ${a.invoice_id} | vendor=${a.vendor_name} | amount=${a.amount}`));

console.log("\n=== MISSING VENDOR ENTRIES ===");
missing.forEach(a => console.log(`Row${a.idx+1}: ${a.invoice_id} | vendor_id='${a.vendor_id}' | amount=${a.amount}`));

console.log("\n=== INV-2024-0001 full detail ===");
const inv1 = analyzed[0];
console.log(JSON.stringify(inv1, null, 2));
