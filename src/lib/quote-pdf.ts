import { fmtCLP } from "@/lib/biz-data";

type QuoteItem = { name: string; qty: number; price: number };

type Quote = {
  quote_number?: number | null;
  customer_name: string;
  items: QuoteItem[];
  subtotal: number;
  tax: number;
  discount_pct?: number | null;
  total: number;
  created_at: string;
  valid_until?: string | null;
  notes?: string | null;
  terms?: string | null;
};

type Business = {
  name?: string | null;
  logo_url?: string | null;
  tax_id?: string | null;
};

// Paleta "premium": azul marino profundo + dorado sutil para el acento del total.
const NAVY: [number, number, number] = [23, 37, 68];
const GOLD: [number, number, number] = [176, 141, 87];
const LIGHT: [number, number, number] = [246, 247, 250];
const MUTED: [number, number, number] = [110, 118, 130];

async function loadLogoDataUrl(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateQuotePdf(quote: Quote, businessNameOrBiz: string | Business) {
  const business: Business =
    typeof businessNameOrBiz === "string" ? { name: businessNameOrBiz } : businessNameOrBiz;
  const businessName = business.name || "Nüva One";

  // Use a non-static specifier + @vite-ignore so neither the SSR (workerd)
  // nor client analyzer resolves jspdf at build time; it loads at runtime in the browser.
  const specifier = "jspdf";
  const mod: any = await import(/* @vite-ignore */ specifier);
  const JsPDFCtor = mod.default ?? mod.jsPDF ?? mod;
  const doc = new JsPDFCtor({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 48;
  const contentW = pageW - marginX * 2;

  const logoDataUrl = await loadLogoDataUrl(business.logo_url);

  function drawHeader() {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageW, 96, "F");
    doc.setFillColor(...GOLD);
    doc.rect(0, 96, pageW, 3, "F");

    let textX = marginX;
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, "PNG", marginX, 22, 52, 52);
        textX = marginX + 66;
      } catch {
        /* logo inválido: seguimos sin él */
      }
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(businessName, textX, 48);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(210, 216, 226);
    if (business.tax_id) doc.text(`RUT: ${business.tax_id}`, textX, 64);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    const numLabel = quote.quote_number
      ? `COTIZACIÓN N° ${String(quote.quote_number).padStart(4, "0")}`
      : "COTIZACIÓN";
    doc.text(numLabel, pageW - marginX, 48, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(210, 216, 226);
    doc.text(new Date(quote.created_at).toLocaleDateString("es-CL"), pageW - marginX, 64, {
      align: "right",
    });
    doc.setTextColor(0, 0, 0);
  }

  function drawFooter(pageNum: number, pageCount: number) {
    doc.setDrawColor(230);
    doc.line(marginX, pageH - 56, pageW - marginX, pageH - 56);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.text("Generado con Nüva One", marginX, pageH - 38);
    doc.text(`Página ${pageNum} de ${pageCount}`, pageW - marginX, pageH - 38, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }

  drawHeader();
  let y = 132;

  // Datos del cliente en tarjeta clara
  doc.setFillColor(...LIGHT);
  doc.roundedRect(marginX, y, contentW, 56, 6, 6, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text("CLIENTE", marginX + 14, y + 18);
  doc.text("VÁLIDA HASTA", marginX + contentW / 2 + 14, y + 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(quote.customer_name || "—", marginX + 14, y + 38);
  doc.text(
    quote.valid_until ? new Date(quote.valid_until).toLocaleDateString("es-CL") : "No especificada",
    marginX + contentW / 2 + 14,
    y + 38,
  );
  y += 86;

  // Encabezado de tabla
  doc.setFillColor(...NAVY);
  doc.rect(marginX, y, contentW, 26, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text("PRODUCTO", marginX + 10, y + 17);
  doc.text("CANT.", marginX + contentW - 220, y + 17);
  doc.text("PRECIO UNIT.", marginX + contentW - 165, y + 17);
  doc.text("TOTAL", marginX + contentW - 10, y + 17, { align: "right" });
  doc.setTextColor(0, 0, 0);
  y += 26;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let pageNum = 1;

  (quote.items ?? []).forEach((item, idx) => {
    const rowH = 24;
    if (y + rowH > pageH - 80) {
      doc.addPage();
      pageNum++;
      drawHeader();
      y = 132;
    }
    if (idx % 2 === 0) {
      doc.setFillColor(...LIGHT);
      doc.rect(marginX, y, contentW, rowH, "F");
    }
    doc.setTextColor(0, 0, 0);
    doc.text(String(item.name ?? "—").slice(0, 55), marginX + 10, y + 16);
    doc.text(String(item.qty ?? 0), marginX + contentW - 220, y + 16);
    doc.text(fmtCLP(Number(item.price ?? 0)), marginX + contentW - 165, y + 16);
    doc.text(
      fmtCLP(Number(item.qty ?? 0) * Number(item.price ?? 0)),
      marginX + contentW - 10,
      y + 16,
      {
        align: "right",
      },
    );
    y += rowH;
  });

  y += 18;
  const boxW = 230;
  const boxX = marginX + contentW - boxW;
  const hasDiscount = Number(quote.discount_pct) > 0;
  const discountAmount = hasDiscount
    ? Math.round(quote.subtotal * (Number(quote.discount_pct) / 100))
    : 0;
  const linesCount = 2 + (hasDiscount ? 1 : 0);
  const summaryH = linesCount * 20 + 34;

  if (y + summaryH > pageH - 80) {
    doc.addPage();
    pageNum++;
    drawHeader();
    y = 132;
  }

  doc.setFontSize(10);
  doc.setTextColor(...MUTED);
  doc.text("Subtotal", boxX, y);
  doc.setTextColor(0, 0, 0);
  doc.text(fmtCLP(quote.subtotal), marginX + contentW - 10, y, { align: "right" });
  y += 20;

  if (hasDiscount) {
    doc.setTextColor(...MUTED);
    doc.text(`Descuento (${quote.discount_pct}%)`, boxX, y);
    doc.setTextColor(200, 60, 60);
    doc.text(`-${fmtCLP(discountAmount)}`, marginX + contentW - 10, y, { align: "right" });
    doc.setTextColor(0, 0, 0);
    y += 20;
  }

  doc.setTextColor(...MUTED);
  doc.text("IVA (19%)", boxX, y);
  doc.setTextColor(0, 0, 0);
  doc.text(fmtCLP(quote.tax), marginX + contentW - 10, y, { align: "right" });
  y += 26;

  doc.setFillColor(...NAVY);
  doc.roundedRect(boxX, y - 16, boxW, 32, 5, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...GOLD);
  doc.text("TOTAL", boxX + 12, y + 5);
  doc.setTextColor(255, 255, 255);
  doc.text(fmtCLP(quote.total), marginX + contentW - 10, y + 5, { align: "right" });
  doc.setTextColor(0, 0, 0);
  y += 46;

  if (quote.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    doc.text("NOTAS", marginX, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(0, 0, 0);
    const lines = doc.splitTextToSize(quote.notes, contentW);
    doc.text(lines, marginX, y);
    y += lines.length * 12 + 16;
  }

  if (quote.terms) {
    if (y + 40 > pageH - 90) {
      doc.addPage();
      pageNum++;
      drawHeader();
      y = 132;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    doc.text("CONDICIONES", marginX, y);
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(70, 70, 70);
    const termLines = doc.splitTextToSize(quote.terms, contentW);
    doc.text(termLines, marginX, y);
  }

  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    drawFooter(p, pageCount);
  }

  doc.save(
    `Cotizacion-${quote.quote_number ? String(quote.quote_number).padStart(4, "0") + "-" : ""}${quote.customer_name || "cliente"}-${new Date(quote.created_at).toISOString().slice(0, 10)}.pdf`,
  );
}
