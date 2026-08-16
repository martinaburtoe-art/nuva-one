#!/usr/bin/env node

/**
 * Nüva One production readiness load harness.
 *
 * Public route test:
 *   BASE_URL=https://nuva-one.vercel.app LOAD_CONCURRENCY=100 npm run load:test
 *
 * Authenticated Supabase RPC test (recommended after creating a dedicated load-test user):
 *   BASE_URL=https://nuva-one.vercel.app \
 *   SUPABASE_URL=https://<project>.supabase.co \
 *   SUPABASE_ANON_KEY=<publishable-key> \
 *   LOAD_TEST_EMAIL=<dedicated-user> \
 *   LOAD_TEST_PASSWORD=<dedicated-password> \
 *   LOAD_TEST_BUSINESS_ID=<business-id> \
 *   LOAD_TARGET=dashboard-kpis \
 *   LOAD_CONCURRENCY=100 npm run load:test
 *
 * Never use a real customer's credentials. The harness is intentionally opt-in.
 */

const baseUrl = (process.env.BASE_URL || "https://nuva-one.vercel.app").replace(/\/$/, "");
const concurrency = Number(process.env.LOAD_CONCURRENCY || 10);
const iterations = Number(process.env.LOAD_ITERATIONS || 5);
const timeoutMs = Number(process.env.LOAD_TIMEOUT_MS || 15000);
const target = process.env.LOAD_TARGET || "public";

const publicPaths = ["/", "/experiencia", "/demo", "/privacy", "/auth"];

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

async function fetchWithTimeout(url, init = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, redirect: "manual" });
    return { status: response.status, ms: performance.now() - started };
  } catch (error) {
    return { status: 0, ms: performance.now() - started, error: String(error) };
  } finally {
    clearTimeout(timer);
  }
}

async function signIn() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  const email = process.env.LOAD_TEST_EMAIL;
  const password = process.env.LOAD_TEST_PASSWORD;
  if (!url || !key || !email || !password) {
    throw new Error("Authenticated load target requires SUPABASE_URL, SUPABASE_ANON_KEY, LOAD_TEST_EMAIL and LOAD_TEST_PASSWORD");
  }
  const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: key, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(`Supabase sign-in failed: HTTP ${response.status}`);
  const data = await response.json();
  return { accessToken: data.access_token, apiKey: key };
}

async function runPublic() {
  const results = [];
  for (let i = 0; i < iterations; i++) {
    const batch = Array.from({ length: concurrency }, (_, worker) => {
      const path = publicPaths[(i * concurrency + worker) % publicPaths.length];
      return fetchWithTimeout(`${baseUrl}${path}`);
    });
    results.push(...(await Promise.all(batch)));
  }
  return results;
}

async function runDashboardKpis() {
  const { accessToken, apiKey } = await signIn();
  const businessId = process.env.LOAD_TEST_BUSINESS_ID;
  if (!businessId) throw new Error("LOAD_TEST_BUSINESS_ID is required for dashboard-kpis target");
  const url = `${process.env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/rpc/get_dashboard_kpis`;
  const results = [];
  for (let i = 0; i < iterations; i++) {
    const batch = Array.from({ length: concurrency }, () => fetchWithTimeout(url, {
      method: "POST",
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ p_business_id: businessId }),
    }));
    results.push(...(await Promise.all(batch)));
  }
  return results;
}

const results = target === "dashboard-kpis" ? await runDashboardKpis() : await runPublic();
const latencies = results.map((r) => r.ms);
const errors = results.filter((r) => r.status === 0 || r.status >= 500);
const non2xx = results.filter((r) => r.status < 200 || r.status >= 400);

console.log(JSON.stringify({
  baseUrl,
  target,
  concurrency,
  iterations,
  requests: results.length,
  errors: errors.length,
  non2xx: non2xx.length,
  errorRate: results.length ? Number((errors.length / results.length).toFixed(4)) : 0,
  p50_ms: Math.round(percentile(latencies, 50)),
  p95_ms: Math.round(percentile(latencies, 95)),
  p99_ms: Math.round(percentile(latencies, 99)),
}, null, 2));

if (errors.length > 0) process.exitCode = 1;
