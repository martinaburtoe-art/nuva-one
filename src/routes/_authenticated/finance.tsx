import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, EmptyState } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ModuleGuard } from "@/components/module-guard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Trash2,
  CreditCard,
  FileText,
  Lock,
  Download,
  FileDown,
  Link2,
  Unplug,
  Copy,
} from "lucide-react";
import { useBizList, useBizInsert, useBizDelete, fmtCLP } from "@/lib/biz-data";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/export";
import { generateMonthlyReportPdf } from "@/lib/monthly-report";
import { useActiveBusiness, useMyRole, canWriteOperations } from "@/lib/use-business";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => ({ meta: [{ title: "Finanzas — Nüva One" }] }),
  component: Finance,
});

const EXPENSE_CATEGORIES = [
  "Insumos",
  "Mercadería para reventa",
  "Equipamiento",
  "Arriendo",
  "Servicios",
  "Marketing",
  "Otro",
];
const INCOME_CATEGORIES = ["Ventas", "Servicios prestados", "Otros ingresos"];

type RangeKey = "month" | "last_month" | "quarter" | "year" | "all";
const RANGE_LABEL: Record<RangeKey, string> = {
  month: "Este mes",
  last_month: "Mes pasado",
  quarter: "Este trimestre",
  year: "Este año",
  all: "Todo",
};

