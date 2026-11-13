import type { IndustryProfileId } from "@/lib/industry-profiles";

export type IndustryDashboardSource =
  | "sales"
  | "inventory"
  | "cash"
  | "quotes"
  | "customers"
  | "expenses";

export type IndustryDashboardEvidence = Partial<
  Record<IndustryDashboardSource, { available: boolean; records: number; complete?: boolean }>
>;

export type IndustryMetricStatus = "available" | "insufficient_data" | "planned";

export type IndustryMetricDefinition = {
  id: string;
  label: string;
  description: string;
  sources: IndustryDashboardSource[];
  status: IndustryMetricStatus;
  reason: string;
};

type MetricSpec = Omit<IndustryMetricDefinition, "status" | "reason"> & {
  plannedReason?: string;
  completeEvidenceRequired?: boolean;
};

const METRICS: Record<string, MetricSpec> = {
  daily_sales: {
    id: "daily_sales",
    label: "Ventas del período",
    description: "Ventas registradas dentro del período seleccionado.",
    sources: ["sales"],
  },
  average_ticket: {
    id: "average_ticket",
    label: "Ticket promedio",
    description: "Venta promedio por transacción registrada.",
    sources: ["sales"],
  },
  cash_position: {
    id: "cash_position",
    label: "Caja y movimientos",
    description: "Movimientos de caja registrados; no equivale a flujo proyectado.",
    sources: ["cash"],
  },
  expense_control: {
    id: "expense_control",
    label: "Gastos registrados",
    description: "Gastos ingresados en el período; no representa costos completos si faltan registros.",
    sources: ["expenses"],
  },
  stock_health: {
    id: "stock_health",
    label: "Estado del inventario",
    description: "Productos y existencias registradas; no calcula rotación ni valorización incompleta.",
    sources: ["inventory"],
  },
  quote_pipeline: {
    id: "quote_pipeline",
    label: "Cotizaciones",
    description: "Cotizaciones registradas y su estado actual.",
    sources: ["quotes"],
  },
  customer_activity: {
    id: "customer_activity",
    label: "Actividad de clientes",
    description: "Actividad registrada en la cartera de clientes.",
    sources: ["customers"],
  },
  margin_by_product: {
    id: "margin_by_product",
    label: "Margen por producto",
    description: "Requiere costo de adquisición completo y conciliado por producto.",
    sources: ["sales", "inventory"],
    plannedReason: "No se habilita sin cobertura completa y verificable de costos por producto.",
    completeEvidenceRequired: true,
  },
  stockout_risk: {
    id: "stockout_risk",
    label: "Riesgo de quiebre",
    description: "Requiere reglas de reposición y demanda histórica suficiente.",
    sources: ["sales", "inventory"],
    plannedReason: "La alerta sectorial de reposición requiere un motor de demanda y stock de seguridad.",
  },
  expiry_and_waste: {
    id: "expiry_and_waste",
    label: "Vencimientos y merma",
    description: "Seguimiento de lotes, vencimientos y pérdidas.",
    sources: ["inventory"],
    plannedReason: "No existe un ciclo completo de lotes, vencimientos y merma validado de extremo a extremo.",
  },
  sell_through: {
    id: "sell_through",
    label: "Rotación por variante",
    description: "Venta y disponibilidad por talla, color o variante.",
    sources: ["sales", "inventory"],
    plannedReason: "Requiere catálogo de variantes y stock por variante.",
  },
  project_margin: {
    id: "project_margin",
    label: "Margen por obra o proyecto",
    description: "Ingresos y costos imputados a una obra o proyecto.",
    sources: ["sales", "expenses"],
    plannedReason: "Requiere imputación consistente de ingresos, materiales, horas y costos por proyecto.",
  },
  appointment_occupancy: {
    id: "appointment_occupancy",
    label: "Ocupación de agenda",
    description: "Horas reservadas frente a capacidad disponible.",
    sources: [],
    plannedReason: "Requiere agenda, recursos y capacidad horaria persistidos.",
  },
  asset_utilization: {
    id: "asset_utilization",
    label: "Utilización de activos",
    description: "Tiempo arrendado frente al tiempo disponible.",
    sources: [],
    plannedReason: "Requiere inventario de activos y ciclo de arriendo/devolución.",
  },
};

