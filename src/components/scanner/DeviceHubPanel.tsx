import { useCallback, useEffect, useState } from "react";
import { MonitorSmartphone, RefreshCw, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useMyRole } from "@/lib/use-business";
import { revokeMobileScannerDevice, revokeMobileScannerSession } from "@/lib/mobile-scanner-bridge";
import { toast } from "sonner";

type DeviceCard = {
  id: string;
  deviceId: string | null;
  sessionId: string | null;
  device_name: string;
  status: "pending" | "paired" | "revoked" | "expired" | "disconnected";
  active_module: string;
  active_operation_id: string | null;
  paired_by: string | null;
  created_by: string;
  created_at: string;
  paired_at: string | null;
  last_seen_at: string | null;
  expires_at: string | null;
  pair_code_expires_at: string | null;
  revoked_at: string | null;
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
  const [devices, setDevices] = useState<DeviceCard[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const isAdmin = role === "owner" || role === "admin";

  const refresh = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const client = supabase as any;
      const [registryResult, sessionsResult] = await Promise.all([
        client.from("mobile_scanner_devices")
          .select("id,display_name,created_by,last_paired_by,last_seen_at,revoked_at,created_at")
          .eq("business_id", businessId)
          .order("last_seen_at", { ascending: false })
          .limit(50),
        client.from("mobile_scanner_sessions")
          .select("id,device_id,device_name,status,active_module,active_operation_id,paired_by,created_by,created_at,paired_at,last_seen_at,expires_at,pair_code_expires_at")
          .eq("business_id", businessId)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      if (registryResult.error) throw registryResult.error;
      if (sessionsResult.error) throw sessionsResult.error;

      const sessions = sessionsResult.data ?? [];
      const stableCards: DeviceCard[] = (registryResult.data ?? []).map((device: any) => {
        const linked = sessions
          .filter((session: any) => session.device_id === device.id)
          .sort((a: any, b: any) => new Date(b.last_seen_at ?? b.created_at).getTime() - new Date(a.last_seen_at ?? a.created_at).getTime());
        const latest = linked[0] ?? null;
        const status: DeviceCard["status"] = device.revoked_at
          ? "revoked"
          : latest?.status === "paired"
            ? "paired"
            : latest?.status === "pending"
              ? "pending"
              : latest
                ? latest.status === "revoked" ? "disconnected" : "expired"
                : "disconnected";
        return {
          id: device.id,
          deviceId: device.id,
          sessionId: latest?.id ?? null,
          device_name: device.display_name || latest?.device_name || "Nüva Mobile",
          status,
          active_module: latest?.active_module ?? "",
          active_operation_id: latest?.active_operation_id ?? null,
          paired_by: device.last_paired_by ?? latest?.paired_by ?? null,
          created_by: device.created_by,
          created_at: device.created_at,
          paired_at: latest?.paired_at ?? null,
          last_seen_at: device.last_seen_at ?? latest?.last_seen_at ?? null,
          expires_at: latest?.expires_at ?? null,
          pair_code_expires_at: latest?.pair_code_expires_at ?? null,
          revoked_at: device.revoked_at,
        };
      });

      // Keep pre-registry sessions visible during the migration window.
      const legacyCards: DeviceCard[] = sessions
        .filter((session: any) => !session.device_id)
        .map((session: any) => ({
          id: `legacy:${session.id}`,
          deviceId: null,
          sessionId: session.id,
          device_name: session.device_name || "Nüva Mobile",
          status: session.status,
          active_module: session.active_module,
          active_operation_id: session.active_operation_id,
          paired_by: session.paired_by,
          created_by: session.created_by,
          created_at: session.created_at,
          paired_at: session.paired_at,
          last_seen_at: session.last_seen_at,
          expires_at: session.expires_at,
          pair_code_expires_at: session.pair_code_expires_at,
          revoked_at: null,
        }));
      setDevices([...stableCards, ...legacyCards]);
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
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!businessId) return;
    const channel = supabase.channel(`device-hub:${businessId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "mobile_scanner_sessions",
        filter: `business_id=eq.${businessId}`,
      }, () => { void refresh(); })
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "mobile_scanner_devices",
        filter: `business_id=eq.${businessId}`,
      }, () => { void refresh(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [businessId, refresh]);

  async function revoke(device: DeviceCard) {
    if (revoking) return;
    setRevoking(device.id);
    try {
      if (device.deviceId) {
        await revokeMobileScannerDevice(device.deviceId);
      } else if (device.sessionId) {
        await revokeMobileScannerSession(device.sessionId);
      }
      toast.success(`Dispositivo "${device.device_name}" revocado`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo revocar el dispositivo");
    } finally {
      setRevoking(null);
    }
  }

  const onlineCount = devices.filter(device =>
    device.status === "paired"
    && !!device.expires_at
    && new Date(device.expires_at).getTime() > Date.now()
    && !!device.last_seen_at
    && Date.now() - new Date(device.last_seen_at).getTime() < 120_000
  ).length;

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MonitorSmartphone className="h-4 w-4 text-primary" />
          <div>
            <h3 className="font-semibold">Device Hub</h3>
            <p className="text-xs text-muted-foreground">Identidad estable y sesiones de los dispositivos de este negocio</p>
          </div>
          <Badge variant="secondary">{onlineCount} en línea</Badge>
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
            const leased = device.status === "paired" && !!device.expires_at && new Date(device.expires_at).getTime() > Date.now();
            const active = leased && !!device.last_seen_at && Date.now() - new Date(device.last_seen_at).getTime() < 120_000;
            const pendingExpired = device.status === "pending" && !!device.pair_code_expires_at && new Date(device.pair_code_expires_at).getTime() <= Date.now();
            const canRevoke = isAdmin || device.created_by === userId || device.paired_by === userId;
            const statusLabel = active ? "En línea"
              : leased ? "Vinculado"
                : pendingExpired ? "Expirado"
                  : device.status === "pending" ? "Pendiente"
                    : device.status === "revoked" ? "Revocado"
                      : device.status === "disconnected" ? "Desconectado"
                        : "Expirado";
            return (
              <div key={device.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <MonitorSmartphone className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{device.device_name || "Nüva Mobile"}</span>
                    <Badge variant={active ? "default" : device.status === "pending" ? "secondary" : "outline"}>
                      {statusLabel}
                    </Badge>
                    {device.deviceId && <Badge variant="outline">ID estable</Badge>}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span>{moduleLabels[device.active_module] ?? (device.active_module || "Sin módulo activo")}</span>
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
        La identidad del dispositivo persiste entre sesiones. Revocar el dispositivo bloquea sus sesiones actuales y futuros envíos.
      </div>
    </Card>
  );
}
