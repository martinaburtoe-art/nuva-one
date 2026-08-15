import { CheckCircle2, Circle, Package, Receipt, WalletCards } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ActivationChecklistProps = {
  hasProducts: boolean;
  hasSales: boolean;
  hasTransactions: boolean;
};

const items = [
  { key: "products", label: "Configura tu inventario", href: "/inventory", icon: Package },
  { key: "sales", label: "Registra tu primera venta", href: "/pos", icon: Receipt },
  { key: "transactions", label: "Registra un movimiento financiero", href: "/finance", icon: WalletCards },
] as const;

export function ActivationChecklist({ hasProducts, hasSales, hasTransactions }: ActivationChecklistProps) {
  const completed = { products: hasProducts, sales: hasSales, transactions: hasTransactions };
  const done = items.filter((item) => completed[item.key]).length;

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">Activación</p>
          <h3 className="mt-1 font-semibold">Prepara Nüva para medir tu negocio</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Completa estos pasos con datos reales. Nüva Score comenzará a calcularse cuando exista información suficiente.
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold">{done}/{items.length}</span>
      </div>
      <div className="mt-5 space-y-2">
        {items.map((item) => {
          const isDone = completed[item.key];
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50",
                isDone && "border-success/30 bg-success/5",
              )}
            >
              {isDone ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className={cn("text-sm font-medium", isDone && "text-muted-foreground line-through")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
