import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Info, X } from "lucide-react";
import { useLocation } from "@tanstack/react-router";

const MODULE_LABELS: Record<string, string> = {
  "/dashboard": "Resumen",
  "/pos": "Caja",
  "/sales": "Ventas",
  "/customers": "Clientes",
  "/billing": "Facturación SII",
  "/purchases": "Compras",
  "/inventory": "Inventario",
  "/shipments": "Envíos & Entregas",
  "/finance": "Finanzas",
  "/analytics": "Indicadores",
  "/quotes": "Cotizaciones",
  "/pricing-calculator": "Calculadora de precios",
  "/nuva-intelligence": "Nüva Intelligence",
  "/executive-command-center": "Centro Ejecutivo",
  "/ai": "Asistente IA",
  "/studio": "Nüva Studio",
  "/shifts": "Turnos",
  "/automations": "Automatizaciones",
  "/catalog": "Catálogo",
  "/conexiones": "Conexiones",
  "/business-health": "Salud del negocio",
  "/caja-control": "Control de caja",
  "/customer-action-center": "Centro de acciones de clientes",
  "/customer-intelligence": "Inteligencia de clientes",
  "/customers-intelligence": "Inteligencia de clientes",
  "/finance-accounting": "Finanzas y contabilidad",
  "/finance-professional": "Finanzas profesional",
  "/financial-control": "Control financiero",
  "/financial-dashboard": "Panel financiero",
  "/financial-integrity": "Integridad financiera",
  "/inventario-conteo": "Conteo de inventario",
  "/inventario-operaciones": "Operaciones de inventario",
  "/mobile-scanner": "Escáner móvil",
};

export const MODULE_INFO_PATHS: ReadonlySet<string> = new Set<string>([
  "/dashboard","/pos","/sales","/customers","/billing","/purchases","/inventory","/shipments",
  "/finance","/analytics","/quotes","/pricing-calculator","/nuva-intelligence",
  "/executive-command-center","/ai","/studio","/shifts","/automations","/catalog","/conexiones",
  "/business-health","/caja-control","/customer-action-center","/customer-intelligence",
  "/customers-intelligence","/finance-accounting","/finance-professional","/financial-control",
  "/financial-dashboard","/financial-integrity","/inventario-conteo","/inventario-operaciones",
  "/mobile-scanner",
] as const);

