export type RegulatoryArea = "sii" | "labor" | "privacy" | "consumer" | "security";
export type RegulatoryStatus = "active" | "upcoming" | "review";
export type RegulatorySeverity = "critical" | "high" | "medium" | "low";

export type RegulatoryRule = {
  id: string;
  area: RegulatoryArea;
  title: string;
  authority: string;
  effectiveFrom: string;
  status: RegulatoryStatus;
  severity: RegulatorySeverity;
  summary: string;
  requiredCapabilities: string[];
  source: string;
};

export const NUVA_CHILE_REGULATORY_RULES: RegulatoryRule[] = [
  {
    id: "sii-electronic-invoicing-market",
    area: "sii",
    title: "Facturación electrónica de mercado",
    authority: "Servicio de Impuestos Internos",
    effectiveFrom: "2020-01-01",
    status: "active",
    severity: "critical",
    summary: "Un software de mercado debe cumplir las especificaciones y proceso de certificación aplicables antes de operar como solución de facturación electrónica.",
    requiredCapabilities: ["dte", "xml", "folios", "certification", "audit-trail"],
    source: "https://www.sii.cl/factura_electronica/factura_mercado/elegir_sistema_fe.htm",
  },
  {
    id: "sii-electronic-receipts",
    area: "sii",
    title: "Boleta electrónica",
    authority: "Servicio de Impuestos Internos",
    effectiveFrom: "2021-01-01",
    status: "active",
    severity: "critical",
    summary: "La emisión de boletas de ventas y servicios es electrónica y debe operar bajo un único sistema de boletas para el contribuyente.",
    requiredCapabilities: ["boleta", "credit-note", "daily-summary", "folio-control", "delivery"],
    source: "https://www.sii.cl/destacados/boletas_electronicas/index.html",
  },
  {
    id: "labor-42-hours",
    area: "labor",
    title: "Jornada máxima de 42 horas",
    authority: "Dirección del Trabajo",
    effectiveFrom: "2026-04-26",
    status: "active",
    severity: "high",
    summary: "La reducción gradual de jornada establece un máximo de 42 horas semanales desde el 26 de abril de 2026 y 40 horas desde 2028.",
    requiredCapabilities: ["attendance", "schedule-rules", "alerts", "audit-trail"],
    source: "https://www.dt.gob.cl/legislacion/1624/w3-article-129008.html",
  },
  {
    id: "privacy-law-21719",
    area: "privacy",
    title: "Nuevo régimen de protección de datos personales",
    authority: "Biblioteca del Congreso Nacional",
    effectiveFrom: "2026-12-01",
    status: "upcoming",
    severity: "critical",
    summary: "La Ley 21.719 entra en vigencia el 1 de diciembre de 2026 e incorpora derechos, obligaciones, agencia y régimen sancionatorio de protección de datos.",
    requiredCapabilities: ["privacy-center", "consent", "purpose-management", "data-export", "deletion", "retention", "audit-trail"],
    source: "https://www.bcn.cl/leychile/Navegar?idNorma=1209272&idVersion=2026-12-01",
  },
];

const severityWeight: Record<RegulatorySeverity, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export function getRegulatoryRules(now = new Date()): RegulatoryRule[] {
  const iso = now.toISOString().slice(0, 10);
  return [...NUVA_CHILE_REGULATORY_RULES].sort((a, b) => {
    const statusWeight = (rule: RegulatoryRule) => rule.effectiveFrom > iso ? 2 : 1;
    return statusWeight(b) - statusWeight(a) || severityWeight[b.severity] - severityWeight[a.severity] || a.effectiveFrom.localeCompare(b.effectiveFrom);
  });
}

export function getRegulatoryStatus(rule: RegulatoryRule, now = new Date()): RegulatoryStatus {
  return rule.effectiveFrom > now.toISOString().slice(0, 10) ? "upcoming" : rule.status === "review" ? "review" : "active";
}

export function calculateRegulatoryReadiness(implementedCapabilities: Iterable<string>, rules = NUVA_CHILE_REGULATORY_RULES) {
  const capabilities = new Set(implementedCapabilities);
  const results = rules.map((rule) => {
    const missing = rule.requiredCapabilities.filter((capability) => !capabilities.has(capability));
    const readiness = Math.round(((rule.requiredCapabilities.length - missing.length) / rule.requiredCapabilities.length) * 100);
    return { rule, readiness, missing };
  });
  const score = results.length ? Math.round(results.reduce((sum, result) => sum + result.readiness, 0) / results.length) : 100;
  return { score, results };
}
