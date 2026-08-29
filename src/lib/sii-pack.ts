import {
  generateSiiDeclarationPdf,
  type PendingSaleForDeclaration,
} from "@/lib/sii-declaration-pdf";
import { splitSiiTotal, siiTreatmentLabel, type SiiTaxTreatment } from "@/lib/sii-tax";

type Business = { name?: string | null; tax_id?: string | null };
type PackFile = { name: string; data: Uint8Array };
type TaxAwareSale = PendingSaleForDeclaration & {
  tax_treatment?: SiiTaxTreatment | null;
  tipo_dte?: number | null;
};

type XlsxCell = string | number | null;

const encoder = new TextEncoder();

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function u16(n: number) {
  return new Uint8Array([n & 255, (n >>> 8) & 255]);
}
function u32(n: number) {
  return new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]);
}
function concat(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** ZIP writer using stored entries (no compression). Kept dependency-free so the browser can generate the pack reliably. */
function zip(files: PackFile[]) {
  const locals: Uint8Array[] = [],
    centrals: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name),
      crc = crc32(file.data);
    const local = concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(file.data.length),
      u32(file.data.length),
      u16(name.length),
      u16(0),
      name,
      file.data,
    ]);
    locals.push(local);
    const central = concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(file.data.length),
      u32(file.data.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name,
    ]);
    centrals.push(central);
    offset += local.length;
  }
  const centralStart = offset,
    centralData = concat(centrals),
    body = concat([...locals, centralData]);
  return concat([
    body,
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralData.length),
    u32(centralStart),
    u16(0),
  ]);
}

