const baseUrl = (process.env.API_URL ?? process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
const serviceRoleKey = process.env.SERVICE_ROLE_KEY ?? "";
const email = "loadtest@nuva.local";
const password = "NüvaLoadTest-2026!";

if (!baseUrl || !serviceRoleKey) throw new Error("Missing local Supabase API_URL/SERVICE_ROLE_KEY.");

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "Content-Type": "application/json",
};

async function api(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers: { ...headers, ...(options.headers ?? {}) } });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(`${options.method ?? "GET"} ${path} failed: HTTP ${response.status} ${text}`);
  return body;
}

let user;
try {
  user = await api("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: "Nüva Load Test" } }),
  });
} catch (error) {
  if (!String(error).includes("already been registered") && !String(error).includes("already exists")) throw error;
  const users = await api("/auth/v1/admin/users?per_page=1000");
  user = users.users?.find((candidate) => candidate.email === email);
  if (!user) throw error;
}

const userId = user.id;
const businesses = await api(`/rest/v1/businesses?select=id&owner_id=eq.${userId}&limit=1`);
let businessId = businesses[0]?.id;
if (!businessId) {
  const created = await api("/rest/v1/businesses", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ name: "Nüva Synthetic Retail", industry: "retail", size: "small", owner_id: userId, tax_id: "TEST-NUVA-001" }),
  });
  businessId = created[0].id;
}

// The load-test user must have a deterministic tenant membership. Do not rely
// on application-side triggers for a test fixture: seed the exact membership
// the authenticated read path is expected to resolve.
await api(`/rest/v1/business_members?on_conflict=business_id,user_id`, {
  method: "POST",
  headers: {
    Prefer: "resolution=merge-duplicates,return=minimal",
  },
  body: JSON.stringify({ business_id: businessId, user_id: userId, role: "owner" }),
});

async function insertMany(table, rows) {
  if (!rows.length) return;
  await api(`/rest/v1/${table}`, {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(rows),
  });
}

const customers = Array.from({ length: 100 }, (_, i) => ({ business_id: businessId, name: `Cliente Sintético ${i + 1}`, email: `cliente${i + 1}@nuva.local` }));
const products = Array.from({ length: 100 }, (_, i) => ({ business_id: businessId, sku: `NUVA-${String(i + 1).padStart(4, "0")}`, name: `Producto Sintético ${i + 1}`, category: i % 5 === 0 ? "premium" : "general", cost: 1000 + i * 10, price: 1800 + i * 20, stock: 50 + (i % 20), low_stock_threshold: 5 }));
await insertMany("customers", customers);
await insertMany("products", products);

const customerRows = await api(`/rest/v1/customers?select=id&business_id=eq.${businessId}&limit=100`);
const sales = Array.from({ length: 200 }, (_, i) => ({ business_id: businessId, customer_id: customerRows[i % customerRows.length]?.id ?? null, customer_name: `Cliente Sintético ${(i % 100) + 1}`, status: "paid", total: 18000 + i * 100, sale_date: new Date(Date.now() - (i % 60) * 86400000).toISOString().slice(0, 10) }));
const transactions = Array.from({ length: 200 }, (_, i) => ({ business_id: businessId, type: i % 3 === 0 ? "expense" : "income", category: i % 3 === 0 ? "operación" : "ventas", amount: 5000 + i * 25, description: `Movimiento sintético ${i + 1}`, tx_date: new Date(Date.now() - (i % 60) * 86400000).toISOString().slice(0, 10) }));
const quotes = Array.from({ length: 100 }, (_, i) => ({ business_id: businessId, customer_id: customerRows[i % customerRows.length]?.id ?? null, customer_name: `Cliente Sintético ${(i % 100) + 1}`, status: i % 4 === 0 ? "accepted" : "sent", subtotal: 10000 + i * 50, tax: 1900 + i * 10, total: 11900 + i * 60, items: [{ name: `Producto Sintético ${(i % 100) + 1}`, quantity: 1, price: 11900 + i * 60 }] }));
await insertMany("sales", sales);
await insertMany("transactions", transactions);
await insertMany("quotes", quotes);

console.log(JSON.stringify({ email, userId, businessId, seeded: { customers: 100, products: 100, sales: 200, transactions: 200, quotes: 100 } }));
