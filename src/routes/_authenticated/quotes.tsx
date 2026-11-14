import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ModuleGuard } from "@/components/module-guard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, FileText, X, Download, ArrowRightCircle, Copy, Eye, Building2, Pencil } from "lucide-react";
import { useBizList, useBizInsert, useBizUpdate, useBizDelete, fmtCLP } from "@/lib/biz-data";
import { useActiveBusiness } from "@/lib/use-business";
import { CurrencyInput } from "@/components/ui/currency-input";
import { calculateQuoteTotals, formatQuoteNumber, type QuoteTaxTreatment, type QuotePriceBasis } from "@/lib/quote-calculations";
// quote-pdf is imported dynamically inside the handler so jspdf never enters the SSR/worker bundle.
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/quotes")({
  head: () => ({ meta: [{ title: "Cotizaciones — Nüva One" }] }),
  component: Quotes,
});

const statusLabel: Record<string, { l: string; c: string }> = {
  draft: { l: "Borrador", c: "bg-muted text-muted-foreground" },
  sent: { l: "Enviada", c: "bg-primary/15 text-primary" },
  viewed: { l: "Vista", c: "bg-warning/15 text-warning" },
  accepted: { l: "Aceptada · registro interno", c: "bg-success/15 text-success" },
  rejected: { l: "Rechazada", c: "bg-destructive/15 text-destructive" },
  expired: { l: "Expirada", c: "bg-muted text-muted-foreground" },
};

type Item = { product_id: string | null; name: string; description?: string; sku?: string; unit?: string; qty: number; price: number };

import { useMyRole, canWriteOperations } from "@/lib/use-business";

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultQuoteValidityDate() {
  const date = new Date();
  date.setDate(date.getDate() + 15);
  return localDateString(date);
}

type QuotePreviewProps = {
  business: any;
  customer: any;
  customerName: string;
  subject: string;
  customerDetails: any;
  items: Item[];
  totals: { subtotal: number; discountAmount: number; tax: number; total: number };
  discountPct: number;
  taxTreatment: QuoteTaxTreatment;
  priceBasis: QuotePriceBasis | null;
  notes: string;
  terms: string;
  validUntil: string;
};

