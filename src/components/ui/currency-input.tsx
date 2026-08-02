import { Input } from "@/components/ui/input";

function formatCLP(n: number): string {
  if (!n) return "";
  return n.toLocaleString("es-CL");
}

function parseCLP(raw: string): number {
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

// Input de texto que se ve como "$39.990" mientras el usuario escribe, pero
// entrega/recibe siempre un number plano. Reemplaza los <Input type="number">
// de precios, que mostraban "39990" sin formato ni separador de miles.
export function CurrencyInput({
  value,
  onChange,
  className,
  placeholder,
}: {
  value: number;
  onChange: (n: number) => void;
  className?: string;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        $
      </span>
      <Input
        inputMode="numeric"
        className={`pl-6 ${className ?? ""}`}
        placeholder={placeholder}
        value={formatCLP(value)}
        onChange={(e) => onChange(parseCLP(e.target.value))}
      />
    </div>
  );
}
