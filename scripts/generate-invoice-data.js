/**
 * Generates realistic invoice reconciliation data for the Excel Tutor scenario.
 * Outputs JSON files to content/scenarios/invoice-reconciliation/
 * Run: node scripts/generate-invoice-data.js
 */

const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "../content/scenarios/invoice-reconciliation");
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── Vendors (20) ─────────────────────────────────────────────────────────────
const VENDORS = [
  { vendor_id: "V001", vendor_name: "Apex Consulting Group",     category: "Consulting",   payment_terms: "Net 30" },
  { vendor_id: "V002", vendor_name: "BlueSky Technologies",      category: "IT Services",  payment_terms: "Net 45" },
  { vendor_id: "V003", vendor_name: "Clearview Analytics",       category: "Analytics",    payment_terms: "Net 30" },
  { vendor_id: "V004", vendor_name: "Delta Office Supplies",     category: "Supplies",     payment_terms: "Net 15" },
  { vendor_id: "V005", vendor_name: "Eagle Freight Solutions",   category: "Logistics",    payment_terms: "Net 30" },
  { vendor_id: "V006", vendor_name: "Falcon HR Partners",        category: "HR Services",  payment_terms: "Net 30" },
  { vendor_id: "V007", vendor_name: "Global Print Media",        category: "Marketing",    payment_terms: "Net 45" },
  { vendor_id: "V008", vendor_name: "Harbor Legal LLP",          category: "Legal",        payment_terms: "Net 30" },
  { vendor_id: "V009", vendor_name: "Ironclad Security",         category: "Security",     payment_terms: "Net 30" },
  { vendor_id: "V010", vendor_name: "Jade Software Solutions",   category: "IT Services",  payment_terms: "Net 45" },
  { vendor_id: "V011", vendor_name: "Keystone Facilities",       category: "Facilities",   payment_terms: "Net 30" },
  { vendor_id: "V012", vendor_name: "Luminary Advertising",      category: "Marketing",    payment_terms: "Net 45" },
  { vendor_id: "V013", vendor_name: "Metro Cloud Services",      category: "IT Services",  payment_terms: "Net 30" },
  { vendor_id: "V014", vendor_name: "NorthStar Catering",        category: "Catering",     payment_terms: "Net 15" },
  { vendor_id: "V015", vendor_name: "Omega Data Systems",        category: "IT Services",  payment_terms: "Net 45" },
  { vendor_id: "V016", vendor_name: "Pinnacle Training Co.",     category: "Training",     payment_terms: "Net 30" },
  { vendor_id: "V017", vendor_name: "Quest Telecom",             category: "Telecom",      payment_terms: "Net 30" },
  { vendor_id: "V018", vendor_name: "Redline Couriers",          category: "Logistics",    payment_terms: "Net 15" },
  { vendor_id: "V019", vendor_name: "Summit Accounting Svcs",   category: "Accounting",   payment_terms: "Net 30" },
  { vendor_id: "V020", vendor_name: "Titan Building Mgmt",      category: "Facilities",   payment_terms: "Net 30" },
];