function QuoteDocumentPreview({
  business, customer, customerName, subject, customerDetails, items, totals, discountPct,
  taxTreatment, priceBasis, notes, terms, validUntil,
}: QuotePreviewProps) {
  const vatLabel = taxTreatment === "taxable" ? "IVA (19%)" : taxTreatment === "exempt" ? "Exenta de IVA" : "No afecta a IVA";
  const lineNetAmount = (item: Item) => {
    const enteredLine = Math.round(Number(item.qty || 0) * Number(item.price || 0));
    return priceBasis === "gross" && taxTreatment === "taxable"
      ? Math.round((enteredLine * 100) / 119)
      : enteredLine;
  };
  const displayedUnitPrice = (item: Item) =>
    priceBasis === "gross" && taxTreatment === "taxable"
      ? Math.round(Number(item.price || 0) * 100 / 119)
      : Number(item.price || 0);
  return (
    <aside className="min-w-0 rounded-2xl border bg-muted/30 p-3 xl:sticky xl:top-0 xl:max-h-[calc(94vh-5rem)] xl:overflow-y-auto">
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 text-sm font-semibold"><Eye className="h-4 w-4 text-primary" /> Previsualización A4 en vivo</div>
        <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Documento comercial</span>
      </div>
      <div className="mx-auto min-h-[680px] w-full max-w-[470px] bg-white p-7 text-slate-800 shadow-xl ring-1 ring-black/5 sm:p-9">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div className="min-w-0">
            {business?.logo_url ? <img src={business.logo_url} alt="" className="mb-2 max-h-12 max-w-32 object-contain object-left" /> : <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Building2 className="h-5 w-5" /></div>}
            <div className="break-words text-sm font-bold tracking-tight">{business?.name || "Nombre del negocio"}</div>
            <div className="mt-1 space-y-0.5 text-[9px] leading-relaxed text-slate-500">
              {business?.tax_id && <div>RUT: {business.tax_id}</div>}
              {business?.giro && <div>{business.giro}</div>}
              {[business?.address, business?.comuna].filter(Boolean).join(", ") && <div>{[business?.address, business?.comuna].filter(Boolean).join(", ")}</div>}
              {business?.public_contact_phone && <div>{business.public_contact_phone}</div>}
              {business?.public_contact_email && <div>{business.public_contact_email}</div>}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[19px] font-bold tracking-[0.08em] text-slate-900">COTIZACIÓN</div>
            <div className="mt-1 text-xs font-semibold text-amber-700">{formatQuoteNumber(null)}</div>
            <div className="mt-1 text-[9px] text-slate-500">{new Date().toLocaleDateString("es-CL")}</div>
          </div>
        </div>
        {subject && <div className="mb-4"><div className="text-[8px] font-bold tracking-[0.14em] text-slate-400">ASUNTO / PROYECTO</div><div className="mt-1 text-sm font-semibold text-slate-800">{subject}</div></div>}
        <div className="my-5 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3">
          <div className="min-w-0">
            <div className="mb-1 text-[8px] font-bold tracking-[0.14em] text-slate-400">PREPARADA PARA</div>
            <div className="break-words text-xs font-semibold">{customerName || customer?.name || "Nombre del cliente"}</div>
            <div className="mt-1 space-y-0.5 break-words text-[9px] text-slate-500">
              {(customerDetails.tax_id || customer?.tax_id) && <div>RUT: {customerDetails.tax_id || customer?.tax_id}</div>}
              {(customerDetails.contact_name || customer?.contact_name) && <div>Contacto: {customerDetails.contact_name || customer?.contact_name}</div>}
              {(customerDetails.address || customer?.address) && <div>{customerDetails.address || customer?.address}</div>}
              {([customerDetails.shipping_comuna || customer?.shipping_comuna, customerDetails.shipping_city || customer?.shipping_city].filter(Boolean).join(", ")) && <div>{[customerDetails.shipping_comuna || customer?.shipping_comuna, customerDetails.shipping_city || customer?.shipping_city].filter(Boolean).join(", ")}</div>}
              {(customerDetails.email || customer?.email) && <div>{customerDetails.email || customer?.email}</div>}
              {(customerDetails.phone || customer?.phone) && <div>{customerDetails.phone || customer?.phone}</div>}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[8px] font-bold tracking-[0.14em] text-slate-400">VÁLIDA HASTA</div>
            <div className="text-xs font-semibold">{validUntil ? new Date(validUntil + "T12:00:00").toLocaleDateString("es-CL") : "No especificada"}</div>
            <div className="mt-1 text-[9px] text-slate-500">{!priceBasis ? "Selecciona modalidad de precios" : priceBasis === "gross" ? (taxTreatment === "taxable" ? "Valores unitarios con IVA incluido" : "Valores unitarios brutos") : "Valores unitarios netos"}</div>
          </div>
        </div>
        <div className="mb-2 text-[9px] font-bold tracking-[0.14em] text-slate-400">DETALLE DE PRODUCTOS Y SERVICIOS</div>{priceBasis === "gross" && taxTreatment === "taxable" && <div className="mb-2 text-[8px] text-slate-500">Los precios ingresados incluyen IVA; el detalle se presenta en base neta y el impuesto se desglosa al final.</div>}
        <table className="w-full border-collapse text-[9px]">
          <thead><tr className="border-y border-slate-200 text-left text-[8px] uppercase tracking-wide text-slate-500"><th className="py-2 pr-2">Descripción</th><th className="py-2 text-right">Cant.</th><th className="py-2 text-right">Precio unit. neto</th><th className="py-2 pl-2 text-right">Total</th></tr></thead>
          <tbody>
            {items.filter((item) => item.name.trim()).map((item, index) => (
              <tr key={index} className="border-b border-slate-100 align-top">
                <td className="max-w-[150px] py-2 pr-2"><div className="font-semibold">{item.name}</div>{item.description && <div className="mt-0.5 whitespace-pre-wrap text-[8px] leading-relaxed text-slate-500">{item.description}</div>}</td>
                <td className="py-2 text-right tabular-nums">{item.qty || 0}</td>
                <td className="py-2 text-right tabular-nums">{fmtCLP(displayedUnitPrice(item))}</td>
                <td className="py-2 pl-2 text-right font-medium tabular-nums">{fmtCLP(lineNetAmount(item))}</td>
              </tr>
            ))}
            {!items.some((item) => item.name.trim()) && <tr><td colSpan={4} className="py-8 text-center text-slate-400">Los productos y servicios aparecerán aquí</td></tr>}
          </tbody>
        </table>
        <div className="ml-auto mt-5 max-w-[230px] space-y-2 text-[9px]">
          <div className="flex justify-between gap-3"><span className="text-slate-500">Subtotal neto</span><span className="tabular-nums">{fmtCLP(totals.subtotal)}</span></div>
          {discountPct > 0 && <div className="flex justify-between gap-3 text-rose-600"><span>Descuento ({discountPct}%)</span><span>-{fmtCLP(totals.discountAmount)}</span></div>}
          <div className="flex justify-between gap-3"><span className="text-slate-500">{vatLabel}</span><span className="tabular-nums">{fmtCLP(totals.tax)}</span></div>
          <div className="flex justify-between rounded-md bg-slate-900 px-3 py-3 text-white"><span className="font-bold tracking-wide">TOTAL</span><span className="text-sm font-bold tabular-nums">{fmtCLP(totals.total)}</span></div>
        </div>
        {notes && <div className="mt-6"><div className="mb-1 text-[8px] font-bold tracking-[0.14em] text-slate-400">ALCANCE Y NOTAS</div><p className="whitespace-pre-wrap break-words text-[9px] leading-relaxed text-slate-600">{notes}</p></div>}
        {terms && <div className="mt-5"><div className="mb-1 text-[8px] font-bold tracking-[0.14em] text-slate-400">CONDICIONES COMERCIALES</div><p className="whitespace-pre-wrap break-words text-[9px] leading-relaxed text-slate-600">{terms}</p></div>}
        <div className="mt-8 border-t border-slate-200 pt-3 text-[8px] text-slate-400">Documento comercial. No constituye factura ni documento tributario electrónico.</div>
      </div>
      {!priceBasis && <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-2 text-center text-[10px] text-amber-800">Modalidad histórica desconocida: los totales de esta vista son provisionales. Selecciona neto o bruto antes de guardar.</p>}
      <p className="mt-3 text-center text-[10px] text-muted-foreground">La descarga final genera el PDF A4 con paginación automática y los datos registrados.</p>
    </aside>
  );
}

function Quotes() {
  const { data: myRole } = useMyRole();
  const canWrite = canWriteOperations(myRole);
  const { active } = useActiveBusiness();
  const qc = useQueryClient();
  const { data, isLoading } = useBizList<any>("quotes", { order: "created_at" });
  const { data: products } = useBizList<any>("products", { order: "name", ascending: true });
  const { data: sales } = useBizList<any>("sales");
  const { data: customers } = useBizList<any>("customers", { order: "name", ascending: true });
  const insert = useBizInsert("quotes");
  const upd = useBizUpdate("quotes");
  const del = useBizDelete("quotes");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([{ product_id: null, name: "", qty: 1, price: 0 }]);
  const [customer, setCustomer] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerDetails, setCustomerDetails] = useState({ tax_id: "", address: "", email: "", phone: "", contact_name: "", shipping_comuna: "", shipping_city: "" });
  const [subject, setSubject] = useState("");
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  // Evita dobles solicitudes desde taps consecutivos; la RPC mantiene la garantía transaccional en BD.
  const convertingQuoteIdsRef = useRef(new Set<string>());
  const [discountPct, setDiscountPct] = useState(0);
  const [taxTreatment, setTaxTreatment] = useState<QuoteTaxTreatment>("taxable");
  const [priceBasis, setPriceBasis] = useState<QuotePriceBasis | null>("net");
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState(defaultQuoteValidityDate);
  const [terms, setTerms] = useState(
    "Cotización válida por 15 días. Precios expresados según modalidad seleccionada (netos o brutos). Los impuestos se desglosan según el tratamiento tributario indicado. Forma de pago a coordinar.",
  );

  const convertedQuoteIds = new Set((sales ?? []).map((s: any) => s.quote_id).filter(Boolean));

  const vatRate = taxTreatment === "taxable" ? 19 : 0;
  const previewItems = items.filter((item) => item.name.trim() && Number(item.qty) > 0 && Number(item.price) >= 0 && Number.isFinite(Number(item.qty)) && Number.isFinite(Number(item.price)));
  const totals = calculateQuoteTotals(previewItems, discountPct, taxTreatment, vatRate, priceBasis ?? "net");
  const { subtotal, discountAmount, tax, total } = totals;
  const selectedCustomer = (customers ?? []).find((entry: any) => entry.id === customerId) ?? null;

  function pickProduct(idx: number, productId: string) {
    const p = (products ?? []).find((x: any) => x.id === productId);
    const copy = [...items];
    if (p)
      copy[idx] = {
        product_id: p.id,
        name: p.name,
        qty: copy[idx].qty || 1,
        price: Number(p.price),
        sku: p.sku ?? "",
        unit: p.unit ?? "",
      };
    setItems(copy);
  }

  function startNewQuote() {
    setEditingQuoteId(null);
    setItems([{ product_id: null, name: "", qty: 1, price: 0 }]);
    setCustomer("");
    setCustomerId(null);
    setCustomerDetails({ tax_id: "", address: "", email: "", phone: "", contact_name: "", shipping_comuna: "", shipping_city: "" });
    setSubject("");
    setDiscountPct(0);
    setTaxTreatment("taxable");
    setPriceBasis("net");
    setNotes("");
    setValidUntil(defaultQuoteValidityDate());
    setTerms("Cotización válida por 15 días. Precios expresados según modalidad seleccionada (netos o brutos). Los impuestos se desglosan según el tratamiento tributario indicado. Forma de pago a coordinar.");
  }

  async function save() {
    const validItems = items.filter((item) => item.name.trim() !== "");
    if (!customer.trim()) {
      toast.error("Selecciona o escribe el nombre del cliente.");
      return;
    }
    if (!validItems.length) {
      toast.error("Agrega al menos un producto o servicio.");
      return;
    }
    if (!priceBasis) {
      toast.error("Selecciona si los precios ingresados son netos o incluyen impuestos.");
      return;
    }
    if (!validUntil) {
      toast.error("Define la fecha de vigencia de la cotización.");
      return;
    }
    if (validUntil < localDateString(new Date())) {
      toast.error("La fecha de vigencia no puede estar en el pasado.");
      return;
    }
    try {
      const calculated = calculateQuoteTotals(validItems, discountPct, taxTreatment, vatRate, priceBasis);
      if (calculated.total <= 0) {
        toast.error("El total de la cotización debe ser mayor que cero.");
        return;
      }
      const quotePayload = {
        customer_name: customer.trim(),
        customer_id: customerId,
        subject: subject.trim() || null,
        customer_snapshot: { ...customerDetails, name: customer.trim() },
        items: validItems as any,
        subtotal: calculated.subtotal,
        discount_pct: calculated.discountPct,
        tax: calculated.tax,
        total: calculated.total,
        tax_treatment: taxTreatment,
        vat_rate: vatRate,
        price_basis: priceBasis,
        valid_until: validUntil || null,
        notes: notes.trim() || null,
        terms: terms.trim() || null,
        status: "draft",
      };
      const savedQuoteId = editingQuoteId
        ? (await upd.mutateAsync({ id: editingQuoteId, patch: quotePayload }), editingQuoteId)
        : await insert.mutateAsync(quotePayload);
      const { data: savedQuote, error: savedQuoteError } = await supabase
        .from("quotes")
        .select("*")
        .eq("id", savedQuoteId)
        .eq("business_id", active?.id ?? "")
        .single();
      const pdfDownloaded = !savedQuoteError && savedQuote ? await downloadPdf(savedQuote) : false;
      setItems([{ product_id: null, name: "", qty: 1, price: 0 }]);
      setCustomer("");
      setCustomerId(null);
      setCustomerDetails({ tax_id: "", address: "", email: "", phone: "", contact_name: "", shipping_comuna: "", shipping_city: "" });
      setSubject("");
      setEditingQuoteId(null);
      setDiscountPct(0);
      setTaxTreatment("taxable");
      setPriceBasis("net");
      setNotes("");
      setValidUntil(defaultQuoteValidityDate());
      setOpen(false);
      toast.success(pdfDownloaded ? "Cotización guardada y PDF descargado." : "Cotización guardada. Puedes descargar el PDF desde el listado.");
    } catch (error: any) {
      toast.error(error?.message ?? "No se pudo guardar la cotización.");
    }
  }

  function editDraftQuote(quote: any) {
    if (quote.status !== "draft") {
      toast.error("Solo se pueden editar cotizaciones en borrador. Duplica las demás para crear una nueva versión.");
      return;
    }
    setEditingQuoteId(quote.id);
    setItems(
      (quote.items ?? []).length
        ? quote.items.map((it: any) => ({
            product_id: it.product_id ?? null,
            name: it.name,
            description: it.description ?? "",
            sku: it.sku ?? "",
            unit: it.unit ?? "",
            qty: Number(it.qty) || 1,
            price: Number(it.price) || 0,
          }))
        : [{ product_id: null, name: "", qty: 1, price: 0 }],
    );
    setCustomer(quote.customer_name ?? "");
    setCustomerId(quote.customer_id ?? null);
    const linkedCustomer = (customers ?? []).find((entry: any) => entry.id === quote.customer_id) ?? null;
    const snapshot = quote.customer_snapshot && Object.keys(quote.customer_snapshot).length > 0
      ? quote.customer_snapshot
      : linkedCustomer
        ? { tax_id: linkedCustomer.tax_id ?? "", address: linkedCustomer.address ?? "", email: linkedCustomer.email ?? "", phone: linkedCustomer.phone ?? "", contact_name: linkedCustomer.shipping_contact_name ?? "", shipping_comuna: linkedCustomer.shipping_comuna ?? "", shipping_city: linkedCustomer.shipping_city ?? "" }
        : { tax_id: "", address: "", email: "", phone: "", contact_name: "", shipping_comuna: "", shipping_city: "" };
    setCustomerDetails(snapshot);
    setSubject(quote.subject ?? "");
    setDiscountPct(Number(quote.discount_pct) || 0);
    setTaxTreatment((quote.tax_treatment as QuoteTaxTreatment) || "taxable");
    setPriceBasis((quote.price_basis as QuotePriceBasis) || null);
    setNotes(quote.notes ?? "");
    setValidUntil(quote.valid_until ?? "");
    setTerms(quote.terms ?? terms);
    setOpen(true);
  }

  function duplicateQuote(quote: any) {
    setItems(
      (quote.items ?? []).length
        ? quote.items.map((it: any) => ({
            product_id: it.product_id ?? null,
            name: it.name,
            description: it.description ?? "",
            sku: it.sku ?? "",
            unit: it.unit ?? "",
            qty: Number(it.qty) || 1,
            price: Number(it.price) || 0,
          }))
        : [{ product_id: null, name: "", qty: 1, price: 0 }],
    );
    setCustomer(quote.customer_name ?? "");
    setCustomerId(quote.customer_id ?? null);
    const linkedCustomer = (customers ?? []).find((entry: any) => entry.id === quote.customer_id) ?? null;
    const snapshot = quote.customer_snapshot && Object.keys(quote.customer_snapshot).length > 0
      ? quote.customer_snapshot
      : linkedCustomer
        ? { tax_id: linkedCustomer.tax_id ?? "", address: linkedCustomer.address ?? "", email: linkedCustomer.email ?? "", phone: linkedCustomer.phone ?? "", contact_name: linkedCustomer.shipping_contact_name ?? "", shipping_comuna: linkedCustomer.shipping_comuna ?? "", shipping_city: linkedCustomer.shipping_city ?? "" }
        : { tax_id: "", address: "", email: "", phone: "", contact_name: "", shipping_comuna: "", shipping_city: "" };
    setCustomerDetails(snapshot);
    setSubject(quote.subject ?? "");
    setDiscountPct(Number(quote.discount_pct) || 0);
    setTaxTreatment((quote.tax_treatment as QuoteTaxTreatment) || "taxable");
    setPriceBasis((quote.price_basis as QuotePriceBasis) || null);
    setNotes(quote.notes ?? "");
    setValidUntil(quote.valid_until ?? "");
    setTerms(quote.terms ?? terms);
    setOpen(true);
    toast.info("Cotización duplicada como borrador, revisa y guarda");
  }

  async function convertToSale(quote: any) {
    if (convertingQuoteIdsRef.current.has(quote.id)) return;
    convertingQuoteIdsRef.current.add(quote.id);
    setConvertingId(quote.id);
    try {
      const { error } = await supabase.rpc("convert_quote_to_sale", { p_quote_id: quote.id });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["sales"] });
      await qc.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Borrador de venta creado. Aún no registra cobro ni mueve inventario; confirma la operación desde Ventas.");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo convertir a venta");
    } finally {
      convertingQuoteIdsRef.current.delete(quote.id);
      setConvertingId(null);
    }
  }

  async function downloadPdf(quote: any): Promise<boolean> {
    try {
      if (!quote.price_basis) {
        toast.error("Esta cotización histórica no registra si sus precios eran netos o incluían IVA. Duplícala, selecciona la modalidad correcta y descarga la nueva versión.");
        return false;
      }
      const verified = calculateQuoteTotals(
        quote.items ?? [],
        Number(quote.discount_pct) || 0,
        (quote.tax_treatment as QuoteTaxTreatment) || "taxable",
        Number(quote.vat_rate ?? 19),
        quote.price_basis as QuotePriceBasis,
      );
      const amountsMatch =
        Math.abs(verified.subtotal - Number(quote.subtotal)) <= 1 &&
        Math.abs(verified.tax - Number(quote.tax)) <= 1 &&
        Math.abs(verified.total - Number(quote.total)) <= 1;
      if (!amountsMatch) {
        toast.error("No se generó el PDF: esta cotización histórica tiene importes que no cuadran. Duplícala como borrador y revisa sus valores antes de compartirla.");
        return false;
      }
      const { generateQuotePdf } = await import("@/lib/quote-pdf");
      const hasCustomerSnapshot = quote.customer_snapshot && Object.keys(quote.customer_snapshot).length > 0;
      const sourceCustomer = hasCustomerSnapshot ? quote.customer_snapshot : (customers ?? []).find((entry: any) => entry.id === quote.customer_id) ?? null;
      const customerRecord = sourceCustomer
        ? { ...sourceCustomer, contact_name: sourceCustomer.contact_name ?? sourceCustomer.shipping_contact_name ?? null }
        : null;
      await generateQuotePdf(
        quote,
        {
          name: active?.name ?? "Empresa",
          logo_url: active?.logo_url ?? null,
          tax_id: (active as any)?.tax_id ?? null,
          giro: (active as any)?.giro ?? null,
          address: (active as any)?.address ?? null,
          comuna: (active as any)?.comuna ?? null,
          public_contact_email: (active as any)?.public_contact_email ?? null,
          public_contact_phone: (active as any)?.public_contact_phone ?? null,
        },
        customerRecord,
      );
      return true;
    } catch (error: any) {
      toast.error(error?.message ?? "No se pudo generar el PDF.");
      return false;
    }
  }

  return (
    <ModuleGuard module="quotes">
      <>
        <PageHeader
          title="Cotizaciones"
          description="Prepara propuestas comerciales profesionales con cálculos validados y PDF descargable"
          action={
            !canWrite ? undefined : (
              <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) setEditingQuoteId(null); }}>
                <DialogTrigger asChild>
                  <Button className="shadow-elegant">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Nueva cotización
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[min(96vw,1480px)] max-h-[94vh] overflow-y-auto rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingQuoteId ? "Editar cotización en borrador" : "Nueva cotización"}</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
                    <div className="space-y-4">
                    <div>
                      <Label htmlFor="customer">Cliente</Label>
                      <Input
                        id="customer"
                        value={customer}
                        onChange={(e) => {
                          const nextName = e.target.value;
                          setCustomer(nextName);
                          if (customerId && nextName.trim() !== selectedCustomer?.name) {
                            setCustomerId(null);
                            setCustomerDetails({ tax_id: "", address: "", email: "", phone: "", contact_name: "", shipping_comuna: "", shipping_city: "" });
                          }
                        }}
                        placeholder="Nombre o razón social del cliente"
                      />
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div><Label htmlFor="customer-rut">RUT (opcional)</Label><Input id="customer-rut" value={customerDetails.tax_id} onChange={(e) => setCustomerDetails((value) => ({ ...value, tax_id: e.target.value }))} placeholder="12.345.678-9" /></div>
                        <div><Label htmlFor="customer-contact">Contacto</Label><Input id="customer-contact" value={customerDetails.contact_name} onChange={(e) => setCustomerDetails((value) => ({ ...value, contact_name: e.target.value }))} placeholder="Persona de contacto" /></div>
                        <div className="col-span-2"><Label htmlFor="customer-address">Dirección</Label><Input id="customer-address" value={customerDetails.address} onChange={(e) => setCustomerDetails((value) => ({ ...value, address: e.target.value }))} placeholder="Dirección comercial o de prestación" /></div>
                        <div><Label htmlFor="customer-comuna">Comuna</Label><Input id="customer-comuna" value={customerDetails.shipping_comuna} onChange={(e) => setCustomerDetails((value) => ({ ...value, shipping_comuna: e.target.value }))} placeholder="Comuna" /></div>
                        <div><Label htmlFor="customer-city">Ciudad / región</Label><Input id="customer-city" value={customerDetails.shipping_city} onChange={(e) => setCustomerDetails((value) => ({ ...value, shipping_city: e.target.value }))} placeholder="Ciudad, región" /></div>
                        <div><Label htmlFor="customer-email">Correo</Label><Input id="customer-email" type="email" value={customerDetails.email} onChange={(e) => setCustomerDetails((value) => ({ ...value, email: e.target.value }))} placeholder="cliente@empresa.cl" /></div>
                        <div><Label htmlFor="customer-phone">Teléfono</Label><Input id="customer-phone" value={customerDetails.phone} onChange={(e) => setCustomerDetails((value) => ({ ...value, phone: e.target.value }))} placeholder="+56 9 ..." /></div>
                      </div>
                      <Select
                        value={customerId ?? "__none__"}
                        onValueChange={(v) => {
                          if (v === "__none__") {
                            setCustomerId(null);
                            setCustomerDetails({ tax_id: "", address: "", email: "", phone: "", contact_name: "", shipping_comuna: "", shipping_city: "" });
                            return;
                          }
                          const c = (customers ?? []).find((x: any) => x.id === v);
                          setCustomerId(v);
                          if (c) {
                            setCustomer(c.name);
                            setCustomerDetails({ tax_id: c.tax_id ?? "", address: c.address ?? "", email: c.email ?? "", phone: c.phone ?? "", contact_name: c.shipping_contact_name ?? "", shipping_comuna: c.shipping_comuna ?? "", shipping_city: c.shipping_city ?? "" });
                          }
                        }}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Vincular a cliente existente (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— Sin vincular —</SelectItem>
                          {(customers ?? []).map((c: any) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} {c.phone ? `(${c.phone})` : "(sin teléfono)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="quote-subject">Asunto / proyecto</Label>
                      <Input id="quote-subject" className="mt-1" value={subject} maxLength={240} onChange={(e) => setSubject(e.target.value)} placeholder="Ej. Implementación de sistema de climatización" />
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <Label>Productos</Label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setItems([...items, { product_id: null, name: "", qty: 1, price: 0 }])
                          }
                        >
                          <Plus className="mr-1 h-3 w-3" />
                          Agregar línea
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {items.map((it, idx) => (
                          <div key={idx} className="grid grid-cols-12 gap-2">
                            <div className="col-span-6">
                              <Select
                                value={it.product_id ?? "__free__"}
                                onValueChange={(v) => {
                                  if (v === "__free__") {
                                    const next = [...items];
                                    next[idx] = { ...next[idx], product_id: null, sku: "", unit: "" };
                                    setItems(next);
                                  } else {
                                    pickProduct(idx, v);
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona un producto" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__free__">
                                    — Producto personalizado —
                                  </SelectItem>
                                  {(products ?? []).map((p: any) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      {p.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {it.product_id === null && (
                                <Input
                                  className="mt-1"
                                  placeholder="Nombre del producto o servicio"
                                  value={it.name}
                                  onChange={(e) => {
                                    const c = [...items];
                                    c[idx].name = e.target.value;
                                    setItems(c);
                                  }}
                                />
                              )}
                              <Input
                                className="mt-1"
                                placeholder="Descripción / alcance (opcional)"
                                value={it.description ?? ""}
                                onChange={(e) => {
                                  const c = [...items];
                                  c[idx].description = e.target.value;
                                  setItems(c);
                                }}
                              />
                              <div className="mt-1 grid grid-cols-2 gap-1.5">
                                <Input
                                  placeholder="SKU / código"
                                  value={it.sku ?? ""}
                                  onChange={(e) => {
                                    const c = [...items];
                                    c[idx].sku = e.target.value;
                                    setItems(c);
                                  }}
                                />
                                <Input
                                  placeholder="Unidad (un, h, m²...)"
                                  value={it.unit ?? ""}
                                  onChange={(e) => {
                                    const c = [...items];
                                    c[idx].unit = e.target.value;
                                    setItems(c);
                                  }}
                                />
                              </div>
                            </div>
                            <Input
                              className="col-span-2"
                              type="number"
                              min={it.product_id ? 1 : 0.01}
                              step={it.product_id ? 1 : "0.01"}
                              value={it.qty}
                              onChange={(e) => {
                                const c = [...items];
                                c[idx].qty = Number(e.target.value);
                                setItems(c);
                              }}
                            />
                            <CurrencyInput
                              wrapperClassName="col-span-3"
                              placeholder="Precio"
                              value={it.price}
                              onValueChange={(n) => {
                                const c = [...items];
                                c[idx].price = n;
                                setItems(c);
                              }}
                            />
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="col-span-1"
                              onClick={() => setItems(items.filter((_, i) => i !== idx))}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="price-basis">Los precios ingresados son</Label>
                        <Select value={priceBasis ?? undefined} onValueChange={(value) => setPriceBasis(value as QuotePriceBasis)}>
                          <SelectTrigger id="price-basis"><SelectValue placeholder="Selecciona modalidad" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="net">Netos (sin IVA)</SelectItem>
                            <SelectItem value="gross">Brutos (impuesto incluido)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="mt-1 text-xs text-muted-foreground">Selecciona cómo están expresados los precios del catálogo o ingresados manualmente.</p>
                      </div>
                      <div>
                        <Label htmlFor="tax-treatment">Tratamiento tributario</Label>
                        <Select value={taxTreatment} onValueChange={(value) => setTaxTreatment(value as QuoteTaxTreatment)}>
                          <SelectTrigger id="tax-treatment"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="taxable">Afecta IVA (19%)</SelectItem>
                            <SelectItem value="exempt">Exenta de IVA</SelectItem>
                            <SelectItem value="non_taxable">No afecta a IVA</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="mt-1 text-xs text-muted-foreground">El tratamiento se aplica a todas las líneas. Si una operación combina tratamientos distintos, emite cotizaciones separadas.</p>
                      </div>
                      <div>
                        <Label htmlFor="discount">Descuento (%)</Label>
                        <Input
                          id="discount"
                          type="number"
                          min={0}
                          max={100}
                          value={discountPct}
                          onChange={(e) => setDiscountPct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="valid_until">Válida hasta</Label>
                        <Input
                          id="valid_until"
                          type="date"
                          value={validUntil}
                          onChange={(e) => setValidUntil(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="quote-notes">Alcance y notas</Label>
                      <textarea
                        id="quote-notes"
                        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Descripción del proyecto, entregables, exclusiones o consideraciones..."
                      />
                    </div>
                    <div>
                      <Label htmlFor="terms">Condiciones comerciales (aparecen en el PDF)</Label>
                      <textarea
                        id="terms"
                        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                        rows={2}
                        value={terms}
                        onChange={(e) => setTerms(e.target.value)}
                      />
                    </div>

                    <div className="rounded-lg bg-secondary/40 p-4">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>{fmtCLP(subtotal)}</span>
                      </div>
                      {discountPct > 0 && (
                        <div className="flex justify-between text-sm text-destructive">
                          <span>Descuento ({discountPct}%)</span>
                          <span>-{fmtCLP(discountAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span>{taxTreatment === "taxable" ? "IVA (19%)" : taxTreatment === "exempt" ? "Operación exenta" : "Operación no afecta"}</span>
                        <span>{fmtCLP(tax)}</span>
                      </div>
                      <div className="mt-2 flex justify-between border-t pt-2 text-base font-semibold">
                        <span>Total</span>
                        <span>{fmtCLP(total)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="w-full"
                        onClick={save}
                        disabled={insert.isPending}
                      >
                        {insert.isPending || upd.isPending ? "Guardando..." : editingQuoteId ? "Guardar cambios y descargar PDF" : "Guardar y descargar PDF"}
                      </Button>
                      <p className="text-xs text-muted-foreground">Guardar no envía la cotización. Descarga el PDF y compártelo por el canal que utilices; el estado de envío solo se actualizará cuando exista una integración real.</p>
                    </div>
                    </div>
                    <QuoteDocumentPreview
                      business={active as any}
                      customer={selectedCustomer}
                      customerName={customer}
                      subject={subject}
                      customerDetails={customerDetails}
                      items={items}
                      totals={totals}
                      discountPct={discountPct}
                      taxTreatment={taxTreatment}
                      priceBasis={priceBasis}
                      notes={notes}
                      terms={terms}
                      validUntil={validUntil}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            )
          }
        />

        <Card>
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data || data.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Sin cotizaciones"
              description="Crea tu primera cotización profesional."
            />
          ) : (
            <div className="overflow-x-auto"><Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Seguimiento</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {q.quote_number ? `#${String(q.quote_number).padStart(4, "0")}` : "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>{q.customer_name}</div>
                      {q.subject && <div className="mt-0.5 max-w-[260px] truncate text-xs font-normal text-muted-foreground">{q.subject}</div>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(q.created_at).toLocaleDateString("es-CL")}
                    </TableCell>
                    <TableCell>
                      <select
                        disabled={!canWrite}
                        value={q.status}
                        onChange={(e) => {
                          if (e.target.value === "sent" || e.target.value === "viewed") {
                            toast.info("El envío y la visualización requieren evidencia de entrega real.");
                            return;
                          }
                          upd.mutate({ id: q.id, patch: { status: e.target.value } });
                        }}
                        className="rounded-md border bg-background px-2 py-1 text-xs"
                      >
                        {Object.entries(statusLabel).map(([k, v]) => (
                          <option key={k} value={k} disabled={k === "sent" || k === "viewed"}>
                            {v.l}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {(q.status === "sent" || q.status === "viewed") && q.sent_at
                        ? `${Math.floor((Date.now() - new Date(q.sent_at).getTime()) / 86_400_000)} día(s) sin respuesta`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {fmtCLP(Number(q.total))}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {q.status === "draft" && (
                          <Button variant="ghost" size="icon" title="Editar borrador" disabled={!canWrite} onClick={() => editDraftQuote(q)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Descargar PDF"
                          onClick={() => downloadPdf(q)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Duplicar cotización"
                          onClick={() => duplicateQuote(q)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        {q.status === "accepted" && q.price_basis && !convertedQuoteIds.has(q.id) && canWrite && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Convertir a venta"
                            disabled={convertingId === q.id}
                            onClick={() => convertToSale(q)}
                          >
                            <ArrowRightCircle className="h-4 w-4 text-success" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" disabled={!canWrite} onClick={() => del.mutate(q.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table></div>
          )}
        </Card>
      </>
    </ModuleGuard>
  );
}
