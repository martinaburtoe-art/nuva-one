import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Boxes,
  Check,
  CircleDollarSign,
  Gauge,
  ScanLine,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

type ModuleKey = "control" | "score" | "radar" | "inventory" | "finance" | "crm" | "copilot";

const modules: { key: ModuleKey; label: string; icon: typeof Gauge; description: string }[] = [
  {
    key: "control",
    label: "Centro de control",
    icon: Sparkles,
    description: "Una vista de todo tu negocio.",
  },
  {
    key: "score",
    label: "Nüva Score",
    icon: Gauge,
    description: "La salud de tu negocio de un vistazo.",
  },
  {
    key: "radar",
    label: "Nüva Radar",
    icon: Target,
    description: "Riesgos, oportunidades y tendencias.",
  },
  {
    key: "inventory",
    label: "Inventario",
    icon: Boxes,
    description: "Productos, stock y Scanner.",
  },
  {
    key: "finance",
    label: "Finanzas",
    icon: CircleDollarSign,
    description: "Ingresos, egresos, caja y margen.",
  },
  {
    key: "crm",
    label: "Clientes",
    icon: Users,
    description: "Tus clientes y relaciones comerciales.",
  },
  {
    key: "copilot",
    label: "Nüva Copilot",
    icon: Sparkles,
    description: "Pregunta y entiende tu negocio.",
  },
];

const demo = "Vista de demostración · Datos ficticios";

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-4">
      <div>
        <p className="text-xs text-muted-foreground">Nüva One</p>
        <h3 className="mt-1 text-lg font-bold sm:text-xl">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <Badge variant="outline" className="shrink-0 rounded-full text-[10px]">
        {demo}
      </Badge>
    </div>
  );
}

