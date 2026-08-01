import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, EmptyState } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ModuleGuard } from "@/components/module-guard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Trash2,
  Instagram,
  Facebook,
  Calendar,
  Megaphone,
  CheckCircle2,
  Link2,
  Unlink,
  Send,
} from "lucide-react";
import { useBizList, useBizInsert, useBizDelete, useBizUpdate } from "@/lib/biz-data";
import { useActiveBusiness, useMyRole, canWriteOperations } from "@/lib/use-business";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/marketing")({
  head: () => ({ meta: [{ title: "Marketing — Nüva One" }] }),
  component: Marketing,
});

type MarketingIntegration = {
  id: string;
  business_id: string;
  provider: string;
  status: "connected" | "disconnected";
  account_name: string | null;
  page_id: string | null;
  connected_at: string | null;
};

type MarketingPost = {
  id: string;
  content: string;
  image_url: string | null;
  platforms: string[];
  scheduled_for: string | null;
  status: "draft" | "scheduled" | "published";
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Borrador",
  scheduled: "Programado",
  published: "Publicado",
};
const STATUS_VARIANT: Record<string, "secondary" | "default" | "outline"> = {
  draft: "secondary",
  scheduled: "default",
  published: "outline",
};

function MetaConnectionCard() {
  const { active } = useActiveBusiness();
  const { data: myRole } = useMyRole();
  const canWrite = canWriteOperations(myRole);
  const qc = useQueryClient();
  const [connecting, setConnecting] = useState(false);

  const { data, isLoading } = useQuery({
    enabled: !!active?.id,
    queryKey: ["marketing_integrations", active?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_integrations" as any)
        .select("id, business_id, provider, status, account_name, page_id, connected_at")
        .eq("business_id", active!.id);
      if (error) throw error;
      return (data ?? []) as unknown as MarketingIntegration[];
    },
  });
  const integration = data?.find((i) => i.provider === "meta");
  const isConnected = integration?.status === "connected";

  // Toast según ?meta=... al volver del callback de Facebook
  useState(() => {
    const params = new URLSearchParams(window.location.search);
    const meta = params.get("meta");
    if (!meta) return;
    if (meta === "connected") toast.success("Cuenta de Meta conectada");
    else if (meta === "cancelled") toast.info("Conexión cancelada");
    else if (meta === "sin_paginas") toast.error("Tu cuenta no administra ninguna página de Facebook");
    else toast.error("No se pudo conectar con Meta");
    window.history.replaceState({}, "", window.location.pathname);
    qc.invalidateQueries({ queryKey: ["marketing_integrations", active?.id] });
  });

  async function connect() {
    if (!active) return;
    setConnecting(true);
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    const res = await fetch("/api/marketing/meta/start", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ business_id: active.id }),
    });
    setConnecting(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.url) {
      toast.error("No se pudo iniciar la conexión con Meta");
      return;
    }
    window.location.href = json.url;
  }

  async function disconnect() {
    if (!active || !integration) return;
    const { error } = await supabase
      .from("marketing_integrations" as any)
      .update({ status: "disconnected", access_token: null, connected_at: null })
      .eq("id", integration.id);
    if (error) {
      toast.error("No se pudo desconectar");
      return;
    }
    toast.success("Cuenta desconectada");
    qc.invalidateQueries({ queryKey: ["marketing_integrations", active.id] });
  }

  return (
    <Card
      className={`mb-6 p-5 ${isConnected ? "border-emerald-500/30 bg-emerald-500/5" : "border-primary/30 bg-accent/50"}`}
    >
      <div className="flex items-center gap-3">
        {isConnected ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        ) : (
          <Instagram className="h-5 w-5 text-primary" />
        )}
        <div className="flex-1">
          {isLoading ? (
            <Skeleton className="h-4 w-48" />
          ) : isConnected ? (
            <>
              <p className="text-sm font-medium">
                Meta conectada — {integration?.account_name || "Cuenta sin nombre"}
              </p>
              <p className="text-xs text-muted-foreground">
                Página/ID: {integration?.page_id || "—"}. Las publicaciones que crees quedarán
                listas para enviarse en cuanto se active el envío automático vía Graph API.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">Conecta tu cuenta de Meta Business</p>
              <p className="text-xs text-muted-foreground">
                Inicia sesión con Facebook para vincular tu página de Facebook e Instagram. Nüva
                One solo pedirá los permisos necesarios para publicar contenido.
              </p>
            </>
          )}
        </div>
        {!canWrite ? null : isConnected ? (
          <Button variant="outline" size="sm" onClick={disconnect}>
            <Unlink className="mr-1.5 h-3.5 w-3.5" /> Desconectar
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={connect} disabled={connecting}>
            <Link2 className="mr-1.5 h-3.5 w-3.5" />
            {connecting ? "Conectando..." : "Conectar con Facebook"}
          </Button>
        )}
      </div>
    </Card>
  );
}

