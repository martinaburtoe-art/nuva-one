/**
 * Server-side rate limiting helper, backed by the `check_rate_limit` Postgres
 * function (fixed-window counter, same pattern as the AI chat's daily limit).
 *
 * This is intentionally simple (fixed window, not sliding/token-bucket) --
 * good enough to stop casual abuse and accidental retry storms. It is NOT
 * meant to withstand a determined distributed attacker; that would need
 * IP-level throttling at the edge (Vercel/Cloudflare), which is a separate,
 * infra-level concern.
 *
 * Must be called with the service-role client, since check_rate_limit is
 * intentionally not executable by anon/authenticated.
 */
export async function checkRateLimit(
  bucketKey: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
    p_bucket_key: bucketKey,
    p_max_requests: maxRequests,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    // Fail OPEN, not closed: a rate-limiter outage should not take down
    // checkout/billing for every user. console.error alone is invisible
    // once the serverless invocation ends, so also persist it to
    // system_alerts -- best-effort, must never throw or block the request
    // that's already failing open.
    console.error("check_rate_limit RPC error, allowing request through:", error);
    try {
      await supabaseAdmin.from("system_alerts").insert({
        source: "rate_limit_fail_open",
        message: `check_rate_limit RPC failed for bucket "${bucketKey}"; request allowed through`,
        metadata: { bucketKey, maxRequests, windowSeconds, error: error.message },
      });
    } catch (alertError) {
      console.error("Failed to persist rate-limit alert:", alertError);
    }
    return true;
  }

  return data === true;
}