function ControlView() {
  const cards = [
    ["Ventas", "$3,24 M", "+12,4%"],
    ["Margen", "31,8%", "+3,2%"],
    ["Caja", "$1,24 M", "Estable"],
    ["Inventario", "248", "5 atención"],
  ];
  return (
    <div className="space-y-4">
      <Header title="Centro de control" subtitle="Todo tu negocio, en una sola vista." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([a, b, c], i) => (
          <div
            key={a}
            className="rounded-2xl border bg-background/70 p-4 animate-fade-in-up transition-transform duration-500 hover:-translate-y-1"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <p className="text-xs text-muted-foreground">{a}</p>
            <p className="mt-2 text-xl font-bold">{b}</p>
            <p className="mt-1 text-xs text-primary">{c}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
        <div className="rounded-2xl border bg-background/60 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Actividad del negocio</p>
            <span className="text-[10px] text-muted-foreground">Últimos 30 días</span>
          </div>
          <div className="mt-5 flex h-32 items-end gap-1.5 sm:h-40">
            {[35, 44, 39, 53, 48, 61, 58, 72, 68, 81, 76, 94, 88, 100].map((h, i) => (
              <div
                key={i}
                className="flex-1 origin-bottom rounded-t-md bg-primary/60 animate-grow-bar"
                style={{ height: `${h}%`, animationDelay: `${i * 45}ms` }}
              />
            ))}
          </div>
        </div>
        <div className="rounded-2xl border bg-secondary/30 p-5 animate-fade-in-up">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Target className="h-4 w-4 text-primary animate-pulse" /> Nüva Radar
          </div>
          <p className="mt-3 text-sm leading-relaxed">
            3 señales detectadas que merecen tu atención.
          </p>
          <div className="mt-4 space-y-2 text-xs">
            <div className="rounded-xl bg-primary/5 p-3 animate-pulse">
              <b>Oportunidad</b>
              <span className="ml-2 text-muted-foreground">Margen +3,2%</span>
            </div>
            <div className="rounded-xl bg-orange-500/5 p-3">
              <b>Atención</b>
              <span className="ml-2 text-muted-foreground">5 productos con stock bajo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreView() {
  return (
    <div className="space-y-4">
      <Header title="Nüva Score" subtitle="Entiende la salud de tu negocio de un vistazo." />
      <div className="grid gap-4 lg:grid-cols-[.65fr_1.35fr]">
        <div className="flex flex-col items-center justify-center rounded-2xl border bg-background/70 p-6">
          <div className="relative flex h-40 w-40 items-center justify-center rounded-full border-[10px] border-primary/15 border-t-primary animate-score-ring">
            <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping" />
            <div className="text-center">
              <p className="text-4xl font-bold">86</p>
              <p className="text-xs text-muted-foreground">Saludable</p>
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold text-primary animate-pulse">↑ 6,4% este mes</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ["Finanzas", "91"],
            ["Ventas", "88"],
            ["Operaciones", "82"],
            ["Inventario", "79"],
          ].map(([a, b], i) => (
            <div
              key={a}
              className="rounded-2xl border bg-secondary/30 p-4 animate-fade-in-up"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <div className="flex justify-between text-sm">
                <span>{a}</span>
                <b>{b}</b>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full origin-left rounded-full bg-primary animate-fill-bar"
                  style={{ width: `${b}%`, animationDelay: `${i * 120}ms` }}
                />
              </div>
            </div>
          ))}
          <div className="col-span-full rounded-2xl border bg-primary/5 p-4 text-sm animate-fade-in-up">
            <b>Nüva detectó:</b> tu salud general mejoró gracias al crecimiento de ventas y margen.
          </div>
        </div>
      </div>
    </div>
  );
}

function RadarView() {
  return (
    <div className="space-y-4">
      <Header
        title="Nüva Radar"
        subtitle="Detecta riesgos, oportunidades y tendencias antes de que pasen desapercibidos."
      />
      <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
        <div className="relative mx-auto flex aspect-square w-full max-w-[260px] items-center justify-center overflow-hidden rounded-full border bg-secondary/20 shadow-[0_0_70px_hsl(var(--primary)/.12)]">
          <div className="absolute inset-[14%] rounded-full border border-primary/20" />
          <div className="absolute inset-[28%] rounded-full border border-primary/20" />
          <div className="absolute inset-[42%] rounded-full border border-primary/20" />
          <div className="absolute left-1/2 top-0 h-full w-px bg-primary/15" />
          <div className="absolute left-0 top-1/2 h-px w-full bg-primary/15" />
          <div className="absolute left-1/2 top-1/2 h-1/2 w-1/2 origin-top-left -rotate-45 bg-gradient-to-r from-primary/40 to-transparent animate-radar-sweep" />
          <span className="absolute left-[63%] top-[30%] h-3 w-3 rounded-full bg-primary shadow-glow animate-ping" />
          <span className="absolute left-[30%] top-[62%] h-2.5 w-2.5 rounded-full bg-orange-400 animate-pulse" />
          <span className="absolute left-[70%] top-[68%] h-2.5 w-2.5 rounded-full bg-primary/70 animate-pulse" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border bg-background shadow-lg">
            <Target className="h-6 w-6 text-primary" />
          </div>
        </div>
        <div className="space-y-3">
          {[
            ["Oportunidad", "Las ventas de poleras aumentaron 28%.", "Alta"],
            ["Atención", "5 productos presentan stock bajo.", "Media"],
            ["Tendencia", "Clientes recurrentes +14%.", "Positiva"],
          ].map(([a, b, c], i) => (
            <div
              key={a}
              className="rounded-2xl border bg-background/70 p-4 animate-fade-in-up"
              style={{ animationDelay: `${i * 140}ms` }}
            >
              <div className="flex items-start gap-3">
                <Activity className="mt-0.5 h-5 w-5 text-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{a}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{b}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {c}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InventoryView() {
  return (
    <div className="space-y-4">
      <Header
        title="Inventario + Scanner"
        subtitle="Controla productos, SKU y stock desde tu celular."
      />
      <div className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
        <div className="overflow-hidden rounded-2xl border bg-background/70">
          <div className="border-b p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Productos</span>
              <Badge variant="outline">248 SKUs</Badge>
            </div>
            <div className="mt-3 h-9 rounded-xl border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
              Buscar producto...
            </div>
          </div>
          <div className="divide-y">
            {[
              ["Polera deportiva", "SKU-1048", "24", "Disponible"],
              ["Zapatillas Pro", "SKU-2081", "5", "Stock bajo"],
              ["Calcetines Elite", "SKU-3022", "48", "Disponible"],
            ].map(([a, b, c, d]) => (
              <div
                key={b}
                className="grid grid-cols-[1.3fr_.8fr_.4fr] gap-2 p-3 text-xs animate-fade-in-up"
              >
                <div>
                  <b>{a}</b>
                  <p className="text-muted-foreground">{b}</p>
                </div>
                <span>{c}</span>
                <span className={d === "Stock bajo" ? "text-orange-500" : "text-primary"}>{d}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border bg-background/70 p-4">
          <div className="mx-auto max-w-[220px] rounded-[1.7rem] border-8 border-foreground/10 bg-background p-2 shadow-xl transition-transform duration-700 hover:scale-[1.02]">
            <div className="rounded-[1.2rem] border p-4">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">Scanner Nüva</p>
                <p className="mt-1 text-sm font-bold">Escaneando producto</p>
              </div>
              <div className="relative mt-4 aspect-square overflow-hidden rounded-2xl border border-primary/40 bg-primary/5">
                <div className="absolute inset-x-3 top-1/2 h-px bg-primary shadow-[0_0_18px_hsl(var(--primary))] animate-scan-line" />
                <div className="absolute inset-[22%] rounded-xl border-2 border-primary/60 animate-pulse" />
                <ScanLine className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-primary animate-pulse" />
              </div>
              <div className="mt-3 rounded-xl border bg-secondary/30 p-3 text-center animate-fade-in-up">
                <p className="text-[10px] text-muted-foreground">Código detectado</p>
                <b className="text-xs">SKU-1048</b>
                <p className="mt-1 text-[10px] text-primary">Stock 24 → 25 · ✓ actualizado</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FinanceView() {
  const bars = [35, 45, 40, 54, 48, 61, 58, 69, 75, 70, 84, 92];
  return (
    <div className="space-y-4">
      <Header title="Finanzas" subtitle="Entiende ingresos, egresos, caja y rentabilidad." />
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Ingresos", "$3,24 M", "+12,4%"],
          ["Egresos", "$2,21 M", "-3,1%"],
          ["Utilidad", "$1,03 M", "+18,2%"],
        ].map(([a, b, c], i) => (
          <div
            key={a}
            className="rounded-2xl border bg-background/70 p-4 animate-fade-in-up"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <p className="text-xs text-muted-foreground">{a}</p>
            <p className="mt-2 text-xl font-bold">{b}</p>
            <p className="mt-1 text-xs text-primary">{c}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border bg-background/70 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">Evolución de ingresos</p>
          <span className="text-[10px] text-muted-foreground">12 meses</span>
        </div>
        <div className="mt-5 flex h-40 items-end gap-2">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 origin-bottom rounded-t-md bg-primary/60 animate-grow-bar"
              style={{ height: `${h}%`, animationDelay: `${i * 55}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CrmView() {
  return (
    <div className="space-y-4">
      <Header title="Clientes" subtitle="Centraliza relaciones, oportunidades y seguimiento comercial." />
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Clientes activos", "184"],
          ["Oportunidades", "23"],
          ["Conversión", "32,4%"],
        ].map(([a, b], i) => (
          <div
            key={a}
            className="rounded-2xl border bg-background/70 p-4 animate-fade-in-up"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <p className="text-xs text-muted-foreground">{a}</p>
            <p className="mt-2 text-xl font-bold">{b}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2 rounded-2xl border bg-background/70 p-4">
        {["Comercial Los Andes", "Distribuidora Maule", "Tienda Central"].map((name, i) => (
          <div key={name} className="flex items-center justify-between rounded-xl border bg-secondary/20 p-3 animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{name.charAt(0)}</div>
              <div>
                <p className="text-xs font-semibold">{name}</p>
                <p className="text-[10px] text-muted-foreground">Último contacto hace {i + 1} días</p>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">Activa</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function CopilotView() {
  const answer = "Tu negocio está creciendo de forma saludable: ventas +12,4%, margen +3,2% y clientes recurrentes +14%.";
  const [typed, setTyped] = useState(0);
  useEffect(() => {
    setTyped(0);
    const id = window.setInterval(() => setTyped((v) => Math.min(v + 2, answer.length)), 28);
    return () => window.clearInterval(id);
  }, [answer]);
  return (
    <div className="space-y-4">
      <Header title="Nüva Copilot" subtitle="Pregunta y entiende qué está pasando en tu negocio." />
      <div className="rounded-2xl border bg-background/70 p-4 sm:p-6">
        <div className="rounded-2xl border bg-primary/5 p-4 text-sm leading-relaxed">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" /> Nüva analizando...
          </div>
          <span>{answer.slice(0, typed)}</span>
          <span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-primary" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">¿Qué mejoró?</Badge>
          <Badge variant="outline">¿Qué riesgo veo?</Badge>
          <Badge variant="outline">¿Qué hago ahora?</Badge>
        </div>
      </div>
    </div>
  );
}

export function HomeProductPreview() {
  const [active, setActive] = useState<ModuleKey>("control");
  const [auto, setAuto] = useState(true);
  const activeIndex = modules.findIndex((m) => m.key === active);
  useEffect(() => {
    if (!auto) return;
    const id = window.setInterval(
      () =>
        setActive(modules[(modules.findIndex((m) => m.key === active) + 1) % modules.length].key),
      4400,
    );
    return () => window.clearInterval(id);
  }, [auto, active]);
  const current = modules.find((m) => m.key === active)!;
  const View = useMemo(
    () =>
      ({
        control: ControlView,
        score: ScoreView,
        radar: RadarView,
        inventory: InventoryView,
        finance: FinanceView,
        crm: CrmView,
        copilot: CopilotView,
      })[active],
    [active],
  );
  return (
    <section
      id="product-preview"
      className="relative overflow-hidden border-y bg-secondary/10 py-20 sm:py-28"
    >
      <div className="pointer-events-none absolute left-1/2 top-0 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl animate-pulse" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <Badge
            variant="secondary"
            className="rounded-full border border-primary/20 bg-primary/5 animate-fade-in-up"
          >
            <Sparkles className="mr-1.5 h-3 w-3 text-primary animate-pulse" /> Producto en acción
          </Badge>
          <h2 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Así se ve <span className="text-primary">tu negocio</span> con Nüva One.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
            No tienes que imaginarlo. Explora una vista interactiva de las herramientas que puedes
            tener en un solo lugar.
          </p>
        </div>
        <div className="mt-10 rounded-[2rem] border bg-card/90 p-3 shadow-[0_35px_100px_-45px_hsl(var(--primary)/.65)] backdrop-blur sm:p-5 transition-all duration-700 hover:shadow-[0_35px_120px_-40px_hsl(var(--primary)/.8)]">
          <div className="flex items-center justify-between gap-3 border-b px-1 pb-3 sm:px-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
              </span>
              <span className="truncate text-xs font-semibold">Nüva One · Vista interactiva</span>
            </div>
            <button
              onClick={() => setAuto((v) => !v)}
              className="text-[10px] font-semibold text-primary"
              aria-label="Alternar reproducción automática"
            >
              {auto ? "Pausar recorrido" : "Reanudar recorrido"}
            </button>
          </div>
          <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-2 [scrollbar-width:none]" style={{ contain: "layout paint" }}>
            {modules.map((m) => {
              const MIcon = m.icon;
              const selected = m.key === active;
              return (
                <button
                  key={m.key}
                  onClick={() => {
                    setActive(m.key);
                    setAuto(false);
                  }}
                  className={`group flex min-w-max items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-all duration-500 ${selected ? "border-primary/40 bg-primary text-primary-foreground shadow-glow scale-[1.02]" : "bg-background/60 text-muted-foreground hover:bg-background hover:-translate-y-0.5"}`}
                  aria-pressed={selected}
                >
                  <MIcon
                    className={`h-3.5 w-3.5 transition-transform duration-500 ${selected ? "rotate-6" : "group-hover:scale-110"}`}
                  />
                  {m.label}
                </button>
              );
            })}
          </div>
          <div className="relative mt-2 min-h-[22rem] overflow-hidden rounded-[1.5rem]">
            <div key={active} className="animate-fade-in-up">
              <View />
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card/50 to-transparent" />
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-[4400ms] ease-linear"
              style={{ width: `${((activeIndex + 1) / modules.length) * 100}%` }}
            />
          </div>
          <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-2xl border bg-primary/5 p-4 sm:flex-row">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Check className="h-4 w-4 text-primary" /> Todo conectado para que entiendas qué pasa
              y qué hacer después.
            </div>
            <Button asChild size="sm">
              <a href="/auth?mode=signup">
                Quiero tener Nüva One <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </div>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          {demo} · Las interfaces mostradas son una demostración de la experiencia Nüva One.
        </p>
      </div>
    </section>
  );
}