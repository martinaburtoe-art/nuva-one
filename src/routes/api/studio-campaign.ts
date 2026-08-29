import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getServerSupabaseEnv } from "@/lib/supabase-env.server";
import { createStudioCampaign } from "@/lib/nuva-studio-campaign-loop.server";

function json(data: unknown, status = 200) { return Response.json(data, { status, headers: { "Cache-Control": "no-store" } }); }
async function auth(request: Request) {
  const env = getServerSupabaseEnv(); if (!env.ok) return { error: json({ error: "Configuración de Supabase incompleta" }, 500) };
  const header = request.headers.get("authorization") ?? ""; const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return { error: json({ error: "No autenticado" }, 401) };
  const supabase = createClient<Database>(env.url, env.anonKey, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false, storage: undefined } });
  const { data, error } = await supabase.auth.getClaims(token); const userId = data?.claims?.sub;
  if (error || !userId) return { error: json({ error: "Sesión inválida o expirada" }, 401) }; return { supabase, userId };
}
const db = (supabase: unknown) => supabase as { from: (table: string) => any };

export const Route = createFileRoute("/api/studio-campaign")({ server: { handlers: {
  GET: async ({ request }) => {
    const a = await auth(request); if (a.error) return a.error; const businessId = new URL(request.url).searchParams.get("businessId");
    if (!businessId) return json({ error: "businessId es obligatorio" }, 400);
    const { data: membership } = await a.supabase.from("business_members").select("business_id").eq("business_id", businessId).eq("user_id", a.userId).maybeSingle();
    if (!membership) return json({ error: "No tienes acceso a este negocio" }, 403);
    const { data, error } = await db(a.supabase).from("nuva_studio_campaigns").select("*").eq("business_id", businessId).order("created_at", { ascending: false });
    if (error) return json({ error: error.message }, 500); return json({ ok: true, campaigns: data ?? [] });
  },
  POST: async ({ request }) => {
    const a = await auth(request); if (a.error) return a.error;
    const body = (await request.json().catch(() => null)) as { businessId?: string; name?: string; goal?: string; cadenceHours?: number; maxCycles?: number } | null;
    if (!body?.businessId || !body.name?.trim() || !body.goal?.trim()) return json({ error: "businessId, name y goal son obligatorios" }, 400);
    const { data: membership } = await a.supabase.from("business_members").select("business_id").eq("business_id", body.businessId).eq("user_id", a.userId).maybeSingle();
    if (!membership) return json({ error: "No tienes acceso a este negocio" }, 403);
    if (body.goal.length > 12000 || body.name.length > 200) return json({ error: "La campaña excede el límite permitido" }, 400);
    const campaign = await createStudioCampaign({ supabase: a.supabase, businessId: body.businessId, userId: a.userId, name: body.name, goal: body.goal, cadenceHours: body.cadenceHours, maxCycles: body.maxCycles });
    return json({ ok: true, campaign }, 201);
  },
  PATCH: async ({ request }) => {
    const a = await auth(request); if (a.error) return a.error;
    const body = (await request.json().catch(() => null)) as { campaignId?: string; status?: "active" | "paused" | "cancelled" } | null;
    if (!body?.campaignId || !body.status) return json({ error: "campaignId y status son obligatorios" }, 400);
    const { data: campaign } = await db(a.supabase).from("nuva_studio_campaigns").select("id,user_id").eq("id", body.campaignId).maybeSingle();
    if (!campaign) return json({ error: "Campaña no encontrada" }, 404); if (campaign.user_id !== a.userId) return json({ error: "No tienes acceso a esta campaña" }, 403);
    const { data, error } = await db(a.supabase).from("nuva_studio_campaigns").update({ status: body.status, updated_at: new Date().toISOString(), ...(body.status === "active" ? { next_run_at: new Date().toISOString() } : {}) }).eq("id", body.campaignId).select("*").single();
    if (error) return json({ error: error.message }, 500); return json({ ok: true, campaign: data });
  },
} } });
