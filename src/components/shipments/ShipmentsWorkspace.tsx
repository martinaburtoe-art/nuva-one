import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness, useMyMembership } from "@/lib/use-business";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CheckCircle2,
  Clock3,
  Copy,
  MapPin,
  Package,
  RefreshCw,
  Search,
  Truck,
  XCircle,
  Zap,
} from "lucide-react";

type ShipmentStatus =
  | "preparing"
  | "dispatched"
  | "in_transit"
  | "delivered"
  | "delayed"
  | "cancelled";
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
type Event = {
  shipment_id: string;
  status: ShipmentStatus;
  note: string | null;
  created_at: string;
};

const labels: Record<ShipmentStatus, string> = {
  preparing: "Preparando",
  dispatched: "Despachado",
  in_transit: "En tránsito",
  delivered: "Entregado",
  delayed: "Atrasado",
  cancelled: "Cancelado",
};
const styles: Record<ShipmentStatus, string> = {
  preparing: "bg-amber-50 text-amber-700 border-amber-200",
  dispatched: "bg-violet-50 text-violet-700 border-violet-200",
  in_transit: "bg-blue-50 text-blue-700 border-blue-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  delayed: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
};
const nextActions: Record<ShipmentStatus, ShipmentStatus[]> = {
  preparing: ["dispatched"],
  dispatched: ["in_transit", "delayed"],
  in_transit: ["delivered", "delayed"],
  delivered: [],
  delayed: ["in_transit", "delivered"],
  cancelled: [],
};

function isOverdue(s: Shipment) {
  return (
    !!s.eta &&
    !["delivered", "cancelled"].includes(s.status) &&
    new Date(`${s.eta}T23:59:59`).getTime() < Date.now()
  );
}
function formatDate(value: string | null) {
  return value
    ? new Date(`${value.length === 10 ? value + "T12:00:00" : value}`).toLocaleDateString("es-CL")
    : "Pendiente";
}

