// En Vercel, server functions receive process.env directly. Publishable keys
// may be reused for authenticated user-scoped work; service-role credentials
// are exposed only through this server-only helper for verified webhooks/jobs.
export function getServerSupabaseEnv() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const anonKey =
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";
  return { url, anonKey, serviceRoleKey, ok: Boolean(url && anonKey) };
}
