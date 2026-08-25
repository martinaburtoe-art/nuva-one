import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness, useMyMembership } from "@/lib/use-business";
import { fmtCLP } from "@/lib/biz-data";
import { generateShippingLabelPdf } from "@/lib/shipping-label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Copy,
  FileDown,
  MapPin,
  Package,
  RefreshCw,
  Search,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";

type Status = "preparing" | "dispatched" | "in_transit" | "delivered" | "delayed" | "cancelled";
type Shipment = any;
type Event = any;
const labels: Record<Status, string> = {
  preparing: "Preparando",
  dispatched: "Despachado",
  in_transit: "En tránsito",
  delivered: "Entregado",
  delayed: "Atrasado",
  cancelled: "Cancelado",
};
const style: Record<Status, string> = {
  preparing: "bg-amber-50 text-amber-700 border-amber-200",
  dispatched: "bg-violet-50 text-violet-700 border-violet-200",
  in_transit: "bg-blue-50 text-blue-700 border-blue-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  delayed: "bg-red-50 text-red-700 border-red-200",
  cancelled: "bg-slate-100 text-slate-500 border-slate-200",
};
const next: Record<Status, Status[]> = {
  preparing: ["dispatched"],
  dispatched: ["in_transit", "delayed"],
  in_transit: ["delivered", "delayed"],
  delivered: [],
  delayed: ["in_transit", "delivered"],
  cancelled: [],
};
const overdue = (s: Shipment) =>
  !!s.eta &&
  !["delivered", "cancelled"].includes(s.status) &&
  new Date(`${s.eta}T23:59:59`).getTime() < Date.now();
const date = (v: string | null) =>
  v ? new Date(v.length === 10 ? `${v}T12:00:00` : v).toLocaleDateString("es-CL") : "Pendiente";

const emptyForm = {
  customer_id: "",
  sale_id: "",
  carrier: "",
  carrierCustom: "",
  tracking_number: "",
  shipping_address: "",
  comuna: "",
  city: "",
  region: "",
  postal_code: "",
  recipient_rut: "",
  recipient_email: "",
  recipient_contact: "",
  eta: "",
  notes: "",
  priority: "normal",
  shipping_cost: "0",
  service_type: "standard",
  package_count: "1",
  weight_kg: "",
  content_description: "",
  declared_value: "",
  payment_type: "prepaid",
  reference_code: "",
};

