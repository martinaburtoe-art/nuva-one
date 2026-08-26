import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  BarChart3,
  Bell,
  Boxes,
  Calculator,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  MessageSquare,
  Package,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DEMO_BUSINESS, DEMO_CUSTOMERS, money } from "@/lib/demo/demo-data";
import { demoAiAnswer } from "@/lib/demo/demo-ai";
import { useDemoState } from "@/lib/demo/demo-state";
import { trackDemoEvent } from "@/lib/demo/demo-analytics";

type ModuleKey =
  | "dashboard"
  | "pos"
  | "sales"
  | "customers"
  | "billing"
  | "purchases"
  | "inventory"
  | "shipments"
  | "finance"
  | "analytics"
  | "quotes"
  | "ai"
  | "community"
  | "shifts"
  | "settings";

type NavItem = { key: ModuleKey; label: string; icon: typeof LayoutDashboard };

const NAV: NavItem[] = [
  { key: "dashboard", label: "Resumen", icon: LayoutDashboard },
  { key: "pos", label: "Caja", icon: Calculator },
  { key: "sales", label: "Ventas", icon: ShoppingCart },
  { key: "customers", label: "Clientes", icon: Users },
  { key: "billing", label: "Facturación SII", icon: Receipt },
  { key: "purchases", label: "Compras", icon: Package },
  { key: "inventory", label: "Inventario", icon: Boxes },
  { key: "shipments", label: "Envíos & Entregas", icon: Truck },
  { key: "finance", label: "Finanzas", icon: CreditCard },
  { key: "analytics", label: "Indicadores", icon: BarChart3 },
  { key: "quotes", label: "Cotizaciones", icon: FileText },
  { key: "ai", label: "Asistente IA", icon: Sparkles },
  { key: "community", label: "Comunidad", icon: MessageSquare },
  { key: "shifts", label: "Turnos", icon: CalendarClock },
  { key: "settings", label: "Configuración", icon: Settings },
];

const productNames = [
  ["Café de especialidad 250 g", "Café", 18, 12, 8990],
  ["Granos Colombia 1 kg", "Café", 7, 10, 15990],
  ["Té verde premium", "Té", 24, 8, 6990],
  ["Brownie artesanal", "Pastelería", 9, 6, 4490],
  ["Taza Nüva edición", "Merchandising", 31, 10, 11990],
] as const;

