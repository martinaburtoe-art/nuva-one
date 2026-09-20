import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { canManageBusiness, useActiveBusiness, useMyRole } from "@/lib/use-business";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type QueueItem = {
  id: string; title: string; description: string | null; priority: string;
  status: string; impact: number; destination: string | null; created_at: string;
};

const labels: Record<string, string> = {
  pending: "Pendiente", approved: "Aprobada", executing: "Ejecutando",
  completed: "Completada", dismissed: "Descartada", failed: "Fallida",
};

export function NuvaActionQueue() {
  const { active } = useActiveBusiness();
  const { data: role } = useMyRole();
  const canApprove = canManageBusiness(role);
  const query = useQuery({
    enabled: !!active?.id,
    queryKey: ["nuva-action-queue", active?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("nuva_action_queue")
        .select("id,title,description,priority,status,impact,destination,created_at")
        .eq("business_id", active!.id).order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return (data ?? []) as QueueItem[];
    },
  });

  const updateStatus = async (id: string, status: "approved" | "dismissed") => {
    if (!canApprove) return;
    const { error } = await supabase.from("nuva_action_queue").update({ status }).eq("id", id).eq("business_id", active!.id);
    if (!error) await query.refetch();
  };

  return (
    <Card className="border-primary/15 bg-background/70 p-5">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Nüva Action Layer</p><h3 className="mt-1 text-lg font-semibold">Acciones preparadas</h3></div>
        <span className="text-xs text-muted-foreground">{query.data?.length ?? 0} recientes</span>
      </div>
      {query.isLoading ? <p className="mt-4 text-sm text-muted-foreground">Cargando acciones…</p> : !query.data?.length ? (
        <p className="mt-4 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Todavía no hay acciones preparadas. Usa “Preparar acción” desde Nüva Action Center.</p>
      ) : (
        <div className="mt-4 space-y-3">{query.data.map((item) => (
          <div key={item.id} className="rounded-xl border bg-background/80 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="font-medium">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.description}</p></div>
              <span className="rounded-full bg-accent px-2 py-1 text-[11px] font-medium">{labels[item.status] ?? item.status}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Impacto {item.impact}/100</span><span>•</span><span>{item.priority}</span>
              {item.status === "pending" && canApprove && <><Button size="sm" onClick={() => updateStatus(item.id, "approved")}><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Aprobar</Button><Button size="sm" variant="outline" onClick={() => updateStatus(item.id, "dismissed")}><XCircle className="mr-1 h-3.5 w-3.5" /> Descartar</Button></>}
              {item.status === "approved" && <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1"><Clock3 className="h-3.5 w-3.5" /> Lista para ejecución</span>}
            </div>
          </div>
        ))}</div>
      )}
    </Card>
  );
}