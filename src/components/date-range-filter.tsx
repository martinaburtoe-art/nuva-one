import { useState } from "react";
import { format, isValid, parse } from "date-fns";
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

/** dd-mm-aaaa -> aaaa-mm-dd (ISO), o null si la fecha está incompleta/ inválida. */
export function dmyToIso(dmy: string): string | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(dmy);
  if (!m) return null;
  const [, d, mo, y] = m;
  const day = Number(d);
  const month = Number(mo);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
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
          className="w-28"
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
          <PopoverContent className="w-auto p-0" align="start">
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
  return (
    <div className="flex items-end gap-2">
      <DateField label="Desde" value={from} onChange={onFromChange} />
      <DateField label="Hasta" value={to} onChange={onToChange} />
    </div>
  );
}