// ── Departments (15) ─────────────────────────────────────────────────────────
const DEPARTMENTS = [
  { dept_id: "D01", dept_name: "Finance",             cost_center: "CC-1001", manager: "Sarah Mitchell" },
  { dept_id: "D02", dept_name: "Information Technology", cost_center: "CC-1002", manager: "James Rowe" },
  { dept_id: "D03", dept_name: "Human Resources",     cost_center: "CC-1003", manager: "Angela Torres" },
  { dept_id: "D04", dept_name: "Sales",               cost_center: "CC-1004", manager: "Brian Chen" },
  { dept_id: "D05", dept_name: "Marketing",           cost_center: "CC-1005", manager: "Priya Nair" },
  { dept_id: "D06", dept_name: "Operations",          cost_center: "CC-1006", manager: "Derek Walsh" },
  { dept_id: "D07", dept_name: "Legal",               cost_center: "CC-1007", manager: "Natasha Burke" },
  { dept_id: "D08", dept_name: "Procurement",         cost_center: "CC-1008", manager: "Carlos Mendez" },
  { dept_id: "D09", dept_name: "Executive",           cost_center: "CC-1009", manager: "Olivia Grant" },
  { dept_id: "D10", dept_name: "Customer Success",   cost_center: "CC-1010", manager: "Tom Ashford" },
  { dept_id: "D11", dept_name: "Research & Dev",      cost_center: "CC-1011", manager: "Helen Park" },
  { dept_id: "D12", dept_name: "Facilities",          cost_center: "CC-1012", manager: "Ray Sutton" },
  { dept_id: "D13", dept_name: "Product Management",  cost_center: "CC-1013", manager: "Samira Holt" },
  { dept_id: "D14", dept_name: "Quality Assurance",   cost_center: "CC-1014", manager: "Liam Foster" },
  { dept_id: "D15", dept_name: "Business Development",cost_center: "CC-1015", manager: "Eve Chambers" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function pad(n, len = 4) { return String(n).padStart(len, "0"); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(lo, hi) { return Math.floor(Math.random() * (hi - lo + 1)) + lo; }
function randFloat(lo, hi, dp = 2) {
  return parseFloat((Math.random() * (hi - lo) + lo).toFixed(dp));
}
function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function fmtDate(d) { return d.toISOString().slice(0, 10); }

// Date range: July 1 – August 31 2024
const START = new Date("2024-07-01");
const END   = new Date("2024-08-31");
function randDate(from = START, to = END) {
  const ms = from.getTime() + Math.random() * (to.getTime() - from.getTime());
  return fmtDate(new Date(ms));
}

// ── Generate Invoices (base 150, then add problems) ───────────────────────────
const AMOUNTS = [
  1200, 1500, 1800, 2000, 2400, 2750, 3000, 3500, 4000, 4500,
  5000, 6000, 6500, 7200, 8000, 8500, 9000, 9600, 10000, 11500,
  12000, 13000, 14500, 15000, 16000, 17500, 18000, 20000, 22500, 25000,
];

const invoices = [];
const DEPT_IDS = DEPARTMENTS.map(d => d.dept_id);
const VENDOR_IDS = VENDORS.map(v => v.vendor_id);

// Base clean invoices: 148 rows
for (let i = 1; i <= 148; i++) {
  const invDate = randDate();
  const vendor  = pick(VENDORS);
  const terms   = parseInt(vendor.payment_terms.replace("Net ", ""));
  const dueDate = addDays(invDate, terms);
  const amount  = pick(AMOUNTS) + randInt(0, 99);
  invoices.push({
    invoice_id:  `INV-2024-${pad(i)}`,
    invoice_date: invDate,
    due_date:     dueDate,
    vendor_id:    vendor.vendor_id,
    dept_id:      pick(DEPT_IDS),
    amount:       amount,
    description:  `${vendor.category} services - ${invDate.slice(0, 7)}`,
    po_number:    `PO-${pad(randInt(1, 999), 3)}`,
  });
}

// Problem 1: Duplicate invoice (same ID, same amount — will inflate totals)
const dupTarget = invoices[randInt(10, 50)];
invoices.push({
  ...dupTarget,
  invoice_date: dupTarget.invoice_date,  // exact duplicate
});

// Problem 2: Another duplicate (different position)
const dupTarget2 = invoices[randInt(60, 100)];
invoices.push({
  ...dupTarget2,
});

// Problem 3 & 4: Two invoices with missing vendor_id
invoices.push({
  invoice_id:   `INV-2024-${pad(149)}`,
  invoice_date:  randDate(),
  due_date:      addDays(randDate(), 30),
  vendor_id:     "",   // missing
  dept_id:       pick(DEPT_IDS),
  amount:        pick(AMOUNTS),
  description:   "Consulting services - unknown vendor",
  po_number:    `PO-${pad(randInt(1, 999), 3)}`,
});
invoices.push({
  invoice_id:   `INV-2024-${pad(150)}`,
  invoice_date:  randDate(),
  due_date:      addDays(randDate(), 30),
  vendor_id:     "",   // missing
  dept_id:       pick(DEPT_IDS),
  amount:        pick(AMOUNTS),
  description:   "IT support - vendor TBD",
  po_number:    `PO-${pad(randInt(1, 999), 3)}`,
});

// Total: 152 rows (148 clean + 2 dupes + 2 missing vendors)
console.log(`Generated ${invoices.length} invoices`);

// ── Generate Payments (~115 rows) ─────────────────────────────────────────────
// We'll pay ~100 invoices fully, 10 partially, leave ~40 unpaid
const payments = [];
let pmtSeq = 1;

// Deduplicated unique invoice IDs to pay
const uniqueInvIds = [...new Set(invoices.map(i => i.invoice_id))];

// Shuffle
const shuffled = [...uniqueInvIds].sort(() => Math.random() - 0.5);

// Full payments: first 95
for (let i = 0; i < 95 && i < shuffled.length; i++) {
  const inv = invoices.find(x => x.invoice_id === shuffled[i]);
  if (!inv) continue;
  const pmtDate = addDays(inv.invoice_date, randInt(5, parseInt((inv.vendor_id ? pick(VENDORS) : VENDORS[0]).payment_terms.replace("Net ", "")) - 2));
  payments.push({
    payment_id:   `PMT-${pad(pmtSeq++)}`,
    invoice_id:    inv.invoice_id,
    payment_date:  pmtDate,
    amount_paid:   inv.amount,  // full
    payment_method: pick(["ACH", "Wire", "Check", "ACH", "ACH"]),
    reference:    `REF-${pad(randInt(10000, 99999), 5)}`,
    status:        "Cleared",
  });
}

// Partial payments: next 12
for (let i = 95; i < 107 && i < shuffled.length; i++) {
  const inv = invoices.find(x => x.invoice_id === shuffled[i]);
  if (!inv) continue;
  const partial = parseFloat((inv.amount * randFloat(0.3, 0.75)).toFixed(2));
  const pmtDate = addDays(inv.invoice_date, randInt(5, 20));
  payments.push({
    payment_id:    `PMT-${pad(pmtSeq++)}`,
    invoice_id:    inv.invoice_id,
    payment_date:  pmtDate,
    amount_paid:   partial,
    payment_method: pick(["ACH", "Wire", "Check"]),
    reference:    `REF-${pad(randInt(10000, 99999), 5)}`,
    status:        "Cleared",
  });
}

// Remaining invoices (108+) have no payment → Outstanding / Overdue
// Also add 5 extra stray payments (test data hygiene issue — invoice IDs don't match)
for (let i = 0; i < 5; i++) {
  payments.push({
    payment_id:    `PMT-${pad(pmtSeq++)}`,
    invoice_id:    `INV-2024-VOID-${pad(i + 1)}`,  // non-existent invoice
    payment_date:  randDate(),
    amount_paid:   pick(AMOUNTS),
    payment_method: "ACH",
    reference:    `REF-${pad(randInt(10000, 99999), 5)}`,
    status:        "Reversed",
  });
}

console.log(`Generated ${payments.length} payments`);

// ── Compute expected answers ───────────────────────────────────────────────────
// Build a map: invoice_id → total_paid
const paidMap = {};
for (const p of payments) {
  if (!p.invoice_id.startsWith("INV-2024-VOID")) {
    paidMap[p.invoice_id] = (paidMap[p.invoice_id] || 0) + p.amount_paid;
  }
}

// Vendor map
const vendorMap = {};
for (const v of VENDORS) vendorMap[v.vendor_id] = v.vendor_name;

// For each invoice (deduped by ID, take first occurrence), compute status
const seenIds = new Set();
const recon = [];
for (const inv of invoices) {
  if (seenIds.has(inv.invoice_id)) continue;  // skip duplicates
  seenIds.add(inv.invoice_id);
  const paid = paidMap[inv.invoice_id] || 0;
  const balance = parseFloat((inv.amount - paid).toFixed(2));
  let status;
  if (paid === 0) status = "Unpaid";
  else if (balance > 0) status = "Partial";
  else status = "Paid";

  const today = new Date("2024-09-01");
  const dueDate = new Date(inv.due_date);
  const overdue = status !== "Paid" && dueDate < today;

  recon.push({
    invoice_id: inv.invoice_id,
    vendor_id: inv.vendor_id,
    vendor_name: vendorMap[inv.vendor_id] || "",
    amount: inv.amount,
    amount_paid: paid,
    balance,
    status,
    overdue,
  });
}

// Task expected values
// T01: Count of duplicate invoice IDs (invoices that appear more than once)
const idCounts = {};
for (const inv of invoices) idCounts[inv.invoice_id] = (idCounts[inv.invoice_id] || 0) + 1;
const duplicateIds = Object.entries(idCounts).filter(([, c]) => c > 1).map(([id]) => id);
const duplicateCount = duplicateIds.length;

// T02: Count of invoices with missing vendor_id
const missingVendorCount = invoices.filter(i => !i.vendor_id).length;

// T03: Total invoice amount (all rows including dupes)
const totalInvoiceAmount = parseFloat(invoices.reduce((s, i) => s + i.amount, 0).toFixed(2));

// T04: Total invoice amount (unique IDs only)
const totalUniqueInvoiceAmount = parseFloat(recon.reduce((s, r) => s + r.amount, 0).toFixed(2));

// T05: Total amount paid
const totalPaid = parseFloat(payments
  .filter(p => !p.invoice_id.startsWith("INV-2024-VOID"))
  .reduce((s, p) => s + p.amount_paid, 0).toFixed(2));

// T06: Total outstanding balance
const totalOutstanding = parseFloat(recon.reduce((s, r) => s + r.balance, 0).toFixed(2));

// T07: Count of unpaid invoices
const unpaidCount = recon.filter(r => r.status === "Unpaid").length;

// T08: Count of partial invoices
const partialCount = recon.filter(r => r.status === "Partial").length;

// T09: Count of overdue invoices
const overdueCount = recon.filter(r => r.overdue).length;

// T10: Count of fully paid invoices
const paidCount = recon.filter(r => r.status === "Paid").length;

// Outstanding by vendor (top vendors)
const outstandingByVendor = {};
for (const r of recon) {
  if (!r.vendor_id) continue;
  outstandingByVendor[r.vendor_id] = (outstandingByVendor[r.vendor_id] || 0) + r.balance;
}
// Round values
for (const k of Object.keys(outstandingByVendor)) {
  outstandingByVendor[k] = parseFloat(outstandingByVendor[k].toFixed(2));
}

const expectedValues = {
  // Task answers
  T01_duplicate_invoice_count: duplicateCount,
  T01_duplicate_invoice_ids: duplicateIds,
  T02_missing_vendor_count: missingVendorCount,
  T03_total_invoice_amount_with_dupes: totalInvoiceAmount,
  T04_total_invoice_amount_unique: totalUniqueInvoiceAmount,
  T05_total_paid: totalPaid,
  T06_total_outstanding: totalOutstanding,
  T07_unpaid_count: unpaidCount,
  T08_partial_count: partialCount,
  T09_overdue_count: overdueCount,
  T10_paid_count: paidCount,
  // Summaries
  outstanding_by_vendor: outstandingByVendor,
  status_summary: {
    Paid: paidCount,
    Partial: partialCount,
    Unpaid: unpaidCount,
  },
  // Meta
  total_invoice_rows: invoices.length,
  unique_invoice_ids: recon.length,
  total_payment_rows: payments.length,
};

// ── Write files ───────────────────────────────────────────────────────────────
function write(filename, data) {
  const fpath = path.join(OUT_DIR, filename);
  fs.writeFileSync(fpath, JSON.stringify(data, null, 2));
  console.log(`Wrote ${fpath} (${data.length || Object.keys(data).length} records)`);
}

write("vendors.json", VENDORS);
write("departments.json", DEPARTMENTS);
write("invoices.json", invoices);
write("payments.json", payments);
fs.writeFileSync(path.join(OUT_DIR, "expected_values.json"), JSON.stringify(expectedValues, null, 2));
console.log(`Wrote expected_values.json`);

console.log("\n=== EXPECTED ANSWERS ===");
console.log(JSON.stringify(expectedValues, null, 2));
