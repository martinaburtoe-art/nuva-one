import { fmtCLP } from "@/lib/biz-data";
import { formatQuoteNumber, type QuoteTaxTreatment } from "@/lib/quote-calculations";

type QuoteItem = {
  name: string;
  description?: string | null;
  sku?: string | null;
  unit?: string | null;
  qty: number;
  price: number;
};

type Quote = {
  id?: string;
  quote_number?: number | null;
  customer_name: string;
  subject?: string | null;
  customer_snapshot?: Record<string, string | null> | null;
  items: QuoteItem[];
  subtotal: number;
  tax: number;
  discount_pct?: number | null;
  total: number;
  tax_treatment?: QuoteTaxTreatment | null;
  vat_rate?: number | null;
  created_at: string;
  valid_until?: string | null;
  notes?: string | null;
  terms?: string | null;
};

type Business = {
  name?: string | null;
  logo_url?: string | null;
  tax_id?: string | null;
  giro?: string | null;
  address?: string | null;
  comuna?: string | null;
  public_contact_email?: string | null;
  public_contact_phone?: string | null;
};

type Customer = {
  name?: string | null;
  tax_id?: string | null;
  address?: string | null;
  email?: string | null;
  phone?: string | null;
  contact_name?: string | null;
  shipping_comuna?: string | null;
  shipping_city?: string | null;
};

const NAVY: [number, number, number] = [24, 39, 65];
const INK: [number, number, number] = [35, 43, 55];
const MUTED: [number, number, number] = [105, 114, 128];
const BORDER: [number, number, number] = [226, 230, 236];
const PALE: [number, number, number] = [247, 248, 250];
const ACCENT: [number, number, number] = [179, 143, 88];

