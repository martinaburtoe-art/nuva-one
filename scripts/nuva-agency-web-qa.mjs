import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = (process.env.NUVA_QA_URL ?? "https://nuva-one.vercel.app").replace(/\/$/, "");
const timeoutMs = Number(process.env.NUVA_QA_TIMEOUT_MS ?? 12000);
const routes = (process.env.NUVA_QA_ROUTES ?? "/,/dashboard,/sales,/inventory,/customers,/quotes,/invoices,/finance,/finance-accounting,/people,/shifts,/caja-control,/inventario-conteo,/foro,/directorio,/news")
  .split(",")
  .map((route) => route.trim())
  .filter(Boolean);

const checks = [];
const assetChecks = new Map();

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();

  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "nuva-agency-qa/1.0" },
    });

    return {
      response,
      durationMs: Date.now() - started,
    };
  } finally {
    clearTimeout(timer);
  }
}

function addCheck(name, status, detail, metadata = {}) {
  checks.push({
    name,
    status,
    detail,
    metadata,
    observedAt: new Date().toISOString(),
  });
}

function absoluteAssetUrls(html, pageUrl) {
  const urls = new Set();
  const patterns = [
    /<script[^>]+src=["']([^"']+)["']/gi,
    /<link[^>]+href=["']([^"']+)["']/gi,
    /<img[^>]+src=["']([^"']+)["']/gi,
    /<source[^>]+src=["']([^"']+)["']/gi,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      try {
        const url = new URL(match[1], pageUrl);
        if (url.origin === new URL(pageUrl).origin) urls.add(url.href);
      } catch {
        // Invalid references are reported by the caller through the page check.
      }
    }
  }

  return [...urls];
}

