import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Boxes,
  Check,
  CircleDollarSign,
  Sparkles,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/experiencia")({
  head: () => ({
    meta: [
      { title: "Nüva One — Todo tu negocio, en una sola vista" },
      {
        name: "description",
        content:
          "Descubre cómo Nüva One conecta ventas, inventario, finanzas e inteligencia artificial para tu negocio.",
      },
    ],
  }),
  component: ExperiencePage,
});

function ExperiencePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-[-18rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute right-[-12rem] top-[28rem] h-[28rem] w-[28rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.5_0.02_270/0.06)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0.02_270/0.06)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
      </div>

      <header className="relative z-20 border-b border-border/50 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="font-semibold tracking-tight">Nüva One</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/demo" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Ver demo
              </Button>
            </Link>
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="sm" className="shadow-elegant">
                Empezar gratis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative mx-auto max-w-7xl px-5 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-28 lg:pt-32">
        <div className="mx-auto max-w-4xl text-center">
          <Badge
            variant="secondary"
            className="animate-fade-in-up rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5"
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" />
            El centro de control de tu negocio
          </Badge>
          <h1 className="mt-7 text-balance text-5xl font-bold tracking-[-0.04em] sm:text-6xl lg:text-7xl">
            Todo tu negocio.
            <span className="block bg-gradient-primary bg-clip-text text-transparent">
              Una sola vista.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-7 text-muted-foreground sm:text-lg">
            Ventas, inventario, finanzas e inteligencia artificial conectados para que puedas pasar
            de mirar números a tomar decisiones.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link to="/demo">
              <Button size="lg" className="h-12 px-6 shadow-elegant">
                Explorar Nüva One <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth" search={{ mode: "signup" }}>
              <Button size="lg" variant="outline" className="h-12 px-6 bg-background/70">
                Crear mi cuenta
              </Button>
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            {["Sin planillas dispersas", "Datos conectados", "IA para decidir"].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-success" /> {item}
              </span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto mt-16 max-w-6xl [perspective:1800px] sm:mt-20">
          <div className="absolute -inset-10 rounded-[3rem] bg-primary/10 blur-3xl" />
          <div className="relative animate-fade-in-up rounded-[1.5rem] border border-border/70 bg-card/90 p-2 shadow-[0_35px_100px_-35px_oklch(0.35_0.12_270/0.45)] backdrop-blur-xl sm:rounded-[2rem] sm:p-3">
            <div className="overflow-hidden rounded-[1.1rem] border bg-background sm:rounded-[1.5rem]">
              <div className="flex items-center gap-2 border-b bg-secondary/40 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
                <div className="ml-3 flex-1 rounded-md border bg-background/80 px-3 py-1.5 text-[10px] text-muted-foreground sm:text-xs">
                  app.nuva-one.cl / resumen
                </div>
              </div>

              <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[180px_1fr]">
                <aside className="hidden rounded-xl border bg-secondary/30 p-3 lg:block">
                  <div className="mb-5 flex items-center gap-2 px-2 text-sm font-semibold">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    Nüva One
                  </div>
                  <div className="space-y-1 text-xs">
                    {["Resumen", "Ventas", "Inventario", "Finanzas", "Clientes"].map((item, i) => (
                      <div
                        key={item}
                        className={`rounded-lg px-3 py-2 ${i === 0 ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground"}`}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </aside>

                <div className="min-w-0">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                    <div>
                      <div className="text-xs text-muted-foreground">Resumen del negocio</div>
                      <div className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">Buenos días 👋</div>
                    </div>
                    <div className="rounded-full border bg-success/5 px-3 py-1 text-xs text-success">
                      Negocio saludable
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <MiniMetric icon={<TrendingUp className="h-3.5 w-3.5" />} label="Ingresos" value="$4,82 M" trend="+18,4%" />
                    <MiniMetric icon={<WalletCards className="h-3.5 w-3.5" />} label="Flujo neto" value="$1,36 M" trend="+9,2%" />
                    <MiniMetric icon={<Boxes className="h-3.5 w-3.5" />} label="Inventario" value="$2,14 M" trend="128 SKU" />
                    <MiniMetric icon={<BarChart3 className="h-3.5 w-3.5" />} label="Nüva Score" value="86/100" trend="+6 pts" />
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-[1.5fr_1fr]">
                    <div className="rounded-xl border bg-card p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">Ingresos vs. gastos</div>
                          <div className="text-[11px] text-muted-foreground">Últimos 6 meses</div>
                        </div>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="mt-5 flex h-36 items-end gap-2 sm:gap-3">
                        {[38, 54, 48, 67, 61, 78, 72, 92, 84, 100, 91, 112].map((height, index) => (
                          <div key={index} className="flex h-full flex-1 items-end">
                            <div
                              className="w-full rounded-t bg-gradient-primary opacity-80 transition-transform duration-500 hover:scale-y-105"
                              style={{ height: `${Math.min(height, 100)}%` }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border bg-card p-4">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-primary" />
                        <div className="text-sm font-medium">Nüva IA</div>
                      </div>
                      <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        Detecté una oportunidad: 4 productos están cerca de su punto de reposición.
                      </p>
                      <div className="mt-4 rounded-lg bg-primary/5 p-3 text-xs text-foreground">
                        Recomiendo revisar inventario antes del próximo ciclo de ventas.
                      </div>
                      <Button variant="outline" size="sm" className="mt-3 w-full">
                        Ver análisis <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y bg-secondary/20 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Feature icon={<TrendingUp />} title="Entiende" text="Convierte tus movimientos en indicadores claros y accionables." />
            <Feature icon={<Boxes />} title="Controla" text="Mantén ventas, inventario y finanzas conectados en el mismo lugar." />
            <Feature icon={<Bot />} title="Decide" text="Usa IA para interpretar tu negocio y detectar oportunidades." />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20 text-center sm:px-6 sm:py-24">
        <Sparkles className="mx-auto h-7 w-7 text-primary" />
        <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Tu negocio merece una vista así.</h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Explora la demo con datos ficticios o crea tu cuenta para empezar a trabajar con tus propios datos.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link to="/demo">
            <Button size="lg">Ver demo interactiva <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
          </Link>
          <Link to="/auth" search={{ mode: "signup" }}>
            <Button size="lg" variant="outline">Empezar gratis</Button>
          </Link>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">Nüva One · Gestión inteligente para PYMEs</p>
      </section>
    </main>
  );
}

function MiniMetric({ icon, label, value, trend }: { icon: React.ReactNode; label: string; value: string; trend: string }) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[10px] sm:text-xs">{label}</span>
      </div>
      <div className="mt-2 text-base font-semibold tracking-tight sm:text-lg">{value}</div>
      <div className="mt-1 text-[10px] text-success sm:text-xs">{trend}</div>
    </div>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border bg-card/80 p-5 shadow-soft transition-transform duration-300 hover:-translate-y-1">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
