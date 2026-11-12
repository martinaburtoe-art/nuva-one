import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useMemo, useState } from "react";
import "@/nuva-product-system.css";
import "@/module-motion-system.css";
import { LayoutDashboard, ShoppingCart, Package, Boxes, CreditCard, BarChart3, Sparkles, Brain, FileText, Settings, Bell, LogOut, ChevronsLeft, ChevronsRight, Building2, ChevronDown, Plus, Menu, Calculator, Lock, CalendarClock, Users, MessagesSquare, Truck, ShieldCheck, HelpCircle, UserRoundCog, Link2, Search, X, Receipt, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness, useMyMembership, hasModulePermission, type ModuleKey } from "@/lib/use-business";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AiChatBubble } from "@/components/ai-chat-bubble";
import { MODULE_INFO_PATHS, NuvaInfoCenter } from "@/components/nuva-info-center";
import { GlobalSearch } from "@/components/global-search";
import { ModuleSearch } from "@/components/module-search";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { splitMobileNavigation } from "@/lib/mobile-navigation";

const nav = [
  { to: "/dashboard", label: "Resumen", icon: LayoutDashboard, module: "dashboard", section: "Operación" },
  { to: "/pos", label: "Caja", icon: Calculator, module: "pos", section: "Operación" },
  { to: "/sales", label: "Ventas", icon: ShoppingCart, module: "sales", section: "Operación" },
  { to: "/customers", label: "Clientes", icon: Users, module: "customers", section: "Operación" },
  { to: "/customer-action-center", label: "Centro de acción CRM", icon: FileText, module: "customers", section: "Clientes" },
  { to: "/customers-intelligence", label: "Inteligencia de clientes", icon: Brain, module: "customers", section: "Clientes" },
  { to: "/billing", label: "Facturación SII", icon: Receipt, module: "billing", section: "Operación" },
  { to: "/purchases", label: "Compras", icon: Package, module: "purchases", section: "Operación" },
  { to: "/catalog", label: "Catálogo", icon: BookOpen, module: "catalog", section: "Operación" },
  { to: "/inventory", label: "Inventario", icon: Boxes, module: "inventory", section: "Operación" },
  { to: "/inventario-conteo", label: "Conteo físico", icon: Boxes, module: "inventory", section: "Inventario" },
  { to: "/inventario-operaciones", label: "Operaciones de inventario", icon: Package, module: "inventory", section: "Inventario" },
  { to: "/shipments", label: "Envíos & Entregas", icon: Truck, section: "Operación" },
  { to: "/finance", label: "Finanzas", icon: CreditCard, module: "finance", section: "Finanzas" },
  { to: "/finance-accounting", label: "Contabilidad y tributación", icon: FileText, module: "finance", section: "Finanzas" },
  { to: "/finance-professional", label: "Centro financiero profesional", icon: Calculator, module: "finance", section: "Finanzas" },
  { to: "/financial-control", label: "Control financiero", icon: ShieldCheck, module: "finance", section: "Finanzas" },
  { to: "/financial-integrity", label: "Integridad financiera", icon: ShieldCheck, module: "finance", section: "Finanzas" },
  { to: "/analytics", label: "Indicadores", icon: BarChart3, module: "analytics", section: "Finanzas" },
  { to: "/quotes", label: "Cotizaciones", icon: FileText, module: "quotes", section: "Finanzas" },
  { to: "/pricing-calculator", label: "Calculadora de precios", icon: Calculator, section: "Finanzas" },
  { to: "/nuva-intelligence", label: "Nüva Intelligence", icon: Brain, section: "Inteligencia" },
  { to: "/business-health", label: "Salud del negocio", icon: BarChart3, module: "dashboard", section: "Inteligencia" },
  { to: "/business-simulator", label: "Simulador de negocio", icon: Calculator, module: "dashboard", section: "Inteligencia" },
  { to: "/executive-command-center", label: "Centro Ejecutivo", icon: Sparkles, section: "Inteligencia" },
  { to: "/ai", label: "Asistente IA", icon: Sparkles, module: "ai", section: "Inteligencia" },
  { to: "/foro", label: "Comunidad", icon: MessagesSquare, section: "Espacio" },
  { to: "/shifts", label: "Turnos", icon: CalendarClock, adminOnly: true, section: "Espacio" },
  { to: "/people", label: "Nüva People", icon: UserRoundCog, module: "people", section: "Personas" },
  { to: "/people-employees", label: "Colaboradores", icon: Users, module: "people", section: "Personas" },
  { to: "/people-attendance", label: "Asistencia y jornada", icon: CalendarClock, module: "people", section: "Personas" },
  { to: "/people-compliance", label: "Centro de cumplimiento", icon: ShieldCheck, module: "people", section: "Personas" },
  { to: "/people-lifecycle", label: "Vacaciones y permisos", icon: CalendarClock, module: "people", section: "Personas" },
  { to: "/people-payroll", label: "Remuneraciones", icon: Calculator, module: "people", section: "Personas" },
  { to: "/conexiones", label: "Nüva Connect", icon: Link2, module: "conexiones", section: "Espacio" },
  { to: "/settings", label: "Configuración", icon: Settings, section: "Espacio" },
] as const;