async function checkRoute(route) {
  const url = new URL(route, baseUrl).href;

  try {
    const { response, durationMs } = await fetchWithTimeout(url);
    const contentType = response.headers.get("content-type") ?? "";
    const html = await response.text();

    const validStatus = response.status >= 200 && response.status < 400;
    const hasDocument = /<html[\s>]/i.test(html) && /<body[\s>]/i.test(html);
    const title = html.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]?.trim() ?? "";
    const assets = absoluteAssetUrls(html, url);
    const viewport = html.match(/<meta[^>]+name=["']viewport["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? "";
    const mobileViewportReady = /width=device-width/i.test(viewport) && /viewport-fit=cover/i.test(viewport);

    addCheck(
      `route:${route}`,
      validStatus && hasDocument ? "healthy" : "critical",
      validStatus && hasDocument
        ? `HTTP ${response.status}; HTML document detected`
        : `Route returned HTTP ${response.status} or an incomplete HTML document`,
      {
        url,
        status: response.status,
        durationMs,
        contentType,
        title,
        assetCount: assets.length,
      },
    );

    addCheck(
      `mobile:viewport:${route}`,
      mobileViewportReady ? "healthy" : "critical",
      mobileViewportReady
        ? "Responsive viewport and safe-area support are declared"
        : "Missing width=device-width or viewport-fit=cover in the document viewport",
      { url, viewport },
    );

    if (!validStatus || !hasDocument) return;

    const results = await Promise.all(assets.map(async (assetUrl) => {
      if (!assetChecks.has(assetUrl)) {
        assetChecks.set(assetUrl, (async () => {
          try {
            const asset = await fetchWithTimeout(assetUrl);
            return { ok: asset.response.ok, status: asset.response.status };
          } catch (error) {
            return { ok: false, error: error instanceof Error ? error.message : String(error) };
          }
        })());
      }
      return { url: assetUrl, ...(await assetChecks.get(assetUrl)) };
    }));
    const assetFailures = results.filter((result) => !result.ok).map((result) =>
      `${result.status ?? "NETWORK"} ${result.url}: ${result.error ?? "request failed"}`,
    );

    addCheck(
      `assets:${route}`,
      assetFailures.length === 0 ? "healthy" : "critical",
      assetFailures.length === 0
        ? `All ${assets.length} referenced same-origin assets responded successfully`
        : `${assetFailures.length} referenced assets failed`,
      { failures: assetFailures.slice(0, 20) },
    );
  } catch (error) {
    addCheck(
      `route:${route}`,
      "critical",
      error instanceof Error ? error.message : String(error),
      { url },
    );
  }
}

async function checkSecurityHeaders() {
  try {
    const { response } = await fetchWithTimeout(baseUrl);
    const required = [
      "content-type",
      "x-content-type-options",
      "referrer-policy",
    ];
    const missing = required.filter((name) => !response.headers.has(name));

    addCheck(
      "security:headers",
      missing.length === 0 ? "healthy" : "warning",
      missing.length === 0
        ? "Baseline browser security headers are present"
        : `Missing baseline headers: ${missing.join(", ")}`,
      { missing },
    );
  } catch (error) {
    addCheck(
      "security:headers",
      "critical",
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function checkPwaAssets() {
  try {
    const manifestUrl = new URL("/manifest.webmanifest", baseUrl).href;
    const manifestResult = await fetchWithTimeout(manifestUrl);
    const manifestText = await manifestResult.response.text();
    let manifest;
    try {
      manifest = JSON.parse(manifestText);
    } catch {
      manifest = null;
    }

    const manifestValid = manifestResult.response.ok
      && manifest
      && manifest.display === "standalone"
      && typeof manifest.start_url === "string"
      && manifest.start_url.startsWith("/dashboard")
      && Array.isArray(manifest.icons)
      && manifest.icons.length >= 2;

    addCheck(
      "pwa:manifest",
      manifestValid ? "healthy" : "critical",
      manifestValid
        ? "Install manifest declares standalone display, dashboard start URL and app icons"
        : "PWA manifest is unavailable or missing required install metadata",
      { url: manifestUrl, status: manifestResult.response.status, display: manifest?.display, startUrl: manifest?.start_url, iconCount: manifest?.icons?.length ?? 0 },
    );

    const swUrl = new URL("/sw.js", baseUrl).href;
    const swResult = await fetchWithTimeout(swUrl);
    const swText = await swResult.response.text();
    const safeWorker = swResult.response.ok
      && swText.includes("HASHED_ASSET")
      && swText.includes("Authenticated HTML, API responses, Supabase data and user documents are NEVER cached");

    addCheck(
      "pwa:service-worker",
      safeWorker ? "healthy" : "critical",
      safeWorker
        ? "Service worker is available and limits caching to hashed static assets"
        : "Service worker is unavailable or its cache-safety contract is missing",
      { url: swUrl, status: swResult.response.status },
    );

    const iconFailures = [];
    for (const icon of manifest?.icons ?? []) {
      if (!icon?.src) {
        iconFailures.push("Manifest icon is missing a source path");
        continue;
      }
      const iconUrl = new URL(icon.src, manifestUrl).href;
      try {
        const iconResult = await fetchWithTimeout(iconUrl);
        if (!iconResult.response.ok) iconFailures.push(`${iconResult.response.status} ${iconUrl}`);
      } catch (error) {
        iconFailures.push(`${iconUrl}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    addCheck(
      "pwa:icons",
      manifestValid && iconFailures.length === 0 ? "healthy" : "critical",
      iconFailures.length === 0 && manifestValid
        ? `All ${manifest.icons.length} install icons responded successfully`
        : `${iconFailures.length} icon resources failed or manifest is invalid`,
      { failures: iconFailures },
    );
  } catch (error) {
    addCheck("pwa:assets", "critical", error instanceof Error ? error.message : String(error));
  }
}

async function main() {
  await Promise.all([...routes.map(checkRoute), checkPwaAssets()]);
  await checkSecurityHeaders();

  const critical = checks.filter((check) => check.status === "critical").length;
  const warning = checks.filter((check) => check.status === "warning").length;
  const healthy = checks.filter((check) => check.status === "healthy").length;

  const report = {
    version: "web-qa-v1",
    generatedAt: new Date().toISOString(),
    target: baseUrl,
    routes,
    status: critical ? "critical" : warning ? "warning" : "healthy",
    totals: {
      checks: checks.length,
      healthy,
      warning,
      critical,
    },
    checks,
  };

  await mkdir("artifacts/nuva-agency", { recursive: true });
  await writeFile(
    "artifacts/nuva-agency/web-qa.json",
    JSON.stringify(report, null, 2),
  );

  console.log(JSON.stringify(report, null, 2));

  if (critical) process.exitCode = 2;
  else if (warning) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 2;
});
