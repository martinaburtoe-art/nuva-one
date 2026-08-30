import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useActiveBusiness, useMyMembership } from "@/lib/use-business";
import { fmtCLP } from "@/lib/biz-data";
import { generateShippingLabelPdf } from "@/lib/shipping-label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, Clock3, FileDown, Package, RefreshCw, Search, Truck, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

type ShipmentRow = Database["public"]["Tables"]["shipments"]["Row"];
type EventRow = Database["public"]["Tables"]["shipment_events"]["Row"];
type CustomerRow = Database["public"]["Tables"]["customers"]["Row"];
type SaleRow = Database["public"]["Tables"]["sales"]["Row"];
type Status = "preparing" | "dispatched" | "in_transit" | "delivered" | "delayed" | "cancelled";
type Priority = "low" | "normal" | "high" | "urgent";
type Filter = "all" | Status | "overdue" | "urgent" | "high";
type Shipment = Omit<ShipmentRow, "status" | "priority"> & { status: Status; priority: Priority };

const labels: Record<Status, string> = { preparing: "Preparando", dispatched: "Despachado", in_transit: "En tránsito", delivered: "Entregado", delayed: "Atrasado", cancelled: "Cancelado" };
const style: Record<Status, string> = { preparing: "bg-amber-50 text-amber-700 border-amber-200", dispatched: "bg-violet-50 text-violet-700 border-violet-200", in_transit: "bg-blue-50 text-blue-700 border-blue-200", delivered: "bg-emerald-50 text-emerald-700 border-emerald-200", delayed: "bg-red-50 text-red-700 border-red-200", cancelled: "bg-slate-100 text-slate-500 border-slate-200" };
const next: Record<Status, Status[]> = { preparing: ["dispatched"], dispatched: ["in_transit", "delayed"], in_transit: ["delivered", "delayed"], delivered: [], delayed: ["in_transit", "delivered"], cancelled: [] };
const priorities: Priority[] = ["low", "normal", "high", "urgent"];

function normalizeStatus(value: string): Status { return value === "preparing" || value === "dispatched" || value === "in_transit" || value === "delivered" || value === "delayed" || value === "cancelled" ? value : "preparing"; }
function normalizePriority(value: string): Priority { return value === "low" || value === "normal" || value === "high" || value === "urgent" ? value : "normal"; }
function normalizeShipment(row: ShipmentRow): Shipment { return { ...row, status: normalizeStatus(row.status), priority: normalizePriority(row.priority) }; }
function overdue(s: Shipment) { return !!s.eta && !["delivered", "cancelled"].includes(s.status) && new Date(`${s.eta}T23:59:59`).getTime() < Date.now(); }
function date(value: string | null) { return value ? new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleDateString("es-CL") : "Pendiente"; }

const emptyForm = { customer_id: "", sale_id: "", carrier: "", tracking_number: "", shipping_address: "", comuna: "", city: "", region: "", postal_code: "", recipient_rut: "", recipient_email: "", recipient_contact: "", eta: "", notes: "", priority: "normal" as Priority, shipping_cost: "0", service_type: "standard", package_count: "1", weight_kg: "", content_description: "", declared_value: "", payment_type: "prepaid", reference_code: "" };

