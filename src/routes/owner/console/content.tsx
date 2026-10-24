import { createFileRoute, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { EyeOff, Pin, PinOff, RefreshCw, Search, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * CMS del foro público para el propietario de la plataforma: listado completo
 * (incluye draft/unlisted), fijar, retirar, publicar y corrección de contenido.
 * Cada acción se autoriza en servidor (claim platform_role) + RLS en BD y se
 * registra en owner_admin_actions. No se elimina contenido de usuarios: el
 * diseño original de borrar-y-republicar sigue siendo del dueño del negocio.
 */
export const Route = createFileRoute("/owner/console/content")({
  ssr: false,
  beforeLoad: async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) throw redirect({ to: "/auth", search: { redirect: "/owner/console/content" } });
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: "/owner/console/content" } });
    if ((data.user.app_metadata as Record<string, unknown> | null)?.platform_role !== "owner") throw redirect({ to: "/" });
  },
  component: ContentConsole,
});

type Topic = {
  id: string; title: string; body: string; category: string; business_name: string;
  reply_count: number; views: number; is_pinned: boolean; status: string;
  created_at: string; updated_at: string | null;
};

async function forumAdmin<T>(payload: Record<string, unknown>): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Sesión expirada. Vuelve a iniciar sesión.");
  const response = await fetch("/api/owner/forum-admin", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const source = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) throw new Error(source?.error ?? "No disponible");
  return source as T;
}

const statusStyle: Record<string, string> = {
  published: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  draft: "border-sky-500/40 bg-sky-500/10 text-sky-200",
  unlisted: "border-amber-500/40 bg-amber-500/10 text-amber-200",
};

function ContentConsole() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const source = await forumAdmin<{ topics: Topic[] }>({ op: "list" });
      setTopics(source.topics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const act = async (op: string, topic: Topic, extra: Record<string, unknown> = {}) => {
    setBusy(topic.id + op);
    try {
      await forumAdmin({ op, topic_id: topic.id, ...extra });
      await load();
      if (op === "update") setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally { setBusy(null); }
  };

  const filtered = topics.filter((t) =>
    `${t.title} ${t.business_name} ${t.category} ${t.status}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contenido · Foro público</h1>
          <p className="mt-1 text-sm text-white/55">
            Moderación del propietario de plataforma. Toda acción queda en la bitácora de auditoría.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}
          className="border-white/15 bg-white/5 text-xs font-semibold text-white/80 hover:bg-white/10">
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />Refrescar
        </Button>
      </div>

      <div className="mb-4 relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
        <Input className="border-white/15 bg-white/5 pl-9 text-sm text-white placeholder:text-white/35"
          placeholder="Buscar tema, negocio, categoría…" value={search}
          onChange={(e) => setSearch(e.target.value)} aria-label="Buscar temas" />
      </div>

      {error && <Card className="mb-4 border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">{error}</Card>}

      {loading && topics.length === 0 ? (
        <div className="h-32 animate-pulse rounded-2xl bg-white/5" />
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl border-dashed border-white/15 p-10 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-white/40" />
          <p className="mt-3 font-medium text-white/80">Sin temas para mostrar</p>
          <p className="mt-1 text-sm text-white/45">Aún no hay publicaciones en el foro o ninguna coincide con la búsqueda.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <Card key={t.id} className={`rounded-2xl border p-4 ${t.is_pinned ? "border-indigo-400/30 bg-indigo-400/[0.06]" : "border-white/10 bg-white/[0.04]"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {t.is_pinned && <Pin className="h-3.5 w-3.5 text-indigo-300" />}
                    <p className="truncate text-sm font-semibold text-white/90">{t.title}</p>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusStyle[t.status] ?? statusStyle.draft}`}>{t.status}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-white/45">
                    {t.business_name} · {t.category} · {t.reply_count} respuestas · {t.views} vistas ·
                    creado {new Date(t.created_at).toLocaleDateString("es-CL")}{t.updated_at ? ` · editado ${new Date(t.updated_at).toLocaleDateString("es-CL")}` : ""}
                  </p>
                  <p className="mt-2 max-w-3xl truncate text-xs text-white/55">{t.body.slice(0, 160)}…</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={busy === t.id + (t.is_pinned ? "unpin" : "pin")}
                    onClick={() => void act(t.is_pinned ? "unpin" : "pin", t)}
                    className="h-8 border-white/20 bg-white/5 text-[11px] text-white/80 hover:bg-white/10">
                    {t.is_pinned ? <><PinOff className="mr-1 h-3 w-3" />Soltar</> : <><Pin className="mr-1 h-3 w-3" />Fijar</>}
                  </Button>
                  {t.status === "published" ? (
                    <Button size="sm" variant="outline" disabled={busy === t.id + "unlist"}
                      onClick={() => { if (window.confirm(`¿Retirar del listado público «${t.title}»? Queda como unlisted.`)) void act("unlist", t); }}
                      className="h-8 border-amber-400/30 bg-amber-400/10 text-[11px] text-amber-100 hover:bg-amber-400/20">
                      <EyeOff className="mr-1 h-3 w-3" />Retirar
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled={busy === t.id + "publish"}
                      onClick={() => void act("publish", t)}
                      className="h-8 border-emerald-400/30 bg-emerald-400/10 text-[11px] text-emerald-100 hover:bg-emerald-400/20">
                      Publicar
                    </Button>
                  )}
                  {editing === t.id ? (
                    <Button size="sm" disabled={busy === t.id + "update"}
                      onClick={() => void act("update", t, { title: editTitle, body: editBody })}
                      className="h-8 bg-white text-[11px] font-semibold text-black hover:bg-white/85">
                      Guardar corrección
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" disabled={busy === t.id + "update"}
                      onClick={() => { setEditing(t.id); setEditTitle(t.title); setEditBody(t.body); }}
                      className="h-8 border-white/20 bg-white/5 text-[11px] text-white/80 hover:bg-white/10">
                      Corregir
                    </Button>
                  )}
                </div>
              </div>
              {editing === t.id && (
                <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-black/30 p-4">
                  <div><Label className="text-white/60">Título (5–150)</Label>
                    <Input className="mt-1 border-white/15 bg-white/5 text-sm text-white" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} /></div>
                  <div><Label className="text-white/60">Cuerpo (10–5000)</Label>
                    <textarea className="mt-1 h-40 w-full rounded-lg border border-white/15 bg-white/5 p-3 text-sm text-white" value={editBody} onChange={(e) => setEditBody(e.target.value)} /></div>
                  <p className="text-[11px] text-white/40">La corrección se audita con usuario, fecha y campos modificados.</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
