import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, Users } from "lucide-react";
import { ModuleGuard } from "@/components/module-guard";
import { PageHeader } from "@/components/page-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBizInsert, useBizList } from "@/lib/biz-data";

export const Route = createFileRoute("/_authenticated/people-employees")({ component: PeopleEmployees });

function PeopleEmployees() {
  const { data: employees = [], isLoading } = useBizList<any>("people_employees", { order: "last_name" });
  const insert = useBizInsert("people_employees");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", national_id: "", email: "", job_title: "", hire_date: new Date().toISOString().slice(0, 10) });

  async function save() {
    if (!form.first_name || !form.last_name) return;
    await insert.mutateAsync(form);
    setForm({ first_name: "", last_name: "", national_id: "", email: "", job_title: "", hire_date: new Date().toISOString().slice(0, 10) });
    setOpen(false);
  }

  return <ModuleGuard module="people"><div className="p-4 md:p-6">
    <PageHeader title="Colaboradores" description="Ficha laboral, estructura y estado de cada persona de tu empresa." />
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div className="relative w-full max-w-sm"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar colaborador..." /></div>
      <Button onClick={() => setOpen((v) => !v)}><Plus className="mr-2 h-4 w-4" />Nuevo colaborador</Button>
    </div>
    {open && <Card className="mb-5 rounded-2xl p-5"><div className="grid gap-4 md:grid-cols-3">
      {[['first_name','Nombre'],['last_name','Apellidos'],['national_id','RUT'],['email','Correo'],['job_title','Cargo'],['hire_date','Fecha ingreso']].map(([key,label]) => <div key={key}><Label>{label}</Label><Input className="mt-1" type={key === 'hire_date' ? 'date' : 'text'} value={(form as any)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} /></div>)}
    </div><div className="mt-4 flex justify-end"><Button onClick={save} disabled={insert.isPending}>{insert.isPending ? 'Guardando...' : 'Guardar colaborador'}</Button></div></Card>}
    {isLoading ? <p className="text-sm text-muted-foreground">Cargando colaboradores...</p> : employees.length === 0 ? <Card className="rounded-2xl border-dashed p-10 text-center"><Users className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-medium">Aún no hay colaboradores</p><p className="mt-1 text-sm text-muted-foreground">Agrega el equipo para activar contratos, asistencia y remuneraciones.</p></Card> : <div className="grid gap-3">{employees.map((e: any) => <Card key={e.id} className="rounded-2xl p-4"><div className="flex items-center justify-between gap-4"><div><p className="font-semibold">{e.first_name} {e.last_name}</p><p className="text-sm text-muted-foreground">{e.job_title || 'Sin cargo'} · {e.email || 'Sin correo'}</p></div><span className="rounded-full bg-muted px-3 py-1 text-xs">{e.employment_status}</span></div></Card>)}</div>}
  </div></ModuleGuard>;
}