function inRange(dateStr: string, range: RangeKey) {
  if (range === "all") return true;
  const d = new Date(dateStr);
  const now = new Date();
  if (range === "month") {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  if (range === "last_month") {
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth();
  }
  if (range === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    const dq = Math.floor(d.getMonth() / 3);
    return d.getFullYear() === now.getFullYear() && dq === q;
  }
  if (range === "year") return d.getFullYear() === now.getFullYear();
  return true;
}

function Finance() {
  const { data: myRole } = useMyRole();
  const canWrite = canWriteOperations(myRole);
  const { active } = useActiveBusiness();
  const { data: tx, isLoading } = useBizList<any>("transactions", { order: "tx_date" });
  const { data: sales } = useBizList<any>("sales");
  const { data: purchases } = useBizList<any>("purchases");
  const insert = useBizInsert("transactions");
  const del = useBizDelete("transactions");
  const [open, setOpen] = useState(false);
  const [txType, setTxType] = useState<"income" | "expense">("expense");
  const [txCategory, setTxCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [txCategoryOther, setTxCategoryOther] = useState("");
  const [breakdownRange, setBreakdownRange] = useState<RangeKey>("month");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  async function exportPdf() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const monthTx = (tx ?? []).filter((t) => {
      const d = new Date(t.tx_date);
      return d.getFullYear() === y && d.getMonth() === m;
    });
    if (monthTx.length === 0) {
      toast.info("No hay movimientos este mes para reportar");
      return;
    }
    const label = now.toLocaleDateString("es-CL", { month: "long", year: "numeric" });
    try {
      await generateMonthlyReportPdf(active?.name ?? "Negocio", monthTx, label);
    } catch {
      toast.error("Error al generar el PDF");
    }
  }

  // Transactions auto-created by a sale/purchase trigger must not be deleted
  // directly here -- doing so would leave the originating sale/purchase row
  // pointing at a transaction_id that no longer exists, and its
  // stock_applied flag stuck at true with no way to reverse the stock effect
  // from the UI. Cancel/delete the sale or purchase instead, which reverts
  // both the stock and the transaction together.
  const autoTxIds = new Set([
    ...(sales ?? []).map((s: any) => s.transaction_id).filter(Boolean),
    ...(purchases ?? []).map((p: any) => p.transaction_id).filter(Boolean),
  ]);

  function handleDelete(t: any) {
    if (autoTxIds.has(t.id)) {
      toast.error(
        "Este movimiento se generó automáticamente desde una venta o compra. Cancela o elimina el registro original en Ventas/Compras en su lugar.",
      );
      return;
    }
    del.mutate(t.id);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const category = txCategory === "Otro" ? txCategoryOther.trim() || "Otro" : txCategory;
    await insert.mutateAsync({
      type: fd.get("type"),
      category,
      amount: Number(fd.get("amount")),
      description: fd.get("description"),
    });
    setOpen(false);
    setTxType("expense");
    setTxCategory(EXPENSE_CATEGORIES[0]);
    setTxCategoryOther("");
  }

  const income = (tx ?? [])
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const expense = (tx ?? [])
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);

  // Pie of expense categories, respetando el filtro de rango de fechas
  const breakdownTx = (tx ?? []).filter(
    (t) => t.type === "expense" && inRange(t.tx_date, breakdownRange),
  );
  const expByCat: Record<string, number> = {};
  breakdownTx.forEach((t) => {
    expByCat[t.category ?? "Otro"] = (expByCat[t.category ?? "Otro"] ?? 0) + Number(t.amount);
  });
  const breakdownTotal = Object.values(expByCat).reduce((s, v) => s + v, 0);
  const pieData = Object.entries(expByCat)
    .map(([name, value]) => ({
      name,
      value,
      pct: breakdownTotal ? (value / breakdownTotal) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  const creditSales = (sales ?? []).filter((s: any) => s.is_credit && s.status !== "cancelled");
  const receivable = creditSales.reduce(
    (sum: number, s: any) => sum + (Number(s.total) - Number(s.paid_amount)),
    0,
  );
  const overdueSales = creditSales.filter(
    (s: any) =>
      Number(s.paid_amount) < Number(s.total) && s.due_date && new Date(s.due_date) < new Date(),
  );
  const overdueTotal = overdueSales.reduce(
    (sum: number, s: any) => sum + (Number(s.total) - Number(s.paid_amount)),
    0,
  );

  const COLORS = [
    "oklch(0.55 0.22 268)",
    "oklch(0.6 0.22 25)",
    "oklch(0.75 0.17 70)",
    "oklch(0.65 0.17 155)",
    "oklch(0.5 0.15 320)",
  ];

  return (
    <ModuleGuard module="finance">
      <>
        <PageHeader
          title="Finanzas"
          description="Ingresos, gastos y flujo de caja"
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={!tx || tx.length === 0}
                onClick={() =>
                  downloadCsv(
                    "movimientos.csv",
                    (tx ?? []).map((t) => ({
                      fecha: t.tx_date,
                      tipo: t.type,
                      categoria: t.category ?? "",
                      monto: t.amount,
                      descripcion: t.description ?? "",
                    })),
                  )
                }
              >
                <Download className="mr-1.5 h-4 w-4" /> CSV
              </Button>
              <Button variant="outline" onClick={exportPdf} disabled={!tx || tx.length === 0}>
                <FileDown className="mr-1.5 h-4 w-4" /> Reporte PDF
              </Button>
              {canWrite && (
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-1.5 h-4 w-4" />
                      Nuevo movimiento
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Registrar movimiento</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={onSubmit} className="space-y-4">
                      <div>
                        <Label htmlFor="type">Tipo</Label>
                        <select
                          id="type"
                          name="type"
                          required
                          value={txType}
                          onChange={(e) => {
                            const v = e.target.value as "income" | "expense";
                            setTxType(v);
                            setTxCategory(
                              v === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0],
                            );
                          }}
                          className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm"
                        >
                          <option value="income">Ingreso</option>
                          <option value="expense">Gasto</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="category">Categoría</Label>
                        <select
                          id="category"
                          value={txCategory}
                          onChange={(e) => setTxCategory(e.target.value)}
                          className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm"
                        >
                          {(txType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(
                            (c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ),
                          )}
                        </select>
                        {txCategory === "Otro" && (
                          <Input
                            className="mt-2"
                            placeholder="Especifica la categoría"
                            value={txCategoryOther}
                            onChange={(e) => setTxCategoryOther(e.target.value)}
                          />
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          Misma lista de categorías que usan las órdenes de compra, para que el
                          gráfico de gastos no se fragmente.
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="amount">Monto (CLP)</Label>
                        <Input id="amount" name="amount" type="number" min={0} required />
                      </div>
                      <div>
                        <Label htmlFor="description">Descripción</Label>
                        <Input id="description" name="description" />
                      </div>
                      <Button type="submit" className="w-full">
                        Guardar
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          }
        />

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-5">
            <div className="text-xs text-muted-foreground">Ingresos totales</div>
            <div className="mt-1 text-2xl font-bold text-success">{fmtCLP(income)}</div>
          </Card>
          <Card className="p-5">
            <div className="text-xs text-muted-foreground">Gastos totales</div>
            <div className="mt-1 text-2xl font-bold text-destructive">{fmtCLP(expense)}</div>
          </Card>
          <Card className="p-5">
            <div className="text-xs text-muted-foreground">Flujo neto</div>
            <div className="mt-1 text-2xl font-bold text-primary">{fmtCLP(income - expense)}</div>
          </Card>
        </div>

        {creditSales.length > 0 && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Card className="p-5">
              <div className="text-xs text-muted-foreground">Por cobrar (fiado)</div>
              <div className="mt-1 text-2xl font-bold text-warning">{fmtCLP(receivable)}</div>
            </Card>
            <Card className="p-5">
              <div className="text-xs text-muted-foreground">
                Vencido ({overdueSales.length} venta{overdueSales.length === 1 ? "" : "s"})
              </div>
              <div className="mt-1 text-2xl font-bold text-destructive">{fmtCLP(overdueTotal)}</div>
            </Card>
          </div>
        )}

        <Tabs defaultValue="ledger" className="mt-6">
          <TabsList>
            <TabsTrigger value="ledger">Movimientos</TabsTrigger>
            <TabsTrigger value="breakdown">Gastos por categoría</TabsTrigger>
            <TabsTrigger value="receivables">Por cobrar</TabsTrigger>
            <TabsTrigger value="payments">Cobros online</TabsTrigger>
            <TabsTrigger value="invoicing">Facturación</TabsTrigger>
          </TabsList>

          <TabsContent value="ledger">
            <Card>
              {isLoading ? (
                <div className="p-6 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !tx || tx.length === 0 ? (
                <EmptyState
                  icon={CreditCard}
                  title="Sin movimientos"
                  description="Registra tu primer ingreso o gasto."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tx.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-muted-foreground">
                          {new Date(t.tx_date).toLocaleDateString("es-CL")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              t.type === "income"
                                ? "bg-success/15 text-success"
                                : "bg-destructive/15 text-destructive"
                            }
                          >
                            {t.type === "income" ? "Ingreso" : "Gasto"}
                          </Badge>
                        </TableCell>
                        <TableCell>{t.category ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            {autoTxIds.has(t.id) && <Lock className="h-3 w-3 shrink-0" />}
                            {t.description ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${t.type === "income" ? "text-success" : "text-destructive"}`}
                        >
                          {fmtCLP(Number(t.amount))}
                        </TableCell>
                        <TableCell>
                          {canWrite && (
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(t)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="breakdown">
            <Card className="p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(RANGE_LABEL) as RangeKey[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setBreakdownRange(r);
                        setSelectedCategory(null);
                      }}
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        breakdownRange === r
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                      }`}
                    >
                      {RANGE_LABEL[r]}
                    </button>
                  ))}
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">
                    Total gastos ({RANGE_LABEL[breakdownRange]})
                  </div>
                  <div className="text-lg font-bold text-destructive">{fmtCLP(breakdownTotal)}</div>
                </div>
              </div>

              {pieData.length === 0 ? (
                <EmptyState
                  title="Sin datos para mostrar"
                  description="Registra gastos para ver la distribución en este período."
                />
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={110}
                        onClick={(d: any) =>
                          setSelectedCategory((prev) => (prev === d.name ? null : d.name))
                        }
                      >
                        {pieData.map((d, i) => (
                          <Cell
                            key={i}
                            fill={COLORS[i % COLORS.length]}
                            className="cursor-pointer"
                            opacity={selectedCategory && selectedCategory !== d.name ? 0.35 : 1}
                          />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmtCLP(v)} />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="space-y-1.5">
                    {pieData.map((d, i) => (
                      <button
                        key={d.name}
                        onClick={() =>
                          setSelectedCategory((prev) => (prev === d.name ? null : d.name))
                        }
                        className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                          selectedCategory === d.name
                            ? "border-primary bg-primary/5"
                            : "hover:bg-accent/50"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: COLORS[i % COLORS.length] }}
                          />
                          {d.name}
                        </span>
                        <span className="flex items-center gap-2 tabular-nums">
                          <span className="text-xs text-muted-foreground">{d.pct.toFixed(1)}%</span>
                          <span className="font-semibold">{fmtCLP(d.value)}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedCategory && (
                <div className="mt-6 border-t pt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Movimientos en "{selectedCategory}"</h4>
                    <button
                      className="text-xs text-muted-foreground underline"
                      onClick={() => setSelectedCategory(null)}
                    >
                      Quitar filtro
                    </button>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {breakdownTx
                        .filter((t) => (t.category ?? "Otro") === selectedCategory)
                        .map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="text-muted-foreground">
                              {new Date(t.tx_date).toLocaleDateString("es-CL")}
                            </TableCell>
                            <TableCell>{t.description ?? "—"}</TableCell>
                            <TableCell className="text-right font-medium text-destructive">
                              {fmtCLP(Number(t.amount))}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="receivables">
            <Card>
              {creditSales.length === 0 ? (
                <EmptyState
                  icon={CreditCard}
                  title="Sin ventas a crédito"
                  description="Marca una venta como 'fiado' en Ventas para hacerle seguimiento aquí."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Vence</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Pendiente</TableHead>
                      <TableHead className="text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditSales
                      .slice()
                      .sort(
                        (a: any, b: any) =>
                          new Date(a.due_date ?? 0).getTime() - new Date(b.due_date ?? 0).getTime(),
                      )
                      .map((s: any) => {
                        const pending = Number(s.total) - Number(s.paid_amount);
                        const isOverdue =
                          pending > 0 && s.due_date && new Date(s.due_date) < new Date();
                        const isPaid = pending <= 0;
                        return (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{s.customer_name ?? "—"}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {s.due_date ? new Date(s.due_date).toLocaleDateString("es-CL") : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  isPaid
                                    ? "bg-success/15 text-success"
                                    : isOverdue
                                      ? "bg-destructive/15 text-destructive"
                                      : "bg-warning/15 text-warning"
                                }
                              >
                                {isPaid ? "Pagada" : isOverdue ? "Vencida" : "Por cobrar"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {fmtCLP(pending)}
                            </TableCell>
                            <TableCell className="text-right">
                              {!isPaid && (
                                <ChargeOnlineButton
                                  saleId={s.id}
                                  amount={pending}
                                  subject={`Venta ${s.customer_name ?? ""}`}
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <PaymentsTabContent />
          </TabsContent>

          <TabsContent value="invoicing">
            <Card className="p-8">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                <div className="flex-1">
                  <h3 className="font-semibold">Facturación SII — modo asistido</h3>
                  <p className="text-sm text-muted-foreground">
                    Emite boletas y facturas gratis en el Portal MiPyme del SII y genera el
                    documento de declaración con tus ventas pendientes desde el módulo de
                    Facturación.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="mt-6">
                <Link to="/billing">Ir a Facturación SII</Link>
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </>
    </ModuleGuard>
  );
}

/** Botón por fila de "Por cobrar": crea un link de pago (Flow/VSB) para esa
 * venta y lo copia/abre. La confirmación real del pago SIEMPRE llega por el
 * webhook server-to-server (ver /api/billing/payments/webhook), nunca desde
 * este botón -- este solo genera el link para mandárselo al cliente. */
function ChargeOnlineButton({
  saleId,
  amount,
  subject,
}: {
  saleId: string;
  amount: number;
  subject: string;
}) {
  const { active } = useActiveBusiness();
  const [loading, setLoading] = useState(false);

  async function handleCharge() {
    if (!active) return;
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch("/api/billing/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ business_id: active.id, sale_id: saleId, amount, subject }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? "No se pudo generar el link de cobro");
        return;
      }
      await navigator.clipboard.writeText(json.payment_url).catch(() => {});
      toast.success("Link de cobro copiado al portapapeles");
      window.open(json.payment_url, "_blank");
    } catch {
      toast.error("Error de conexión con la pasarela de pago");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleCharge} disabled={loading}>
      <Link2 className="mr-1.5 h-3.5 w-3.5" />
      {loading ? "Generando..." : "Cobrar online"}
    </Button>
  );
}

/** Pestaña "Cobros online": conectar/desconectar Flow o VSB para poder
 * generar links de pago desde Ventas y desde "Por cobrar". */
function PaymentsTabContent() {
  const { active } = useActiveBusiness();
  const { data: myRole } = useMyRole();
  const canManage = canWriteOperations(myRole);
  const { data: integrations, refetch } = useBizList<any>("billing_integrations", {
    order: "created_at",
  });
  const activePayment = (integrations ?? []).find(
    (i: any) => i.type === "payment" && i.status === "connected",
  );

  const [provider, setProvider] = useState<"flow" | "vsb">("flow");
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [environment, setEnvironment] = useState<"dev" | "prod">("dev");
  const [saving, setSaving] = useState(false);

  async function connect() {
    if (!active) return;
    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch("/api/billing/payments/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          business_id: active.id,
          provider,
          api_key: apiKey,
          secret_key: secretKey,
          api_url: apiUrl,
          environment,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        toast.error(json.error ?? "No se pudo conectar la pasarela");
        return;
      }
      toast.success(`${provider === "flow" ? "Flow" : "VSB"} conectado`);
      setApiKey("");
      setSecretKey("");
      setApiUrl("");
      refetch();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    if (!active) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const res = await fetch("/api/billing/payments/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ business_id: active.id }),
    });
    const json = await res.json();
    if (json.ok) {
      toast.success("Pasarela desconectada");
      refetch();
    } else {
      toast.error(json.error ?? "No se pudo desconectar");
    }
  }

  return (
    <Card className="p-8">
      <div className="flex items-center gap-3">
        <Link2 className="h-6 w-6 text-primary" />
        <div className="flex-1">
          <h3 className="font-semibold">Cobros online</h3>
          <p className="text-sm text-muted-foreground">
            Genera links de pago para tus ventas a crédito o pendientes. La confirmación de cada
            pago se verifica directamente con el proveedor (nunca solo por el navegador del
            cliente), así que el estado que ves aquí siempre es real.
          </p>
        </div>
      </div>

      {activePayment ? (
        <div className="mt-6 flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="text-sm font-medium">
              Conectado: {activePayment.provider === "flow" ? "Flow" : "VSB"} ·{" "}
              <span className="text-muted-foreground">
                {activePayment.environment === "prod" ? "Producción" : "Pruebas (sandbox)"}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Usa el botón "Cobrar online" en Por cobrar / Ventas para generar links de pago.
            </p>
          </div>
          {canManage && (
            <Button variant="outline" size="sm" onClick={disconnect}>
              <Unplug className="mr-1.5 h-3.5 w-3.5" />
              Desconectar
            </Button>
          )}
        </div>
      ) : canManage ? (
        <div className="mt-6 space-y-4">
          <div>
            <Label>Pasarela</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v as "flow" | "vsb")}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flow">Flow</SelectItem>
                <SelectItem value="vsb">VSB</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>API Key</Label>
            <Input className="mt-1" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
          </div>
          {provider === "flow" ? (
            <div>
              <Label>Secret Key</Label>
              <Input
                className="mt-1"
                type="password"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
              />
            </div>
          ) : (
            <div>
              <Label>URL base de VSB</Label>
              <Input
                className="mt-1"
                placeholder="https://api.vsb.cl"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
              />
            </div>
          )}
          <div>
            <Label>Ambiente</Label>
            <Select value={environment} onValueChange={(v) => setEnvironment(v as "dev" | "prod")}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dev">Pruebas (sandbox)</SelectItem>
                <SelectItem value="prod">Producción</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={connect} disabled={saving || !apiKey}>
            {saving ? "Conectando..." : "Conectar pasarela"}
          </Button>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          Solo el dueño o un administrador puede conectar una pasarela de pago.
        </p>
      )}
    </Card>
  );
}