function download(bytes: Uint8Array, filename: string, mime = "application/zip") {
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(arrayBuffer).set(bytes);
  const url = URL.createObjectURL(new Blob([arrayBuffer], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function xmlEscape(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function excelColumn(n: number) {
  let value = n + 1,
    result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}

function excelCell(value: XlsxCell, row: number, col: number, style = 0) {
  const ref = `${excelColumn(col)}${row}`;
  if (value === null || value === "") return `<c r="${ref}" s="${style}"/>`;
  if (typeof value === "number" && Number.isFinite(value))
    return `<c r="${ref}" s="${style}"><v>${value}</v></c>`;
  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
}

function sheetXml(rows: XlsxCell[][], styles: number[][], widths: number[], freezeRows = 4) {
  const rowXml = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((value, colIndex) =>
          excelCell(value, rowIndex + 1, colIndex, styles[rowIndex]?.[colIndex] ?? 0),
        )
        .join("");
      return `<row r="${rowIndex + 1}" ht="${rowIndex === 0 ? 28 : rowIndex === 1 ? 21 : 20}" customHeight="1">${cells}</row>`;
    })
    .join("");
  const cols = widths
    .map((width, i) => `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`)
    .join("");
  const filterEnd = `${excelColumn(Math.max(0, widths.length - 1))}${rows.length}`;
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="${freezeRows}" topLeftCell="A${freezeRows + 1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="20"/><cols>${cols}</cols><sheetData>${rowXml}</sheetData><autoFilter ref="A${freezeRows + 1}:${filterEnd}"/><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/></worksheet>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="[$$-es-CL]#,##0;[RED]-[$$-es-CL]#,##0"/><numFmt numFmtId="165" formatCode="dd-mm-yyyy"/></numFmts><fonts count="3"><font><sz val="10"/><name val="Aptos"/></font><font><b/><sz val="18"/><color rgb="FFFFFFFF"/><name val="Aptos Display"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Aptos"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF172033"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF2E6BFF"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"><color rgb="FFD9DEE8"/></left><right style="thin"><color rgb="FFD9DEE8"/></right><top style="thin"><color rgb="FFD9DEE8"/></top><bottom style="thin"><color rgb="FFD9DEE8"/></bottom></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="7"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="2" borderId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="0" applyAlignment="1"><alignment vertical="center" horizontal="center"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="1" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="1" applyNumberFormat="1"/><xf numFmtId="164" fontId="2" fillId="3" borderId="1" applyNumberFormat="1"/></cellXfs></styleSheet>`;
}

function xlsx(
  files: {
    name: string;
    rows: XlsxCell[][];
    styles: number[][];
    widths: number[];
    freezeRows?: number;
  }[],
) {
  const workbookSheets = files
    .map(
      (file, i) => `<sheet name="${xmlEscape(file.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
    )
    .join("");
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${workbookSheets}</sheets></workbook>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats-package.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${files.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${files.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${files.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`;
  const entries: PackFile[] = [
    { name: "[Content_Types].xml", data: encoder.encode(contentTypes) },
    { name: "_rels/.rels", data: encoder.encode(rels) },
    { name: "xl/workbook.xml", data: encoder.encode(workbook) },
    { name: "xl/_rels/workbook.xml.rels", data: encoder.encode(workbookRels) },
    { name: "xl/styles.xml", data: encoder.encode(stylesXml()) },
    ...files.map((file, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: encoder.encode(sheetXml(file.rows, file.styles, file.widths, file.freezeRows ?? 4)),
    })),
  ];
  return zip(entries);
}

function taxOf(s: TaxAwareSale) {
  return splitSiiTotal(
    Number(s.total) || 0,
    s.tax_treatment === "exento" ? "exento" : "gravado_19",
  );
}

function salesWorkbook(sales: TaxAwareSale[], business: Business, date: string) {
  const rows: XlsxCell[][] = [
    [`NÜVA ONE · SII READY · DETALLE DE OPERACIONES`, null, null, null, null, null, null],
    [
      `${business.name || "Empresa"} · RUT ${business.tax_id || "Pendiente"} · Generado ${date}`,
      null,
      null,
      null,
      null,
      null,
      null,
    ],
    [
      "Documento de preparación para revisión humana. No corresponde a un DTE validado por el SII.",
      null,
      null,
      null,
      null,
      null,
      null,
    ],
    [
      "Fecha",
      "ID venta",
      "Cliente / receptor",
      "Tratamiento tributario",
      "Neto (CLP)",
      "IVA (CLP)",
      "Total (CLP)",
    ],
  ];
  const styles: number[][] = [
    [1, 1, 1, 1, 1, 1, 1],
    [2, 2, 2, 2, 2, 2, 2],
    [0, 0, 0, 0, 0, 0, 0],
    [3, 3, 3, 3, 3, 3, 3],
  ];
  sales.forEach((s, index) => {
    const t = taxOf(s);
    rows.push([
      new Date(s.sale_date).toLocaleDateString("es-CL"),
      s.id,
      s.customer_name || "Consumidor final",
      siiTreatmentLabel(s.tax_treatment === "exento" ? "exento" : "gravado_19"),
      t.net,
      t.iva,
      t.total,
    ]);
    styles.push([5, 0, 0, 0, 4, 4, 4]);
    if (index === sales.length - 1) {
      rows.push([
        "TOTAL",
        null,
        null,
        null,
        sales.reduce((sum, sale) => sum + taxOf(sale).net, 0),
        sales.reduce((sum, sale) => sum + taxOf(sale).iva, 0),
        sales.reduce((sum, sale) => sum + taxOf(sale).total, 0),
      ]);
      styles.push([3, 3, 3, 3, 6, 6, 6]);
    }
  });
  return { name: "Operaciones", rows, styles, widths: [14, 28, 34, 24, 18, 18, 18], freezeRows: 4 };
}

function summaryWorkbook(sales: TaxAwareSale[], business: Business, date: string) {
  const totals = sales.reduce(
    (a, s) => {
      const t = taxOf(s);
      a.net += t.net;
      a.iva += t.iva;
      a.total += t.total;
      if (s.tax_treatment === "exento") a.exento += t.net;
      return a;
    },
    { net: 0, iva: 0, total: 0, exento: 0 },
  );
  const rows: XlsxCell[][] = [
    [`NÜVA ONE · SII READY · RESUMEN TRIBUTARIO`, null, null],
    [
      `${business.name || "Empresa"} · RUT ${business.tax_id || "Pendiente"} · Generado ${date}`,
      null,
      null,
    ],
    [
      "Estimación preparada para revisión. Los montos no acreditan declaración ni recepción del SII.",
      null,
      null,
    ],
    ["Indicador", "Valor", "Observación"],
    ["Operaciones incluidas", sales.length, "Cantidad de operaciones del expediente"],
    ["Neto total", totals.net, "Base imponible estimada"],
    ["Monto exento", totals.exento, "Operaciones identificadas como exentas"],
    ["IVA 19% estimado", totals.iva, "IVA calculado sobre operaciones gravadas"],
    ["Total", totals.total, "Neto + IVA / tratamiento correspondiente"],
  ];
  const styles: number[][] = [
    [1, 1, 1],
    [2, 2, 2],
    [0, 0, 0],
    [3, 3, 3],
    [0, 0, 0],
    [0, 4, 0],
    [0, 4, 0],
    [0, 4, 0],
    [3, 6, 3],
  ];
  return { name: "Resumen", rows, styles, widths: [26, 22, 52], freezeRows: 4 };
}

export async function downloadSiiReadyPack(sales: PendingSaleForDeclaration[], business: Business) {
  if (!sales.length) throw new Error("No hay operaciones pendientes para preparar el expediente");
  const taxAware = sales as TaxAwareSale[];
  const pdfBase64 = await generateSiiDeclarationPdf(sales, business);
  const binary = atob(pdfBase64),
    pdf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) pdf[i] = binary.charCodeAt(i);
  const date = new Date().toISOString().slice(0, 10);
  const operationsXlsx = xlsx([salesWorkbook(taxAware, business, date)]);
  const summaryXlsx = xlsx([summaryWorkbook(taxAware, business, date)]);

  // Client-facing pack: only the useful deliverables. Internal control/checklist folders are intentionally excluded.
  const files: PackFile[] = [
    { name: "01_DOCUMENTO/expediente-sii-ready.pdf", data: pdf },
    { name: "02_DATOS/operaciones-sii-ready.xlsx", data: operationsXlsx },
    { name: "02_DATOS/resumen-tributario-sii-ready.xlsx", data: summaryXlsx },
  ];
  download(zip(files), `nuva-sii-ready-${date}.zip`);
}