const INFO: Record<string, { title: string; description: string; tips: string[] }> = {
  "/dashboard": {
    title: "Resumen",
    description:
      "Tu centro de control: reúne los indicadores más importantes de tu negocio para que sepas qué está pasando sin revisar cada módulo por separado.",
    tips: [
      "Revisa ventas, caja y rendimiento general.",
      "Usa los indicadores como punto de partida para tomar decisiones.",
    ],
  },
  "/pos": {
    title: "Caja",
    description:
      "Registra ventas y operaciones de caja de forma rápida. Puedes buscar productos y utilizar el escáner para identificar SKU o códigos de barras.",
    tips: [
      "Comprueba los productos antes de cobrar.",
      "Los movimientos quedan asociados al negocio activo.",
    ],
  },
  "/sales": {
    title: "Ventas",
    description:
      "Consulta y analiza tus ventas para entender ingresos, productos vendidos y evolución comercial.",
    tips: ["Filtra por fechas para comparar períodos.", "Usa los datos para detectar tendencias."],
  },
  "/customers": {
    title: "Clientes",
    description:
      "Centraliza la información de tus clientes y su actividad para mejorar seguimiento, servicio y oportunidades comerciales.",
    tips: [
      "Mantén datos de contacto actualizados.",
      "Revisa el historial antes de contactar a un cliente.",
    ],
  },
  "/billing": {
    title: "Facturación SII",
    description:
      "Gestiona la información relacionada con documentos tributarios y facturación electrónica de tu negocio.",
    tips: [
      "Verifica los datos tributarios antes de emitir.",
      "Revisa siempre el estado de cada documento.",
    ],
  },
  "/purchases": {
    title: "Compras",
    description:
      "Organiza tus compras y proveedores para controlar costos, reposición y abastecimiento.",
    tips: [
      "Registra costos reales para mejorar tus análisis.",
      "Relaciona compras con inventario cuando corresponda.",
    ],
  },
  "/inventory": {
    title: "Inventario",
    description:
      "Controla productos, SKU, códigos, existencias y movimientos para saber qué tienes disponible y qué necesitas reponer.",
    tips: [
      "Mantén SKU y códigos consistentes.",
      "Revisa productos con stock bajo antes de comprar.",
    ],
  },
  "/shipments": {
    title: "Envíos & Entregas",
    description:
      "Haz seguimiento de pedidos y entregas para mantener control operativo desde la venta hasta la recepción.",
    tips: [
      "Actualiza estados para mantener trazabilidad.",
      "Usa la información para detectar retrasos.",
    ],
  },
  "/finance": {
    title: "Finanzas",
    description:
      "Visualiza ingresos, egresos, flujo de caja y métricas financieras para entender la salud económica del negocio.",
    tips: [
      "No confundas ventas con utilidad.",
      "Revisa el flujo de caja antes de asumir nuevos compromisos.",
    ],
  },
  "/analytics": {
    title: "Indicadores",
    description:
      "Convierte los datos de tu negocio en métricas para detectar tendencias, oportunidades y problemas.",
    tips: ["Compara períodos equivalentes.", "Busca cambios relevantes antes de tomar decisiones."],
  },
  "/quotes": {
    title: "Cotizaciones",
    description:
      "Crea y administra propuestas comerciales para ordenar oportunidades y hacer seguimiento a potenciales ventas.",
    tips: [
      "Mantén precios y condiciones actualizados.",
      "Haz seguimiento de cotizaciones pendientes.",
    ],
  },
  "/ai": {
    title: "Nüva Intelligence",
    description:
      "Tu asistente empresarial con contexto de tu negocio. Puede ayudarte a interpretar datos, detectar oportunidades y convertir información en acciones.",
    tips: [
      "Haz preguntas concretas sobre tu negocio.",
      "Puedes pedir explicaciones, análisis, recomendaciones y próximos pasos.",
    ],
  },
  "/shifts": {
    title: "Turnos",
    description:
      "Organiza turnos y horarios de trabajo cuando tu operación necesita coordinación de personas.",
    tips: ["Mantén horarios actualizados.", "Revisa cambios antes de comenzar una jornada."],
  },
};

type ModuleDetails = {
  purpose: string;
  capabilities: string[];
  data: string;
  outcome: string;
};

