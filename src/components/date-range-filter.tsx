import { useState } from "react";
import { endOfMonth, format, isValid, parse, startOfMonth, subDays, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Convierte lo que la persona va tecleando a dd-mm-aaaa, insertando los
 * guiones automáticamente y permitiendo solo dígitos. */
function autoFormatDMY(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return [day, month, year].filter(Boolean).join("-");
}

export type DateRangePreset = { id: string; label: string; from: string; to: string };

/** Rangos rápidos calculados en la zona horaria local del dispositivo. */
export function getDateRangePresets(now = new Date()): DateRangePreset[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const previousMonth = subMonths(today, 1);
  const toDMY = (date: Date) => format(date, "dd-MM-yyyy");

  return [
    { id: "last-7-days", label: "7 días", from: toDMY(subDays(today, 6)), to: toDMY(today) },
    { id: "last-30-days", label: "30 días", from: toDMY(subDays(today, 29)), to: toDMY(today) },
    { id: "current-month", label: "Este mes", from: toDMY(startOfMonth(today)), to: toDMY(today) },
    { id: "previous-month", label: "Mes anterior", from: toDMY(startOfMonth(previousMonth)), to: toDMY(endOfMonth(previousMonth)) },
  ];
}

/** dd-mm-aaaa -> aaaa-mm-dd (ISO), o null si la fecha está incompleta/ inválida. */
export function dmyToIso(dmy: string): string | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(dmy);
  if (!m) return null;
  const [, d, mo, y] = m;
  const day = Number(d);
  const month = Number(mo);
  if (month < 1 || month > 12 || day < 1) return null;
  const year = Number(y);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  if (day > daysInMonth) return null;
  return `${y}-${mo}-${d}`;
}

/** dd-mm-aaaa -> Date, o undefined si está incompleta/inválida (para el calendario). */
function dmyToDate(dmy: string): Date | undefined {
  const parsed = parse(dmy, "dd-MM-yyyy", new Date());
  return isValid(parsed) ? parsed : undefined;
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = dmyToDate(value);

  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label} (dd-mm-aaaa)</Label>
      <div className="flex gap-1">
        <Input
          inputMode="numeric"
          placeholder="dd-mm-aaaa"
          value={value}
          onChange={(e) => onChange(autoFormatDMY(e.target.value))}
          className="w-full min-w-0"
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              type="button"
              aria-label={`Elegir fecha: ${label}`}
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="nuva-mobile-calendar-sheet w-auto p-0" align="start" side="bottom" sideOffset={8}>
            <Calendar
              mode="single"
              locale={es}
              selected={selectedDate}
              defaultMonth={selectedDate}
              onSelect={(date) => {
                if (date) {
                  onChange(format(date, "dd-MM-yyyy"));
                  setOpen(false);
                }
              }}
              captionLayout="dropdown"
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
}: {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
}) {
  const presets = getDateRangePresets();
  const activePreset = presets.find((preset) => preset.from === from && preset.to === to);

  return (
    <div className="nuva-date-range-filter grid min-w-0 grid-cols-2 items-end gap-2">
      <DateField label="Desde" value={from} onChange={onFromChange} />
      <DateField label="Hasta" value={to} onChange={onToChange} />
      <div className="nuva-date-range-presets col-span-2" role="group" aria-label="Periodos rápidos">
        {presets.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            size="sm"
            variant={activePreset?.id === preset.id ? "secondary" : "ghost"}
            className="min-h-11"
            aria-pressed={activePreset?.id === preset.id}
            onClick={() => {
              onFromChange(preset.from);
              onToChange(preset.to);
            }}
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
