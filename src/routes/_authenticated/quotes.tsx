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
import { Plus, Trash2, FileText, X } from "lucide-react";
import { useBizList, useBizInsert, useBizUpdate, useBizDelete, fmtCLP } from "@/lib/biz-data";

export const Route = createFileRoute("/_authenticated/quotes")({
  head: () => ({ meta: [{ title: "Cotizaciones — NovaFlow" }] }),
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

type Item = { name: string; qty: number; price: number };

function Quotes() {
  const { data, isLoading } = useBizList<any>("quotes", { order: "created_at" });
  const insert = useBizInsert("quotes");
  const upd = useBizUpdate("quotes");
  const del = useBizDelete("quotes");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([{ name: "", qty: 1, price: 0 }]);
  const [customer, setCustomer] = useState("");

  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const tax = Math.round(subtotal * 0.19);
  const total = subtotal + tax;

  async function save(status = "draft") {
    if (!customer || items.length === 0) return;
    await insert.mutateAsync({
      customer_name: customer,
      items: items as any,
      subtotal, tax, total, status,
    });
    setItems([{ name: "", qty: 1, price: 0 }]); setCustomer(""); setOpen(false);
  }

  return (
    <>
      <PageHeader title="Cotizaciones" description="Crea y envía cotizaciones profesionales en segundos" action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="shadow-elegant"><Plus className="mr-1.5 h-4 w-4" />Nueva cotización</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Nueva cotización</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label htmlFor="customer">Cliente</Label><Input id="customer" value={customer} onChange={(e) => setCustomer(e.target.value)} /></div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>Items</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => setItems([...items, { name: "", qty: 1, price: 0 }])}>
                    <Plus className="mr-1 h-3 w-3" />Agregar línea
                  </Button>
                </div>
                <div className="space-y-2">
                  {items.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2">
                      <Input className="col-span-6" placeholder="Descripción" value={it.name} onChange={(e) => { const c = [...items]; c[idx].name = e.target.value; setItems(c); }} />
                      <Input className="col-span-2" type="number" min={1} value={it.qty} onChange={(e) => { const c = [...items]; c[idx].qty = Number(e.target.value); setItems(c); }} />
                      <Input className="col-span-3" type="number" min={0} placeholder="Precio" value={it.price} onChange={(e) => { const c = [...items]; c[idx].price = Number(e.target.value); setItems(c); }} />
                      <Button type="button" size="icon" variant="ghost" className="col-span-1" onClick={() => setItems(items.filter((_, i) => i !== idx))}><X className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-secondary/40 p-4">
                <div className="flex justify-between text-sm"><span>Subtotal</span><span>{fmtCLP(subtotal)}</span></div>
                <div className="flex justify-between text-sm"><span>IVA (19%)</span><span>{fmtCLP(tax)}</span></div>
                <div className="mt-2 flex justify-between border-t pt-2 text-base font-semibold"><span>Total</span><span>{fmtCLP(total)}</span></div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => save("draft")}>Guardar borrador</Button>
                <Button className="flex-1" onClick={() => save("sent")}>Enviar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      } />

      <Card>
        {isLoading ? <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          : !data || data.length === 0 ? <EmptyState icon={FileText} title="Sin cotizaciones" description="Crea tu primera cotización profesional." />
          : <Table>
            <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Fecha</TableHead><TableHead>Estado</TableHead><TableHead className="text-right">Total</TableHead><TableHead /></TableRow></TableHeader>
            <TableBody>
              {data.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium">{q.customer_name}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(q.created_at).toLocaleDateString("es-CL")}</TableCell>
                  <TableCell>
                    <select value={q.status} onChange={(e) => upd.mutate({ id: q.id, patch: { status: e.target.value } })} className="rounded-md border bg-background px-2 py-1 text-xs">
                      {Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
                    </select>
                  </TableCell>
                  <TableCell className="text-right font-medium">{fmtCLP(Number(q.total))}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" onClick={() => del.mutate(q.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        }
      </Card>
    </>
  );
}
