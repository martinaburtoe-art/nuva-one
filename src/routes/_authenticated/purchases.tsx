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
import { Plus, Trash2, Package } from "lucide-react";
import { useBizList, useBizInsert, useBizDelete, fmtCLP } from "@/lib/biz-data";

export const Route = createFileRoute("/_authenticated/purchases")({
  head: () => ({ meta: [{ title: "Compras — NovaFlow" }] }),
  component: Purchases,
});

function Purchases() {
  const { data, isLoading } = useBizList<any>("purchases", { order: "purchase_date" });
  const insert = useBizInsert("purchases");
  const del = useBizDelete("purchases");
  const [open, setOpen] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await insert.mutateAsync({
      supplier_name: fd.get("supplier_name"),
      total: Number(fd.get("total")),
      status: fd.get("status"),
    });
    setOpen(false);
  }

  return (
    <>
      <PageHeader title="Compras" description="Órdenes de compra a proveedores" action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-1.5 h-4 w-4" />Nueva orden</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nueva orden de compra</DialogTitle></DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div><Label htmlFor="supplier_name">Proveedor</Label><Input id="supplier_name" name="supplier_name" required /></div>
              <div><Label htmlFor="total">Total (CLP)</Label><Input id="total" name="total" type="number" required /></div>
              <div><Label htmlFor="status">Estado</Label>
                <select name="status" defaultValue="pending" className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm">
                  <option value="pending">Pendiente</option><option value="received">Recibida</option><option value="paid">Pagada</option><option value="cancelled">Cancelada</option>
                </select>
              </div>
              <Button type="submit" className="w-full">Guardar</Button>
            </form>
          </DialogContent>
        </Dialog>
      } />

      <Card>
        {isLoading ? (
          <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : !data || data.length === 0 ? (
          <EmptyState icon={Package} title="Sin órdenes de compra" description="Registra tu primera orden a un proveedor." />
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Proveedor</TableHead><TableHead>Fecha</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Total</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {data.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.supplier_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(p.purchase_date).toLocaleDateString("es-CL")}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{p.status}</Badge></TableCell>
                  <TableCell className="text-right">{fmtCLP(Number(p.total))}</TableCell>
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