export function DemoWorkspace({ onExit }: { onExit: () => void }) {
  const [active, setActive] = useState<ModuleKey>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [aiQuestion, setAiQuestion] = useState("¿Qué debería hacer primero con mi negocio?");
  const [aiAnswer, setAiAnswer] = useState(() => demoAiAnswer("¿Qué debería hacer primero con mi negocio?"));
  const [demoOrder, setDemoOrder] = useState(0);
  const { products, customers, simulatedSales, revenueDelta, sell, reset } = useDemoState();

  const lowStock = useMemo(() => products.filter((p) => p.stock <= p.reorderAt), [products]);
  const revenue = DEMO_BUSINESS.monthlyRevenue + revenueDelta;
  const visibleNav = NAV.filter((item) => !search || item.label.toLowerCase().includes(search.toLowerCase()));
  const current = NAV.find((item) => item.key === active) ?? NAV[0];

  const select = (key: ModuleKey) => {
    setActive(key);
    setMobileOpen(false);
    setNotice(null);
    trackDemoEvent("module_opened", { module: key });
  };

  const simulateSale = () => {
    sell("coffee");
    setNotice("Venta simulada registrada: el stock, ingresos e indicadores cambiaron dentro de esta demo.");
    trackDemoEvent("simulated_sale", { product: "coffee", module: active });
  };

  const resetAll = () => {
    reset();
    setDemoOrder(0);
    setNotice("Demo reiniciada con datos ficticios iniciales.");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-x-0 top-0 z-[70] flex items-center justify-center gap-2 border-b bg-primary px-3 py-2 text-xs text-primary-foreground shadow-sm">
        <Sparkles className="h-3.5 w-3.5" />
        <span><strong>Modo demo:</strong> estás explorando una copia segura de Nüva One con datos ficticios. Nada aquí afecta un negocio real.</span>
        <button className="ml-2 hidden font-semibold underline sm:inline" onClick={onExit}>Salir del demo</button>
      </div>

      <aside className={`fixed left-0 top-8 z-50 hidden h-[calc(100vh-2rem)] flex-col border-r bg-sidebar md:flex ${collapsed ? "w-16" : "w-60"}`}>
        <div className="flex h-14 items-center justify-between border-b px-3">
          <button className="flex items-center gap-2" onClick={() => setCollapsed((v) => !v)} aria-label="Colapsar menú">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></span>
            {!collapsed && <span className="text-sm font-semibold">Nüva One</span>}
          </button>
          {!collapsed && <Badge variant="secondary" className="text-[10px]">DEMO</Badge>}
        </div>
        {!collapsed && (
          <div className="border-b p-3">
            <div className="flex items-center gap-2 rounded-lg border bg-background/60 p-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-primary text-primary-foreground"><span className="text-xs font-bold">AC</span></div>
              <div className="min-w-0"><div className="truncate text-sm font-medium">{DEMO_BUSINESS.name}</div><div className="truncate text-[11px] text-muted-foreground">{DEMO_BUSINESS.industry}</div></div>
              <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        )}
        {!collapsed && (
          <div className="px-2 pt-2"><div className="relative"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar módulo..." className="h-8 pl-8 text-xs" /></div></div>
        )}
        <nav className="flex-1 overflow-y-auto p-2">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return <button key={item.key} onClick={() => select(item.key)} className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${active === item.key ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"}`} title={collapsed ? item.label : undefined}>
              <Icon className={`h-4 w-4 shrink-0 ${active === item.key ? "text-primary" : ""}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>;
          })}
          <div className="my-2 border-t" />
          <button onClick={() => { setNotice("El Command Center es una vista de administración avanzada disponible para el propietario de Nüva One."); }} className="flex w-full items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-left text-sm text-primary">
            <ShieldCheck className="h-4 w-4 shrink-0" />{!collapsed && <span>Nüva Owner · Command Center</span>}
          </button>
        </nav>
        <div className="border-t p-2">
          <button onClick={resetAll} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent"><RotateCcw className="h-4 w-4" />{!collapsed && <span>Reiniciar demo</span>}</button>
        </div>
      </aside>

      <div className={`${collapsed ? "md:pl-16" : "md:pl-60"}`}>
        <header className="sticky top-8 z-40 flex h-14 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur md:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></Button>
          <div className="min-w-0 flex-1"><div className="text-sm font-semibold">{current.label}</div><div className="hidden text-[11px] text-muted-foreground sm:block">{DEMO_BUSINESS.name} · Datos de demostración</div></div>
          <div className="hidden items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-xs text-muted-foreground lg:flex"><span className="h-2 w-2 rounded-full bg-success" /> Sistema operativo</div>
          <Button variant="ghost" size="icon" onClick={() => setNotice("En la versión real, aquí aparecerán alertas de stock, cobranza, facturación y actividad.")}><Bell className="h-4 w-4" /></Button>
          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground" onClick={() => select("settings")}><UserRound className="h-4 w-4" /></button>
        </header>

        <main className="min-h-[calc(100vh-7rem)] p-4 pb-16 md:p-8">
          <div className="mx-auto max-w-7xl">
            {notice && <div className="mb-5 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span className="flex-1">{notice}</span><button onClick={() => setNotice(null)}><X className="h-4 w-4 text-muted-foreground" /></button></div>}
            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><Badge variant="secondary" className="mb-2">Vista real de producto · Demo</Badge><h1 className="text-2xl font-bold tracking-tight md:text-3xl">{current.label}</h1><p className="mt-1 text-sm text-muted-foreground">Explora cómo se vería y cómo se relaciona con el resto de tu operación.</p></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={resetAll}><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Reiniciar</Button><Link to="/auth" search={{ mode: "signup" }}><Button size="sm">Probar con mi negocio <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></Link></div></div>

            {active === "dashboard" && <DashboardView revenue={revenue} lowStock={lowStock.length} customers={customers.length} simulatedSales={simulatedSales} onSale={simulateSale} onSelect={select} />}
            {active === "pos" && <PosView onSale={simulateSale} stock={products.find((p) => p.id === "coffee")?.stock ?? 0} />}
            {active === "sales" && <SalesView revenue={revenue} onSale={simulateSale} simulatedSales={simulatedSales} />}
            {active === "customers" && <CustomersView customers={customers} />}
            {active === "billing" && <BillingView />}
            {active === "purchases" && <PurchasesView />}
            {active === "inventory" && <InventoryView products={products} lowStock={lowStock.length} />}
            {active === "shipments" && <ShipmentsView />}
            {active === "finance" && <FinanceView revenue={revenue} />}
            {active === "analytics" && <AnalyticsView revenue={revenue} />}
            {active === "quotes" && <QuotesView order={demoOrder} onCreate={() => { setDemoOrder((v) => v + 1); setNotice("Cotización de demostración creada. En la plataforma real puede convertirse en venta y alimentar el CRM."); }} />}
            {active === "ai" && <AiView question={aiQuestion} answer={aiAnswer} setQuestion={setAiQuestion} ask={() => { setAiAnswer(demoAiAnswer(aiQuestion)); trackDemoEvent("ai_question", { question: aiQuestion }); }} />}
            {active === "community" && <CommunityView />}
            {active === "shifts" && <ShiftsView />}
            {active === "settings" && <SettingsView />}
          </div>
        </main>

        <footer className="border-t px-4 py-6 text-center text-xs text-muted-foreground md:px-8">Nüva One Demo · Experiencia interactiva con datos ficticios · <button className="font-medium text-primary" onClick={onExit}>Volver a la página pública</button></footer>
      </div>

      {mobileOpen && <div className="fixed inset-0 z-[80] bg-background md:hidden"><div className="flex h-full flex-col"><div className="flex h-14 items-center justify-between border-b px-4"><div className="flex items-center gap-2 font-semibold"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></span>Nüva One <Badge variant="secondary">DEMO</Badge></div><Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></Button></div><div className="p-4"><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar módulo..." className="pl-9" /></div></div><nav className="grid flex-1 grid-cols-2 gap-2 overflow-y-auto p-4">{visibleNav.map((item) => { const Icon = item.icon; return <button key={item.key} onClick={() => select(item.key)} className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-xs ${active === item.key ? "border-primary bg-primary/5 text-primary" : "text-muted-foreground"}`}><Icon className="h-5 w-5" />{item.label}</button>; })}</nav></div></div>}
    </div>
  );
}

