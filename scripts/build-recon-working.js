/**
 * Builds the curated Recon_Working dataset and outputs expected task answers.
 * This script selects specific representative invoices for the working sheet.
 */
const fs = require("fs");
const path = require("path");
const DIR = path.join(__dirname, "../content/scenarios/invoice-reconciliation");

const invoices = JSON.parse(fs.readFileSync(path.join(DIR, "invoices.json")));
const payments = JSON.parse(fs.readFileSync(path.join(DIR, "payments.json")));
const vendors = JSON.parse(fs.readFileSync(path.join(DIR, "vendors.json")));
const depts = JSON.parse(fs.readFileSync(path.join(DIR, "departments.json")));

const vendorMap = Object.fromEntries(vendors.map(v => [v.vendor_id, v]));
const deptMap = Object.fromEntries(depts.map(d => [d.dept_id, d]));

// Compute paid amounts per invoice_id
const paidMap = {};
for (const p of payments) {
  if (!p.invoice_id.startsWith("INV-2024-VOID")) {
    paidMap[p.invoice_id] = (paidMap[p.invoice_id] || 0) + p.amount_paid;
  }
}

const today = new Date("2024-09-01");
function enrich(inv) {
  const paid = paidMap[inv.invoice_id] || 0;
  const balance = parseFloat((inv.amount - paid).toFixed(2));
  const status = paid === 0 ? "Unpaid" : balance > 0 ? "Partial" : "Paid";
  const dueDate = new Date(inv.due_date);
  const overdue = status !== "Paid" && dueDate < today;
  return {
    ...inv,
    vendor_name: vendorMap[inv.vendor_id]?.vendor_name || "",
    dept_name: deptMap[inv.dept_id]?.dept_name || "",
    paid,
    balance,
    status,
    overdue,
  };
}

// Get specific invoices for curated working area
// We need:
// idx 0 (Excel row 2): invoices[0] = INV-2024-0001 (for T01, T02, T03)
// idx 10 (invoices[10]) = INV-2024-0011: PARTIAL (for T04, T05)
// idx 5 (invoices[5]) = INV-2024-0006: OVERDUE (for T06)
// idx 19 (invoices[19]) = INV-2024-0020: first dup occurrence (for T07)
// idx 148 = duplicate of INV-2024-0020 (T07 answer cell)
// idx 150, 151 = missing vendors

const specificIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 19, 148, 149, 150, 151];
const specific = specificIndices.map(i => ({ idx: i, ...enrich(invoices[i]) }));

specific.forEach(s => {
  console.log(`idx=${s.idx} row=${s.idx+2}excel: ${s.invoice_id} | V:${s.vendor_id}=${s.vendor_name} | D:${s.dept_id}=${s.dept_name} | $${s.amount} | paid=${s.paid} | bal=${s.balance} | ${s.status}${s.overdue ? " OVERDUE" : ""}`);
});

// INV-2024-0011 specifics
const inv11 = enrich(invoices[10]);
console.log("\n=== INV-2024-0011 (for T04/T05) ===");
console.log(JSON.stringify(inv11, null, 2));

// INV-2024-0006 specifics
const inv6 = enrich(invoices[5]);
console.log("\n=== INV-2024-0006 (for T06 OVERDUE) ===");
console.log(JSON.stringify(inv6, null, 2));

// For Summary_Report - top 5 outstanding by vendor
const reconAll = [];
const seen = new Set();
for (const inv of invoices) {
  if (seen.has(inv.invoice_id)) continue;
  seen.add(inv.invoice_id);
  reconAll.push(enrich(inv));
}

const outByVendor = {};
for (const r of reconAll) {
  if (!r.vendor_id) continue;
  outByVendor[r.vendor_id] = (outByVendor[r.vendor_id] || 0) + r.balance;
}
for (const k of Object.keys(outByVendor)) outByVendor[k] = parseFloat(outByVendor[k].toFixed(2));

const sortedVendors = Object.entries(outByVendor).sort(([,a],[,b]) => b - a).slice(0, 10);
console.log("\n=== TOP 10 OUTSTANDING BY VENDOR ===");
sortedVendors.forEach(([vid, bal]) => console.log(`${vid} = ${vendorMap[vid].vendor_name}: $${bal}`));

const statusSummary = { Paid: 0, Partial: 0, Unpaid: 0 };
for (const r of reconAll) statusSummary[r.status]++;
const totalInvoiced = reconAll.reduce((s, r) => s + r.amount, 0);
const totalPaid = reconAll.reduce((s, r) => s + r.paid, 0);
const totalOutstanding = reconAll.reduce((s, r) => s + r.balance, 0);

console.log("\n=== SUMMARY ===");
console.log("Status:", statusSummary);
console.log(`Total Invoiced (unique): $${totalInvoiced.toFixed(2)}`);
console.log(`Total Paid: $${totalPaid.toFixed(2)}`);
console.log(`Total Outstanding: $${totalOutstanding.toFixed(2)}`);
console.log(`Collection Rate: ${((totalPaid / totalInvoiced) * 100).toFixed(1)}%`);
