import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  CreditCard,
  BarChart3,
  Sparkles,
  Brain,
  FileText,
  Workflow,
  Settings,
  Bell,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  Building2,
  ChevronDown,
  Plus,
  Menu,
  Calculator,
  Lock,
  CalendarClock,
  Users,
  MessagesSquare,
  Truck,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  useActiveBusiness,
  useMyMembership,
  hasModulePermission,
  type ModuleKey,
} from "@/lib/use-business";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AiChatBubble } from "@/components/ai-chat-bubble";
import { MODULE_INFO_PATHS, NuvaInfoCenter } from "@/components/nuva-info-center";
import { GlobalSearch } from "@/components/global-search";
import { ModuleSearch } from "@/components/module-search";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const nav = [
  { to: "/dashboard", label: "Resumen", icon: LayoutDashboard, module: "dashboard", section: "Operación" },
  { to: "/pos", label: "Caja", icon: Calculator, module: "pos", section: "Operación" },
  { to: "/sales", label: "Ventas", icon: ShoppingCart, module: "sales", section: "Operación" },
  { to: "/customers", label: "Clientes", icon: Users, module: "customers", section: "Operación" },
  { to: "/purchases", label: "Compras", icon: Package, module: "purchases", section: "Operación" },
  { to: "/inventory", label: "Inventario", icon: Boxes, module: "inventory", section: "Operación" },
  { to: "/shipments", label: "Envíos & Entregas", icon: Truck, section: "Operación" },
  { to: "/finance", label: "Finanzas", icon: CreditCard, module: "finance", section: "Finanzas" },
  { to: "/analytics", label: "Indicadores", icon: BarChart3, module: "analytics", section: "Finanzas" },
  { to: "/quotes", label: "Cotizaciones", icon: FileText, module: "quotes", section: "Finanzas" },
  { to: "/pricing-calculator", label: "Calculadora de precios", icon: Calculator, section: "Finanzas" },
  { to: "/nuva-intelligence", label: "Nüva Intelligence", icon: Brain, section: "Inteligencia" },
  { to: "/executive-command-center", label: "Centro Ejecutivo", icon: Sparkles, section: "Inteligencia" },
  { to: "/ai", label: "Asistente IA", icon: Sparkles, module: "ai", section: "Inteligencia" },
  { to: "/studio", label: "Nüva Studio", icon: Sparkles, section: "Inteligencia" },
  { to: "/foro", label: "Comunidad", icon: MessagesSquare, section: "Espacio" },
  { to: "/shifts", label: "Turnos", icon: CalendarClock, adminOnly: true, section: "Espacio" },
  { to: "/settings", label: "Configuración", icon: Settings, section: "Espacio" },
] as const;

