import { useEffect, useState } from "react";
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
  Megaphone,
  Sparkles,
  FileText,
  Workflow,
  Settings,
  Calculator,
  CalendarClock,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Resumen", icon: LayoutDashboard },
  { to: "/pos", label: "Caja", icon: Calculator },
  { to: "/sales", label: "Ventas", icon: ShoppingCart },
  { to: "/purchases", label: "Compras", icon: Package },
  { to: "/inventory", label: "Inventario", icon: Boxes },
  { to: "/finance", label: "Finanzas", icon: CreditCard },
  { to: "/analytics", label: "Indicadores", icon: BarChart3 },
  { to: "/marketing", label: "Marketing", icon: Megaphone },
  { to: "/quotes", label: "Cotizaciones", icon: FileText },
  { to: "/automations", label: "Automatizaciones", icon: Workflow },
  { to: "/ai", label: "Asistente IA", icon: Sparkles },
  { to: "/shifts", label: "Turnos", icon: CalendarClock },
  { to: "/settings", label: "Configuración", icon: Settings },
] as const;

export function GlobalSearch({
  visibleNav,
}: {
  // Optional: pass the shell's already-role-filtered nav so hidden items
  // (e.g. Turnos for non-admins) don't leak into search results.
  visibleNav?: readonly { to: string }[];
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const allowedPaths = visibleNav ? new Set(visibleNav.map((n) => n.to)) : null;
  const items = allowedPaths ? navItems.filter((n) => allowedPaths.has(n.to)) : navItems;

  function go(to: string) {
    setOpen(false);
    navigate({ to: to as any });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative hidden max-w-md flex-1 items-center rounded-md border border-input bg-background px-3 py-2 text-left text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent md:flex"
      >
        <span className="flex-1">Buscar...</span>
        <CommandShortcut className="ml-2">⌘K</CommandShortcut>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar módulos o acciones rápidas..." />
        <CommandList>
          <CommandEmpty>Sin resultados.</CommandEmpty>
          <CommandGroup heading="Navegar">
            {items.map((item) => (
              <CommandItem key={item.to} value={item.label} onSelect={() => go(item.to)}>
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
