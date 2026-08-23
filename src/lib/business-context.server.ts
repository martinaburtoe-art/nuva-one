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

export function trialDaysLeft(createdAt: string | null): number {
  if (!createdAt) return TRIAL_DAYS;
  const elapsedDays = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
  return Math.max(0, TRIAL_DAYS - elapsedDays);
}

function todayInChile(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date());
}

export async function buildBusinessContext(supabase: SupabaseClient<Database>, businessId: string) {
  if (!businessId) return null;

  const [business, products, sales, transactions, quotes, purchases, customers] = await Promise.all([
    supabase
      .from("businesses")
      .select("name, industry, size, plan, owner_granted_access, owner_grant_expires_at, created_at")
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
    supabase
      .from("customers")
      .select("name, phone, status, tags, notes")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  if (!business.data) return null;

  const ownerGrantActive =
    business.data.owner_granted_access === true &&
    (!business.data.owner_grant_expires_at || new Date(business.data.owner_grant_expires_at).getTime() > Date.now());
  const effectivePlan = ownerGrantActive ? "pro" : business.data.plan;

  const lowStock = (products.data ?? []).filter((p) => p.stock <= p.low_stock_threshold);
  const totalStockUnits = (products.data ?? []).reduce((s, p) => s + (p.stock ?? 0), 0);
  const income = (transactions.data ?? [])
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const expense = (transactions.data ?? [])
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);

  return {
    business: {
      ...business.data,
      plan: effectivePlan,
    },
    summary: {
      today: todayInChile(),
      plan: effectivePlan,
      access: ownerGrantActive ? "owner_granted_full_access" : "subscription_or_trial",
      trial_days_left: effectivePlan === "pro" ? null : trialDaysLeft(business.data.created_at),
      net_cash_flow: income - expense,
      total_income: income,
      total_expense: expense,
      product_count: products.data?.length ?? 0,
      total_stock_units: totalStockUnits,
      products: (products.data ?? []).map((p) => ({ name: p.name, sku: p.sku, stock: p.stock })),
      low_stock_products: lowStock.map((p) => ({ name: p.name, stock: p.stock, threshold: p.low_stock_threshold })),
      recent_sales: sales.data ?? [],
      recent_transactions: transactions.data ?? [],
      recent_quotes: quotes.data ?? [],
      recent_purchases: purchases.data ?? [],
      customers: customers.data ?? [],
    },
  };
}

const MAX_CONTEXT_CHARS = 12000;

export function capContext(summary: Record<string, any>): Record<string, any> {
  const trimmable = [
    "recent_purchases",
    "recent_quotes",
    "recent_transactions",
    "recent_sales",
    "customers",
    "products",
  ];
  const out = { ...summary };
  let json = JSON.stringify(out);
  for (const key of trimmable) {
    if (json.length <= MAX_CONTEXT_CHARS) break;
    const arr = out[key];
    if (Array.isArray(arr) && arr.length > 5) {
      out[key] = arr.slice(0, 5);
      out[`${key}_note`] = `Mostrando solo los 5 más recientes de ${arr.length} (recortado por tamaño).`;
      json = JSON.stringify(out);
    }
  }
  return out;
}
