import { generateSiiDeclarationPdf, type PendingSaleForDeclaration } from "@/lib/sii-declaration-pdf";

type Business = { name?: string | null; tax_id?: string | null };
type PackFile = { name: string; data: Uint8Array };

const encoder = new TextEncoder();

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(n: number) { return new Uint8Array([n & 255, (n >>> 8) & 255]); }
function u32(n: number) { return new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]); }
function concat(parts: Uint8Array[]) { const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; }

/** Creates a standards-friendly ZIP using store/no-compression, with no dependency. */
function zip(files: PackFile[]) {
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.data);
    const local = concat([
      u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0), name, file.data,
    ]);
    locals.push(local);
    const central = concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(0), u32(crc), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(offset), name,
    ]);
    centrals.push(central);
    offset += local.length;
  }
  const centralStart = offset;
  const centralData = concat(centrals);
  const body = concat([...locals, centralData]);
  return concat([body, u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralData.length), u32(centralStart), u16(0)]);
}

function download(bytes: Uint8Array, filename: string, mime = "application/zip") {
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csv(rows: string[][]) {
  return "\ufeff" + rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(";")).join("\n");
}

function salesCsv(sales: PendingSaleForDeclaration[]) {
  return csv([
    ["fecha", "id_venta", "cliente", "neto", "iva_19", "total"],
    ...sales.map((s) => {
      const total = Number(s.total) || 0;
      const net = Math.round(total / 1.19);
      return [new Date(s.sale_date).toLocaleDateString("es-CL"), s.id, s.customer_name || "Consumidor final", String(net), String(total - net), String(total)];
    }),
  ]);
}

function taxSummaryCsv(sales: PendingSaleForDeclaration[]) {
  const total = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const net = sales.reduce((sum, s) => sum + Math.round((Number(s.total) || 0) / 1.19), 0);
  const iva = total - net;
  return csv([
    ["indicador", "valor_clp"],
    ["operaciones", String(sales.length)],
    ["neto_estimado", String(net)],
    ["iva_19_estimado", String(iva)],
    ["total", String(total)],
  ]);
}

function validationReport(business: Business, sales: PendingSaleForDeclaration[]) {
  const missingBusinessRut = !business.tax_id;
  const missingBusinessName = !business.name;
  const missingCustomer = sales.filter((s) => !s.customer_name).length;
  const lines = [
    "NÜVA ONE · SII READY · CONTROL DE CALIDAD",
    "",
    `Generado: ${new Date().toLocaleString("es-CL")}`,
    `Empresa: ${business.name || "Pendiente"}`,
    `RUT empresa: ${business.tax_id || "Pendiente"}`,
    `Operaciones: ${sales.length}`,
    "",
    "VALIDACIONES PREVIAS",
    `[${missingBusinessName ? "!" : "OK"}] Razón social empresa informada`,
    `[${missingBusinessRut ? "!" : "OK"}] RUT empresa informado`,
    `[${missingCustomer ? "!" : "OK"}] Cliente/receptor informado en todas las operaciones`,
    "[INFO] Montos calculados como neto + IVA 19% para este expediente; revisar tratamiento tributario antes de emitir.",
    "[INFO] No se valida folio, timbre, firma electrónica ni recepción SII desde Nüva.",
    "",
    "RESULTADO",
    missingBusinessName || missingBusinessRut ? "REQUIERE COMPLETAR DATOS DE EMPRESA" : missingCustomer ? "REQUIERE REVISAR RECEPTORES" : "LISTO PARA REVISIÓN HUMANA",
  ];
  return lines.join("\n") + "\n";
}

function checklist(business: Business, sales: PendingSaleForDeclaration[]) {
  const date = new Date().toLocaleDateString("es-CL");
  return `# Nüva One · SII Ready\n\n## Expediente de preparación\n\n- Empresa: ${business.name || "Pendiente"}\n- RUT: ${business.tax_id || "Pendiente"}\n- Fecha: ${date}\n- Operaciones incluidas: ${sales.length}\n\n## Checklist antes de emitir\n\n- [ ] Revisar razón social y RUT de la empresa.\n- [ ] Revisar cada operación y su receptor.\n- [ ] Confirmar tipo de DTE correspondiente.\n- [ ] Confirmar neto, exento, IVA y total.\n- [ ] Emitir el documento en el canal oficial del SII.\n- [ ] Registrar en Nüva el folio oficial después de emitir.\n- [ ] Adjuntar el PDF oficial cuando esté disponible.\n- [ ] Guardar este expediente junto con el respaldo oficial.\n\n> Este archivo es material de preparación y control. No es un DTE emitido, no contiene timbre electrónico ni acredita recepción o validación del SII.\n`;
}

function manifest(business: Business, sales: PendingSaleForDeclaration[], date: string) {
  const total = sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  return JSON.stringify({
    product: "Nüva One",
    pack: "SII Ready",
    version: "2.0",
    generated_at: new Date().toISOString(),
    business: { name: business.name ?? null, tax_id: business.tax_id ?? null },
    scope: { operations: sales.length, total_clp: total },
    status: "prepared_for_human_review",
    official_sii_validation: false,
    files: [
      "01_EXPEDIENTE/expediente-sii-ready.pdf",
      "02_DATOS/ventas-sii-ready.csv",
      "02_DATOS/resumen-tributario-estimado.csv",
      "03_CONTROL/checklist-sii-ready.md",
      "03_CONTROL/validacion-previa.txt",
      "04_CONTROL/MANIFEST.json",
      "04_CONTROL/README.txt",
    ],
    generated_date: date,
  }, null, 2) + "\n";
}

export async function downloadSiiReadyPack(sales: PendingSaleForDeclaration[], business: Business) {
  if (!sales.length) throw new Error("No hay operaciones pendientes para preparar el expediente");
  const pdfBase64 = await generateSiiDeclarationPdf(sales, business);
  const binary = atob(pdfBase64);
  const pdf = new Uint8Array(binary.length); for (let i = 0; i < binary.length; i++) pdf[i] = binary.charCodeAt(i);
  const date = new Date().toISOString().slice(0, 10);
  const files: PackFile[] = [
    { name: "01_EXPEDIENTE/expediente-sii-ready.pdf", data: pdf },
    { name: "02_DATOS/ventas-sii-ready.csv", data: encoder.encode(salesCsv(sales)) },
    { name: "02_DATOS/resumen-tributario-estimado.csv", data: encoder.encode(taxSummaryCsv(sales)) },
    { name: "03_CONTROL/checklist-sii-ready.md", data: encoder.encode(checklist(business, sales)) },
    { name: "03_CONTROL/validacion-previa.txt", data: encoder.encode(validationReport(business, sales)) },
    { name: "04_CONTROL/MANIFEST.json", data: encoder.encode(manifest(business, sales, date)) },
    { name: "04_CONTROL/README.txt", data: encoder.encode("Nüva One · SII Ready v2.0\n\nEste paquete organiza información para revisión humana y posterior emisión en el canal oficial del SII.\nIncluye expediente PDF, datos tabulares, resumen tributario estimado, checklist, control de calidad y manifiesto del paquete.\nNo contiene DTE emitidos, timbre electrónico, firma digital ni validación oficial del SII.\n\nAntes de emitir: revisar tratamiento tributario, receptor, tipo de documento y montos en el canal autorizado.\nDespués de emitir: registrar el folio real y conservar el respaldo oficial junto con este expediente.\n") },
  ];
  download(zip(files), `nuva-sii-ready-${date}.zip`);
}
