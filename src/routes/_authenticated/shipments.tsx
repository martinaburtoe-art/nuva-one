import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness, useMyMembership } from "@/lib/use-business";
import { ArrowLeft, CheckCircle2, Clock3, MapPin, Package, Plus, RefreshCw, Search, Truck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/shipments")({
  component: ShipmentsPage,
});

type ShipmentStatus = "preparing" | "dispatched" | "in_transit" | "delivered" | "delayed" | "cancelled";

type Shipment = {
  id: string;
  sale_id: string | null;
  customer_id: string | null;
  status: ShipmentStatus;
  carrier: string | null;
  tracking_number: string | null;
  shipping_address: string | null;
  eta: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  notes: string | null;
  created_at: string;
  customer?: { name: string } | null;
  sale?: { id: string } | null;
};

const labels: Record<ShipmentStatus, string> = {
  preparing: "Preparando",
  dispatched: "Despachado",
  in_transit: "En tránsito",
  delivered: "Entregado",
  delayed: "Atrasado",
  cancelled: "Cancelado",
};

const statusStyles: Record<ShipmentStatus, string> = {
  preparing: "bg-amber-50 text-amber-700 border-amber-200",
  dispatched: "bg-violet-50 text-violet-700 border-violet-200",
  in_transit: "bg-blue-50 text-blue-700 border-blue-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  delayed: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
};

