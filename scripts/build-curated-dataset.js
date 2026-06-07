/**
 * Builds the final curated Recon_Working dataset and writes recon_working.json
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

const paidMap = {};
for (const p of payments) {
  if (!p.invoice_id.startsWith("INV-2024-VOID")) {
    paidMap[p.invoice_id] = parseFloat(((paidMap[p.invoice_id] || 0) + p.amount_paid).toFixed(2));
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

// Curated selection: indices in invoices[] array
// Strategy: first 26 unique (indices 0-25), skip the natural dup indices,
// then add the two dup entries (148, 149) and missing vendor entries (150, 151)
const baseIndices = [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25];
const specialIndices = [148, 149, 150, 151]; // dup of idx 19, dup of idx 63, missing vendor x2

// Build curated array (order matters for cell positions)
// We want:
// Excel row 2 (idx 0 in curated): first clean invoice (INV-2024-0001) for T01, T02, T03
// Excel row 3 (idx 1): overdue invoice (INV-2024-0006 = invoices[5]) for T06
// Excel row 4 (idx 2): partial invoice (INV-2024-0011 = invoices[10]) for T04, T05
// Excel row 5 (idx 3): INV-2024-0020 first occurrence (invoices[19]) for T07 setup
// Excel row 6 (idx 4): INV-2024-0020 second occurrence (invoices[148]) for T07 ANSWER
// Then rows 7-27: mix of other invoices
// Excel row 28 (idx 26): INV-2024-0064 first occurrence (invoices[63]) for second dup setup
// Excel row 29 (idx 27): INV-2024-0064 dup (invoices[149])
// Excel row 30 (idx 28): missing vendor 1 (invoices[150])
// Excel row 31 (idx 29): missing vendor 2 (invoices[151])

// Get invoices[63] = INV-2024-0064 first occurrence
const inv64 = enrich(invoices[63]);
console.log("inv[63] =", inv64.invoice_id, inv64.vendor_name, inv64.amount, inv64.status);

// Build the curated row order
const curatedIndices = [
  0,    // row 2: INV-2024-0001 (T01, T02, T03 target)
  5,    // row 3: INV-2024-0006 (T06 OVERDUE target)
  10,   // row 4: INV-2024-0011 (T04, T05 PARTIAL target)
  19,   // row 5: INV-2024-0020 first occurrence
  148,  // row 6: INV-2024-0020 DUPLICATE (T07 target: M6)
  1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 18, 20, // rows 7-27
  63,   // row 28: INV-2024-0064 first occurrence
  149,  // row 29: INV-2024-0064 DUPLICATE
  150,  // row 30: missing vendor 1
  151,  // row 31: missing vendor 2
];

const curated = curatedIndices.map((srcIdx, curatedIdx) => ({
  src_idx: srcIdx,
  excel_row: curatedIdx + 2,
  ...enrich(invoices[srcIdx]),
}));

console.log("\n=== CURATED DATASET (30 rows) ===");
curated.forEach(r => {
  const dupMark = (r.invoice_id === "INV-2024-0020" || r.invoice_id === "INV-2024-0064") ? " **" : "";
  const missMark = !r.vendor_id ? " [NO VENDOR]" : "";
  const overdMark = r.overdue ? " [OVERDUE]" : "";
  const partMark = r.status === "Partial" ? ` [PARTIAL: bal=${r.balance}]` : "";
  console.log(`R${r.excel_row}: ${r.invoice_id} | ${r.vendor_id}=${r.vendor_name} | ${r.dept_id}=${r.dept_name} | $${r.amount} | ${r.status}${dupMark}${missMark}${overdMark}${partMark}`);
});

// ---- Compute expected task answers based on curated set ----
// (Learner fills G=vendor_name, H=dept_name, I=paid, J=status, K=balance, L=overdue_flag, M=dup_flag)

// DUPLICATE IDs in curated set
const idCountInCurated = {};
for (const r of curated) idCountInCurated[r.invoice_id] = (idCountInCurated[r.invoice_id] || 0) + 1;
const dupIdsInCurated = Object.entries(idCountInCurated).filter(([,c]) => c > 1).map(([id]) => id);
console.log("\nDuplicate IDs in curated:", dupIdsInCurated);

// Task answers
const row2 = curated[0]; // T01, T02, T03
const row3 = curated[1]; // T06
const row4 = curated[2]; // T04, T05
const row6 = curated[4]; // T07 (second occurrence of INV-2024-0020)

console.log("\n=== TASK EXPECTED ANSWERS ===");
console.log("T01 (G2) - Vendor Name:", row2.vendor_name);
console.log("T02 (H2) - Dept Name:", row2.dept_name);
console.log("T03 (I2) - Amount Paid:", row2.paid);
console.log("T04 (J4) - Status:", row4.status);
console.log("T05 (K4) - Balance:", row4.balance);
console.log("T06 (L3) - Overdue flag:", row3.overdue ? "OVERDUE" : "OK");
console.log("T07 (M6) - Dup flag: DUPLICATE (because INV-2024-0020 appears twice)");

// Summary calcs for curated set
const statusCounts = { Paid: 0, Partial: 0, Unpaid: 0 };
// Count unique invoice statuses (skip duplicates)
const seenForSummary = new Set();
let totalInvoicedCurated = 0;
let totalPaidCurated = 0;
let totalOutstandingCurated = 0;
const outByVendorCurated = {};
for (const r of curated) {
  if (seenForSummary.has(r.invoice_id)) continue;
  seenForSummary.add(r.invoice_id);
  statusCounts[r.status]++;
  totalInvoicedCurated += r.amount;
  totalPaidCurated += r.paid;
  totalOutstandingCurated += r.balance;
  if (r.vendor_id) {
    const name = r.vendor_name;
    outByVendorCurated[name] = parseFloat(((outByVendorCurated[name] || 0) + r.balance).toFixed(2));
  }
}
totalInvoicedCurated = parseFloat(totalInvoicedCurated.toFixed(2));
totalPaidCurated = parseFloat(totalPaidCurated.toFixed(2));
totalOutstandingCurated = parseFloat(totalOutstandingCurated.toFixed(2));
const collectionRate = parseFloat(((totalPaidCurated / totalInvoicedCurated) * 100).toFixed(1));

console.log("\nT09 (Count by Status, curated):", statusCounts);
console.log("T10 (Grand totals, curated):");
console.log("  Total Invoiced:", totalInvoicedCurated);
console.log("  Total Paid:", totalPaidCurated);
console.log("  Total Outstanding:", totalOutstandingCurated);
console.log("  Collection Rate:", collectionRate + "%");

// T08: Outstanding by vendor in curated set
const sortedVendorCurated = Object.entries(outByVendorCurated).sort(([,a],[,b]) => b - a).slice(0, 5);
console.log("\nTop 5 Outstanding by Vendor (curated):", sortedVendorCurated);

// Summary: all 20 vendors and their outstanding in curated
console.log("\n=== ALL VENDOR OUTSTANDING (curated) ===");
vendors.forEach(v => {
  const bal = outByVendorCurated[v.vendor_name] || 0;
  console.log(`${v.vendor_id} ${v.vendor_name}: $${bal}`);
});

// Find expected answer for T08 - we'll use the first vendor (V001 = Apex Consulting Group)
const v001Outstanding = outByVendorCurated["Apex Consulting Group"] || 0;
console.log("\nT08 (B3 - Apex Consulting Group outstanding in curated):", v001Outstanding);
console.log("T09 (B26 - Paid count):", statusCounts.Paid);
console.log("T10 (B32 - Total Invoiced):", totalInvoicedCurated);

// Write recon_working.json with just the pre-filled data (no computed columns)
const reconWorkingData = curated.map(r => ({
  invoice_id: r.invoice_id,
  invoice_date: r.invoice_date,
  due_date: r.due_date,
  vendor_id: r.vendor_id,
  dept_id: r.dept_id,
  amount: r.amount,
  description: r.description,
}));
fs.writeFileSync(path.join(DIR, "recon_working.json"), JSON.stringify(reconWorkingData, null, 2));
console.log("\nWrote recon_working.json");
