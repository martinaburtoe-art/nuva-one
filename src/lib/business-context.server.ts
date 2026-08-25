// Builds a lightweight, current business snapshot for Nüva AI.
// The context is deliberately data-minimized: only fields required for
// business analysis are sent to the model. PII such as customer phone numbers
// and free-form notes is excluded unless a dedicated, authorized workflow
// explicitly requires it.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const TRIAL_DAYS = 15;
const MAX_CONTEXT_CHARS = 12000;

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
    supabase.from("businesses").select("id, name, industry, size, plan, created_at").eq("id", businessId).maybeSingle(),
    supabase.from("products").select("name, sku, stock, low_stock_threshold, price, cost, created_at").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50),
    supabase.from("sales").select("customer_name, channel, status, total, sale_date").eq("business_id", businessId).order("sale_date", { ascending: false }).limit(30),
    supabase.from("transactions").select("type, category, amount, tx_date").eq("business_id", businessId).order("tx_date", { ascending: false }).limit(50),
    supabase.from("quotes").select("customer_name, status, total, created_at").eq("business_id", businessId).order("created_at", { ascending: false }).limit(20),
    supabase.from("purchases").select("supplier_name, status, total, purchase_date").eq("business_id", businessId).order("purchase_date", { ascending: false }).limit(20),
    // Data minimization: phone numbers and free-form customer notes are not AI context.
    supabase.from("customers").select("name, status, tags, created_at").eq("business_id", businessId).order("created_at", { ascending: false }).limit(30),
  ]);

  if (!business.data) return null;

  // Missing datasets are explicit evidence gaps rather than silently becoming zeros.
  const queryErrors = [products, sales, transactions, quotes, purchases, customers]
    .filter((result) => result.error)
    .map((result) => result.error?.message ?? "unknown query error");

  const lowStock = (products.data ?? []).filter((p) => p.stock <= p.low_stock_threshold);
  const totalStockUnits = (products.data ?? []).reduce((sum, p) => sum + (p.stock ?? 0), 0);
  const income = (transactions.data ?? []).filter((t) => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0);
  const expense = (transactions.data ?? []).filter((t) => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0);
  const source = (module: string, records: number, latestDate: string | null) => ({ module, records, latest_date: latestDate });

  return {
    business: {
      id: business.data.id,
      name: business.data.name,
      industry: business.data.industry,
      size: business.data.size,
      plan: business.data.plan,
    },
    summary: {
      today: todayInChile(),
      plan: business.data.plan,
      trial_days_left: trialDaysLeft(business.data.created_at),
      net_cash_flow: income - expense,
      total_income: income,
      total_expense: expense,
      product_count: products.data?.length ?? 0,
      total_stock_units: totalStockUnits,
      products: (products.data ?? []).map((p) => ({ name: p.name, sku: p.sku, stock: p.stock, price: p.price, cost: p.cost })),
      low_stock_products: lowStock.map((p) => ({ name: p.name, sku: p.sku, stock: p.stock, threshold: p.low_stock_threshold })),
      recent_sales: sales.data ?? [],
      recent_transactions: transactions.data ?? [],
      recent_quotes: quotes.data ?? [],
      recent_purchases: purchases.data ?? [],
      customers: (customers.data ?? []).map((customer) => ({ name: customer.name, status: customer.status, tags: customer.tags, created_at: customer.created_at })),
      evidence: {
        generated_at: new Date().toISOString(),
        sources: [
          source("businesses", 1, business.data.created_at),
          source("products", products.data?.length ?? 0, products.data?.[0]?.created_at ?? null),
          source("sales", sales.data?.length ?? 0, sales.data?.[0]?.sale_date ?? null),
          source("transactions", transactions.data?.length ?? 0, transactions.data?.[0]?.tx_date ?? null),
          source("quotes", quotes.data?.length ?? 0, quotes.data?.[0]?.created_at ?? null),
          source("purchases", purchases.data?.length ?? 0, purchases.data?.[0]?.purchase_date ?? null),
          source("customers", customers.data?.length ?? 0, customers.data?.[0]?.created_at ?? null),
        ],
        query_errors: queryErrors,
      },
    },
  };
}

export function capContext(summary: Record<string, any>): Record<string, any> {
  const trimmable = ["recent_purchases", "recent_quotes", "recent_transactions", "recent_sales", "customers", "products"];
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
