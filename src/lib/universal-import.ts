export type ImportSourceFormat = "csv" | "tsv" | "txt" | "xlsx" | "xls";

export type SavedImportMapping = Record<string, string>;

const STORAGE_PREFIX = "nuva:import-profile:v1:";

function normalizeHeader(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function saveImportMapping(businessId: string, mapping: SavedImportMapping) {
  if (typeof window === "undefined") return;
  const clean = Object.fromEntries(Object.entries(mapping).filter(([header, field]) => header && field));
  window.localStorage.setItem(`${STORAGE_PREFIX}${businessId}`, JSON.stringify(clean));
}

export function getImportMapping(businessId: string | null | undefined): SavedImportMapping {
  if (typeof window === "undefined" || !businessId) return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(`${STORAGE_PREFIX}${businessId}`) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as SavedImportMapping) : {};
  } catch { return {}; }
}

export function applySavedImportMapping(text: string, businessId: string | null | undefined): string {
  const mapping = getImportMapping(businessId);
  if (!Object.keys(mapping).length) return text;
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  if (!lines.length) return text;
  const delimiter = detectDelimiter(lines[0]);
  const mapped = splitLine(lines[0], delimiter).map((cell) => mapping[normalizeHeader(cell)] ?? cell);
  return [mapped.join(delimiter), ...lines.slice(1)].join("\n");
}

export async function readImportFile(file: File): Promise<{ text: string; format: ImportSourceFormat; sheetNames: string[] }> {
  const name = file.name.toLowerCase();
  if (/\.xlsx$/i.test(name)) return { ...(await readXlsx(file)), format: "xlsx" };
  if (/\.xls$/i.test(name)) throw new Error("El formato XLS antiguo no es seguro de interpretar en el navegador. Guarda el archivo como XLSX o CSV UTF-8.");
  return { text: await file.text(), format: /\.tsv$/i.test(name) ? "tsv" : /\.txt$/i.test(name) ? "txt" : "csv", sheetNames: [] };
}

function detectDelimiter(line: string): string {
  return [";", "\t", ",", "|"].reduce((best, candidate) => splitLine(line, candidate).length > splitLine(line, best).length ? candidate : best, ",");
}

function splitLine(line: string, delimiter: string): string[] {
  const result: string[] = []; let current = ""; let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') { if (quoted && line[i + 1] === '"') { current += '"'; i += 1; } else quoted = !quoted; }
    else if (char === delimiter && !quoted) { result.push(current); current = ""; } else current += char;
  }
  result.push(current); return result;
}

