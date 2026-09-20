import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, CircleDollarSign } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fmtCLP } from "@/lib/biz-data";
import { supabase } from "@/integrations/supabase/client";

type Priority = {
  sale_id: string;
  customer_id: string | null;
  customer_name: string | null;
  total: number;
  paid_amount: number;
  balance: number;
  due_date: string | null;
  days_overdue: number;
  priority: "overdue" | "due_soon" | "upcoming";
};

export function CollectionPriorityPanel() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["collection-priorities"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_collection_priorities");
      if (error) throw error;
      return (data ?? []) as Priority[];
    },
  });

  const priorityLabel = (value: Priority["priority"]) =>
    value === "overdue" ? "Vencido" : value === "due_soon" ? "Próximo a vencer" : "Por cobrar";

  return (
    <Card className="overflow-hidden border-primary/15">
      <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Cobranza prioritaria</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Cartera ordenada por urgencia para decidir qué cobros revisar primero.
          </p>
        </div>
        <Badge variant={data.some((row) => row.priority === "overdue") ? "destructive" : "outline"}>
          {data.length} pendientes
        </Badge>
      </div>
      <div className="p-5">
        {isLoading ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Cargando cartera priorizada…</div>
        ) : error ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No fue posible cargar la cobranza priorizada.</div>
        ) : !data.length ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No hay cuentas por cobrar pendientes.</div>
        ) : (
          <div className="space-y-2">
            {data.slice(0, 10).map((row) => (
              <div key={row.sale_id} className="flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{row.customer_name || "Cliente"}</span>
                    <Badge variant={row.priority === "overdue" ? "destructive" : "outline"}>{priorityLabel(row.priority)}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{fmtCLP(Number(row.balance || 0))} pendiente</span>
                    {row.due_date && <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />{new Date(row.due_date).toLocaleDateString("es-CL")}</span>}
                    {row.days_overdue > 0 && <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" />{row.days_overdue} días de atraso</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