function DashboardView({ revenue, lowStock, customers, simulatedSales, onSale, onSelect }: { revenue: number; lowStock: number; customers: number; simulatedSales: number; onSale: () => void; onSelect: (key: ModuleKey) => void }) {
  return <div className="space-y-6">
    <Card className="overflow-hidden bg-gradient-to-br from-card via-card to-primary/[0.05] p-6"><div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="h-5 w-5" /></span><Badge>Centro de mando</Badge></div><h2 className="mt-4 text-2xl font-bold">Buenos días. Esto es lo que está pasando.</h2><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Nüva reúne tus datos y los convierte en señales: qué está bien, qué requiere atención y qué acción conviene tomar.</p></div><Button onClick={() => onSelect("ai")} variant="outline">Preguntarle a Nüva IA <ArrowRight className="ml-1 h-4 w-4" /></Button></div></Card>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Kpi label="Ventas del período" value={money(revenue)} delta={simulatedSales ? `+${money(8990 * simulatedSales)}` : "+18,4%"} icon={<CircleDollarSign />} /><Kpi label="Nüva Score" value="87 / 100" delta="+6 pts" icon={<Activity />} /><Kpi label="Stock crítico" value={String(lowStock)} delta="Requiere atención" icon={<Boxes />} /><Kpi label="Clientes activos" value={String(customers)} delta="+12,8%" icon={<Users />} /></div>
    <div className="grid gap-6 lg:grid-cols-3"><Card className="p-5 lg:col-span-2"><SectionTitle icon={<BarChart3 />} title="Evolución de ventas" subtitle="Vista ejecutiva · últimos 7 períodos" /><MiniChart /><div className="mt-4 grid grid-cols-3 gap-3"><Stat label="Ticket promedio" value="$18.450" /><Stat label="Margen estimado" value="31,8%" /><Stat label="Conversión" value="24,6%" /></div></Card><Card className="p-5"><SectionTitle icon={<Sparkles />} title="Nüva Score" subtitle="Salud general del negocio" /><div className="my-5 flex items-center justify-center"><div className="flex h-32 w-32 flex-col items-center justify-center rounded-full border-8 border-primary/20"><span className="text-3xl font-bold">87</span><span className="text-xs text-muted-foreground">de 100</span></div></div><div className="rounded-xl bg-primary/5 p-3 text-sm">Fortaleza: ventas y recurrencia. Oportunidad: reposición de inventario y seguimiento comercial.</div></Card></div>
    <div className="grid gap-6 lg:grid-cols-2"><Card className="p-5"><SectionTitle icon={<Sparkles />} title="Explícame mi negocio" subtitle="Resumen generado desde el contexto empresarial" /><div className="mt-4 space-y-3"><Signal title="Fortaleza" text="El margen permite crecer sin perder control." type="good" /><Signal title="Alerta" text="Hay productos bajo su punto de reposición." type="warn" /><Signal title="Oportunidad" text="Clientes recurrentes pueden aumentar frecuencia de compra." type="info" /></div></Card><Card className="p-5"><SectionTitle icon={<ShoppingCart />} title="Acciones rápidas" subtitle="Prueba operaciones sin riesgo" /><div className="mt-4 grid gap-2 sm:grid-cols-2"><Button variant="outline" onClick={onSale}>Simular venta</Button><Button variant="outline" onClick={() => onSelect("inventory")}>Revisar inventario</Button><Button variant="outline" onClick={() => onSelect("billing")}>Ver facturación</Button><Button variant="outline" onClick={() => onSelect("finance")}>Abrir finanzas</Button></div></Card></div>
  </div>;
}

