import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, EmptyState } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, ShoppingCart } from "lucide-react";
import { useBizList, useBizInsert, useBizDelete, fmtCLP } from "@/lib/biz-data";

export const Route = createFileRoute("/_authenticated/sales")({
  head: () => ({ meta: [{ title: "Ventas — NovaFlow" }] }),
  component: Sales,
});

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-warning/15 text-warning",
  paid: "bg-success/15 text-success",
  cancelled: "bg-destructive/15 text-destructive",
};

function Sales() {
  const { data: sales, isLoading } = useBizList<any>("sales", { order: "sale_date" });
  const insert = useBizInsert("sales");
  const del = useBizDelete("sales");
  const [open, setOpen] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await insert.mutateAsync({
      customer_name: fd.get("customer_name"),
      channel: fd.get("channel"),
      total: Number(fd.get("total")),
      status: fd.get("status"),
      notes: fd.get("notes") || null,
    });
    setOpen(false);
  }

  return (
    <>
      <PageHeader
        title="Ventas"
        description="Pedidos y transacciones de tu negocio"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-elegant"><Plus className="mr-1.5 h-4 w-4" />Nueva venta</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar venta</DialogTitle></DialogHeader>
              <form onSubmit={onSubmit} className="space-y-4">
                <div><Label htmlFor="customer_name">Cliente</Label><Input id="customer_name" name="customer_name" required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label htmlFor="channel">Canal</Label>
                    <Select name="channel" defaultValue="tienda">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tienda">Tienda</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label htmlFor="status">Estado</Label>
                    <Select name="status" defaultValue="paid">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="paid">Pagada</SelectItem>
                        <SelectItem value="draft">Borrador</SelectItem>
                        <SelectItem value="cancelled">Cancelada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label htmlFor="total">Total (CLP)</Label><Input id="total" name="total" type="number" min={0} required /></div>
                <div><Label htmlFor="notes">Notas</Label><Input id="notes" name="notes" /></div>
                <Button type="submit" className="w-full">Guardar</Button>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        {isLoading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : !sales || sales.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Sin ventas todavía"
            description="Empieza registrando tu primera venta."
            action={<Button onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" />Nueva venta</Button>}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow><TableHead>Cliente</TableHead><TableHead>Fecha</TableHead><TableHead>Canal</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Total</TableHead><TableHead></TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {sales.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.customer_name ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(s.sale_date).toLocaleDateString("es-CL")}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{s.channel}</Badge></TableCell>
                  <TableCell><Badge className={statusColor[s.status]}>{s.status}</Badge></TableCell>
                  <TableCell className="text-right font-medium">{fmtCLP(Number(s.total))}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => del.mutate(s.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
