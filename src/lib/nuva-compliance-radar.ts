export type ComplianceArea = "sii" | "labor" | "privacy";
export type ComplianceStatus = "active" | "upcoming" | "review";

export type ComplianceRule = {
  id: string;
  area: ComplianceArea;
  title: string;
  summary: string;
  effectiveOn: string;
  status: ComplianceStatus;
  source: string;
  sourceLabel: string;
  action: string;
};

/**
 * Product-facing compliance calendar. Dates and summaries are intentionally
 * explicit and source-linked; they must not be treated as legal advice.
 * Update this registry when an authority publishes a new rule or doctrine.
 */
export const CHILE_COMPLIANCE_RULES: ComplianceRule[] = [
  {
    id: "sii-boleta-no-print-timbre-2026",
    area: "sii",
    title: "Representación impresa de boleta electrónica",
    summary: "La Resolución Exenta SII N°207/2025 elimina la obligación de imprimir el timbre electrónico en la representación impresa de la boleta electrónica.",
    effectiveOn: "2026-01-01",
    status: "active",
    source: "https://www.sii.cl/normativa_legislacion/resoluciones/2025/res_207.pdf",
    sourceLabel: "SII — Resolución Exenta N°207",
    action: "Revisar plantillas de impresión y conservar el timbre en el XML cuando corresponda.",
  },
  {
    id: "labor-42-hours-2026",
    area: "labor",
    title: "Jornada ordinaria de 42 horas",
    summary: "Desde el 26 de abril de 2026 el límite ordinario semanal baja a 42 horas; la reducción final a 40 horas opera el 26 de abril de 2028.",
    effectiveOn: "2026-04-26",
    status: "active",
    source: "https://www.dt.gob.cl/portal/1626/w3-propertyname-2556.html",
    sourceLabel: "Dirección del Trabajo — Ley 40 horas",
    action: "Revisar jornadas, contratos, turnos y reglas de asistencia para evitar superar el límite aplicable.",
  },
  {
    id: "privacy-law-21719-2026",
    area: "privacy",
    title: "Nueva Ley de Protección de Datos Personales",
    summary: "La Ley N°21.719 regula el tratamiento y protección de datos personales y crea una Agencia de Protección de Datos Personales; entra en vigencia el 1 de diciembre de 2026.",
    effectiveOn: "2026-12-01",
    status: "upcoming",
    source: "https://www.bcn.cl/leychile/Navegar?idNorma=1209272&idVersion=2026-12-01",
    sourceLabel: "BCN — Ley N°21.719",
    action: "Preparar inventario de tratamientos, derechos de titulares, retención, contratos y controles de privacidad.",
  },
  {
    id: "labor-40-hours-2028",
    area: "labor",
    title: "Jornada ordinaria de 40 horas",
    summary: "La gradualidad de la Ley N°21.561 culmina el 26 de abril de 2028 con un límite de 40 horas semanales.",
    effectiveOn: "2028-04-26",
    status: "upcoming",
    source: "https://www.dt.gob.cl/portal/1626/w3-propertyname-2556.html",
    sourceLabel: "Dirección del Trabajo — Ley 40 horas",
    action: "Planificar turnos y capacidad operativa para la siguiente reducción sin afectar continuidad del negocio.",
  },
];

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());

export function getComplianceStatus(rule: ComplianceRule, now = new Date()): ComplianceStatus {
  return startOfDay(new Date(rule.effectiveOn + "T00:00:00")) <= startOfDay(now) ? "active" : rule.status;
}

export function getComplianceRadar(now = new Date()) {
  return CHILE_COMPLIANCE_RULES
    .map((rule) => ({ ...rule, status: getComplianceStatus(rule, now) }))
    .sort((a, b) => a.effectiveOn.localeCompare(b.effectiveOn));
}

export function getUpcomingCompliance(days = 180, now = new Date()) {
  const today = startOfDay(now).getTime();
  const limit = today + days * 86_400_000;
  return getComplianceRadar(now).filter((rule) => {
    const date = new Date(rule.effectiveOn + "T00:00:00").getTime();
    return date >= today && date <= limit;
  });
}
