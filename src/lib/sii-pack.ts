import { generateSiiDeclarationPdf, type PendingSaleForDeclaration } from "@/lib/sii-declaration-pdf";
import { splitSiiTotal, siiTreatmentLabel, type SiiTaxTreatment } from "@/lib/sii-tax";

type Business = { name?: string | null; tax_id?: string | null };
type PackFile = { name: string; data: Uint8Array };
type TaxAwareSale = PendingSaleForDeclaration & { tax_treatment?: SiiTaxTreatment | null; tipo_dte?: number | null };

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
function zip(files: PackFile[]) {
  const locals: Uint8Array[] = [], centrals: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name), crc = crc32(file.data);
    const local = concat([u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0), name, file.data]);
    locals.push(local);
    centrals.push(concat([u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(0), u32(crc), u32(file.data.length), u32(file.data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(offset), name]));
    offset += local.length;
  }
  const centralStart = offset, centralData = concat(centrals), body = concat([...locals, centralData]);
  return concat([body, u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralData.length), u32(centralStart), u16(0)]);
}
function download(bytes: Uint8Array, filename: string, mime = "application/zip") {
  const url = URL.createObjectURL(new Blob([bytes], { type: mime })); const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function csv(rows: string[][]) { return "\ufeff" + rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(";")).join("\n"); }