export function ShipmentsWorkspaceV2() {
  const { active } = useActiveBusiness();
  const { data: member } = useMyMembership();
  const qc = useQueryClient();
  const canWrite = ["owner", "admin", "staff"].includes(member?.role ?? "");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  const shipments = useQuery({
    enabled: !!active?.id,
    queryKey: ["shipments-v2", active?.id],
    queryFn: async (): Promise<Shipment[]> => {
      const { data, error } = await supabase.from("shipments").select("*").eq("business_id", active!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(normalizeShipment);
    },
  });
  const events = useQuery({
    enabled: !!active?.id,
    queryKey: ["shipment-events-v2", active?.id],
    queryFn: async (): Promise<EventRow[]> => {
      const { data, error } = await supabase.from("shipment_events").select("*").eq("business_id", active!.id).order("occurred_at", { ascending: false }).limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });
  const customers = useQuery({
    enabled: !!active?.id,
    queryKey: ["shipment-customers", active?.id],
    queryFn: async (): Promise<CustomerRow[]> => {
      const { data, error } = await supabase.from("customers").select("*").eq("business_id", active!.id).order("name").limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
  const sales = useQuery({
    enabled: !!active?.id,
    queryKey: ["shipment-sales", active?.id],
    queryFn: async (): Promise<SaleRow[]> => {
      const { data, error } = await supabase.from("sales").select("*").eq("business_id", active!.id).order("sale_date", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateForm = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const prefillCustomer = (customerId: string) => {
    const customer = customers.data?.find((item) => item.id === customerId);
    if (!customer) return;
    setForm((current) => ({ ...current, customer_id: customerId, shipping_address: customer.address ?? current.shipping_address, recipient_rut: customer.tax_id ?? current.recipient_rut, recipient_email: customer.email ?? current.recipient_email, recipient_contact: customer.name ?? current.recipient_contact }));
  };
  const prefillSale = (saleId: string) => {
    updateForm("sale_id", saleId);
    const sale = sales.data?.find((item) => item.id === saleId);
    if (sale?.customer_id) prefillCustomer(sale.customer_id);
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!active?.id) throw new Error("Selecciona un negocio.");
      const customerId = form.customer_id || sales.data?.find((sale) => sale.id === form.sale_id)?.customer_id || null;
      const customer = customers.data?.find((item) => item.id === customerId);
      const payload: Database["public"]["Tables"]["shipments"]["Insert"] = {
        business_id: active.id, sale_id: form.sale_id || null, customer_id: customerId, customer_name: customer?.name ?? null, customer_phone: customer?.phone ?? null,
        destination_email: form.recipient_email || customer?.email || null, destination_rut: form.recipient_rut || customer?.tax_id || null, recipient_contact: form.recipient_contact || customer?.name || null,
        destination_postal_code: form.postal_code || null, status: "preparing", carrier: form.carrier || null, tracking_number: form.tracking_number || null, shipping_address: form.shipping_address || null,
        comuna: form.comuna || null, city: form.city || null, region: form.region || null, eta: form.eta || null, notes: form.notes || null, priority: form.priority, shipping_cost: Number(form.shipping_cost || 0),
        service_type: form.service_type, package_count: Math.max(1, Number(form.package_count || 1)), weight_kg: form.weight_kg ? Number(form.weight_kg) : null, content_description: form.content_description || null,
        declared_value: form.declared_value ? Number(form.declared_value) : null, payment_type: form.payment_type, reference_code: form.reference_code || null,
      };
      const { data, error } = await supabase.from("shipments").insert(payload).select("*").single();
      if (error) throw error;
      const { error: eventError } = await supabase.from("shipment_events").insert({ business_id: active.id, shipment_id: data.id, status: "preparing", note: "Envío creado" });
      if (eventError) throw eventError;
      return normalizeShipment(data);
    },
    onSuccess: async (data) => {
      setOpen(false); setForm(emptyForm); setSelected(data.id);
      await Promise.all([qc.invalidateQueries({ queryKey: ["shipments-v2", active?.id] }), qc.invalidateQueries({ queryKey: ["shipment-events-v2", active?.id] })]);
      toast.success("Envío creado");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "No se pudo crear el envío"),
  });

  const change = useMutation({
    mutationFn: async ({ shipment, status }: { shipment: Shipment; status: Status }) => {
      if (!active?.id) throw new Error("Selecciona un negocio.");
      const patch: Database["public"]["Tables"]["shipments"]["Update"] = { status, updated_at: new Date().toISOString(), delivered_at: status === "delivered" ? new Date().toISOString() : null };
      if (["dispatched", "in_transit"].includes(status)) patch.dispatched_at = shipment.dispatched_at ?? new Date().toISOString();
      const { error } = await supabase.from("shipments").update(patch).eq("id", shipment.id).eq("business_id", active.id);
      if (error) throw error;
      const { error: eventError } = await supabase.from("shipment_events").insert({ business_id: active.id, shipment_id: shipment.id, status, note: `Estado actualizado a ${labels[status]}` });
      if (eventError) throw eventError;
    },
    onSuccess: async () => { await Promise.all([qc.invalidateQueries({ queryKey: ["shipments-v2", active?.id] }), qc.invalidateQueries({ queryKey: ["shipment-events-v2", active?.id] })]); },
    onError: (error) => toast.error(error instanceof Error ? error.message : "No se pudo actualizar el envío"),
  });

  const all = shipments.data ?? [];
  const rows = useMemo(() => all.filter((shipment) => {
    const text = [shipment.id, shipment.customer_name, shipment.customer_phone, shipment.destination_email, shipment.tracking_number, shipment.carrier, shipment.shipping_address, shipment.comuna, shipment.city, shipment.sale_id].join(" ").toLowerCase();
    const matchesQuery = !q || text.includes(q.toLowerCase());
    const matchesFilter = filter === "all" || filter === "overdue" && overdue(shipment) || filter === "urgent" && shipment.priority === "urgent" || filter === "high" && shipment.priority === "high" || shipment.status === filter;
    return matchesQuery && matchesFilter;
  }), [all, q, filter]);
  const stats = useMemo(() => {
    const delivered = all.filter((s) => s.status === "delivered");
    const onTime = delivered.filter((s) => s.eta && s.delivered_at && new Date(s.delivered_at) <= new Date(`${s.eta}T23:59:59`)).length;
    return { total: all.length, prep: all.filter((s) => s.status === "preparing").length, transit: all.filter((s) => ["dispatched", "in_transit"].includes(s.status)).length, delivered: delivered.length, late: all.filter(overdue).length, on: delivered.length ? Math.round(onTime / delivered.length * 100) : 0, cost: all.reduce((sum, s) => sum + Number(s.shipping_cost || 0), 0) };
  }, [all]);
  const current = all.find((shipment) => shipment.id === selected);
  const eventHistory = events.data?.filter((event) => event.shipment_id === current?.id) ?? [];
  const statCards: { label: string; value: string | number; Icon: LucideIcon; filter: Filter }[] = [
    { label: "Total", value: stats.total, Icon: Package, filter: "all" }, { label: "Preparando", value: stats.prep, Icon: Clock3, filter: "preparing" }, { label: "En tránsito", value: stats.transit, Icon: Truck, filter: "in_transit" }, { label: "Entregados", value: stats.delivered, Icon: CheckCircle2, filter: "delivered" }, { label: "Atrasados", value: stats.late, Icon: AlertTriangle, filter: "overdue" }, { label: "A tiempo", value: `${stats.on}%`, Icon: CheckCircle2, filter: "all" },
  ];

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Envíos</h1><p className="text-sm text-muted-foreground">Seguimiento operativo y trazabilidad logística.</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => shipments.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button><Button disabled={!canWrite} onClick={() => setOpen(true)}>Nuevo envío</Button></div></div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">{statCards.map(({ label, value, Icon, filter: cardFilter }) => <button type="button" key={label} onClick={() => setFilter(cardFilter)} className="text-left"><Card className="p-4 transition hover:border-primary"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-4 w-4" />{label}</div><div className="mt-2 text-xl font-bold">{value}</div></Card></button>)}</div>
      <Card className="p-4"><div className="flex flex-wrap gap-3"><div className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar envío, cliente, tracking..." className="pl-9" /></div><Select value={filter} onValueChange={(value) => setFilter(value as Filter)}><SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger><SelectContent>{["all", "preparing", "dispatched", "in_transit", "delivered", "delayed", "cancelled", "overdue", "urgent", "high"].map((value) => <SelectItem key={value} value={value}>{value === "all" ? "Todos" : labels[value as Status] ?? value}</SelectItem>)}</SelectContent></Select></div></Card>
      <div className="grid gap-4 lg:grid-cols-[1fr_390px]">
        <Card className="overflow-hidden"><div className="divide-y">{rows.map((shipment) => <button type="button" key={shipment.id} onClick={() => setSelected(shipment.id)} className="w-full p-4 text-left hover:bg-muted/30"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="font-medium">{shipment.customer_name || "Cliente sin nombre"}</div><div className="text-xs text-muted-foreground">{shipment.tracking_number || "Sin tracking"} · {shipment.carrier || "Sin transportista"}</div></div><Badge className={style[shipment.status]}>{labels[shipment.status]}</Badge></div><div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3"><span>{shipment.city || shipment.comuna || "Destino pendiente"}</span><span>ETA: {date(shipment.eta)}</span><span>{fmtCLP(Number(shipment.shipping_cost || 0))}</span></div></button>)}{rows.length === 0 && <div className="p-10 text-center text-sm text-muted-foreground">No hay envíos que coincidan con el filtro.</div>}</div></Card>
        <Card className="p-5">{current ? <><div className="flex items-start justify-between gap-3"><div><h2 className="font-semibold">{current.customer_name || "Envío"}</h2><p className="text-xs text-muted-foreground">{current.tracking_number || "Sin tracking"}</p></div><Badge className={style[current.status]}>{labels[current.status]}</Badge></div><div className="mt-4 space-y-2 text-sm"><Row label="Destino" value={[current.shipping_address, current.comuna, current.city, current.region].filter(Boolean).join(", ") || "Pendiente"} /><Row label="ETA" value={date(current.eta)} /><Row label="Prioridad" value={current.priority} /><Row label="Costo" value={fmtCLP(Number(current.shipping_cost || 0))} /></div><div className="mt-5 flex flex-wrap gap-2">{next[current.status].map((status) => <Button key={status} size="sm" disabled={!canWrite || change.isPending} onClick={() => change.mutate({ shipment: current, status })}>{labels[status]}</Button>)}<Button size="sm" variant="outline" onClick={() => generateShippingLabelPdf({ businessName: active?.name ?? "Nüva One", businessTaxId: active?.tax_id, businessAddress: active?.address, businessComuna: active?.comuna, businessPhone: active?.public_contact_phone, businessEmail: active?.public_contact_email, carrier: current.carrier, serviceType: current.service_type, trackingNumber: current.tracking_number, referenceCode: current.reference_code, recipientName: current.customer_name, recipientRut: current.destination_rut, recipientPhone: current.customer_phone, recipientEmail: current.destination_email, recipientContact: current.recipient_contact, destinationAddress: current.shipping_address, destinationComuna: current.comuna, destinationCity: current.city, destinationRegion: current.region, destinationPostalCode: current.destination_postal_code, destinationCountry: current.destination_country, packageCount: current.package_count, weightKg: current.weight_kg, contentDescription: current.content_description, declaredValue: current.declared_value, paymentType: current.payment_type, notes: current.notes })}><FileDown className="mr-2 h-4 w-4" />Etiqueta PDF</Button></div><div className="mt-5"><h3 className="text-sm font-medium">Trazabilidad</h3><div className="mt-2 space-y-2">{eventHistory.map((event) => <div key={event.id} className="rounded-lg border p-2 text-xs"><div className="font-medium">{labels[normalizeStatus(event.status)]}</div><div className="text-muted-foreground">{new Date(event.occurred_at).toLocaleString("es-CL")}{event.note ? ` · ${event.note}` : ""}</div></div>)}</div></div></> : <div className="flex min-h-[300px] items-center justify-center text-center text-sm text-muted-foreground">Selecciona un envío para ver su detalle.</div>}</Card>
      </div>
      {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><Card className="max-h-[90vh] w-full max-w-3xl overflow-auto p-6"><div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">Nuevo envío</h2><p className="text-sm text-muted-foreground">Registra destino, servicio y trazabilidad inicial.</p></div><Button variant="ghost" onClick={() => setOpen(false)}>Cerrar</Button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Field label="Cliente"><Select value={form.customer_id} onValueChange={prefillCustomer}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{(customers.data ?? []).map((customer) => <SelectItem key={customer.id} value={customer.id}>{customer.name ?? customer.id}</SelectItem>)}</SelectContent></Select></Field><Field label="Venta"><Select value={form.sale_id} onValueChange={prefillSale}><SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger><SelectContent>{(sales.data ?? []).map((sale) => <SelectItem key={sale.id} value={sale.id}>{sale.id.slice(0, 8)}</SelectItem>)}</SelectContent></Select></Field><Field label="Tracking"><Input value={form.tracking_number} onChange={(e) => updateForm("tracking_number", e.target.value)} /></Field><Field label="Transportista"><Input value={form.carrier} onChange={(e) => updateForm("carrier", e.target.value)} /></Field><Field label="Dirección"><Input value={form.shipping_address} onChange={(e) => updateForm("shipping_address", e.target.value)} /></Field><Field label="Comuna"><Input value={form.comuna} onChange={(e) => updateForm("comuna", e.target.value)} /></Field><Field label="Ciudad"><Input value={form.city} onChange={(e) => updateForm("city", e.target.value)} /></Field><Field label="Región"><Input value={form.region} onChange={(e) => updateForm("region", e.target.value)} /></Field><Field label="Email"><Input value={form.recipient_email} onChange={(e) => updateForm("recipient_email", e.target.value)} /></Field><Field label="Contacto"><Input value={form.recipient_contact} onChange={(e) => updateForm("recipient_contact", e.target.value)} /></Field><Field label="ETA"><Input type="date" value={form.eta} onChange={(e) => updateForm("eta", e.target.value)} /></Field><Field label="Costo envío"><Input type="number" min="0" value={form.shipping_cost} onChange={(e) => updateForm("shipping_cost", e.target.value)} /></Field><Field label="Prioridad"><Select value={form.priority} onValueChange={(value) => updateForm("priority", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{priorities.map((priority) => <SelectItem key={priority} value={priority}>{priority}</SelectItem>)}</SelectContent></Select></Field><Field label="Servicio"><Input value={form.service_type} onChange={(e) => updateForm("service_type", e.target.value)} /></Field></div><div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button disabled={!canWrite || create.isPending} onClick={() => create.mutate()}>Crear envío</Button></div></Card></div>}
      {busy && <span className="sr-only">Procesando</span>}
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="space-y-1 text-sm"><span className="font-medium">{label}</span>{children}</label>; }
function Row({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4"><span className="text-muted-foreground">{label}</span><span className="text-right">{value}</span></div>; }
