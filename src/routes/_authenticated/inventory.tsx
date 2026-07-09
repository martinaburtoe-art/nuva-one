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
import { Plus, Trash2, Pencil, Boxes, AlertTriangle, Download } from "lucide-react";
import { useBizList, useBizInsert, useBizUpdate, useBizDelete, fmtCLP } from "@/lib/biz-data";
import { downloadCsv } from "@/lib/export";

export const Route = createFileRoute("/_authenticated/inventory")({
  head: () => ({ meta: [{ title: "Inventario — Nüva One" }] }),
  component: Inventory,
});

function Inventory() {
  const { data, isLoading } = useBizList<any>("products", { order: "created_at" });
  const insert = useBizInsert("products");
  const upd = useBizUpdate("products");
  const del = useBizDelete("products");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  function openCreate() { setEditing(null); setOpen(true); }
  function openEdit(p: any) { setEditing(p); setOpen(true); }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      sku: fd.get("sku"),
      name: fd.get("name"),
      category: fd.get("category"),
      cost: Number(fd.get("cost")),
      price: Number(fd.get("price")),
      stock: Number(fd.get("stock")),
      low_stock_threshold: Number(fd.get("low_stock_threshold")) || 5,
    };
    if (editing) {
      await upd.mutateAsync({ id: editing.id, patch: payload });
    } else {
      await insert.mutateAsync(payload);
    }
    setOpen(false);
    setEditing(null);
  }

  const lowStock = (data ?? []).filter((p) => p.stock <= p.low_stock_threshold);

  return (
    <>
      <PageHeader title="Inventario" description="Catálogo de productos y niveles de stock" action={
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!data || data.length === 0}
            onClick={() =>
              downloadCsv(
                "inventario.csv",
                (data ?? []).map((p) => ({
                  sku: p.sku ?? "",
                  nombre: p.name,
                  categoria: p.category ?? "",
                  costo: p.cost ?? 0,
                  precio: p.price ?? 0,
                  stock: p.stock ?? 0,
                  alerta_stock_bajo: p.low_stock_threshold ?? 0,
                })),
              )
            }
          >
            <Download className="mr-1.5 h-4 w-4" /> Exportar CSV
          </Button>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild><Button className="shadow-elegant" onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" />Agregar producto</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar producto" : "Nuevo producto"}</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><Label htmlFor="sku">SKU</Label><Input id="sku" name="sku" defaultValue={editing?.sku ?? ""} /></div>
                <div><Label htmlFor="category">Categoría</Label><Input id="category" name="category" defaultValue={editing?.category ?? ""} /></div>
              </div>
              <div><Label htmlFor="name">Nombre</Label><Input id="name" name="name" defaultValue={editing?.name ?? ""} required /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label htmlFor="cost">Costo</Label><Input id="cost" name="cost" type="number" min={0} defaultValue={editing?.cost ?? 0} /></div>
                <div><Label htmlFor="price">Precio</Label><Input id="price" name="price" type="number" min={0} defaultValue={editing?.price ?? ""} required /></div>
                <div><Label htmlFor="stock">Stock</Label><Input id="stock" name="stock" type="number" min={0} defaultValue={editing?.stock ?? 0} /></div>
              </div>
              <div><Label htmlFor="low_stock_threshold">Alerta stock bajo</Label><Input id="low_stock_threshold" name="low_stock_threshold" type="number" defaultValue={editing?.low_stock_threshold ?? 5} /></div>
              {editing && (
                <p className="text-xs text-muted-foreground">
                  Editar el stock aquí es un ajuste manual (conteo físico, merma). Las ventas y compras ya mueven el stock automáticamente.
                </p>
              )}
              <Button type="submit" className="w-full" disabled={insert.isPending || upd.isPending}>
                {editing ? "Guardar cambios" : "Guardar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
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
          <EmptyState icon={Boxes} title="Tu catálogo está vacío" description="Agrega tu primer producto para empezar a gestionar inventario." action={<Button onClick={openCreate}><Plus className="mr-1.5 h-4 w-4" />Agregar producto</Button>} />
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
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => del.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
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
