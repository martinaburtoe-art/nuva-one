import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness, useMyRole } from "@/lib/use-business";
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
import { GlobalSearch } from "@/components/global-search";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const nav = [
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
  { to: "/shifts", label: "Turnos", icon: CalendarClock, adminOnly: true },
  { to: "/settings", label: "Configuración", icon: Settings },
] as const;

export function DashboardShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { active, businesses, setActiveId } = useActiveBusiness();
  const { data: myRole } = useMyRole();
  const canManage = myRole === "owner" || myRole === "admin";
  const visibleNav = nav.filter((item) => !("adminOnly" in item && item.adminOnly) || canManage);
  const mobilePrimaryNav = visibleNav.filter((n) =>
    ["/dashboard", "/pos", "/inventory", "/ai"].includes(n.to),
  );
  const mobileMoreNav = visibleNav.filter((n) => !mobilePrimaryNav.includes(n));

  const plan = (active as any)?.plan ?? "starter";
  const createdAt = (active as any)?.created_at ? new Date((active as any).created_at) : null;
  const trialDaysLeft = createdAt
    ? Math.max(0, 15 - Math.floor((Date.now() - createdAt.getTime()) / 86_400_000))
    : 15;
  const trialExpired = plan !== "pro" && trialDaysLeft <= 0;
  const isSettingsRoute = pathname.startsWith("/settings");

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar — desktop only (md and up) */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 md:flex",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3">
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
        )}

        <nav className="flex-1 space-y-0.5 p-2">
          {visibleNav.map((item) => {
            const isActive = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <item.icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-2">
          <button
            onClick={() => setCollapsed((c) => !c)}
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

      {/* Main */}
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

          <Button
            variant="ghost"
            size="icon"
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
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 animate-fade-in-up p-4 pb-24 md:p-8 md:pb-8">
          {trialExpired && !isSettingsRoute ? <TrialExpiredScreen navigate={navigate} /> : children}
        </main>
      </div>

      {/* Bottom tab bar — mobile only */}
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
                      <div className="truncate text-xs text-muted-foreground">
                        {active?.industry}
                      </div>
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
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="grid grid-cols-3 gap-2 py-2">
              {mobileMoreNav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs",
                    pathname === item.to ? "border-primary text-primary" : "text-muted-foreground",
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-center leading-tight">{item.label}</span>
                </Link>
              ))}
              <button
                onClick={logout}
                className="flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs text-destructive"
              >
                <LogOut className="h-5 w-5" />
                Cerrar sesión
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </nav>

      <div className="hidden md:block">
        <AiChatBubble />
      </div>
    </div>
  );
}

function TrialExpiredScreen({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent">
        <Lock className="h-6 w-6 text-primary" />
      </div>
      <h2 className="text-xl font-bold">Tu prueba gratuita de 15 días terminó</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Actualiza a Pro para seguir usando Nüva One sin interrupciones — mantienes todos tus datos
        tal como los dejaste.
      </p>
      <Button className="mt-5" onClick={() => navigate({ to: "/settings" })}>
        Actualizar a Pro — $29.990/mes
      </Button>
    </div>
  );
}
