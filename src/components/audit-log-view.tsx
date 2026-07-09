import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness } from "@/lib/use-business";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { downloadCsv } from "@/lib/export";

type AuditRow = {
  id: string;
  created_at: string;
  action: string;
  entity: string | null;
  user_id: string | null;
  metadata: unknown;
};

export function AuditLogView() {
  const { active } = useActiveBusiness();
  const { data, isLoading } = useQuery({
    enabled: !!active?.id,
    queryKey: ["audit_log", active?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, created_at, action, entity, user_id, metadata")
        .eq("business_id", active!.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as AuditRow[];
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Últimas 200 acciones registradas en este negocio.
        </p>
        <Button
          variant="outline"
          size="sm"
          disabled={!data || data.length === 0}
          onClick={() =>
            downloadCsv(
              `auditoria-${active?.name ?? "negocio"}.csv`,
              (data ?? []).map((r) => ({
                fecha: new Date(r.created_at).toLocaleString("es-CL"),
                accion: r.action,
                entidad: r.entity ?? "",
                usuario: r.user_id ?? "",
                metadata: r.metadata ?? "",
              })),
            )
          }
        >
          <Download className="mr-1.5 h-4 w-4" /> Exportar CSV
        </Button>
      </div>
      {isLoading ? (
        <Skeleton className="h-40" />
      ) : !data || data.length === 0 ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aún no hay actividad registrada.
        </p>
      ) : (
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Entidad</TableHead>
                <TableHead>Usuario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("es-CL")}
                  </TableCell>
                  <TableCell className="font-medium">{r.action}</TableCell>
                  <TableCell className="text-xs">{r.entity ?? "—"}</TableCell>
                  <TableCell className="font-mono text-[11px] text-muted-foreground">
                    {r.user_id ? r.user_id.slice(0, 8) : "sistema"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
