import { useCallback, useEffect, useState } from "react";
import { MonitorSmartphone, RefreshCw, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useMyRole } from "@/lib/use-business";
import { revokeMobileScannerSession } from "@/lib/mobile-scanner-bridge";
import { toast } from "sonner";

type DeviceSession = {
  id: string;
  device_name: string;
  status: "pending" | "paired" | "revoked" | "expired";
  active_module: string;
  active_operation_id: string | null;
  paired_by: string | null;
  created_by: string;
  created_at: string;
  paired_at: string | null;
  last_seen_at: string | null;
  expires_at: string;
};

const moduleLabels: Record<string, string> = {
  pos: "Caja",
  inventory: "Inventario",
  receiving: "Recepción",
  picking: "Preparación",
  dispatch: "Despacho",
  returns: "Devoluciones",
  transfers: "Traslados",
};

export function DeviceHubPanel({ businessId }: { businessId: string }) {
  const { data: role } = useMyRole();
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const isAdmin = role === "owner" || role === "admin";

  const refresh = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const client = supabase as any;
      const { data, error } = await client.from("mobile_scanner_sessions")
        .select("id,device_name,status,active_module,active_operation_id,paired_by,created_by,created_at,paired_at,last_seen_at,expires_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      setDevices((data ?? []) as DeviceSession[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar Device Hub");
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!businessId) return;
    const channel = supabase.channel(`device-hub:${businessId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "mobile_scanner_sessions",
        filter: `business_id=eq.${businessId}`,
      }, () => { void refresh(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [businessId, refresh]);

  async function revoke(device: DeviceSession) {
    if (revoking) return;
    setRevoking(device.id);
    try {
      await revokeMobileScannerSession(device.id);
      toast.success(`Dispositivo "${device.device_name}" revocado`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo revocar el dispositivo");
    } finally {
      setRevoking(null);
    }
  }

  const activeCount = devices.filter(d => d.status === "paired" && new Date(d.expires_at).getTime() > Date.now()).length;

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MonitorSmartphone className="h-4 w-4 text-primary" />
          <div>
            <h3 className="font-semibold">Device Hub</h3>
            <p className="text-xs text-muted-foreground">Dispositivos vinculados a este negocio</p>
          </div>
          <Badge variant="secondary">{activeCount} activos</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />Actualizar
        </Button>
      </div>
      {devices.length === 0 && !loading ? (
        <p className="py-5 text-center text-sm text-muted-foreground">Todavía no hay dispositivos vinculados.</p>
      ) : (
        <div className="space-y-2">
          {devices.map(device => {
            const active = device.status === "paired" && new Date(device.expires_at).getTime() > Date.now();
            const canRevoke = isAdmin || device.created_by === userId || device.paired_by === userId;
            return (
              <div key={device.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <MonitorSmartphone className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{device.device_name || "Nüva Mobile"}</span>
                    <Badge variant={active ? "default" : device.status === "pending" ? "secondary" : "outline"}>
                      {active ? "Conectado" : device.status === "pending" ? "Pendiente" : device.status === "revoked" ? "Revocado" : "Expirado"}
                    </Badge>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span>{moduleLabels[device.active_module] ?? device.active_module}</span>
                    <span>{device.last_seen_at ? `Última actividad ${new Date(device.last_seen_at).toLocaleString("es-CL")}` : "Sin actividad registrada"}</span>
                    <span className="font-mono">{device.id.slice(0, 8)}…</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {active ? <Wifi className="h-4 w-4 text-primary" /> : <WifiOff className="h-4 w-4 text-muted-foreground" />}
                  {canRevoke && device.status !== "revoked" && (
                    <Button size="sm" variant="outline" disabled={revoking === device.id} onClick={() => void revoke(device)}>
                      {revoking === device.id ? "Revocando…" : "Revocar"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Cada dispositivo mantiene su propia sesión autenticada. Revocar impide que vuelva a enviar lecturas.
      </div>
    </Card>
  );
}
