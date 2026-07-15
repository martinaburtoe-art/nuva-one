import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

type Shift = {
  id: string;
  employee_name: string;
  employee_phone: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  week_start: string;
};

function getWeekStart(offsetWeeks = 0): string {
  const now = new Date();
  const day = now.getDay() === 0 ? 7 : now.getDay(); // Monday-based week
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1 + offsetWeeks * 7);
  return monday.toISOString().slice(0, 10);
}

export function ShiftsTable({ businessId }: { businessId: string }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(() => getWeekStart(weekOffset), [weekOffset]);
  const queryClient = useQueryClient();

  const { data: shifts, isLoading } = useQuery({
    queryKey: ["shifts", businessId, weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shifts")
        .select("id, employee_name, employee_phone, day_of_week, start_time, end_time, week_start")
        .eq("business_id", businessId)
        .eq("week_start", weekStart)
        .order("day_of_week", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Shift[];
    },
  });

  const [draft, setDraft] = useState({
    employee_name: "",
    employee_phone: "",
    day_of_week: 0,
    start_time: "09:00",
    end_time: "18:00",
  });

  async function addShift() {
    if (!draft.employee_name.trim()) {
      toast.error("Ingresa el nombre del empleado");
      return;
    }
    const { error } = await supabase.from("shifts").insert({
      business_id: businessId,
      week_start: weekStart,
      employee_name: draft.employee_name.trim(),
      employee_phone: draft.employee_phone.trim() || null,
      day_of_week: draft.day_of_week,
      start_time: draft.start_time,
      end_time: draft.end_time,
    });
    if (error) {
      toast.error("No se pudo guardar el turno");
      return;
    }
    setDraft((d) => ({ ...d, employee_name: "", employee_phone: "" }));
    queryClient.invalidateQueries({ queryKey: ["shifts", businessId, weekStart] });
    toast.success("Turno agregado");
  }

  async function deleteShift(id: string) {
    const { error } = await supabase.from("shifts").delete().eq("id", id);
    if (error) {
      toast.error("No se pudo eliminar");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["shifts", businessId, weekStart] });
  }

  function sendWhatsApp(shift: Shift) {
    if (!shift.employee_phone) {
      toast.error("Este empleado no tiene teléfono registrado");
      return;
    }
    const msg = encodeURIComponent(
      `Hola ${shift.employee_name}, tu turno es el ${DAYS[shift.day_of_week]} de ${shift.start_time.slice(0, 5)} a ${shift.end_time.slice(0, 5)}.`
    );
    const phone = shift.employee_phone.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  }

  function sendAllWhatsApp() {
    if (!shifts || shifts.length === 0) return;
    const withPhone = shifts.filter((s) => s.employee_phone);
    if (withPhone.length === 0) {
      toast.error("Ningún empleado tiene teléfono registrado");
      return;
    }
    withPhone.forEach((s, i) => setTimeout(() => sendWhatsApp(s), i * 400));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">
            Semana del {new Date(weekStart + "T00:00:00").toLocaleDateString("es-CL", { day: "2-digit", month: "long" })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={sendAllWhatsApp} disabled={!shifts?.length}>
          <MessageCircle className="h-4 w-4 mr-2" /> Enviar todos por WhatsApp
        </Button>
      </div>

      <Card className="p-4 space-y-3">
        <p className="text-sm font-medium">Agregar turno</p>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          <Input
            placeholder="Nombre del empleado"
            value={draft.employee_name}
            onChange={(e) => setDraft((d) => ({ ...d, employee_name: e.target.value }))}
          />
          <Input
            placeholder="Teléfono (56912345678)"
            value={draft.employee_phone}
            onChange={(e) => setDraft((d) => ({ ...d, employee_phone: e.target.value }))}
          />
          <select
            className="border rounded-md px-3 py-2 text-sm bg-background"
            value={draft.day_of_week}
            onChange={(e) => setDraft((d) => ({ ...d, day_of_week: Number(e.target.value) }))}
          >
            {DAYS.map((d, i) => (
              <option key={i} value={i}>{d}</option>
            ))}
          </select>
          <Input
            type="time"
            value={draft.start_time}
            onChange={(e) => setDraft((d) => ({ ...d, start_time: e.target.value }))}
          />
          <Input
            type="time"
            value={draft.end_time}
            onChange={(e) => setDraft((d) => ({ ...d, end_time: e.target.value }))}
          />
        </div>
        <Button size="sm" onClick={addShift}>
          <Plus className="h-4 w-4 mr-2" /> Agregar
        </Button>
      </Card>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        ) : !shifts?.length ? (
          <p className="p-6 text-sm text-muted-foreground text-center">
            Sin turnos asignados esta semana.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Día</TableHead>
                <TableHead>Horario</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.employee_name}</TableCell>
                  <TableCell>{DAYS[s.day_of_week]}</TableCell>
                  <TableCell>{s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => sendWhatsApp(s)} title="Enviar por WhatsApp">
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteShift(s.id)} title="Eliminar">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
