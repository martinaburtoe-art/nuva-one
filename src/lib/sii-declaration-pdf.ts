import jsPDF from "jspdf";
import { fmtCLP } from "@/lib/biz-data";

export type PendingSaleForDeclaration = {
  id: string;
  sale_date: string;
  customer_name?: string | null;
  total: number;
};

type Business = {
  name?: string | null;
  logo_url?: string | null;
  tax_id?: string | null;
};

const NAVY: [number, number, number] = [23, 37, 68];
const GOLD: [number, number, number] = [176, 141, 87];
const LIGHT: [number, number, number] = [246, 247, 250];
const MUTED: [number, number, number] = [110, 118, 130];
const BORDER: [number, number, number] = [224, 227, 232];
const SUCCESS: [number, number, number] = [36, 110, 78];

/**
 * Genera un expediente PDF profesional para preparar y revisar información
 * antes de emitir DTE en el Portal MiPyme del SII.
 *
 * Importante: este archivo NO es un DTE, NO tiene timbre electrónico ni firma
 * digital del SII y NO acredita emisión. Es un documento de apoyo y control.
 */
export function generateSiiDeclarationPdf(sales: PendingSaleForDeclaration[], business: Business) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 46;
  const contentW = pageW - marginX * 2;
  const businessName = business.name || "Nüva One";
  const today = new Date().toLocaleDateString("es-CL");

  const grossOf = (s: PendingSaleForDeclaration) => Number(s.total) || 0;
  const netOf = (s: PendingSaleForDeclaration) => Math.round(grossOf(s) / 1.19);
  const ivaOf = (s: PendingSaleForDeclaration) => grossOf(s) - netOf(s);
  const totalNet = sales.reduce((sum, s) => sum + netOf(s), 0);
  const totalIva = sales.reduce((sum, s) => sum + ivaOf(s), 0);
  const totalGross = sales.reduce((sum, s) => sum + grossOf(s), 0);

  function header() {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageW, 88, "F");
    doc.setFillColor(...GOLD);
    doc.rect(0, 88, pageW, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(businessName, marginX, 39);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(211, 218, 228);
    doc.text(business.tax_id ? `RUT ${business.tax_id}` : "Preparación tributaria", marginX, 56);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.setTextColor(255, 255, 255);
    doc.text("SII READY · EXPEDIENTE DE APOYO", pageW - marginX, 39, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(211, 218, 228);
    doc.text(`Generado ${today}`, pageW - marginX, 56, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }

  function footer(pageNum: number, pageCount: number) {
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.7);
    doc.line(marginX, pageH - 52, pageW - marginX, pageH - 52);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(
      "Nüva One · Documento de apoyo para preparación y control. No reemplaza un DTE emitido por el SII.",
      marginX,
      pageH - 34,
    );
    doc.text(`Página ${pageNum} / ${pageCount}`, pageW - marginX, pageH - 34, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }

  let y = 112;
  function sectionTitle(title: string, subtitle?: string) {
    doc.setFillColor(...NAVY);
    doc.roundedRect(marginX, y, contentW, 30, 5, 5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), marginX + 12, y + 19);
    doc.setTextColor(0, 0, 0);
    y += 39;
    if (subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...MUTED);
      doc.text(subtitle, marginX, y);
      doc.setTextColor(0, 0, 0);
      y += 17;
    }
  }

  header();

  doc.setFillColor(...LIGHT);
  doc.roundedRect(marginX, y, contentW, 74, 8, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text("Resumen de preparación", marginX + 16, y + 21);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(
    "Información organizada para revisar y transcribir en el Portal MiPyme del SII.",
    marginX + 16,
    y + 37,
  );
  doc.setTextColor(...SUCCESS);
  doc.setFont("helvetica", "bold");
  doc.text("ESTADO · LISTO PARA REVISIÓN", marginX + 16, y + 56);
  doc.setTextColor(...NAVY);
  doc.setFontSize(15);
  doc.text(fmtCLP(totalGross), pageW - marginX - 16, y + 27, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("TOTAL DEL LOTE", pageW - marginX - 16, y + 43, { align: "right" });
  y += 94;

  sectionTitle("Identificación del proceso", "Control interno del lote preparado por Nüva One");
  const info = [
    ["Empresa", businessName],
    ["RUT empresa", business.tax_id || "Pendiente de completar"],
    ["Fecha de preparación", today],
    ["Documentos incluidos", String(sales.length)],
    ["Destino", "Portal MiPyme del SII"],
  ];
  info.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = marginX + col * (contentW / 2);
    const yy = y + row * 32;
    doc.setDrawColor(...BORDER);
    doc.roundedRect(x, yy, contentW / 2 - 6, 25, 4, 4, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x + 9, yy + 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...NAVY);
    doc.text(String(value).slice(0, 48), x + 9, yy + 20);
  });
  y += Math.ceil(info.length / 2) * 32 + 18;

  sectionTitle("Detalle de ventas", "Base organizada por operación · montos expresados en CLP");
  const cols = [
    marginX,
    marginX + 66,
    marginX + 184,
    marginX + contentW - 190,
    marginX + contentW - 120,
    marginX + contentW - 54,
  ];
  doc.setFillColor(...NAVY);
  doc.rect(marginX, y, contentW, 25, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  ["FECHA", "ID VENTA", "CLIENTE", "NETO", "IVA 19%", "TOTAL"].forEach((t, i) =>
    doc.text(t, cols[i] + 8, y + 16),
  );
  y += 25;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  sales.forEach((s, idx) => {
    if (y + 25 > pageH - 80) {
      doc.addPage();
      header();
      y = 112;
      sectionTitle("Detalle de ventas · continuación");
    }
    if (idx % 2 === 0) {
      doc.setFillColor(...LIGHT);
      doc.rect(marginX, y, contentW, 25, "F");
    }
    doc.setTextColor(...NAVY);
    doc.text(new Date(s.sale_date).toLocaleDateString("es-CL"), cols[0] + 8, y + 16);
    doc.text(String(s.id).slice(0, 16), cols[1] + 8, y + 16);
    doc.text(String(s.customer_name || "Consumidor final").slice(0, 29), cols[2] + 8, y + 16);
    doc.text(fmtCLP(netOf(s)), cols[3] + 8, y + 16);
    doc.text(fmtCLP(ivaOf(s)), cols[4] + 8, y + 16);
    doc.setFont("helvetica", "bold");
    doc.text(fmtCLP(grossOf(s)), cols[5] + 8, y + 16);
    doc.setFont("helvetica", "normal");
    y += 25;
  });

  if (y + 118 > pageH - 80) {
    doc.addPage();
    header();
    y = 112;
  }
  y += 16;
  const summaryX = marginX + contentW - 230;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(summaryX, y, 230, 96, 6, 6, "F");
  const summaryRows = [
    ["Neto", totalNet],
    ["IVA 19%", totalIva],
    ["Total", totalGross],
  ];
  summaryRows.forEach(([label, value], i) => {
    const yy = y + 22 + i * 24;
    doc.setFont("helvetica", i === 2 ? "bold" : "normal");
    doc.setFontSize(i === 2 ? 10.5 : 8.5);
    doc.setTextColor(
      i === 2 ? NAVY[0] : MUTED[0],
      i === 2 ? NAVY[1] : MUTED[1],
      i === 2 ? NAVY[2] : MUTED[2],
    );
    doc.text(String(label), summaryX + 12, yy);
    doc.setTextColor(...NAVY);
    doc.text(fmtCLP(Number(value)), summaryX + 218, yy, { align: "right" });
  });
  doc.setTextColor(0, 0, 0);
  y += 114;

  if (y + 105 > pageH - 80) {
    doc.addPage();
    header();
    y = 112;
  }
  sectionTitle(
    "Checklist de revisión",
    "Completa estas verificaciones antes de registrar el lote como declarado",
  );
  const checks = [
    "Datos de la empresa revisados (razón social y RUT).",
    "Cada venta fue revisada y corresponde a una operación real.",
    "Tipo de documento y receptor fueron definidos según corresponda.",
    "Montos netos, IVA y total fueron verificados.",
    "El documento fue emitido en el Portal MiPyme del SII.",
    "El folio real fue registrado en Nüva One después de la emisión.",
  ];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  checks.forEach((text) => {
    doc.setDrawColor(...BORDER);
    doc.roundedRect(marginX, y, 13, 13, 2, 2, "S");
    doc.setTextColor(...NAVY);
    doc.text(text, marginX + 22, y + 10);
    y += 22;
  });
  y += 8;
  doc.setFillColor(255, 249, 235);
  doc.roundedRect(marginX, y, contentW, 54, 6, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...NAVY);
  doc.text("IMPORTANTE", marginX + 12, y + 17);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text(
    "Este expediente es una herramienta de preparación y control. No contiene timbre electrónico,",
    marginX + 12,
    y + 31,
  );
  doc.text(
    "firma digital ni validación de recepción del SII. La emisión oficial debe realizarse en el canal autorizado.",
    marginX + 12,
    y + 43,
  );

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    footer(i, pageCount);
  }
  return doc.output("datauristring").split(",")[1] as string;
}