function PosView({ onSale, stock }: { onSale: () => void; stock: number }) { return <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]"><Card className="p-5"><SectionTitle icon={<Calculator />} title="Caja / POS" subtitle="Vende, cobra y controla tu caja desde un solo lugar" /><div className="mt-5 grid gap-3 sm:grid-cols-2">{productNames.slice(0, 4).map(([name, cat, , , price]) => <button key={name} onClick={onSale} className="rounded-xl border p-4 text-left transition hover:border-primary hover:bg-primary/5"><div className="flex items-center justify-between"><span className="font-medium">{name}</span><Plus className="h-4 w-4 text-primary" /></div><div className="mt-1 text-xs text-muted-foreground">{cat}</div><div className="mt-3 font-semibold">{money(price)}</div></button>)}</div></Card><Card className="p-5"><SectionTitle icon={<ShoppingCart />} title="Venta actual" subtitle="Sesión de demostración" /><div className="mt-6 rounded-xl bg-secondary/40 p-4"><div className="flex justify-between"><span>Café de especialidad 250 g</span><strong>{money(8990)}</strong></div><div className="mt-2 text-xs text-muted-foreground">Stock disponible: {stock}</div><div className="my-4 border-t" /><div className="flex justify-between text-lg font-bold"><span>Total</span><span>{money(8990)}</span></div><Button className="mt-4 w-full" onClick={onSale}>Confirmar venta simulada</Button></div></Card></div>; }

