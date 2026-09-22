import { createFileRoute } from "@tanstack/react-router";
import { Clock3 } from "lucide-react";
import { ModuleGuard } from "@/components/module-guard";
import { PageHeader } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { useBizList } from "@/lib/biz-data";

export const Route = createFileRoute("/_authenticated/people-attendance")({ component: PeopleAttendance });

function PeopleAttendance() {
  const { data: events = [], isLoading } = useBizList<any>("people_attendance_events", { order: "event_at" });
  const today = new Date().toISOString().slice(0, 10);
  const todayEvents = events.filter((e: any) => String(e.event_at).slice(0, 10) === today);
  return <ModuleGuard module="people"><div className="p-4 md:p-6"><PageHeader title="Asistencia y jornada" description="Eventos de jornada, turnos e incidencias preparados para integrarse con remuneraciones." /><Card className="rounded-2xl p-5"><div className="flex items-center gap-3"><Clock3 className="h-5 w-5" /><div><p className="font-semibold">Eventos de hoy</p><p className="text-sm text-muted-foreground">{todayEvents.length} registros</p></div></div>{isLoading ? <p className="mt-4 text-sm text-muted-foreground">Cargando...</p> : <div className="mt-5 space-y-2">{todayEvents.slice(0,20).map((e: any) => <div key={e.id} className="flex justify-between rounded-xl border p-3 text-sm"><span>{e.event_type}</span><span className="text-muted-foreground">{new Date(e.event_at).toLocaleString('es-CL')}</span></div>)}{todayEvents.length === 0 && <p className="text-sm text-muted-foreground">No hay eventos registrados hoy.</p>}</div>}</Card></div></ModuleGuard>;
}
