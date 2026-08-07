import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness } from "@/lib/use-business";
import { useAuth } from "@/lib/use-auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Download, FileText, Search, Eye, PlusCircle, Pencil, Trash2, Users } from "lucide-react";
import { downloadCsv } from "@/lib/export";
import { MultiSelectFilter } from "@/components/multi-select-filter";
import {
  ACTION_LABELS,
  ACTION_COLORS,
  ENTITY_LABELS,
  actionLabel,
  entityLabel,
  summarizeAuditEntry,
  displayUserName,
  type ResolvedUser,
} from "@/lib/audit-labels";
import { generateAuditReportPdf } from "@/lib/audit-report-pdf";

type AuditRow = {
  id: string;
  created_at: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  user_id: string | null;
  metadata: unknown;
};

const ACTION_ICONS: Record<string, typeof PlusCircle> = {
  INSERT: PlusCircle,
  UPDATE: Pencil,
  DELETE: Trash2,
};

function ActionBadge({ action }: { action: string }) {
  const colors = ACTION_COLORS[action];
  const Icon = ACTION_ICONS[action];
  return (
    <Badge
      variant="outline"
      className={`gap-1 border-transparent font-semibold ${colors?.bg ?? "bg-muted"} ${colors?.text ?? "text-muted-foreground"}`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {actionLabel(action)}
    </Badge>
  );
}

export function AuditLogView() {
  const { active } = useActiveBusiness();
  const { user } = useAuth();

  const [actionFilter, setActionFilter] = useState<string[]>([]);
  const [entityFilter, setEntityFilter] = useState<string[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [detailRow, setDetailRow] = useState<AuditRow | null>(null);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    enabled: !!active?.id,
    queryKey: ["audit_log", active?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, created_at, action, entity, entity_id, user_id, metadata")
        .eq("business_id", active!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });

  const { data: members } = useQuery({
    enabled: !!active?.id,
    queryKey: ["business-members-audit", active?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_business_members", {
        p_business_id: active!.id,
      });
      if (error) throw error;
      return (data ?? []) as {
        user_id: string;
        email: string;
        full_name: string | null;
        role: string;
      }[];
    },
  });

  const users: Record<string, ResolvedUser> = useMemo(() => {
    const map: Record<string, ResolvedUser> = {};
    (members ?? []).forEach((m) => {
      map[m.user_id] = { full_name: m.full_name, email: m.email, role: m.role };
    });
    return map;
  }, [members]);

  const entityOptions = useMemo(
    () => Object.entries(ENTITY_LABELS).map(([value, label]) => ({ value, label })),
    [],
  );
  const actionOptions = useMemo(
    () => Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label })),
    [],
  );

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (actionFilter.length) rows = rows.filter((r) => actionFilter.includes(r.action));
    if (entityFilter.length) rows = rows.filter((r) => r.entity && entityFilter.includes(r.entity));
    if (from) rows = rows.filter((r) => new Date(r.created_at) >= new Date(from));
    if (to) rows = rows.filter((r) => new Date(r.created_at) <= new Date(`${to}T23:59:59`));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => {
        const detail = summarizeAuditEntry(r.action, r.entity, r.metadata).toLowerCase();
        const userName = displayUserName(r.user_id, users).toLowerCase();
        return (
          detail.includes(q) ||
          userName.includes(q) ||
          entityLabel(r.entity).toLowerCase().includes(q) ||
          actionLabel(r.action).toLowerCase().includes(q)
        );
      });
    }
    return rows;
  }, [data, actionFilter, entityFilter, from, to, search, users]);

  const kpis = useMemo(() => {
    const inserts = filtered.filter((r) => r.action === "INSERT").length;
    const updates = filtered.filter((r) => r.action === "UPDATE").length;
    const deletes = filtered.filter((r) => r.action === "DELETE").length;
    const activeUsers = new Set(filtered.map((r) => r.user_id).filter(Boolean)).size;
    return { total: filtered.length, inserts, updates, deletes, activeUsers };
  }, [filtered]);

  const hasActiveFilters =
    actionFilter.length > 0 || entityFilter.length > 0 || !!from || !!to || !!search.trim();

  async function handleExportPdf() {
    if (!active?.id || filtered.length === 0) return;
    setExporting(true);
    try {
      const generatedBy = users[user?.id ?? ""]?.full_name || user?.email || "Usuario Nüva One";
      await generateAuditReportPdf(
        active.name ?? "Negocio",
        filtered,
        users,
        {
          actions: actionFilter,
          entities: entityFilter,
          from: from || null,
          to: to || null,
          search: search.trim() || undefined,
        },
        generatedBy,
      );
    } finally {
      setExporting(false);
    }
  }

  function handleExportCsv() {
    downloadCsv(
      `auditoria-${active?.name ?? "negocio"}.csv`,
      filtered.map((r) => ({
        fecha: new Date(r.created_at).toLocaleString("es-CL"),
        accion: actionLabel(r.action),
        modulo: entityLabel(r.entity),
        usuario: displayUserName(r.user_id, users),
        detalle: summarizeAuditEntry(r.action, r.entity, r.metadata),
      })),
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* KPIs: scroll horizontal en móvil, grilla fija desde tablet */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-5">
        <div className="w-[128px] shrink-0 rounded-lg border bg-card p-3 sm:w-auto">
          <p className="text-[11px] font-medium text-muted-foreground">Total eventos</p>
          <p className="text-xl font-bold">{kpis.total}</p>
        </div>
        <div className="w-[128px] shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-500/10 sm:w-auto">
          <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
            Creaciones
          </p>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{kpis.inserts}</p>
        </div>
        <div className="w-[128px] shrink-0 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-500/10 sm:w-auto">
          <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
            Modificaciones
          </p>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-400">{kpis.updates}</p>
        </div>
        <div className="w-[128px] shrink-0 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-500/10 sm:w-auto">
          <p className="text-[11px] font-medium text-red-700 dark:text-red-400">Eliminaciones</p>
          <p className="text-xl font-bold text-red-700 dark:text-red-400">{kpis.deletes}</p>
        </div>
        <div className="w-[128px] shrink-0 rounded-lg border bg-card p-3 sm:w-auto">
          <p className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
            <Users className="h-3 w-3 shrink-0" /> Usuarios activos
          </p>
          <p className="text-xl font-bold">{kpis.activeUsers}</p>
        </div>
      </div>

      {/* Filtros: apilados y a ancho completo en móvil, en línea desde tablet */}
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="relative w-full sm:w-44">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full pl-8 text-sm sm:h-8"
          />
        </div>

        <div className="flex gap-2">
          <MultiSelectFilter
            label="Acción"
            options={actionOptions}
            selected={actionFilter}
            onChange={setActionFilter}
          />
          <MultiSelectFilter
            label="Módulo"
            options={entityOptions}
            selected={entityFilter}
            onChange={setEntityFilter}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase text-muted-foreground">Desde</span>
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="h-9 w-full text-sm sm:h-8 sm:w-[132px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-medium uppercase text-muted-foreground">Hasta</span>
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="h-9 w-full text-sm sm:h-8 sm:w-[132px]"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 self-start text-xs sm:self-auto"
            onClick={() => {
              setActionFilter([]);
              setEntityFilter([]);
              setFrom("");
              setTo("");
              setSearch("");
            }}
          >
            Limpiar filtros
          </Button>
        )}

        <div className="flex gap-2 sm:ml-auto">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
            disabled={filtered.length === 0}
            onClick={handleExportCsv}
          >
            <Download className="mr-1.5 h-4 w-4" /> CSV
          </Button>
          <Button
            size="sm"
            className="flex-1 sm:flex-none"
            disabled={filtered.length === 0 || exporting}
            onClick={handleExportPdf}
          >
            <FileText className="mr-1.5 h-4 w-4" /> {exporting ? "Generando…" : "Informe PDF"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : !data || data.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aún no hay actividad registrada.
        </p>
      ) : filtered.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Ningún evento coincide con los filtros aplicados.
        </p>
      ) : (
        <>
          {/* Móvil: lista de tarjetas (evita apretar una tabla ancha en pantallas chicas) */}
          <div className="space-y-2 sm:hidden">
            {filtered.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setDetailRow(r)}
                className="w-full rounded-lg border bg-card p-3 text-left transition-colors active:bg-muted"
              >
                <div className="flex items-start justify-between gap-2">
                  <ActionBadge action={r.action} />
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("es-CL", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="mt-1.5 text-sm font-medium">{entityLabel(r.entity)}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {summarizeAuditEntry(r.action, r.entity, r.metadata)}
                </p>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {displayUserName(r.user_id, users)}
                  {users[r.user_id ?? ""]?.role && ` · ${users[r.user_id ?? ""]?.role}`}
                </p>
              </button>
            ))}
          </div>

          {/* Tablet / escritorio: tabla completa, con scroll horizontal propio si hace falta */}
          <div className="hidden overflow-x-auto rounded-md border sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Detalle</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => setDetailRow(r)}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("es-CL")}
                    </TableCell>
                    <TableCell>
                      <ActionBadge action={r.action} />
                    </TableCell>
                    <TableCell className="text-xs">{entityLabel(r.entity)}</TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium">{displayUserName(r.user_id, users)}</div>
                      {users[r.user_id ?? ""]?.role && (
                        <div className="text-[10px] capitalize text-muted-foreground">
                          {users[r.user_id ?? ""]?.role}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[260px] truncate text-xs text-muted-foreground">
                      {summarizeAuditEntry(r.action, r.entity, r.metadata)}
                    </TableCell>
                    <TableCell>
                      <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
      <p className="text-xs text-muted-foreground">
        Mostrando {filtered.length} de {data?.length ?? 0} eventos registrados (últimos 200). Toca
        un evento para ver el detalle completo.
      </p>

      <Dialog open={!!detailRow} onOpenChange={(open) => !open && setDetailRow(null)}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailRow && <ActionBadge action={detailRow.action} />}
              {detailRow && entityLabel(detailRow.entity)}
            </DialogTitle>
            <DialogDescription>
              {detailRow && new Date(detailRow.created_at).toLocaleString("es-CL")} ·{" "}
              {detailRow && displayUserName(detailRow.user_id, users)}
            </DialogDescription>
          </DialogHeader>
          {detailRow && (
            <div className="space-y-3 text-sm">
              <p className="rounded-md bg-muted p-3">
                {summarizeAuditEntry(detailRow.action, detailRow.entity, detailRow.metadata)}
              </p>
              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Datos técnicos</p>
                <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed">
                  {JSON.stringify(
                    { entity_id: detailRow.entity_id, ...((detailRow.metadata as object) ?? {}) },
                    null,
                    2,
                  )}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
