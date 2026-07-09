import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, EmptyState, ComingSoonBadge } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, CreditCard, FileText, Lock, Download, FileDown } from "lucide-react";
import { useBizList, useBizInsert, useBizDelete, fmtCLP } from "@/lib/biz-data";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "sonner";
import { downloadCsv } from "@/lib/export";
import { generateMonthlyReportPdf } from "@/lib/monthly-report";
import { useActiveBusiness } from "@/lib/use-business";

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => ({ meta: [{ title: "Finanzas — Nüva One" }] }),
  component: Finance,
});

function Finance() {
  const { active } = useActiveBusiness();
  const { data: tx, isLoading } = useBizList<any>("transactions", { order: "tx_date" });
  const { data: sales } = useBizList<any>("sales");
  const { data: purchases } = useBizList<any>("purchases");
  const insert = useBizInsert("transactions");
  const del = useBizDelete("transactions");
  const [open, setOpen] = useState(false);

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
      toast.error("Este movimiento se generó automáticamente desde una venta o compra. Cancela o elimina el registro original en Ventas/Compras en su lugar.");
      return;
    }
    del.mutate(t.id);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await insert.mutateAsync({
      type: fd.get("type"),
      category: fd.get("category"),
      amount: Number(fd.get("amount")),
      description: fd.get("description"),
    });
    setOpen(false);
  }

  const income = (tx ?? []).filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = (tx ?? []).filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);

  // Pie of expense categories
  const expByCat: Record<string, number> = {};
  (tx ?? []).filter((t) => t.type === "expense").forEach((t) => {
    expByCat[t.category ?? "Otros"] = (expByCat[t.category ?? "Otros"] ?? 0) + Number(t.amount);
  });
  const pieData = Object.entries(expByCat).map(([name, value]) => ({ name, value }));
  const COLORS = ["oklch(0.55 0.22 268)", "oklch(0.6 0.22 25)", "oklch(0.75 0.17 70)", "oklch(0.65 0.17 155)", "oklch(0.5 0.15 320)"];

  return (
    <>
      <PageHeader title="Finanzas" description="Ingresos, gastos y flujo de caja" action={
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
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-1.5 h-4 w-4" />Nuevo movimiento</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar movimiento</DialogTitle></DialogHeader>
              <form onSubmit={onSubmit} className="space-y-4">
                <div><Label>Tipo</Label>
                  <select name="type" required className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm">
                    <option value="income">Ingreso</option><option value="expense">Gasto</option>
                  </select>
                </div>
                <div><Label htmlFor="category">Categoría</Label><Input id="category" name="category" placeholder="Ej: Ventas, Arriendo, Sueldos" /></div>
                <div><Label htmlFor="amount">Monto (CLP)</Label><Input id="amount" name="amount" type="number" min={0} required /></div>
                <div><Label htmlFor="description">Descripción</Label><Input id="description" name="description" /></div>
                <Button type="submit" className="w-full">Guardar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      } />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5"><div className="text-xs text-muted-foreground">Ingresos totales</div><div className="mt-1 text-2xl font-bold text-success">{fmtCLP(income)}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground">Gastos totales</div><div className="mt-1 text-2xl font-bold text-destructive">{fmtCLP(expense)}</div></Card>
        <Card className="p-5"><div className="text-xs text-muted-foreground">Flujo neto</div><div className="mt-1 text-2xl font-bold text-primary">{fmtCLP(income - expense)}</div></Card>
      </div>

      <Tabs defaultValue="ledger" className="mt-6">
        <TabsList>
          <TabsTrigger value="ledger">Movimientos</TabsTrigger>
          <TabsTrigger value="breakdown">Gastos por categoría</TabsTrigger>
          <TabsTrigger value="invoicing">Facturación</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger">
          <Card>
            {isLoading ? <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              : !tx || tx.length === 0 ? <EmptyState icon={CreditCard} title="Sin movimientos" description="Registra tu primer ingreso o gasto." />
              : <Table>
                <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Tipo</TableHead><TableHead>Categoría</TableHead><TableHead>Descripción</TableHead><TableHead className="text-right">Monto</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>
                  {tx.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-muted-foreground">{new Date(t.tx_date).toLocaleDateString("es-CL")}</TableCell>
                      <TableCell><Badge className={t.type === "income" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}>{t.type === "income" ? "Ingreso" : "Gasto"}</Badge></TableCell>
                      <TableCell>{t.category ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          {autoTxIds.has(t.id) && <Lock className="h-3 w-3 shrink-0" />}
                          {t.description ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${t.type === "income" ? "text-success" : "text-destructive"}`}>{fmtCLP(Number(t.amount))}</TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => handleDelete(t)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            }
          </Card>
        </TabsContent>

        <TabsContent value="breakdown">
          <Card className="p-6">
            {pieData.length === 0 ? <EmptyState title="Sin datos para mostrar" description="Registra gastos para ver la distribución." />
              : <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={120} label>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtCLP(v)} />
                </PieChart>
              </ResponsiveContainer>
            }
          </Card>
        </TabsContent>

        <TabsContent value="invoicing">
          <Card className="p-8">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-primary" />
              <div className="flex-1">
                <h3 className="font-semibold">Facturación electrónica SII</h3>
                <p className="text-sm text-muted-foreground">Conecta tu certificado digital para emitir DTE (Documentos Tributarios Electrónicos).</p>
              </div>
              <ComingSoonBadge />
            </div>
            <Button variant="outline" className="mt-6" disabled>Conectar SII</Button>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
