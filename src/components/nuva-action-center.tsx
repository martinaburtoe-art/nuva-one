import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Lightbulb, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness } from "@/lib/use-business";
import { buildNuvaIntelligence } from "@/lib/nuva-intelligence";
import { buildNuvaActionCenter, type ActionPriority } from "@/lib/nuva-action-center";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const priorityMeta: Record<ActionPriority, { label: string; icon: typeof ShieldAlert }> = {
  critical: { label: "Prioridad crítica", icon: ShieldAlert },
  high: { label: "Atención alta", icon: AlertTriangle },
  medium: { label: "Seguimiento", icon: CheckCircle2 },
  opportunity: { label: "Oportunidad", icon: Lightbulb },
};

export function NuvaActionCenter() {
  const { active } = useActiveBusiness();
  const { data: actions = [], isLoading, isFetching, isError, refetch } = useQuery({
    enabled: !!active?.id,
    queryKey: ["nuva-action-center", active?.id],
    staleTime: 60_000,
    queryFn: async () => {
      const bid = active!.id;
      const [sales, purchases, transactions, products] = await Promise.all([
        supabase.from("sales").select("total,sale_date,status,paid_amount,due_date").eq("business_id", bid),
        supabase.from("purchases").select("total,purchase_date,status").eq("business_id", bid),
        supabase.from("transactions").select("amount,type,tx_date").eq("business_id", bid),
        supabase.from("products").select("stock,min_stock,reorder_point,name,sku").eq("business_id", bid),
      ]);
      const error = sales.error || purchases.error || transactions.error || products.error;
      if (error) throw error;
      return buildNuvaActionCenter(buildNuvaIntelligence({ sales: sales.data ?? [], purchases: purchases.data ?? [], transactions: transactions.data ?? [], stock: (products.data ?? []).map((p: any) => ({ ...p, quantity: p.stock })) }), 5);
    },
  });

  return (
    <Card className="mt-6 overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.06] via-background to-accent/30 p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><Lightbulb className="h-4 w-4" aria-hidden="true" /> Nüva Intelligence</div>
          <h2 className="mt-1 text-xl font-bold">¿Qué debería hacer hoy?</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Nüva cruza ventas, caja, compras e inventario y prioriza las acciones con mayor impacto.</p>
        </div>
        <div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching} aria-label="Actualizar análisis"><RefreshCw className={`mr-1 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Actualizar</Button><Link to="/executive-command-center"><Button variant="outline" size="sm">Centro ejecutivo <ArrowUpRight className="ml-1 h-4 w-4" /></Button></Link></div>
      </div>
      {isLoading || isFetching ? <div className="mt-5 flex items-center gap-2 rounded-xl border bg-background/70 p-4 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Analizando tu negocio…</div> : isError ? <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-background/70 p-4" role="alert"><span className="text-sm text-muted-foreground">No se pudo actualizar el análisis.</span><Button size="sm" variant="outline" onClick={() => refetch()}>Reintentar</Button></div> : actions.length === 0 ? <div className="mt-5 flex items-center gap-2 rounded-xl border bg-background/70 p-4 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4" /> No hay alertas prioritarias ahora. Nüva seguirá monitoreando.</div> : <div className="mt-5 grid gap-3 lg:grid-cols-2">{actions.map((item) => { const meta = priorityMeta[item.priority]; const Icon = meta.icon; return <div key={item.id} className="rounded-xl border bg-background/80 p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm"><div className="flex items-start gap-3"><div className="mt-0.5 rounded-lg bg-accent p-2"><Icon className="h-4 w-4" aria-hidden="true" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{item.title}</h3><span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium">{meta.label}</span></div><p className="mt-1 text-sm text-muted-foreground">{item.reason}</p><div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-xs font-semibold text-muted-foreground">Impacto {item.impact}/100</span><Link to={`/${item.destination}`} className="inline-flex items-center text-sm font-medium text-primary hover:underline">{item.action}<ArrowUpRight className="ml-1 h-3.5 w-3.5" /></Link></div></div></div></div> })}</div>}
    </Card>
  );
}
