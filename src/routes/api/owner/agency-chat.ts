import { createFileRoute } from "@tanstack/react-router";
import { streamText } from "ai";
import { createClient } from "@supabase/supabase-js";
import { getChatModel } from "@/lib/ai-gateway.server";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";

const WORKERS = {
  constructor: { name: "Constructor", role: "Engineering", focus: "Construcción y reparación" },
  orchestrator: { name: "Orchestrator", role: "Dirección", focus: "Coordinación de Agency" },
  finance: { name: "Finance", role: "Finanzas", focus: "Caja, contabilidad y métricas" },
  sales: { name: "Sales", role: "Ventas", focus: "Ventas, CRM y conversión" },
  supply: { name: "Supply", role: "Abastecimiento", focus: "Compras e inventario" },
  people: { name: "People", role: "Personas", focus: "Nüva People y nómina" },
  compliance: { name: "Compliance", role: "Cumplimiento", focus: "Normativa y riesgo" },
  growth: { name: "Growth", role: "Growth", focus: "Producto y crecimiento" },
  security: { name: "Security", role: "Seguridad", focus: "AppSec, RLS y privacidad" },
  qa: { name: "QA", role: "Quality", focus: "Tests y regresiones" },
  sentinel: { name: "Sentinel", role: "Observabilidad", focus: "Salud y anomalías" },
  ux: { name: "UX", role: "Experiencia", focus: "UI, accesibilidad y responsive" },
  release: { name: "Release", role: "Release Engineering", focus: "Gates y certificación" },
} as const;

const WORKER_IDS = new Set(Object.keys(WORKERS));

const SYSTEM = `Eres un trabajador interno de Nüva Agency de Nüva One. Trabajas exclusivamente para el Owner autenticado.

No inventes commits, PRs, tests, deployments, ejecuciones ni certificaciones. Si no tienes evidencia, dilo.
No reintroduzcas Nüva Studio, WhatsApp ni n8n. No dupliques Nüva Intelligence.
Tu aprendizaje continuo es memoria + evidencia + feedback del Owner; no afirmes que reentrenaste un modelo fundacional.
Cuando el Owner pida un reporte, responde: Resumen → Hallazgos → Aprendizajes → Riesgos → Próximas acciones → Evidencia.
`;

export const Route = createFileRoute("/api/owner/agency-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { url, anonKey, serviceRoleKey, ok } = getServerSupabaseEnv();
        if (!ok) return new Response(JSON.stringify({ error: "Configuración de Supabase incompleta" }), { status: 500 });

        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
        if (!token) return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401 });

        const authClient = createClient(url, anonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await authClient.auth.getUser(token);
        if (error || !data.user) return new Response(JSON.stringify({ error: "Sesión inválida o expirada" }), { status: 401 });
        if (data.user.app_metadata?.platform_role !== "owner") return new Response(JSON.stringify({ error: "AGENCY_ACCESS_DENIED" }), { status: 403 });

        const body = await request.json() as {
          agentId?: string;
          messages?: Array<{ role: "user" | "assistant"; content: string }>;
          feedback?: boolean;
          prompt?: string;
          response?: string;
        };
        const agentId = body.agentId ?? "constructor";
        if (!WORKER_IDS.has(agentId)) return new Response(JSON.stringify({ error: "AGENCY_WORKER_NOT_FOUND" }), { status: 400 });

        if (typeof body.feedback === "boolean" && body.response?.trim() && serviceRoleKey) {
          const bytes = new TextEncoder().encode(`${agentId}|${(body.prompt ?? "").slice(0, 500)}|${body.response.slice(0, 1500)}`);
          const digest = await crypto.subtle.digest("SHA-256", bytes);
          const fingerprint = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
          const db = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
          const { data: previous } = await db.from("ops_agent_learning").select("confidence,occurrences").eq("agent_id", agentId).eq("fingerprint", fingerprint).maybeSingle();
          const confidence = Math.max(0, Math.min(1, Number(previous?.confidence ?? 0.5) + (body.feedback ? 0.05 : -0.1)));
          const { error: saveError } = await db.from("ops_agent_learning").upsert({
            agent_id: agentId,
            fingerprint,
            lesson_type: body.feedback ? "success" : "regression",
            title: body.feedback ? "Respuesta validada por Owner" : "Respuesta corregida por Owner",
            lesson: body.response.slice(0, 4000),
            confidence,
            occurrences: Number(previous?.occurrences ?? 0) + 1,
            metadata: { feedback: body.feedback ? "positive" : "negative", prompt_excerpt: (body.prompt ?? "").slice(0, 500), source: "owner-control-tower" },
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "agent_id,fingerprint" });
          if (saveError) return new Response(JSON.stringify({ error: "No se pudo guardar el aprendizaje" }), { status: 500 });
          return Response.json({ ok: true, confidence });
        }

        const messages = (body.messages ?? []).slice(-20).filter((message) => message.content.trim());
        if (!messages.length) return new Response(JSON.stringify({ error: "No hay mensajes para procesar." }), { status: 400 });

        let history = "";
        let learning = "";
        if (serviceRoleKey) {
          try {
            const db = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
            const [historyResult, learningResult] = await Promise.all([
              db.from("agentes_historial").select("role,content").eq("session_id", `owner-agency:${agentId}`).order("created_at", { ascending: false }).limit(12),
              db.from("ops_agent_learning").select("lesson_type,title,lesson,confidence,occurrences").eq("agent_id", agentId).order("last_seen_at", { ascending: false }).limit(8),
            ]);
            history = JSON.stringify((historyResult.data ?? []).reverse());
            learning = JSON.stringify(learningResult.data ?? []);
          } catch (memoryError) {
            console.error("Agency memory read error", memoryError);
          }
        }

        const worker = WORKERS[agentId as keyof typeof WORKERS];
        const system = `${SYSTEM}
TRABAJADOR: ${worker.name}
ÁREA: ${worker.role}
FOCO: ${worker.focus}

MEMORIA OPERATIVA:
${history}

APRENDIZAJES VALIDADOS POR OWNER:
${learning}

Usa estas memorias como contexto, pero valida las afirmaciones contra evidencia reciente.`;

        try {
          const result = streamText({
            model: getChatModel(),
            system,
            messages,
            onFinish: async ({ text }) => {
              if (!serviceRoleKey) return;
              try {
                const db = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
                await db.from("agentes_historial").insert([
                  { session_id: `owner-agency:${agentId}`, role: "user", content: messages[messages.length - 1].content },
                  { session_id: `owner-agency:${agentId}`, role: "assistant", content: text },
                ]);
              } catch (memoryError) {
                console.error("Agency memory write error", memoryError);
              }
            },
          });
          return result.toTextStreamResponse();
        } catch (error) {
          console.error("Agency chat error", error);
          return new Response(JSON.stringify({ error: "No fue posible iniciar la sesión del trabajador." }), { status: 500 });
        }
      },
    },
  },
});
