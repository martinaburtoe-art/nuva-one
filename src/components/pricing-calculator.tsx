import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, Save, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useActiveBusiness } from "@/lib/use-business";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { calculatePricing, priceWithVat, type PricingBusinessType, type PricingInput } from "@/lib/pricing-engine";

const money = (v: number) => Number.isFinite(v) ? `$${Math.round(v).toLocaleString("es-CL")}` : "—";
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const num = (v: string) => Math.max(0, Number(v) || 0);

type FormState = Omit<PricingInput, "competitorPrices" | "elasticity"> & { competitorPricesText: string; elasticityText: string };

const initial: FormState = {
  productType: "resale", directCost: 10000, laborCost: 0, packagingCost: 0, logisticsCost: 0, otherVariableCost: 0,
  wasteRate: 0.02, fixedCostsMonthly: 500000, expectedUnitsMonthly: 100, targetMargin: 0.3,
  paymentFeeRate: 0.03, salesCommissionRate: 0, marketplaceFeeRate: 0, returnRate: 0, warrantyRate: 0,
  ownerHourlyCost: 0, ownerHoursPerUnit: 0, abcMonthlyAllocation: 0, competitorPricesText: "", differentiationScore: 5,
  valueScore: 5, referenceValue: 0, differentiatedValue: 0, valueCaptureRate: 0.2, elasticityText: "",
  currentPrice: 0, discountRate: 0, vatRate: 0.19, vatIncluded: false, psychologicalPricing: true,
};

