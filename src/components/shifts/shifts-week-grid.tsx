import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { MessageCircle, Trash2 } from "lucide-react";

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

export function ShiftsWeekGrid({
  shifts,
  onDelete,
  onWhatsApp,
  activeDays = 7,
}: {
  shifts: Shift[];
  onDelete: (id: string) => void;
  onWhatsApp: (shift: Shift) => void;
  activeDays?: number;
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
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">
          {/* Header de días */}
          <div
            className="grid border-b bg-muted/40"
            style={{ gridTemplateColumns: `64px repeat(${days.length}, 1fr)` }}
          >
            <div className="p-2" />
            {days.map((d, i) => (
              <div
                key={d}
                className="p-2 text-center text-sm font-semibold border-l"
              >
                {d}
                <div className="text-xs font-normal text-muted-foreground">
                  {byDay.get(i)?.length ?? 0} turno{(byDay.get(i)?.length ?? 0) === 1 ? "" : "s"}
                </div>
              </div>
            ))}
          </div>

          {/* Cuerpo del grid */}
          <div className="relative grid" style={{ gridTemplateColumns: `64px repeat(${days.length}, 1fr)` }}>
            {/* Columna de horas */}
            <div className="relative" style={{ height: gridHeight }}>
              {hours.map((h, i) => (
                <div
                  key={h}
                  className="absolute right-2 -translate-y-1/2 text-xs text-muted-foreground"
                  style={{ top: i * hourHeight }}
                >
                  {h.toString().padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {/* Columnas de días */}
            {days.map((_, dayIdx) => (
              <div
                key={dayIdx}
                className="relative border-l"
                style={{ height: gridHeight }}
              >
                {/* Líneas de hora */}
                {hours.map((h, i) => (
                  <div
                    key={h}
                    className="absolute w-full border-t border-dashed border-muted"
                    style={{ top: i * hourHeight }}
                  />
                ))}

                {/* Bloques de turno */}
                {(byDay.get(dayIdx) ?? []).map((s) => {
                  const start = toMinutes(s.start_time);
                  const end = toMinutes(s.end_time);
                  const top = ((start - startHour * 60) / 60) * hourHeight;
                  const height = Math.max(((end - start) / 60) * hourHeight, 32);
                  const color = colorFor(s.employee_name);
                  return (
                    <div
                      key={s.id}
                      className={`absolute left-1 right-1 rounded-md px-2 py-1 shadow-sm ${color.bg} ${color.text} group cursor-default overflow-hidden`}
                      style={{ top, height }}
                      title={`${s.employee_name}: ${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}`}
                    >
                      <p className="text-xs font-semibold truncate leading-tight">
                        {s.employee_name}
                      </p>
                      <p className="text-[11px] opacity-90 truncate leading-tight">
                        {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                      </p>
                      <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
                        {s.employee_phone && (
                          <button
                            onClick={() => onWhatsApp(s)}
                            className="rounded bg-black/20 p-0.5 hover:bg-black/40"
                            title="Enviar por WhatsApp"
                          >
                            <MessageCircle className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          onClick={() => onDelete(s.id)}
                          className="rounded bg-black/20 p-0.5 hover:bg-black/40"
                          title="Eliminar"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
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
  );
}