async function loadLogoDataUrl(url?: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function safeFilePart(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "cliente";
}

export async function generateQuotePdf(
  quote: Quote,
  businessInput: Business | string,
  customerInput?: Customer | null,
) {
  const business: Business =
    typeof businessInput === "string" ? { name: businessInput } : businessInput;
  const customer = customerInput ?? {};
  const businessName = business.name?.trim() || "Empresa";
  const taxTreatment = quote.tax_treatment ?? "taxable";
  const vatRate = taxTreatment === "taxable" ? Number(quote.vat_rate ?? 19) : 0;
  const taxLabel =
    taxTreatment === "exempt"
      ? "Operación exenta de IVA"
      : taxTreatment === "non_taxable"
        ? "Operación no afecta a IVA"
        : `IVA (${vatRate.toLocaleString("es-CL")}% sobre base neta)`;

  const specifier = "jspdf";
  const mod: any = await import(/* @vite-ignore */ specifier);
  const JsPDFCtor = mod.default ?? mod.jsPDF ?? mod;
  const doc = new JsPDFCtor({ unit: "pt", format: "a4", compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 42;
  const contentW = pageW - margin * 2;
  const footerY = pageH - 42;
  const logo = await loadLogoDataUrl(business.logo_url);
  let y = 0;

  const setText = (color: [number, number, number]) => doc.setTextColor(...color);
  const ensureSpace = (height: number) => {
    if (y + height > footerY - 18) {
      doc.addPage();
      drawHeader();
      y = 122;
    }
  };

  function drawHeader() {
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageW, 7, "F");
    let brandX = margin;
    if (logo) {
      try {
        const props = doc.getImageProperties(logo);
        const maxW = 48;
        const maxH = 48;
        const ratio = props.width / props.height;
        const w = ratio >= 1 ? maxW : maxH * ratio;
        const h = ratio >= 1 ? maxW / ratio : maxH;
        const imageFormat = logo.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
        doc.addImage(logo, imageFormat, margin, 24 + (maxH - h) / 2, w, h);
        brandX = margin + 60;
      } catch {
        brandX = margin;
      }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    setText(NAVY);
    doc.text(businessName, brandX, 34, { maxWidth: 250 });

    const businessLines = [
      business.tax_id ? `RUT: ${business.tax_id}` : null,
      business.giro,
      [business.address, business.comuna].filter(Boolean).join(", "),
      [business.public_contact_phone, business.public_contact_email].filter(Boolean).join(" · "),
    ].filter(Boolean) as string[];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setText(MUTED);
    businessLines.slice(0, 4).forEach((line, index) => {
      doc.text(doc.splitTextToSize(line, 265).slice(0, 1), brandX, 48 + index * 10);
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    setText(NAVY);
    doc.text("COTIZACIÓN", pageW - margin, 34, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setText(ACCENT);
    doc.text(formatQuoteNumber(quote.quote_number), pageW - margin, 52, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setText(MUTED);
    doc.text(
      `Emitida: ${new Date(quote.created_at).toLocaleDateString("es-CL")}`,
      pageW - margin,
      68,
      { align: "right" },
    );
    doc.setDrawColor(...BORDER);
    doc.line(margin, 91, pageW - margin, 91);
  }

  function drawFooter(page: number, pages: number) {
    doc.setDrawColor(...BORDER);
    doc.line(margin, footerY - 10, pageW - margin, footerY - 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    setText(MUTED);
    doc.text("Documento comercial · No constituye factura ni documento tributario electrónico", margin, footerY + 4);
    doc.text(`Página ${page} de ${pages}`, pageW - margin, footerY + 4, { align: "right" });
  }

  function paragraph(
    text: string | null | undefined,
    x: number,
    width: number,
    fontSize = 9,
    lineHeight = 13,
    color: [number, number, number] = INK,
  ) {
    if (!text?.trim()) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);
    setText(color);
    const lines = doc.splitTextToSize(text.trim(), width) as string[];
    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, x, y);
      y += lineHeight;
    }
  }

  function sectionTitle(title: string) {
    ensureSpace(28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setText(MUTED);
    doc.text(title.toUpperCase(), margin, y);
    y += 15;
  }

  function drawTableHeader() {
    ensureSpace(30);
    doc.setFillColor(...NAVY);
    doc.roundedRect(margin, y, contentW, 25, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("DESCRIPCIÓN", margin + 10, y + 16);
    doc.text("CANT.", margin + 318, y + 16, { align: "right" });
    doc.text("PRECIO UNIT.", margin + 420, y + 16, { align: "right" });
    doc.text("TOTAL", pageW - margin - 10, y + 16, { align: "right" });
    y += 25;
  }

  drawHeader();
  y = 116;

  // Customer and validity panel
  const panelH = 76;
  doc.setFillColor(...PALE);
  doc.roundedRect(margin, y, contentW, panelH, 6, 6, "F");
  const colW = (contentW - 28) / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  setText(MUTED);
  doc.text("PREPARADA PARA", margin + 14, y + 17);
  doc.text("VIGENCIA DE LA OFERTA", margin + 14 + colW, y + 17);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setText(INK);
  doc.text(customer.name || quote.customer_name || "Cliente", margin + 14, y + 34, {
    maxWidth: colW - 12,
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setText(MUTED);
  const customerDetails = [
    customer.tax_id ? `RUT: ${customer.tax_id}` : null,
    customer.contact_name ? `Contacto: ${customer.contact_name}` : null,
    customer.address,
    [customer.shipping_comuna, customer.shipping_city].filter(Boolean).join(", "),
    customer.email,
    customer.phone,
  ].filter(Boolean) as string[];
  customerDetails.slice(0, 3).forEach((line, index) => {
    doc.text(doc.splitTextToSize(line, colW - 12).slice(0, 1), margin + 14, y + 48 + index * 9);
  });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setText(INK);
  doc.text(
    quote.valid_until
      ? new Date(`${quote.valid_until}T12:00:00`).toLocaleDateString("es-CL")
      : "No especificada",
    margin + 14 + colW,
    y + 38,
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setText(MUTED);
  doc.text("Precios y condiciones sujetos a esta propuesta.", margin + 14 + colW, y + 54, {
    maxWidth: colW - 14,
  });
  y += panelH + 22;

  if (quote.subject) {
    sectionTitle("Asunto / proyecto");
    paragraph(quote.subject, margin, contentW, 10, 14, INK);
    y += 8;
  }

  sectionTitle("Detalle de productos y servicios");
  drawTableHeader();

  (quote.items ?? []).forEach((item, index) => {
    const titleLines = doc.splitTextToSize(String(item.name || "Ítem"), 245) as string[];
    const descriptionLines = item.description
      ? (doc.splitTextToSize(String(item.description), 245) as string[])
      : [];
    const metaLine = [item.sku ? `SKU ${item.sku}` : null, item.unit ? `Unidad: ${item.unit}` : null]
      .filter(Boolean)
      .join(" · ");
    const entries = [
      ...titleLines.map((text) => ({ text, kind: "title" as const })),
      ...(metaLine ? [{ text: metaLine, kind: "meta" as const }] : []),
      ...descriptionLines.map((text) => ({ text, kind: "description" as const })),
    ];
    let offset = 0;
    let firstFragment = true;
    while (offset < entries.length || firstFragment) {
      if (footerY - 18 - y < 32) {
        doc.addPage();
        drawHeader();
        y = 116;
        drawTableHeader();
      }
      const maxLines = Math.max(1, Math.floor((footerY - 18 - y - 10) / 11));
      const fragment = entries.slice(offset, offset + maxLines);
      const rowH = Math.max(30, fragment.length * 11 + 10);
      if (index % 2 === 0) {
        doc.setFillColor(...PALE);
        doc.rect(margin, y, contentW, rowH, "F");
      }
      fragment.forEach((entry, lineIndex) => {
        doc.setFont("helvetica", entry.kind === "title" ? "bold" : "normal");
        doc.setFontSize(entry.kind === "title" ? 8.5 : entry.kind === "meta" ? 7 : 7.5);
        setText(entry.kind === "title" ? INK : MUTED);
        doc.text(entry.text, margin + 10, y + 14 + lineIndex * 11);
      });
      if (firstFragment) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        setText(INK);
        doc.text(String(item.qty ?? 0), margin + 318, y + 17, { align: "right" });
        doc.text(fmtCLP(Number(item.price ?? 0)), margin + 420, y + 17, { align: "right" });
        doc.setFont("helvetica", "bold");
        doc.text(
          fmtCLP(Math.round(Number(item.qty ?? 0) * Number(item.price ?? 0))),
          pageW - margin - 10,
          y + 17,
          { align: "right" },
        );
      }
      doc.setDrawColor(...BORDER);
      doc.line(margin, y + rowH, pageW - margin, y + rowH);
      y += rowH;
      offset += fragment.length;
      firstFragment = false;
      if (offset < entries.length) {
        doc.addPage();
        drawHeader();
        y = 116;
        drawTableHeader();
      }
    }
  });

  y += 18;
  const discountPct = Number(quote.discount_pct ?? 0);
  const discountAmount = Math.round(Number(quote.subtotal) * (discountPct / 100));
  const summaryRows = [
    ["Subtotal neto", fmtCLP(Number(quote.subtotal))],
    ...(discountPct > 0 ? [[`Descuento (${discountPct}%)`, `-${fmtCLP(discountAmount)}`]] : []),
    [taxLabel, fmtCLP(Number(quote.tax))],
  ];
  const summaryH = summaryRows.length * 18 + 46;
  ensureSpace(summaryH);
  const summaryX = pageW - margin - 250;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  summaryRows.forEach(([label, value]) => {
    setText(MUTED);
    doc.text(label, summaryX, y);
    setText(INK);
    doc.text(value, pageW - margin - 10, y, { align: "right" });
    y += 18;
  });
  y += 5;
  doc.setFillColor(...NAVY);
  doc.roundedRect(summaryX, y - 12, 250, 34, 5, 5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setText([255, 255, 255]);
  doc.text("TOTAL", summaryX + 12, y + 9);
  doc.setFontSize(13);
  setText([255, 255, 255]);
  doc.text(fmtCLP(Number(quote.total)), pageW - margin - 10, y + 9, { align: "right" });
  y += 42;

  if (quote.notes) {
    sectionTitle("Alcance y notas");
    paragraph(quote.notes, margin, contentW, 8.5, 12);
    y += 8;
  }
  if (quote.terms) {
    sectionTitle("Condiciones comerciales");
    paragraph(quote.terms, margin, contentW, 8, 11);
    y += 8;
  }

  ensureSpace(74);
  doc.setDrawColor(...BORDER);
  doc.line(margin, y + 18, margin + 190, y + 18);
  doc.line(margin + 270, y + 18, margin + 460, y + 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  setText(MUTED);
  doc.text("Nombre y firma del cliente", margin, y + 31);
  doc.text("Fecha de aceptación", margin + 270, y + 31);

  const pages = doc.internal.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    drawFooter(page, pages);
  }

  doc.setProperties({
    title: `${formatQuoteNumber(quote.quote_number)} · ${businessName}`,
    subject: quote.subject || "Cotización comercial",
    author: businessName,
    creator: "Nüva One",
  });

  const filename = [
    "Cotizacion",
    quote.quote_number ? String(quote.quote_number).padStart(4, "0") : "Borrador",
    safeFilePart(customer.name || quote.customer_name || "cliente"),
    new Date(quote.created_at).toISOString().slice(0, 10),
  ].join("-");

  doc.save(`${filename}.pdf`);
}
