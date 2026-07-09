import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, EmptyState } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Trash2, ShoppingCart, X } from "lucide-react";
import { useBizList, useBizInsert, useBizDelete, useBizUpdate, fmtCLP } from "@/lib/biz-data";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({ meta: [{ title: "Ventas — Nüva One" }] }),
  component: Sales,
});

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-warning/15 text-warning",
  paid: "bg-success/15 text-success",
  cancelled: "bg-destructive/15 text-destructive",
};

type LineItem = { product_id: string | null; name: string; qty: number; price: number };

function Sales() {
  const { data: sales, isLoading } = useBizList<any>("sales", { order: "sale_date" });
  const { data: products } = useBizList<any>("products", { order: "name", ascending: true });
  const insert = useBizInsert("sales");
  const del = useBizDelete("sales");
  const upd = useBizUpdate("sales");
  const [open, setOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [channel, setChannel] = useState("tienda");
  const [status, setStatus] = useState("paid");
  const [items, setItems] = useState<LineItem[]>([
    { product_id: null, name: "", qty: 1, price: 0 },
  ]);
  const [manualTotal, setManualTotal] = useState<number | null>(null);

  const computedTotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const total = manualTotal ?? computedTotal;

  function pickProduct(idx: number, productId: string) {
    const p = (products ?? []).find((x: any) => x.id === productId);
    const copy = [...items];
    if (p) {
      copy[idx] = {
        product_id: p.id,
        name: p.name,
        qty: copy[idx].qty || 1,
        price: Number(p.price),
      };
    }
    setItems(copy);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const validItems = items.filter((i) => i.name.trim() !== "");
    await insert.mutateAsync({
      customer_name: customerName,
      channel,
      status,
      total,
      items: validItems as any,
      notes: fd.get("notes") || null,
    });
    setOpen(false);
    setCustomerName("");
    setItems([{ product_id: null, name: "", qty: 1, price: 0 }]);
    setManualTotal(null);
  }

  // Stock available for the currently selected product in a row (excluding what's already allocated in other rows)
  function stockHint(productId: string | null) {
    if (!productId) return null;
    const p = (products ?? []).find((x: any) => x.id === productId);
    return p ? p.stock : null;
  }

  return (
    <>
      <PageHeader
        title="Ventas"
        description="Pedidos y transacciones — se conecta automáticamente con Inventario y Finanzas"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-elegant">
                <Plus className="mr-1.5 h-4 w-4" />
                Nueva venta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Registrar venta</DialogTitle>
              </DialogHeader>
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="customer_name">Cliente</Label>
                  <Input
                    id="customer_name"
                    name="customer_name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Canal</Label>
                    <Select value={channel} onValueChange={setChannel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tienda">Tienda</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="paid">Pagada</SelectItem>
                        <SelectItem value="draft">Borrador</SelectItem>
                        <SelectItem value="cancelled">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Label>Productos (opcional, descuenta stock automáticamente)</Label>
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
                        <div className="col-span-5">
                          <Select
                            value={it.product_id ?? "__free__"}
                            onValueChange={(v) => (v === "__free__" ? null : pickProduct(idx, v))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Producto del catálogo o texto libre" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__free__">— Texto libre —</SelectItem>
                              {(products ?? []).map((p: any) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} ({p.stock} en stock)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {it.product_id === null && (
                            <Input
                              className="mt-1"
                              placeholder="Descripción"
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
                          max={it.product_id ? (stockHint(it.product_id) ?? undefined) : undefined}
                          onChange={(e) => {
                            const c = [...items];
                            c[idx].qty = Number(e.target.value);
                            setItems(c);
                          }}
                        />
                        <Input
                          className="col-span-3"
                          type="number"
                          min={0}
                          placeholder="Precio"
                          value={it.price}
                          onChange={(e) => {
                            const c = [...items];
                            c[idx].price = Number(e.target.value);
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
                        {it.product_id && it.qty > (stockHint(it.product_id) ?? Infinity) && (
                          <p className="col-span-12 -mt-1 text-xs text-destructive">
                            Stock insuficiente: solo quedan {stockHint(it.product_id)} unidades.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg bg-secondary/40 p-4">
                  <Label htmlFor="total" className="shrink-0">
                    Total (CLP)
                  </Label>
                  <Input
                    id="total"
                    type="number"
                    min={0}
                    value={total}
                    onChange={(e) => setManualTotal(Number(e.target.value))}
                    className="text-right text-base font-semibold"
                  />
                </div>
                <div>
                  <Label htmlFor="notes">Notas</Label>
                  <Input id="notes" name="notes" />
                </div>
                <Button type="submit" className="w-full" disabled={insert.isPending}>
                  Guardar venta
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !sales || sales.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Sin ventas todavía"
            description="Empieza registrando tu primera venta."
            action={
              <Button onClick={() => setOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Nueva venta
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.customer_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(s.sale_date).toLocaleDateString("es-CL")}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {s.channel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {Array.isArray(s.items) && s.items.length > 0
                      ? `${s.items.length} producto(s)`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <select
                      value={s.status}
                      onChange={(e) => upd.mutate({ id: s.id, patch: { status: e.target.value } })}
                      className="rounded-md border bg-background px-2 py-1 text-xs"
                    >
                      <option value="pending">Pendiente</option>
                      <option value="paid">Pagada</option>
                      <option value="draft">Borrador</option>
                      <option value="cancelled">Cancelada</option>
                    </select>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {fmtCLP(Number(s.total))}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => del.mutate(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
