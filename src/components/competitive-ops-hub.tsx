import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Bot, CircleDollarSign, Package, Plus, Receipt, ShoppingBag, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const actions = [
  { label: "Nueva venta", href: "/sales", icon: CircleDollarSign, primary: true },
  { label: "Agregar producto", href: "/inventory", icon: Package },
  { label: "Nueva cotización", href: "/quotes", icon: Receipt },
  { label: "Nuevo cliente", href: "/crm", icon: Users },
  { label: "Ver catálogo", href: "/catalog", icon: ShoppingBag },
];

export function CompetitiveOpsHub() {
  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.06] via-background to-accent/20 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary"><Bot className="h-4 w-4" /> Operación Nüva</div>
          <h2 className="mt-1 text-lg font-semibold">Haz la operación en segundos. Nüva se encarga de conectar los datos.</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Ventas, inventario, clientes, cotizaciones y catálogo comparten el mismo contexto para que cada operación alimente la inteligencia del negocio.</p>
        </div>
        <Link to="/executive-command-center" className="shrink-0"><Button variant="outline"><Bot className="mr-1.5 h-4 w-4" />Ver inteligencia<ArrowUpRight className="ml-1 h-4 w-4" /></Button></Link>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {actions.map(({ label, href, icon: Icon, primary }) => <Link key={href} to={href}><Button variant={primary ? "default" : "outline"} className="h-11 w-full justify-start gap-2"><Icon className="h-4 w-4" />{label}<ArrowUpRight className="ml-auto h-3.5 w-3.5 opacity-60" /></Button></Link>)}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><Plus className="h-3.5 w-3.5" />Cada operación registrada puede alimentar stock, caja, CRM, catálogo, métricas y recomendaciones.</div>
    </Card>
  );
}
