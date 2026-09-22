import * as React from "react";
import { Input } from "@/components/ui/input";

function formatCLP(n: number): string {
  return Math.max(0, Number(n) || 0).toLocaleString("es-CL");
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
  disabled,
}: {
  value?: number;
  defaultValue?: number;
  onValueChange?: (n: number) => void;
  className?: string;
  placeholder?: string;
  name?: string;
  required?: boolean;
  disabled?: boolean;
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
        autoComplete="off"
        className={`pl-6 tabular-nums ${className ?? ""}`}
        placeholder={placeholder}
        value={formatCLP(currentValue)}
        onChange={(e) => handleChange(e.target.value)}
        required={required}
        disabled={disabled}
        aria-label={name}
      />
      {name && <input type="hidden" name={name} value={currentValue} disabled={disabled} />}
    </div>
  );
}