export function PricingCalculator() {
  const { active } = useActiveBusiness();
  const [form, setForm] = useState<FormState>(initial);
  const [saving, setSaving] = useState(false);
  const input = useMemo<PricingInput>(() => ({
    ...form,
    competitorPrices: form.competitorPricesText.split(/[;,\s]+/).map(Number).filter((v) => v > 0),
    elasticity: form.elasticityText.trim() ? Number(form.elasticityText) : null,
  }), [form]);
  const result = useMemo(() => calculatePricing(input), [input]);
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((s) => ({ ...s, [key]: value }));

  async function saveCalculation() {
    if (!active?.id) { toast.error("Selecciona una empresa activa."); return; }
    setSaving(true);
    const { error } = await supabase.from("pricing_calculations" as any).insert({
      business_id: active.id, product_id: null, name: "Cálculo de precio", product_type: input.productType,
      input_data: input, result_data: result, calculation_version: "1.0.0",
    });
    setSaving(false);
    if (error) toast.error("No pude guardar el cálculo."); else toast.success("Cálculo guardado en Nüva.");
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div><p className="text-sm font-medium text-primary">Nüva Pricing Intelligence</p><h1 className="text-2xl font-semibold tracking-tight">Calculadora de precio de venta</h1><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Combina costos, margen, mercado y valor. No es solo una calculadora: explica por qué un precio es sostenible.</p></div>
        <Button onClick={saveCalculation} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "Guardando…" : "Guardar cálculo"}</Button>
      </header>

      <Card className="border-primary/20 bg-primary/[0.03]"><CardContent className="grid gap-4 p-5 md:grid-cols-4">
        <Field label="Tipo de negocio"><select value={form.productType} onChange={(e) => set("productType", e.target.value as PricingBusinessType)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="manufactured">Fabricado</option><option value="resale">Reventa / importado</option><option value="service">Servicio</option><option value="digital">Digital</option></select></Field>
        <Field label="Unidades al mes"><Input type="number" min="1" value={form.expectedUnitsMonthly} onChange={(e) => set("expectedUnitsMonthly", num(e.target.value))} /></Field>
        <Field label="Margen objetivo (%)"><Input type="number" min="0" max="95" value={Math.round(form.targetMargin * 100)} onChange={(e) => set("targetMargin", num(e.target.value) / 100)} /></Field>
        <Field label="Precio actual (opcional)"><Input type="number" min="0" value={form.currentPrice} onChange={(e) => set("currentPrice", num(e.target.value))} /></Field>
      </CardContent></Card>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <Card><CardHeader><CardTitle>Costos por unidad</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Costo directo"><Input type="number" value={form.directCost} onChange={(e) => set("directCost", num(e.target.value))} /><Hint>Compra, materia prima o insumos principales.</Hint></Field>
            <Field label="Mano de obra directa"><Input type="number" value={form.laborCost} onChange={(e) => set("laborCost", num(e.target.value))} /></Field>
            <Field label="Empaque"><Input type="number" value={form.packagingCost} onChange={(e) => set("packagingCost", num(e.target.value))} /></Field>
            <Field label="Logística / delivery"><Input type="number" value={form.logisticsCost} onChange={(e) => set("logisticsCost", num(e.target.value))} /></Field>
            <Field label="Otros variables"><Input type="number" value={form.otherVariableCost} onChange={(e) => set("otherVariableCost", num(e.target.value))} /></Field>
            <Field label="Merma (%)"><Input type="number" min="0" max="99" value={Math.round(form.wasteRate * 100)} onChange={(e) => set("wasteRate", num(e.target.value) / 100)} /><Hint>Se corrige por rendimiento, no con un simple +x%.</Hint></Field>
          </CardContent></Card>

          <Card><CardHeader><CardTitle>Costos mensuales y tiempo del dueño</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label="Costos fijos mensuales"><Input type="number" value={form.fixedCostsMonthly} onChange={(e) => set("fixedCostsMonthly", num(e.target.value))} /><Hint>Arriendo, administración, software, servicios, etc.</Hint></Field>
            <Field label="Asignación ABC mensual"><Input type="number" value={form.abcMonthlyAllocation} onChange={(e) => set("abcMonthlyAllocation", num(e.target.value))} /><Hint>Costos de actividades que quieres asignar a este producto.</Hint></Field>
            <Field label="Valor hora del dueño"><Input type="number" value={form.ownerHourlyCost} onChange={(e) => set("ownerHourlyCost", num(e.target.value))} /><Hint>Evita considerar gratis el trabajo del propietario.</Hint></Field>
            <Field label="Horas del dueño por unidad"><Input type="number" step="0.01" value={form.ownerHoursPerUnit} onChange={(e) => set("ownerHoursPerUnit", num(e.target.value))} /></Field>
          </CardContent></Card>

          <Card><CardHeader><CardTitle>Comisiones y riesgos</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">
            <PercentField label="Pasarela de pago" value={form.paymentFeeRate} onChange={(v) => set("paymentFeeRate", v)} />
            <PercentField label="Comisión de venta" value={form.salesCommissionRate} onChange={(v) => set("salesCommissionRate", v)} />
            <PercentField label="Marketplace" value={form.marketplaceFeeRate} onChange={(v) => set("marketplaceFeeRate", v)} />
            <PercentField label="Devoluciones" value={form.returnRate} onChange={(v) => set("returnRate", v)} />
            <PercentField label="Garantías / fallas" value={form.warrantyRate} onChange={(v) => set("warrantyRate", v)} />
            <PercentField label="Descuento habitual" value={form.discountRate} onChange={(v) => set("discountRate", v)} />
          </CardContent></Card>

          <Card><CardHeader><CardTitle>Mercado, valor y demanda</CardTitle></CardHeader><CardContent className="space-y-4">
            <Field label="Precios de competidores"><Input placeholder="Ej: 17990 18990 19990" value={form.competitorPricesText} onChange={(e) => set("competitorPricesText", e.target.value)} /><Hint>Usa precios comparables. Nüva calcula mediana y posición competitiva.</Hint></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Diferenciación (0–10)"><Input type="number" min="0" max="10" value={form.differentiationScore} onChange={(e) => set("differentiationScore", num(e.target.value))} /></Field><Field label="Valor percibido (0–10)"><Input type="number" min="0" max="10" value={form.valueScore} onChange={(e) => set("valueScore", num(e.target.value))} /></Field><Field label="Valor de referencia"><Input type="number" value={form.referenceValue} onChange={(e) => set("referenceValue", num(e.target.value))} /><Hint>Valor de la alternativa que tendría el cliente.</Hint></Field><Field label="Valor adicional generado"><Input type="number" value={form.differentiatedValue} onChange={(e) => set("differentiatedValue", num(e.target.value))} /></Field><Field label="Elasticidad estimada"><Input type="number" step="0.1" placeholder="Ej: 1.5" value={form.elasticityText} onChange={(e) => set("elasticityText", e.target.value)} /><Hint>Déjala vacía si no la conoces.</Hint></Field></div>
          </CardContent></Card>
        </div>

        <div className="space-y-5 xl:sticky xl:top-5 xl:self-start">
          <Card className="border-primary/30"><CardHeader><div className="flex items-center justify-between"><CardTitle>Precio recomendado</CardTitle><Sparkles className="h-5 w-5 text-primary" /></div></CardHeader><CardContent><div className="text-4xl font-bold tracking-tight">{money(result.recommendedPrice)}</div><p className="mt-1 text-sm text-muted-foreground">{money(priceWithVat(result.recommendedPrice, input.vatRate))} con IVA 19%</p><div className="mt-5 grid grid-cols-3 gap-2"><Metric label="Piso operativo" value={money(result.operatingFloor)} /><Metric label="Piso económico" value={money(result.economicFloor)} /><Metric label="Aspiracional" value={result.aspirationalPrice ? money(result.aspirationalPrice) : "—"} /></div></CardContent></Card>
          <Card><CardHeader><CardTitle>Rentabilidad</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2"><Metric label="Costo variable / unidad" value={money(result.variableUnitCost)} /><Metric label="Costo completo / unidad" value={money(result.fullUnitCost)} /><Metric label="Margen de contribución" value={pct(result.contributionMarginRate)} /><Metric label="Contribución / unidad" value={money(result.contributionMargin)} /><Metric label="Punto de equilibrio" value={result.breakEvenUnits ? `${result.breakEvenUnits} unidades` : "No alcanzable"} /><Metric label="Utilidad mensual" value={money(result.projectedProfit)} /></CardContent></Card>
          <Card><CardHeader><div className="flex items-center justify-between"><CardTitle>Escenarios</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></div></CardHeader><CardContent className="space-y-2">{result.scenarios.map((s) => <div key={s.label} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"><span className="text-muted-foreground">{s.label}</span><span className="font-semibold">{money(s.price)} <span className={s.profit >= 0 ? "text-emerald-600" : "text-destructive"}>· {money(s.profit)}</span></span></div>)}</CardContent></Card>
          <Card><CardHeader><CardTitle>Diagnóstico de Nüva</CardTitle></CardHeader><CardContent className="space-y-3">{result.warnings.map((w, i) => <div key={`w-${i}`} className="flex gap-2 rounded-lg bg-muted/50 p-3 text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{w.message}</span></div>)}{result.recommendations.map((r, i) => <div key={`r-${i}`} className="flex gap-2 rounded-lg border p-3 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-medium">{r.title}</p><p className="text-muted-foreground">{r.message}</p></div></div>)}<div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground"><Info className="h-3.5 w-3.5" />Confianza: <strong>{result.confidenceScore}/100</strong></div></CardContent></Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="space-y-1.5 text-sm"><span className="font-medium">{label}</span>{children}</label>; }
function Hint({ children }: { children: ReactNode }) { return <span className="block text-[11px] leading-4 text-muted-foreground">{children}</span>; }
function PercentField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) { return <Field label={`${label} (%)`}><Input type="number" min="0" max="99" value={Math.round(value * 100)} onChange={(e) => onChange(num(e.target.value) / 100)} /></Field>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg bg-muted/40 p-3"><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>; }
