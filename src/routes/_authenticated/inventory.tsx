import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, EmptyState } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Boxes, AlertTriangle } from "lucide-react";
import { useBizList, useBizInsert, useBizDelete, fmtCLP } from "@/lib/biz-data";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({ meta: [{ title: "Inventario — NovaFlow" }] }),
  component: Inventory,
});

function Inventory() {
  const { data, isLoading } = useBizList<any>("products", { order: "created_at" });
  const insert = useBizInsert("products");
  const del = useBizDelete("products");
  const [open, setOpen] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await insert.mutateAsync({
      sku: fd.get("sku"),
      name: fd.get("name"),
      category: fd.get("category"),
      cost: Number(fd.get("cost")),
      price: Number(fd.get("price")),
      stock: Number(fd.get("stock")),
      low_stock_threshold: Number(fd.get("low_stock_threshold")) || 5,
    });
    setOpen(false);
  }

  const lowStock = (data ?? []).filter((p) => p.stock <= p.low_stock_threshold);

  return (
    <>
      <PageHeader title="Inventario" description="Catálogo de productos y niveles de stock" action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="shadow-elegant"><Plus className="mr-1.5 h-4 w-4" />Agregar producto</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo producto</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label htmlFor="sku">SKU</Label><Input id="sku" name="sku" /></div>
                <div><Label htmlFor="category">Categoría</Label><Input id="category" name="category" /></div>
              </div>
              <div><Label htmlFor="name">Nombre</Label><Input id="name" name="name" required /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label htmlFor="cost">Costo</Label><Input id="cost" name="cost" type="number" min={0} defaultValue={0} /></div>
                <div><Label htmlFor="price">Precio</Label><Input id="price" name="price" type="number" min={0} required /></div>
                <div><Label htmlFor="stock">Stock</Label><Input id="stock" name="stock" type="number" min={0} defaultValue={0} /></div>
              </div>
              <div><Label htmlFor="low_stock_threshold">Alerta stock bajo</Label><Input id="low_stock_threshold" name="low_stock_threshold" type="number" defaultValue={5} /></div>
              <Button type="submit" className="w-full">Guardar</Button>
            </form>
          </DialogContent>
        </Dialog>
      } />

      {lowStock.length > 0 && (
        <Card className="mb-6 border-warning/40 bg-warning/5 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium">{lowStock.length} producto(s) con stock bajo</span>
          </div>
        </Card>
      )}

      <Card>
        {isLoading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : !data || data.length === 0 ? (
          <EmptyState icon={Boxes} title="Tu catálogo está vacío" description="Agrega tu primer producto para empezar a gestionar inventario." />
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Producto</TableHead><TableHead>Categoría</TableHead><TableHead className="text-right">Stock</TableHead><TableHead className="text-right">Precio</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.sku ?? "—"}</TableCell>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.category ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    {p.stock <= p.low_stock_threshold
                      ? <Badge className="bg-warning/15 text-warning">{p.stock} bajo</Badge>
                      : <span className="font-medium">{p.stock}</span>}
                  </TableCell>
                  <TableCell className="text-right">{fmtCLP(Number(p.price))}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => del.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