function ShipmentsPage() {
  const { active } = useActiveBusiness();
  const { data: membership } = useMyMembership();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ carrier: "", tracking_number: "", shipping_address: "", eta: "", notes: "" });

  const shipmentsQuery = useQuery({
    enabled: !!active?.id,
    queryKey: ["shipments", active?.id],
    queryFn: async () => {
      const client = supabase as any;
      const { data, error } = await client
        .from("shipments")
        .select("id, sale_id, customer_id, status, carrier, tracking_number, shipping_address, eta, dispatched_at, delivered_at, notes, created_at, customer:customers(name), sale:sales(id)")
        .eq("business_id", active!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Shipment[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!active?.id) throw new Error("Selecciona un negocio activo.");
      const client = supabase as any;
      const { error } = await client.from("shipments").insert({
        business_id: active.id,
        status: "preparing",
        carrier: form.carrier || null,
        tracking_number: form.tracking_number || null,
        shipping_address: form.shipping_address || null,
        eta: form.eta || null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setForm({ carrier: "", tracking_number: "", shipping_address: "", eta: "", notes: "" });
      setShowCreate(false);
      await queryClient.invalidateQueries({ queryKey: ["shipments", active?.id] });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ shipment, status }: { shipment: Shipment; status: ShipmentStatus }) => {
      const client = supabase as any;
      const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (status === "dispatched" || status === "in_transit") patch.dispatched_at = shipment.dispatched_at ?? new Date().toISOString();
      if (status === "delivered") patch.delivered_at = new Date().toISOString();
      const { error } = await client.from("shipments").update(patch).eq("id", shipment.id).eq("business_id", active!.id);
      if (error) throw error;
      const { error: eventError } = await client.from("shipment_events").insert({ shipment_id: shipment.id, business_id: active!.id, status, note: `Estado actualizado a ${labels[status]}` });
      if (eventError) throw eventError;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shipments", active?.id] }),
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (shipmentsQuery.data ?? []).filter((s) => !q || [s.id, s.tracking_number, s.carrier, s.shipping_address, s.customer?.name, s.sale_id].some((v) => String(v ?? "").toLowerCase().includes(q)));
  }, [shipmentsQuery.data, search]);

  const summary = useMemo(() => {
    const all = shipmentsQuery.data ?? [];
    return [
      { label: "Por preparar", value: all.filter((s) => s.status === "preparing").length, icon: Package },
      { label: "En tránsito", value: all.filter((s) => s.status === "in_transit" || s.status === "dispatched").length, icon: Truck },
      { label: "Entregados", value: all.filter((s) => s.status === "delivered").length, icon: CheckCircle2 },
      { label: "Atrasados", value: all.filter((s) => s.status === "delayed").length, icon: Clock3 },
    ];
  }, [shipmentsQuery.data]);

  const canWrite = membership?.role === "owner" || membership?.role === "admin" || membership?.role === "staff";

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to="/dashboard" className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Volver al dashboard</Link>
          <h1 className="text-3xl font-semibold tracking-tight">Envíos & Entregas</h1>
          <p className="mt-1 text-muted-foreground">Controla preparación, despacho, trazabilidad y entrega desde un solo lugar.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => shipmentsQuery.refetch()} disabled={shipmentsQuery.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${shipmentsQuery.isFetching ? "animate-spin" : ""}`} /> Actualizar</Button>
          {canWrite && <Button onClick={() => setShowCreate((v) => !v)}><Plus className="mr-2 h-4 w-4" /> Nuevo envío</Button>}
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary.map(({ label, value, icon: Icon }) => <Card key={label} className="rounded-2xl p-5"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{label}</span><Icon className="h-5 w-5 text-muted-foreground" /></div><div className="mt-3 text-3xl font-semibold">{value}</div></Card>)}
      </section>

      {showCreate && canWrite && <Card className="rounded-2xl p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-semibold">Crear envío</h2><p className="text-sm text-muted-foreground">Puedes asociarlo a una venta desde la operación correspondiente.</p></div><Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}><XCircle className="h-4 w-4" /></Button></div><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4"><input className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Transportista" value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} /><input className="rounded-lg border bg-background px-3 py-2 text-sm" placeholder="Nº seguimiento" value={form.tracking_number} onChange={(e) => setForm({ ...form, tracking_number: e.target.value })} /><input className="rounded-lg border bg-background px-3 py-2 text-sm lg:col-span-2" placeholder="Dirección de entrega" value={form.shipping_address} onChange={(e) => setForm({ ...form, shipping_address: e.target.value })} /><input type="date" className="rounded-lg border bg-background px-3 py-2 text-sm" value={form.eta} onChange={(e) => setForm({ ...form, eta: e.target.value })} /><input className="rounded-lg border bg-background px-3 py-2 text-sm md:col-span-2 lg:col-span-3" placeholder="Notas" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /><Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>{createMutation.isPending ? "Creando…" : "Crear envío"}</Button></div>{createMutation.error && <p className="mt-3 text-sm text-destructive">{(createMutation.error as Error).message}</p>}</Card>}

      <div className="flex flex-wrap items-center justify-between gap-3"><div className="relative w-full max-w-md"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm" placeholder="Buscar cliente, tracking, dirección…" value={search} onChange={(e) => setSearch(e.target.value)} /></div><span className="text-sm text-muted-foreground">{rows.length} envío{rows.length === 1 ? "" : "s"}</span></div>

      {shipmentsQuery.error ? <Card className="rounded-2xl border-amber-200 bg-amber-50/50 p-6"><h2 className="font-semibold">Conexión de Envíos pendiente</h2><p className="mt-1 text-sm text-muted-foreground">La interfaz está lista, pero la tabla de envíos todavía no está disponible en la base conectada. No mostramos datos ficticios para evitar confundirlos con información real.</p><p className="mt-3 text-xs text-muted-foreground">Detalle técnico: {(shipmentsQuery.error as Error).message}</p></Card> : <Card className="rounded-2xl"><div className="border-b p-5"><h2 className="font-semibold">Operación de entregas</h2><p className="mt-1 text-sm text-muted-foreground">Trazabilidad por envío y actualización del estado.</p></div><div className="divide-y">{rows.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">No hay envíos registrados todavía.</div> : rows.map((shipment) => <article key={shipment.id} className="grid gap-4 p-5 lg:grid-cols-[1.1fr_1fr_1.3fr_1fr_auto] lg:items-center"><div><div className="font-medium">{shipment.id}{shipment.sale_id ? ` · Venta ${shipment.sale_id}` : ""}</div><div className="text-sm text-muted-foreground">{shipment.customer?.name ?? "Cliente pendiente"}</div></div><div className="flex items-start gap-2 text-sm"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />{shipment.shipping_address ?? "Dirección pendiente"}</div><div className="text-sm"><div>{shipment.carrier ?? "Transportista pendiente"}</div><div className="text-muted-foreground">Tracking: {shipment.tracking_number ?? "—"}</div></div><div className="text-sm"><span className="text-muted-foreground">ETA:</span> {shipment.eta ? new Date(`${shipment.eta}T12:00:00`).toLocaleDateString("es-CL") : "Pendiente"}<div className={`mt-1 w-fit rounded-full border px-2.5 py-1 text-xs font-medium ${statusStyles[shipment.status]}`}>{labels[shipment.status]}</div></div><div className="flex flex-wrap gap-1">{canWrite && shipment.status === "preparing" && <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ shipment, status: "dispatched" })}>Despachar</Button>}{canWrite && (shipment.status === "dispatched" || shipment.status === "in_transit") && <Button size="sm" variant="outline" onClick={() => statusMutation.mutate({ shipment, status: "delivered" })}>Entregado</Button>}</div></article>)}</div></Card>}

      <section className="rounded-2xl border bg-muted/30 p-5 text-sm text-muted-foreground"><strong className="text-foreground">Flujo operativo:</strong> Venta → Preparación → Despacho → En tránsito → Entrega. Cada cambio de estado genera un evento de trazabilidad para construir posteriormente el historial y tracking del cliente.</section>
    </main>
  );
}
