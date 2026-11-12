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
  ScanBarcode,
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
  WifiOff,
  BookOpen,
  Brain,
  Truck,
  MessagesSquare,
  UserRoundCog,
  ShieldCheck,
  Link2,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Resumen", icon: LayoutDashboard },
  { to: "/pos", label: "Caja", icon: Calculator },
  { to: "/sales", label: "Ventas", icon: ShoppingCart },
  { to: "/customers", label: "Clientes", icon: Users },
  { to: "/customer-action-center", label: "Centro de acción CRM", icon: FileText },
  { to: "/customers-intelligence", label: "Inteligencia de clientes", icon: Brain },
  { to: "/purchases", label: "Compras", icon: Package },
  { to: "/catalog", label: "Catálogo", icon: BookOpen },
  { to: "/inventory", label: "Inventario", icon: Boxes },
  { to: "/inventario-conteo", label: "Conteo físico", icon: Boxes },
  { to: "/inventario-operaciones", label: "Operaciones de inventario", icon: Package },
  { to: "/shipments", label: "Envíos & Entregas", icon: Truck },
  { to: "/finance", label: "Finanzas", icon: CreditCard },
  { to: "/finance-accounting", label: "Contabilidad y tributación", icon: FileText },
  { to: "/finance-professional", label: "Centro financiero profesional", icon: Calculator },
  { to: "/financial-dashboard", label: "Panel financiero", icon: BarChart3 },
  { to: "/financial-control", label: "Control financiero", icon: ShieldCheck },
  { to: "/financial-integrity", label: "Integridad financiera", icon: ShieldCheck },
  { to: "/analytics", label: "Indicadores", icon: BarChart3 },
  { to: "/quotes", label: "Cotizaciones", icon: FileText },
  { to: "/nuva-intelligence", label: "Nüva Intelligence", icon: Brain },
  { to: "/business-health", label: "Salud del negocio", icon: BarChart3 },
  { to: "/business-simulator", label: "Simulador de negocio", icon: Calculator },
  { to: "/executive-command-center", label: "Centro Ejecutivo", icon: Sparkles },
  { to: "/ai", label: "Asistente IA", icon: Sparkles },
  { to: "/foro", label: "Comunidad", icon: MessagesSquare },
  { to: "/shifts", label: "Turnos", icon: CalendarClock },
  { to: "/people", label: "Nüva People", icon: UserRoundCog },
  { to: "/people-employees", label: "Colaboradores", icon: Users },
  { to: "/people-attendance", label: "Asistencia y jornada", icon: CalendarClock },
  { to: "/people-compliance", label: "Centro de cumplimiento", icon: ShieldCheck },
  { to: "/people-lifecycle", label: "Vacaciones y permisos", icon: CalendarClock },
  { to: "/people-payroll", label: "Remuneraciones", icon: Calculator },
  { to: "/conexiones", label: "Nüva Connect", icon: Link2 },
  { to: "/settings", label: "Configuración", icon: Settings },
] as const;

const quickActions = [
  { to: "/sales", label: "Nueva venta", keywords: "venta vender POS", icon: ShoppingCart },
  {
    to: "/inventory",
    label: "Nuevo producto / SKU",
    keywords: "producto sku código inventario",
    icon: Plus,
  },
  {
    to: "/inventory",
    label: "Abrir scanner",
    keywords: "escanear scanner código barra barcode",
    icon: ScanBarcode,
  },
  {
    to: "/inventory",
    label: "Registrar entrada",
    keywords: "entrada stock recepción inventario",
    icon: ArrowDownToLine,
  },
  {
    to: "/inventory",
    label: "Registrar salida",
    keywords: "salida stock inventario",
    icon: ArrowUpFromLine,
  },
  { to: "/finance", label: "Registrar gasto", keywords: "gasto egreso finanzas", icon: CreditCard },
] as const;

export function GlobalSearch({ visibleNav }: { visibleNav?: readonly { to: string }[] }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const navigate = useNavigate();

  useEffect(() => {
    setMounted(true);
    const updateOnline = () => setOnline(navigator.onLine);
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      document.removeEventListener("keydown", onKeyDown);
    };
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
          aria-label={
            online ? "Abrir búsqueda y acciones rápidas" : "Abrir acciones rápidas sin conexión"
          }
          onClick={() => setOpen(true)}
          className="fixed bottom-[4.5rem] right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-background shadow-lg ring-1 ring-black/5 md:hidden"
        >
          <ScanBarcode className="h-5 w-5 text-primary" aria-hidden="true" />
          {!online && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-3 w-3 rounded-full bg-destructive ring-2 ring-background"
              aria-hidden="true"
            />
          )}
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
        aria-label={
          online
            ? "Abrir búsqueda y acciones rápidas"
            : "Abrir búsqueda y acciones rápidas; sin conexión"
        }
        onClick={() => setOpen(true)}
        className="relative flex h-9 min-w-0 flex-1 items-center justify-center rounded-md border border-input bg-background px-2 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:h-auto md:max-w-md md:justify-start md:px-3 md:py-2 md:text-left"
      >
        <ScanBarcode className="h-4 w-4 shrink-0 md:mr-2" aria-hidden="true" />
        <span className="hidden flex-1 truncate md:block">Buscar o ejecutar una acción...</span>
        {!online && (
          <WifiOff
            className="ml-2 hidden h-4 w-4 shrink-0 text-destructive md:block"
            aria-label="Sin conexión"
          />
        )}
        <CommandShortcut className="ml-2 hidden md:inline-flex">⌘K</CommandShortcut>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder={
            online
              ? "Buscar módulos, SKU, scanner o acciones..."
              : "Sin conexión: acciones locales y navegación disponible..."
          }
        />
        <CommandList>
          <CommandEmpty>Sin resultados.</CommandEmpty>
          {!online && (
            <CommandGroup heading="Estado de conexión">
              <CommandItem value="sin conexión" disabled>
                <WifiOff className="mr-2 h-4 w-4 text-destructive" />
                Sin conexión a Internet. Las operaciones que requieren servidor podrán reintentarse
                al recuperar la conexión.
              </CommandItem>
            </CommandGroup>
          )}
          {actions.length > 0 && (
            <CommandGroup heading="Acciones rápidas">
              {actions.map((item) => (
                <CommandItem
                  key={`action:${item.label}`}
                  value={`${item.label} ${item.keywords}`}
                  onSelect={() => go(item.to)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandGroup heading="Módulos">
            {items.map((item) => (
              <CommandItem
                key={`module:${item.to}`}
                value={item.label}
                onSelect={() => go(item.to)}
              >
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
