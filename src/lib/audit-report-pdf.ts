// Informe de auditoría en PDF: mismo lenguaje visual que quote-pdf.ts
// (banda de color superior, tarjetas redondeadas, tabla con encabezado de
// color y footer paginado) pero con paleta propia — el índigo de marca de
// Nüva One — y semántica de color por tipo de evento (creación/modificación/
// eliminación), pensado para un documento interno de control, no para un
// cliente.
import {
  ACTION_COLORS_RGB,
  actionLabel,
  entityLabel,
  summarizeAuditEntry,
  displayUserName,
  type ResolvedUser,
} from "@/lib/audit-labels";

export type AuditReportRow = {
  id: string;
  created_at: string;
  action: string;
  entity: string | null;
  user_id: string | null;
  metadata: unknown;
};

export type AuditReportFilters = {
  actions?: string[];
  entities?: string[];
  from?: string | null;
  to?: string | null;
  search?: string;
};

// Paleta de marca (derivada de --primary / --primary-glow en src/styles.css)
const INDIGO: [number, number, number] = [29, 36, 150];
const INDIGO_DARK: [number, number, number] = [20, 25, 105];
const GLOW: [number, number, number] = [87, 128, 255];
const LIGHT: [number, number, number] = [244, 246, 252];
const MUTED: [number, number, number] = [108, 116, 138];
const INK: [number, number, number] = [24, 27, 46];
const BORDER: [number, number, number] = [228, 231, 241];

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function generateAuditReportPdf(
  businessName: string,
  rows: AuditReportRow[],
  users: Record<string, ResolvedUser>,
  filters: AuditReportFilters,
  generatedByName: string,
) {
  const specifier = "jspdf";
  const mod: any = await import(/* @vite-ignore */ specifier);
  const JsPDFCtor = mod.default ?? mod.jsPDF ?? mod;
  const doc = new JsPDFCtor({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 44;
  const contentW = pageW - marginX * 2;
  const HEADER_H = 100;

  let pageNum = 1;

  function drawHeader() {
    doc.setFillColor(...INDIGO);
    doc.rect(0, 0, pageW, HEADER_H, "F");
    doc.setFillColor(...GLOW);
    doc.rect(0, HEADER_H, pageW, 3, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("NÜVA ONE", marginX, 30);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(200, 208, 245);
    doc.text("Plataforma de gestión para PYMEs", marginX, 43);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    doc.setTextColor(255, 255, 255);
    doc.text("Informe de Auditoría", marginX, 76);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(200, 208, 245);
    doc.text(businessName || "Negocio", pageW - marginX, 30, { align: "right" });
    doc.text(`Generado: ${new Date().toLocaleString("es-CL")}`, pageW - marginX, 43, {
      align: "right",
    });
    doc.text(`Por: ${generatedByName}`, pageW - marginX, 56, { align: "right" });

    doc.setTextColor(0, 0, 0);
  }

  function drawFooter(pageCount: number) {
    doc.setDrawColor(...BORDER);
    doc.line(marginX, pageH - 46, pageW - marginX, pageH - 46);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(
      "Documento generado automáticamente por Nüva One. Registro de solo lectura: no puede editarse ni borrarse. Uso interno / confidencial.",
      marginX,
      pageH - 30,
    );
    doc.text(`Página ${pageNum} de ${pageCount}`, pageW - marginX, pageH - 30, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }

  function ensureSpace(needed: number, y: number) {
    if (y + needed > pageH - 60) {
      doc.addPage();
      pageNum++;
      drawHeader();
      return HEADER_H + 34;
    }
    return y;
  }

  drawHeader();
  let y = HEADER_H + 34;

  // ---- Tarjeta de metadatos del informe ----------------------------------
  const rangeLabel =
    filters.from || filters.to
      ? `${filters.from ? new Date(filters.from).toLocaleDateString("es-CL") : "inicio"} → ${
          filters.to ? new Date(filters.to).toLocaleDateString("es-CL") : "hoy"
        }`
      : "Historial completo (últimos 200 eventos)";
  const actionsLabel = filters.actions?.length
    ? filters.actions.map(actionLabel).join(", ")
    : "Todas";
  const entitiesLabel = filters.entities?.length
    ? filters.entities.map(entityLabel).join(", ")
    : "Todos";

  const metaH = 92;
  doc.setFillColor(...LIGHT);
  doc.roundedRect(marginX, y, contentW, metaH, 7, 7, "F");
  const colW = contentW / 3;
  const metaCol = (i: number, label: string, value: string) => {
    const x = marginX + 16 + i * colW;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x, y + 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text(doc.splitTextToSize(value, colW - 24), x, y + 36);
  };
  metaCol(0, "Negocio", businessName || "—");
  metaCol(1, "Periodo cubierto", rangeLabel);
  metaCol(2, "Total de eventos", String(rows.length));
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("ACCIONES FILTRADAS", marginX + 16, y + 52);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(doc.splitTextToSize(actionsLabel, colW - 24), marginX + 16, y + 66);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("MÓDULOS FILTRADOS", marginX + 16 + colW, y + 52);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(doc.splitTextToSize(entitiesLabel, colW - 24), marginX + 16 + colW, y + 66);

  if (filters.search) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text("BÚSQUEDA", marginX + 16 + colW * 2, y + 52);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...INK);
    doc.text(
      doc.splitTextToSize(`"${filters.search}"`, colW - 24),
      marginX + 16 + colW * 2,
      y + 66,
    );
  }

  y += metaH + 22;

  // ---- KPIs ---------------------------------------------------------------
  const inserts = rows.filter((r) => r.action === "INSERT").length;
  const updates = rows.filter((r) => r.action === "UPDATE").length;
  const deletes = rows.filter((r) => r.action === "DELETE").length;
  const activeUsers = new Set(rows.map((r) => r.user_id).filter(Boolean)).size;

  const kpis: { label: string; value: string; color: [number, number, number] }[] = [
    { label: "Total eventos", value: String(rows.length), color: INDIGO },
    { label: "Creaciones", value: String(inserts), color: ACTION_COLORS_RGB.INSERT },
    { label: "Modificaciones", value: String(updates), color: ACTION_COLORS_RGB.UPDATE },
    { label: "Eliminaciones", value: String(deletes), color: ACTION_COLORS_RGB.DELETE },
    { label: "Usuarios activos", value: String(activeUsers), color: GLOW },
  ];
  const gap = 10;
  const kpiW = (contentW - gap * (kpis.length - 1)) / kpis.length;
  const kpiH = 58;
  kpis.forEach((k, i) => {
    const x = marginX + i * (kpiW + gap);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(x, y, kpiW, kpiH, 6, 6, "FD");
    doc.setFillColor(...k.color);
    doc.roundedRect(x, y, kpiW, 4, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...INK);
    doc.text(k.value, x + 10, y + 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.3);
    doc.setTextColor(...MUTED);
    doc.text(doc.splitTextToSize(k.label, kpiW - 14), x + 10, y + 47);
  });
  y += kpiH + 26;

  // ---- Actividad por módulo (mini barras) ---------------------------------
  const byEntity = new Map<string, number>();
  rows.forEach((r) => {
    const k = r.entity || "otros";
    byEntity.set(k, (byEntity.get(k) ?? 0) + 1);
  });
  const entityRows = [...byEntity.entries()].sort((a, b) => b[1] - a[1]);

  if (entityRows.length > 0) {
    y = ensureSpace(24 + entityRows.length * 17, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(...INK);
    doc.text("Actividad por módulo", marginX, y);
    y += 16;
    const maxCount = Math.max(...entityRows.map(([, c]) => c));
    const labelW = 130;
    const barMaxW = contentW - labelW - 40;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.7);
    entityRows.forEach(([ent, count]) => {
      y = ensureSpace(17, y);
      doc.setTextColor(...INK);
      doc.text(entityLabel(ent).slice(0, 26), marginX, y);
      const barW = Math.max(3, (count / maxCount) * barMaxW);
      doc.setFillColor(...BORDER);
      doc.roundedRect(marginX + labelW, y - 8, barMaxW, 8, 2, 2, "F");
      doc.setFillColor(...INDIGO);
      doc.roundedRect(marginX + labelW, y - 8, barW, 8, 2, 2, "F");
      doc.setTextColor(...MUTED);
      doc.text(String(count), marginX + labelW + barMaxW + 8, y);
      y += 17;
    });
    y += 14;
  }

  // ---- Tabla detallada ------------------------------------------------------
  const cols = [
    { key: "when", label: "FECHA / HORA", w: 92 },
    { key: "action", label: "ACCIÓN", w: 78 },
    { key: "entity", label: "MÓDULO", w: 90 },
    { key: "user", label: "USUARIO", w: 100 },
    { key: "detail", label: "DETALLE", w: contentW - 92 - 78 - 90 - 100 },
  ];

  function drawTableHeader() {
    doc.setFillColor(...INDIGO_DARK);
    doc.rect(marginX, y, contentW, 24, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    let x = marginX;
    cols.forEach((c) => {
      doc.text(c.label, x + 8, y + 16);
      x += c.w;
    });
    y += 24;
    doc.setTextColor(0, 0, 0);
  }

  y = ensureSpace(24 + 24, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...INK);
  doc.text("Detalle de eventos", marginX, y);
  y += 12;
  drawTableHeader();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.2);

  const sorted = [...rows].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  sorted.forEach((r, idx) => {
    const detail = summarizeAuditEntry(r.action, r.entity, r.metadata);
    const detailLines = doc.splitTextToSize(detail, cols[4].w - 14);
    const rowH = Math.max(20, detailLines.length * 10 + 8);

    if (y + rowH > pageH - 60) {
      doc.addPage();
      pageNum++;
      drawHeader();
      y = HEADER_H + 30;
      drawTableHeader();
    }

    if (idx % 2 === 0) {
      doc.setFillColor(...LIGHT);
      doc.rect(marginX, y, contentW, rowH, "F");
    }

    let x = marginX;
    doc.setTextColor(...INK);
    doc.text(fmtDateTime(r.created_at), x + 8, y + 13);
    x += cols[0].w;

    const color = ACTION_COLORS_RGB[r.action] ?? MUTED;
    const label = actionLabel(r.action);
    const pillW = Math.min(cols[1].w - 12, doc.getTextWidth(label) + 14);
    doc.setFillColor(...color);
    doc.roundedRect(x, y + 4, pillW, 13, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text(label.toUpperCase(), x + pillW / 2, y + 13, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    x += cols[1].w;

    doc.setTextColor(...INK);
    doc.text(entityLabel(r.entity).slice(0, 22), x + 8, y + 13);
    x += cols[2].w;

    doc.text(displayUserName(r.user_id, users).slice(0, 20), x + 8, y + 13);
    x += cols[3].w;

    doc.setTextColor(...MUTED);
    doc.text(detailLines, x + 8, y + 13);

    y += rowH;
  });

  // Numerar todas las páginas al final (necesitamos el total de páginas).
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    pageNum = p;
    drawFooter(pageCount);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const safeName = (businessName || "negocio")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  doc.save(`auditoria-${safeName}-${stamp}.pdf`);
}
