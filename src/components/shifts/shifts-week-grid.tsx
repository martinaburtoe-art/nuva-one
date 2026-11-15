import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Trash2 } from "lucide-react";

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

const PALETTE = [
  { bg: "bg-blue-500", text: "text-white" },
  { bg: "bg-emerald-500", text: "text-white" },
  { bg: "bg-amber-500", text: "text-white" },
  { bg: "bg-violet-500", text: "text-white" },
  { bg: "bg-rose-500", text: "text-white" },
  { bg: "bg-teal-500", text: "text-white" },
  { bg: "bg-orange-500", text: "text-white" },
  { bg: "bg-indigo-500", text: "text-white" },
  { bg: "bg-pink-500", text: "text-white" },
  { bg: "bg-cyan-600", text: "text-white" },
];

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function toMinutes(t: string) {
  const [h, m] = t.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function dateForDay(weekStartISO: string, dayIdx: number): string {
  const monday = new Date(weekStartISO + "T00:00:00");
  const d = new Date(monday);
  d.setDate(monday.getDate() + dayIdx);
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short" }).replace(".", "");
}

function layoutDayShifts(dayShifts: Shift[]) {
  const lanes: number[] = [];
  const placed = [...dayShifts]
    .sort(
      (a, b) =>
        toMinutes(a.start_time) - toMinutes(b.start_time) ||
        toMinutes(a.end_time) - toMinutes(b.end_time) ||
        a.employee_name.localeCompare(b.employee_name),
    )
    .map((shift) => {
      const start = toMinutes(shift.start_time);
      const end = toMinutes(shift.end_time);
      let lane = lanes.findIndex((lastEnd) => lastEnd <= start);
      if (lane === -1) {
        lane = lanes.length;
        lanes.push(end);
      } else {
        lanes[lane] = end;
      }
      return { shift, lane };
    });

  return placed.map((item) => ({ ...item, laneCount: lanes.length }));
}

export function ShiftsWeekGrid({
  shifts,
  onDelete,
  activeDays = 7,
  weekStart,
}: {
  shifts: Shift[];
  onDelete: (id: string) => void;
  activeDays?: number;
  weekStart: string;
}) {
  const { startHour, endHour } = useMemo(() => {
    if (!shifts.length) return { startHour: 8, endHour: 20 };
    const mins = shifts.flatMap((s) => [toMinutes(s.start_time), toMinutes(s.end_time)]);
    const min = Math.max(0, Math.floor(Math.min(...mins) / 60) - 1);
    const max = Math.min(24, Math.ceil(Math.max(...mins) / 60) + 1);
    return { startHour: Math.min(min, 8), endHour: Math.max(max, 19) };
  }, [shifts]);

  const totalHours = endHour - startHour;
  const hourHeight = 56; // px por hora
  const gridHeight = totalHours * hourHeight;
  const days = DAYS.slice(0, activeDays);

  const byDay = useMemo(() => {
    const map = new Map<number, Shift[]>();
    for (const s of shifts) {
      if (!map.has(s.day_of_week)) map.set(s.day_of_week, []);
      map.get(s.day_of_week)!.push(s);
    }
    return map;
  }, [shifts]);

  const hours = Array.from({ length: totalHours + 1 }, (_, i) => startHour + i);

  return (
    <>
      <div className="space-y-3 md:hidden">
        {days.map((day, dayIdx) => {
          const dayShifts = [...(byDay.get(dayIdx) ?? [])].sort(
            (a, b) => toMinutes(a.start_time) - toMinutes(b.start_time),
          );
          return (
            <Card key={day} className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold">{day}</h3>
                  <p className="text-xs text-muted-foreground">{dateForDay(weekStart, dayIdx)}</p>
                </div>
                <span className="rounded-full bg-background px-2.5 py-1 text-xs font-medium tabular-nums">
                  {dayShifts.length} turno{dayShifts.length === 1 ? "" : "s"}
                </span>
              </div>
              {dayShifts.length ? (
                <div className="divide-y">
                  {dayShifts.map((shift) => {
                    const color = colorFor(shift.employee_name);
                    return (
                      <div key={shift.id} className="flex items-center gap-3 px-4 py-3">
                        <span className={`h-10 w-1 shrink-0 rounded-full ${color.bg}`} aria-hidden="true" />
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-semibold">{shift.employee_name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{shift.start_time.slice(0, 5)} – {shift.end_time.slice(0, 5)}</p>
                        </div>
                        <button type="button" onClick={() => onDelete(shift.id)} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border text-destructive hover:bg-destructive/10" title="Eliminar turno" aria-label={`Eliminar turno de ${shift.employee_name} el ${day}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="px-4 py-3 text-xs text-muted-foreground">Sin turnos asignados</p>
              )}
            </Card>
          );
        })}
      </div>
      <div className="hidden md:block">
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="grid border-b bg-muted/40" style={{ gridTemplateColumns: `64px repeat(${days.length}, 1fr)` }}>
                <div className="p-2" />
                {days.map((d, i) => (
                  <div key={d} className="border-l p-2 text-center text-sm font-semibold">
                    {d}
                    <div className="text-[11px] font-normal text-muted-foreground">{dateForDay(weekStart, i)}</div>
                    <div className="text-xs font-normal text-muted-foreground">{byDay.get(i)?.length ?? 0} turno{(byDay.get(i)?.length ?? 0) === 1 ? "" : "s"}</div>
                  </div>
                ))}
              </div>
              <div className="relative grid" style={{ gridTemplateColumns: `64px repeat(${days.length}, 1fr)` }}>
                <div className="relative" style={{ height: gridHeight }}>
                  {hours.map((h, i) => <div key={h} className="absolute right-2 -translate-y-1/2 text-xs text-muted-foreground" style={{ top: i * hourHeight }}>{h.toString().padStart(2, "0")}:00</div>)}
                </div>
                {days.map((_, dayIdx) => (
                  <div key={dayIdx} className="relative border-l" style={{ height: gridHeight }}>
                    {hours.map((h, i) => <div key={h} className="absolute w-full border-t border-dashed border-muted" style={{ top: i * hourHeight }} />)}
                    {layoutDayShifts(byDay.get(dayIdx) ?? []).map(({ shift: s, lane, laneCount }) => {
                      const start = toMinutes(s.start_time);
                      const end = toMinutes(s.end_time);
                      const top = ((start - startHour * 60) / 60) * hourHeight;
                      const height = Math.max(((end - start) / 60) * hourHeight, 32);
                      const color = colorFor(s.employee_name);
                      const laneWidth = 100 / laneCount;
                      const left = `calc(${lane * laneWidth}% + 2px)`;
                      const width = `calc(${laneWidth}% - 4px)`;
                      return (
                        <div key={s.id} className={`group absolute cursor-default overflow-hidden rounded-md px-2 py-1 shadow-sm ${color.bg} ${color.text}`} style={{ top, height, left, width }} title={`${s.employee_name}: ${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}`}>
                          <p className="truncate text-xs font-semibold leading-tight">{s.employee_name}</p>
                          <p className="truncate text-[11px] leading-tight opacity-90">{s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}</p>
                          <div className="absolute right-1 top-1 hidden gap-1 group-hover:flex">
                            <button onClick={() => onDelete(s.id)} className="rounded bg-black/20 p-0.5 hover:bg-black/40" title="Eliminar" aria-label={`Eliminar turno de ${s.employee_name}`}><Trash2 className="h-3 w-3" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
