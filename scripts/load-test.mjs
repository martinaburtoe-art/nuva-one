import { performance } from "node:perf_hooks";

const baseUrl = (process.env.LOAD_TEST_BASE_URL ?? "https://nuva-one.vercel.app").replace(/\/$/, "");
const supabaseUrl = (process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
const email = process.env.LOAD_TEST_EMAIL ?? "";
const password = process.env.LOAD_TEST_PASSWORD ?? "";
const vus = Number(process.env.LOAD_TEST_VUS ?? 10);
const iterations = Number(process.env.LOAD_TEST_ITERATIONS ?? 3);
const confirm = process.env.LOAD_TEST_CONFIRM === "true";

if (!confirm) {
  throw new Error(
    "Refusing to run a load test without LOAD_TEST_CONFIRM=true. Start with 10 VUs and increase gradually.",
  );
}

if (!supabaseUrl || !anonKey || !email || !password) {
  throw new Error(
    "Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, LOAD_TEST_EMAIL or LOAD_TEST_PASSWORD.",
  );
}

async function request(url, options = {}) {
  const started = performance.now();
  const response = await fetch(url, options);
  const elapsed = performance.now() - started;
  return { response, elapsed };
}

async function signIn() {
  const { response } = await request(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(`Auth failed: HTTP ${response.status}`);
  return response.json();
}

async function getBusinessId(accessToken, userId) {
  const url = new URL(`${supabaseUrl}/rest/v1/business_members`);
  url.searchParams.set("select", "business_id");
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("limit", "1");

  const { response } = await request(url, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) throw new Error(`Membership lookup failed: HTTP ${response.status}`);
  const rows = await response.json();
  if (!rows[0]?.business_id) throw new Error("No business membership available for load-test user");
  return rows[0].business_id;
}

async function query(accessToken, table, businessId, select = "*") {
  const url = new URL(`${supabaseUrl}/rest/v1/${table}`);
  url.searchParams.set("select", select);
  url.searchParams.set("business_id", `eq.${businessId}`);
  url.searchParams.set("limit", "100");

  const { response, elapsed } = await request(url, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
  });

  return { ok: response.ok, status: response.status, elapsed, table };
}

async function runVirtualUser() {
  const session = await signIn();
  const businessId = await getBusinessId(session.access_token, session.user.id);

  const results = [];
  for (let i = 0; i < iterations; i += 1) {
    const batch = await Promise.all([
      query(session.access_token, "customers", businessId, "id,name,status,pipeline_stage,created_at"),
      query(session.access_token, "products", businessId, "id,name,price,stock,created_at"),
      query(session.access_token, "sales", businessId, "id,total,sale_date,customer_id"),
      query(session.access_token, "transactions", businessId, "id,type,amount,tx_date"),
      query(session.access_token, "quotes", businessId, "id,status,total,created_at"),
    ]);
    results.push(...batch);
  }
  return results;
}

console.log(`Nüva One load test: ${vus} VUs × ${iterations} iterations`);
console.log(`Target application: ${baseUrl}`);

const started = performance.now();
const users = await Promise.allSettled(Array.from({ length: vus }, () => runVirtualUser()));
const elapsed = performance.now() - started;

const results = users.flatMap((user) => (user.status === "fulfilled" ? user.value : []));
const failures = users.filter((user) => user.status === "rejected");
const latencies = results.map((result) => result.elapsed).sort((a, b) => a - b);
const p95Index = Math.max(0, Math.ceil(latencies.length * 0.95) - 1);
const p99Index = Math.max(0, Math.ceil(latencies.length * 0.99) - 1);
const requestFailures = results.filter((result) => !result.ok);

console.table({
  vus,
  iterations,
  requests: results.length,
  user_failures: failures.length,
  request_failures: requestFailures.length,
  p95_ms: Math.round(latencies[p95Index] ?? 0),
  p99_ms: Math.round(latencies[p99Index] ?? 0),
  total_seconds: Number((elapsed / 1000).toFixed(2)),
});

if (failures.length || requestFailures.length) process.exitCode = 1;
