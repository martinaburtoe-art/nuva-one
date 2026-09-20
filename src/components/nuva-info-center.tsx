import { useEffect, useMemo, useRef, useState } from "react";
import { Info, X } from "lucide-react";
import { useLocation } from "@tanstack/react-router";

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
  "/foro": {
    title: "Comunidad",
    description:
      "Espacio para compartir experiencias, preguntas y aprendizajes relacionados con la gestión de negocios.",
    tips: ["Comparte información útil y evita publicar datos privados."],
  },
  "/shifts": {
    title: "Turnos",
    description:
      "Organiza turnos y horarios de trabajo cuando tu operación necesita coordinación de personas.",
    tips: ["Mantén horarios actualizados.", "Revisa cambios antes de comenzar una jornada."],
  },
  "/settings": {
    title: "Configuración",
    description: "Personaliza tu negocio, preferencias y opciones de Nüva One desde un solo lugar.",
    tips: ["Revisa la configuración del negocio activo.", "No compartas credenciales de acceso."],
  },
  "/owner": {
    title: "Nüva Owner · Command Center",
    description:
      "Consola privada para administrar la plataforma, accesos especiales, cuentas de cortesía y controles operativos.",
    tips: [
      "Los accesos otorgados desde aquí deben reservarse para personas autorizadas.",
      "Los grants de cortesía no sustituyen los controles de seguridad del sistema.",
    ],
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
  const info = useMemo(() => ({ ...(INFO[location.pathname] ?? FALLBACK), ...(DETAILS[location.pathname] ?? { purpose: "Consulta el propósito de esta sección dentro de la operación.", capabilities: ["Revisar las funciones disponibles"], data: "Información del negocio activo a la que tu cuenta tiene acceso.", outcome: "Una visión más clara de cómo utilizar este espacio." }) }), [location.pathname]);

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
        className={inline ? "inline-flex h-9 items-center gap-2 rounded-lg border border-border/70 bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 print:hidden" : "hidden print:hidden"}
      >
        <Info className="h-4 w-4" aria-hidden="true" />
        {inline && <span>Información del módulo</span>}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[90] print:hidden flex items-end justify-center bg-black/30 p-4 backdrop-blur-[2px] sm:items-center"
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
            className="relative w-full max-w-md rounded-2xl border bg-background p-5 shadow-2xl"
          >
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
            <div className="mb-4 flex items-start gap-3 pr-8">
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
          </section>
        </div>
      )}
    </>
  );
}
