export type CanonicalImportField =
  | "name"
  | "sku"
  | "barcode"
  | "stock"
  | "cost"
  | "price"
  | "minimum"
  | "reorderPoint"
  | "maxStock"
  | "category";

export type FieldDetection = {
  field: CanonicalImportField;
  sourceHeader: string;
  confidence: number;
  reason: string;
};

export type IntelligentImportRow = {
  rowNumber: number;
  raw: Record<string, string>;
  mapped: Partial<Record<CanonicalImportField, string>>;
  detections: FieldDetection[];
  warnings: string[];
};

const aliases: Record<CanonicalImportField, string[]> = {
  name: ["nombre", "producto", "articulo", "artículo", "descripcion", "descripción", "detalle", "item", "ítem", "product", "description", "name"],
  sku: ["sku", "codigo sku", "código sku", "cod sku", "referencia", "ref", "codigo interno", "código interno", "codigo producto", "código producto", "product code", "item code", "item number", "part number", "modelo"],
  barcode: ["codigo de barras", "código de barras", "barra", "ean", "ean13", "ean 13", "upc", "gtin", "barcode", "codigo barra", "código barra"],
  stock: ["stock", "existencia", "existencias", "inventario", "cantidad", "cant", "qty", "quantity", "unidades", "uds", "disponible", "saldo", "saldo stock", "on hand", "physical stock"],
  cost: ["costo", "coste", "costo unitario", "coste unitario", "precio costo", "precio de costo", "valor compra", "compra", "unit cost", "cost", "purchase price"],
  price: ["precio", "precio venta", "precio de venta", "valor venta", "pvp", "pv", "retail", "sale price", "selling price", "unit price", "venta"],
  minimum: ["minimo", "mínimo", "stock minimo", "stock mínimo", "min", "min stock", "min level", "minimum", "minimum stock", "nivel minimo", "nivel mínimo"],
  reorderPoint: ["punto de pedido", "punto pedido", "reposicion", "reposición", "reorder", "reorder point", "reorder level", "nivel reposicion", "nivel reposición", "pedido minimo", "pedido mínimo"],
  maxStock: ["maximo", "máximo", "stock maximo", "stock máximo", "max", "max stock", "maximum", "target stock", "stock objetivo", "objetivo", "tope"],
  category: ["categoria", "categoría", "familia", "rubro", "tipo", "grupo", "linea", "línea", "category", "family", "group"],
};

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_./\\-]+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  if (a.includes(b) || b.includes(a)) return 0.9;
  const aa = new Set(a.split(" ").filter(Boolean));
  const bb = new Set(b.split(" ").filter(Boolean));
  const intersection = [...aa].filter((x) => bb.has(x)).length;
  const union = new Set([...aa, ...bb]).size;
  return union ? intersection / union : 0;
}

function valueShape(field: CanonicalImportField, values: string[]): number {
  const sample = values.filter(Boolean).slice(0, 30);
  if (!sample.length) return 0;
  if (["stock", "cost", "price", "minimum", "reorderPoint", "maxStock"].includes(field)) {
    const numeric = sample.filter((v) => parseNumber(v) !== null).length / sample.length;
    return numeric >= 0.8 ? 0.08 : 0;
  }
  if (field === "barcode") {
    const coded = sample.filter((v) => /^[0-9A-Z-]{6,32}$/i.test(v.replace(/\s/g, ""))).length / sample.length;
    return coded >= 0.7 ? 0.08 : 0;
  }
  return 0;
}

export function detectField(header: string, values: string[]): FieldDetection | null {
  const normalized = normalize(header);
  if (!normalized) return null;
  let best: { field: CanonicalImportField; score: number; alias: string } | null = null;
  for (const [field, fieldAliases] of Object.entries(aliases) as [CanonicalImportField, string[]][]) {
    for (const alias of fieldAliases) {
      const score = similarity(normalized, normalize(alias)) + valueShape(field, values);
      if (!best || score > best.score) best = { field, score, alias };
    }
  }
  if (!best || best.score < 0.52) return null;
  const confidence = Math.min(0.99, Math.max(0.52, best.score));
  return {
    field: best.field,
    sourceHeader: header,
    confidence,
    reason: best.alias === normalized ? "Coincidencia exacta" : `Relacionado con “${best.alias}”`,
  };
}

export function detectColumns(headers: string[], rows: Record<string, string>[]): FieldDetection[] {
  const used = new Set<CanonicalImportField>();
  return headers
    .map((header) => {
      const detection = detectField(header, rows.map((row) => row[header] ?? ""));
      if (!detection || used.has(detection.field)) return null;
      used.add(detection.field);
      return detection;
    })
    .filter((x): x is FieldDetection => Boolean(x));
}

export function parseDelimited(text: string): Record<string, string>[] {
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) return [];
  const delimiter = detectDelimiter(lines[0]);
  const rows = lines.map((line) => splitLine(line, delimiter));
  const headers = rows[0].map((h, index) => h.trim() || `Columna ${index + 1}`);
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? "").trim()])));
}

function detectDelimiter(header: string): string {
  const candidates = [";", "\t", ",", "|"];
  return candidates.sort((a, b) => splitLine(header, b).length - splitLine(header, a).length)[0];
}

function splitLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { current += '"'; i += 1; } else quoted = !quoted;
    } else if (char === delimiter && !quoted) { result.push(current); current = ""; } else current += char;
  }
  result.push(current);
  return result;
}

export function parseNumber(value: string | null | undefined): number | null {
  if (value == null || !String(value).trim()) return null;
  let raw = String(value).trim().replace(/\s/g, "").replace(/[$€£CLPUSD]/gi, "");
  if (raw.includes(",") && raw.includes(".")) {
    raw = raw.lastIndexOf(",") > raw.lastIndexOf(".") ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/,/g, "");
  } else if (raw.includes(",")) {
    const decimals = raw.split(",")[1];
    raw = decimals && decimals.length <= 2 ? raw.replace(",", ".") : raw.replace(/,/g, "");
  }
  const number = Number(raw.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(number) ? number : null;
}

export function buildIntelligentRows(text: string): { detections: FieldDetection[]; rows: IntelligentImportRow[]; headers: string[] } {
  const rawRows = parseDelimited(text);
  const headers = rawRows.length ? Object.keys(rawRows[0]) : [];
  const detections = detectColumns(headers, rawRows);
  const rows = rawRows.map((raw, index) => {
    const mapped: Partial<Record<CanonicalImportField, string>> = {};
    const rowDetections: FieldDetection[] = [];
    for (const detection of detections) {
      const value = raw[detection.sourceHeader]?.trim();
      if (value) mapped[detection.field] = value;
      rowDetections.push(detection);
    }
    const warnings: string[] = [];
    if (!mapped.name) warnings.push("No se identificó una columna de nombre/producto.");
    if (!mapped.sku && !mapped.barcode) warnings.push("No hay identificador único claro; Nüva usará el nombre con cautela.");
    if (mapped.stock && parseNumber(mapped.stock) === null) warnings.push("Stock no numérico: revisar antes de importar.");
    return { rowNumber: index + 2, raw, mapped, detections: rowDetections, warnings };
  });
  return { detections, rows, headers };
}
