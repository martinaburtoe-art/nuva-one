import { useEffect, useMemo, useState } from "react";
import { useActiveBusiness } from "@/lib/use-business";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { simulateBusiness } from "@/lib/nuva-intelligence/operating-system";
import { Calculator, Save, Sparkles } from "lucide-react";

export function NuvaBusinessSimulator() {
  const { active } = useActiveBusiness();
  const [revenue, setRevenue] = useState(1000000);
  const [variableCosts, setVariableCosts] = useState(500000);
  const [fixedCosts, setFixedCosts] = useState(200000);
  const [volume, setVolume] = useState(1000);
  const [price, setPrice] = useState(1000);
  const [priceChangePct, setPriceChangePct] = useState(0);
  const [volumeChangePct, setVolumeChangePct] = useState(0);
  const [variableCostChangePct, setVariableCostChangePct] = useState(0);
  const [fixedCostChangePct, setFixedCostChangePct] = useState(0);
  const [saved, setSaved] = useState(false);
  const [baselineLoading, setBaselineLoading] = useState(false);
  const [baselineSource, setBaselineSource] = useState<"real" | "manual">("manual");
  const [baselineSnapshot, setBaselineSnapshot] = useState<Record<string, any> | null>(null);
  const [signals, setSignals] = useState<Array<{ kind: string; severity: string; title: string; description: string; metric: number }>>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadBaseline() {
      if (!active?.id) return;
      setBaselineLoading(true);
      const { data, error } = await supabase.rpc("get_nuva_operating_snapshot", { p_business_id: active.id, p_days: 90 });
      if (!cancelled && !error && data) {
        const snapshot = data as Record<string, any>;
        const baseline = (snapshot.baseline ?? {}) as Record<string, any>;
        setRevenue(Number(baseline.revenue) || 0);
        setVariableCosts(Number(baseline.variableCosts) || 0);
        setFixedCosts(Number(baseline.fixedCosts) || 0);
        setVolume(Number(baseline.volume) || 0);
        setPrice(Number(baseline.unitPrice) || 0);
        setBaselineSnapshot(baseline);
        setSignals(Array.isArray(snapshot.signals) ? snapshot.signals : []);
        setBaselineSource("real");
      }
      if (!cancelled) setBaselineLoading(false);
    }
    void loadBaseline();
    return () => { cancelled = true; };
  }, [active?.id]);

  const result = useMemo(() => simulateBusiness({
    revenue, variableCosts, fixedCosts, volume, price,
    priceChangePct, volumeChangePct, variableCostChangePct, fixedCostChangePct,
  }), [revenue, variableCosts, fixedCosts, volume, price, priceChangePct, volumeChangePct, variableCostChangePct, fixedCostChangePct]);

  const money = (n: number) => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);

  async function saveScenario() {
    if (!active?.id) return;
    setSaved(false);
    const { error } = await supabase.from("nuva_simulation_scenarios").insert({
      business_id: active.id,
      name: "Escenario ejecutivo",
      scenario_type: "commercial",
      inputs: { revenue, variableCosts, fixedCosts, volume, price, priceChangePct, volumeChangePct, variableCostChangePct, fixedCostChangePct },
      outputs: result,
      assumptions: { note: "Escenario calculado por el usuario; no modifica datos operacionales.", baselineSource },
      baseline_snapshot: baselineSnapshot,
      status: "saved",
    });
    if (!error) setSaved(true);
  }

  return (
    <Card className="rounded-2xl border-primary/20 bg-gradient-to-br from-primary/[0.04] via-background to-background p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><Calculator className="h-4 w-4" /> Nüva Business Simulator</p>
          <h3 className="mt-1 text-xl font-semibold">¿Qué pasa si cambias una variable?</h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Prueba escenarios sin alterar ventas, inventario ni contabilidad. Nüva separa el escenario de los datos reales.</p>
          <p className="mt-2 text-xs font-medium text-muted-foreground">{baselineLoading ? "Cargando línea base real de los últimos 90 días…" : baselineSource === "real" ? "Línea base conectada a datos operacionales reales · 90 días" : "Línea base manual · aún no hay datos operacionales suficientes"}</p>
        </div>
        <Button variant="outline" size="sm" onClick={saveScenario} disabled={!active?.id}><Save className="mr-2 h-4 w-4" /> Guardar escenario</Button>
      </div>
      {saved && <p className="mt-3 text-xs font-medium text-primary">Escenario guardado en la memoria de simulaciones.</p>}
      {signals.length > 0 && (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {signals.map((signal, index) => (
            <div key={`${signal.title}-${index}`} className="rounded-xl border bg-background/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{signal.title}</p>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{signal.severity}</span>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{signal.description}</p>
              {signal.metric !== 0 && <p className="mt-2 text-xs font-semibold tabular-nums">{signal.metric > 0 ? "+" : ""}{signal.metric}{signal.title.includes("Inventario") ? " productos" : signal.title.includes("Cobranza") ? " CLP" : "%"}</p>}
            </div>
          ))}
        </div>
      )}
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ingresos base" value={revenue} onChange={setRevenue} />
          <Field label="Costos variables" value={variableCosts} onChange={setVariableCosts} />
          <Field label="Costos fijos" value={fixedCosts} onChange={setFixedCosts} />
          <Field label="Volumen base" value={volume} onChange={setVolume} />
          <Field label="Precio unitario" value={price} onChange={setPrice} />
          <Field label="Cambio de precio %" value={priceChangePct} onChange={setPriceChangePct} />
          <Field label="Cambio de volumen %" value={volumeChangePct} onChange={setVolumeChangePct} />
          <Field label="Cambio costo variable %" value={variableCostChangePct} onChange={setVariableCostChangePct} />
          <Field label="Cambio costo fijo %" value={fixedCostChangePct} onChange={setFixedCostChangePct} />
        </div>
        <div className="rounded-2xl border bg-background/80 p-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><Sparkles className="h-4 w-4" /> Resultado del escenario</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Metric label="Ingresos proyectados" value={money(result.revenue)} />
            <Metric label="Utilidad operacional" value={money(result.operatingProfit)} />
            <Metric label="Margen operacional" value={result.marginPct.toFixed(1) + "%"} />
            <Metric label="Cambio de utilidad" value={(result.profitDeltaPct >= 0 ? "+" : "") + result.profitDeltaPct.toFixed(1) + "%"} />
          </div>
          <div className="mt-4 rounded-xl bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">Este resultado es una simulación matemática basada exclusivamente en los supuestos ingresados. No es una predicción garantizada.</div>
        </div>
      </div>
    </Card>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label><Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} /></div>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border bg-muted/20 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-lg font-bold tabular-nums">{value}</p></div>;
}
