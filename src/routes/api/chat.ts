import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import type { Database } from "@/integrations/supabase/types";

// Builds a lightweight, current snapshot of the business to ground the AI's
// answers in real data. Uses the user's own JWT (not the service role), so
// Postgres RLS enforces that only data for businesses the user belongs to
// can ever be read here -- this endpoint cannot be used to read another
// business's data even if a malicious x-business-id header is sent. The
// caller (the POST handler below) has already verified this token belongs
// to a real, signed-in user before this function is ever called.
async function buildBusinessContext(token: string, businessId: string) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !businessId) return null;

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });

  const [business, products, sales, transactions, quotes] = await Promise.all([
    supabase.from("businesses").select("name, industry, size").eq("id", businessId).maybeSingle(),
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
  ]);

  // If RLS blocked everything (user isn't actually a member of this business),
  // business.data will be null -- treat as "no context" rather than erroring loudly.
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
    },
  };
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          return new Response(JSON.stringify({ error: "AI no configurado" }), { status: 500 });
        }
        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
          return new Response(JSON.stringify({ error: "Configuración de Supabase incompleta" }), { status: 500 });
        }

        // Require a valid, signed-in user. Without this check, the endpoint
        // would happily stream an AI response to anyone, authenticated or
        // not, burning AI Gateway credits with no business context at all.
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
        if (!token) {
          return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 });
        }

        const authedSupabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
        });
        const { data: claims, error: claimsError } = await authedSupabase.auth.getClaims(token);
        if (claimsError || !claims?.claims?.sub) {
          return new Response(JSON.stringify({ error: "Sesión inválida o expirada" }), { status: 401 });
        }

        const body = (await request.json()) as { messages?: UIMessage[] };
        const messages = body.messages ?? [];
        const businessId = request.headers.get("x-business-id") ?? "";

        let contextBlock =
          "No hay un negocio activo seleccionado, o no se pudo verificar el acceso del usuario a este negocio.";
        if (businessId) {
          try {
            const ctx = await buildBusinessContext(token, businessId);
            if (ctx) {
              contextBlock = `Datos actuales del negocio "${ctx.business.name}" (industria: ${ctx.business.industry}):\n${JSON.stringify(ctx.summary, null, 2)}`;
            } else {
              contextBlock =
                "No se encontraron datos para este negocio, o el usuario no tiene acceso a él.";
            }
          } catch (err) {
            console.error("Error building business context", err);
          }
        }

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3-flash-preview");

        const system = `Eres el asistente de Nüva One, una plataforma de gestión para PYMEs en Chile y Latinoamérica. Respondes en español neutro de LatAm, en tono profesional pero cercano. Eres breve y accionable.

Tienes acceso al siguiente contexto de datos REALES del negocio del usuario (JSON). Básate ÚNICAMENTE en estos datos para responder preguntas sobre ventas, inventario, finanzas o cotizaciones. Si el contexto no tiene la información que el usuario pide, dilo explícitamente en vez de inventar cifras. Nunca inventes cifras del negocio.

${contextBlock}`;

        try {
          const result = streamText({
            model,
            system,
            messages: await convertToModelMessages(messages),
          });
          return result.toUIMessageStreamResponse({ originalMessages: messages });
        } catch (err: any) {
          console.error("AI error", err);
          const msg =
            err?.statusCode === 429
              ? "Has alcanzado el límite de uso. Intenta más tarde."
              : err?.statusCode === 402
                ? "Sin créditos de IA. Recarga tu plan."
                : "Error en la IA. Intenta nuevamente.";
          return new Response(JSON.stringify({ error: msg }), { status: err?.statusCode ?? 500 });
        }
      },
    },
  },
});
