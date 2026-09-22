import * as React from "react";
import { Input } from "@/components/ui/input";

function formatCLP(n: number): string {
  if (!n) return "";
  return n.toLocaleString("es-CL");
}

function parseCLP(raw: string): number {
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

export function CurrencyInput({
  value,
  defaultValue = 0,
  onValueChange,
  className,
  placeholder,
  name,
  required,
}: {
  value?: number;
  defaultValue?: number;
  onValueChange?: (n: number) => void;
  className?: string;
  placeholder?: string;
  name?: string;
  required?: boolean;
}) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const currentValue = controlled ? Number(value) || 0 : internalValue;

  const handleChange = (raw: string) => {
    const next = parseCLP(raw);
    if (!controlled) setInternalValue(next);
    onValueChange?.(next);
  };

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-sm text-muted-foreground">$</span>
      <Input
        inputMode="numeric"
        className={`pl-6 tabular-nums ${className ?? ""}`}
        placeholder={placeholder}
        value={formatCLP(currentValue)}
        onChange={(e) => handleChange(e.target.value)}
        required={required}
        aria-label={name}
      />
      {name && <input type="hidden" name={name} value={currentValue} />}
    </div>
  );
}
