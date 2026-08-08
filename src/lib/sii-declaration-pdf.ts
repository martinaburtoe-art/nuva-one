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

// Misma paleta "premium" usada en las cotizaciones, para consistencia visual.
const NAVY: [number, number, number] = [23, 37, 68];
const GOLD: [number, number, number] = [176, 141, 87];
const LIGHT: [number, number, number] = [246, 247, 250];
const MUTED: [number, number, number] = [110, 118, 130];

/** Genera el documento que el negocio usa como respaldo/checklist al declarar
 * sus ventas en el Portal MiPyme del SII: una venta por línea, con neto, IVA
 * y total, listas para transcribir ahí. No es un DTE ni reemplaza la boleta o
 * factura real emitida por el SII — es solo el resumen de apoyo. */
export async function generateSiiDeclarationPdf(
  sales: PendingSaleForDeclaration[],
  business: Business,
) {
  const specifier = "jspdf";
  const mod: any = await import(/* @vite-ignore */ specifier);
  const JsPDFCtor = mod.default ?? mod.jsPDF ?? mod;
  const doc = new JsPDFCtor({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const contentW = pageW - marginX * 2;
  const businessName = business.name || "Nüva One";
  const today = new Date().toLocaleDateString("es-CL");

  function drawHeader() {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageW, 96, "F");
    doc.setFillColor(...GOLD);
    doc.rect(0, 96, pageW, 3, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(businessName, marginX, 48);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(210, 216, 226);
    if (business.tax_id) doc.text(`RUT: ${business.tax_id}`, marginX, 64);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text("DOCUMENTO DE DECLARACIÓN SII", pageW - marginX, 48, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(210, 216, 226);
    doc.text(`Generado el ${today}`, pageW - marginX, 64, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }

  function drawFooter(pageNum: number, pageCount: number) {
    doc.setDrawColor(230);
    doc.line(marginX, pageH - 56, pageW - marginX, pageH - 56);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      "Generado con Nüva One — resumen de apoyo, no reemplaza el DTE emitido en sii.cl",
      marginX,
      pageH - 38,
    );
    doc.text(`Página ${pageNum} de ${pageCount}`, pageW - marginX, pageH - 38, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }

  drawHeader();
  let y = 124;

  doc.setFillColor(...LIGHT);
  doc.roundedRect(marginX, y, contentW, 46, 6, 6, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  doc.text(
    "Pega estos datos, venta por venta, en el Portal MiPyme del SII (sii.cl) para emitir tu",
    marginX + 14,
    y + 18,
  );
  doc.text(
    "boleta o factura. Al terminar, vuelve a Nüva One y marca este lote como declarado.",
    marginX + 14,
    y + 32,
  );
  doc.setTextColor(0, 0, 0);
  y += 66;

  doc.setFillColor(...NAVY);
  doc.rect(marginX, y, contentW, 26, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text("FECHA", marginX + 10, y + 17);
  doc.text("CLIENTE", marginX + 100, y + 17);
  doc.text("NETO", marginX + contentW - 220, y + 17);
  doc.text("IVA (19%)", marginX + contentW - 140, y + 17);
  doc.text("TOTAL", marginX + contentW - 10, y + 17, { align: "right" });
  doc.setTextColor(0, 0, 0);
  y += 26;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let pageNum = 1;
  let sumNet = 0;
  let sumIva = 0;
  let sumTotal = 0;

  sales.forEach((s, idx) => {
    const rowH = 22;
    if (y + rowH > pageH - 90) {
      doc.addPage();
      pageNum++;
      drawHeader();
      y = 124;
    }
    if (idx % 2 === 0) {
      doc.setFillColor(...LIGHT);
      doc.rect(marginX, y, contentW, rowH, "F");
    }
    const gross = Number(s.total) || 0;
    const net = Math.round(gross / 1.19);
    const iva = gross - net;
    sumNet += net;
    sumIva += iva;
    sumTotal += gross;

    doc.setTextColor(0, 0, 0);
    doc.text(new Date(s.sale_date).toLocaleDateString("es-CL"), marginX + 10, y + 15);
    doc.text(String(s.customer_name || "Consumidor final").slice(0, 30), marginX + 100, y + 15);
    doc.text(fmtCLP(net), marginX + contentW - 220, y + 15);
    doc.text(fmtCLP(iva), marginX + contentW - 140, y + 15);
    doc.text(fmtCLP(gross), marginX + contentW - 10, y + 15, { align: "right" });
    y += rowH;
  });

  y += 16;
  const boxW = 230;
  const boxX = marginX + contentW - boxW;
  if (y + 90 > pageH - 90) {
    doc.addPage();
    pageNum++;
    drawHeader();
    y = 124;
  }
  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text("Neto total", boxX, y);
  doc.setTextColor(0, 0, 0);
  doc.text(fmtCLP(sumNet), marginX + contentW - 10, y, { align: "right" });
  y += 20;
  doc.setTextColor(...MUTED);
  doc.text("IVA total (19%)", boxX, y);
  doc.setTextColor(0, 0, 0);
  doc.text(fmtCLP(sumIva), marginX + contentW - 10, y, { align: "right" });
  y += 12;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.5);
  doc.line(boxX, y, marginX + contentW, y);
  y += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text("TOTAL A DECLARAR", boxX, y);
  doc.text(fmtCLP(sumTotal), marginX + contentW - 10, y, { align: "right" });
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");

  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawFooter(i, pageCount);
  }

  return doc.output("datauristring").split(",")[1] as string;
}
