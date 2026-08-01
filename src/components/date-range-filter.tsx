import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      <div>
        <Label className="text-xs text-muted-foreground">Desde (dd-mm-aaaa)</Label>
        <Input
          inputMode="numeric"
          placeholder="dd-mm-aaaa"
          value={from}
          onChange={(e) => onFromChange(autoFormatDMY(e.target.value))}
          className="w-32"
        />
      </div>
      <div>
        <Label className="text-xs text-muted-foreground">Hasta (dd-mm-aaaa)</Label>
        <Input
          inputMode="numeric"
          placeholder="dd-mm-aaaa"
          value={to}
          onChange={(e) => onToChange(autoFormatDMY(e.target.value))}
          className="w-32"
        />
      </div>
    </div>
  );
}