const DETAILS: Record<string, ModuleDetails> = {
  "/dashboard": { purpose: "Supervisar el estado general del negocio y decidir qué revisar primero.", capabilities: ["Ver indicadores clave", "Detectar variaciones", "Entrar al módulo de origen"], data: "Ventas, compras, caja, inventario y actividad reciente autorizada.", outcome: "Una lectura ejecutiva y contextual de la operación." },
  "/pos": { purpose: "Registrar ventas y movimientos de caja con rapidez.", capabilities: ["Buscar productos", "Cobrar y registrar medios de pago", "Consultar stock durante la venta"], data: "Productos, precios, stock, clientes y operaciones de caja.", outcome: "Ventas registradas y conectadas con stock, caja y reportes." },
  "/sales": { purpose: "Analizar el desempeño comercial y la trazabilidad de las ventas.", capabilities: ["Filtrar períodos", "Revisar operaciones", "Analizar productos y clientes"], data: "Ventas, productos, cantidades, precios, descuentos y clientes.", outcome: "Control del rendimiento comercial y de su evolución." },
  "/customers": { purpose: "Centralizar la relación e historial de clientes.", capabilities: ["Gestionar fichas", "Consultar actividad", "Dar seguimiento"], data: "Datos de contacto e interacciones comerciales autorizadas.", outcome: "Información ordenada para atención y seguimiento." },
  "/billing": { purpose: "Controlar documentos tributarios y su estado.", capabilities: ["Revisar documentos", "Validar datos", "Seguir estados"], data: "Datos tributarios, clientes, montos y documentos electrónicos.", outcome: "Mayor trazabilidad del ciclo de facturación." },
  "/purchases": { purpose: "Gestionar abastecimiento, proveedores y costos.", capabilities: ["Registrar compras", "Controlar proveedores", "Relacionar compras con inventario"], data: "Proveedores, productos, cantidades, costos y fechas.", outcome: "Abastecimiento trazable y mejor información de costos." },
  "/inventory": { purpose: "Mantener control de productos, existencias y movimientos.", capabilities: ["Gestionar catálogo", "Consultar stock", "Realizar conteos y ajustes"], data: "Productos, SKU, códigos, existencias, movimientos y costos.", outcome: "Una fuente confiable para ventas, compras y reposición." },
  "/shipments": { purpose: "Seguir pedidos desde el despacho hasta la entrega.", capabilities: ["Crear envíos", "Actualizar estados", "Detectar pendientes"], data: "Pedidos, clientes, direcciones, transportistas y estados.", outcome: "Trazabilidad logística y visibilidad de entregas." },
  "/finance": { purpose: "Entender ingresos, egresos, liquidez y flujo de caja.", capabilities: ["Revisar movimientos", "Analizar flujo", "Detectar variaciones"], data: "Ventas, compras, gastos, caja y movimientos financieros.", outcome: "Una lectura financiera para planificar compromisos." },
  "/analytics": { purpose: "Convertir datos operacionales en indicadores comparables.", capabilities: ["Comparar períodos", "Analizar métricas", "Investigar variaciones"], data: "Datos consolidados de las áreas habilitadas.", outcome: "Métricas para encontrar tendencias y señales." },
  "/quotes": { purpose: "Gestionar oportunidades antes de convertirlas en ventas.", capabilities: ["Crear cotizaciones", "Definir condiciones", "Dar seguimiento y convertir"], data: "Clientes, productos, precios, descuentos y estados.", outcome: "Un flujo comercial previo a la venta más ordenado." },
  "/pricing-calculator": { purpose: "Evaluar precios y márgenes antes de aplicarlos.", capabilities: ["Calcular precios", "Explorar márgenes", "Comparar escenarios"], data: "Costos y parámetros del producto o escenario.", outcome: "Una referencia cuantitativa para decisiones de precio." },
  "/nuva-intelligence": { purpose: "Interpretar información del negocio y convertirla en contexto.", capabilities: ["Consultar señales", "Relacionar áreas", "Explorar próximos pasos"], data: "Información autorizada del negocio activo.", outcome: "Contexto para entender qué está pasando." },
  "/executive-command-center": { purpose: "Priorizar asuntos relevantes para la gestión ejecutiva.", capabilities: ["Revisar prioridades", "Consultar señales", "Abrir acciones relacionadas"], data: "Indicadores y eventos consolidados.", outcome: "Una agenda ejecutiva basada en señales operacionales." },
  "/ai": { purpose: "Consultar y explicar información del negocio mediante lenguaje natural.", capabilities: ["Hacer preguntas", "Pedir explicaciones", "Solicitar análisis"], data: "Contexto y datos autorizados para tu usuario.", outcome: "Respuestas contextualizadas para apoyar la operación." },
  "/studio": { purpose: "Crear y gestionar flujos, automatizaciones y trabajos asistidos.", capabilities: ["Crear flujos", "Gestionar trabajos", "Revisar resultados"], data: "Configuraciones, entradas y resultados de Studio.", outcome: "Procesos repetibles y trazables." },
  "/shifts": { purpose: "Planificar jornadas y coordinación de personas.", capabilities: ["Crear turnos", "Consultar horarios", "Gestionar cambios"], data: "Personas, jornadas y asignaciones autorizadas.", outcome: "Mayor claridad sobre la planificación operativa." },
  "/automations": { purpose: "Diseñar procesos repetibles para reducir tareas manuales.", capabilities: ["Crear automatizaciones", "Definir condiciones y acciones", "Revisar ejecuciones"], data: "Flujos, reglas, eventos y resultados autorizados.", outcome: "Procesos más consistentes y menos trabajo repetitivo." },
  "/catalog": { purpose: "Administrar el catálogo comercial que alimenta ventas e inventario.", capabilities: ["Gestionar productos", "Definir precios y atributos", "Mantener información comercial"], data: "Productos, categorías, precios, SKU y atributos.", outcome: "Un catálogo coherente para toda la operación." },
  "/conexiones": { purpose: "Gestionar conexiones e integraciones con servicios externos.", capabilities: ["Consultar conexiones", "Configurar integraciones disponibles", "Revisar estados"], data: "Configuraciones y estados de integraciones autorizadas.", outcome: "Mayor continuidad entre Nüva One y tus herramientas." },
  "/business-health": { purpose: "Obtener una lectura transversal del estado del negocio.", capabilities: ["Revisar señales", "Detectar áreas que requieren atención", "Profundizar en el origen"], data: "Indicadores consolidados de operación, finanzas y clientes.", outcome: "Contexto para investigar riesgos y oportunidades." },
  "/caja-control": { purpose: "Controlar y cuadrar los movimientos de caja.", capabilities: ["Revisar movimientos", "Comparar entradas y salidas", "Detectar diferencias"], data: "Aperturas, cierres, ventas, pagos y movimientos de caja.", outcome: "Trazabilidad de caja y apoyo al cierre diario." },
  "/customer-action-center": { purpose: "Priorizar acciones relacionadas con clientes.", capabilities: ["Revisar pendientes", "Identificar seguimientos", "Acceder al contexto del cliente"], data: "Clientes, actividad, oportunidades y tareas autorizadas.", outcome: "Una cola de acciones comerciales más clara." },
  "/customer-intelligence": { purpose: "Analizar patrones y señales de comportamiento de clientes.", capabilities: ["Segmentar", "Revisar señales", "Explorar oportunidades"], data: "Actividad comercial y atributos autorizados de clientes.", outcome: "Mayor contexto para decisiones de relación comercial." },
  "/customers-intelligence": { purpose: "Profundizar en inteligencia y análisis de la cartera de clientes.", capabilities: ["Comparar segmentos", "Analizar actividad", "Detectar cambios"], data: "Clientes, ventas, actividad e indicadores relacionados.", outcome: "Una visión más completa de la cartera." },
  "/finance-accounting": { purpose: "Organizar información financiera y contable para su revisión.", capabilities: ["Consultar movimientos", "Revisar categorías", "Preparar información para análisis"], data: "Ingresos, egresos, cuentas y registros disponibles.", outcome: "Mayor orden y trazabilidad financiera." },
  "/finance-professional": { purpose: "Trabajar con herramientas financieras de mayor profundidad.", capabilities: ["Analizar escenarios", "Revisar métricas", "Profundizar en movimientos"], data: "Información financiera autorizada y consolidada.", outcome: "Una lectura financiera más detallada." },
  "/financial-control": { purpose: "Controlar consistencia y disciplina financiera.", capabilities: ["Revisar desviaciones", "Detectar inconsistencias", "Consultar movimientos de origen"], data: "Movimientos, categorías, presupuestos y registros relacionados.", outcome: "Mayor control sobre la calidad de la información financiera." },
  "/financial-dashboard": { purpose: "Visualizar el estado financiero mediante indicadores.", capabilities: ["Consultar KPIs", "Comparar períodos", "Profundizar en variaciones"], data: "Ingresos, egresos, caja y métricas financieras.", outcome: "Una lectura rápida del desempeño financiero." },
  "/financial-integrity": { purpose: "Revisar la consistencia e integridad de la información financiera.", capabilities: ["Detectar anomalías", "Revisar conciliaciones", "Seguir incidencias"], data: "Registros financieros y controles disponibles.", outcome: "Mayor confianza en la información utilizada para gestionar." },
  "/inventario-conteo": { purpose: "Realizar conteos físicos y contrastarlos con el inventario registrado.", capabilities: ["Crear conteos", "Registrar cantidades", "Revisar diferencias"], data: "Productos, ubicaciones, existencias y conteos.", outcome: "Diferencias de inventario identificables y trazables." },
  "/inventario-operaciones": { purpose: "Gestionar movimientos operacionales de inventario.", capabilities: ["Registrar movimientos", "Consultar historial", "Revisar ajustes"], data: "Productos, movimientos, cantidades, costos y ubicaciones.", outcome: "Trazabilidad de entradas, salidas y ajustes." },
  "/mobile-scanner": { purpose: "Capturar códigos desde dispositivos móviles para acelerar tareas operativas.", capabilities: ["Escanear códigos", "Buscar productos", "Apoyar conteos y operaciones"], data: "Códigos, SKU y productos autorizados.", outcome: "Menos digitación manual y mayor velocidad operativa." },
};

