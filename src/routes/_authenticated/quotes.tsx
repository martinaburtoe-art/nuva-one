import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { Plus, Trash2, FileText, X, Download, ArrowRightCircle, Copy } from "lucide-react";
import { useBizList, useBizInsert, useBizUpdate, useBizDelete, fmtCLP } from "@/lib/biz-data";
import { useActiveBusiness } from "@/lib/use-business";
import { CurrencyInput } from "@/components/ui/currency-input";
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
  accepted: { l: "Aceptada", c: "bg-success/15 text-success" },
  rejected: { l: "Rechazada", c: "bg-destructive/15 text-destructive" },
  expired: { l: "Expirada", c: "bg-muted text-muted-foreground" },
};

type Item = { product_id: string | null; name: string; qty: number; price: number };

import { useMyRole, canWriteOperations } from "@/lib/use-business";

function Quotes() {
  const { data: myRole } = useMyRole();
  const canWrite = canWriteOperations(myRole);
  const { active } = useActiveBusiness();
  const { data, isLoading } = useBizList<any>("quotes", { order: "created_at" });
  const { data: products } = useBizList<any>("products", { order: "name", ascending: true });
  const { data: sales } = useBizList<any>("sales");
  const { data: customers } = useBizList<any>("customers", { order: "name", ascending: true });
  const insert = useBizInsert("quotes");
  const upd = useBizUpdate("quotes");
  const del = useBizDelete("quotes");
  const insertSale = useBizInsert("sales");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([{ product_id: null, name: "", qty: 1, price: 0 }]);
  const [customer, setCustomer] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [discountPct, setDiscountPct] = useState(0);
  const [validUntil, setValidUntil] = useState("");
  const [terms, setTerms] = useState(
    "Cotización válida por 15 días. Precios en pesos chilenos, IVA incluido. Forma de pago a coordinar.",
  );

  const convertedQuoteIds = new Set((sales ?? []).map((s: any) => s.quote_id).filter(Boolean));

  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const discountAmount = Math.round(subtotal * (discountPct / 100));
  const taxable = subtotal - discountAmount;
  const tax = Math.round(taxable * 0.19);
  const total = taxable + tax;

  function pickProduct(idx: number, productId: string) {
    const p = (products ?? []).find((x: any) => x.id === productId);
    const copy = [...items];
    if (p)
      copy[idx] = {
        product_id: p.id,
        name: p.name,
        qty: copy[idx].qty || 1,
        price: Number(p.price),
      };
    setItems(copy);
  }

  async function save(status = "draft") {
    if (!customer) return;
    const validItems = items.filter((i) => i.name.trim() !== "");
    await insert.mutateAsync({
      customer_name: customer,
      customer_id: customerId,
      items: validItems as any,
      subtotal,
      discount_pct: discountPct,
      tax,
      total,
      valid_until: validUntil || null,
      terms: terms.trim() || null,
      status,
    });
    setItems([{ product_id: null, name: "", qty: 1, price: 0 }]);
    setCustomer("");
    setCustomerId(null);
    setDiscountPct(0);
    setValidUntil("");
    setOpen(false);
  }

  function duplicateQuote(quote: any) {
    setItems(
      (quote.items ?? []).length
        ? quote.items.map((it: any) => ({
            product_id: it.product_id ?? null,
            name: it.name,
            qty: Number(it.qty) || 1,
            price: Number(it.price) || 0,
          }))
        : [{ product_id: null, name: "", qty: 1, price: 0 }],
    );
    setCustomer(quote.customer_name ?? "");
    setCustomerId(quote.customer_id ?? null);
    setDiscountPct(Number(quote.discount_pct) || 0);
    setTerms(quote.terms ?? terms);
    setOpen(true);
    toast.info("Cotización duplicada como borrador, revisa y guarda");
  }

  async function convertToSale(quote: any) {
    setConvertingId(quote.id);
    try {
      const saleItems = (quote.items ?? []).map((it: any) => ({
        product_id: it.product_id ?? null,
        name: it.name,
        qty: Number(it.qty) || 0,
        price: Number(it.price) || 0,
      }));
      await insertSale.mutateAsync({
        customer_name: quote.customer_name,
        channel: "tienda",
        status: "paid",
        total: quote.total,
        items: saleItems as any,
        quote_id: quote.id,
        notes: `Generada desde cotización`,
      });
      await upd.mutateAsync({ id: quote.id, patch: { status: "accepted" } });
      toast.success("Venta creada a partir de la cotización");
    } catch (e: any) {
      toast.error(e.message ?? "No se pudo convertir a venta");
    } finally {
      setConvertingId(null);
    }
  }

  async function downloadPdf(quote: any) {
    const { generateQuotePdf } = await import("@/lib/quote-pdf");
    await generateQuotePdf(quote, {
      name: active?.name ?? "Nüva One",
      logo_url: active?.logo_url ?? null,
      tax_id: (active as any)?.tax_id ?? null,
    });
  }

  return (
    <ModuleGuard module="quotes">
    <>
      <PageHeader
        title="Cotizaciones"
        description="Crea cotizaciones desde tu catálogo y convierte las aceptadas en ventas con un clic"
        action={
          !canWrite ? undefined : (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-elegant">
                <Plus className="mr-1.5 h-4 w-4" />
                Nueva cotización
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nueva cotización</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="customer">Cliente</Label>
                  <Input
                    id="customer"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                  />
                  <Select
                    value={customerId ?? "__none__"}
                    onValueChange={(v) => {
                      if (v === "__none__") {
                        setCustomerId(null);
                        return;
                      }
                      const c = (customers ?? []).find((x: any) => x.id === v);
                      setCustomerId(v);
                      if (c) setCustomer(c.name);
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Vincular a cliente existente (necesario para seguimiento por WhatsApp)" />
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
                            onValueChange={(v) => (v === "__free__" ? null : pickProduct(idx, v))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un producto" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__free__">— Producto personalizado —</SelectItem>
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
                              placeholder="Descripción del producto"
                              value={it.name}
                              onChange={(e) => {
                                const c = [...items];
                                c[idx].name = e.target.value;
                                setItems(c);
                              }}
                            />
                          )}
                        </div>
                        <Input
                          className="col-span-2"
                          type="number"
                          min={1}
                          value={it.qty}
                          onChange={(e) => {
                            const c = [...items];
                            c[idx].qty = Number(e.target.value);
                            setItems(c);
                          }}
                        />
                        <CurrencyInput
                          className="col-span-3"
                          placeholder="Precio"
                          value={it.price}
                          onChange={(n) => {
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
                    <Label htmlFor="discount">Descuento (%)</Label>
                    <Input
                      id="discount"
                      type="number"
                      min={0}
                      max={100}
                      value={discountPct}
                      onChange={(e) => setDiscountPct(Number(e.target.value))}
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
                  <Label htmlFor="terms">Condiciones (aparecen en el PDF)</Label>
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
                    <span>IVA (19%)</span>
                    <span>{fmtCLP(tax)}</span>
                  </div>
                  <div className="mt-2 flex justify-between border-t pt-2 text-base font-semibold">
                    <span>Total</span>
                    <span>{fmtCLP(total)}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => save("draft")}
                    disabled={insert.isPending}
                  >
                    Guardar borrador
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => save("sent")}
                    disabled={insert.isPending}
                  >
                    Enviar
                  </Button>
                </div>
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
          <Table>
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
                  <TableCell className="font-medium">{q.customer_name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(q.created_at).toLocaleDateString("es-CL")}
                  </TableCell>
                  <TableCell>
                    <select
                      value={q.status}
                      onChange={(e) => upd.mutate({ id: q.id, patch: { status: e.target.value } })}
                      className="rounded-md border bg-background px-2 py-1 text-xs"
                    >
                      {Object.entries(statusLabel).map(([k, v]) => (
                        <option key={k} value={k}>
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
                      {q.status === "accepted" && !convertedQuoteIds.has(q.id) && (
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
                      <Button variant="ghost" size="icon" onClick={() => del.mutate(q.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
    </ModuleGuard>
  );
}
