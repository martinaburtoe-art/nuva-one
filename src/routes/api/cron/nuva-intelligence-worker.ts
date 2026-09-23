import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { buildNuvaOperationalResult } from "@/lib/nuva-operational-orchestrator";
import { runNuvaAgentCouncil } from "@/lib/nuva-intelligence-agent-council";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import type { Database } from "@/integrations/supabase/types";

function json(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export const Route = createFileRoute("/api/cron/nuva-intelligence-worker")({
  server: { handlers: { GET: async ({ request }) => {
    const secret = process.env.CRON_SECRET?.trim();
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return json({ error: "No autorizado" }, 401);
    const { url, ok } = getServerSupabaseEnv();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
    if (!ok || !serviceRoleKey) return json({ error: "Configuración de inteligencia incompleta" }, 503);

    const db = createClient<Database>(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } }) as any;
    const { data: businesses, error } = await db.from("businesses").select("id").order("created_at", { ascending: true }).limit(25);
    if (error) return json({ error: "No se pudieron cargar los negocios" }, 500);

    let scanned = 0;
    let events = 0;
    let risks = 0;
    let opportunities = 0;
    let agentFindings = 0;
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

    for (const business of businesses ?? []) {
      const bid = business.id;
      const [sales, purchases, transactions, products] = await Promise.all([
        db.from("sales").select("total,sale_date,status,paid_amount,due_date").eq("business_id", bid),
        db.from("purchases").select("total,purchase_date,status").eq("business_id", bid),
        db.from("transactions").select("amount,type,tx_date").eq("business_id", bid),
        db.from("products").select("stock,low_stock_threshold,reorder_point,price,name,sku").eq("business_id", bid),
      ]);

      const result = buildNuvaOperationalResult({ sales: sales.data ?? [], purchases: purchases.data ?? [], transactions: transactions.data ?? [], products: products.data ?? [] });
      const now = new Date().toISOString();

      for (const signal of result.decision.signals) {
        const { data: recent } = await db.from("nuva_intelligence_events").select("id").eq("business_id", bid).eq("event_type", signal.id).gte("created_at", since).limit(1);
        if (!recent?.length) {
          const inserted = await db.from("nuva_intelligence_events").insert({ business_id: bid, event_type: signal.id, source_table: "nuva_operational_snapshot", severity: signal.severity, title: signal.title, summary: signal.explanation, evidence: { source: signal.source, metric: signal.metric, unit: signal.unit }, occurred_at: now });
          if (!inserted.error) events++;
        }
        if (["critical", "warning"].includes(signal.severity)) {
          const { data: existing } = await db.from("nuva_risks").select("id").eq("business_id", bid).eq("risk_type", signal.id).eq("status", "open").limit(1);
          if (!existing?.length) {
            const inserted = await db.from("nuva_risks").insert({ business_id: bid, risk_type: signal.id, title: signal.title, description: signal.explanation, severity: signal.severity, probability: signal.severity === "critical" ? 0.8 : 0.55, impact: signal.metric ?? result.decision.score, confidence: 0.75, status: "open", evidence: { source: signal.source, metric: signal.metric, unit: signal.unit }, recommended_action: { action: signal.action }, detected_at: now });
            if (!inserted.error) risks++;
          }
        }
        if (signal.severity === "opportunity") {
          const { data: existing } = await db.from("nuva_opportunities").select("id").eq("business_id", bid).eq("opportunity_type", signal.id).eq("status", "open").limit(1);
          if (!existing?.length) {
            const inserted = await db.from("nuva_opportunities").insert({ business_id: bid, opportunity_type: signal.id, title: signal.title, description: signal.explanation, potential_impact: signal.metric ?? result.decision.score, confidence: 0.7, status: "open", evidence: { source: signal.source, metric: signal.metric, unit: signal.unit }, recommended_action: { action: signal.action }, detected_at: now });
            if (!inserted.error) opportunities++;
          }
        }
      }

      const council = runNuvaAgentCouncil({
        revenue: result.snapshot.revenue,
        cashAvailable: result.snapshot.cashAvailable,
        projectedCash30d: result.snapshot.projectedCash30d,
        overdueReceivables: result.snapshot.overdueReceivables,
        inventoryValue: result.snapshot.inventoryValue,
        lowStockSkus: result.snapshot.lowStockSkus,
        stockoutRisk: result.snapshot.stockoutRisk,
        grossMargin: result.snapshot.grossMargin,
        complianceReadiness: result.snapshot.complianceReadiness,
        salesCount: sales.data?.length ?? 0,
        purchaseSpend: (purchases.data ?? []).reduce((sum: number, purchase: any) => sum + Number(purchase.total ?? 0), 0),
      });

      for (const finding of council.findings) {
        const eventType = `agent:${finding.agentId}:${finding.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
        const { data: recentAgentEvent } = await db.from("nuva_intelligence_events").select("id").eq("business_id", bid).eq("event_type", eventType).gte("created_at", since).limit(1);
        if (!recentAgentEvent?.length) {
          const inserted = await db.from("nuva_intelligence_events").insert({
            business_id: bid,
            event_type: eventType,
            source_table: "nuva_agent_council",
            severity: finding.severity === "opportunity" ? "opportunity" : finding.severity === "critical" ? "critical" : finding.severity === "high" ? "warning" : "info",
            title: finding.title,
            summary: finding.explanation,
            evidence: { agentId: finding.agentId, confidence: finding.confidence, impact: finding.impact, requiresApproval: finding.requiresApproval, ...finding.evidence },
            occurred_at: now,
          });
          if (!inserted.error) agentFindings++;
        }

        if (["critical", "high"].includes(finding.severity)) {
          const { data: existing } = await db.from("nuva_risks").select("id").eq("business_id", bid).eq("risk_type", eventType).eq("status", "open").limit(1);
          if (!existing?.length) {
            const inserted = await db.from("nuva_risks").insert({
              business_id: bid,
              risk_type: eventType,
              title: `[${finding.agentId}] ${finding.title}`,
              description: finding.explanation,
              severity: finding.severity,
              probability: finding.confidence,
              impact: finding.impact,
              confidence: finding.confidence,
              status: "open",
              evidence: finding.evidence,
              recommended_action: { action: finding.action, agentId: finding.agentId, requiresApproval: finding.requiresApproval },
              detected_at: now,
            });
            if (!inserted.error) risks++;
          }
        }
        if (finding.severity === "opportunity") {
          const { data: existing } = await db.from("nuva_opportunities").select("id").eq("business_id", bid).eq("opportunity_type", eventType).eq("status", "open").limit(1);
          if (!existing?.length) {
            const inserted = await db.from("nuva_opportunities").insert({
              business_id: bid,
              opportunity_type: eventType,
              title: `[${finding.agentId}] ${finding.title}`,
              description: finding.explanation,
              potential_impact: finding.impact,
              confidence: finding.confidence,
              status: "open",
              evidence: finding.evidence,
              recommended_action: { action: finding.action, agentId: finding.agentId },
              detected_at: now,
            });
            if (!inserted.error) opportunities++;
          }
        }
      }

      if (council.consensus.priority) {
        const priority = council.consensus.priority;
        await db.from("nuva_business_memory").insert({
          business_id: bid,
          memory_type: "agent_consensus",
          title: council.consensus.headline,
          content: `${priority.agentId}: ${priority.explanation} Acción propuesta: ${priority.action}`,
          source_type: "nuva_agent_council",
          evidence: { agentsConsulted: council.consensus.agentsConsulted, confidence: council.consensus.confidence, priority },
          confidence: council.consensus.confidence,
          valid_from: now,
        });
      }

      scanned++;
    }

    return json({ ok: true, scanned, events, risks, opportunities, agentFindings });
  } } },
});
