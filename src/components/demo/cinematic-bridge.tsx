import { useEffect, useRef, useState } from "react";
import { ArrowRight, BarChart3, Boxes, Bot, CircleDollarSign, Sparkles, TrendingUp, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function CinematicBridge({ onContinue }: { onContinue: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.18 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} data-demo="cinematic" className="relative my-10 overflow-hidden rounded-[2rem] border bg-gradient-to-b from-card via-card to-secondary/30 px-5 py-16 shadow-elegant sm:px-8 sm:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.18),transparent_45%)]" />
      <div className={`relative mx-auto max-w-6xl transition-all duration-1000 ease-out ${visible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}>
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="secondary" className="rounded-full border border-primary/20 bg-primary/5"><Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />Ahora mira cómo se conecta todo</Badge>
          <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-5xl">De entender tu negocio a <span className="bg-gradient-primary bg-clip-text text-transparent">verlo en acción.</span></h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">Esta es una de las pocas funcionalidades que estás viendo. Nüva One conecta muchas más herramientas para que toda la operación de tu negocio trabaje en conjunto.</p>
        </div>
        <div className={`relative mx-auto mt-10 max-w-5xl transition-all delay-200 duration-1000 ease-out ${visible ? "translate-y-0 scale-100 opacity-100" : "translate-y-8 scale-[0.97] opacity-0"}`}>
          <div className="absolute -inset-8 rounded-[3rem] bg-primary/10 blur-3xl" />
          <Card className="relative overflow-hidden rounded-[1.5rem] border-border/70 bg-background/95 p-2 shadow-[0_30px_90px_-35px_hsl(var(--primary)/0.55)] sm:p-3">
            <div className="overflow-hidden rounded-[1.1rem] border bg-background">
              <div className="flex items-center gap-2 border-b bg-secondary/50 px-4 py-3"><span className="h-2.5 w-2.5 rounded-full bg-destructive/60" /><span className="h-2.5 w-2.5 rounded-full bg-warning/60" /><span className="h-2.5 w-2.5 rounded-full bg-success/60" /><div className="ml-2 flex-1 rounded-md border bg-background px-3 py-1 text-[10px] text-muted-foreground sm:text-xs">app.nuva-one.cl / resumen</div><Badge variant="outline" className="hidden sm:flex">Vista previa</Badge></div>
              <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[175px_1fr]">
                <aside className="hidden rounded-xl border bg-secondary/30 p-3 lg:block"><div className="mb-4 flex items-center gap-2 px-2 text-sm font-semibold"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground"><Sparkles className="h-3.5 w-3.5" /></span>Nüva One</div><div className="space-y-1 text-xs">{["Resumen", "Ventas", "Caja", "Inventario", "Finanzas", "Cotizaciones", "Clientes"].map((item, index) => <div key={item} className={`rounded-lg px-3 py-2 ${index === 0 ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground"}`}>{item}</div>)}</div></aside>
                <div className="min-w-0"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><div className="text-xs text-muted-foreground">Resumen del negocio</div><div className="mt-1 text-xl font-semibold">Buenos días 👋</div></div><div className="rounded-full border border-success/20 bg-success/5 px-3 py-1 text-xs text-success">Negocio saludable</div></div>
                  <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4"><PreviewMetric icon={<TrendingUp />} label="Ventas" value="$4,82 M" trend="+18,4%" /><PreviewMetric icon={<CircleDollarSign />} label="Caja" value="$1,36 M" trend="+9,2%" /><PreviewMetric icon={<Boxes />} label="Inventario" value="128 SKU" trend="1 alerta" /><PreviewMetric icon={<BarChart3 />} label="Nüva Score" value="86/100" trend="+6 pts" /></div>
                  <div className="mt-4 grid gap-4 md:grid-cols-[1.45fr_1fr]"><div className="rounded-xl border p-4"><div className="flex items-center justify-between"><div><div className="text-sm font-medium">Ventas vs. gastos</div><div className="text-[11px] text-muted-foreground">Tendencia del período</div></div><BarChart3 className="h-4 w-4 text-muted-foreground" /></div><div className="mt-5 flex h-28 items-end gap-2">{[35,48,42,60,55,72,68,84,76,96].map((height, index) => <div key={index} className="flex h-full flex-1 items-end"><div className="w-full rounded-t bg-gradient-primary opacity-80 transition-transform duration-500 hover:scale-y-105" style={{ height: `${height}%` }} /></div>)}</div></div><div className="rounded-xl border bg-primary/[0.04] p-4"><div className="flex items-center gap-2 text-sm font-medium"><Bot className="h-4 w-4 text-primary" />Nüva IA</div><p className="mt-3 text-xs leading-5 text-muted-foreground">Detecté 1 producto cerca de su punto de reposición.</p><div className="mt-4 rounded-lg border bg-background/80 p-3 text-[11px]">Revisar inventario →</div></div></div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3"><MiniPill icon={<Boxes className="h-3.5 w-3.5" />} text="Ventas conectadas" /><MiniPill icon={<Users className="h-3.5 w-3.5" />} text="Clientes" /><MiniPill icon={<Sparkles className="h-3.5 w-3.5" />} text="IA y recomendaciones" /></div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className={`relative mx-auto mt-8 max-w-5xl transition-all delay-500 duration-1000 ease-out ${visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
          <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.08] via-card to-card p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10"><Sparkles className="h-4 w-4 text-primary" /></span><span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Nüva Intelligence</span></div>
                <h3 className="mt-3 text-xl font-bold sm:text-2xl">Nüva encontró algo que deberías saber.</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">No se limita a mostrar métricas. Conecta señales del negocio y las convierte en una decisión que puedes tomar.</p>
              </div>
              <div className="w-full max-w-md rounded-2xl border bg-background/80 p-4 shadow-soft">
                <div className="flex items-center justify-between gap-3"><div><div className="text-xs font-medium text-warning">ATENCIÓN</div><div className="mt-1 text-sm font-semibold">Inventario cerca del punto de reposición</div></div><Boxes className="h-5 w-5 text-warning" /></div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">1 producto necesita revisión. Nüva puede llevarte directamente al inventario para actuar.</p>
                <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-secondary px-3 py-1 text-[11px] text-muted-foreground">Detectar</span><span className="rounded-full bg-secondary px-3 py-1 text-[11px] text-muted-foreground">Explicar</span><span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">Actuar</span></div>
              </div>
            </div>
          </Card>
        </div>

        <div className="relative mt-9 flex justify-center"><Button size="lg" onClick={onContinue} className="shadow-elegant">Seguir explorando Nüva One <ArrowRight className="ml-1.5 h-4 w-4" /></Button></div>
      </div>
    </section>
  );
}
function PreviewMetric({ icon, label, value, trend }: { icon: React.ReactNode; label: string; value: string; trend: string }) { return <div className="rounded-xl border bg-card p-3"><div className="flex items-center gap-1.5 text-muted-foreground">{icon}<span className="text-[10px] sm:text-xs">{label}</span></div><div className="mt-1.5 text-sm font-semibold sm:text-base">{value}</div><div className="mt-1 text-[10px] text-success">{trend}</div></div>; }
function MiniPill({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="flex items-center gap-2 rounded-lg border bg-secondary/20 p-2.5 text-[11px] text-muted-foreground">{icon}{text}</div>; }