async function readXlsx(file: File): Promise<{ text: string; sheetNames: string[] }> {
  if (typeof DecompressionStream === "undefined") throw new Error("Este navegador no dispone del descompresor ZIP necesario para leer XLSX. Usa un navegador actualizado o CSV UTF-8.");
  const zip = new ZipReader(await file.arrayBuffer());
  const workbook = parseXml(await zip.text("xl/workbook.xml"));
  const relationships = parseXml(await zip.text("xl/_rels/workbook.xml.rels"));
  const relTargets = new Map<string, string>();
  for (const rel of Array.from(relationships.getElementsByTagNameNS("*", "Relationship"))) {
    const id = rel.getAttribute("Id"); const target = rel.getAttribute("Target");
    if (id && target) relTargets.set(id, target.replace(/^\//, "").startsWith("xl/") ? target.replace(/^\//, "") : `xl/${target.replace(/^\//, "")}`);
  }
  const sheets = Array.from(workbook.getElementsByTagNameNS("*", "sheet"));
  if (!sheets.length) throw new Error("El XLSX no contiene hojas legibles.");
  const sheetNames = sheets.map((sheet) => sheet.getAttribute("name") || "Hoja");
  const sharedStrings = await loadSharedStrings(zip); const outputs: string[] = [];
  for (let i = 0; i < sheets.length; i += 1) {
    const rid = sheets[i].getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") || sheets[i].getAttribute("r:id");
    const target = rid ? relTargets.get(rid) : `xl/worksheets/sheet${i + 1}.xml`;
    if (!target || !(await zip.has(target))) continue;
    const rows = xmlSheetToRows(parseXml(await zip.text(target)), sharedStrings);
    if (rows.length) outputs.push(rows.map((row) => row.map(escapeCsv).join(",")).join("\n"));
  }
  if (!outputs.length) throw new Error("No encontré datos tabulares legibles dentro del XLSX.");
  return { text: outputs[0], sheetNames };
}

async function loadSharedStrings(zip: ZipReader): Promise<string[]> {
  if (!(await zip.has("xl/sharedStrings.xml"))) return [];
  const xml = parseXml(await zip.text("xl/sharedStrings.xml"));
  return Array.from(xml.getElementsByTagNameNS("*", "si")).map((si) => Array.from(si.getElementsByTagNameNS("*", "t")).map((t) => t.textContent || "").join(""));
}

function xmlSheetToRows(xml: Document, shared: string[]): string[][] {
  const rows: string[][] = [];
  for (const rowNode of Array.from(xml.getElementsByTagNameNS("*", "row"))) {
    const values: string[] = []; let cursor = 0;
    for (const cell of Array.from(rowNode.getElementsByTagNameNS("*", "c"))) {
      const ref = cell.getAttribute("r") || ""; const match = ref.match(/[A-Z]+/i); const col = match ? columnNumber(match[0]) : cursor;
      while (values.length < col) values.push("");
      const type = cell.getAttribute("t"); const node = cell.getElementsByTagNameNS("*", type === "inlineStr" ? "t" : "v")[0]; let value = node?.textContent || "";
      if (type === "s") value = shared[Number(value)] ?? ""; if (type === "b") value = value === "1" ? "TRUE" : "FALSE";
      values[col] = value; cursor = col + 1;
    }
    while (values.length && values[values.length - 1] === "") values.pop(); if (values.length) rows.push(values);
  }
  return rows;
}

function columnNumber(letters: string): number { let value = 0; for (const letter of letters.toUpperCase()) value = value * 26 + letter.charCodeAt(0) - 64; return value - 1; }
function escapeCsv(value: string): string { return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value; }
function parseXml(text: string): Document { const document = new DOMParser().parseFromString(text, "application/xml"); if (document.querySelector("parsererror")) throw new Error("El archivo contiene XML inválido."); return document; }

class ZipReader {
  private readonly bytes: Uint8Array;
  private readonly entries = new Map<string, { method: number; compressedSize: number; localOffset: number }>();
  constructor(buffer: ArrayBuffer) {
    this.bytes = new Uint8Array(buffer); const end = Math.max(0, this.bytes.length - 65557); let eocd = -1;
    for (let i = this.bytes.length - 22; i >= end; i -= 1) if (this.u32(i) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error("El archivo no parece ser un ZIP/XLSX válido.");
    const count = this.u16(eocd + 10); let offset = this.u32(eocd + 16);
    for (let i = 0; i < count; i += 1) {
      if (this.u32(offset) !== 0x02014b50) break;
      const method = this.u16(offset + 10); const compressedSize = this.u32(offset + 20); const nameLength = this.u16(offset + 28); const extraLength = this.u16(offset + 30); const commentLength = this.u16(offset + 32); const localOffset = this.u32(offset + 42);
      const name = new TextDecoder().decode(this.bytes.slice(offset + 46, offset + 46 + nameLength)); this.entries.set(name, { method, compressedSize, localOffset }); offset += 46 + nameLength + extraLength + commentLength;
    }
  }
  has(name: string) { return this.entries.has(name); }
  async text(name: string): Promise<string> { return new TextDecoder().decode(await this.bytesFor(name)); }
  private async bytesFor(name: string): Promise<Uint8Array> {
    const entry = this.entries.get(name); if (!entry) throw new Error(`No se encontró ${name} dentro del XLSX.`);
    const local = entry.localOffset; const nameLength = this.u16(local + 26); const extraLength = this.u16(local + 28); const start = local + 30 + nameLength + extraLength; const compressed = this.bytes.slice(start, start + entry.compressedSize);
    if (entry.method === 0) return compressed; if (entry.method !== 8) throw new Error(`Compresión ZIP no compatible para ${name}.`);
    const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw")); return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  private u16(offset: number) { return this.bytes[offset] | (this.bytes[offset + 1] << 8); }
  private u32(offset: number) { return (this.bytes[offset] | (this.bytes[offset + 1] << 8) | (this.bytes[offset + 2] << 16) | (this.bytes[offset + 3] << 24)) >>> 0; }
}