function MetaOverviewCard() {
  const { active } = useActiveBusiness();
  const { data: integ } = useQuery({
    enabled: !!active?.id,
    queryKey: ["marketing_integrations", active?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_integrations" as any)
        .select("status")
        .eq("business_id", active!.id)
        .eq("provider", "meta")
        .maybeSingle();
      if (error) throw error;
      return data as unknown as { status: string } | null;
    },
  });
  const isConnected = integ?.status === "connected";

  const { data: overview, isLoading } = useQuery({
    enabled: !!active?.id && isConnected,
    queryKey: ["marketing_overview", active?.id],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const res = await fetch(`/api/marketing/meta/overview?business_id=${active!.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("No se pudo cargar");
      return res.json();
    },
  });

  if (!isConnected) return null;

  return (
    <Card className="mb-6 p-5">
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : !overview ? (
        <p className="text-sm text-muted-foreground">No se pudo cargar la información de la cuenta.</p>
      ) : (
        <>
          <div className="flex items-center gap-3">
            {(overview.ig?.picture || overview.fb?.picture) && (
              <img
                src={overview.ig?.picture || overview.fb?.picture}
                alt=""
                className="h-12 w-12 rounded-full object-cover"
              />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">
                {overview.ig?.username ? `@${overview.ig.username}` : overview.fb?.name}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                {overview.ig && <span>{overview.ig.followers_count ?? 0} seguidores IG</span>}
                {overview.fb && <span>{overview.fb.fan_count ?? 0} seguidores FB</span>}
                <span>{overview.unread_comments ?? 0} comentarios recientes</span>
              </div>
            </div>
          </div>
          {overview.media?.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {overview.media.map((m: any) => (
                <a
                  key={m.id}
                  href={m.permalink}
                  target="_blank"
                  rel="noreferrer"
                  className="group relative aspect-square overflow-hidden rounded-md bg-muted"
                >
                  <img
                    src={m.thumbnail_url || m.media_url}
                    alt=""
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100">
                    ♥ {m.like_count ?? 0} · 💬 {m.comments_count ?? 0}
                  </div>
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function Marketing() {
  const { active } = useActiveBusiness();
  const { data: myRole } = useMyRole();
  const canWrite = canWriteOperations(myRole);
  const { data, isLoading } = useBizList<MarketingPost>("marketing_posts", {
    order: "scheduled_for",
  });
  const insert = useBizInsert("marketing_posts");
  const del = useBizDelete("marketing_posts");
  const update = useBizUpdate("marketing_posts");
  const [open, setOpen] = useState(false);
  const [platforms, setPlatforms] = useState<string[]>(["instagram"]);
  const [filter, setFilter] = useState<"all" | "draft" | "scheduled" | "published">("all");
  const [publishing, setPublishing] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const scheduledFor = fd.get("scheduled_for") as string;
    await insert.mutateAsync({
      content: fd.get("content"),
      image_url: fd.get("image_url") || null,
      platforms,
      scheduled_for: scheduledFor || null,
      status: scheduledFor ? "scheduled" : "draft",
    });
    setOpen(false);
    setPlatforms(["instagram"]);
  }

  async function publishNow(e: React.MouseEvent<HTMLButtonElement>) {
    const form = e.currentTarget.form;
    if (!form || !active) return;
    const fd = new FormData(form);
    const content = String(fd.get("content") || "").trim();
    const imageUrl = String(fd.get("image_url") || "").trim() || null;
    if (!content) {
      toast.error("Escribe el contenido primero");
      return;
    }
    setPublishing(true);
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token;
    const res = await fetch("/api/marketing/meta/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ business_id: active.id, content, image_url: imageUrl, platforms }),
    });
    const json = await res.json().catch(() => ({}));
    setPublishing(false);
    if (!res.ok && res.status !== 207) {
      toast.error(json.error || "No se pudo publicar");
      return;
    }
    const failed = Object.entries(json.results || {}).filter(([, r]: any) => !r.ok);
    if (failed.length) {
      failed.forEach(([platform, r]: any) => toast.error(`${platform}: ${r.error}`));
    }
    const succeeded = Object.entries(json.results || {}).filter(([, r]: any) => r.ok);
    if (succeeded.length) {
      await insert.mutateAsync({
        content,
        image_url: imageUrl,
        platforms: succeeded.map(([p]) => p),
        scheduled_for: null,
        status: "published",
      });
      toast.success("Publicado en " + succeeded.map(([p]) => p).join(", "));
      setOpen(false);
      setPlatforms(["instagram"]);
    }
  }

  function markPublished(id: string) {
    update.mutate({ id, patch: { status: "published" } });
  }

  const posts = data ?? [];
  const counts = {
    all: posts.length,
    draft: posts.filter((p) => p.status === "draft").length,
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    published: posts.filter((p) => p.status === "published").length,
  };
  const filtered = filter === "all" ? posts : posts.filter((p) => p.status === filter);

  return (
    <ModuleGuard module="marketing">
    <>
      <PageHeader
        title="Marketing"
        description="Programa publicaciones en Instagram y Facebook"
        action={
          !canWrite ? undefined : (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Nueva publicación
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Programar publicación</DialogTitle>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="content">Contenido</Label>
                    <Textarea id="content" name="content" rows={4} required />
                  </div>
                  <div>
                    <Label>Plataformas</Label>
                    <div className="mt-2 flex gap-2">
                      {["instagram", "facebook"].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() =>
                            setPlatforms((cur) =>
                              cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p],
                            )
                          }
                          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${platforms.includes(p) ? "border-primary bg-accent" : ""}`}
                        >
                          {p === "instagram" ? (
                            <Instagram className="h-4 w-4" />
                          ) : (
                            <Facebook className="h-4 w-4" />
                          )}
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="scheduled_for">Fecha y hora (opcional)</Label>
                    <Input id="scheduled_for" name="scheduled_for" type="datetime-local" />
                  </div>
                  <div>
                    <Label htmlFor="image_url">URL de imagen (opcional, requerida para Instagram)</Label>
                    <Input id="image_url" name="image_url" placeholder="https://..." />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" variant="outline" className="flex-1">
                      Guardar borrador
                    </Button>
                    <Button type="button" className="flex-1" onClick={publishNow} disabled={publishing}>
                      {publishing ? "Publicando..." : "Publicar ahora"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <MetaConnectionCard />
      <MetaOverviewCard />

      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "draft", "scheduled", "published"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              filter === f
                ? "border-primary bg-primary text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            {f === "all" ? "Todos" : STATUS_LABEL[f]} ({counts[f]})
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Sin publicaciones"
          description="Crea tu primera publicación."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Card key={p.id} className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex flex-wrap items-center gap-1">
                  {p.platforms?.includes("instagram") && (
                    <Badge variant="outline">
                      <Instagram className="mr-1 h-3 w-3" />
                      IG
                    </Badge>
                  )}
                  {p.platforms?.includes("facebook") && (
                    <Badge variant="outline">
                      <Facebook className="mr-1 h-3 w-3" />
                      FB
                    </Badge>
                  )}
                  <Badge variant={STATUS_VARIANT[p.status]}>{STATUS_LABEL[p.status]}</Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={() => del.mutate(p.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm">{p.content}</p>
              <div className="mt-3 flex items-center justify-between">
                {p.scheduled_for ? (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(p.scheduled_for).toLocaleString("es-CL")}
                  </div>
                ) : (
                  <span />
                )}
                {canWrite && p.status !== "published" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => markPublished(p.id)}
                  >
                    <Send className="mr-1 h-3 w-3" /> Marcar publicado
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
    </ModuleGuard>
  );
}