function taxOf(s: TaxAwareSale) { return splitSiiTotal(Number(s.total) || 0, s.tax_treatment === "exento" ? "exento" : "gravado_19"); }
function salesCsv(sales: TaxAwareSale[]) {
  return csv([["fecha", "id_venta", "cliente", "tratamiento", "neto", "iva", "total"], ...sales.map((s) => { const t = taxOf(s); return [new Date(s.sale_date).toLocaleDateString("es-CL"), s.id, s.customer_name || "Consumidor final", siiTreatmentLabel(s.tax_treatment === "exento" ? "exento" : "gravado_19"), String(t.net), String(t.iva), String(t.total)]; })]);
}
function taxSummaryCsv(sales: TaxAwareSale[]) {
  const totals = sales.reduce((a, s) => { const t = taxOf(s); a.net += t.net; a.iva += t.iva; a.total += t.total; if (s.tax_treatment === "exento") a.exento += t.net; return a; }, { net: 0, iva: 0, total: 0, exento: 0 });
  return csv([["indicador", "valor_clp"], ["operaciones", String(sales.length)], ["neto_total", String(totals.net)], ["exento", String(totals.exento)], ["iva_19_estimado", String(totals.iva)], ["total", String(totals.total)]]);
}
function validationReport(business: Business, sales: TaxAwareSale[]) {
  const missingBusinessRut = !business.tax_id, missingBusinessName = !business.name, missingCustomer = sales.filter((s) => !s.customer_name).length;
  const hasExempt = sales.some((s) => s.tax_treatment === "exento");
  const lines = ["NÜVA ONE · SII READY · CONTROL DE CALIDAD", "", `Generado: ${new Date().toLocaleString("es-CL")}`, `Empresa: ${business.name || "Pendiente"}`, `RUT empresa: ${business.tax_id || "Pendiente"}`, `Operaciones: ${sales.length}`, "", "VALIDACIONES PREVIAS", `[${missingBusinessName ? "!" : "OK"}] Razón social empresa informada`, `[${missingBusinessRut ? "!" : "OK"}] RUT empresa informado`, `[${missingCustomer ? "!" : "OK"}] Cliente/receptor informado en todas las operaciones`, `[${hasExempt ? "OK" : "INFO"}] Tratamientos tributarios identificados; revisar tipo de DTE antes de emitir.`, "[INFO] No se valida folio, timbre, firma electrónica ni recepción SII desde Nüva.", "", "RESULTADO", missingBusinessName || missingBusinessRut ? "REQUIERE COMPLETAR DATOS DE EMPRESA" : missingCustomer ? "REQUIERE REVISAR RECEPTORES" : "LISTO PARA REVISIÓN HUMANA"];
  return lines.join("\n") + "\n";
}
function checklist(business: Business, sales: TaxAwareSale[]) {
  return `# Nüva One · SII Ready\n\n## Expediente de preparación\n\n- Empresa: ${business.name || "Pendiente"}\n- RUT: ${business.tax_id || "Pendiente"}\n- Fecha: ${new Date().toLocaleDateString("es-CL")}\n- Operaciones incluidas: ${sales.length}\n\n## Checklist antes de emitir\n\n- [ ] Revisar razón social y RUT de la empresa.\n- [ ] Revisar cada operación y su receptor.\n- [ ] Confirmar tipo de DTE correspondiente.\n- [ ] Confirmar tratamiento tributario: gravado 19% o exento.\n- [ ] Confirmar neto, exento, IVA y total.\n- [ ] Emitir el documento en el canal oficial del SII.\n- [ ] Registrar en Nüva el folio oficial después de emitir.\n- [ ] Adjuntar el PDF oficial cuando esté disponible.\n- [ ] Guardar este expediente junto con el respaldo oficial.\n\n> Este archivo es material de preparación y control. No es un DTE emitido, no contiene timbre electrónico ni acredita recepción o validación del SII.\n`;
}
function manifest(business: Business, sales: TaxAwareSale[], date: string) {
  const total = sales.reduce((sum, s) => sum + taxOf(s).total, 0);
  return JSON.stringify({ product: "Nüva One", pack: "SII Ready", version: "2.1", generated_at: new Date().toISOString(), business: { name: business.name ?? null, tax_id: business.tax_id ?? null }, scope: { operations: sales.length, total_clp: total }, status: "prepared_for_human_review", official_sii_validation: false, tax_treatments: { gravado_19: sales.filter((s) => s.tax_treatment !== "exento").length, exento: sales.filter((s) => s.tax_treatment === "exento").length }, files: ["01_EXPEDIENTE/expediente-sii-ready.pdf", "02_DATOS/ventas-sii-ready.csv", "02_DATOS/resumen-tributario-estimado.csv", "03_CONTROL/checklist-sii-ready.md", "03_CONTROL/validacion-previa.txt", "04_CONTROL/MANIFEST.json", "04_CONTROL/README.txt"], generated_date: date }, null, 2) + "\n";
}
export async function downloadSiiReadyPack(sales: PendingSaleForDeclaration[], business: Business) {
  if (!sales.length) throw new Error("No hay operaciones pendientes para preparar el expediente");
  const taxAware = sales as TaxAwareSale[];
  const pdfBase64 = await generateSiiDeclarationPdf(sales, business), binary = atob(pdfBase64), pdf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) pdf[i] = binary.charCodeAt(i);
  const date = new Date().toISOString().slice(0, 10);
  const files: PackFile[] = [
    { name: "01_EXPEDIENTE/expediente-sii-ready.pdf", data: pdf },
    { name: "02_DATOS/ventas-sii-ready.csv", data: encoder.encode(salesCsv(taxAware)) },
    { name: "02_DATOS/resumen-tributario-estimado.csv", data: encoder.encode(taxSummaryCsv(taxAware)) },
    { name: "03_CONTROL/checklist-sii-ready.md", data: encoder.encode(checklist(business, taxAware)) },
    { name: "03_CONTROL/validacion-previa.txt", data: encoder.encode(validationReport(business, taxAware)) },
    { name: "04_CONTROL/MANIFEST.json", data: encoder.encode(manifest(business, taxAware, date)) },
    { name: "04_CONTROL/README.txt", data: encoder.encode("Nüva One · SII Ready v2.1\n\nPaquete de preparación y control para revisión humana y posterior emisión en el canal oficial del SII.\nIncluye expediente PDF, datos tabulares, resumen tributario, checklist, control de calidad y manifiesto.\nNo contiene DTE emitidos, timbre electrónico, firma digital ni validación oficial del SII.\n\nAntes de emitir: revisar tratamiento tributario, receptor, tipo de documento y montos.\nDespués de emitir: registrar el folio real y conservar el respaldo oficial junto con este expediente.\n") },
  ];
  download(zip(files), `nuva-sii-ready-${date}.zip`);
}
