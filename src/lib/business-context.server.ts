// Builds a lightweight, current snapshot of a business (sales, inventory,
// finances, quotes, purchases) to ground the AI assistant's
// answers in real data. Shared by:
//   - /api/chat (web dashboard chat), called with a user-authed client so
//     Postgres RLS enforces access -- this function itself does no auth
//     checking, the caller must have already verified access.
//   - /api/whatsapp/webhook (owner-linked personal WhatsApp assistant),
//     called with the service-role client, scoped explicitly by
//     business_id (same pattern already used for the customer-facing
//     catalog bot in that file) since a linked owner number has already
//     been resolved to a specific business_id before this is called.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const TRIAL_DAYS = 15;

// Mirrors the trial math in dashboard-shell.tsx so the assistant's own
// picture of "days left" never drifts from what the user sees in the UI.
export function trialDaysLeft(createdAt: string | null): number {
  if (!createdAt) return TRIAL_DAYS;
  const elapsedDays = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
  return Math.max(0, TRIAL_DAYS - elapsedDays);
}

export async function buildBusinessContext(supabase: SupabaseClient<Database>, businessId: string) {
  if (!businessId) return null;

  const [business, products, sales, transactions, quotes, purchases] =
    await Promise.all([
      supabase
        .from("businesses")
        .select("name, industry, size, plan, created_at")
        .eq("id", businessId)
        .maybeSingle(),
      supabase
        .from("products")
        .select("name, sku, stock, low_stock_threshold, price, cost")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("sales")
        .select("customer_name, channel, status, total, sale_date")
        .eq("business_id", businessId)
        .order("sale_date", { ascending: false })
        .limit(30),
      supabase
        .from("transactions")
        .select("type, category, amount, tx_date")
        .eq("business_id", businessId)
        .order("tx_date", { ascending: false })
        .limit(50),
      supabase
        .from("quotes")
        .select("customer_name, status, total, created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("purchases")
        .select("supplier_name, status, total, purchase_date")
        .eq("business_id", businessId)
        .order("purchase_date", { ascending: false })
        .limit(20),
    ]);

  // If RLS (web caller) or the explicit business_id filter (admin caller)
  // turned up nothing, treat as "no context" rather than erroring loudly.
  if (!business.data) return null;

  const lowStock = (products.data ?? []).filter((p) => p.stock <= p.low_stock_threshold);
  const income = (transactions.data ?? [])
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const expense = (transactions.data ?? [])
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);

  return {
    business: business.data,
    summary: {
      plan: business.data.plan,
      trial_days_left:
        business.data.plan === "pro" ? null : trialDaysLeft(business.data.created_at),
      net_cash_flow: income - expense,
      total_income: income,
      total_expense: expense,
      product_count: products.data?.length ?? 0,
      low_stock_products: lowStock.map((p) => ({
        name: p.name,
        stock: p.stock,
        threshold: p.low_stock_threshold,
      })),
      recent_sales: sales.data ?? [],
      recent_transactions: transactions.data ?? [],
      recent_quotes: quotes.data ?? [],
      recent_purchases: purchases.data ?? [],
    },
  };
}

// Rough safety net against context bloat: ~4 chars/token, so this caps the
// business_data block at roughly 2000 tokens. If it's ever exceeded (e.g. a
// business with unusually long product/customer names), older recent_*
// entries are dropped rather than truncating mid-JSON.
const MAX_CONTEXT_CHARS = 8000;

export function capContext(summary: Record<string, any>): Record<string, any> {
  const trimmable = [
    "recent_purchases",
    "recent_quotes",
    "recent_transactions",
    "recent_sales",
  ];
  const out = { ...summary };
  let json = JSON.stringify(out);
  for (const key of trimmable) {
    if (json.length <= MAX_CONTEXT_CHARS) break;
    const arr = out[key];
    if (Array.isArray(arr) && arr.length > 5) {
      out[key] = arr.slice(0, 5);
      out[`${key}_note`] =
        `Mostrando solo los 5 más recientes de ${arr.length} (recortado por tamaño).`;
      json = JSON.stringify(out);
    }
  }
  return out;
}
