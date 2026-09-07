import { Link } from "@tanstack/react-router";
import { Receipt, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function FinanceSiiEntry() {
  return (
    <Card className="border-border/70 bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Finanzas · Tributación</p>
            <h2 className="mt-1 text-lg font-semibold">Facturación SII</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Emisión y gestión de documentos tributarios electrónicos, folios, declaraciones y respaldos asociados al SII.
            </p>
          </div>
        </div>
        <Button asChild className="shrink-0">
          <Link to="/billing">
            Abrir SII
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
