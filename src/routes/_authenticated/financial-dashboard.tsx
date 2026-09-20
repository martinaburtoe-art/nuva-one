import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-utils";
import { ModuleGuard } from "@/components/module-guard";
import { useActiveBusiness } from "@/lib/use-business";
import { useBizList, fmtCLP } from "@/lib/biz-data";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Calculator,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/financial-dashboard")({
  head: () => ({ meta: [{ title: "Centro Financiero — Nüva One" }] }),
  component: FinancialDashboard,
});

function FinancialDashboard() {
  const { active } = useActiveBusiness();
  const { data: pnl = [], isLoading: pnlLoading } = useBizList<any>(
    "v_financial_income_statement_monthly",
    { order: "year", ascending: false },
  );
  const { data: cash = [], isLoading: cashLoading } = useBizList<any>(
    "v_financial_cash_flow_daily",
    { order: "flow_date", ascending: false },
  );
  const { data: tax = [], isLoading: taxLoading } = useBizList<any>("v_financial_tax_control", {
    order: "period_year",
    ascending: false,
  });
  const { data: trial = [], isLoading: trialLoading } = useBizList<any>(
    "v_financial_trial_balance",
    { order: "code", ascending: true },
  );

  const financialLoading = pnlLoading || cashLoading || taxLoading || trialLoading;

  const revenue = pnl
    .filter((x: any) => ["revenue", "other_income"].includes(x.account_type))
    .reduce((s: number, x: any) => s + Number(x.signed_amount || 0), 0);
  const costs = pnl
    .filter((x: any) => ["cost_of_sales", "expense", "other_expense"].includes(x.account_type))
    .reduce((s: number, x: any) => s + Number(x.signed_amount || 0), 0);
  const result = revenue - costs;
  const cashIn = cash.reduce((s: number, x: any) => s + Number(x.cash_in || 0), 0);
  const cashOut = cash.reduce((s: number, x: any) => s + Number(x.cash_out || 0), 0);
  const cashNet = cashIn - cashOut;
  const latestTax = tax[0];
  const balanceDifference = trial.reduce(
    (s: number, x: any) => s + Number(x.debit || 0) - Number(x.credit || 0),
    0,
  );

  return (
    <ModuleGuard module="finance">
      <PageHeader
        title="Centro Financiero"
        description={`Tu centro financiero: resultado, caja, impuestos e integridad contable · ${active?.name ?? "Negocio"}`}
      />
      <div className="space-y-5">
        <Card className="overflow-hidden rounded-2xl border-border/70 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm">
          <div className="grid gap-5 p-5 lg:grid-cols-[1fr_2fr] lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.1em] text-primary">
                <ShieldCheck className="h-3.5 w-3.5" /> Visión financiera
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-tight" aria-live="polite">{financialLoading ? "—" : fmtCLP(result)}</div>
              <p className="mt-1 text-sm text-muted-foreground">Resultado acumulado en los datos publicados.</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <MiniStat label="Ingresos" value={financialLoading ? "—" : fmtCLP(revenue)} />
              <MiniStat label="Costos y gastos" value={financialLoading ? "—" : fmtCLP(costs)} />
              <MiniStat label="Flujo neto" value={financialLoading ? "—" : fmtCLP(cashNet)} />
              <MiniStat label="Balanza" value={financialLoading ? "—" : Math.abs(balanceDifference) <= 0.01 ? "Cuadrada" : "Revisar"} />
            </div>
          </div>
        </Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric title="Ingresos" value={financialLoading ? "—" : fmtCLP(revenue)} icon={<ArrowUpRight />} />
          <Metric title="Costos y gastos" value={financialLoading ? "—" : fmtCLP(costs)} icon={<ArrowDownRight />} />
          <Metric title="Resultado" value={financialLoading ? "—" : fmtCLP(result)} icon={<Calculator />} />
          <Metric title="Flujo neto" value={financialLoading ? "—" : fmtCLP(cashNet)} icon={<Banknote />} />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="rounded-2xl border-border/70 p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Estado de Resultados</h2>
                <p className="text-sm text-muted-foreground">
                  Basado en asientos publicados, no en cálculos aislados del frontend.
                </p>
              </div>
              <Badge variant="outline">Contabilidad</Badge>
            </div>
            {pnlLoading ? (
              <Loading />
            ) : (
              <div className="mt-4 space-y-2">
                {pnl.slice(0, 12).map((x: any) => (
                  <div
                    key={`${x.year}-${x.month}-${x.account_type}`}
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-card/70 p-3 transition-colors hover:bg-muted/30"
                  >
                    <div>
                      <div className="font-medium">{x.account_type}</div>
                      <div className="text-xs text-muted-foreground">
                        {x.year}-{String(x.month).padStart(2, "0")}
                      </div>
                    </div>
                    <div className="font-semibold">{fmtCLP(Number(x.signed_amount || 0))}</div>
                  </div>
                ))}
                {!pnl.length && (
                  <Empty text="Aún no existen asientos publicados para este reporte." />
                )}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Flujo de Caja</h2>
                <p className="text-sm text-muted-foreground">
                  Entradas, salidas y neto desde movimientos reales.
                </p>
              </div>
              <Badge variant="outline">Tesorería</Badge>
            </div>
            {cashLoading ? (
              <Loading />
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-border/70 bg-muted/10 p-3">
                  <div className="text-xs text-muted-foreground">Entradas</div>
                  <div className="mt-1 font-semibold">{fmtCLP(cashIn)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Salidas</div>
                  <div className="mt-1 font-semibold">{fmtCLP(cashOut)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">Neto</div>
                  <div className="mt-1 font-semibold">{fmtCLP(cashNet)}</div>
                </div>
              </div>
            )}
            {!cashLoading && (
              <div className="mt-4 space-y-2">
                {cash.slice(0, 7).map((x: any) => (
                  <div
                    key={x.flow_date}
                    className="flex items-center justify-between border-b border-border/70 py-2.5 text-sm"
                  >
                    <span>{new Date(x.flow_date).toLocaleDateString("es-CL")}</span>
                    <span>{fmtCLP(Number(x.net_cash || 0))}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Centro Tributario</h2>
                <p className="text-sm text-muted-foreground">
                  Papel de trabajo IVA/F29; no implica presentación ante SII.
                </p>
              </div>
              <ReceiptText className="h-5 w-5" />
            </div>
            {taxLoading ? (
              <Loading />
            ) : latestTax ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Metric
                  title="IVA débito"
                  value={fmtCLP(Number(latestTax.debit_iva))}
                  icon={<ArrowUpRight />}
                />
                <Metric
                  title="IVA crédito"
                  value={fmtCLP(Number(latestTax.credit_iva))}
                  icon={<ArrowDownRight />}
                />
                <Metric
                  title="IVA a pagar"
                  value={fmtCLP(Number(latestTax.iva_to_pay))}
                  icon={<ReceiptText />}
                />
                <Metric
                  title="PPM"
                  value={fmtCLP(Number(latestTax.ppm_amount))}
                  icon={<Calculator />}
                />
              </div>
            ) : (
              <Empty text="No hay un F29 preparado para mostrar." />
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Integridad contable</h2>
                <p className="text-sm text-muted-foreground">
                  La balanza debe cuadrar antes del cierre.
                </p>
              </div>
              <ShieldCheck className="h-5 w-5" />
            </div>
            {trialLoading ? (
              <Loading />
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/70 bg-muted/10 p-4">
                  <div className="text-xs text-muted-foreground">Cuentas con movimientos</div>
                  <div className="mt-1 text-2xl font-bold">{trial.length}</div>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-xs text-muted-foreground">Diferencia débito/crédito</div>
                  <div
                    className={`mt-1 text-2xl font-bold ${Math.abs(balanceDifference) > 0.01 ? "text-destructive" : ""}`}
                  >
                    {fmtCLP(balanceDifference)}
                  </div>
                </div>
              </div>
            )}
            <div className="mt-4 flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4" />
              {Math.abs(balanceDifference) <= 0.01 ? "Balanza cuadrada" : "Requiere revisión"}
            </div>
          </Card>
        </div>
      </div>
    </ModuleGuard>
  );
}

function Metric({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="rounded-2xl border-border/70 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        {icon}
      </div>
      <div className="mt-2 text-xl font-bold">{value}</div>
    </Card>
  );
}
function Loading() {
  return (
    <div className="mt-4 animate-pulse space-y-2 rounded-xl border border-border/70 p-5" aria-label="Cargando información financiera">
      <div className="h-4 w-1/3 rounded bg-muted" /><div className="h-8 w-2/3 rounded bg-muted" /><div className="h-3 w-full rounded bg-muted" />
    </div>
  );
}
function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border/70 bg-background/70 p-3"><div className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</div><div className="mt-1 truncate text-sm font-semibold">{value}</div></div>;
}

function Empty({ text }: { text: string }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-border/70 bg-muted/10 p-8 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