const PROFILE_METRICS: Record<IndustryProfileId, string[]> = {
  hardware_store: ["daily_sales", "cash_position", "stock_health", "quote_pipeline", "margin_by_product", "stockout_risk"],
  neighborhood_grocery: ["daily_sales", "average_ticket", "cash_position", "stock_health", "expiry_and_waste"],
  beverage_store: ["daily_sales", "average_ticket", "stock_health", "expiry_and_waste"],
  produce_market: ["daily_sales", "stock_health", "expiry_and_waste", "margin_by_product"],
  butcher_fishmonger: ["daily_sales", "stock_health", "expiry_and_waste", "margin_by_product"],
  apparel_footwear: ["daily_sales", "average_ticket", "stock_health", "sell_through"],
  books_stationery_electronics: ["daily_sales", "average_ticket", "stock_health"],
  wholesale_distribution: ["daily_sales", "stock_health", "quote_pipeline", "customer_activity", "margin_by_product"],
  restaurant_cafe: ["daily_sales", "average_ticket", "cash_position", "expense_control", "expiry_and_waste"],
  bakery_pastry: ["daily_sales", "average_ticket", "expense_control", "expiry_and_waste"],
  manufacturing_workshop: ["daily_sales", "expense_control", "stock_health", "project_margin"],
  auto_repair_parts: ["daily_sales", "quote_pipeline", "stock_health", "customer_activity"],
  agriculture_agroinputs: ["daily_sales", "stock_health", "expiry_and_waste", "margin_by_product"],
  transport_logistics: ["daily_sales", "expense_control", "project_margin"],
  construction_contractor: ["daily_sales", "expense_control", "quote_pipeline", "project_margin"],
  professional_services: ["daily_sales", "expense_control", "quote_pipeline", "customer_activity", "project_margin"],
  beauty_wellness: ["daily_sales", "average_ticket", "cash_position", "customer_activity", "appointment_occupancy"],
  veterinary_pet: ["daily_sales", "average_ticket", "stock_health", "customer_activity", "expiry_and_waste"],
  lodging_tourism: ["daily_sales", "average_ticket", "expense_control", "appointment_occupancy"],
  equipment_rental: ["daily_sales", "expense_control", "asset_utilization"],
  education_fitness: ["daily_sales", "cash_position", "customer_activity", "appointment_occupancy"],
  field_technical_service: ["daily_sales", "expense_control", "quote_pipeline", "customer_activity"],
  general_business: ["daily_sales", "average_ticket", "cash_position", "expense_control", "stock_health", "customer_activity"],
};

/**
 * Produces a truthful, sector-aware Resumen metric manifest.
 * It never calculates KPI values or treats a profile's aspirations as live features.
 */
export function buildIndustryDashboardMetrics(
  profileId: IndustryProfileId,
  evidence: IndustryDashboardEvidence,
): IndustryMetricDefinition[] {
  return PROFILE_METRICS[profileId].map((metricId) => {
    const spec = METRICS[metricId];
    if (spec.plannedReason && !spec.completeEvidenceRequired) {
      return { ...spec, status: "planned", reason: spec.plannedReason };
    }
    if (spec.completeEvidenceRequired) {
      const completeEvidence = spec.sources.length > 0 && spec.sources.every((source) => {
        const item = evidence[source];
        return item?.available === true && item.complete === true;
      });
      if (!completeEvidence) {
        return { ...spec, status: "planned", reason: spec.plannedReason ?? "La cobertura de datos está incompleta." };
      }
    }
    if (spec.sources.length === 0) {
      return {
        ...spec,
        status: "planned",
        reason: spec.plannedReason ?? "La fuente de datos necesaria todavía no está disponible.",
      };
    }
    const missing = spec.sources.filter((source) => {
      const item = evidence[source];
      return !item?.available || item.records <= 0;
    });
    if (missing.length > 0) {
      return {
        ...spec,
        status: "insufficient_data",
        reason: "Falta evidencia operativa en: " + missing.join(", ") + ".",
      };
    }
    return {
      ...spec,
      status: "available",
      reason: "Fuentes operativas presentes; mostrar el valor calculado por el módulo de origen.",
    };
  });
}
