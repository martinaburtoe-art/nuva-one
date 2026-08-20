import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  CreditCard,
  BarChart3,
  Sparkles,
  FileText,
  Settings,
  Calculator,
  CalendarClock,
  Users,
  Receipt,
  ScanBarcode,
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Resumen", icon: LayoutDashboard },
  { to: "/pos", label: "Caja", icon: Calculator },
  { to: "/sales", label: "Ventas", icon: ShoppingCart },
  { to: "/customers", label: "Clientes", icon: Users },
  { to: "/billing", label: "Facturación SII", icon: Receipt },
  { to: "/purchases", label: "Compras", icon: Package },
  { to: "/inventory", label: "Inventario", icon: Boxes },
  { to: "/finance", label: "Finanzas", icon: CreditCard },
  { to: "/analytics", label: "Indicadores", icon: BarChart3 },
  { to: "/quotes", label: "Cotizaciones", icon: FileText },
  { to: "/ai", label: "Asistente IA", icon: Sparkles },
  { to: "/shifts", label: "Turnos", icon: CalendarClock },
  { to: "/settings", label: "Configuración", icon: Settings },
] as const;

const quickActions = [
  { to: "/sales", label: "Nueva venta", keywords: "venta vender POS", icon: ShoppingCart },
  { to: "/inventory", label: "Nuevo producto / SKU", keywords: "producto sku código inventario", icon: Plus },
  { to: "/inventory", label: "Abrir scanner", keywords: "escanear scanner código barra barcode", icon: ScanBarcode },
  { to: "/inventory", label: "Registrar entrada", keywords: "entrada stock recepción inventario", icon: ArrowDownToLine },
  { to: "/inventory", label: "Registrar salida", keywords: "salida stock inventario", icon: ArrowUpFromLine },
  { to: "/finance", label: "Registrar gasto", keywords: "gasto egreso finanzas", icon: CreditCard },
] as const;

export function GlobalSearch({ visibleNav }: { visibleNav?: readonly { to: string }[] }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((current) => !current);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const allowedPaths = useMemo(
    () => (visibleNav ? new Set(visibleNav.map((item) => item.to)) : null),
    [visibleNav],
  );
  const items = useMemo(
    () => (allowedPaths ? navItems.filter((item) => allowedPaths.has(item.to)) : navItems),
    [allowedPaths],
  );
  const actions = useMemo(
    () => (allowedPaths ? quickActions.filter((item) => allowedPaths.has(item.to)) : quickActions),
    [allowedPaths],
  );

  function go(to: string) {
    setOpen(false);
    navigate({ to: to as never });
  }

  const mobileTrigger = mounted
    ? createPortal(
        <button
          type="button"
          aria-label="Abrir búsqueda y acciones rápidas"
          onClick={() => setOpen(true)}
          className="fixed bottom-[4.5rem] right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-background shadow-lg ring-1 ring-black/5 md:hidden"
        >
          <ScanBarcode className="h-5 w-5 text-primary" aria-hidden="true" />
          <span className="sr-only">Buscar, abrir scanner o ejecutar una acción</span>
        </button>,
        document.body,
      )
    : null;

  return (
    <>
      {mobileTrigger}
      <button
        type="button"
        aria-label="Abrir búsqueda y acciones rápidas"
        onClick={() => setOpen(true)}
        className="relative flex h-9 min-w-0 flex-1 items-center justify-center rounded-md border border-input bg-background px-2 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-auto md:max-w-md md:justify-start md:px-3 md:py-2 md:text-left"
      >
        <ScanBarcode className="h-4 w-4 shrink-0 md:mr-2" aria-hidden="true" />
        <span className="hidden flex-1 truncate md:block">Buscar o ejecutar una acción...</span>
        <CommandShortcut className="ml-2 hidden md:inline-flex">⌘K</CommandShortcut>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar módulos, SKU, scanner o acciones..." />
        <CommandList>
          <CommandEmpty>Sin resultados.</CommandEmpty>
          {actions.length > 0 && (
            <CommandGroup heading="Acciones rápidas">
              {actions.map((item) => (
                <CommandItem key={`action:${item.label}`} value={`${item.label} ${item.keywords}`} onSelect={() => go(item.to)}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandGroup heading="Módulos">
            {items.map((item) => (
              <CommandItem key={`module:${item.to}`} value={item.label} onSelect={() => go(item.to)}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
