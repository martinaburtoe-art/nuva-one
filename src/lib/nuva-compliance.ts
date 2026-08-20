export type ComplianceSeverity = "critical" | "warning" | "upcoming" | "info";

export type ComplianceItem = {
  id: string;
  title: string;
  authority: "SII" | "DT" | "BCN" | "Nüva";
  effectiveDate?: string;
  severity: ComplianceSeverity;
  status: "required" | "prepare" | "monitor" | "configuration";
  description: string;
  action: string;
  sourceKey: string;
};

/**
 * Chilean compliance registry. This is a product-control layer, not legal advice.
 * Dates must be reviewed when authorities publish new resolutions/circulars.
 */
export const CHILE_COMPLIANCE_REGISTRY: ComplianceItem[] = [
  {
    id: "sii-market-certification",
    title: "Certificación SII para Sistema de Facturación de Mercado",
    authority: "SII",
    severity: "critical",
    status: "required",
    description: "La emisión de DTE mediante un sistema de mercado requiere completar el proceso de certificación correspondiente del SII antes de operar como solución certificada.",
    action: "Preparar ambiente de certificación, casos de prueba, firma, folios, XML, recepción y trazabilidad.",
    sourceKey: "sii-market-certification",
  },
  {
    id: "electronic-documents",
    title: "DTE y documentos tributarios electrónicos",
    authority: "SII",
    severity: "critical",
    status: "configuration",
    description: "Nüva debe tratar factura, boleta, notas y guías como documentos con estados y trazabilidad tributaria, no como simples PDFs.",
    action: "Implementar motor DTE con XML, folios, firma, envío, respuesta SII, reintentos, almacenamiento y auditoría.",
    sourceKey: "sii-dte",
  },
  {
    id: "privacy-law-21719",
    title: "Ley 21.719 — protección de datos personales",
    authority: "BCN",
    effectiveDate: "2026-12-01",
    severity: "warning",
    status: "prepare",
    description: "La nueva regulación de protección de datos personales entra en vigor el 1 de diciembre de 2026.",
    action: "Implementar Privacy Center, gestión de derechos, trazabilidad, retención, minimización y controles específicos para IA.",
    sourceKey: "ley-21719",
  },
  {
    id: "workweek-42",
    title: "Ley 21.561 — jornada máxima de 42 horas",
    authority: "DT",
    effectiveDate: "2026-04-26",
    severity: "info",
    status: "required",
    description: "La jornada ordinaria máxima semanal se encuentra en 42 horas desde el 26 de abril de 2026, dentro de la implementación gradual hacia 40 horas.",
    action: "Configurar reglas de asistencia y jornada según la fecha efectiva y el régimen aplicable a cada empresa.",
    sourceKey: "ley-21561",
  },
  {
    id: "workweek-40",
    title: "Ley 21.561 — jornada máxima de 40 horas",
    authority: "DT",
    effectiveDate: "2028-04-26",
    severity: "upcoming",
    status: "prepare",
    description: "La reducción gradual contempla llegar a 40 horas semanales el 26 de abril de 2028.",
    action: "Mantener el motor laboral versionado por fecha para que el cambio no requiera una actualización de emergencia.",
    sourceKey: "ley-21561",
  },
];

const toDate = (value: string) => new Date(`${value}T00:00:00`);

export function getChileComplianceRadar(now = new Date()): ComplianceItem[] {
  return [...CHILE_COMPLIANCE_REGISTRY].sort((a, b) => {
    const severity: Record<ComplianceSeverity, number> = { critical: 4, warning: 3, upcoming: 2, info: 1 };
    const bySeverity = severity[b.severity] - severity[a.severity];
    if (bySeverity) return bySeverity;
    return (a.effectiveDate ? toDate(a.effectiveDate).getTime() : Number.MAX_SAFE_INTEGER) - (b.effectiveDate ? toDate(b.effectiveDate).getTime() : Number.MAX_SAFE_INTEGER);
  });
}

export function getUpcomingChileCompliance(now = new Date(), days = 180): ComplianceItem[] {
  const end = new Date(now.getTime() + days * 86_400_000);
  return CHILE_COMPLIANCE_REGISTRY.filter((item) => item.effectiveDate && toDate(item.effectiveDate) >= now && toDate(item.effectiveDate) <= end);
}
