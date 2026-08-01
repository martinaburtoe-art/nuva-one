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
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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

  async function connect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!active) return;
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      business_id: active.id,
      provider: "meta",
      status: "connected",
      account_name: String(fd.get("account_name") || ""),
      page_id: String(fd.get("page_id") || ""),
      access_token: String(fd.get("access_token") || ""),
      connected_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("marketing_integrations" as any)
      .upsert(payload, { onConflict: "business_id,provider" });
    setSaving(false);
    if (error) {
      toast.error("No se pudo conectar: " + error.message);
      return;
    }
    toast.success("Cuenta de Meta conectada");
    qc.invalidateQueries({ queryKey: ["marketing_integrations", active.id] });
    setOpen(false);
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
                Vincula tu página de Instagram/Facebook pegando el token de acceso de tu cuenta de
                Meta Developer. Queda guardado y listo para publicar automáticamente ni bien
                actives el envío real.
              </p>
            </>
          )}
        </div>
        {!canWrite ? null : isConnected ? (
          <Button variant="outline" size="sm" onClick={disconnect}>
            <Unlink className="mr-1.5 h-3.5 w-3.5" /> Desconectar
          </Button>
        ) : (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Link2 className="mr-1.5 h-3.5 w-3.5" /> Conectar Meta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Conectar cuenta de Meta</DialogTitle>
              </DialogHeader>
              <form onSubmit={connect} className="space-y-4">
                <div>
                  <Label htmlFor="account_name">Nombre de la cuenta/página</Label>
                  <Input id="account_name" name="account_name" placeholder="Mi Negocio" required />
                </div>
                <div>
                  <Label htmlFor="page_id">ID de página / Instagram Business ID</Label>
                  <Input id="page_id" name="page_id" placeholder="1234567890" />
                </div>
                <div>
                  <Label htmlFor="access_token">Token de acceso (Meta Graph API)</Label>
                  <Textarea id="access_token" name="access_token" rows={3} required />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Obténlo desde developers.facebook.com → tu app → Graph API Explorer (token de
                    larga duración).
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? "Guardando..." : "Guardar conexión"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Card>
  );
}

function Marketing() {
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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const scheduledFor = fd.get("scheduled_for") as string;
    await insert.mutateAsync({
      content: fd.get("content"),
      platforms,
      scheduled_for: scheduledFor || null,
      status: scheduledFor ? "scheduled" : "draft",
    });
    setOpen(false);
    setPlatforms(["instagram"]);
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
                  <Button type="submit" className="w-full">
                    Guardar
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      <MetaConnectionCard />

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
