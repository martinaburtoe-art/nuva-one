import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Bot, Database, Gauge, Users, Zap } from "lucide-react";

export const Route = createFileRoute("/_authenticated/platform-command-center")({
  head: () => ({ meta: [{ title: "Nüva Command Center" }] }),
  component: PlatformCommandCenter,
});

type Snapshot = { events: number; active_users: number; active_businesses: number; errors: number; ai_events: number; avg_duration_ms: number | null };
const empty: Snapshot = { events: 0, active_users: 0, active_businesses: 0, errors: 0, ai_events: 0, avg_duration_ms: null };

function PlatformCommandCenter() {
  const [snapshot] = useState<Snapshot>(empty);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  useEffect(() => { const timer = window.setInterval(() => setLastUpdate(new Date()), 5000); return () => window.clearInterval(timer); }, []);
  const errorRate = snapshot.events ? (snapshot.errors / snapshot.events) * 100 : 0;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><div className="flex items-center gap-2"><h1 className="text-2xl font-bold">Nüva Command Center</h1><Badge>PLATFORM</Badge></div><p className="text-sm text-muted-foreground">Observabilidad de la plataforma Nüva One.</p></div>
        <Badge variant="outline" className="gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" /> LIVE · {lastUpdate.toLocaleTimeString("es-CL")}</Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={<Users />} label="Usuarios activos" value={snapshot.active_users} />
        <Metric icon={<Database />} label="Negocios activos" value={snapshot.active_businesses} />
        <Metric icon={<Activity />} label="Eventos 24h" value={snapshot.events} />
        <Metric icon={<Gauge />} label="Error rate" value={`${errorRate.toFixed(2)}%`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5"><div className="flex items-center gap-2 font-semibold"><Zap className="h-4 w-4" /> Rendimiento</div><div className="mt-4 text-3xl font-bold">{snapshot.avg_duration_ms == null ? "—" : `${Math.round(snapshot.avg_duration_ms)} ms`}</div><p className="text-sm text-muted-foreground">Duración media registrada</p></Card>
        <Card className="p-5"><div className="flex items-center gap-2 font-semibold"><Bot className="h-4 w-4" /> IA</div><div className="mt-4 text-3xl font-bold">{snapshot.ai_events}</div><p className="text-sm text-muted-foreground">Eventos IA registrados en 24h</p></Card>
        <Card className="p-5"><div className="flex items-center gap-2 font-semibold"><Activity className="h-4 w-4" /> Salud</div><div className="mt-4 text-3xl font-bold">Operational</div><p className="text-sm text-muted-foreground">Esperando telemetría real</p></Card>
      </div>
      <Card className="p-6">
        <h2 className="font-semibold">Observabilidad de plataforma</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4"><Health label="Frontend" status="Telemetry planned" /><Health label="API" status="Telemetry planned" /><Health label="Supabase" status="Telemetry planned" /><Health label="AI" status="Telemetry planned" /></div>
        <p className="mt-5 text-xs text-muted-foreground">No se muestran métricas simuladas. Los valores permanecerán en cero hasta conectar el endpoint seguro de ingestión y la autorización exclusiva de plataforma.</p>
      </Card>
    </div>
  );
}
function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) { return <Card className="p-5"><div className="flex items-center gap-2 text-muted-foreground">{icon}<span className="text-sm">{label}</span></div><div className="mt-3 text-3xl font-bold">{value}</div></Card>; }
function Health({ label, status }: { label: string; status: string }) { return <div className="rounded-xl border p-4"><div className="flex items-center justify-between"><span className="font-medium">{label}</span><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /></div><p className="mt-1 text-xs text-muted-foreground">{status}</p></div>; }
