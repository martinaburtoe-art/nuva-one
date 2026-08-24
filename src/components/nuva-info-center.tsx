import { useEffect, useMemo, useRef, useState } from "react";
import { Info, X } from "lucide-react";
import { useLocation } from "@tanstack/react-router";

const INFO: Record<string, { title: string; description: string; tips: string[] }> = {
  "/dashboard": { title: "Resumen", description: "Tu centro de control: reúne los indicadores más importantes de tu negocio para que sepas qué está pasando sin revisar cada módulo por separado.", tips: ["Revisa ventas, caja y rendimiento general.", "Usa los indicadores como punto de partida para tomar decisiones."] },
  "/pos": { title: "Caja", description: "Registra ventas y operaciones de caja de forma rápida. Puedes buscar productos y utilizar el escáner para identificar SKU o códigos de barras.", tips: ["Comprueba los productos antes de cobrar.", "Los movimientos quedan asociados al negocio activo."] },
  "/sales": { title: "Ventas", description: "Consulta y analiza tus ventas para entender ingresos, productos vendidos y evolución comercial.", tips: ["Filtra por fechas para comparar períodos.", "Usa los datos para detectar tendencias."] },
  "/customers": { title: "Clientes", description: "Centraliza la información de tus clientes y su actividad para mejorar seguimiento, servicio y oportunidades comerciales.", tips: ["Mantén datos de contacto actualizados.", "Revisa el historial antes de contactar a un cliente."] },
  "/billing": { title: "Facturación SII", description: "Gestiona la información relacionada con documentos tributarios y facturación electrónica de tu negocio.", tips: ["Verifica los datos tributarios antes de emitir.", "Revisa siempre el estado de cada documento."] },
  "/purchases": { title: "Compras", description: "Organiza tus compras y proveedores para controlar costos, reposición y abastecimiento.", tips: ["Registra costos reales para mejorar tus análisis.", "Relaciona compras con inventario cuando corresponda."] },
  "/inventory": { title: "Inventario", description: "Controla productos, SKU, códigos, existencias y movimientos para saber qué tienes disponible y qué necesitas reponer.", tips: ["Mantén SKU y códigos consistentes.", "Revisa productos con stock bajo antes de comprar."] },
  "/shipments": { title: "Envíos & Entregas", description: "Haz seguimiento de pedidos y entregas para mantener control operativo desde la venta hasta la recepción.", tips: ["Actualiza estados para mantener trazabilidad.", "Usa la información para detectar retrasos."] },
  "/finance": { title: "Finanzas", description: "Visualiza ingresos, egresos, flujo de caja y métricas financieras para entender la salud económica del negocio.", tips: ["No confundas ventas con utilidad.", "Revisa el flujo de caja antes de asumir nuevos compromisos."] },
  "/analytics": { title: "Indicadores", description: "Convierte los datos de tu negocio en métricas para detectar tendencias, oportunidades y problemas.", tips: ["Compara períodos equivalentes.", "Busca cambios relevantes antes de tomar decisiones."] },
  "/quotes": { title: "Cotizaciones", description: "Crea y administra propuestas comerciales para ordenar oportunidades y hacer seguimiento a potenciales ventas.", tips: ["Mantén precios y condiciones actualizados.", "Haz seguimiento de cotizaciones pendientes."] },
  "/ai": { title: "Nüva Intelligence", description: "Tu asistente empresarial con contexto de tu negocio. Puede ayudarte a interpretar datos, detectar oportunidades y convertir información en acciones.", tips: ["Haz preguntas concretas sobre tu negocio.", "Puedes pedir explicaciones, análisis, recomendaciones y próximos pasos."] },
  "/foro": { title: "Comunidad", description: "Espacio para compartir experiencias, preguntas y aprendizajes relacionados con la gestión de negocios.", tips: ["Comparte información útil y evita publicar datos privados."] },
  "/shifts": { title: "Turnos", description: "Organiza turnos y horarios de trabajo cuando tu operación necesita coordinación de personas.", tips: ["Mantén horarios actualizados.", "Revisa cambios antes de comenzar una jornada."] },
  "/settings": { title: "Configuración", description: "Personaliza tu negocio, preferencias y opciones de Nüva One desde un solo lugar.", tips: ["Revisa la configuración del negocio activo.", "No compartas credenciales de acceso."] },
  "/owner": { title: "Nüva Owner · Command Center", description: "Consola privada para administrar la plataforma, accesos especiales, cuentas de cortesía y controles operativos.", tips: ["Los accesos otorgados desde aquí deben reservarse para personas autorizadas.", "Los grants de cortesía no sustituyen los controles de seguridad del sistema."] },
};

const FALLBACK = { title: "Nüva One", description: "Aquí encontrarás información contextual sobre la sección que estás utilizando y para qué sirve cada parte.", tips: ["Si tienes dudas, abre este botón para conocer el propósito de la sección."] };

export function NuvaInfoCenter() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const info = useMemo(() => INFO[location.pathname] ?? FALLBACK, [location.pathname]);

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
        aria-label={`Información sobre ${info.title}`}
        title={`¿Qué es ${info.title}?`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-[80] flex h-11 w-11 items-center justify-center rounded-full border border-primary/20 bg-background/95 text-primary shadow-lg backdrop-blur transition-all hover:scale-105 hover:bg-primary hover:text-primary-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
      >
        <Info className="h-5 w-5" aria-hidden="true" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-black/30 p-4 backdrop-blur-[2px] sm:items-center"
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
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-hidden="true">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-primary">Información Nüva</p>
                <h2 id="nuva-info-title" className="text-lg font-semibold">{info.title}</h2>
              </div>
            </div>
            <p id="nuva-info-description" className="text-sm leading-6 text-muted-foreground">{info.description}</p>
            <div className="mt-4 rounded-xl bg-muted/50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-foreground">Cómo aprovecharlo</p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {info.tips.map((tip) => (
                  <li key={tip} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    {tip}
                  </li>
                ))}
              </ul>
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