export function DashboardShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [mobileModuleQuery, setMobileModuleQuery] = useState("");
  const playModuleMotion = (to: string) => {
    void navigate({ to });
  };
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { active, businesses, setActiveId } = useActiveBusiness();
  const {
    data: membership,
    isLoading: membershipLoading,
    isError: membershipError,
    refetch: refetchMembership,
  } = useMyMembership();
  const myRole = membership?.role ?? null;
  const canManage = myRole === "owner" || myRole === "admin";
  // Do not render restricted module links until the active business membership
  // has been resolved. Backend/RLS remains the actual authorization boundary.
  const visibleNav = membershipLoading || membershipError || !membership
    ? []
    : nav.filter((item) => {
        if ("adminOnly" in item && item.adminOnly) return canManage;
        if ("module" in item && item.module) return hasModulePermission(myRole, membership.permissions, item.module as ModuleKey);
        return true;
      });
  // Every authorized desktop module appears either in the persistent mobile
  // destinations or in the searchable “Más” directory.
  const { primary: mobilePrimaryNav, more: mobileMoreNav } = useMemo(
    () => splitMobileNavigation(visibleNav, mobileModuleQuery),
    [visibleNav, mobileModuleQuery],
  );
  const plan = (active as any)?.plan ?? "starter";
  const createdAt = (active as any)?.created_at ? new Date((active as any).created_at) : null;
  const trialDaysLeft = createdAt ? Math.max(0, 15 - Math.floor((Date.now() - createdAt.getTime()) / 86_400_000)) : 15;
  const trialExpired = plan !== "pro" && trialDaysLeft <= 0;
  const isSettingsRoute = pathname.startsWith("/settings");
  const showModuleInfo = MODULE_INFO_PATHS.has(pathname);

  async function logout() { await supabase.auth.signOut(); navigate({ to: "/auth" }); }
  function openHelp() { navigate({ to: "/help-center" }); }

  return (
    <div className="nuva-app flex min-h-dvh w-full bg-background">
      <aside className={cn("sticky top-0 hidden h-screen flex-col border-r border-sidebar-border/70 bg-sidebar/95 backdrop-blur transition-all duration-300 md:flex", collapsed ? "w-16" : "w-60")}>
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border/70 px-3"><Link to="/dashboard" className="flex items-center gap-2"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E6C687]/25 bg-[#E6C687]/10"><Sparkles className="h-4 w-4 text-[#E6C687]" /></div>{!collapsed && <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">Nüva One</span>}</Link></div>
        {!collapsed && <><div className="border-b border-sidebar-border p-3"><DropdownMenu><DropdownMenuTrigger asChild><button className="flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[.06] text-[#E6C687]"><Building2 className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-sidebar-foreground">{active?.name ?? "Sin negocio"}</div><div className="truncate text-xs text-muted-foreground">{active?.industry}</div></div><ChevronDown className="h-4 w-4 text-muted-foreground" /></button></DropdownMenuTrigger><DropdownMenuContent align="start" className="w-56"><DropdownMenuLabel>Tus negocios</DropdownMenuLabel>{businesses.map((b) => <DropdownMenuItem key={b.id} onClick={() => setActiveId(b.id)}><Building2 className="mr-2 h-4 w-4" /> {b.name}</DropdownMenuItem>)}<DropdownMenuSeparator /><DropdownMenuItem onClick={() => navigate({ to: "/onboarding" })}><Plus className="mr-2 h-4 w-4" /> Crear nuevo negocio</DropdownMenuItem><DropdownMenuItem onClick={() => navigate({ to: "/select-business" })}>Ver todos</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div><ModuleSearch items={visibleNav} onSelect={playModuleMotion} /></>}
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {membershipLoading && <p role="status" className="px-3 py-3 text-xs text-muted-foreground">Verificando módulos autorizados…</p>}
          {membershipError && <div role="alert" className="px-3 py-3"><p className="text-xs text-muted-foreground">No pudimos verificar tus permisos.</p><button type="button" onClick={() => void refetchMembership()} className="mt-2 min-h-10 text-xs font-semibold text-primary">Reintentar</button></div>}
          {!membershipLoading && !membershipError && !membership && <p className="px-3 py-3 text-xs text-muted-foreground">{active ? "No encontramos permisos para este negocio. Selecciona otro negocio o solicita acceso." : "Selecciona o crea un negocio para ver sus módulos."}</p>}
          {visibleNav.map((item, index) => { const isActive = pathname === item.to; const previous = visibleNav[index - 1]; const showSection = !collapsed && item.section && item.section !== previous?.section; return <div key={item.to}>{showSection && <p className={cn("px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/40", index === 0 && "pt-1")}>{item.section}</p>}<Link to={item.to} data-active={isActive} className={cn("nuva-nav-item group relative flex items-center gap-3 px-3 py-2 text-sm overflow-visible", isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground")}><item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-sidebar-foreground/55 group-hover:text-sidebar-foreground")} />{!collapsed && <span className="truncate">{item.label}</span>}</Link></div>; })}
          {myRole === "owner" && <><div className="my-2 border-t border-sidebar-border" /><Link to="/owner" className={cn("group flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm transition-all", pathname === "/owner" ? "text-primary" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground")}><ShieldCheck className="h-4 w-4 shrink-0" />{!collapsed && <span className="truncate">Nüva Owner · Command Center</span>}</Link></>}
        </nav>
        <div className="border-t border-sidebar-border p-2">{!collapsed && <button onClick={openHelp} className="mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"><HelpCircle className="h-4 w-4" /><span>Centro de ayuda</span></button>}<button onClick={() => setCollapsed((c) => !c)} title={collapsed ? "Expandir menú" : "Colapsar menú"} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground">{collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" /><span>Colapsar</span></>}</button></div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col"><header className="sticky top-0 z-30 flex min-h-14 items-center gap-2 border-b bg-background/80 px-3 pt-[env(safe-area-inset-top)] backdrop-blur md:h-14 md:pt-0 md:gap-3 md:px-6"><Link to="/dashboard" className="flex shrink-0 items-center gap-2 md:hidden"><div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E6C687]/25 bg-[#E6C687]/10"><Sparkles className="h-4 w-4 text-[#E6C687]" /></div></Link><div className="hidden max-w-md flex-1 md:block"><GlobalSearch visibleNav={visibleNav} /></div><div className="min-w-0 flex-1 truncate text-sm font-medium md:hidden">{active?.name ?? "Nüva One"}</div>{showModuleInfo && <NuvaInfoCenter inline />}<Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 md:h-9 md:w-9" aria-label="Abrir centro de ayuda" title="Centro de ayuda" onClick={openHelp}><HelpCircle className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 md:h-9 md:w-9" aria-label="Notificaciones" onClick={() => toast.info("No tienes notificaciones nuevas")}><Bell className="h-4 w-4" /></Button><DropdownMenu><DropdownMenuTrigger asChild><button className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E6C687]/30 bg-[#080809] text-sm font-semibold text-[#E6C687] md:h-9 md:w-9">U</button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => navigate({ to: "/settings" })}><Settings className="mr-2 h-4 w-4" /> Configuración</DropdownMenuItem>{myRole === "owner" && <DropdownMenuItem onClick={() => navigate({ to: "/owner" })}><ShieldCheck className="mr-2 h-4 w-4" /> Command Center</DropdownMenuItem>}<DropdownMenuSeparator /><DropdownMenuItem onClick={logout}><LogOut className="mr-2 h-4 w-4" /> Cerrar sesión</DropdownMenuItem></DropdownMenuContent></DropdownMenu></header><main className="min-w-0 flex-1 p-3 pb-[calc(5.75rem_+_env(safe-area-inset-bottom))] sm:p-4 md:p-8 md:pb-8">{trialExpired && !isSettingsRoute ? <TrialExpiredScreen navigate={navigate} /> : children}</main></div>
      <nav aria-label="Navegación principal móvil" className="fixed inset-x-0 bottom-0 z-40 flex min-h-16 items-stretch border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">{mobilePrimaryNav.map((item) => <Link key={item.to} to={item.to} aria-current={pathname === item.to ? "page" : undefined} className={cn("flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium leading-tight transition-colors", pathname === item.to ? "text-primary" : "text-muted-foreground")}><item.icon className="h-5 w-5 shrink-0" />{item.label}</Link>)}<Sheet open={moreOpen} onOpenChange={setMoreOpen}><SheetTrigger asChild><button aria-expanded={moreOpen} className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium leading-tight text-muted-foreground"><Menu className="h-5 w-5 shrink-0" />Más</button></SheetTrigger><SheetContent side="bottom" className="max-h-[min(82dvh,760px)] overflow-y-auto rounded-t-2xl pb-[max(1.25rem,env(safe-area-inset-bottom))]"><div className="mb-2 mt-2"><DropdownMenu><DropdownMenuTrigger asChild><button className="flex w-full items-center gap-2 rounded-lg border p-3 text-left"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[.06] text-[#E6C687]"><Building2 className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{active?.name ?? "Sin negocio"}</div><div className="truncate text-xs text-muted-foreground">{active?.industry}</div></div><ChevronDown className="h-4 w-4 text-muted-foreground" /></button></DropdownMenuTrigger><DropdownMenuContent align="start" className="w-56"><DropdownMenuLabel>Tus negocios</DropdownMenuLabel>{businesses.map((b) => <DropdownMenuItem key={b.id} onClick={() => setActiveId(b.id)}><Building2 className="mr-2 h-4 w-4" /> {b.name}</DropdownMenuItem>)}<DropdownMenuSeparator /><DropdownMenuItem onClick={() => navigate({ to: "/onboarding" })}><Plus className="mr-2 h-4 w-4" /> Crear nuevo negocio</DropdownMenuItem><DropdownMenuItem onClick={() => navigate({ to: "/select-business" })}>Ver todos</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div><div className="sticky top-0 z-10 -mx-4 mb-3 border-b bg-background/95 px-4 pb-3 pt-2 backdrop-blur"><label className="flex h-11 items-center gap-2 rounded-xl border bg-muted/50 px-3"><Search className="h-4 w-4 shrink-0 text-muted-foreground" /><input value={mobileModuleQuery} onChange={(event) => setMobileModuleQuery(event.target.value)} placeholder="Buscar entre todos los módulos..." aria-label="Buscar entre todos los módulos" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />{mobileModuleQuery && <button type="button" aria-label="Limpiar búsqueda" onClick={() => setMobileModuleQuery("")} className="rounded-md p-1 text-muted-foreground"><X className="h-4 w-4" /></button>}</label><p className="mt-2 px-1 text-xs text-muted-foreground" aria-live="polite">{membershipLoading ? "Verificando tus permisos…" : membershipError ? "No pudimos verificar los módulos" : membership ? `${mobileMoreNav.length} módulos disponibles · organizados por área` : "Selecciona un negocio para ver sus módulos"}</p></div><div className="space-y-1 pb-6">{mobileMoreNav.map((item, index) => { const previous = mobileMoreNav[index - 1]; const showSection = item.section !== previous?.section; return <div key={item.to}>{showSection && <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">{item.section}</p>}<Link to={item.to} onClick={() => { setMoreOpen(false); setMobileModuleQuery(""); }} aria-current={pathname === item.to ? "page" : undefined} className={cn("flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm", pathname === item.to ? "bg-secondary font-medium text-foreground" : "text-muted-foreground hover:bg-secondary/60")}><item.icon className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1">{item.label}</span>{pathname === item.to && <span className="text-xs text-primary">Actual</span>}</Link></div>; })}{membershipLoading ? <div role="status" className="rounded-xl border border-dashed p-6 text-center"><p className="text-sm font-medium">Cargando módulos autorizados…</p><p className="mt-1 text-xs text-muted-foreground">Estamos verificando el acceso de tu negocio.</p></div> : membershipError ? <div role="alert" className="rounded-xl border border-dashed p-6 text-center"><p className="text-sm font-medium">No pudimos verificar tus permisos</p><p className="mt-1 text-xs text-muted-foreground">No mostraremos módulos hasta confirmar tu acceso.</p><button type="button" onClick={() => void refetchMembership()} className="mt-3 min-h-11 rounded-lg border px-4 text-sm font-medium text-primary">Reintentar</button></div> : !membership ? <div className="rounded-xl border border-dashed p-6 text-center"><Building2 className="mx-auto mb-2 h-5 w-5 text-muted-foreground" /><p className="text-sm font-medium">{active ? "No encontramos acceso para este negocio" : businesses.length ? "Selecciona un negocio" : "Tu espacio está listo para comenzar"}</p><p className="mt-1 text-xs text-muted-foreground">{active ? "Selecciona otro negocio o solicita al administrador que confirme tu membresía." : businesses.length ? "Elige un negocio en el selector superior para cargar sus módulos." : "Crea tu negocio desde el selector superior para comenzar."}</p></div> : mobileMoreNav.length === 0 ? <div className="rounded-xl border border-dashed p-6 text-center"><Search className="mx-auto mb-2 h-5 w-5 text-muted-foreground" /><p className="text-sm font-medium">No encontramos ese módulo</p><p className="mt-1 text-xs text-muted-foreground">Prueba con otro nombre o área.</p></div> : null}{myRole === "owner" && !mobileModuleQuery && <Link to="/owner" onClick={() => setMoreOpen(false)} className="mt-4 flex min-h-12 items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-3 text-sm text-primary"><ShieldCheck className="h-4 w-4" />Nüva Owner · Command Center</Link>}</div></SheetContent></Sheet></nav>
      {!moreOpen && <AiChatBubble />}
    </div>
  );
}

function TrialExpiredScreen({ navigate }: { navigate: ReturnType<typeof useNavigate> }) { return <div className="flex min-h-[60vh] items-center justify-center"><div className="max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm"><Lock className="mx-auto h-10 w-10 text-muted-foreground" /><h2 className="mt-4 text-xl font-semibold">Tu prueba gratuita terminó</h2><p className="mt-2 text-sm text-muted-foreground">Elige un plan para continuar usando todas las herramientas de Nüva One.</p><Button className="mt-6" onClick={() => navigate({ to: "/pricing" })}>Ver planes</Button></div></div>; }
