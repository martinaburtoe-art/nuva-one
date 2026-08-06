import { createFileRoute } from "@tanstack/react-router";
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
import { Plus, Trash2, Package, X, Eye } from "lucide-react";
import { useBizList, useBizInsert, useBizDelete, useBizUpdate, fmtCLP } from "@/lib/biz-data";

export const Route = createFileRoute("/_authenticated/purchases")({
  head: () => ({ meta: [{ title: "Compras — Nüva One" }] }),
  component: Purchases,
});

type LineItem = { product_id: string | null; name: string; qty: number; price: number };

const PURCHASE_CATEGORIES = [
  "Insumos",
  "Mercadería para reventa",
  "Equipamiento",
  "Arriendo",
  "Servicios",
  "Marketing",
  "Otro",
];

const formatCLPInput = (n: number) => `$${new Intl.NumberFormat("es-CL").format(n)}`;
const parseCLPInput = (s: string) => Number(s.replace(/[^0-9]/g, "")) || 0;

import { useMyRole, canWriteOperations } from "@/lib/use-business";

function Purchases() {
  const { data: myRole } = useMyRole();
  const canWrite = canWriteOperations(myRole);
  const { data, isLoading } = useBizList<any>("purchases", { order: "purchase_date" });
  const { data: products } = useBizList<any>("products", { order: "name", ascending: true });
  const insert = useBizInsert("purchases");
  const del = useBizDelete("purchases");
  const upd = useBizUpdate("purchases");
  const [open, setOpen] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [status, setStatus] = useState("pending");
  const [category, setCategory] = useState(PURCHASE_CATEGORIES[0]);
  const [items, setItems] = useState<LineItem[]>([
    { product_id: null, name: "", qty: 1, price: 0 },
  ]);
  const [manualTotal, setManualTotal] = useState<number | null>(null);
  const [detailPurchase, setDetailPurchase] = useState<any | null>(null);

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
        price: Number(p.cost) || copy[idx].price,
      };
    }
    setItems(copy);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validItems = items.filter((i) => i.name.trim() !== "");
    await insert.mutateAsync({
      supplier_name: supplierName,
      total,
      status,
      category,
      items: validItems as any,
    });
    setOpen(false);
    setSupplierName("");
    setItems([{ product_id: null, name: "", qty: 1, price: 0 }]);
    setManualTotal(null);
    setCategory(PURCHASE_CATEGORIES[0]);
  }

  return (
    <ModuleGuard module="purchases">
    <>
      <PageHeader
        title="Compras"
        description="Órdenes de compra — al marcarlas como Recibida o Pagada, suma stock y registra el gasto automáticamente"
        action={
          !canWrite ? undefined : (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-1.5 h-4 w-4" />
                Nueva orden
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nueva orden de compra</DialogTitle>
              </DialogHeader>
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="supplier_name">Proveedor</Label>
                  <Input
                    id="supplier_name"
                    name="supplier_name"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label>Categoría del gasto</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PURCHASE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Esta categoría es la que verás en Finanzas → Gastos por categoría.
                  </p>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <Label>Productos a reabastecer</Label>
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
                              <SelectValue placeholder="Producto del catálogo o producto" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__free__">— Producto —</SelectItem>
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
                        <div className="col-span-2 flex flex-col gap-1">
                          <Input
                            type="number"
                            min={1}
                            value={it.qty}
                            onChange={(e) => {
                              const c = [...items];
                              c[idx].qty = Number(e.target.value);
                              setItems(c);
                            }}
                          />
                          <span className="text-center text-[10px] text-muted-foreground">
                            unidades
                          </span>
                        </div>
                        <Input
                          className="col-span-3"
                          type="text"
                          inputMode="numeric"
                          placeholder="Costo unit."
                          value={it.price ? formatCLPInput(it.price) : ""}
                          onChange={(e) => {
                            const c = [...items];
                            c[idx].price = parseCLPInput(e.target.value);
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

                <div className="flex items-center gap-3 rounded-lg bg-secondary/40 p-4">
                  <Label htmlFor="total" className="shrink-0">
                    Total (CLP)
                  </Label>
                  <Input
                    id="total"
                    type="text"
                    inputMode="numeric"
                    value={total ? formatCLPInput(total) : ""}
                    onChange={(e) => setManualTotal(parseCLPInput(e.target.value))}
                    className="text-right text-base font-semibold"
                  />
                </div>

                <div>
                  <Label>Estado</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="received">Recibida</SelectItem>
                      <SelectItem value="paid">Pagada</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">
                    "Recibida" o "Pagada" suman el stock automáticamente.
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={insert.isPending}>
                  Guardar orden
                </Button>
              </form>
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
            icon={Package}
            title="Sin órdenes de compra"
            description="Registra tu primera orden a un proveedor."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proveedor</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.supplier_name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {p.category ?? "Insumos"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(p.purchase_date).toLocaleDateString("es-CL")}
                  </TableCell>
                  <TableCell className="max-w-[220px] text-xs text-muted-foreground">
                    {Array.isArray(p.items) && p.items.length > 0 ? (
                      <button
                        onClick={() => setDetailPurchase(p)}
                        className="text-left underline-offset-2 hover:text-foreground hover:underline"
                      >
                        <span className="line-clamp-1">
                          {p.items[0].qty}× {p.items[0].name}
                          {p.items.length > 1 ? ` +${p.items.length - 1} más` : ""}
                        </span>
                      </button>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <select
                      value={p.status}
                      onChange={(e) => upd.mutate({ id: p.id, patch: { status: e.target.value } })}
                      className="rounded-md border bg-background px-2 py-1 text-xs"
                    >
                      <option value="pending">Pendiente</option>
                      <option value="received">Recibida</option>
                      <option value="paid">Pagada</option>
                      <option value="cancelled">Cancelada</option>
                    </select>
                  </TableCell>
                  <TableCell className="text-right">{fmtCLP(Number(p.total))}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setDetailPurchase(p)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => del.mutate(p.id)}>
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

      <Dialog open={!!detailPurchase} onOpenChange={(v) => !v && setDetailPurchase(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle de la orden</DialogTitle>
          </DialogHeader>
          {detailPurchase && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Proveedor</div>
                  <div className="font-medium">{detailPurchase.supplier_name ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Categoría</div>
                  <div className="font-medium">{detailPurchase.category ?? "Insumos"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Fecha</div>
                  <div className="font-medium">
                    {new Date(detailPurchase.purchase_date).toLocaleDateString("es-CL")}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Estado</div>
                  <div className="font-medium capitalize">
                    {{ pending: "Pendiente", received: "Recibida", paid: "Pagada", cancelled: "Cancelada" }[
                      detailPurchase.status as string
                    ] ?? detailPurchase.status}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Total</div>
                  <div className="font-semibold">{fmtCLP(Number(detailPurchase.total))}</div>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Productos comprados</Label>
                {Array.isArray(detailPurchase.items) && detailPurchase.items.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Costo unit.</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailPurchase.items.map((it: LineItem, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{it.name}</TableCell>
                          <TableCell className="text-right">
                            {it.qty} unidad{it.qty === 1 ? "" : "es"}
                          </TableCell>
                          <TableCell className="text-right">{fmtCLP(Number(it.price))}</TableCell>
                          <TableCell className="text-right font-medium">
                            {fmtCLP(Number(it.qty) * Number(it.price))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin productos registrados.</p>
                )}
              </div>

              <div className="flex justify-end border-t pt-3 text-base font-bold">
                <span>Total: {fmtCLP(Number(detailPurchase.total))}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
    </ModuleGuard>
  );
}
