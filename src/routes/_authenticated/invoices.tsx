import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, ReceiptText, Wallet, CircleCheck, Clock3, ArrowRight, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/page-utils";
import { ModuleGuard } from "@/components/module-guard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBizList, fmtCLP } from "@/lib/biz-data";
import { useActiveBusiness, useMyRole, canWriteOperations } from "@/lib/use-business";

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({ meta: [{ title: "Documentos de cobro — Nüva One" }] }),
  component: Invoices,
});

const labels: Record<string, string> = {
  draft: "Borrador",
  issued: "Emitida · interna",
  partially_paid: "Abono parcial",
  paid: "Pagada",
  overdue: "Vencida",
  voided: "Anulada",
};

function localDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function Invoices() {
  const { active } = useActiveBusiness();
  const { data: role } = useMyRole();
  const canWrite = canWriteOperations(role);
  const qc = useQueryClient();
  const { data: invoices = [], isLoading, isError } = useBizList<any>("invoices", { order: "created_at", ascending: false });
  const { data: payments = [] } = useBizList<any>("invoice_payments", { order: "confirmed_at", ascending: false });
  const { data: quotes = [] } = useBizList<any>("quotes", { order: "created_at", ascending: false });

  const [paymentInvoice, setPaymentInvoice] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("transferencia");
  const [paymentReference, setPaymentReference] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");

  const paidByInvoice = useMemo(() => {
    const map = new Map<string, number>();
    for (const payment of payments) {
      if (payment.status !== "confirmed") continue;
      map.set(payment.invoice_id, (map.get(payment.invoice_id) ?? 0) + Number(payment.amount ?? 0));
    }
    return map;
  }, [payments]);

  const convertedQuoteIds = useMemo(
    () => new Set(invoices.map((invoice: any) => invoice.quote_id).filter(Boolean)),
    [invoices],
  );

  const acceptedQuotes = useMemo(
    () => quotes.filter((quote: any) => quote.status === "accepted" && quote.price_basis && !convertedQuoteIds.has(quote.id)),
    [quotes, convertedQuoteIds],
  );

  const totals = useMemo(() => ({
    issued: invoices.filter((i: any) => ["issued", "partially_paid", "overdue"].includes(i.status)).reduce((s: number, i: any) => s + Number(i.total ?? 0), 0),
    collected: invoices.reduce((s: number, i: any) => s + (paidByInvoice.get(i.id) ?? 0), 0),
    pending: invoices.reduce((s: number, i: any) => s + Math.max(0, Number(i.total ?? 0) - (paidByInvoice.get(i.id) ?? 0)), 0),
  }), [invoices, paidByInvoice]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["invoices", active?.id] });
    qc.invalidateQueries({ queryKey: ["invoice_payments", active?.id] });
    qc.invalidateQueries({ queryKey: ["transactions", active?.id] });
  };

  const convert = useMutation({
    mutationFn: async (quoteId: string) => {
      const { data, error } = await supabase.rpc("convert_accepted_quote_to_invoice", { p_quote_id: quoteId });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      refresh();
      toast.success("Cotización convertida en documento de cobro en borrador.");
    },
    onError: (error: any) => toast.error(error?.message ?? "No se pudo convertir la cotización."),
  });

  const issue = useMutation({
    mutationFn: async ({ invoiceId, dueDate }: { invoiceId: string; dueDate: string }) => {
      const { error } = await supabase.rpc("issue_internal_invoice", {
        p_invoice_id: invoiceId,
        p_due_date: dueDate || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      toast.success("Documento interno emitido. No es un DTE del SII.");
    },
    onError: (error: any) => toast.error(error?.message ?? "No se pudo emitir el documento."),
  });

  const recordPayment = useMutation({
    mutationFn: async () => {
      if (!paymentInvoice) throw new Error("Selecciona un documento");
      const amount = Number(paymentAmount);
      const outstanding = Math.max(0, Number(paymentInvoice.total) - (paidByInvoice.get(paymentInvoice.id) ?? 0));
      if (!Number.isSafeInteger(amount) || amount <= 0 || amount > outstanding) {
        throw new Error("Ingresa un abono en pesos enteros que no supere el saldo pendiente.");
      }
      const { data, error } = await supabase.rpc("record_internal_invoice_payment", {
        p_invoice_id: paymentInvoice.id,
        p_amount: amount,
        p_payment_method: paymentMethod,
        p_payment_reference: paymentReference || null,
        p_idempotency_key: idempotencyKey,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refresh();
      setPaymentInvoice(null);
      setPaymentAmount("");
      setPaymentReference("");
      setIdempotencyKey("");
      toast.success("Abono registrado y reflejado en los ingresos de caja.");
    },
    onError: (error: any) => toast.error(error?.message ?? "No se pudo registrar el abono."),
  });

  function openPayment(invoice: any) {
    const outstanding = Math.max(0, Number(invoice.total) - (paidByInvoice.get(invoice.id) ?? 0));
    setPaymentInvoice(invoice);
    setPaymentAmount(String(Math.round(outstanding)));
    setPaymentMethod("transferencia");
    setPaymentReference("");
    setIdempotencyKey(`manual-${invoice.id}-${crypto.randomUUID()}`);
  }

  const today = localDate(new Date());

  return (
    <ModuleGuard module="quotes">
      <>
        <PageHeader
          title="Documentos de cobro"
          description="Convierte cotizaciones aceptadas en documentos internos, emite vencimientos y registra abonos con trazabilidad."
          action={
            <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
              <ReceiptText className="h-3.5 w-3.5" /> Gestión documental
            </Badge>
          }
        />

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><FileText className="h-4 w-4" /> Documentos emitidos</div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">{fmtCLP(totals.issued)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Monto total de documentos emitidos, no necesariamente cobrado</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><CircleCheck className="h-4 w-4" /> Cobros registrados</div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">{fmtCLP(totals.collected)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Abonos manuales confirmados</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet className="h-4 w-4" /> Saldo por cobrar</div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">{fmtCLP(totals.pending)}</div>
            <p className="mt-1 text-xs text-muted-foreground">Total menos abonos confirmados</p>
          </Card>
        </div>

        <Card className="mb-5 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Cotizaciones aceptadas</h2>
              <p className="text-sm text-muted-foreground">Prepara un documento interno de cobro conservando los importes y datos de la propuesta aceptada.</p>
            </div>
            <Badge variant="secondary">{acceptedQuotes.length} disponibles</Badge>
          </div>
          {acceptedQuotes.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No hay cotizaciones aceptadas pendientes de convertir.</p>
          ) : (
            <div className="space-y-2">
              {acceptedQuotes.map((quote: any) => (
                <div key={quote.id} className="flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{quote.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{quote.quote_number ? `COT-${String(quote.quote_number).padStart(4, "0")}` : "Cotización"}{quote.subject ? ` · ${quote.subject}` : ""}</div>
                  </div>
                  <div className="font-semibold tabular-nums">{fmtCLP(Number(quote.total))}</div>
                  <Button size="sm" disabled={!canWrite || convert.isPending} onClick={() => convert.mutate(quote.id)}>
                    <ArrowRight className="mr-1.5 h-4 w-4" /> Convertir a cobro
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="border-b p-4">
            <h2 className="font-semibold">Documentos de cobro</h2>
            <p className="text-sm text-muted-foreground">Numeración correlativa por negocio · CLP · historial de pagos</p>
          </div>
          {isLoading ? (
            <div className="space-y-3 p-5"><div className="h-10 animate-pulse rounded bg-muted" /><div className="h-10 animate-pulse rounded bg-muted" /><div className="h-10 animate-pulse rounded bg-muted" /></div>
          ) : isError ? (
            <div role="alert" className="p-6 text-sm text-destructive">No se pudieron cargar los documentos. Comprueba que la migración de Nüva Documents esté aplicada en el entorno.</div>
          ) : invoices.length === 0 ? (
            <EmptyState icon={ReceiptText} title="Todavía no hay documentos de cobro" description="Convierte una cotización aceptada para crear el primer borrador." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-sm">
                <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="p-3">Documento</th><th className="p-3">Cliente</th><th className="p-3">Vencimiento</th><th className="p-3">Estado</th><th className="p-3 text-right">Total</th><th className="p-3 text-right">Abonado</th><th className="p-3 text-right">Saldo</th><th className="p-3 text-right">Acciones</th></tr></thead>
                <tbody>
                  {invoices.map((invoice: any) => {
                    const paid = paidByInvoice.get(invoice.id) ?? 0;
                    const outstanding = Math.max(0, Number(invoice.total) - paid);
                    const overdue = invoice.due_date && invoice.due_date < today && outstanding > 0 && ["issued", "partially_paid"].includes(invoice.status);
                    const status = overdue ? "overdue" : invoice.status;
                    return (
                      <tr key={invoice.id} className="border-b last:border-0">
                        <td className="p-3 font-mono text-xs">FAC-{String(invoice.invoice_number).padStart(6, "0")}<div className="mt-1 font-sans text-[10px] text-muted-foreground">Documento interno · no DTE</div></td>
                        <td className="p-3 font-medium">{invoice.customer_name}</td>
                        <td className="p-3 text-muted-foreground">{invoice.due_date ? new Date(`${invoice.due_date}T12:00:00`).toLocaleDateString("es-CL") : "—"}</td>
                        <td className="p-3"><Badge variant={status === "paid" ? "default" : status === "overdue" ? "destructive" : "secondary"}>{labels[status] ?? status}</Badge></td>
                        <td className="p-3 text-right tabular-nums">{fmtCLP(Number(invoice.total))}</td>
                        <td className="p-3 text-right tabular-nums">{fmtCLP(paid)}</td>
                        <td className="p-3 text-right font-semibold tabular-nums">{fmtCLP(outstanding)}</td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-1">
                            {invoice.status === "draft" && canWrite && <Button size="sm" variant="outline" disabled={issue.isPending} onClick={() => issue.mutate({ invoiceId: invoice.id, dueDate: localDate(new Date(Date.now() + 15 * 86400000)) })}>Emitir</Button>}
                            {["issued", "partially_paid", "overdue"].includes(status) && canWrite && outstanding > 0 && <Button size="sm" variant="outline" onClick={() => openPayment(invoice)}>Registrar abono</Button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Dialog open={!!paymentInvoice} onOpenChange={(open) => { if (!open && !recordPayment.isPending) setPaymentInvoice(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Registrar abono</DialogTitle></DialogHeader>
            {paymentInvoice && (
              <div className="space-y-4">
                <div className="rounded-xl bg-muted/50 p-3">
                  <div className="text-sm font-medium">{paymentInvoice.customer_name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">FAC-{String(paymentInvoice.invoice_number).padStart(6, "0")}</div>
                  <div className="mt-2 text-sm">Saldo pendiente: <strong>{fmtCLP(Math.max(0, Number(paymentInvoice.total) - (paidByInvoice.get(paymentInvoice.id) ?? 0)))}</strong></div>
                </div>
                <div><Label htmlFor="invoice-payment-amount">Monto recibido (CLP)</Label><Input id="invoice-payment-amount" type="number" min="1" step="1" inputMode="numeric" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} /></div>
                <div><Label htmlFor="invoice-payment-method">Medio de pago</Label><select id="invoice-payment-method" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option><option value="cheque">Cheque</option><option value="otro">Otro</option></select></div>
                <div><Label htmlFor="invoice-payment-reference">Referencia / comprobante (opcional)</Label><Input id="invoice-payment-reference" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="N° de operación o referencia" /></div>
                <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setPaymentInvoice(null)} disabled={recordPayment.isPending}>Cancelar</Button><Button onClick={() => recordPayment.mutate()} disabled={recordPayment.isPending}>{recordPayment.isPending ? "Registrando…" : "Confirmar abono"}</Button></div>
                <p className="text-xs text-muted-foreground">Al confirmar, se registra un ingreso en el flujo de caja de Nüva One. Solo úsalo cuando el dinero haya sido efectivamente recibido.</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    </ModuleGuard>
  );
}
