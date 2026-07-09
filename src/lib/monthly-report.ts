import { fmtCLP } from "@/lib/biz-data";

type Tx = { type: string; category: string | null; amount: number; tx_date: string };

// Builds a monthly PDF financial summary in the browser. jspdf is imported
// dynamically with a non-static specifier so the SSR bundler (workerd) and
// the client analyzer both skip it at build time.
export async function generateMonthlyReportPdf(
  businessName: string,
  txs: Tx[],
  monthLabel: string,
) {
  const specifier = "jspdf";
  const mod: any = await import(/* @vite-ignore */ specifier);
  const JsPDFCtor = mod.default ?? mod.jsPDF ?? mod;
  const doc = new JsPDFCtor({ unit: "pt", format: "a4" });
  const marginX = 48;
  let y = 56;

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(businessName || "Reporte", marginX, y);
  y += 20;

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Reporte financiero mensual — ${monthLabel}`, marginX, y);
  y += 30;

  const income = txs.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = txs.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const net = income - expense;

  const kpi = (label: string, val: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, marginX, y);
    doc.setFont("helvetica", "normal");
    doc.text(val, marginX + 200, y);
    y += 18;
  };
  kpi("Ingresos totales:", fmtCLP(income));
  kpi("Gastos totales:", fmtCLP(expense));
  kpi("Flujo neto:", fmtCLP(net));
  y += 12;

  // Group by category
  const byCat = new Map<string, { income: number; expense: number }>();
  txs.forEach((t) => {
    const k = t.category || "Sin categoría";
    const cur = byCat.get(k) ?? { income: 0, expense: 0 };
    if (t.type === "income") cur.income += Number(t.amount);
    else cur.expense += Number(t.amount);
    byCat.set(k, cur);
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Desglose por categoría", marginX, y);
  y += 18;
  doc.setFontSize(10);
  doc.text("Categoría", marginX, y);
  doc.text("Ingresos", marginX + 260, y);
  doc.text("Gastos", marginX + 380, y);
  y += 6;
  doc.line(marginX, y, 547, y);
  y += 12;
  doc.setFont("helvetica", "normal");
  for (const [cat, v] of byCat.entries()) {
    if (y > 780) {
      doc.addPage();
      y = 56;
    }
    doc.text(cat.slice(0, 40), marginX, y);
    doc.text(fmtCLP(v.income), marginX + 260, y);
    doc.text(fmtCLP(v.expense), marginX + 380, y);
    y += 16;
  }

  y += 8;
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text(
    `Generado por Nüva One — ${new Date().toLocaleDateString("es-CL")}`,
    marginX,
    y + 10,
  );

  doc.save(`reporte-${monthLabel.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
