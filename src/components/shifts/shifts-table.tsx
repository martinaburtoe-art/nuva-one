import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MessageCircle,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ShiftsWeekGrid } from "@/components/shifts/shifts-week-grid";

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

// Todas las semanas (lunes de inicio) cuyo rango toca el mes de weekStartISO.
// Se usa para "Repetir: todo el mes" -- misma semántica de semana (lunes a
// domingo) que ya usa el dashboard, solo que abarca varias.
function getWeekStartsInMonth(weekStartISO: string): string[] {
  const ref = new Date(weekStartISO + "T00:00:00");
  const year = ref.getFullYear();
  const month = ref.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const cur = new Date(firstDay);
  const dow = cur.getDay() === 0 ? 7 : cur.getDay();
  cur.setDate(cur.getDate() - dow + 1);
  const result: string[] = [];
  while (cur <= lastDay) {
    result.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 7);
  }
  return result;
}

type TimeBlock = { start_time: string; end_time: string };

// Fecha real (día + mes corto) de cada día de la semana que empieza en
// weekStartISO, para mostrar "Dom 2 ago" en vez de solo "Domingo".
function getWeekDates(weekStartISO: string): Date[] {
  const monday = new Date(weekStartISO + "T00:00:00");
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatDayChip(date: Date): string {
  const dayNum = date.getDate();
  const month = date.toLocaleDateString("es-CL", { month: "short" }).replace(".", "");
  return `${dayNum} ${month}`;
}

// Etiqueta completa ("Domingo 2 de agosto") para un turno puntual, calculada
// a partir de SU PROPIO week_start (no de la semana que se esté viendo).
function shiftDateLabel(weekStartISO: string, dayOfWeek: number): string {
  const dates = getWeekDates(weekStartISO);
  const date = dates[dayOfWeek];
  const dayName = DAYS[dayOfWeek];
  const dateStr = date.toLocaleDateString("es-CL", { day: "numeric", month: "long" });
  return `${dayName} ${dateStr}`;
}

export function ShiftsTable({ businessId }: { businessId: string }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [view, setView] = useState<"dashboard" | "table">("dashboard");
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

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);

  const [draft, setDraft] = useState({
    employee_name: "",
    employee_phone: "",
  });
  const [selectedDays, setSelectedDays] = useState<number[]>([0]);
  const [blocks, setBlocks] = useState<TimeBlock[]>([{ start_time: "09:00", end_time: "18:00" }]);
  const [repeatMode, setRepeatMode] = useState<"week" | "month">("week");
  const [saving, setSaving] = useState(false);

  function toggleDay(d: number) {
    setSelectedDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort(),
    );
  }

  function selectAllDays() {
    setSelectedDays(selectedDays.length === 7 ? [] : [0, 1, 2, 3, 4, 5, 6]);
  }

  function updateBlock(i: number, patch: Partial<TimeBlock>) {
    setBlocks((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }

  function addBlock() {
    setBlocks((prev) => [...prev, { start_time: "15:00", end_time: "18:00" }]);
  }

  function removeBlock(i: number) {
    setBlocks((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev));
  }

  async function addShift() {
    if (!draft.employee_name.trim()) {
      toast.error("Ingresa el nombre del empleado");
      return;
    }
    if (selectedDays.length === 0) {
      toast.error("Selecciona al menos un día");
      return;
    }
    for (const b of blocks) {
      if (b.end_time <= b.start_time) {
        toast.error("La hora de término debe ser mayor a la de inicio en cada bloque");
        return;
      }
    }

    const weekStarts = repeatMode === "month" ? getWeekStartsInMonth(weekStart) : [weekStart];

    const rows = weekStarts.flatMap((ws) =>
      selectedDays.flatMap((day) =>
        blocks.map((b) => ({
          business_id: businessId,
          week_start: ws,
          employee_name: draft.employee_name.trim(),
          employee_phone: draft.employee_phone.trim() || null,
          day_of_week: day,
          start_time: b.start_time,
          end_time: b.end_time,
        })),
      ),
    );

    setSaving(true);
    const { error } = await supabase.from("shifts").insert(rows);
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar el turno");
      return;
    }
    setDraft((d) => ({ ...d, employee_name: "", employee_phone: "" }));
    queryClient.invalidateQueries({ queryKey: ["shifts", businessId, weekStart] });
    toast.success(`${rows.length} turno(s) agregado(s)`);
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
      `Hola ${shift.employee_name}, tu turno es el ${shiftDateLabel(shift.week_start, shift.day_of_week)} de ${shift.start_time.slice(0, 5)} a ${shift.end_time.slice(0, 5)}.`,
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
            Semana del{" "}
            {new Date(weekStart + "T00:00:00").toLocaleDateString("es-CL", {
              day: "2-digit",
              month: "long",
            })}
          </span>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset((w) => w + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border p-0.5">
            <Button
              variant={view === "dashboard" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setView("dashboard")}
            >
              <LayoutGrid className="h-3.5 w-3.5 mr-1" /> Dashboard
            </Button>
            <Button
              variant={view === "table" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setView("table")}
            >
              <List className="h-3.5 w-3.5 mr-1" /> Tabla
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={sendAllWhatsApp} disabled={!shifts?.length}>
            <MessageCircle className="h-4 w-4 mr-2" /> Enviar todos por WhatsApp
          </Button>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <p className="text-sm font-medium">Agregar turno</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Días</p>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((d, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleDay(i)}
                className={`flex flex-col items-center leading-tight text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  selectedDays.includes(i)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-muted"
                }`}
              >
                <span>{d.slice(0, 3)}</span>
                <span className="text-[10px] opacity-80">{formatDayChip(weekDates[i])}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={selectAllDays}
              className="text-xs px-2.5 py-1 rounded-full border bg-background hover:bg-muted"
            >
              {selectedDays.length === 7 ? "Ninguno" : "Toda la semana"}
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            Horario {blocks.length > 1 ? "(turno partido)" : ""}
          </p>
          <div className="space-y-2">
            {blocks.map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  type="time"
                  value={b.start_time}
                  onChange={(e) => updateBlock(i, { start_time: e.target.value })}
                  className="w-32"
                />
                <span className="text-xs text-muted-foreground">a</span>
                <Input
                  type="time"
                  value={b.end_time}
                  onChange={(e) => updateBlock(i, { end_time: e.target.value })}
                  className="w-32"
                />
                {blocks.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => removeBlock(i)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addBlock}
            className="mt-1.5 text-xs text-primary underline"
          >
            + Agregar bloque horario (ej: 09:00–13:00 y 15:00–18:00)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-muted-foreground">Repetir:</p>
          <select
            className="border rounded-md px-2 py-1.5 text-xs bg-background"
            value={repeatMode}
            onChange={(e) => setRepeatMode(e.target.value as "week" | "month")}
          >
            <option value="week">Solo esta semana</option>
            <option value="month">Todo el mes</option>
          </select>
        </div>

        <Button size="sm" onClick={addShift} disabled={saving}>
          <Plus className="h-4 w-4 mr-2" /> {saving ? "Agregando..." : "Agregar"}
        </Button>
      </Card>

      {isLoading ? (
        <Card className="p-4 space-y-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </Card>
      ) : !shifts?.length ? (
        <Card className="p-6">
          <p className="text-sm text-muted-foreground text-center">
            Sin turnos asignados esta semana.
          </p>
        </Card>
      ) : view === "dashboard" ? (
        <ShiftsWeekGrid
          shifts={shifts}
          onDelete={deleteShift}
          onWhatsApp={sendWhatsApp}
          weekStart={weekStart}
        />
      ) : (
        <Card className="p-0 overflow-hidden">
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
                  <TableCell>{shiftDateLabel(s.week_start, s.day_of_week)}</TableCell>
                  <TableCell>
                    {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => sendWhatsApp(s)}
                      title="Enviar por WhatsApp"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteShift(s.id)}
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