function SalesView({ revenue, onSale, simulatedSales }: { revenue: number; onSale: () => void; simulatedSales: number }) { return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-3"><Kpi label="Ventas" value={money(revenue)} delta={`${simulatedSales} simuladas`} icon={<ShoppingCart />} /><Kpi label="Ticket promedio" value="$18.450" delta="+7,2%" icon={<CircleDollarSign />} /><Kpi label="Ventas pendientes" value="8" delta="2 requieren seguimiento" icon={<Activity />} /></div><Card className="p-5"><SectionTitle icon={<ShoppingCart />} title="Actividad comercial" subtitle="Las ventas alimentan inventario, caja, finanzas y CRM" /><div className="mt-5 overflow-x-auto"><DataTable headers={["Cliente", "Documento", "Total", "Estado", "Acción"]} rows={[["Constructora Maule", "V-1042", "$184.500", "Pagada", "Ver"],["Café Central", "V-1041", "$92.300", "Pagada", "Ver"],["Hotel Valle", "V-1040", "$341.800", "Por cobrar", "Seguimiento"],["Pedro Rojas", "V-1039", "$45.900", "Pagada", "Ver"]]} /></div><Button className="mt-5" onClick={onSale}>Registrar una venta de prueba <ArrowRight className="ml-1 h-4 w-4" /></Button></Card></div>; }

function CustomersView({ customers }: { customers: typeof DEMO_CUSTOMERS }) { return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-3"><Kpi label="Clientes" value={String(customers.length + 124)} delta="+12 este mes" icon={<Users />} /><Kpi label="Recurrentes" value="68%" delta="+4,1 pts" icon={<Activity />} /><Kpi label="Valor cartera" value="$12,8 M" delta="+9,4%" icon={<CircleDollarSign />} /></div><Card className="p-5"><SectionTitle icon={<Users />} title="CRM" subtitle="Cada cliente conserva contexto, actividad, compras y seguimiento" /><div className="mt-5 grid gap-3 md:grid-cols-2">{customers.map((customer) => <div key={customer.id} className="rounded-xl border p-4"><div className="flex items-start justify-between"><div><div className="font-medium">{customer.name}</div><div className="text-xs text-muted-foreground">{customer.company}</div></div><Badge variant="secondary">Activo</Badge></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><Stat label="Valor" value={money(customer.value)} /><Stat label="Última compra" value={customer.lastPurchase} /></div><Button variant="outline" size="sm" className="mt-4 w-full">Ver ficha y actividad</Button></div>)}</div></Card></div>; }

function BillingView() { return <div className="space-y-6"><Card className="p-5"><SectionTitle icon={<Receipt />} title="Facturación SII" subtitle="Controla documentos tributarios y su estado desde Nüva One" /><div className="mt-5 grid gap-4 sm:grid-cols-4"><Stat label="Emitidos" value="184" /><Stat label="Pendientes" value="7" /><Stat label="Aceptados SII" value="98,9%" /><Stat label="Notas" value="3" /></div><div className="mt-6 overflow-x-auto"><DataTable headers={["Folio", "Tipo", "Cliente", "Monto", "Estado"]} rows={[["1042","Factura electrónica","Constructora Maule","$184.500","Aceptado SII"],["1041","Factura electrónica","Café Central","$92.300","Aceptado SII"],["1040","Factura electrónica","Hotel Valle","$341.800","Pendiente"],["1039","Boleta electrónica","Pedro Rojas","$45.900","Aceptado SII"]]} /></div></Card><div className="grid gap-4 md:grid-cols-3"><ActionCard icon={<Plus />} title="Emitir DTE" text="Inicia un documento tributario." /><ActionCard icon={<ArrowDownToLine />} title="Descargar documentos" text="Exporta información para tu gestión." /><ActionCard icon={<ShieldCheck />} title="Control tributario" text="Detecta inconsistencias antes del cierre." /></div></div>; }

function PurchasesView() { return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-3"><Kpi label="Compras del mes" value="$4,86 M" delta="+6,3%" icon={<Package />} /><Kpi label="Proveedores" value="42" delta="5 críticos" icon={<Users />} /><Kpi label="Por pagar" value="$1,24 M" delta="12 documentos" icon={<CircleDollarSign />} /></div><Card className="p-5"><SectionTitle icon={<Package />} title="Compras" subtitle="Ordenes, recepción, proveedores y efecto financiero conectados" /><div className="mt-5 overflow-x-auto"><DataTable headers={["OC", "Proveedor", "Fecha", "Monto", "Estado"]} rows={[["OC-204","Distribuidora Sur","25 ago","$540.000","Recibida"],["OC-203","Café Import","24 ago","$1.240.000","Parcial"],["OC-202","Envases Chile","22 ago","$320.000","Pendiente"],["OC-201","Pastelería Maule","20 ago","$185.000","Pagada"]]} /></div><Button className="mt-5">Nueva orden de compra <Plus className="ml-1 h-4 w-4" /></Button></Card></div>; }

function InventoryView({ products, lowStock }: { products: ReturnType<typeof useDemoState>["products"]; lowStock: number }) { return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-4"><Kpi label="SKUs" value="286" delta="+18 este mes" icon={<Boxes />} /><Kpi label="Unidades" value="4.820" delta="Stock saludable" icon={<Package />} /><Kpi label="Bajo stock" value={String(lowStock)} delta="Reponer" icon={<Activity />} /><Kpi label="Valor inventario" value="$18,4 M" delta="+3,2%" icon={<CircleDollarSign />} /></div><Card className="p-5"><SectionTitle icon={<Boxes />} title="Inventario" subtitle="Stock, reposición, movimientos y trazabilidad" /><div className="mt-5 space-y-2">{products.map((p) => <div key={p.id} className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"><div className="flex-1"><div className="font-medium">{p.name}</div><div className="text-xs text-muted-foreground">{p.category} · Reposición en {p.reorderAt} unidades</div></div><div className="text-sm"><span className={p.stock <= p.reorderAt ? "font-semibold text-destructive" : "font-medium"}>{p.stock} unidades</span></div><Badge variant={p.stock <= p.reorderAt ? "destructive" : "secondary"}>{p.stock <= p.reorderAt ? "Reponer" : "Saludable"}</Badge><Button variant="outline" size="sm">Ver movimientos</Button></div>)}</div></Card></div>; }

function ShipmentsView() { return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-4"><Kpi label="En tránsito" value="14" delta="3 hoy" icon={<Truck />} /><Kpi label="Entregados" value="126" delta="94,2%" icon={<CheckCircle2 />} /><Kpi label="Por preparar" value="8" delta="Prioridad alta" icon={<Package />} /><Kpi label="Tiempo promedio" value="1,8 días" delta="-0,3 días" icon={<Activity />} /></div><Card className="p-5"><SectionTitle icon={<Truck />} title="Envíos & Entregas" subtitle="Desde el pedido hasta la entrega y el registro del cliente" /><div className="mt-5 overflow-x-auto"><DataTable headers={["Envío", "Cliente", "Destino", "Estado", "Transportista"]} rows={[["ENV-302","Constructora Maule","Talca","En tránsito","Chilexpress"],["ENV-301","Café Central","Curicó","Preparando","Starken"],["ENV-300","Hotel Valle","Linares","Entregado","Blue Express"],["ENV-299","Pedro Rojas","Talca","Entregado","Chilexpress"]]} /></div><div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm"><strong>Valor diferencial:</strong> los datos de despacho pueden reutilizar el contexto que ya existe en CRM, evitando volver a pedir dirección, contacto y referencias al cliente.</div></Card></div>; }

function FinanceView({ revenue }: { revenue: number }) { return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-4"><Kpi label="Ingresos" value={money(revenue)} delta="+18,4%" icon={<CircleDollarSign />} /><Kpi label="Gastos" value="$7,82 M" delta="+4,1%" icon={<ArrowDownToLine />} /><Kpi label="Resultado" value="$3,46 M" delta="Margen 31,8%" icon={<BarChart3 />} /><Kpi label="Caja" value="$5,12 M" delta="+8,6%" icon={<CreditCard />} /></div><div className="grid gap-6 lg:grid-cols-2"><Card className="p-5"><SectionTitle icon={<BarChart3 />} title="Estado financiero" subtitle="Vista ejecutiva conectada a operación" /><MiniChart /><div className="mt-5 grid grid-cols-2 gap-3"><Stat label="Cuentas por cobrar" value="$1,24 M" /><Stat label="Cuentas por pagar" value="$0,88 M" /><Stat label="IVA débito" value="$0,94 M" /><Stat label="IVA crédito" value="$0,61 M" /></div></Card><Card className="p-5"><SectionTitle icon={<Sparkles />} title="Control financiero inteligente" subtitle="Señales que ayudan a decidir" /><div className="mt-4 space-y-3"><Signal title="Liquidez" text="La caja proyectada mantiene cobertura positiva para el próximo ciclo." type="good" /><Signal title="Cobranza" text="3 clientes concentran una parte relevante de las cuentas por cobrar." type="warn" /><Signal title="Margen" text="El margen mejoró respecto del período anterior." type="info" /></div></Card></div></div>; }

function AnalyticsView({ revenue }: { revenue: number }) { return <div className="space-y-6"><div className="grid gap-4 md:grid-cols-4"><Kpi label="Ingresos" value={money(revenue)} delta="+18,4%" icon={<CircleDollarSign />} /><Kpi label="Crecimiento" value="18,4%" delta="vs. período anterior" icon={<BarChart3 />} /><Kpi label="Margen" value="31,8%" delta="+2,6 pts" icon={<Activity />} /><Kpi label="Nüva Score" value="87" delta="+6 pts" icon={<Sparkles />} /></div><Card className="p-5"><SectionTitle icon={<BarChart3 />} title="Indicadores del negocio" subtitle="Convierte operación en una vista para decidir" /><div className="mt-6 grid gap-4 md:grid-cols-2"><InsightPanel title="Ventas" score="92" text="Buen crecimiento y recurrencia." /><InsightPanel title="Finanzas" score="84" text="Margen sano; vigilar cuentas por cobrar." /><InsightPanel title="Inventario" score="79" text="Algunas categorías requieren reposición." /><InsightPanel title="Clientes" score="88" text="Buena recurrencia y valor de cartera." /></div></Card></div>; }

function QuotesView({ order, onCreate }: { order: number; onCreate: () => void }) { return <div className="space-y-6"><Card className="p-5"><SectionTitle icon={<FileText />} title="Cotizaciones" subtitle="Cotiza, realiza seguimiento y convierte oportunidades en ventas" /><div className="mt-5 grid gap-3 sm:grid-cols-3"><Stat label="Enviadas" value="28" /><Stat label="Pendientes" value="9" /><Stat label="Conversión" value="38%" /></div><div className="mt-6 overflow-x-auto"><DataTable headers={["Código", "Cliente", "Monto", "Vencimiento", "Estado"]} rows={[["COT-182","Constructora Maule","$540.000","28 ago","Enviada"],["COT-181","Hotel Valle","$1.240.000","27 ago","Seguimiento"],["COT-180","Café Central","$92.300","26 ago","Aceptada"],["COT-179","Pedro Rojas","$45.900","25 ago","Rechazada"]]} /></div><Button className="mt-5" onClick={onCreate}><Plus className="mr-1 h-4 w-4" />Crear cotización {order ? `(${order})` : ""}</Button></Card></div>; }

function AiView({ question, answer, setQuestion, ask }: { question: string; answer: string; setQuestion: (value: string) => void; ask: () => void }) { return <div className="space-y-6"><Card className="overflow-hidden p-0"><div className="bg-gradient-to-br from-primary/10 via-card to-card p-6"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground"><Sparkles className="h-5 w-5" /></span><div><h2 className="font-semibold">Nüva IA</h2><p className="text-xs text-muted-foreground">Tu negocio como contexto, no como una conversación genérica.</p></div></div><div className="mt-6 grid gap-3 md:grid-cols-3"><ActionCard icon={<Sparkles />} title="Entender" text="Explícame por qué cambió un indicador." /><ActionCard icon={<Activity />} title="Analizar" text="Detecta señales y riesgos del negocio." /><ActionCard icon={<ArrowRight />} title="Decidir" text="Sugiere la siguiente mejor acción." /></div></div><div className="p-6"><label className="text-sm font-medium">Pregunta a Nüva IA</label><div className="mt-2 flex flex-col gap-2 sm:flex-row"><Input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} /><Button onClick={ask}>Preguntar <ArrowRight className="ml-1 h-4 w-4" /></Button></div><div className="mt-4 rounded-2xl border bg-secondary/30 p-5 text-sm leading-relaxed"><div className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">Respuesta de demostración</div>{answer}</div><p className="mt-3 text-xs text-muted-foreground">En el demo, la respuesta está simulada localmente. En la plataforma real, Nüva IA trabaja sobre los datos y permisos de tu negocio.</p></div></Card></div>; }

function CommunityView() { return <div className="space-y-6"><Card className="p-5"><SectionTitle icon={<MessageSquare />} title="Comunidad" subtitle="Comparte experiencias, aprende y descubre buenas prácticas de otras MiPymes" /><div className="mt-5 space-y-3"><CommunityPost title="¿Cómo están controlando el inventario?" replies="18 respuestas" tag="Operación" /><CommunityPost title="Consejos para mejorar margen" replies="11 respuestas" tag="Finanzas" /><CommunityPost title="Automatizaciones que sí valen la pena" replies="24 respuestas" tag="IA" /></div><Button className="mt-5"><Plus className="mr-1 h-4 w-4" />Crear publicación</Button></Card></div>; }

function ShiftsView() { return <div className="space-y-6"><Card className="p-5"><SectionTitle icon={<CalendarClock />} title="Turnos" subtitle="Organiza equipos y horarios con una vista operacional" /><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Lunes","Ana · 08:00–16:00"],["Martes","Pedro · 10:00–18:00"],["Miércoles","Camila · 08:00–16:00"],["Jueves","Luis · 12:00–20:00"]].map(([day, name]) => <div key={day} className="rounded-xl border p-4"><div className="text-xs font-semibold text-primary">{day}</div><div className="mt-2 text-sm font-medium">{name}</div><div className="mt-1 text-xs text-muted-foreground">Turno confirmado</div></div>)}</div></Card></div>; }

function SettingsView() { return <div className="space-y-6"><Card className="p-5"><SectionTitle icon={<Settings />} title="Configuración" subtitle="Así se organiza el espacio de administración de tu negocio" /><div className="mt-5 grid gap-3 md:grid-cols-2"><SettingRow title="Datos del negocio" text="Razón social, RUT, dirección y actividad." /><SettingRow title="Usuarios y permisos" text="Roles, accesos y responsabilidades." /><SettingRow title="Facturación e integraciones" text="SII, pagos, canales y conexiones." /><SettingRow title="Seguridad" text="Sesiones, MFA y controles de acceso." /></div></Card><Card className="p-5"><SectionTitle icon={<LifeBuoy />} title="Ayuda" subtitle="Centro de soporte y documentación" /><Button className="mt-4" variant="outline">Abrir centro de ayuda</Button></Card></div>; }

function Kpi({ label, value, delta, icon }: { label: string; value: string; delta: string; icon: ReactNode }) { return <Card className="p-4"><div className="flex items-center gap-2 text-muted-foreground"><span className="text-primary">{icon}</span><span className="text-xs">{label}</span></div><div className="mt-2 text-2xl font-bold tracking-tight">{value}</div><div className="mt-1 text-xs text-success">{delta}</div></Card>; }
function SectionTitle({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) { return <div className="flex items-start gap-3"><span className="mt-0.5 text-primary">{icon}</span><div><h2 className="font-semibold">{title}</h2><p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p></div></div>; }
function Stat({ label, value }: { label: string; value: string }) { return <div><div className="text-[11px] text-muted-foreground">{label}</div><div className="mt-1 text-sm font-semibold">{value}</div></div>; }
function Signal({ title, text, type }: { title: string; text: string; type: "good" | "warn" | "info" }) { return <div className="rounded-xl border p-3"><div className={`text-xs font-semibold ${type === "good" ? "text-success" : type === "warn" ? "text-destructive" : "text-primary"}`}>{title}</div><p className="mt-1 text-sm text-muted-foreground">{text}</p></div>; }
function MiniChart() { return <div className="mt-5 flex h-44 items-end gap-2 rounded-xl border bg-secondary/20 p-4">{[34,48,42,61,56,72,67,84,76,92,88,96].map((height, i) => <div key={i} className="flex-1 rounded-t-md bg-primary/60" style={{ height: `${height}%` }} title={`Período ${i + 1}`} />)}</div>; }
function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) { return <table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b text-xs text-muted-foreground">{headers.map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i} className="border-b last:border-0">{row.map((cell, j) => <td key={j} className="px-3 py-3">{j === row.length - 1 ? <Badge variant="secondary">{cell}</Badge> : cell}</td>)}</tr>)}</tbody></table>; }
function ActionCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) { return <div className="rounded-xl border p-4"><div className="flex items-center gap-2 text-primary">{icon}<span className="text-sm font-semibold text-foreground">{title}</span></div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{text}</p></div>; }
function InsightPanel({ title, score, text }: { title: string; score: string; text: string }) { return <div className="rounded-xl border p-4"><div className="flex items-center justify-between"><span className="font-medium">{title}</span><span className="text-xl font-bold text-primary">{score}</span></div><div className="mt-2 h-2 rounded-full bg-secondary"><div className="h-2 rounded-full bg-primary" style={{ width: `${score}%` }} /></div><p className="mt-2 text-xs text-muted-foreground">{text}</p></div>; }
function CommunityPost({ title, replies, tag }: { title: string; replies: string; tag: string }) { return <div className="flex items-center gap-4 rounded-xl border p-4"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><MessageSquare className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{title}</div><div className="mt-1 text-xs text-muted-foreground">{replies}</div></div><Badge variant="secondary">{tag}</Badge></div>; }
function SettingRow({ title, text }: { title: string; text: string }) { return <button className="rounded-xl border p-4 text-left transition hover:border-primary hover:bg-primary/5"><div className="font-medium">{title}</div><p className="mt-1 text-xs text-muted-foreground">{text}</p></button>; }
