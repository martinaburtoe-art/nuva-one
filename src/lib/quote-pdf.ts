import { fmtCLP } from "@/lib/biz-data";

type QuoteItem = { name: string; qty: number; price: number };

export async function generateQuotePdf(
  quote: {
    customer_name: string;
    items: QuoteItem[];
    subtotal: number;
    tax: number;
    total: number;
    created_at: string;
    valid_until?: string | null;
    notes?: string | null;
  },
  businessName: string,
) {
  // Use a non-static specifier + @vite-ignore so neither the SSR (workerd)
  // nor client analyzer resolves jspdf at build time; it loads at runtime in the browser.
  const specifier = "jspdf";
  const mod: any = await import(/* @vite-ignore */ specifier);
  const JsPDFCtor = mod.default ?? mod.jsPDF ?? mod;
  const doc = new JsPDFCtor({ unit: "pt", format: "a4" });
  const marginX = 48;
  let y = 56;

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(businessName || "Cotización", marginX, y);
  y += 18;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(110);
  doc.text("Cotización profesional", marginX, y);
  doc.setTextColor(0);
  y += 36;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Cliente:", marginX, y);
  doc.setFont("helvetica", "normal");
  doc.text(quote.customer_name || "—", marginX + 60, y);
  y += 16;

  doc.setFont("helvetica", "bold");
  doc.text("Fecha:", marginX, y);
  doc.setFont("helvetica", "normal");
  doc.text(new Date(quote.created_at).toLocaleDateString("es-CL"), marginX + 60, y);

  if (quote.valid_until) {
    doc.setFont("helvetica", "bold");
    doc.text("Válida hasta:", marginX + 220, y);
    doc.setFont("helvetica", "normal");
    doc.text(new Date(quote.valid_until).toLocaleDateString("es-CL"), marginX + 300, y);
  }
  y += 28;

  // Table header
  doc.setFillColor(244, 244, 248);
  doc.rect(marginX, y, 500, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Descripción", marginX + 8, y + 15);
  doc.text("Cant.", marginX + 300, y + 15);
  doc.text("Precio", marginX + 360, y + 15);
  doc.text("Total", marginX + 450, y + 15);
  y += 22;

  doc.setFont("helvetica", "normal");
  (quote.items ?? []).forEach((item) => {
    y += 22;
    if (y > 720) {
      doc.addPage();
      y = 56;
    }
    doc.text(String(item.name ?? "—").slice(0, 48), marginX + 8, y);
    doc.text(String(item.qty ?? 0), marginX + 300, y);
    doc.text(fmtCLP(Number(item.price ?? 0)), marginX + 360, y);
    doc.text(fmtCLP(Number(item.qty ?? 0) * Number(item.price ?? 0)), marginX + 450, y);
  });

  y += 30;
  doc.setDrawColor(220);
  doc.line(marginX + 280, y, marginX + 500, y);
  y += 18;

  doc.text("Subtotal", marginX + 360, y);
  doc.text(fmtCLP(quote.subtotal), marginX + 450, y);
  y += 16;
  doc.text("IVA (19%)", marginX + 360, y);
  doc.text(fmtCLP(quote.tax), marginX + 450, y);
  y += 18;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Total", marginX + 360, y);
  doc.text(fmtCLP(quote.total), marginX + 450, y);

  if (quote.notes) {
    y += 40;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(110);
    doc.text("Notas:", marginX, y);
    y += 14;
    const lines = doc.splitTextToSize(quote.notes, 500);
    doc.text(lines, marginX, y);
  }

  doc.save(
    `Cotizacion-${quote.customer_name || "cliente"}-${new Date(quote.created_at).toISOString().slice(0, 10)}.pdf`,
  );
}
