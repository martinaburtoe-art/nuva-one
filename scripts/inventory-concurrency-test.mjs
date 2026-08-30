import { performance } from "node:perf_hooks";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const supabaseUrl = (
  process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ""
).replace(/\/$/, "");
const anonKey =
  process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
const email = process.env.LOAD_TEST_EMAIL ?? "";
const password = process.env.LOAD_TEST_PASSWORD ?? "";
const phases = (process.env.LOAD_TEST_PHASES ?? "25,50,100")
  .split(",")
  .map(Number)
  .filter((value) => value > 0);
const outputFile =
  process.env.INVENTORY_CONCURRENCY_OUTPUT ??
  "artifacts/inventory-concurrency-results.json";

if (process.env.LOAD_TEST_CONFIRM !== "true") throw new Error("Refusing to run an inventory concurrency test without LOAD_TEST_CONFIRM=true.");
if ((process.env.LOAD_TEST_ENV ?? "").toLowerCase() !== "staging") throw new Error("Refusing inventory concurrency tests outside staging (LOAD_TEST_ENV=staging).");
if (!supabaseUrl || !anonKey || !email || !password) throw new Error("Missing VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, LOAD_TEST_EMAIL or LOAD_TEST_PASSWORD.");

async function request(path, options = {}) {
  const started = performance.now();
  try {
    const response = await fetch(`${supabaseUrl}${path}`, options);
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    return { ok: response.ok, status: response.status, body, elapsed: performance.now() - started, transport_error: null };
  } catch (error) {
    return { ok: false, status: 0, body: null, elapsed: performance.now() - started, transport_error: { name: error?.name ?? "Error", message: error?.message ?? String(error), cause_code: error?.cause?.code ?? null, cause_name: error?.cause?.name ?? null, cause_message: error?.cause?.message ?? null } };
  }
}

async function signIn() {
  const result = await request("/auth/v1/token?grant_type=password", { method: "POST", headers: { apikey: anonKey, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  if (!result.ok || !result.body?.access_token || !result.body?.user?.id) throw new Error(`Auth failed: HTTP ${result.status}; transport=${JSON.stringify(result.transport_error)}; body=${JSON.stringify(result.body)}`);
  return result.body;
}

async function getBusinessId(accessToken, userId) {
  const params = new URLSearchParams({ select: "business_id", user_id: `eq.${userId}`, limit: "1" });
  const result = await request(`/rest/v1/business_members?${params}`, { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` } });
  if (!result.ok || !result.body?.[0]?.business_id) throw new Error(`Membership lookup failed: HTTP ${result.status}; transport=${JSON.stringify(result.transport_error)}; body=${JSON.stringify(result.body)}`);
  return result.body[0].business_id;
}

async function getProduct(accessToken, businessId, sku) {
  const params = new URLSearchParams({ select: "id,sku,name,stock", business_id: `eq.${businessId}`, sku: `eq.${sku}`, limit: "1" });
  const result = await request(`/rest/v1/products?${params}`, { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` } });
  if (!result.ok || !result.body?.[0]) throw new Error(`Fixture product ${sku} not found: HTTP ${result.status}; transport=${JSON.stringify(result.transport_error)}; body=${JSON.stringify(result.body)}`);
  return result.body[0];
}

async function getStock(accessToken, businessId, productId) {
  const params = new URLSearchParams({ select: "id,stock", business_id: `eq.${businessId}`, id: `eq.${productId}`, limit: "1" });
  const result = await request(`/rest/v1/products?${params}`, { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` } });
  if (!result.ok || !result.body?.[0]) throw new Error(`Stock lookup failed: HTTP ${result.status}; transport=${JSON.stringify(result.transport_error)}; body=${JSON.stringify(result.body)}`);
  return Number(result.body[0].stock);
}

async function createSale(accessToken, businessId, product, sequence) {
  return request("/rest/v1/sales", { method: "POST", headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ business_id: businessId, customer_name: `Concurrency Test ${sequence}`, status: "paid", total: Number(product.price ?? 1), sale_date: new Date().toISOString().slice(0, 10), items: [{ product_id: product.id, name: product.name, qty: 1, price: Number(product.price ?? 1) }] }) });
}

function isExpectedInsufficientStock(result) {
  if (result.transport_error || result.ok) return false;
  const bodyText = JSON.stringify(result.body ?? "").toLowerCase();
  return result.status === 400 && String(result.body?.code ?? "") === "23514" && bodyText.includes("stock insuficiente");
}

function serializeFailure(result) {
  return { status: result.status, body: result.body, transport_error: result.transport_error, elapsed_ms: Math.round(result.elapsed) };
}

async function runPhase(accessToken, businessId, phaseVus, phaseIndex) {
  const sku = `NUVA-${String(phaseIndex + 1).padStart(4, "0")}`;
  const product = await getProduct(accessToken, businessId, sku);
  const initialStock = Number(product.stock);
  if (!Number.isInteger(initialStock) || initialStock <= 0) throw new Error(`Invalid fixture stock for ${sku}: ${product.stock}`);
  console.log(`\nInventory concurrency phase: ${phaseVus} concurrent sales against ${sku} with stock=${initialStock}`);
  const started = performance.now();
  const results = await Promise.all(Array.from({ length: phaseVus }, (_, index) => createSale(accessToken, businessId, product, index + 1)));
  const elapsed = performance.now() - started;
  const successful = results.filter((result) => result.ok).length;
  const rejected = results.filter(isExpectedInsufficientStock).length;
  const unexpected = results.filter((result) => !result.ok && !isExpectedInsufficientStock(result));
  const finalStock = await getStock(accessToken, businessId, product.id);
  const expectedSuccessful = Math.min(phaseVus, initialStock);
  const expectedRejected = phaseVus - expectedSuccessful;
  const summary = { vus: phaseVus, sku, initial_stock: initialStock, attempted: phaseVus, successful_commits: successful, rejected_insufficient_stock: rejected, unexpected_errors: unexpected.length, unexpected_error_details: unexpected.slice(0, 20).map(serializeFailure), final_stock: finalStock, expected_successful_commits: expectedSuccessful, expected_rejections: expectedRejected, oversell: finalStock < 0 || successful > initialStock, stock_delta_matches_commits: initialStock - finalStock === successful, transport_failures: results.filter((result) => result.transport_error).length, total_seconds: Number((elapsed / 1000).toFixed(2)), p95_ms: Math.round(results.map((result) => result.elapsed).sort((a, b) => a - b)[Math.max(0, Math.ceil(results.length * 0.95) - 1)]) };
  console.table(summary);
  if (successful !== expectedSuccessful || rejected !== expectedRejected || unexpected.length !== 0 || summary.transport_failures !== 0 || finalStock < 0 || successful > initialStock || !summary.stock_delta_matches_commits) throw new Error(`Inventory concurrency invariant failed for ${sku}: ${JSON.stringify(summary)}`);
  return summary;
}

const session = await signIn();
const businessId = await getBusinessId(session.access_token, session.user.id);
const results = [];
for (let index = 0; index < phases.length; index += 1) results.push(await runPhase(session.access_token, businessId, phases[index], index));
await mkdir(dirname(outputFile), { recursive: true });
await writeFile(outputFile, JSON.stringify({ generated_at: new Date().toISOString(), environment: "staging", phases: results }, null, 2), "utf8");
console.log(`Inventory concurrency evidence written to ${outputFile}`);