export function ShipmentsWorkspaceV2() {
  const { active } = useActiveBusiness();
  const { data: member } = useMyMembership();
  const qc = useQueryClient();
  const canWrite = ["owner", "admin", "staff"].includes(member?.role ?? "");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const shipments = useQuery({
    enabled: !!active?.id,
    queryKey: ["shipments-v2", active?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("shipments")
        .select("*")
        .eq("business_id", active!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Shipment[];
    },
  });
  const events = useQuery({
    enabled: !!active?.id,
    queryKey: ["shipment-events-v2", active?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("shipment_events")
        .select("shipment_id,status,note,occurred_at")
        .eq("business_id", active!.id)
        .order("occurred_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as Event[];
    },
  });
  const customers = useQuery({
    enabled: !!active?.id,
    queryKey: ["shipment-customers", active?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("customers")
        .select(
          "id,name,phone,email,tax_id,address,shipping_comuna,shipping_city,shipping_region,shipping_postal_code,shipping_contact_name",
        )
        .eq("business_id", active!.id)
        .order("name")
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
  const sales = useQuery({
    enabled: !!active?.id,
    queryKey: ["shipment-sales", active?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sales")
        .select("id,customer_id,customer_name,total,sale_date")
        .eq("business_id", active!.id)
        .order("sale_date", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  function prefillCustomer(customerId: string) {
    const c = customers.data?.find((item: any) => item.id === customerId);
    const previous = (shipments.data ?? []).find((s: Shipment) => s.customer_id === customerId);
    if (!c) return;
    setForm((current) => ({
      ...current,
      customer_id: customerId,
      shipping_address: c.address || previous?.shipping_address || "",
      comuna: c.shipping_comuna || previous?.comuna || "",
      city: c.shipping_city || previous?.city || "",
      region: c.shipping_region || previous?.region || "",
      postal_code: c.shipping_postal_code || previous?.destination_postal_code || "",
      recipient_rut: c.tax_id || previous?.destination_rut || "",
      recipient_email: c.email || previous?.destination_email || "",
      recipient_contact: c.shipping_contact_name || c.name || previous?.recipient_contact || "",
    }));
  }
  function prefillSale(saleId: string) {
    setForm((current) => ({ ...current, sale_id: saleId }));
    const sale = sales.data?.find((item: any) => item.id === saleId);
    if (sale?.customer_id) prefillCustomer(sale.customer_id);
  }

  const create = useMutation({
    mutationFn: async () => {
      if (!active?.id) throw new Error("Selecciona un negocio.");
      const customerId =
        form.customer_id ||
        sales.data?.find((s: any) => s.id === form.sale_id)?.customer_id ||
        null;
      const customer = customers.data?.find((c: any) => c.id === customerId);
      const sale = sales.data?.find((s: any) => s.id === form.sale_id);
      const carrier = form.carrier === "other" ? form.carrierCustom : form.carrier;
      const payload = {
        business_id: active.id,
        sale_id: form.sale_id || null,
        customer_id: customerId,
        customer_name: customer?.name || sale?.customer_name || null,
        customer_phone: customer?.phone || null,
        destination_email: form.recipient_email || customer?.email || null,
        destination_rut: form.recipient_rut || customer?.tax_id || null,
        recipient_contact: form.recipient_contact || customer?.name || null,
        destination_postal_code: form.postal_code || null,
        status: "preparing",
        carrier: carrier || null,
        tracking_number: form.tracking_number || null,
        shipping_address: form.shipping_address || null,
        comuna: form.comuna || null,
        city: form.city || null,
        region: form.region || null,
        eta: form.eta || null,
        notes: form.notes || null,
        priority: form.priority,
        shipping_cost: Number(form.shipping_cost || 0),
        service_type: form.service_type,
        package_count: Math.max(1, Number(form.package_count || 1)),
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        content_description: form.content_description || null,
        declared_value: form.declared_value ? Number(form.declared_value) : null,
        payment_type: form.payment_type,
        reference_code: form.reference_code || null,
      };
      const { data, error } = await (supabase as any)
        .from("shipments")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      const ev = await (supabase as any).from("shipment_events").insert({
        business_id: active.id,
        shipment_id: data.id,
        status: "preparing",
        note: "Envío creado",
      });
      if (ev.error) throw ev.error;
      if (customerId) {
        const { error: customerError } = await (supabase as any)
          .from("customers")
          .update({
            address: form.shipping_address || customer?.address || null,
            shipping_comuna: form.comuna || null,
            shipping_city: form.city || null,
            shipping_region: form.region || null,
            shipping_postal_code: form.postal_code || null,
            shipping_contact_name: form.recipient_contact || customer?.name || null,
          })
          .eq("id", customerId)
          .eq("business_id", active.id);
        if (customerError)
          console.warn("No se pudo actualizar la dirección logística del CRM", customerError);
      }
      return data;
    },
    onSuccess: async (data) => {
      setOpen(false);
      setForm(emptyForm);
      setSelected(data.id);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["shipments-v2", active?.id] }),
        qc.invalidateQueries({ queryKey: ["shipment-events-v2", active?.id] }),
        qc.invalidateQueries({ queryKey: ["shipment-customers", active?.id] }),
      ]);
      toast.success("Envío creado y datos de destino guardados en el CRM");
    },
  });

  const change = useMutation({
    mutationFn: async ({ s, status }: { s: Shipment; status: Status }) => {
      if (!active?.id) throw new Error("Selecciona un negocio.");
      const patch: any = { status, updated_at: new Date().toISOString() };
      if (["dispatched", "in_transit"].includes(status))
        patch.dispatched_at = s.dispatched_at ?? new Date().toISOString();
      patch.delivered_at = status === "delivered" ? new Date().toISOString() : null;
      const r = await (supabase as any)
        .from("shipments")
        .update(patch)
        .eq("id", s.id)
        .eq("business_id", active.id);
      if (r.error) throw r.error;
      const ev = await (supabase as any).from("shipment_events").insert({
        business_id: active.id,
        shipment_id: s.id,
        status,
        note: `Estado actualizado a ${labels[status]}`,
      });
      if (ev.error) throw ev.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shipments-v2", active?.id] });
      qc.invalidateQueries({ queryKey: ["shipment-events-v2", active?.id] });
    },
  });

  function downloadLabel(s: Shipment) {
    if (!active || !s.customer_name) {
      toast.error("Completa al menos el destinatario antes de generar la etiqueta");
      return;
    }
    generateShippingLabelPdf({
      businessName: active.name,
      businessTaxId: active.tax_id,
      businessAddress: active.address,
      businessComuna: active.comuna,
      businessPhone: active.public_contact_phone,
      businessEmail: active.public_contact_email,
      carrier: s.carrier,
      serviceType: s.service_type,
      trackingNumber: s.tracking_number,
      referenceCode: s.reference_code,
      recipientName: s.customer_name,
      recipientRut: s.destination_rut,
      recipientPhone: s.customer_phone,
      recipientEmail: s.destination_email,
      recipientContact: s.recipient_contact,
      destinationAddress: s.shipping_address,
      destinationComuna: s.comuna,
      destinationCity: s.city,
      destinationRegion: s.region,
      destinationPostalCode: s.destination_postal_code,
      destinationCountry: s.destination_country || "Chile",
      packageCount: s.package_count,
      weightKg: s.weight_kg,
      contentDescription: s.content_description,
      declaredValue: s.declared_value,
      paymentType: s.payment_type,
      notes: s.notes,
    });
    toast.success("PDF de etiqueta generado");
  }

  const all = shipments.data ?? [];
  const evs = events.data ?? [];
  const by = useMemo(() => {
    const map = new Map<string, Event[]>();
    evs.forEach((e: Event) => map.set(e.shipment_id, [...(map.get(e.shipment_id) || []), e]));
    return map;
  }, [evs]);
  const rows = useMemo(
    () =>
      all.filter((s: Shipment) => {
        const text = [
          s.id,
          s.customer_name,
          s.customer_phone,
          s.destination_email,
          s.tracking_number,
          s.carrier,
          s.shipping_address,
          s.comuna,
          s.city,
          s.sale_id,
        ]
          .join(" ")
          .toLowerCase();
        const okQ = !q || text.includes(q.toLowerCase());
        const ok =
          filter === "all" ||
          (filter === "overdue"
            ? overdue(s)
            : filter === "urgent" || filter === "high"
              ? s.priority === filter
              : s.status === filter);
        return okQ && ok;
      }),
    [all, q, filter],
  );
  const stats = useMemo(() => {
    const delivered = all.filter((s: Shipment) => s.status === "delivered");
    const onTime = delivered.filter(
      (s: Shipment) =>
        s.eta && s.delivered_at && new Date(s.delivered_at) <= new Date(`${s.eta}T23:59:59`),
    ).length;
    return {
      total: all.length,
      prep: all.filter((s: Shipment) => s.status === "preparing").length,
      transit: all.filter((s: Shipment) => ["dispatched", "in_transit"].includes(s.status)).length,
      delivered: delivered.length,
      late: all.filter(overdue).length,
      on: delivered.length ? Math.round((onTime / delivered.length) * 100) : 0,
      cost: all.reduce((n: number, s: Shipment) => n + Number(s.shipping_cost || 0), 0),
    };
  }, [all]);
  const current = all.find((s: Shipment) => s.id === selected);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 p-4 md:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <Truck className="h-4 w-4" /> Operación logística
          </div>
          <h1 className="text-3xl font-semibold">Envíos & Entregas</h1>
          <p className="text-muted-foreground">
            CRM de destinatarios, preparación, tracking y etiquetas PDF listas para imprimir.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              shipments.refetch();
              events.refetch();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          {canWrite && (
            <Button onClick={() => setOpen(!open)}>
              <Package className="mr-2 h-4 w-4" />
              Nuevo envío
            </Button>
          )}
        </div>
      </header>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {[
          ["Total", stats.total, Package, "all"],
          ["Preparando", stats.prep, Clock3, "preparing"],
          ["En tránsito", stats.transit, Truck, "in_transit"],
          ["Entregados", stats.delivered, CheckCircle2, "delivered"],
          ["Atrasados", stats.late, AlertTriangle, "overdue"],
          ["A tiempo", `${stats.on}%`, CheckCircle2, "all"],
        ].map(([l, v, I, k]) => (
          <button key={String(l)} onClick={() => setFilter(String(k))} className="text-left">
            <Card className="p-4">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{l}</span>
                <I className="h-4 w-4" />
              </div>
              <div className="mt-2 text-2xl font-semibold">{v}</div>
            </Card>
          </button>
        ))}
      </div>
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <span className="text-xs text-muted-foreground">Costo total de despacho</span>
            <p className="text-xl font-semibold">{fmtCLP(stats.cost)}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Costo promedio</span>
            <p className="text-xl font-semibold">
              {fmtCLP(stats.total ? stats.cost / stats.total : 0)}
            </p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Tasa de entrega</span>
            <p className="text-xl font-semibold">
              {stats.total ? Math.round((stats.delivered / stats.total) * 100) : 0}%
            </p>
          </div>
        </div>
      </Card>
      {open && canWrite && (
        <Card className="border-primary/20 p-5">
          <div className="mb-4 flex justify-between">
            <div>
              <h2 className="font-semibold">Nuevo envío</h2>
              <p className="text-sm text-muted-foreground">
                Selecciona un cliente y Nüva One recuperará sus datos guardados en CRM. Al crear, la
                dirección logística queda guardada para futuros despachos.
              </p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setOpen(false)}>
              <X />
            </Button>
          </div>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            <Select
              value={form.sale_id || "none"}
              onValueChange={(v) => (v === "none" ? set("sale_id", "") : prefillSale(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Venta relacionada" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin venta</SelectItem>
                {sales.data?.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.customer_name || "Cliente"} · {fmtCLP(Number(s.total || 0))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={form.customer_id || "none"}
              onValueChange={(v) => (v === "none" ? set("customer_id", "") : prefillCustomer(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Cliente / destinatario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin cliente</SelectItem>
                {customers.data?.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={form.carrier || "none"}
              onValueChange={(v) => set("carrier", v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Agencia / courier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Seleccionar agencia</SelectItem>
                <SelectItem value="Chilexpress">Chilexpress</SelectItem>
                <SelectItem value="Starken">Starken</SelectItem>
                <SelectItem value="Blue Express">Blue Express</SelectItem>
                <SelectItem value="CorreosChile">CorreosChile</SelectItem>
                <SelectItem value="other">Otra / manual</SelectItem>
              </SelectContent>
            </Select>
            {form.carrier === "other" ? (
              <Input
                placeholder="Nombre de agencia"
                value={form.carrierCustom}
                onChange={(e) => set("carrierCustom", e.target.value)}
              />
            ) : (
              <Input
                placeholder="Tracking / OT (si existe)"
                value={form.tracking_number}
                onChange={(e) => set("tracking_number", e.target.value)}
              />
            )}
            <Input
              className="lg:col-span-2"
              placeholder="Dirección de entrega · calle + número + complemento"
              value={form.shipping_address}
              onChange={(e) => set("shipping_address", e.target.value)}
            />
            <Input
              placeholder="Comuna"
              value={form.comuna}
              onChange={(e) => set("comuna", e.target.value)}
            />
            <Input
              placeholder="Ciudad"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
            />
            <Input
              placeholder="Región"
              value={form.region}
              onChange={(e) => set("region", e.target.value)}
            />
            <Input
              placeholder="Código postal"
              value={form.postal_code}
              onChange={(e) => set("postal_code", e.target.value)}
            />
            <Input
              placeholder="RUT destinatario"
              value={form.recipient_rut}
              onChange={(e) => set("recipient_rut", e.target.value)}
            />
            <Input
              placeholder="Teléfono"
              value={customers.data?.find((c: any) => c.id === form.customer_id)?.phone || ""}
              readOnly
            />
            <Input
              type="email"
              placeholder="Email destinatario"
              value={form.recipient_email}
              onChange={(e) => set("recipient_email", e.target.value)}
            />
            <Input
              placeholder="Contacto / persona que recibe"
              value={form.recipient_contact}
              onChange={(e) => set("recipient_contact", e.target.value)}
            />
            <Select value={form.payment_type} onValueChange={(v) => set("payment_type", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prepaid">Pagado en origen</SelectItem>
                <SelectItem value="collect">Por pagar en destino</SelectItem>
              </SelectContent>
            </Select>
            <Select value={form.service_type} onValueChange={(v) => set("service_type", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="same_day">Mismo día</SelectItem>
                <SelectItem value="express">Express</SelectItem>
                <SelectItem value="standard">Estándar</SelectItem>
                <SelectItem value="pickup">Retiro / sucursal</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              min="1"
              placeholder="Bultos"
              value={form.package_count}
              onChange={(e) => set("package_count", e.target.value)}
            />
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="Peso (kg)"
              value={form.weight_kg}
              onChange={(e) => set("weight_kg", e.target.value)}
            />
            <Input
              placeholder="Contenido / mercancía"
              value={form.content_description}
              onChange={(e) => set("content_description", e.target.value)}
            />
            <Input
              type="number"
              min="0"
              placeholder="Valor declarado CLP"
              value={form.declared_value}
              onChange={(e) => set("declared_value", e.target.value)}
            />
            <Input
              placeholder="Referencia interna (boleta / pedido)"
              value={form.reference_code}
              onChange={(e) => set("reference_code", e.target.value)}
            />
            <Input type="date" value={form.eta} onChange={(e) => set("eta", e.target.value)} />
            <Input
              type="number"
              min="0"
              placeholder="Costo despacho CLP"
              value={form.shipping_cost}
              onChange={(e) => set("shipping_cost", e.target.value)}
            />
            <Select value={form.priority} onValueChange={(v) => set("priority", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Prioridad baja</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">Prioridad alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
            <Input
              className="lg:col-span-3"
              placeholder="Observaciones"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
            <Button
              className="lg:col-span-4"
              onClick={() => create.mutate()}
              disabled={create.isPending}
            >
              {create.isPending ? "Creando…" : "Crear envío y guardar datos en CRM"}
            </Button>
          </div>
          {create.error && (
            <p className="mt-2 text-sm text-destructive">{(create.error as Error).message}</p>
          )}
        </Card>
      )}
      <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden">
          <div className="border-b p-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar cliente, tracking, dirección, comuna o venta…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                "all",
                "preparing",
                "dispatched",
                "in_transit",
                "delivered",
                "delayed",
                "cancelled",
                "overdue",
                "urgent",
                "high",
              ].map((k) => (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className={`rounded-full border px-3 py-1 text-xs ${filter === k ? "bg-foreground text-background" : "text-muted-foreground"}`}
                >
                  {k === "all"
                    ? "Todos"
                    : k === "overdue"
                      ? "Atrasados"
                      : k === "urgent"
                        ? "Urgentes"
                        : k === "high"
                          ? "Alta prioridad"
                          : labels[k as Status]}
                </button>
              ))}
            </div>
          </div>
          {shipments.isLoading ? (
            <div className="p-8 text-sm text-muted-foreground">Cargando envíos…</div>
          ) : shipments.error ? (
            <div className="p-8 text-sm">
              <strong>No se pudo cargar el módulo.</strong>
              <p className="mt-1 text-muted-foreground">{(shipments.error as Error).message}</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No hay envíos para este filtro.
            </div>
          ) : (
            <div className="divide-y">
              {rows.map((s: Shipment) => (
                <article
                  key={s.id}
                  onClick={() => setSelected(s.id)}
                  className={`cursor-pointer p-4 hover:bg-muted/30 ${overdue(s) ? "border-l-4 border-l-red-400" : ""}`}
                >
                  <div className="grid gap-3 lg:grid-cols-[1fr_1.2fr_1fr_1fr_auto] lg:items-center">
                    <div>
                      <b>{s.customer_name || "Cliente pendiente"}</b>
                      <div className="text-xs text-muted-foreground">
                        {s.customer_phone || "Sin teléfono"}
                      </div>
                    </div>
                    <div className="flex gap-1 text-sm">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span>
                        {[s.shipping_address, s.comuna, s.city].filter(Boolean).join(", ") ||
                          "Dirección pendiente"}
                      </span>
                    </div>
                    <div className="text-sm">
                      <div>{s.carrier || "Transportista pendiente"}</div>
                      <button
                        className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (s.tracking_number) navigator.clipboard?.writeText(s.tracking_number);
                        }}
                      >
                        {s.tracking_number || "Sin tracking"}
                        {s.tracking_number && <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                    <div>
                      <div className="text-xs">ETA: {date(s.eta)}</div>
                      <div className="mt-1 flex gap-1">
                        <Badge className={style[s.status]}>
                          {overdue(s) ? "Atrasado · " : ""}
                          {labels[s.status]}
                        </Badge>
                        {s.priority && s.priority !== "normal" && (
                          <Badge variant="outline">{s.priority}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                      {canWrite && (
                        <Button
                          size="sm"
                          variant="outline"
                          title="Descargar etiqueta PDF"
                          onClick={() => downloadLabel(s)}
                        >
                          <FileDown className="mr-1.5 h-3.5 w-3.5" />
                          PDF
                        </Button>
                      )}
                      {canWrite &&
                        next[s.status].map((a) => (
                          <Button
                            key={a}
                            size="sm"
                            variant="outline"
                            disabled={change.isPending}
                            onClick={() => change.mutate({ s, status: a })}
                          >
                            {labels[a]}
                          </Button>
                        ))}
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>
                      {by.get(s.id)?.[0]
                        ? `Último evento: ${by.get(s.id)![0].note || labels[by.get(s.id)![0].status]} · ${new Date(by.get(s.id)![0].occurred_at).toLocaleString("es-CL")}`
                        : "Sin eventos"}
                    </span>
                    <span>{fmtCLP(Number(s.shipping_cost || 0))}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>
        <aside>
          {current ? (
            <Card className="p-5">
              <div className="flex justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    Etiqueta y detalle
                  </span>
                  <h2 className="font-semibold">{current.customer_name || "Cliente pendiente"}</h2>
                </div>
                <Button size="icon" variant="ghost" onClick={() => setSelected(null)}>
                  <X />
                </Button>
              </div>
              <Button className="mt-4 w-full" onClick={() => downloadLabel(current)}>
                <FileDown className="mr-2 h-4 w-4" />
                Descargar etiqueta PDF
              </Button>
              <div className="mt-5 space-y-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Estado</span>
                  <div
                    className={`mt-1 w-fit rounded-full border px-2 py-1 text-xs ${style[current.status]}`}
                  >
                    {labels[current.status]}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Destino</span>
                  <p>
                    {[
                      current.shipping_address,
                      current.comuna,
                      current.city,
                      current.region,
                      current.destination_postal_code && `CP ${current.destination_postal_code}`,
                    ]
                      .filter(Boolean)
                      .join(", ") || "Pendiente"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Contacto</span>
                  <p>
                    {current.customer_phone || "Sin teléfono"}
                    {current.destination_email ? ` · ${current.destination_email}` : ""}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Agencia / Tracking</span>
                  <p>
                    {current.carrier || "Sin agencia"} · {current.tracking_number || "Sin tracking"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Control</span>
                  <p>
                    {current.reference_code || "Sin referencia"} · {current.package_count || 1}{" "}
                    bulto(s) · {current.weight_kg ? `${current.weight_kg} kg` : "peso pendiente"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Contenido / valor declarado</span>
                  <p>
                    {current.content_description || "No informado"}
                    {current.declared_value != null
                      ? ` · ${fmtCLP(Number(current.declared_value))}`
                      : ""}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Compromiso</span>
                  <p className={overdue(current) ? "font-semibold text-red-600" : ""}>
                    {date(current.eta)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Historial</span>
                  <div className="mt-2 space-y-3">
                    {(by.get(current.id) || []).slice(0, 10).map((e: Event, i: number) => (
                      <div className="border-l pl-3" key={`${e.occurred_at}-${i}`}>
                        <div className="text-xs font-medium">{labels[e.status]}</div>
                        <div className="text-xs text-muted-foreground">
                          {e.note || "Actualización"} ·{" "}
                          {new Date(e.occurred_at).toLocaleString("es-CL")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center">
              <Truck className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">Selecciona un envío</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Verás los datos del destinatario, tracking, costos, historial y descarga de
                etiqueta.
              </p>
            </Card>
          )}
        </aside>
      </section>
    </main>
  );
}
