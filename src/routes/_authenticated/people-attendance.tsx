import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Clock3, Plus } from "lucide-react";
import { ModuleGuard } from "@/components/module-guard";
import { PageHeader } from "@/components/page-utils";
import { PeopleBackLink } from "@/components/people-back-link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBizInsert, useBizList } from "@/lib/biz-data";

export const Route = createFileRoute("/_authenticated/people-attendance")({ component: PeopleAttendance });

function PeopleAttendance() {
  const { data: employees=[] } = useBizList<any>("people_employees",{order:"last_name"});
  const { data: events=[],isLoading } = useBizList<any>("people_attendance_events",{order:"event_at"});
  const insert=useBizInsert("people_attendance_events");
  const [form,setForm]=useState({employee_id:"",event_type:"check_in",event_at:new Date().toISOString().slice(0,16),source:"manual"});
  async function save(){if(!form.employee_id)return;await insert.mutateAsync({...form,event_at:new Date(form.event_at).toISOString(),metadata:{manual:true}});}
  const today=new Date().toISOString().slice(0,10);
  const todayEvents=events.filter((e:any)=>String(e.event_at).slice(0,10)===today);
  return <ModuleGuard module="people"><div className="p-4 md:p-6"><PageHeader title="Asistencia y jornada" description="Registra entradas, salidas e incidencias y deja los eventos disponibles para remuneraciones." actions={<PeopleBackLink />} />
    <Card className="mb-5 rounded-2xl p-5"><div className="flex items-center gap-3"><Clock3 className="h-5 w-5"/><div><p className="font-semibold">Registrar evento</p><p className="text-sm text-muted-foreground">Carga manual para corregir o completar la jornada.</p></div></div><div className="mt-4 grid gap-3 md:grid-cols-4"><div className="md:col-span-2"><Label>Colaborador</Label><select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.employee_id} onChange={e=>setForm(v=>({...v,employee_id:e.target.value}))}><option value="">Seleccionar...</option>{employees.map((e:any)=><option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}</select></div><div><Label>Evento</Label><select className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.event_type} onChange={e=>setForm(v=>({...v,event_type:e.target.value}))}><option value="check_in">Entrada</option><option value="check_out">Salida</option><option value="break_start">Inicio colación</option><option value="break_end">Fin colación</option></select></div><div><Label>Fecha y hora</Label><Input type="datetime-local" value={form.event_at} onChange={e=>setForm(v=>({...v,event_at:e.target.value}))}/></div></div><div className="mt-4 flex justify-end"><Button onClick={save} disabled={insert.isPending||!form.employee_id}><Plus className="mr-2 h-4 w-4"/>Registrar</Button></div></Card>
    <Card className="rounded-2xl p-5"><h2 className="font-semibold">Eventos de hoy</h2>{isLoading?<p className="mt-4 text-sm text-muted-foreground">Cargando...</p>:<div className="mt-4 space-y-2">{todayEvents.slice(0,50).map((e:any)=><div key={e.id} className="flex flex-wrap justify-between gap-2 rounded-xl border p-3 text-sm"><span>{employees.find((x:any)=>x.id===e.employee_id)?.first_name} {employees.find((x:any)=>x.id===e.employee_id)?.last_name} · {e.event_type}</span><span className="text-muted-foreground">{new Date(e.event_at).toLocaleString("es-CL")}</span></div>)}{todayEvents.length===0&&<p className="text-sm text-muted-foreground">No hay eventos registrados hoy.</p>}</div>}</Card>
  </div></ModuleGuard>;
}