const FALLBACK = {
  title: "Nüva One",
  description:
    "Aquí encontrarás información contextual sobre la sección que estás utilizando y para qué sirve cada parte.",
  tips: ["Si tienes dudas, abre este botón para conocer el propósito de la sección."],
};

export function NuvaInfoCenter({ inline = false }: { inline?: boolean }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const isModuleInfoRoute = inline && MODULE_INFO_PATHS.has(location.pathname);
  const info = useMemo(() => {
    const path = location.pathname;
    const base = INFO[path] ?? { ...FALLBACK, title: MODULE_LABELS[path] ?? FALLBACK.title };
    const details = DETAILS[path] ?? {
      purpose: "Consulta el propósito de esta sección dentro de la operación.",
      capabilities: ["Revisar las funciones disponibles"],
      data: "Información del negocio activo a la que tu cuenta tiene acceso.",
      outcome: "Una visión más clara de cómo utilizar este espacio.",
    };
    return { ...base, ...details };
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) triggerRef.current?.focus();
  }, [open]);

  if (!isModuleInfoRoute) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={"Información sobre " + info.title}
        title={"Información sobre " + info.title}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-border/70 bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 print:hidden"
      >
        <Info className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Información del módulo</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[90] print:hidden bg-black/20 backdrop-blur-[1px]"
          role="presentation"
        >
          <button
            type="button"
            aria-label="Cerrar información"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="nuva-info-title"
            aria-describedby="nuva-info-description"
            className="absolute right-3 top-[4.25rem] flex max-h-[calc(100vh-5.25rem)] w-[calc(100vw-1.5rem)] max-w-2xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl sm:right-6 sm:w-[min(42rem,calc(100vw-3rem))]"
          >
            <div className="shrink-0 border-b bg-background/95 px-5 py-4 backdrop-blur">
            <button
              ref={closeRef}
              type="button"
              aria-label="Cerrar información"
              title="Cerrar"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
              <div className="flex items-start gap-3 pr-8">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                aria-hidden="true"
              >
                <Info className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-primary">
                  Información Nüva
                </p>
                <h2 id="nuva-info-title" className="text-lg font-semibold">
                  {info.title}
                </h2>
              </div>
              </div>
            </div>
            <div className="min-h-0 overflow-y-auto px-5 py-4 overscroll-contain">
            <p id="nuva-info-description" className="text-sm leading-6 text-muted-foreground">{info.description}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <InfoSection title="Para qué sirve"><p>{info.purpose}</p></InfoSection>
              <InfoSection title="Qué puedes hacer"><ul className="space-y-1.5">{info.capabilities.map((item) => <li key={item} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{item}</li>)}</ul></InfoSection>
              <InfoSection title="Qué información utiliza"><p>{info.data}</p></InfoSection>
              <InfoSection title="Qué obtienes"><p>{info.outcome}</p></InfoSection>
            </div>
            <div className="mt-3 rounded-xl border border-primary/15 bg-primary/5 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">Buenas prácticas</p>
              <ul className="space-y-2 text-sm text-muted-foreground">{info.tips.map((tip) => <li key={tip} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{tip}</li>)}</ul>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              Entendido
            </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}


function InfoSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 text-sm leading-5 text-muted-foreground">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-foreground/75">{title}</p>
      {children}
    </div>
  );
}
