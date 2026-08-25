import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Bot,
  Building2,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Copy,
  Database,
  Eye,
  Gauge,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Metrics = {
  users: number;
  businesses: number;
  memberships: number;
  customers: number;
  products: number;
  sales: number;
  transactions: number;
  quotes: number;
  ai_conversations: number;
  ai_messages: number;
  income: number;
  expenses: number;
  generated_at: string;
  telemetry?: {
    events: number;
    active_users: number;
    active_businesses: number;
    errors: number;
    ai_events: number;
    avg_duration_ms: number | null;
  } | null;
};
type Section = "overview" | "growth" | "product" | "observability" | "ia" | "economia" | "accounts";

export const Route = createFileRoute("/owner")({
  ssr: false,
  beforeLoad: async () => {
    await supabase.auth.refreshSession();
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    if (data.user.app_metadata?.platform_role !== "owner") throw redirect({ to: "/" });
  },
  component: OwnerConsole,
});

async function loadMetrics() {
  const { data, error } = await supabase.functions.invoke("owner-metrics", { body: {} });
  if (error) throw new Error("No se pudieron cargar los indicadores de Nüva.");
  return data as Metrics;
}
const num = (n: number) => n.toLocaleString("es-CL");
const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

function OwnerConsole() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<Section>("overview");
  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      setMetrics(await loadMetrics());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void refresh();
  }, []);
  const net = useMemo(() => {
    return (metrics?.income ?? 0) - (metrics?.expenses ?? 0);
  }, [metrics]);
  const tabs: [[Section, string, typeof Gauge]] | Array<[Section, string, typeof Gauge]> = [
    ["overview", "Overview", Gauge],
    ["growth", "Growth", TrendingUp],
    ["product", "Product Health", Activity],
    ["observability", "Observability", Zap],
    ["ia", "Nüva IA", Bot],
    ["economia", "Economía", CircleDollarSign],
    ["accounts", "Cuentas de cortesía", UserPlus],
  ];
  return (
    <div className="min-h-screen bg-[#07070c] px-4 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-[1440px]">
        <header className="mb-6 rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.075] via-white/[0.035] to-transparent p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-200/70">
                <ShieldCheck className="h-4 w-4" />
                Private Owner Console
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
                Nüva Command Center
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">
                Control privado de Nüva One: producto, adopción, IA, economía y cuentas especiales.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => void refresh()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm hover:bg-white/10 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Actualizar
              </button>
              <button
                onClick={() => void supabase.auth.signOut()}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm hover:bg-white/10"
              >
                <LogOut className="h-4 w-4" />
                Salir
              </button>
            </div>
          </div>
          <nav className="mt-7 flex gap-1 overflow-x-auto border-t border-white/8 pt-4">
            {tabs.map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setSection(id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm ${section === id ? "bg-white/10 text-white" : "text-white/45 hover:bg-white/5"}`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </header>
        {error ? (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">
            <XCircle className="h-5 w-5" />
            {error}
          </div>
        ) : null}
        {section === "overview" ? (
          <Overview metrics={metrics} loading={loading} />
        ) : section === "growth" ? (
          <Growth metrics={metrics} />
        ) : section === "product" ? (
          <Product metrics={metrics} />
        ) : section === "observability" ? (
          <Observability metrics={metrics} />
        ) : section === "ia" ? (
          <IA metrics={metrics} />
        ) : section === "economia" ? (
          <Economia metrics={metrics} net={net} />
        ) : (
          <ComplimentaryAccounts />
        )}
        <footer className="mt-8 flex flex-col gap-2 border-t border-white/8 pt-5 text-xs text-white/30 sm:flex-row sm:items-center sm:justify-between">
          <span>Datos agregados de plataforma · sin exposición de contenido privado de PYMEs</span>
          <span>
            Última lectura: {metrics ? new Date(metrics.generated_at).toLocaleString("es-CL") : "—"}
          </span>
        </footer>
      </div>
    </div>
  );
}

function Overview({ metrics, loading }: { metrics: Metrics | null; loading: boolean }) {
  const cards = [
    ["Usuarios", metrics?.users ?? 0, Users],
    ["Empresas", metrics?.businesses ?? 0, Building2],
    ["Membresías", metrics?.memberships ?? 0, Users],
    ["Clientes", metrics?.customers ?? 0, Users],
    ["Productos", metrics?.products ?? 0, Database],
    ["Ventas", metrics?.sales ?? 0, Activity],
    ["Transacciones", metrics?.transactions ?? 0, BarChart3],
    ["Cotizaciones", metrics?.quotes ?? 0, Target],
    ["Conversaciones IA", metrics?.ai_conversations ?? 0, Bot],
  ] as const;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map(([label, value, Icon]) => (
          <Metric key={label} label={label} value={value} loading={loading} Icon={Icon} />
        ))}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Panel title="Operating Pulse" icon={Sparkles}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Insight label="Mensajes IA" value={metrics?.ai_messages ?? 0} detail="uso agregado" />
            <Insight
              label="Membresías / empresa"
              value={
                metrics?.businesses ? (metrics.memberships / metrics.businesses).toFixed(1) : "0"
              }
              detail="promedio"
            />
            <Insight label="Estado" value="Operativo" detail="Nüva One" />
          </div>
        </Panel>
        <Panel title="Seguridad" icon={ShieldCheck}>
          <Status text="Sesión owner autenticada" />
          <Status text="Provisionamiento protegido" />
          <Status text="Acceso de cortesía server-side" />
          <Status text="RLS activo en datos de negocio" />
        </Panel>
      </div>
    </>
  );
}
function Growth({ metrics }: { metrics: Metrics | null }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Growth" icon={TrendingUp}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Insight label="Usuarios" value={metrics?.users ?? 0} detail="actuales" />
          <Insight label="Empresas" value={metrics?.businesses ?? 0} detail="actuales" />
          <Insight label="Clientes" value={metrics?.customers ?? 0} detail="actuales" />
          <Insight label="Cotizaciones" value={metrics?.quotes ?? 0} detail="actividad" />
        </div>
      </Panel>
      <Panel title="Funnel" icon={Target}>
        <Roadmap
          items={[
            "Visita → registro",
            "Registro → onboarding",
            "Onboarding → primera acción",
            "Primera acción → uso recurrente",
            "Trial → pago",
          ]}
        />
      </Panel>
    </div>
  );
}
function Product({ metrics }: { metrics: Metrics | null }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Product Health" icon={Activity}>
        <Status text={`${num(metrics?.transactions ?? 0)} transacciones observables`} />
        <Status text={`${num(metrics?.ai_messages ?? 0)} mensajes IA observables`} />
        <Status text="Performance instrumentado" />
        <Status text="Errores centralizados: siguiente capa" />
      </Panel>
      <Panel title="Siguiente capa" icon={Eye}>
        <Roadmap
          items={[
            "Errores por versión",
            "Latencia de APIs",
            "Estado de deployments",
            "Web Vitals",
            "Alertas automáticas",
          ]}
        />
      </Panel>
    </div>
  );
}
function Observability({ metrics }: { metrics: Metrics | null }) {
  const t = metrics?.telemetry;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Live Product Telemetry" icon={Zap}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Insight label="Eventos 24h" value={t?.events ?? 0} detail="agregados" />
          <Insight label="Usuarios activos" value={t?.active_users ?? 0} detail="24h" />
          <Insight label="PYMEs activas" value={t?.active_businesses ?? 0} detail="24h" />
          <Insight label="Errores" value={t?.errors ?? 0} detail="24h" />
        </div>
      </Panel>
      <Panel title="Performance" icon={Gauge}>
        <Insight
          label="Duración media"
          value={t?.avg_duration_ms != null ? `${Math.round(t.avg_duration_ms)} ms` : "—"}
          detail="eventos con duración"
        />
        <div className="mt-3">
          <Status text="LCP / FCP / CLS / INP / TTFB preparado" />
        </div>
      </Panel>
    </div>
  );
}
function IA({ metrics }: { metrics: Metrics | null }) {
  const c = metrics?.ai_conversations ?? 0;
  const m = metrics?.ai_messages ?? 0;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Nüva IA" icon={Bot}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Insight label="Conversaciones" value={c} detail="totales" />
          <Insight label="Mensajes" value={m} detail="totales" />
          <Insight
            label="Profundidad"
            value={c ? (m / c).toFixed(1) : "0"}
            detail="mensajes / conversación"
          />
        </div>
      </Panel>
      <Panel title="Instrumentación" icon={Sparkles}>
        <Roadmap
          items={[
            "IA por empresa y módulo",
            "Errores y latencia",
            "Tokens / coste",
            "Adopción recurrente",
            "Funciones IA con mayor retención",
          ]}
        />
      </Panel>
    </div>
  );
}
function Economia({ metrics, net }: { metrics: Metrics | null; net: number }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Economía de Nüva One" icon={CircleDollarSign}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Insight
            label="Ingresos"
            value={clp.format(metrics?.income ?? 0)}
            detail="propios de Nüva"
          />
          <Insight label="Costos" value={clp.format(metrics?.expenses ?? 0)} detail="plataforma" />
          <Insight label="Neto" value={clp.format(net)} detail="ingresos − costos" />
        </div>
      </Panel>
      <Panel title="Monetización" icon={Target}>
        <Roadmap items={["MRR / ARR", "Trial → pago", "Retención", "Churn", "LTV / CAC"]} />
      </Panel>
    </div>
  );
}

function ComplimentaryAccounts() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [note, setNote] = useState("");
  const [expires, setExpires] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ setup_link: string | null; business_name: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const create = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        "owner-create-complimentary-account",
        {
          body: {
            email,
            full_name: name,
            business_name: business,
            note: note || undefined,
            expires_at: expires ? new Date(`${expires}T23:59:59`).toISOString() : null,
          },
        },
      );
      if (invokeError) throw new Error(data?.error || "No se pudo crear la cuenta.");
      if (!data?.ok) throw new Error(data?.error || "No se pudo crear la cuenta.");
      setResult(data);
      setEmail("");
      setName("");
      setBusiness("");
      setNote("");
      setExpires("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setBusy(false);
    }
  };
  const copy = async () => {
    if (!result?.setup_link) return;
    await navigator.clipboard.writeText(result.setup_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <section className="space-y-5">
      <div className="rounded-[28px] border border-cyan-200/10 bg-gradient-to-br from-cyan-200/[0.08] via-white/[0.035] to-transparent p-6 shadow-2xl sm:p-8">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-200/10 text-cyan-100">
            <UserPlus />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-cyan-200/70">
              Owner-only provisioning
            </div>
            <h2 className="mt-2 text-2xl font-semibold">Cuentas de cortesía</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/50">
              Crea cuentas para familiares, amigos, testers o colaboradores con{" "}
              <strong className="text-white/80">acceso ilimitado</strong>, sin Stripe y sin
              restricciones por falta de pago.
            </p>
          </div>
        </div>
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          <Field
            label="Nombre completo"
            value={name}
            onChange={setName}
            placeholder="Ej. María Pérez"
          />
          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            placeholder="persona@email.com"
            type="email"
          />
          <Field
            label="Negocio"
            value={business}
            onChange={setBusiness}
            placeholder="Ej. Mi Negocio"
          />
          <Field
            label="Vigencia opcional"
            value={expires}
            onChange={setExpires}
            placeholder=""
            type="date"
          />
          <div className="md:col-span-2">
            <Field
              label="Nota interna"
              value={note}
              onChange={setNote}
              placeholder="Familia / tester / colaborador"
            />
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.04] p-4 text-sm text-white/60">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-200" />
            <span>
              <strong className="text-white/80">Acceso ilimitado:</strong> plan Pro activo, sin
              cobro, con bypass server-side de límites de productos e IA.
            </span>
          </div>
        </div>
        {error ? (
          <div className="mt-4 rounded-xl border border-red-300/15 bg-red-300/[0.05] p-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}
        <button
          onClick={() => void create()}
          disabled={busy || !email || !name || !business}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-200 px-5 py-3 text-sm font-bold text-[#06111c] hover:bg-cyan-100 disabled:opacity-40"
        >
          <UserPlus className="h-4 w-4" />
          {busy ? "Creando…" : "Crear cuenta de cortesía"}
        </button>
      </div>
      {result ? (
        <div className="rounded-[26px] border border-emerald-300/15 bg-emerald-300/[0.05] p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-200" />
            <div>
              <h3 className="font-semibold">Cuenta creada</h3>
              <p className="mt-1 text-xs text-white/45">
                {result.business_name} · acceso ilimitado · no requiere pago.
              </p>
            </div>
          </div>
          {result.setup_link ? (
            <div className="mt-5 rounded-2xl border border-white/8 bg-black/20 p-4">
              <div className="text-xs font-semibold text-white/60">
                Enlace de configuración de contraseña
              </div>
              <div className="mt-2 break-all text-xs text-white/35">{result.setup_link}</div>
              <button
                onClick={() => void copy()}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs"
              >
                {copied ? <Check /> : <Copy />}
                {copied ? "Copiado" : "Copiar enlace"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-white/55">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-cyan-200/30"
      />
    </label>
  );
}
function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Gauge;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[26px] border border-white/9 bg-white/[0.035] p-5 shadow-2xl backdrop-blur-xl sm:p-6">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-cyan-200/70" />
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
function Metric({
  label,
  value,
  loading,
  Icon,
}: {
  label: string;
  value: number;
  loading: boolean;
  Icon: typeof Users;
}) {
  return (
    <div className="rounded-2xl border border-white/9 bg-white/[0.035] p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/45">{label}</span>
        <Icon className="h-4 w-4 text-cyan-200/60" />
      </div>
      <div className="mt-3 text-2xl font-semibold">{loading ? "—" : num(value)}</div>
    </div>
  );
}
function Insight({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-white/7 bg-black/15 p-4">
      <div className="text-xs text-white/40">{label}</div>
      <div className="mt-2 text-xl font-semibold">
        {typeof value === "number" ? num(value) : value}
      </div>
      <div className="mt-1 text-[11px] text-white/30">{detail}</div>
    </div>
  );
}
function Status({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-white/7 py-3 last:border-0">
      <span className="h-2 w-2 rounded-full bg-emerald-300" />
      <span className="text-sm text-white/65">{text}</span>
      <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-200/70" />
    </div>
  );
}
function Roadmap({ items }: { items: string[] }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div
          key={item}
          className="flex items-center gap-3 rounded-xl border border-white/6 bg-black/10 px-3 py-2.5"
        >
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/7 text-[10px] text-white/45">
            {i + 1}
          </span>
          <span className="text-xs text-white/55">{item}</span>
        </div>
      ))}
    </div>
  );
}
