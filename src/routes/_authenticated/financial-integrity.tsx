import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-utils";
import { ModuleGuard } from "@/components/module-guard";
import { useActiveBusiness } from "@/lib/use-business";
import { useBizList, fmtCLP } from "@/lib/biz-data";

export const Route = createFileRoute("/_authenticated/financial-integrity")({
  head: () => ({ meta: [{ title: "Integridad Financiera — Nüva One" }] }),
  component: FinancialIntegrity,
});

function FinancialIntegrity() {
  const { active } = useActiveBusiness();
  const { data: health = [], isLoading: healthLoading } = useBizList<any>(
    "v_financial_control_center",
  );
  const { data: vat = [], isLoading: vatLoading } = useBizList<any>(
    "v_financial_vat_working_paper",
    { order: "period", ascending: false },
  );
  const current = health[0];
  const status = current?.overall_status ?? "not_started";
  const statusLabel =
    status === "healthy"
      ? "Saludable"
      : status === "blocked"
        ? "Bloqueado"
        : status === "in_review"
          ? "En revisión"
          : "Sin iniciar";
  const statusIcon =
    status === "healthy" ? (
      <CheckCircle2 className="h-5 w-5" />
    ) : status === "blocked" ? (
      <AlertTriangle className="h-5 w-5" />
    ) : (
      <ShieldCheck className="h-5 w-5" />
    );

  return (
    <ModuleGuard module="finance">
      <PageHeader
        title="Integridad Financiera"
        description={`Control transversal de contabilidad, tesorería, tributación y cierre${active ? ` · ${active.name}` : ""}`}
      />
      <div className="space-y-5">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-lg font-semibold">
                {statusIcon} Estado del sistema
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Una vista única para detectar inconsistencias antes del cierre.
              </p>
            </div>
            <Badge variant={status === "blocked" ? "destructive" : "outline"}>{statusLabel}</Badge>
          </div>
        </Card>

        {healthLoading ? (
          <Loading />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              title="Operaciones sin asiento"
              value={current?.missing_source_entries ?? 0}
              bad={Number(current?.missing_source_entries ?? 0) > 0}
              icon={<FileCheck2 />}
            />
            <Metric
              title="Cola bloqueada"
              value={current?.blocked_postings ?? 0}
              bad={Number(current?.blocked_postings ?? 0) > 0}
              icon={<LockKeyhole />}
            />
            <Metric
              title="Controles abiertos"
              value={current?.open_controls ?? 0}
              bad={Number(current?.open_controls ?? 0) > 0}
              icon={<ShieldCheck />}
            />
            <Metric
              title="Impuestos pendientes"
              value={fmtCLP(Number(current?.open_tax_amount ?? 0))}
              bad={Number(current?.open_tax_payments ?? 0) > 0}
              icon={<ReceiptText />}
            />
          </div>
        )}

        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Posición IVA — papel de trabajo</h2>
              <p className="text-sm text-muted-foreground">
                Cálculo interno a partir de operaciones registradas; no equivale a una declaración
                presentada al SII.
              </p>
            </div>
            <Badge variant="outline">F29 · preparación</Badge>
          </div>
          <div className="mt-4 space-y-2">
            {vatLoading && <Loading />}
            {!vatLoading &&
              vat.map((x: any) => (
                <div
                  key={`${x.business_id}-${x.period}`}
                  className="grid gap-2 rounded-lg border p-3 sm:grid-cols-5 sm:items-center"
                >
                  <div className="font-medium">
                    {new Date(x.period).toLocaleDateString("es-CL", {
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">IVA débito</span>
                    <div>{fmtCLP(Number(x.output_vat || 0))}</div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">IVA crédito</span>
                    <div>{fmtCLP(Number(x.input_vat || 0))}</div>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Neto</span>
                    <div className="font-semibold">{fmtCLP(Number(x.net_vat || 0))}</div>
                  </div>
                  <Badge variant="outline">
                    {x.vat_position === "payable"
                      ? "Por pagar"
                      : x.vat_position === "credit"
                        ? "Remanente"
                        : "Cero"}
                  </Badge>
                </div>
              ))}
            {!vatLoading && !vat.length && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No existen períodos con operaciones afectas disponibles.
              </p>
            )}
          </div>
        </Card>

        <Card className="border-primary/20 bg-primary/5 p-5">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <h2 className="font-semibold">Control preventivo activo</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Nüva bloquea la modificación de asientos cuando el período contable está cerrado,
                valida cuadratura y aislamiento de empresa de los asientos publicados y concentra
                las excepciones financieras en un único estado de control.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </ModuleGuard>
  );
}

function Metric({
  title,
  value,
  bad,
  icon,
}: {
  title: string;
  value: string | number;
  bad: boolean;
  icon: ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        <span className={bad ? "text-destructive" : "text-primary"}>{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">
        {bad ? "Requiere atención" : "Sin excepción detectada"}
      </div>
    </Card>
  );
}

function Loading() {
  return (
    <div className="animate-pulse rounded-lg border p-6 text-sm text-muted-foreground">
      Cargando controles financieros…
    </div>
  );
}
