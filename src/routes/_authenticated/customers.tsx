import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader, EmptyState } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ModuleGuard } from "@/components/module-guard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Trash2,
  Users,
  Search,
  Phone,
  Mail,
  MapPin,
  Pencil,
  StickyNote,
  PhoneCall,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
} from "lucide-react";
import { useBizList, useBizInsert, useBizUpdate, useBizDelete, fmtCLP } from "@/lib/biz-data";
import { useMyRole, canWriteOperations } from "@/lib/use-business";
import { formatRut, normalizeRut } from "@/lib/rut";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/customers")({
  head: () => ({ meta: [{ title: "Clientes (CRM) — Nüva One" }] }),
  component: Customers,
});

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  tax_id: string | null;
  address: string | null;
  notes: string | null;
  status: "lead" | "active" | "inactive";
  pipeline_stage: "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
  last_contacted_at: string | null;
  tags: string[];
  created_at: string;
};

type Activity = {
  id: string;
  customer_id: string;
  type: "note" | "call" | "meeting" | "email" | "task";
  content: string;
  due_date: string | null;
  completed: boolean;
  created_at: string;
};

const statusLabel: Record<string, { l: string; c: string }> = {
  lead: { l: "Prospecto", c: "bg-warning/15 text-warning" },
  active: { l: "Activo", c: "bg-success/15 text-success" },
  inactive: { l: "Inactivo", c: "bg-muted text-muted-foreground" },
};

const stageLabel: Record<Customer["pipeline_stage"], { l: string; c: string }> = {
  new: { l: "Nuevo", c: "bg-muted text-muted-foreground" },
  contacted: { l: "Contactado", c: "bg-blue-500/15 text-blue-600" },
  qualified: { l: "Calificado", c: "bg-purple-500/15 text-purple-600" },
  proposal: { l: "Propuesta", c: "bg-warning/15 text-warning" },
  won: { l: "Ganado", c: "bg-success/15 text-success" },
  lost: { l: "Perdido", c: "bg-destructive/15 text-destructive" },
};

const activityMeta: Record<Activity["type"], { l: string; icon: any }> = {
  note: { l: "Nota", icon: StickyNote },
  call: { l: "Llamada", icon: PhoneCall },
  meeting: { l: "Reunión", icon: CalendarDays },
  email: { l: "Email", icon: Mail },
  task: { l: "Tarea", icon: Clock },
};

