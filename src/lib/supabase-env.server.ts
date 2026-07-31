// En Vercel, las funciones serverless reciben TODAS las env vars del
// proyecto en process.env, tengan o no el prefijo VITE_ (ese prefijo solo
// afecta qué queda embebido en el bundle del cliente en build time). Como
// SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY son valores públicos (anon key),
// no hay problema en reusar las mismas VITE_SUPABASE_* ya configuradas si
// las variantes sin prefijo no existen -- evita depender de duplicar cada
// secret dos veces en el dashboard de Vercel.
export function getServerSupabaseEnv() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const anonKey =
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  return { url, anonKey, ok: Boolean(url && anonKey) };
}
