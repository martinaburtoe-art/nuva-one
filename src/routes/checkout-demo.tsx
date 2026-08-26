import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { ArrowLeft, Check, CreditCard, LockKeyhole, ShieldCheck, Sparkles, WalletCards, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NUVA_PLANS, formatClp } from "@/lib/plan-config";

const searchSchema = z.object({
  plan: z.enum(["starter", "pro"]).optional().default("pro"),
  billing: z.enum(["monthly", "annual"]).optional().default("monthly"),
});

export const Route = createFileRoute("/checkout-demo")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: "Demo de pago — Nüva One" }],
  }),
  component: CheckoutDemo,
});

function CheckoutDemo() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const plan = search.plan === "starter" ? NUVA_PLANS.starter : NUVA_PLANS.pro;
  const amount = search.billing === "annual" ? plan.annualPriceClp : plan.monthlyPriceClp;
  const [step, setStep] = useState<"payment" | "processing" | "success" | "failed">("payment");
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  function simulate(result: "success" | "failed") {
    setStep("processing");
    window.setTimeout(() => setStep(result), 850);
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="font-semibold">Nüva One</span>
          </Link>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
            DEMO · sin cobro real
          </span>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_420px] lg:py-12">
        <div>
          <Link to="/checkout" search={{ plan: plan.id, billing: search.billing }} className="mb-6 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Volver al checkout Nüva One
          </Link>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#009ee3]/10 text-[#009ee3]">
                <WalletCards className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-400">Experiencia simulada</p>
                <h1 className="mt-1 text-2xl font-bold">Checkout Mercado Pago</h1>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  Esta pantalla reproduce el flujo que verá el cliente antes de conectar las credenciales reales de Mercado Pago.
                </p>
              </div>
            </div>

            {step === "payment" && (
              <div className="mt-8 space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{plan.name}</p>
                      <p className="text-xs text-slate-500">Suscripción {search.billing === "annual" ? "anual" : "mensual"}</p>
                    </div>
                    <p className="text-lg font-bold">{formatClp(amount)}</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="demo-name">Nombre del titular</Label>
                  <Input id="demo-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre y apellido" className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="demo-number">Número de tarjeta</Label>
                  <Input id="demo-number" value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").slice(0, 16))} placeholder="•••• •••• •••• ••••" inputMode="numeric" className="mt-1.5" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="demo-expiry">Vencimiento</Label>
                    <Input id="demo-expiry" value={expiry} onChange={(e) => setExpiry(e.target.value.slice(0, 5))} placeholder="MM/AA" className="mt-1.5" />
                  </div>
                  <div>
                    <Label htmlFor="demo-cvv">CVV</Label>
                    <Input id="demo-cvv" value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="•••" inputMode="numeric" className="mt-1.5" />
                  </div>
                </div>

                <div className="rounded-2xl border border-[#009ee3]/20 bg-[#009ee3]/5 p-4 text-xs text-slate-600">
                  <div className="flex gap-2">
                    <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#009ee3]" />
                    <p>En producción estos datos serán capturados por Mercado Pago. Nüva One no almacenará el número completo ni el CVV.</p>
                  </div>
                </div>

                <Button className="h-12 w-full rounded-xl bg-[#009ee3] text-white hover:bg-[#008bc7]" onClick={() => simulate("success")} disabled={!name || number.length < 4 || !expiry || cvv.length < 3}>
                  <CreditCard className="mr-2 h-4 w-4" /> Simular pago aprobado
                </Button>
                <Button variant="outline" className="w-full" onClick={() => simulate("failed")} disabled={!name}>
                  Simular pago rechazado
                </Button>
              </div>
            )}

            {step === "processing" && (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                <div className="h-12 w-12 animate-pulse rounded-full bg-[#009ee3]/15" />
                <h2 className="mt-5 text-xl font-bold">Procesando pago…</h2>
                <p className="mt-2 max-w-sm text-sm text-slate-500">Estamos verificando la operación y preparando la activación de tu suscripción.</p>
              </div>
            )}

            {step === "success" && (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><Check className="h-8 w-8" /></div>
                <h2 className="mt-5 text-2xl font-bold">Pago aprobado</h2>
                <p className="mt-2 max-w-sm text-sm text-slate-500">La suscripción quedaría en estado activo después de la confirmación server-to-server de Mercado Pago.</p>
                <Button className="mt-6" onClick={() => navigate({ to: "/checkout", search: { plan: plan.id, billing: search.billing } })}>Volver al checkout</Button>
              </div>
            )}

            {step === "failed" && (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600"><XCircle className="h-8 w-8" /></div>
                <h2 className="mt-5 text-2xl font-bold">Pago rechazado</h2>
                <p className="mt-2 max-w-sm text-sm text-slate-500">En producción el cliente podrá volver a intentar o cambiar su medio de pago sin perder el estado de su suscripción.</p>
                <Button className="mt-6" onClick={() => setStep("payment")}>Intentar nuevamente</Button>
              </div>
            )}
          </div>
        </div>

        <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-8">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[#009ee3]">Mercado Pago</span>
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="mt-6 space-y-4 text-sm">
            <div className="flex items-center justify-between"><span className="text-slate-500">Plan</span><span className="font-semibold">{plan.name}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-500">Frecuencia</span><span className="font-semibold">{search.billing === "annual" ? "Anual" : "Mensual"}</span></div>
            <div className="flex items-center justify-between border-t pt-4"><span className="font-semibold">Total</span><span className="text-xl font-bold">{formatClp(amount)}</span></div>
          </div>
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
            <strong className="text-slate-700">Listo para conectar.</strong> Cuando Nüva One tenga las credenciales de producción, este flujo será reemplazado automáticamente por el checkout real de Mercado Pago sin cambiar el modelo de precios.
          </div>
        </aside>
      </section>
    </main>
  );
}
