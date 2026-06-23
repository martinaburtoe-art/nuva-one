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
import { Plus, Trash2, Package, X } from "lucide-react";
import { useBizList, useBizInsert, useBizDelete, useBizUpdate, fmtCLP } from "@/lib/biz-data";

export const Route = createFileRoute("/_authenticated/purchases")({
  head: () => ({ meta: [{ title: "Compras — NovaFlow" }] }),
  component: Purchases,
});

type LineItem = { product_id: string | null; name: string; qty: number; price: number };

function Purchases() {
  const { data, isLoading } = useBizList<any>("purchases", { order: "purchase_date" });
  const { data: products } = useBizList<any>("products", { order: "name", ascending: true });
  const insert = useBizInsert("purchases");
  const del = useBizDelete("purchases");
  const upd = useBizUpdate("purchases");
  const [open, setOpen] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [status, setStatus] = useState("pending");
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
      items: validItems as any,
    });
    setOpen(false);
    setSupplierName("");
    setItems([{ product_id: null, name: "", qty: 1, price: 0 }]);
    setManualTotal(null);
  }

  return (
    <>
      <PageHeader
        title="Compras"
        description="Órdenes de compra — al marcarlas como Recibida o Pagada, suma stock y registra el gasto automáticamente"
        action={
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
                          placeholder="Costo unit."
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
                  <TableCell className="text-muted-foreground">
                    {new Date(p.purchase_date).toLocaleDateString("es-CL")}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {Array.isArray(p.items) && p.items.length > 0
                      ? `${p.items.length} producto(s)`
                      : "—"}
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
                    <Button variant="ghost" size="icon" onClick={() => del.mutate(p.id)}>
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