export function ShipmentsWorkspace() {
  const { active } = useActiveBusiness();
  const { data: membership } = useMyMembership();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | ShipmentStatus | "overdue">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({
    sale_id: "",
    carrier: "",
    tracking_number: "",
    shipping_address: "",
    eta: "",
    notes: "",
  });
  const [showCreate, setShowCreate] = useState(false);
  const canWrite =
    membership?.role === "owner" || membership?.role === "admin" || membership?.role === "staff";
  const shipmentsQuery = useQuery({
    enabled: !!active?.id,
    queryKey: ["shipments", active?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("shipments")
        .select(
          "id,sale_id,customer_id,status,carrier,tracking_number,shipping_address,eta,dispatched_at,delivered_at,notes,created_at,customer:customers(name),sale:sales(id)",
        )
        .eq("business_id", active!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Shipment[];
    },
  });
  const eventsQuery = useQuery({
    enabled: !!active?.id,
    queryKey: ["shipment-events", active?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("shipment_events")
        .select("shipment_id,status,note,created_at")
        .eq("business_id", active!.id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as Event[];
    },
  });
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!active?.id) throw new Error("Selecciona un negocio activo.");
      const { error } = await (supabase as any).from("shipments").insert({
        business_id: active.id,
        sale_id: form.sale_id || null,
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
      setForm({
        sale_id: "",
        carrier: "",
        tracking_number: "",
        shipping_address: "",
        eta: "",
        notes: "",
      });
      setShowCreate(false);
      await qc.invalidateQueries({ queryKey: ["shipments", active?.id] });
    },
  });
  const statusMutation = useMutation({
    mutationFn: async ({ shipment, status }: { shipment: Shipment; status: ShipmentStatus }) => {
      const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (status === "dispatched" || status === "in_transit")
        patch.dispatched_at = shipment.dispatched_at ?? new Date().toISOString();
      if (status === "delivered") patch.delivered_at = new Date().toISOString();
      if (status !== "delivered") patch.delivered_at = null;
      const { error } = await (supabase as any)
        .from("shipments")
        .update(patch)
        .eq("id", shipment.id)
        .eq("business_id", active!.id);
      if (error) throw error;
      const { error: eventError } = await (supabase as any).from("shipment_events").insert({
        shipment_id: shipment.id,
        business_id: active!.id,
        status,
        note: `Estado actualizado a ${labels[status]}`,
      });
      if (eventError) throw eventError;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipments", active?.id] });
      qc.invalidateQueries({ queryKey: ["shipment-events", active?.id] });
    },
  });
  const eventsByShipment = useMemo(() => {
    const m = new Map<string, Event[]>();
    for (const e of eventsQuery.data ?? []) {
      const a = m.get(e.shipment_id) ?? [];
      a.push(e);
      m.set(e.shipment_id, a);
    }
    return m;
  }, [eventsQuery.data]);
  const all = shipmentsQuery.data ?? [];
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((s) => {
      const matchesSearch =
        !q ||
        [s.id, s.tracking_number, s.carrier, s.shipping_address, s.customer?.name, s.sale_id].some(
          (v) =>
            String(v ?? "")
              .toLowerCase()
              .includes(q),
        );
      const matchesFilter =
        filter === "all" || (filter === "overdue" ? isOverdue(s) : s.status === filter);
      return matchesSearch && matchesFilter;
    });
  }, [all, search, filter]);
  const selectedShipment = all.find((s) => s.id === selected) ?? null;
  const stats = useMemo(() => {
    const activeShip = all.filter((s) => !["delivered", "cancelled"].includes(s.status));
    const delivered = all.filter((s) => s.status === "delivered");
    const onTime = delivered.filter(
      (s) =>
        s.eta &&
        s.delivered_at &&
        new Date(s.delivered_at).getTime() <= new Date(`${s.eta}T23:59:59`).getTime(),
    ).length;
    return {
      total: all.length,
      preparing: all.filter((s) => s.status === "preparing").length,
      inTransit: all.filter((s) => ["dispatched", "in_transit"].includes(s.status)).length,
      delivered: delivered.length,
      overdue: all.filter(isOverdue).length,
      onTime: delivered.length ? Math.round((onTime / delivered.length) * 100) : 0,
      active: activeShip.length,
    };
  }, [all]);
  const latestEvent = (id: string) => eventsByShipment.get(id)?.[0];
  const copyTracking = async (value: string | null) => {
    if (value) await navigator.clipboard?.writeText(value);
  };
  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <Truck className="h-4 w-4" /> Operación logística
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Envíos & Entregas</h1>
          <p className="mt-1 text-muted-foreground">
            Un centro operativo para preparar, despachar, rastrear y cerrar cada entrega.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              shipmentsQuery.refetch();
              eventsQuery.refetch();
            }}
            disabled={shipmentsQuery.isFetching}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${shipmentsQuery.isFetching ? "animate-spin" : ""}`}
            />
            Actualizar
          </Button>
          {canWrite && (
            <Button onClick={() => setShowCreate((v) => !v)}>
              <Package className="mr-2 h-4 w-4" />
              Nuevo envío
            </Button>
          )}
        </div>
      </header>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[
          ["Total", stats.total, Package, "all"],
          ["Por preparar", stats.preparing, Clock3, "preparing"],
          ["En tránsito", stats.inTransit, Truck, "in_transit"],
          ["Entregados", stats.delivered, CheckCircle2, "delivered"],
          ["Atrasados", stats.overdue, Zap, "overdue"],
          ["A tiempo", `${stats.onTime}%`, CheckCircle2, "all"],
        ].map(([label, value, Icon, key]) => (
          <button key={String(label)} onClick={() => setFilter(key as any)} className="text-left">
            <Card
              className={`rounded-2xl p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${filter === key ? "ring-2 ring-primary/20" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{label}</span>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-2 text-2xl font-semibold">{value}</div>
            </Card>
          </button>
        ))}
      </section>
      {showCreate && canWrite && (
        <Card className="rounded-2xl border-primary/20 p-5">
          <div className="mb-4 flex justify-between">
            <div>
              <h2 className="font-semibold">Nuevo envío</h2>
              <p className="text-sm text-muted-foreground">
                Registra la operación desde el inicio y agrega tracking cuando esté disponible.
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowCreate(false)}>
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
            {[
              ["Venta / ID", "sale_id"],
              ["Transportista", "carrier"],
              ["Nº seguimiento", "tracking_number"],
              ["Dirección", "shipping_address"],
              ["ETA", "eta"],
              ["Notas", "notes"],
            ].map(([ph, key]) => (
              <input
                key={key}
                type={key === "eta" ? "date" : "text"}
                className={`rounded-lg border bg-background px-3 py-2 text-sm ${key === "shipping_address" || key === "notes" ? "lg:col-span-2" : ""}`}
                placeholder={ph}
                value={(form as any)[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            ))}
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="lg:col-span-6"
            >
              {createMutation.isPending ? "Creando…" : "Crear envío"}
            </Button>
          </div>
          {createMutation.error && (
            <p className="mt-3 text-sm text-destructive">
              {(createMutation.error as Error).message}
            </p>
          )}
        </Card>
      )}
      <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card className="overflow-hidden rounded-2xl">
          <div className="border-b p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm"
                  placeholder="Buscar cliente, tracking, dirección o venta…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <span className="text-sm text-muted-foreground">
                {rows.length} resultado{rows.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  "all",
                  "preparing",
                  "dispatched",
                  "in_transit",
                  "delivered",
                  "delayed",
                  "cancelled",
                  "overdue",
                ] as const
              ).map((k) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`rounded-full border px-3 py-1 text-xs ${filter === k ? "bg-foreground text-background" : "bg-background text-muted-foreground"}`}
                >
                  {k === "all"
                    ? "Todos"
                    : k === "overdue"
                      ? "Atrasados"
                      : labels[k as ShipmentStatus]}
                </button>
              ))}
            </div>
          </div>
          {shipmentsQuery.error ? (
            <div className="p-8 text-sm">
              <strong>Conexión de Envíos pendiente.</strong>
              <p className="mt-1 text-muted-foreground">
                La tabla conectada no está disponible. Nüva no muestra datos ficticios.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {(shipmentsQuery.error as Error).message}
              </p>
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No hay envíos que coincidan con este filtro.
            </div>
          ) : (
            <div className="divide-y">
              {rows.map((s) => (
                <article
                  key={s.id}
                  onClick={() => setSelected(s.id)}
                  className={`cursor-pointer p-5 transition hover:bg-muted/30 ${isOverdue(s) ? "border-l-4 border-l-red-400" : ""}`}
                >
                  <div className="grid gap-4 lg:grid-cols-[1.2fr_1.2fr_1fr_1fr_auto] lg:items-center">
                    <div>
                      <div className="font-medium">{s.customer?.name ?? "Cliente pendiente"}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.id}
                        {s.sale_id ? ` · Venta ${s.sale_id}` : ""}
                      </div>
                    </div>
                    <div className="flex gap-2 text-sm">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="line-clamp-2">
                        {s.shipping_address ?? "Dirección pendiente"}
                      </span>
                    </div>
                    <div className="text-sm">
                      <div>{s.carrier ?? "Transportista pendiente"}</div>
                      <button
                        className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyTracking(s.tracking_number);
                        }}
                      >
                        Tracking: {s.tracking_number ?? "—"}{" "}
                        {s.tracking_number && <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                    <div>
                      <div className="text-sm">ETA: {formatDate(s.eta)}</div>
                      <span
                        className={`mt-1 inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${styles[s.status]}`}
                      >
                        {isOverdue(s) ? "Atrasado · " : ""}
                        {labels[s.status]}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                      {canWrite &&
                        nextActions[s.status].map((a) => (
                          <Button
                            key={a}
                            size="sm"
                            variant="outline"
                            disabled={statusMutation.isPending}
                            onClick={() => statusMutation.mutate({ shipment: s, status: a })}
                          >
                            {labels[a]}
                          </Button>
                        ))}
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    {latestEvent(s.id)
                      ? `Último evento: ${latestEvent(s.id)?.note ?? labels[latestEvent(s.id)!.status]} · ${new Date(latestEvent(s.id)!.created_at).toLocaleString("es-CL")}`
                      : "Sin eventos registrados"}
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>
        <aside className="space-y-4">
          {selectedShipment ? (
            <Card className="rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    Detalle operativo
                  </span>
                  <h2 className="mt-1 font-semibold">
                    {selectedShipment.customer?.name ?? "Cliente pendiente"}
                  </h2>
                </div>
                <button onClick={() => setSelected(null)}>
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="mt-5 space-y-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Estado</span>
                  <div
                    className={`mt-1 w-fit rounded-full border px-2.5 py-1 text-xs ${styles[selectedShipment.status]}`}
                  >
                    {labels[selectedShipment.status]}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Destino</span>
                  <p className="mt-1">{selectedShipment.shipping_address ?? "Pendiente"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Transportista</span>
                  <p className="mt-1">{selectedShipment.carrier ?? "Pendiente"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">ETA</span>
                  <p
                    className={`mt-1 ${isOverdue(selectedShipment) ? "font-semibold text-red-600" : ""}`}
                  >
                    {formatDate(selectedShipment.eta)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Notas</span>
                  <p className="mt-1">{selectedShipment.notes ?? "Sin notas"}</p>
                </div>
              </div>
              <div className="mt-5 border-t pt-4">
                <h3 className="text-sm font-medium">Historial</h3>
                <div className="mt-3 space-y-3">
                  {(eventsByShipment.get(selectedShipment.id) ?? []).slice(0, 8).map((e, i) => (
                    <div key={`${e.created_at}-${i}`} className="relative pl-4 text-xs">
                      <span className="absolute left-0 top-1 h-2 w-2 rounded-full bg-primary" />
                      <div className="font-medium">{labels[e.status]}</div>
                      <div className="text-muted-foreground">
                        {e.note ?? "Actualización"} ·{" "}
                        {new Date(e.created_at).toLocaleString("es-CL")}
                      </div>
                    </div>
                  ))}
                  {!eventsByShipment.get(selectedShipment.id)?.length && (
                    <p className="text-xs text-muted-foreground">Aún no hay historial.</p>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="rounded-2xl bg-muted/30 p-5">
              <div className="flex items-center gap-2 font-medium">
                <Zap className="h-4 w-4" /> Cola operativa
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Selecciona un envío para revisar su detalle y trazabilidad.
              </p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Activos</span>
                  <strong>{stats.active}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Atrasados</span>
                  <strong className={stats.overdue ? "text-red-600" : ""}>{stats.overdue}</strong>
                </div>
                <div className="flex justify-between">
                  <span>A tiempo</span>
                  <strong>{stats.onTime}%</strong>
                </div>
              </div>
            </Card>
          )}
        </aside>
      </section>
      <div className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
        <strong className="text-foreground">Flujo recomendado:</strong> Venta → Preparación →
        Despacho → En tránsito → Entrega. Nüva registra cada cambio en <code>shipment_events</code>,
        permitiendo evolucionar este módulo hacia tracking para clientes, alertas de atraso y
        métricas logísticas.
      </div>
    </main>
  );
}
