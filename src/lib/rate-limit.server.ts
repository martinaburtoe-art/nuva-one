/**
 * Server-side rate limiting helper, backed by the `check_rate_limit` Postgres
 * function (fixed-window counter).
 *
 * A rate-limit failure is fail-closed: protected endpoints must never become
 * unlimited because the limiter is temporarily unavailable. The caller can
 * surface a retryable response to the user.
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
    console.error("check_rate_limit RPC error, failing closed:", error);
    try {
      await supabaseAdmin.from("system_alerts").insert({
        source: "rate_limit_fail_closed",
        message: `check_rate_limit RPC failed for bucket "${bucketKey}"; request blocked`,
        metadata: { bucketKey, maxRequests, windowSeconds, error: error.message },
      });
    } catch (alertError) {
      console.error("Failed to persist rate-limit alert:", alertError);
    }
    return false;
  }

  return data === true;
}
