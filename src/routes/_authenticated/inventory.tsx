import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, Boxes, Download, Pencil, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/page-utils";
import { ModuleGuard } from "@/components/module-guard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtCLP, useBizDelete, useBizInsert, useBizList, useBizUpdate } from "@/lib/biz-data";
import { downloadCsv } from "@/lib/export";
import { canWriteOperations, useActiveBusinessId, useMyRole } from "@/lib/use-business";
import { toast } from "sonner";
import { NuvaInventoryIntelligence } from "@/components/nuva-inventory-intelligence";
import { InventoryActionCenter } from "@/components/inventory-action-center";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({ meta: [{ title: "Inventario — Nüva One" }] }),
  component: Inventory,
});

type Product = {
  id: string;
  name: string | null;
  sku: string | null;
  stock: number | null;
  low_stock_threshold: number | null;
  cost: number | null;
  price: number | null;
};

function Inventory() {
  const { data: myRole } = useMyRole();
  const canWrite = canWriteOperations(myRole);
  const [activeBusinessId] = useActiveBusinessId();
  const { data, isLoading } = useBizList<Product>("products", { order: "created_at" });
  const insert = useBizInsert("products");
  const update = useBizUpdate("products");
  const remove = useBizDelete("products");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const products = data ?? [];
  const lowStock = products.filter((p) => Number(p.stock ?? 0) <= Number(p.low_stock_threshold ?? 0));
  const totalValue = products.reduce((sum, p) => sum + Number(p.stock ?? 0) * Number(p.cost ?? 0), 0);

  function startCreate() {
    setEditing(null);
    setOpen(true);
  }

  function startEdit(product: Product) {
    setEditing(product);
    setOpen(true);
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWrite || !activeBusinessId) return;
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") || "").trim(),
      sku: String(form.get("sku") || "").trim() || null,
      stock: Math.max(0, Number(form.get("stock") || 0)),
      low_stock_threshold: Math.max(0, Number(form.get("low_stock_threshold") || 0)),
      cost: Math.max(0, Number(form.get("cost") || 0)),
      price: Math.max(0, Number(form.get("price") || 0)),
    };
    if (!payload.name) {
      toast.error("Ingresa el nombre del producto.");
      return;
    }
    try {
      if (editing) await update.mutateAsync({ id: editing.id, ...payload });
      else await insert.mutateAsync({ business_id: activeBusinessId, ...payload });
      toast.success(editing ? "Producto actualizado" : "Producto creado");
      setOpen(false);
    } catch {
      toast.error("No se pudo guardar el producto.");
    }
  }

  async function deleteProduct(product: Product) {
    if (!canWrite) return;
    if (!window.confirm(`¿Eliminar ${product.name || "este producto"}?`)) return;
    try {
      await remove.mutateAsync(product.id);
      toast.success("Producto eliminado");
    } catch {
      toast.error("No se pudo eliminar el producto.");
    }
  }

  function exportInventory() {
    downloadCsv(
      "nuva-inventario.csv",
      products.map((p) => ({
        SKU: p.sku || "",
        Producto: p.name || "",
        Stock: Number(p.stock ?? 0),
        Minimo: Number(p.low_stock_threshold ?? 0),
        Costo: Number(p.cost ?? 0),
        Precio: Number(p.price ?? 0),
        ValorCosto: Number(p.stock ?? 0) * Number(p.cost ?? 0),
      })),
    );
  }

  return (
    <ModuleGuard module="inventory">
      <div className="space-y-6">
        <PageHeader
          title="Inventario"
          description="Controla stock, valor inmovilizado y prioridades de reposición desde una sola vista."
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportInventory} disabled={!products.length}>
                <Download className="mr-2 h-4 w-4" /> Exportar
              </Button>
              {canWrite && (
                <Button onClick={startCreate}>
                  <Plus className="mr-2 h-4 w-4" /> Nuevo producto
                </Button>
              )}
            </div>
          }
        />

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-5"><div className="flex items-center gap-3"><Boxes className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Productos</p><p className="text-2xl font-bold">{products.length}</p></div></div></Card>
          <Card className="p-5"><div className="flex items-center gap-3"><AlertTriangle className="h-5 w-5 text-warning" /><div><p className="text-xs text-muted-foreground">Bajo mínimo</p><p className="text-2xl font-bold">{lowStock.length}</p></div></div></Card>
          <Card className="p-5"><div className="flex items-center gap-3"><ShoppingCart className="h-5 w-5 text-primary" /><div><p className="text-xs text-muted-foreground">Valor a costo</p><p className="text-2xl font-bold">{fmtCLP(totalValue)}</p></div></div></Card>
        </div>

        <NuvaInventoryIntelligence products={products} />
        <InventoryActionCenter products={products} canWrite={canWrite} />

        <Card>
          <div className="p-6">
            <div className="mb-4"><h2 className="text-lg font-semibold">Catálogo de productos</h2><p className="text-sm text-muted-foreground">Gestiona existencias y parámetros de reposición.</p></div>
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : products.length === 0 ? (
              <EmptyState title="Sin productos" description="Agrega tu primer producto para activar la inteligencia de inventario." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Producto</TableHead><TableHead>SKU</TableHead><TableHead>Stock</TableHead><TableHead>Mínimo</TableHead><TableHead>Costo</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
                  <TableBody>{products.map((product) => {
                    const stock = Number(product.stock ?? 0);
                    const minimum = Number(product.low_stock_threshold ?? 0);
                    const critical = stock === 0;
                    const low = stock <= minimum;
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name || "Sin nombre"}</TableCell>
                        <TableCell>{product.sku || "—"}</TableCell>
                        <TableCell className="font-semibold">{stock}</TableCell>
                        <TableCell>{minimum}</TableCell>
                        <TableCell>{fmtCLP(Number(product.cost ?? 0))}</TableCell>
                        <TableCell><Badge variant={critical ? "destructive" : low ? "secondary" : "outline"}>{critical ? "Sin stock" : low ? "Bajo mínimo" : "Saludable"}</Badge></TableCell>
                        <TableCell><div className="flex justify-end gap-1">{canWrite && <><Button size="icon" variant="ghost" onClick={() => startEdit(product)}><Pencil className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => deleteProduct(product)}><Trash2 className="h-4 w-4" /></Button></>}</div></TableCell>
                      </TableRow>
                    );
                  })}</TableBody>
                </Table>
              </div>
            )}
          </div>
        </Card>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar producto" : "Nuevo producto"}</DialogTitle></DialogHeader>
            <form onSubmit={saveProduct} className="space-y-4">
              <div><Label htmlFor="name">Producto</Label><Input id="name" name="name" defaultValue={editing?.name ?? ""} required /></div>
              <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="sku">SKU</Label><Input id="sku" name="sku" defaultValue={editing?.sku ?? ""} /></div><div><Label htmlFor="stock">Stock</Label><Input id="stock" name="stock" type="number" min="0" defaultValue={editing?.stock ?? 0} /></div></div>
              <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="low_stock_threshold">Mínimo</Label><Input id="low_stock_threshold" name="low_stock_threshold" type="number" min="0" defaultValue={editing?.low_stock_threshold ?? 0} /></div><div><Label htmlFor="cost">Costo</Label><Input id="cost" name="cost" type="number" min="0" defaultValue={editing?.cost ?? 0} /></div></div>
              <div><Label htmlFor="price">Precio de venta</Label><Input id="price" name="price" type="number" min="0" defaultValue={editing?.price ?? 0} /></div>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit">Guardar</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ModuleGuard>
  );
}
