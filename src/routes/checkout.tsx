import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Brain,
  Check,
  ChevronDown,
  CreditCard,
  LockKeyhole,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  WalletCards,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { NUVA_PLANS, formatClp } from "@/lib/plan-config";
import { useActiveBusiness } from "@/lib/use-business";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const searchSchema = z.object({
  plan: z.enum(["starter", "pro"]).optional().default("pro"),
  billing: z.enum(["monthly", "annual"]).optional().default("monthly"),
});

export const Route = createFileRoute("/checkout")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Checkout seguro — Nüva One" },
      {
        name: "description",
        content:
          "Activa Nüva One mediante un proceso de pago seguro, claro y sin almacenar datos sensibles de tarjeta.",
      },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { active, isLoading: businessLoading } = useActiveBusiness();
  const [billing, setBilling] = useState<"monthly" | "annual">(search.billing);
  const [cardholder, setCardholder] = useState("");
  const [processing, setProcessing] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const plan = search.plan === "starter" ? NUVA_PLANS.starter : NUVA_PLANS.pro;
  const isPro = plan.id === "pro";
  const price = billing === "annual" ? plan.annualPriceClp : plan.monthlyPriceClp;
  const monthlyEquivalent = Math.round(plan.annualPriceClp / 12);
  const annualSaving = plan.monthlyPriceClp * 12 - plan.annualPriceClp;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthenticated(Boolean(data.session));
      setSessionChecked(true);
    });
  }, []);

  useEffect(() => {
    if (search.billing !== billing) setBilling(search.billing);
  }, [search.billing, billing]);

  const featureList = useMemo(
    () =>
      isPro
        ? [
            "Todo Nüva Start",
            "Nüva Score avanzado",
            "Nüva Radar y Nüva Copilot",
            "Finanzas y reportes avanzados",
            "500 créditos IA mensuales",
          ]
        : [
            "Dashboard del negocio",
            "Inventario, ventas y caja",
            "CRM y cotizaciones",
            "100 créditos IA mensuales",
            "15 días de prueba gratuita",
          ],
    [isPro],
  );

  function selectPlan(nextPlan: "starter" | "pro") {
    navigate({ to: "/checkout", search: { plan: nextPlan, billing } });
  }

  function selectBilling(nextBilling: "monthly" | "annual") {
    setBilling(nextBilling);
    navigate({ to: "/checkout", search: { plan: plan.id, billing: nextBilling } });
  }

  async function continueToPayment() {
    if (!sessionChecked || businessLoading || processing) return;

    if (!authenticated) {
      navigate({
        to: "/auth",
        search: {
          mode: "signup",
          redirect: `/checkout?plan=${plan.id}&billing=${billing}`,
        },
      });
      return;
    }

    if (!active) {
      toast.info("Primero necesitamos configurar tu negocio.");
      navigate({ to: "/onboarding" });
      return;
    }

    if (!isPro) {
      toast.success("Tu cuenta está lista para comenzar Nüva Start.");
      navigate({ to: "/dashboard" });
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch("/api/billing/subscribe/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: active.id }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        url?: string;
        error?: string;
      };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "No pudimos preparar el pago seguro.");
      }

      // Nüva One nunca recibe ni almacena el número de tarjeta: el proveedor
      // de pagos canónico aloja el formulario seguro y devuelve el resultado
      // por callback. Nüva One solo conserva el estado de la suscripción.
      window.location.assign(payload.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No pudimos iniciar el pago.");
      setProcessing(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f8fc] text-slate-950">
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute left-1/2 top-[-18rem] h-[38rem] w-[55rem] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute right-[-10rem] top-1/3 h-80 w-80 rounded-full bg-blue-400/10 blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-white shadow-glow">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="font-semibold tracking-tight">Nüva One</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-slate-500 sm:text-sm">
            <LockKeyhole className="h-3.5 w-3.5" />
            Pago seguro
          </div>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-5xl px-4 pb-5 pt-8 sm:px-6 sm:pt-10">
        <Link to="/pricing" className="mb-7 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"><ArrowLeft className="h-4 w-4" /> Volver a planes</Link>
        <div className="mx-auto max-w-2xl"><div className="flex items-center justify-between">{[["01", "Revisa"], ["02", "Pago seguro"], ["03", "Activación"]].map(([number, label], index) => <div key={number} className="flex min-w-0 flex-1 items-center"><div className="flex min-w-0 items-center gap-2"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${index === 1 ? "bg-slate-950 text-white shadow-lg" : "border border-slate-200 bg-white text-slate-500"}`}>{index === 0 ? <Check className="h-3.5 w-3.5" /> : number}</span><span className={`hidden truncate text-xs font-semibold sm:block ${index === 1 ? "text-slate-950" : "text-slate-400"}`}>{label}</span></div>{index < 2 && <div className="mx-3 h-px flex-1 bg-slate-200 sm:mx-5" />}</div>)}</div></div>
      </section>

      <section className="relative z-10 mx-auto grid max-w-5xl gap-6 px-4 pb-16 sm:px-6 lg:grid-cols-[1.05fr_.95fr] lg:items-start lg:gap-8">
        <div className="space-y-5">
          <div className="rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-[0_25px_80px_-40px_rgba(15,23,42,.25)] sm:p-7">
            <div className="flex items-start justify-between gap-4"><div><Badge className="rounded-full bg-violet-50 px-3 py-1 text-violet-700 hover:bg-violet-50">{isPro ? "Recomendado" : "Ideal para comenzar"}</Badge><h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">{plan.name}</h1><p className="mt-1.5 max-w-md text-sm leading-relaxed text-slate-500">{plan.tagline} Activa tu espacio y empieza a trabajar con una visión más clara de tu negocio.</p></div><div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white sm:flex">{isPro ? <Brain className="h-5 w-5" /> : <Zap className="h-5 w-5" />}</div></div>
            <div className="mt-7 grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-1"><button type="button" onClick={() => selectPlan("starter")} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${!isPro ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>Nüva Start</button><button type="button" onClick={() => selectPlan("pro")} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${isPro ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>Nüva Pro</button></div>
            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-1.5"><button type="button" onClick={() => selectBilling("monthly")} className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${billing === "monthly" ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>Mensual</button><button type="button" onClick={() => selectBilling("annual")} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${billing === "annual" ? "bg-slate-950 text-white shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>Anual<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Ahorra {formatClp(annualSaving)}</span></button></div>
            <div className="mt-7 flex items-end justify-between border-b border-slate-100 pb-6"><div><div className="text-xs font-medium uppercase tracking-[.16em] text-slate-400">Total</div><div className="mt-1 text-4xl font-bold tracking-tight">{formatClp(price)}</div><div className="mt-1 text-xs text-slate-400">{billing === "annual" ? `equivale a ${formatClp(monthlyEquivalent)}/mes` : "por mes"}</div></div><WalletCards className="h-7 w-7 text-slate-300" /></div>
            <div className="mt-6 space-y-3">{featureList.map((feature) => <div key={feature} className="flex items-start gap-2.5 text-sm text-slate-600"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Check className="h-3 w-3" /></span>{feature}</div>)}</div>
          </div>
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700"><ShieldCheck className="h-5 w-5" /></div><div><h2 className="font-semibold">Tus datos de tarjeta permanecen fuera de Nüva One</h2><p className="mt-1.5 text-xs leading-relaxed text-slate-500">Nüva One prepara la operación y te redirige al entorno seguro del proveedor de pagos. El número completo de tu tarjeta y su CVV no se almacenan en Nüva One.</p></div></div><div className="mt-4 grid gap-2 sm:grid-cols-3"><TrustItem icon={<LockKeyhole className="h-3.5 w-3.5" />} text="Conexión cifrada" /><TrustItem icon={<BadgeCheck className="h-3.5 w-3.5" />} text="Pago verificado" /><TrustItem icon={<RefreshCcw className="h-3.5 w-3.5" />} text="Gestión recurrente" /></div></div>
        </div>
        <div className="lg:sticky lg:top-24"><div className="rounded-[2rem] bg-[#111522] p-4 shadow-[0_35px_90px_-35px_rgba(15,23,42,.65)] sm:p-5"><div className="relative overflow-hidden rounded-[1.55rem] bg-gradient-to-br from-[#e9eefc] via-[#cfdcff] to-[#b8c9ff] p-5 shadow-inner sm:p-6"><div className="relative flex items-center justify-between text-slate-700"><span className="text-[11px] font-bold tracking-[.24em]">NÜVA ONE</span><CreditCard className="h-5 w-5" /></div><div className="relative mt-10 text-xl font-semibold tracking-[.18em] text-slate-700">•••• •••• •••• ••••</div><div className="relative mt-6 grid grid-cols-[1fr_auto] gap-4 text-[10px] uppercase tracking-[.16em] text-slate-500"><div><span>Tarjetahabiente</span><div className="mt-1 text-xs font-semibold normal-case tracking-normal text-slate-700">{cardholder || "Tu nombre"}</div></div><div><span>Expira</span><div className="mt-1 text-xs font-semibold tracking-normal text-slate-700">MM / AA</div></div></div></div><div className="px-1 pb-1 pt-5"><Label htmlFor="cardholder" className="text-white/70">Nombre del titular</Label><Input id="cardholder" value={cardholder} onChange={(event) => setCardholder(event.target.value)} placeholder="Como aparece en tu tarjeta" className="mt-2 border-white/10 bg-white/5 text-white placeholder:text-white/30" /><Button className="mt-4 w-full" size="lg" disabled={!sessionChecked || businessLoading || processing} onClick={() => void continueToPayment()}>{processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}Continuar al pago seguro</Button><p className="mt-3 text-center text-[11px] leading-relaxed text-white/35">Al continuar aceptas las condiciones del servicio y el proceso de pago del proveedor.</p></div></div></div>
      </section>
    </main>
  );
}

function TrustItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">{icon}{text}</div>;
}