export function DashboardShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { active, businesses, setActiveId } = useActiveBusiness();
  const { data: membership } = useMyMembership();
  const myRole = membership?.role ?? null;
  const canManage = myRole === "owner" || myRole === "admin";
  const visibleNav = nav.filter((item) => {
    if ("adminOnly" in item && item.adminOnly) return canManage;
    if ("module" in item && item.module) {
      return hasModulePermission(myRole, membership?.permissions, item.module as ModuleKey);
    }
    return true;
  });
  const mobilePrimaryNav = visibleNav.filter((n) =>
    ["/dashboard", "/pos", "/inventory", "/shipments", "/ai"].includes(n.to),
  );
  const mobileMoreNav = visibleNav.filter((n) => !mobilePrimaryNav.includes(n));

  const plan = (active as any)?.plan ?? "starter";
  const createdAt = (active as any)?.created_at ? new Date((active as any).created_at) : null;
  const trialDaysLeft = createdAt
    ? Math.max(0, 15 - Math.floor((Date.now() - createdAt.getTime()) / 86_400_000))
    : 15;
  const trialExpired = plan !== "pro" && trialDaysLeft <= 0;
  const isSettingsRoute = pathname.startsWith("/settings");
  const showModuleInfo = MODULE_INFO_PATHS.has(pathname);

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  function openHelp() {
    navigate({ to: "/help-center" });
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen flex-col border-r border-sidebar-border/70 bg-sidebar/95 backdrop-blur transition-all duration-300 md:flex",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border/70 px-3">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            {!collapsed && (
              <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
                Nüva One
              </span>
            )}
          </Link>
        </div>

        {!collapsed && (
          <>
            <div className="border-b border-sidebar-border p-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-primary text-primary-foreground">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-sidebar-foreground">
                        {active?.name ?? "Sin negocio"}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{active?.industry}</div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Tus negocios</DropdownMenuLabel>
                  {businesses.map((b) => (
                    <DropdownMenuItem key={b.id} onClick={() => setActiveId(b.id)}>
                      <Building2 className="mr-2 h-4 w-4" /> {b.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate({ to: "/onboarding" })}>
                    <Plus className="mr-2 h-4 w-4" /> Crear nuevo negocio
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ to: "/select-business" })}>
                    Ver todos
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <ModuleSearch items={visibleNav} />
          </>
        )}

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {visibleNav.map((item, index) => {
            const isActive = pathname === item.to;
            const previous = visibleNav[index - 1];
            const showSection = !collapsed && item.section && item.section !== previous?.section;
            return (
              <div key={item.to}>
                {showSection && (
                  <p className={cn("px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/40", index === 0 && "pt-1")}>
                    {item.section}
                  </p>
                )}
                <Link
                  to={item.to}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-[background-color,color,transform] duration-200",
                    "motion-safe:hover:translate-x-px",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  )}
                >
                  <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-sidebar-foreground/55 group-hover:text-sidebar-foreground")} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              </div>
            );
          })}
          {myRole === "owner" && (
            <>
              <div className="my-2 border-t border-sidebar-border" />
              <Link
                to="/owner"
                className={cn(
                  "group flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm transition-all",
                  pathname === "/owner"
                    ? "text-primary"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <ShieldCheck className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">Nüva Owner · Command Center</span>}
              </Link>
            </>
          )}
        </nav>

        <div className="border-t border-sidebar-border p-2">
          {!collapsed && (
            <button
              onClick={openHelp}
              className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <HelpCircle className="h-4 w-4" />
              <span>Centro de ayuda</span>
            </button>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Expandir menú" : "Colapsar menú"}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronsLeft className="h-4 w-4" />
                <span>Colapsar</span>
              </>
            )}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur md:gap-3 md:px-6">
          <Link to="/dashboard" className="flex shrink-0 items-center gap-2 md:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
          </Link>
          <div className="hidden max-w-md flex-1 md:block">
            <GlobalSearch visibleNav={visibleNav} />
          </div>
          <div className="min-w-0 flex-1 truncate text-sm font-medium md:hidden">
            {active?.name ?? "Nüva One"}
          </div>
          {showModuleInfo && <NuvaInfoCenter inline />}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Abrir centro de ayuda"
            title="Centro de ayuda"
            onClick={openHelp}
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notificaciones"
            onClick={() => toast.info("No tienes notificaciones nuevas")}
          >
            <Bell className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground">
                U
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
                <Settings className="mr-2 h-4 w-4" /> Configuración
              </DropdownMenuItem>
              {myRole === "owner" && (
                <DropdownMenuItem onClick={() => navigate({ to: "/owner" })}>
                  <ShieldCheck className="mr-2 h-4 w-4" /> Command Center
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 motion-safe:animate-fade-in-up p-4 pb-24 md:p-8 md:pb-8">
          {trialExpired && !isSettingsRoute ? <TrialExpiredScreen navigate={navigate} /> : children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center border-t bg-background/95 backdrop-blur md:hidden">
        {mobilePrimaryNav.map((item) => {
          const isActive = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px]",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground">
              <Menu className="h-5 w-5" />
              Más
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl">
            <div className="mb-2 mt-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex w-full items-center gap-2 rounded-lg border p-3 text-left">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-primary text-primary-foreground">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {active?.name ?? "Sin negocio"}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{active?.industry}</div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuLabel>Tus negocios</DropdownMenuLabel>
                  {businesses.map((b) => (
                    <DropdownMenuItem key={b.id} onClick={() => setActiveId(b.id)}>
                      <Building2 className="mr-2 h-4 w-4" /> {b.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate({ to: "/onboarding" })}>
                    <Plus className="mr-2 h-4 w-4" /> Crear nuevo negocio
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate({ to: "/select-business" })}>
                    Ver todos
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="space-y-1 pb-6">
              {mobileMoreNav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-3 text-sm",
                    pathname === item.to
                      ? "bg-secondary font-medium text-foreground"
                      : "text-muted-foreground hover:bg-secondary/60",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
              {myRole === "owner" && (
                <Link
                  to="/owner"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-3 text-sm text-primary"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Nüva Owner · Command Center
                </Link>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </nav>

      <AiChatBubble />
    </div>
  );
}

function TrialExpiredScreen({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
        <Lock className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="mt-4 text-xl font-semibold">Tu prueba gratuita terminó</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Elige un plan para continuar usando todas las herramientas de Nüva One.
        </p>
        <Button className="mt-6" onClick={() => navigate({ to: "/pricing" })}>
          Ver planes
        </Button>
      </div>
    </div>
  );
}
