import { useState } from "react";
import {
  BarChart3,
  Boxes,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  Package,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

const MODULES = [
  { id: "ventas", label: "Ventas", icon: TrendingUp },
  { id: "caja", label: "Caja", icon: CircleDollarSign },
  { id: "inventario", label: "Inventario", icon: Boxes },
  { id: "finanzas", label: "Finanzas", icon: BarChart3 },
  { id: "cotizaciones", label: "Cotizaciones", icon: FileText },
  { id: "ia", label: "Nüva IA", icon: Sparkles },
] as const;

type ModuleId = (typeof MODULES)[number]["id"];

export function HomeProductShowcase() {
  const [active, setActive] = useState<ModuleId>("ventas");

  return (
    <section className="border-t bg-secondary/20 py-20" id="producto">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium text-primary">
            Una pequeña muestra de todo lo que puedes hacer con Nüva One
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Tu negocio, visualizado en un solo lugar.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Explora algunas de nuestras herramientas para gestionar, analizar y hacer crecer tu
            PYME. Y esto es solo el comienzo.
          </p>
        </div>

        <div className="mx-auto mt-12 overflow-hidden rounded-[1.5rem] border border-border/60 bg-card shadow-elegant">
          <div className="flex items-center gap-2 border-b bg-secondary/40 px-4 py-3">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
            </div>
            <div className="ml-2 flex-1 rounded-md bg-background/80 px-3 py-1 text-xs text-muted-foreground">
              app.nuva-one.cl / {active}
            </div>
          </div>

          <div className="grid min-h-[430px] md:grid-cols-[190px_1fr]">
            <aside className="border-b bg-secondary/30 p-3 md:border-b-0 md:border-r">
              <div className="mb-4 flex items-center gap-2 px-2 py-2 text-sm font-semibold">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-primary">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
                Nüva One
              </div>
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-background px-3 py-2 text-xs font-medium shadow-soft">
                <LayoutDashboard className="h-3.5 w-3.5 text-primary" /> Mi negocio
              </div>
              <div className="space-y-1">
                {MODULES.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActive(id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-medium transition-all ${active === id ? "bg-gradient-primary text-primary-foreground shadow-soft" : "text-muted-foreground hover:bg-background hover:text-foreground"}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            </aside>

            <Preview active={active} />
          </div>
        </div>

        <div className="mx-auto mt-7 max-w-2xl text-center">
          <p className="text-sm font-medium">Y esto es solo el comienzo.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Nüva One reúne muchas más herramientas para administrar tu negocio desde un solo lugar.
          </p>
          <Link
            to="/demo"
            className="mt-4 inline-flex items-center rounded-xl bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-elegant transition-transform hover:scale-[1.02]"
          >
            Descubrir todo Nüva One <span className="ml-2">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function Preview({ active }: { active: ModuleId }) {
  if (active === "ventas")
    return (
      <div className="p-5 sm:p-7">
        <Header title="Ventas" subtitle="Gestiona tus ventas y clientes" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Ventas del mes" value="$1.284.500" trend="+18,4%" />
          <Stat label="Transacciones" value="86" trend="este mes" />
          <Stat label="Ticket promedio" value="$14.936" trend="+6,2%" />
        </div>
        <div className="mt-5 overflow-hidden rounded-xl border">
          <div className="grid grid-cols-[1.5fr_1fr_1fr] gap-2 bg-secondary/40 px-4 py-3 text-[11px] font-semibold text-muted-foreground">
            <span>Cliente</span>
            <span>Estado</span>
            <span className="text-right">Total</span>
          </div>
          {[
            ["Comercial Los Andes", "Pagada", "$39.990"],
            ["Distribuidora Maule", "Pagada", "$119.970"],
            ["Tienda Centro", "Pendiente", "$79.980"],
          ].map(([name, status, total]) => (
            <div
              key={name}
              className="grid grid-cols-[1.5fr_1fr_1fr] gap-2 border-t px-4 py-3 text-xs"
            >
              <span className="font-medium">{name}</span>
              <span className={status === "Pagada" ? "text-success" : "text-warning"}>
                {status}
              </span>
              <span className="text-right font-semibold">{total}</span>
            </div>
          ))}
        </div>
      </div>
    );
  if (active === "caja")
    return (
      <div className="p-5 sm:p-7">
        <Header title="Caja" subtitle="Controla ingresos y egresos en tiempo real" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Saldo disponible" value="$428.300" trend="+12,7%" />
          <Stat label="Ingresos" value="$1.284.500" trend="este mes" />
          <Stat label="Egresos" value="$856.200" trend="controlados" />
        </div>
        <div className="mt-5 rounded-xl border p-5">
          <div className="text-xs text-muted-foreground">Flujo de caja</div>
          <div className="mt-5 flex h-32 items-end gap-2">
            {[35, 48, 42, 62, 58, 76, 68, 85, 72, 92, 80, 100].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-gradient-primary opacity-80"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  if (active === "inventario")
    return (
      <div className="p-5 sm:p-7">
        <Header title="Inventario" subtitle="Stock unificado y alertas automáticas" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Productos" value="248" trend="activos" />
          <Stat label="Valor inventario" value="$3.599.850" trend="actualizado" />
          <Stat label="Stock crítico" value="7" trend="revisar" />
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <InventoryRow name="Pack Premium" stock="3 unidades" status="Crítico" />
          <InventoryRow name="Polera Pro" stock="18 unidades" status="Normal" />
          <InventoryRow name="Mochila Elite" stock="5 unidades" status="Bajo" />
        </div>
      </div>
    );
  if (active === "finanzas")
    return (
      <div className="p-5 sm:p-7">
        <Header title="Finanzas" subtitle="Entiende la salud financiera de tu negocio" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Ingresos" value="$1.284.500" trend="+18,4%" />
          <Stat label="Gastos" value="$532.400" trend="-4,1%" />
          <Stat label="Margen" value="31,6%" trend="saludable" />
        </div>
        <div className="mt-5 rounded-xl border p-5">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <BarChart3 className="h-4 w-4 text-primary" /> Rentabilidad mensual
          </div>
          <div className="mt-5 flex h-28 items-end gap-3">
            {[42, 55, 49, 66, 61, 75, 71, 88].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-gradient-primary opacity-80"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  if (active === "cotizaciones")
    return (
      <div className="p-5 sm:p-7">
        <Header title="Cotizaciones" subtitle="Crea y sigue propuestas profesionales" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Enviadas" value="24" trend="este mes" />
          <Stat label="Aceptadas" value="17" trend="70,8%" />
          <Stat label="Pendientes" value="7" trend="seguimiento" />
        </div>
        <div className="mt-5 space-y-2">
          <QuoteRow name="Comercial Los Andes" amount="$420.000" status="Aceptada" />
          <QuoteRow name="Distribuidora Maule" amount="$285.000" status="Pendiente" />
          <QuoteRow name="Tienda Centro" amount="$179.500" status="En revisión" />
        </div>
      </div>
    );
  return (
    <div className="p-5 sm:p-7">
      <Header title="Nüva IA" subtitle="Tu asistente inteligente para entender y decidir" />
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Ventas" value="+18,4%" trend="vs. mes anterior" />
        <Stat label="Stock crítico" value="7" trend="productos" />
        <Stat label="Margen" value="31,6%" trend="saludable" />
      </div>
      <div className="mt-5 rounded-xl border bg-secondary/30 p-5">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Sparkles className="h-4 w-4 text-primary" /> Recomendación de Nüva IA
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Tus ventas crecieron 18,4% este mes. Conviene reponer 3 productos de alta rotación y
          revisar los 7 artículos con stock crítico.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border bg-background px-3 py-1.5 text-[11px]">
            Analizar ventas
          </span>
          <span className="rounded-full border bg-background px-3 py-1.5 text-[11px]">
            Revisar inventario
          </span>
          <span className="rounded-full border bg-background px-3 py-1.5 text-[11px]">
            Analizar rentabilidad
          </span>
        </div>
      </div>
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-5">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}
function Stat({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
      <div className="mt-1 text-[11px] text-success">{trend}</div>
    </div>
  );
}
function InventoryRow({ name, stock, status }: { name: string; stock: string; status: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-background p-4 text-xs">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
          <Package className="h-4 w-4" />
        </div>
        <div>
          <div className="font-medium">{name}</div>
          <div className="mt-0.5 text-muted-foreground">{stock}</div>
        </div>
      </div>
      <span
        className={
          status === "Crítico"
            ? "text-destructive"
            : status === "Bajo"
              ? "text-warning"
              : "text-success"
        }
      >
        {status}
      </span>
    </div>
  );
}
function QuoteRow({ name, amount, status }: { name: string; amount: string; status: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border bg-background p-4 text-xs">
      <div>
        <div className="font-medium">{name}</div>
        <div className="mt-0.5 text-muted-foreground">{amount}</div>
      </div>
      <span className="rounded-full bg-secondary px-2.5 py-1">{status}</span>
    </div>
  );
}