function Customers() {
  const { data: myRole } = useMyRole();
  const canWrite = canWriteOperations(myRole);
  const { data, isLoading } = useBizList<Customer>("customers", { order: "name", ascending: true });
  const { data: sales } = useBizList<any>("sales", { order: "sale_date" });
  const { data: quotes } = useBizList<any>("quotes", { order: "created_at" });
  const { data: activities } = useBizList<Activity>("customer_activities", {
    order: "created_at",
    ascending: false,
  });
  const insert = useBizInsert("customers");
  const update = useBizUpdate("customers");
  const del = useBizDelete("customers");
  const insertActivity = useBizInsert("customer_activities");
  const updateActivity = useBizUpdate("customer_activities");
  const deleteActivity = useBizDelete("customer_activities");

  const [activityType, setActivityType] = useState<Activity["type"]>("note");
  const [activityContent, setActivityContent] = useState("");
  const [activityDue, setActivityDue] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [detail, setDetail] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Customer["status"]>("all");
  const [tagsInput, setTagsInput] = useState("");
  const [rutInput, setRutInput] = useState("");

  // Métricas de compra por cliente, calculadas desde las ventas ya cargadas
  // (sin nueva tabla ni endpoint: reusa lo que otros módulos ya traen).
  const statsByCustomer = useMemo(() => {
    const map = new Map<string, { total: number; count: number; last: string | null }>();
    for (const s of sales ?? []) {
      if (!s.customer_id) continue;
      const prev = map.get(s.customer_id) ?? { total: 0, count: 0, last: null };
      prev.total += Number(s.total) || 0;
      prev.count += 1;
      if (!prev.last || new Date(s.sale_date) > new Date(prev.last)) prev.last = s.sale_date;
      map.set(s.customer_id, prev);
    }
    return map;
  }, [sales]);

  const filtered = useMemo(() => {
    let list = data ?? [];
    if (statusFilter !== "all") list = list.filter((c) => c.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.tax_id?.toLowerCase().includes(q) ||
          (c.tax_id && normalizeRut(c.tax_id).toLowerCase().includes(normalizeRut(q))),
      );
    }
    return list;
  }, [data, search, statusFilter]);

  const counts = useMemo(() => {
    const list = data ?? [];
    return {
      all: list.length,
      lead: list.filter((c) => c.status === "lead").length,
      active: list.filter((c) => c.status === "active").length,
      inactive: list.filter((c) => c.status === "inactive").length,
    };
  }, [data]);

  function openNew() {
    setEditing(null);
    setTagsInput("");
    setRutInput("");
    setOpen(true);
  }

  function openEdit(c: Customer) {
    setEditing(c);
    setTagsInput((c.tags ?? []).join(", "));
    setRutInput(formatRut(c.tax_id ?? ""));
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const payload = {
      name: String(fd.get("name") || "").trim(),
      phone: String(fd.get("phone") || "") || null,
      email: String(fd.get("email") || "") || null,
      tax_id: rutInput ? formatRut(rutInput) : null,
      address: String(fd.get("address") || "") || null,
      status: String(fd.get("status") || "active"),
      notes: String(fd.get("notes") || "") || null,
      tags,
    };
    if (!payload.name) {
      toast.error("El nombre es obligatorio");
      return;
    }
    if (editing) {
      await update.mutateAsync({ id: editing.id, patch: payload });
    } else {
      await insert.mutateAsync(payload);
    }
    setOpen(false);
    setEditing(null);
  }

  function customerSales(id: string) {
    return (sales ?? []).filter((s) => s.customer_id === id);
  }
  function customerQuotes(id: string) {
    return (quotes ?? []).filter((q) => q.customer_id === id);
  }
  function customerActivities(id: string) {
    return (activities ?? []).filter((a) => a.customer_id === id);
  }

  const openTasksCount = useMemo(
    () => (activities ?? []).filter((a) => a.type === "task" && !a.completed).length,
    [activities],
  );

  async function onAddActivity(customerId: string) {
    if (!activityContent.trim()) {
      toast.error("Escribe un contenido");
      return;
    }
    await insertActivity.mutateAsync({
      customer_id: customerId,
      type: activityType,
      content: activityContent.trim(),
      due_date: activityType === "task" && activityDue ? new Date(activityDue).toISOString() : null,
    });
    setActivityContent("");
    setActivityDue("");
    setActivityType("note");
  }

  async function onToggleTask(a: Activity) {
    await updateActivity.mutateAsync({
      id: a.id,
      patch: {
        completed: !a.completed,
        completed_at: !a.completed ? new Date().toISOString() : null,
      },
    });
  }

  async function onStageChange(c: Customer, stage: Customer["pipeline_stage"]) {
    await update.mutateAsync({ id: c.id, patch: { pipeline_stage: stage } });
    setDetail((d) => (d && d.id === c.id ? { ...d, pipeline_stage: stage } : d));
  }

  return (
    <ModuleGuard module="customers">
      <div className="p-4 md:p-6">
        <PageHeader
          title="Clientes"
          description="CRM: pipeline, historial de compras y seguimiento con tareas y actividades."
          action={
            <>
              {openTasksCount > 0 && (
                <Badge variant="secondary" className="mr-2 gap-1 align-middle">
                  <Clock className="h-3 w-3" /> {openTasksCount} tarea
                  {openTasksCount > 1 ? "s" : ""} pendiente
                  {openTasksCount > 1 ? "s" : ""}
                </Badge>
              )}
              {canWrite && (
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={openNew}>
                      <Plus className="mr-1.5 h-4 w-4" /> Nuevo cliente
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editing ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={onSubmit} className="space-y-3">
                      <div>
                        <Label htmlFor="name">Nombre *</Label>
                        <Input id="name" name="name" defaultValue={editing?.name} required />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="phone">Teléfono</Label>
                          <Input id="phone" name="phone" defaultValue={editing?.phone ?? ""} />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            defaultValue={editing?.email ?? ""}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label htmlFor="tax_id">RUT</Label>
                          <Input
                            id="tax_id"
                            value={rutInput}
                            onChange={(e) => setRutInput(formatRut(e.target.value))}
                            placeholder="12.345.678-9"
                            maxLength={12}
                          />
                        </div>
                        <div>
                          <Label htmlFor="status">Estado</Label>
                          <Select name="status" defaultValue={editing?.status ?? "active"}>
                            <SelectTrigger id="status">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="lead">Prospecto</SelectItem>
                              <SelectItem value="active">Activo</SelectItem>
                              <SelectItem value="inactive">Inactivo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="address">Dirección</Label>
                        <Input id="address" name="address" defaultValue={editing?.address ?? ""} />
                      </div>
                      <div>
                        <Label htmlFor="tags">Etiquetas (separadas por coma)</Label>
                        <Input
                          id="tags"
                          value={tagsInput}
                          onChange={(e) => setTagsInput(e.target.value)}
                          placeholder="mayorista, frecuente, VIP"
                        />
                      </div>
                      <div>
                        <Label htmlFor="notes">Notas</Label>
                        <Textarea
                          id="notes"
                          name="notes"
                          rows={3}
                          defaultValue={editing?.notes ?? ""}
                        />
                      </div>
                      <Button type="submit" className="w-full">
                        {editing ? "Guardar cambios" : "Crear cliente"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </>
          }
        />

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, teléfono, email o RUT"
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "lead", "active", "inactive"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${
                  statusFilter === s
                    ? "border-primary bg-primary/10 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {s === "all" ? "Todos" : statusLabel[s].l} ({counts[s]})
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Sin clientes todavía"
            description="Agrega tu primer cliente para empezar a llevar su historial."
          />
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead className="text-right">Total comprado</TableHead>
                  <TableHead className="text-right">Última compra</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const stats = statsByCustomer.get(c.id);
                  return (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => setDetail(c)}>
                      <TableCell className="font-medium">
                        {c.name}
                        {c.tags?.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {c.tags.map((t) => (
                              <Badge key={t} variant="secondary" className="text-[10px]">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.phone || c.email || "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusLabel[c.status].c}`}
                        >
                          {statusLabel[c.status].l}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${stageLabel[c.pipeline_stage ?? "new"].c}`}
                        >
                          {stageLabel[c.pipeline_stage ?? "new"].l}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{fmtCLP(stats?.total ?? 0)}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {stats?.last ? new Date(stats.last).toLocaleDateString("es-CL") : "—"}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {canWrite && (
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm(`¿Eliminar a ${c.name}?`)) del.mutate(c.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Ficha del cliente: contacto, notas e historial real de compras/cotizaciones */}
        <Sheet open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
          <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
            {detail && (
              <>
                <SheetHeader>
                  <SheetTitle>{detail.name}</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-4">
                  <div>
                    <Label className="text-xs">Etapa del pipeline</Label>
                    <Select
                      value={detail.pipeline_stage ?? "new"}
                      onValueChange={(v) => onStageChange(detail, v as Customer["pipeline_stage"])}
                      disabled={!canWrite}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(stageLabel).map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v.l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {detail.last_contacted_at && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Último contacto:{" "}
                        {new Date(detail.last_contacted_at).toLocaleDateString("es-CL")}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 text-sm">
                    {detail.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" /> {detail.phone}
                      </div>
                    )}
                    {detail.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" /> {detail.email}
                      </div>
                    )}
                    {detail.address && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" /> {detail.address}
                      </div>
                    )}
                    {detail.tax_id && (
                      <div className="text-muted-foreground">RUT: {formatRut(detail.tax_id)}</div>
                    )}
                  </div>

                  {detail.notes && (
                    <Card className="p-3 text-sm text-muted-foreground">{detail.notes}</Card>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <Card className="p-3">
                      <p className="text-xs text-muted-foreground">Total comprado</p>
                      <p className="text-lg font-semibold">
                        {fmtCLP(statsByCustomer.get(detail.id)?.total ?? 0)}
                      </p>
                    </Card>
                    <Card className="p-3">
                      <p className="text-xs text-muted-foreground">N° de compras</p>
                      <p className="text-lg font-semibold">
                        {statsByCustomer.get(detail.id)?.count ?? 0}
                      </p>
                    </Card>
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium">Historial de ventas</p>
                    {customerSales(detail.id).length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin ventas registradas.</p>
                    ) : (
                      <div className="space-y-2">
                        {customerSales(detail.id).map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between rounded-md border p-2 text-sm"
                          >
                            <span>{new Date(s.sale_date).toLocaleDateString("es-CL")}</span>
                            <span className="text-muted-foreground">{s.channel ?? "—"}</span>
                            <span className="font-medium">{fmtCLP(Number(s.total))}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium">Cotizaciones</p>
                    {customerQuotes(detail.id).length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin cotizaciones registradas.</p>
                    ) : (
                      <div className="space-y-2">
                        {customerQuotes(detail.id).map((q) => (
                          <div
                            key={q.id}
                            className="flex items-center justify-between rounded-md border p-2 text-sm"
                          >
                            <span>{new Date(q.created_at).toLocaleDateString("es-CL")}</span>
                            <span className="text-muted-foreground">{q.status}</span>
                            <span className="font-medium">{fmtCLP(Number(q.total))}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-medium">Actividades y tareas</p>
                    {canWrite && (
                      <div className="mb-3 space-y-2 rounded-md border p-2">
                        <div className="flex gap-2">
                          <Select
                            value={activityType}
                            onValueChange={(v) => setActivityType(v as Activity["type"])}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(activityMeta).map(([k, v]) => (
                                <SelectItem key={k} value={k}>
                                  {v.l}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {activityType === "task" && (
                            <Input
                              type="date"
                              value={activityDue}
                              onChange={(e) => setActivityDue(e.target.value)}
                              className="w-36"
                            />
                          )}
                        </div>
                        <Textarea
                          rows={2}
                          placeholder={
                            activityType === "task"
                              ? "Descripción de la tarea..."
                              : "Escribe una nota..."
                          }
                          value={activityContent}
                          onChange={(e) => setActivityContent(e.target.value)}
                        />
                        <Button
                          size="sm"
                          onClick={() => onAddActivity(detail.id)}
                          disabled={insertActivity.isPending}
                        >
                          <Plus className="mr-1 h-3.5 w-3.5" /> Agregar
                        </Button>
                      </div>
                    )}

                    {customerActivities(detail.id).length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin actividades registradas.</p>
                    ) : (
                      <div className="space-y-2">
                        {customerActivities(detail.id).map((a) => {
                          const Icon = activityMeta[a.type].icon;
                          const overdue =
                            a.type === "task" &&
                            !a.completed &&
                            a.due_date &&
                            new Date(a.due_date) < new Date();
                          return (
                            <div
                              key={a.id}
                              className="flex items-start gap-2 rounded-md border p-2 text-sm"
                            >
                              {a.type === "task" ? (
                                <button
                                  onClick={() => canWrite && onToggleTask(a)}
                                  className="mt-0.5 shrink-0"
                                  disabled={!canWrite}
                                >
                                  {a.completed ? (
                                    <CheckCircle2 className="h-4 w-4 text-success" />
                                  ) : (
                                    <Circle
                                      className={`h-4 w-4 ${overdue ? "text-destructive" : "text-muted-foreground"}`}
                                    />
                                  )}
                                </button>
                              ) : (
                                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                              )}
                              <div className="flex-1">
                                <p
                                  className={
                                    a.completed ? "text-muted-foreground line-through" : ""
                                  }
                                >
                                  {a.content}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {activityMeta[a.type].l} ·{" "}
                                  {new Date(a.created_at).toLocaleDateString("es-CL")}
                                  {a.due_date && (
                                    <span className={overdue ? "text-destructive" : ""}>
                                      {" "}
                                      · vence {new Date(a.due_date).toLocaleDateString("es-CL")}
                                    </span>
                                  )}
                                </p>
                              </div>
                              {canWrite && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 shrink-0"
                                  onClick={() => deleteActivity.mutate(a.id)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </ModuleGuard>
  );
}
