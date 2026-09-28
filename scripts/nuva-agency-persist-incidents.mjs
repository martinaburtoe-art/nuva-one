import { readFile } from "node:fs/promises";

const supabaseUrl = process.env.NUVA_SUPABASE_URL?.replace(/\/$/, "");
const serviceRoleKey = process.env.NUVA_SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  if (!supabaseUrl || !serviceRoleKey) {
    console.log(JSON.stringify({
      status: "skipped",
      reason: "NUVA_SUPABASE_URL or NUVA_SUPABASE_SERVICE_ROLE_KEY is not configured",
    }));
    return;
  }

  const bundle = JSON.parse(
    await readFile("artifacts/nuva-agency/incident-bundle.json", "utf8"),
  );

  let inserted = 0;
  let alreadyOpen = 0;

  for (const incident of bundle.incidents) {
    const lookupUrl =
      `${supabaseUrl}/rest/v1/ops_incidents?select=id,fingerprint,status&fingerprint=eq.${encodeURIComponent(incident.fingerprint)}&status=eq.open&limit=1`;

    const lookup = await fetch(lookupUrl, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!lookup.ok) {
      throw new Error(`Supabase incident lookup failed: HTTP ${lookup.status}`);
    }

    const existing = await lookup.json();
    if (existing.length > 0) {
      alreadyOpen += 1;
      continue;
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/ops_incidents`, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        fingerprint: incident.fingerprint,
        check_name: incident.name,
        severity: incident.severity.toLowerCase(),
        status: "open",
        summary: incident.summary,
        details: incident.evidence,
        consecutive_failures: 1,
        triage: {
          hypothesis: incident.hypothesis,
          verification: incident.verification,
          source: incident.source,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Supabase incident insert failed: HTTP ${response.status} ${body}`,
      );
    }

    inserted += 1;
  }

  console.log(JSON.stringify({
    status: "ok",
    inserted,
    alreadyOpen,
    total: bundle.incidents.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 2;
});
