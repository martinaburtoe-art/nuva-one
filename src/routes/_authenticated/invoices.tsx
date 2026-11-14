import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, ReceiptText, Wallet, CircleCheck, ArrowRight, Download, Eye, History, Palette, Save, Plus, Trash2 } from "lucide-react";
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
import { calculateQuoteTotals } from "@/lib/quote-calculations";
import { useDocumentTemplate } from "@/lib/use-document-template";
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
  const canManageTemplates = role === "owner" || role === "admin";
  const qc = useQueryClient();
  const { data: invoices = [], isLoading, isError } = useBizList<any>("invoices", { order: "created_at", ascending: false });
  const { data: payments = [] } = useBizList<any>("invoice_payments", { order: "confirmed_at", ascending: false });
  const { data: quotes = [] } = useBizList<any>("quotes", { order: "created_at", ascending: false });
  const { data: customers = [] } = useBizList<any>("customers", { order: "name", ascending: true });
  const { data: sales = [] } = useBizList<any>("sales");
  const { data: invoiceEvents = [] } = useBizList<any>("invoice_events", { order: "created_at", ascending: false });
  const { data: defaultTemplate = null } = useDocumentTemplate();

  const [paymentInvoice, setPaymentInvoice] = useState<any>(null);
  const [detailInvoice, setDetailInvoice] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("transferencia");
  const [paymentReference, setPaymentReference] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualCustomerName, setManualCustomerName] = useState("");
  const [manualCustomerId, setManualCustomerId] = useState<string | null>(null);
  const [manualCustomerSnapshot, setManualCustomerSnapshot] = useState<any>({});
  const [manualSubject, setManualSubject] = useState("");
  const [manualItems, setManualItems] = useState([{ name: "", qty: 1, price: 0 }]);
  const [manualTaxTreatment, setManualTaxTreatment] = useState<"taxable" | "exempt" | "non_taxable">("taxable");
  const [manualPriceBasis, setManualPriceBasis] = useState<"net" | "gross">("net");
  const [manualDiscountPct, setManualDiscountPct] = useState(0);
  const [manualTerms, setManualTerms] = useState("Pago según condiciones acordadas con el cliente.");
  const [manualNotes, setManualNotes] = useState("");
  const [templateName, setTemplateName] = useState("Plantilla principal");
  const [templateBrandColor, setTemplateBrandColor] = useState("#182741");
  const [templateShowLogo, setTemplateShowLogo] = useState(true);
  const [templateShowTaxId, setTemplateShowTaxId] = useState(true);
  const [templateFooterNote, setTemplateFooterNote] = useState("");

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

  const soldQuoteIds = useMemo(() => new Set(sales.map((sale: any) => sale.quote_id).filter(Boolean)), [sales]);

  const acceptedQuotes = useMemo(
    () => quotes.filter((quote: any) => quote.status === "accepted" && quote.price_basis && !convertedQuoteIds.has(quote.id) && !soldQuoteIds.has(quote.id)),
    [quotes, convertedQuoteIds, soldQuoteIds],
  );

  const totals = useMemo(() => ({
    issued: invoices.filter((i: any) => Boolean(i.issued_at) && i.status !== "voided").reduce((s: number, i: any) => s + Number(i.total ?? 0), 0),
    collected: invoices.reduce((s: number, i: any) => s + (paidByInvoice.get(i.id) ?? 0), 0),
    pending: invoices.filter((i: any) => ["issued", "partially_paid", "overdue"].includes(i.status)).reduce((s: number, i: any) => s + Math.max(0, Number(i.total ?? 0) - (paidByInvoice.get(i.id) ?? 0)), 0),
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
        p_due_date: dueDate || undefined,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      toast.success("Documento interno emitido. No es un DTE del SII.");
    },
    onError: (error: any) => toast.error(error?.message ?? "No se pudo emitir el documento."),
  });

  const saveTemplate = useMutation({
    mutationFn: async () => {
      if (!active?.id) throw new Error("No hay un negocio activo.");
      if (!canManageTemplates) throw new Error("Solo owner y admin pueden modificar las plantillas.");
      const name = templateName.trim();
      if (!name || name.length > 80) throw new Error("El nombre debe tener entre 1 y 80 caracteres.");
      if (!/^#[0-9a-fA-F]{6}$/.test(templateBrandColor)) throw new Error("Selecciona un color de marca válido.");
      const payload = {
        business_id: active.id,
        name,
        document_kind: "all",
        is_default: true,
        design: {
          brandColor: templateBrandColor.toUpperCase(),
          showLogo: templateShowLogo,
          showTaxId: templateShowTaxId,
          footerNote: templateFooterNote.trim().slice(0, 64),
        },
      };
      const query = supabase.from("document_templates" as any);
      const result = defaultTemplate?.id
        ? await query.update(payload).eq("id", defaultTemplate.id).select().single()
        : await query.insert(payload).select().single();
      if (result.error) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document_templates", active?.id] });
      setTemplateDialogOpen(false);
      toast.success("Plantilla guardada. Se aplicará a cotizaciones y documentos nuevos.");
    },
    onError: (error: any) => toast.error(error?.message ?? "No se pudo guardar la plantilla."),
  });

  const manualTotals = useMemo(() => {
    try {
      const validItems = manualItems.filter((item) => item.name.trim());
      return validItems.length
        ? calculateQuoteTotals(validItems, manualDiscountPct, manualTaxTreatment, 19, manualPriceBasis)
        : null;
    } catch {
      return null;
    }
  }, [manualItems, manualDiscountPct, manualTaxTreatment, manualPriceBasis]);

  const createManualInvoice = useMutation({
    mutationFn: async () => {
      if (!active?.id) throw new Error("No hay un negocio activo.");
      if (!canWrite) throw new Error("No tienes permisos para crear documentos.");
      const validItems = manualItems.filter((item) => item.name.trim());
      if (!manualCustomerName.trim()) throw new Error("Indica el nombre del cliente.");
      if (!validItems.length) throw new Error("Agrega al menos un producto o servicio.");
      const totals = calculateQuoteTotals(validItems, manualDiscountPct, manualTaxTreatment, 19, manualPriceBasis);
      if (totals.total <= 0) throw new Error("El total debe ser mayor que cero.");
      const { data, error } = await supabase.rpc("create_manual_internal_invoice" as any, {
        p_business_id: active.id,
        p_payload: {
          customer_id: manualCustomerId,
          customer_name: manualCustomerName.trim(),
          customer_snapshot: { ...manualCustomerSnapshot, name: manualCustomerName.trim() },
          subject: manualSubject.trim() || null,
          items: validItems,
          tax_treatment: manualTaxTreatment,
          price_basis: manualPriceBasis,
          vat_rate: 19,
          discount_pct: manualDiscountPct,
          terms: manualTerms.trim() || null,
          notes: manualNotes.trim() || null,
        },
      } as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refresh();
      setManualDialogOpen(false);
      setManualCustomerName("");
      setManualCustomerId(null);
      setManualCustomerSnapshot({});
      setManualSubject("");
      setManualItems([{ name: "", qty: 1, price: 0 }]);
      setManualDiscountPct(0);
      setManualNotes("");
      toast.success("Documento de cobro creado en borrador.");
    },
    onError: (error: any) => toast.error(error?.message ?? "No se pudo crear el documento."),
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
        p_payment_reference: paymentReference,
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
      toast.success("Abono registrado y reflejado en el flujo de caja.");
    },
    onError: (error: any) => toast.error(error?.message ?? "No se pudo registrar el abono."),
  });

  async function downloadInvoice(invoice: any) {
    try {
      const { generateInvoicePdf } = await import("@/lib/quote-pdf");
      const customer = invoice.customer_snapshot ?? { name: invoice.customer_name };
      const design = defaultTemplate?.design ?? {};
      const pdfBusiness = {
        ...(invoice.issuer_snapshot ?? { name: active?.name }),
        logo_url: design.showLogo === false ? null : (invoice.issuer_snapshot?.logo_url ?? active?.logo_url ?? null),
        tax_id: design.showTaxId === false ? null : (invoice.issuer_snapshot?.tax_id ?? null),
      };
      await generateInvoicePdf({
        quote_number: Number(invoice.invoice_number),
        customer_name: invoice.customer_name,
        customer_snapshot: customer,
        items: Array.isArray(invoice.items_snapshot) ? invoice.items_snapshot : [],
        subtotal: Number(invoice.subtotal),
        tax: Number(invoice.tax_amount),
        discount_pct: Number(invoice.subtotal) > 0
          ? (Number(invoice.discount_amount) / Number(invoice.subtotal)) * 100
          : 0,
        discount_amount: Number(invoice.discount_amount),
        total: Number(invoice.total),
        tax_treatment: invoice.tax_treatment,
        price_basis: invoice.price_basis,
        vat_rate: Number(invoice.vat_rate),
        created_at: invoice.issued_at ?? invoice.created_at,
        valid_until: invoice.due_date,
        notes: invoice.notes,
        terms: invoice.terms,
        subject: invoice.subject,
      } as any, pdfBusiness, customer, Number(invoice.invoice_number), invoice.due_date, {
        brandColor: design.brandColor,
        showLogo: design.showLogo !== false,
        showTaxId: design.showTaxId !== false,
        footerNote: design.footerNote,
        paidAmount: paidByInvoice.get(invoice.id) ?? 0,
        balanceDue: ["draft", "voided"].includes(invoice.status)
          ? 0
          : Math.max(0, Number(invoice.total) - (paidByInvoice.get(invoice.id) ?? 0)),
        documentStatus: invoice.status,
      });
    } catch (error: any) {
      toast.error(error?.message ?? "No se pudo generar el PDF del documento.");
    }
  }

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
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => setManualDialogOpen(true)} disabled={!canWrite}>
                <Plus className="mr-1.5 h-4 w-4" /> Nuevo documento
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const design = defaultTemplate?.design ?? {};
                  setTemplateName(defaultTemplate?.name ?? "Plantilla principal");
                  setTemplateBrandColor(/^#[0-9a-fA-F]{6}$/.test(design.brandColor ?? "") ? design.brandColor : "#182741");
                  setTemplateShowLogo(design.showLogo !== false);
                  setTemplateShowTaxId(design.showTaxId !== false);
                  setTemplateFooterNote(design.footerNote ?? "");
                  setTemplateDialogOpen(true);
                }}
              >
                <Palette className="mr-1.5 h-4 w-4" /> Plantillas
              </Button>
              <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
                <ReceiptText className="h-3.5 w-3.5" /> Gestión documental
              </Badge>
            </div>
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
                            <Button size="sm" variant="ghost" onClick={() => setDetailInvoice(invoice)} title="Ver detalle"><Eye className="h-4 w-4" /></Button>
                            {invoice.status === "draft" && canWrite && <Button size="sm" variant="outline" disabled={issue.isPending} onClick={() => issue.mutate({ invoiceId: invoice.id, dueDate: localDate(new Date(Date.now() + 15 * 86400000)) })}>Emitir</Button>}
                            <Button size="sm" variant="ghost" onClick={() => void downloadInvoice(invoice)} title="Descargar PDF"><Download className="h-4 w-4" /></Button>
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

        <Dialog open={manualDialogOpen} onOpenChange={(open) => { if (!createManualInvoice.isPending) setManualDialogOpen(open); }}>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nuevo documento interno de cobro</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Crea un documento directamente desde el cliente y sus líneas, sin cotización previa. Se guardará como borrador; no emite un DTE ni una factura tributaria del SII.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="manual-invoice-customer">Cliente existente (opcional)</Label>
                  <select id="manual-invoice-customer" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={manualCustomerId ?? "__none__"} onChange={(event) => {
                    const id = event.target.value === "__none__" ? null : event.target.value;
                    const customer = customers.find((entry: any) => entry.id === id);
                    setManualCustomerId(id);
                    if (customer) {
                      setManualCustomerName(customer.name ?? "");
                      setManualCustomerSnapshot({ tax_id: customer.tax_id ?? "", address: customer.address ?? "", email: customer.email ?? "", phone: customer.phone ?? "", contact_name: customer.shipping_contact_name ?? "" });
                    } else setManualCustomerSnapshot({});
                  }}>
                    <option value="__none__">Escribir cliente manualmente</option>
                    {customers.map((customer: any) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label htmlFor="manual-invoice-customer-name">Nombre del cliente</Label>
                  <Input id="manual-invoice-customer-name" maxLength={180} value={manualCustomerName} onChange={(event) => { setManualCustomerName(event.target.value); if (manualCustomerId) { setManualCustomerId(null); setManualCustomerSnapshot({}); } }} placeholder="Empresa o persona" />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="manual-invoice-subject">Concepto / asunto (opcional)</Label>
                  <Input id="manual-invoice-subject" value={manualSubject} onChange={(event) => setManualSubject(event.target.value)} placeholder="Servicios profesionales de noviembre" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Productos y servicios</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => setManualItems((items) => [...items, { name: "", qty: 1, price: 0 }])} disabled={manualItems.length >= 100}><Plus className="mr-1 h-3.5 w-3.5" /> Agregar línea</Button>
                </div>
                {manualItems.map((item, index) => <div key={index} className="grid grid-cols-12 gap-2 rounded-lg border p-2">
                  <div className="col-span-12 sm:col-span-6"><Label htmlFor={`manual-item-name-${index}`}>Descripción</Label><Input id={`manual-item-name-${index}`} maxLength={240} value={item.name} onChange={(event) => setManualItems((items) => items.map((line, i) => i === index ? { ...line, name: event.target.value } : line))} placeholder="Producto o servicio" /></div>
                  <div className="col-span-4 sm:col-span-2"><Label htmlFor={`manual-item-qty-${index}`}>Cantidad</Label><Input id={`manual-item-qty-${index}`} type="number" min="0.01" step="0.01" value={item.qty} onChange={(event) => setManualItems((items) => items.map((line, i) => i === index ? { ...line, qty: Number(event.target.value) } : line))} /></div>
                  <div className="col-span-6 sm:col-span-3"><Label htmlFor={`manual-item-price-${index}`}>Precio CLP</Label><Input id={`manual-item-price-${index}`} type="number" min="0" step="1" value={item.price} onChange={(event) => setManualItems((items) => items.map((line, i) => i === index ? { ...line, price: Number(event.target.value) } : line))} /></div>
                  <div className="col-span-2 flex items-end"><Button type="button" size="icon" variant="ghost" aria-label="Eliminar línea" disabled={manualItems.length === 1} onClick={() => setManualItems((items) => items.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button></div>
                </div>)}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div><Label htmlFor="manual-price-basis">Modalidad de precios</Label><select id="manual-price-basis" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={manualPriceBasis} onChange={(event) => setManualPriceBasis(event.target.value as "net" | "gross")}><option value="net">Precios netos</option><option value="gross">Precios brutos (IVA incluido)</option></select></div>
                <div><Label htmlFor="manual-tax-treatment">Tratamiento tributario</Label><select id="manual-tax-treatment" className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={manualTaxTreatment} onChange={(event) => setManualTaxTreatment(event.target.value as "taxable" | "exempt" | "non_taxable")}><option value="taxable">Afecto a IVA (19%)</option><option value="exempt">Exento</option><option value="non_taxable">No afecto</option></select></div>
                <div><Label htmlFor="manual-discount">Descuento (%)</Label><Input id="manual-discount" type="number" min="0" max="100" value={manualDiscountPct} onChange={(event) => setManualDiscountPct(Math.min(100, Math.max(0, Number(event.target.value) || 0)))} /></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label htmlFor="manual-invoice-terms">Condiciones de pago</Label><Input id="manual-invoice-terms" value={manualTerms} onChange={(event) => setManualTerms(event.target.value)} /></div>
                <div><Label htmlFor="manual-invoice-notes">Notas (opcional)</Label><Input id="manual-invoice-notes" value={manualNotes} onChange={(event) => setManualNotes(event.target.value)} /></div>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                {manualTotals ? <div className="ml-auto max-w-xs space-y-1 text-sm">
                  <div className="flex justify-between"><span>Subtotal neto</span><span>{fmtCLP(manualTotals.subtotal)}</span></div>
                  <div className="flex justify-between"><span>Descuento</span><span>-{fmtCLP(manualTotals.discountAmount)}</span></div>
                  <div className="flex justify-between"><span>{manualTaxTreatment === "taxable" ? "IVA (19%)" : manualTaxTreatment === "exempt" ? "Exento" : "No afecto"}</span><span>{fmtCLP(manualTotals.tax)}</span></div>
                  <div className="flex justify-between border-t pt-2 text-base font-semibold"><span>Total CLP</span><span>{fmtCLP(manualTotals.total)}</span></div>
                </div> : <p className="text-sm text-muted-foreground">Completa el cliente y al menos una línea con importe válido para calcular el total.</p>}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setManualDialogOpen(false)} disabled={createManualInvoice.isPending}>Cancelar</Button>
                <Button onClick={() => createManualInvoice.mutate()} disabled={!canWrite || createManualInvoice.isPending || !manualTotals || !manualCustomerName.trim()}>
                  {createManualInvoice.isPending ? "Creando…" : "Crear borrador"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Plantilla de documentos</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Personaliza la presentación de cotizaciones y documentos internos en PDF. Estos ajustes no cambian impuestos, totales ni validez tributaria.</p>
              <div>
                <Label htmlFor="document-template-name">Nombre de la plantilla</Label>
                <Input id="document-template-name" value={templateName} maxLength={80} onChange={(event) => setTemplateName(event.target.value)} />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div><Label htmlFor="document-template-color">Color principal</Label><p className="text-xs text-muted-foreground">Se usa en encabezados y elementos de marca</p></div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">{templateBrandColor.toUpperCase()}</span>
                  <input id="document-template-color" aria-label="Color principal de documentos" type="color" className="h-10 w-12 cursor-pointer rounded border bg-background p-1" value={templateBrandColor} onChange={(event) => setTemplateBrandColor(event.target.value)} />
                </div>
              </div>
              <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                <span><span className="font-medium">Mostrar logotipo</span><span className="block text-xs text-muted-foreground">Usa el logo configurado en el negocio</span></span>
                <input type="checkbox" checked={templateShowLogo} onChange={(event) => setTemplateShowLogo(event.target.checked)} className="h-4 w-4 accent-primary" />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                <span><span className="font-medium">Mostrar RUT del emisor</span><span className="block text-xs text-muted-foreground">Mantiene visible la identificación de la empresa</span></span>
                <input type="checkbox" checked={templateShowTaxId} onChange={(event) => setTemplateShowTaxId(event.target.checked)} className="h-4 w-4 accent-primary" />
              </label>
              <div>
                <Label htmlFor="document-template-footer">Mensaje complementario del pie (opcional)</Label>
                <Input id="document-template-footer" value={templateFooterNote} maxLength={64} onChange={(event) => setTemplateFooterNote(event.target.value)} placeholder="Gracias por preferir nuestros servicios" />
                <p className="mt-1 text-xs text-muted-foreground">Se agrega sin reemplazar la aclaración legal de que el PDF no es un DTE.</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setTemplateDialogOpen(false)} disabled={saveTemplate.isPending}>Cancelar</Button>
                <Button onClick={() => saveTemplate.mutate()} disabled={!canManageTemplates || saveTemplate.isPending}>
                  <Save className="mr-1.5 h-4 w-4" /> {saveTemplate.isPending ? "Guardando…" : "Guardar plantilla"}
                </Button>
              </div>
              {!canWrite && <p className="text-xs text-muted-foreground">Solo owner y admin pueden modificar las plantillas.</p>}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!detailInvoice} onOpenChange={(open) => { if (!open) setDetailInvoice(null); }}>
          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader><DialogTitle>Detalle del documento de cobro</DialogTitle></DialogHeader>
            {detailInvoice && (() => {
              const detailPayments = payments.filter((p: any) => p.invoice_id === detailInvoice.id);
              const detailEvents = invoiceEvents.filter((e: any) => e.invoice_id === detailInvoice.id);
              const paid = paidByInvoice.get(detailInvoice.id) ?? 0;
              const lines = Array.isArray(detailInvoice.items_snapshot) ? detailInvoice.items_snapshot : [];
              return (
                <div className="space-y-5">
                  <div className="grid gap-3 rounded-xl border p-4 sm:grid-cols-3">
                    <div><p className="text-xs text-muted-foreground">Documento</p><p className="font-mono font-semibold">FAC-{String(detailInvoice.invoice_number).padStart(6, "0")}</p></div>
                    <div><p className="text-xs text-muted-foreground">Cliente</p><p className="font-semibold">{detailInvoice.customer_name}</p></div>
                    <div><p className="text-xs text-muted-foreground">Estado</p><Badge variant={detailInvoice.status === "paid" ? "default" : "secondary"}>{labels[detailInvoice.status] ?? detailInvoice.status}</Badge></div>
                    <div><p className="text-xs text-muted-foreground">Total</p><p className="font-semibold">{fmtCLP(Number(detailInvoice.total))}</p></div>
                    <div><p className="text-xs text-muted-foreground">Abonado</p><p className="font-semibold">{fmtCLP(paid)}</p></div>
                    <div><p className="text-xs text-muted-foreground">Saldo</p><p className="font-semibold">{fmtCLP(Math.max(0, Number(detailInvoice.total) - paid))}</p></div>
                  </div>
                  <section>
                    <h3 className="mb-2 text-sm font-semibold">Detalle de conceptos</h3>
                    <div className="overflow-x-auto rounded-xl border">
                      <table className="w-full min-w-[480px] text-sm">
                        <thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="p-2">Concepto</th><th className="p-2 text-right">Cantidad</th><th className="p-2 text-right">Precio</th><th className="p-2 text-right">Importe</th></tr></thead>
                        <tbody>{lines.map((line: any, index: number) => <tr key={index} className="border-b last:border-0"><td className="p-2"><div className="font-medium">{line.name ?? "Concepto"}</div>{line.description && <div className="text-xs text-muted-foreground">{line.description}</div>}</td><td className="p-2 text-right tabular-nums">{Number(line.qty ?? 0)}</td><td className="p-2 text-right tabular-nums">{fmtCLP(Number(line.price ?? 0))}</td><td className="p-2 text-right tabular-nums">{fmtCLP(Number(line.qty ?? 0) * Number(line.price ?? 0))}</td></tr>)}</tbody>
                      </table>
                    </div>
                    <div className="mt-3 space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmtCLP(Number(detailInvoice.subtotal))}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Descuento</span><span>-{fmtCLP(Number(detailInvoice.discount_amount))}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">{detailInvoice.tax_treatment === "taxable" ? `IVA (${detailInvoice.vat_rate}%)` : detailInvoice.tax_treatment === "exempt" ? "Exento" : "No afecto"}</span><span>{fmtCLP(Number(detailInvoice.tax_amount))}</span></div>
                      <div className="flex justify-between border-t pt-2 font-semibold"><span>Total</span><span>{fmtCLP(Number(detailInvoice.total))}</span></div>
                    </div>
                  </section>
                  <section>
                    <h3 className="mb-2 text-sm font-semibold">Abonos registrados</h3>
                    {detailPayments.length === 0 ? <p className="text-sm text-muted-foreground">Todavía no hay pagos registrados.</p> : <div className="space-y-2">{detailPayments.map((p: any) => <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"><div><div className="font-medium">{p.payment_method} · {p.status === "confirmed" ? "Confirmado" : p.status}</div><div className="text-xs text-muted-foreground">{new Date(p.confirmed_at).toLocaleString("es-CL")}{p.payment_reference ? ` · ${p.payment_reference}` : ""}</div></div><strong>{fmtCLP(Number(p.amount))}</strong></div>)}</div>}
                  </section>
                  <section>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold"><History className="h-4 w-4" /> Historial de actividad</h3>
                    {detailEvents.length === 0 ? <p className="text-sm text-muted-foreground">Sin eventos registrados.</p> : <ol className="space-y-2">{detailEvents.map((event: any) => <li key={event.id} className="flex gap-3 rounded-lg border p-3"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" /><div><div className="text-sm font-medium">{event.event_type.replaceAll("_", " ")}</div><div className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString("es-CL")}</div></div></li>)}</ol>}
                  </section>
                  <p className="text-xs text-muted-foreground">Documento comercial interno. No corresponde a una factura electrónica ni a un DTE emitido ante el SII.</p>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

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
