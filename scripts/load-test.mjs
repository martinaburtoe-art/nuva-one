import { performance } from "node:perf_hooks";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const supabaseUrl = (process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
const email = process.env.LOAD_TEST_EMAIL ?? "";
const password = process.env.LOAD_TEST_PASSWORD ?? "";
const vus = Number(process.env.LOAD_TEST_VUS ?? 10);
const iterations = Number(process.env.LOAD_TEST_ITERATIONS ?? 3);
const phases = (process.env.LOAD_TEST_PHASES ?? "").split(",").map(Number).filter((value) => value > 0);
const outputFile = process.env.LOAD_TEST_OUTPUT ?? "artifacts/load-test-results.json";
const environment = (process.env.LOAD_TEST_ENV ?? "").toLowerCase();

if (process.env.LOAD_TEST_CONFIRM !== "true") throw new Error("Refusing to run a load test without LOAD_TEST_CONFIRM=true.");
if (environment !== "staging") throw new Error("Refusing load tests outside an explicitly declared staging environment (LOAD_TEST_ENV=staging).");
if (/nuva-one\.vercel\.app|nuvaone\.cl/i.test(supabaseUrl)) throw new Error("Production URL detected. Configure an isolated staging Supabase project.");
if (!supabaseUrl || !anonKey || !email || !password) throw new Error("Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, LOAD_TEST_EMAIL or LOAD_TEST_PASSWORD.");

function describeTransportError(error) {
  const cause = error?.cause;
  const details = [
    error?.name ? `name=${error.name}` : null,
    error?.message ? `message=${error.message}` : null,
    cause?.code ? `cause_code=${cause.code}` : null,
    cause?.name ? `cause_name=${cause.name}` : null,
    cause?.message ? `cause_message=${cause.message}` : null,
  ].filter(Boolean);
  return details.join("; ") || String(error);
}

async function request(url, options = {}) {
  const started = performance.now();
  try {
    const response = await fetch(url, options);
    const text = await response.text();
    return { response, body_text: text, elapsed: performance.now() - started, transport_error: null };
  } catch (error) {
    return { response: null, body_text: null, elapsed: performance.now() - started, transport_error: describeTransportError(error) };
  }
}

async function signIn() {
  const { response, body_text, transport_error } = await request(`${supabaseUrl}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: anonKey, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  if (transport_error) throw new Error(`Auth transport failure: ${transport_error}`);
  if (!response.ok) throw new Error(`Auth failed: HTTP ${response.status} ${body_text}`);
  return JSON.parse(body_text);
}

async function getBusinessId(accessToken, userId) {
  const url = new URL(`${supabaseUrl}/rest/v1/business_members`);
  url.searchParams.set("select", "business_id"); url.searchParams.set("user_id", `eq.${userId}`); url.searchParams.set("limit", "1");
  const { response, body_text, transport_error } = await request(url, { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` } });
  if (transport_error) throw new Error(`Membership transport failure: ${transport_error}`);
  if (!response.ok) throw new Error(`Membership lookup failed: HTTP ${response.status} ${body_text}`);
  const rows = JSON.parse(body_text);
  if (!rows[0]?.business_id) throw new Error("No business membership available for load-test user");
  return rows[0].business_id;
}

async function query(accessToken, table, businessId, select) {
  const url = new URL(`${supabaseUrl}/rest/v1/${table}`);
  url.searchParams.set("select", select); url.searchParams.set("business_id", `eq.${businessId}`); url.searchParams.set("limit", "100");
  const { response, elapsed, body_text, transport_error } = await request(url, { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` } });
  if (transport_error) {
    console.error(`Transport failure [${table}]: ${transport_error}`);
    return { elapsed, ok: false, status: null, table, error: transport_error, failure_type: "transport" };
  }
  const error = response.ok ? null : body_text;
  if (error) console.error(`Request failure [${table}] HTTP ${response.status}: ${error}`);
  return { elapsed, ok: response.ok, status: response.status, table, error, failure_type: response.ok ? null : "http" };
}

async function runVirtualUser(accessToken, businessId) {
  const results = [];
  // One VU models one independent user scenario. Requests within a VU are sequential,
  // so 50 VUs means at most 50 in-flight API requests while every endpoint is exercised.
  const queries = [
    ["customers", "id,name,status,created_at"],
    ["products", "id,name,price,stock,created_at"],
    ["sales", "id,total,sale_date,customer_id"],
    ["transactions", "id,type,amount,tx_date"],
    ["quotes", "id,status,total,created_at"],
  ];
  for (let i = 0; i < iterations; i += 1) {
    for (const [table, select] of queries) {
      results.push(await query(accessToken, table, businessId, select));
    }
  }
  return results;
}

async function runPhase(phaseVus, accessToken, businessId) {
  console.log(`\nNüva One staging load phase: ${phaseVus} VUs × ${iterations} iterations`);
  const started = performance.now();
  const users = await Promise.allSettled(Array.from({ length: phaseVus }, () => runVirtualUser(accessToken, businessId)));
  const elapsed = performance.now() - started;
  const results = users.flatMap((user) => user.status === "fulfilled" ? user.value : []);
  const userFailures = users.filter((user) => user.status === "rejected").length;
  const failureCauses = users.filter((user) => user.status === "rejected").slice(0, 5).map((user) => String(user.reason?.message ?? user.reason));
  if (failureCauses.length) console.error("Virtual-user failure causes:", failureCauses);
  const requestFailures = results.filter((result) => !result.ok).length;
  const requestFailureDetails = results.filter((result) => !result.ok).slice(0, 20).map(({ table, status, error, failure_type }) => ({ table, status, error, failure_type }));
  const latencies = results.map((result) => result.elapsed).sort((a, b) => a - b);
  const percentile = (value) => latencies.length ? latencies[Math.max(0, Math.ceil(latencies.length * value) - 1)] : 0;
  const summary = { vus: phaseVus, iterations, requests: results.length, expected_requests: phaseVus * iterations * 5, user_failures: userFailures, request_failures: requestFailures, failure_causes: failureCauses, request_failure_details: requestFailureDetails, p50_ms: Math.round(percentile(0.5)), p95_ms: Math.round(percentile(0.95)), p99_ms: Math.round(percentile(0.99)), total_seconds: Number((elapsed / 1000).toFixed(2)) };
  console.table(summary); return summary;
}

const requestedPhases = phases.length ? phases : [vus];
const session = await signIn();
const businessId = await getBusinessId(session.access_token, session.user.id);
const results = [];
for (const phase of requestedPhases) {
  const summary = await runPhase(phase, session.access_token, businessId); results.push(summary);
  if (summary.user_failures || summary.request_failures) { console.error(`Phase ${phase} failed; stopping before increasing concurrency.`); break; }
}
await mkdir(dirname(outputFile), { recursive: true });
await writeFile(outputFile, JSON.stringify({ generated_at: new Date().toISOString(), environment, phases: results }, null, 2), "utf8");
console.log(`Load-test results written to ${outputFile}`);
if (results.some((result) => result.user_failures || result.request_failures)) process.exitCode = 1;
