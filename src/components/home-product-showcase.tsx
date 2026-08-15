import { BarChart3, Bot, Boxes, Check, Sparkles, TrendingUp, WalletCards, ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

function MiniMetric({ icon, label, value, trend }: { icon: React.ReactNode; label: string; value: string; trend: string }) {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-soft sm:p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 text-lg font-semibold tracking-tight sm:text-xl">{value}</div>
      <div className="mt-1 text-[11px] text-success">{trend}</div>
    </div>
  );
}

export function HomeProductShowcase() {
  return (
    <section className="relative border-y bg-secondary/20 py-20 sm:py-24">
      <div className="absolute left-1/2 top-20 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Así se ve Nüva One por dentro
          </span>
          <h2 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Todo tu negocio. <span className="bg-gradient-primary bg-clip-text text-transparent">Una sola vista.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-balance text-muted-foreground">
            Una previsualización del panel que tus clientes encontrarán al entrar a Nüva One: indicadores, ventas, inventario, finanzas y Nüva IA conectados.
          </p>
        </div>

        <div className="relative mx-auto mt-12 max-w-6xl [perspective:1800px]">
          <div className="absolute -inset-8 rounded-[3rem] bg-primary/10 blur-3xl" />
          <div className="relative rounded-[1.5rem] border border-border/70 bg-card/95 p-2 shadow-[0_35px_100px_-35px_oklch(0.35_0.12_270/0.45)] backdrop-blur-xl sm:rounded-[2rem] sm:p-3">
            <div className="overflow-hidden rounded-[1.15rem] border bg-background sm:rounded-[1.5rem]">
              <div className="flex items-center gap-2 border-b bg-secondary/40 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
                <div className="ml-3 flex-1 rounded-md border bg-background/80 px-3 py-1.5 text-[10px] text-muted-foreground sm:text-xs">app.nuva-one.cl / resumen</div>
              </div>

              <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[185px_1fr]">
                <aside className="hidden rounded-xl border bg-secondary/30 p-3 lg:block">
                  <div className="mb-5 flex items-center gap-2 px-2 text-sm font-semibold">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground"><Sparkles className="h-3.5 w-3.5" /></span>
                    Nüva One
                  </div>
                  <div className="space-y-1 text-xs">
                    {["Resumen", "Ventas", "Inventario", "Finanzas", "Clientes"].map((item, i) => (
                      <div key={item} className={`rounded-lg px-3 py-2 ${i === 0 ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground"}`}>{item}</div>
                    ))}
                  </div>
                </aside>

                <div className="min-w-0">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                    <div><div className="text-xs text-muted-foreground">Resumen del negocio</div><div className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">Buenos días 👋</div></div>
                    <div className="rounded-full border bg-success/5 px-3 py-1 text-xs text-success">Negocio saludable</div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <MiniMetric icon={<TrendingUp className="h-3.5 w-3.5" />} label="Ingresos" value="$4,82 M" trend="+18,4%" />
                    <MiniMetric icon={<WalletCards className="h-3.5 w-3.5" />} label="Flujo neto" value="$1,36 M" trend="+9,2%" />
                    <MiniMetric icon={<Boxes className="h-3.5 w-3.5" />} label="Inventario" value="$2,14 M" trend="128 SKU" />
                    <MiniMetric icon={<BarChart3 className="h-3.5 w-3.5" />} label="Nüva Score" value="86/100" trend="+6 pts" />
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-[1.5fr_1fr]">
                    <div className="rounded-xl border bg-card p-4">
                      <div className="flex items-center justify-between"><div><div className="text-sm font-medium">Ingresos vs. gastos</div><div className="text-[11px] text-muted-foreground">Últimos 6 meses</div></div><BarChart3 className="h-4 w-4 text-muted-foreground" /></div>
                      <div className="mt-5 flex h-36 items-end gap-2 sm:gap-3">{[38,54,48,67,61,78,72,92,84,100,91,96].map((height,index)=><div key={index} className="flex h-full flex-1 items-end"><div className="w-full rounded-t bg-gradient-primary opacity-80" style={{height:`${height}%`}} /></div>)}</div>
                    </div>
                    <div className="rounded-xl border bg-card p-4">
                      <div className="flex items-center gap-2"><Bot className="h-4 w-4 text-primary" /><div className="text-sm font-medium">Nüva IA</div></div>
                      <p className="mt-3 text-xs leading-5 text-muted-foreground">Detecté una oportunidad: 4 productos están cerca de su punto de reposición.</p>
                      <div className="mt-4 rounded-lg bg-primary/5 p-3 text-xs">Recomiendo revisar inventario antes del próximo ciclo de ventas.</div>
                      <Link to="/demo"><Button variant="outline" size="sm" className="mt-3 w-full">Ver análisis <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></Link>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    {[{title:"Ventas",text:"86 ventas este mes",icon:<TrendingUp className="h-4 w-4"/>},{title:"Inventario",text:"7 productos por reponer",icon:<Boxes className="h-4 w-4"/>},{title:"Decisiones",text:"Nüva IA detecta oportunidades",icon:<Bot className="h-4 w-4"/>}].map(item=><div key={item.title} className="rounded-xl border bg-secondary/20 p-3"><div className="flex items-center gap-2 text-xs font-medium">{item.icon}{item.title}</div><div className="mt-1 text-xs text-muted-foreground">{item.text}</div></div>)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          {["Datos ficticios para la demo", "Sin planillas dispersas", "Ventas + inventario + finanzas", "IA para decidir"].map(item=><span key={item} className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" />{item}</span>)}
        </div>
        <div className="mt-7 text-center"><Link to="/demo"><Button size="lg" className="h-12 px-7 shadow-elegant">Explorar demo completa <ArrowRight className="ml-1.5 h-4 w-4" /></Button></Link></div>
      </div>
    </section>
  );
}
