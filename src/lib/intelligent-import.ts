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

export type ImportMappingQuality = "high" | "review" | "weak";

export type ImportAnalysis = {
  detections: FieldDetection[];
  rows: IntelligentImportRow[];
  headers: string[];
  quality: ImportMappingQuality;
  unmappedHeaders: string[];
  duplicateIdentifiers: string[];
};

const aliases: Record<CanonicalImportField, string[]> = {
  name: [
    "nombre", "nombre producto", "nombre articulo", "nombre artículo", "producto", "articulo", "artículo",
    "descripcion", "descripción", "descripcion producto", "detalle", "item", "ítem", "product", "product name",
    "description", "name", "title", "item name", "item description", "article",
  ],
  sku: [
    "sku", "codigo sku", "código sku", "cod sku", "codigo interno", "código interno", "codigo producto",
    "código producto", "codigo de producto", "código de producto", "codigo articulo", "código artículo",
    "referencia", "referencia producto", "ref", "ref producto", "codigo", "código", "cod", "product code",
    "item code", "item number", "part number", "part no", "model", "modelo", "reference", "internal code",
  ],
  barcode: [
    "codigo de barras", "código de barras", "codigo barra", "código barra", "barra", "ean", "ean13", "ean 13",
    "ean 8", "ean8", "upc", "upca", "upc a", "gtin", "gtin13", "gtin 13", "barcode", "bar code",
    "isbn", "codigo barras", "código barras",
  ],
  stock: [
    "stock", "existencia", "existencias", "inventario", "cantidad", "cant", "qty", "quantity", "unidades",
    "uds", "disponible", "disponibles", "saldo", "saldo stock", "on hand", "physical stock", "stock actual",
    "cantidad disponible", "available", "available qty", "units", "units on hand",
  ],
  cost: [
    "costo", "coste", "costo unitario", "coste unitario", "precio costo", "precio de costo", "valor compra",
    "precio compra", "precio de compra", "compra", "costo adquisicion", "costo adquisición", "unit cost", "cost",
    "purchase price", "buy price", "landed cost", "unit purchase cost",
  ],
  price: [
    "precio", "precio venta", "precio de venta", "valor venta", "valor de venta", "pvp", "pv", "retail",
    "sale price", "selling price", "unit price", "precio unitario", "precio publico", "precio público", "venta",
    "retail price", "list price",
  ],
  minimum: [
    "minimo", "mínimo", "stock minimo", "stock mínimo", "min", "min stock", "min level", "minimum",
    "minimum stock", "nivel minimo", "nivel mínimo", "stock de seguridad", "safety stock", "minimum level",
  ],
  reorderPoint: [
    "punto de pedido", "punto pedido", "reposicion", "reposición", "reorder", "reorder point", "reorder level",
    "nivel reposicion", "nivel reposición", "pedido minimo", "pedido mínimo", "punto reposicion", "punto reposición",
    "rop", "reorder threshold",
  ],
  maxStock: [
    "maximo", "máximo", "stock maximo", "stock máximo", "max", "max stock", "maximum", "target stock",
    "stock objetivo", "objetivo", "tope", "maximum stock", "target level", "nivel objetivo",
  ],
  category: [
    "categoria", "categoría", "familia", "rubro", "tipo", "grupo", "linea", "línea", "subcategoria", "subcategoría",
    "category", "family", "group", "department", "departamento", "class", "product category",
  ],
};

const fields = Object.keys(aliases) as CanonicalImportField[];

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
  if (a.includes(b) || b.includes(a)) return 0.88;
  const aa = new Set(a.split(" ").filter(Boolean));
  const bb = new Set(b.split(" ").filter(Boolean));
  const intersection = [...aa].filter((x) => bb.has(x)).length;
  const union = new Set([...aa, ...bb]).size;
  return union ? intersection / union : 0;
}

function looksNumeric(value: string): boolean {
  return parseNumber(value) !== null;
}

function valueShape(field: CanonicalImportField, values: string[]): number {
  const sample = values.map((v) => v.trim()).filter(Boolean).slice(0, 40);
  if (!sample.length) return 0;
  if (["stock", "cost", "price", "minimum", "reorderPoint", "maxStock"].includes(field)) {
    const numeric = sample.filter(looksNumeric).length / sample.length;
    return numeric >= 0.9 ? 0.14 : numeric >= 0.7 ? 0.06 : 0;
  }
  if (field === "barcode") {
    const coded = sample.filter((v) => /^[0-9]{6,18}$/.test(v.replace(/\s/g, ""))).length / sample.length;
    return coded >= 0.8 ? 0.16 : coded >= 0.6 ? 0.07 : 0;
  }
  if (field === "sku") {
    const coded = sample.filter((v) => /^[A-Z0-9][A-Z0-9._/-]{2,31}$/i.test(v.replace(/\s/g, ""))).length / sample.length;
    return coded >= 0.75 ? 0.1 : coded >= 0.5 ? 0.04 : 0;
  }
  if (field === "name") {
    const descriptive = sample.filter((v) => /[a-záéíóúñü]/i.test(v) && v.length >= 3).length / sample.length;
    return descriptive >= 0.8 ? 0.08 : descriptive >= 0.5 ? 0.03 : 0;
  }
  return 0;
}

function scoreField(field: CanonicalImportField, header: string, values: string[]): { score: number; alias: string } {
  const normalized = normalize(header);
  let best = { score: 0, alias: "" };
  for (const alias of aliases[field]) {
    const score = similarity(normalized, normalize(alias));
    if (score > best.score) best = { score, alias };
  }
  let score = best.score + valueShape(field, values);
  if ((normalized === "codigo" || normalized === "cod") && field === "barcode") {
    const numericCodes = values.map((value) => value.trim()).filter(Boolean).filter((value) => /^[0-9]{6,18}$/.test(value.replace(/\s/g, "")));
    if (numericCodes.length >= Math.max(1, Math.ceil(values.filter((value) => value.trim()).length * 0.8))) score += 0.2;
  }
  return { score: Math.min(1.2, score), alias: best.alias };
}

export function detectField(header: string, values: string[]): FieldDetection | null {
  const normalized = normalize(header);
  if (!normalized) return null;
  const candidates = fields
    .map((field) => ({ field, ...scoreField(field, header, values) }))
    .sort((a, b) => b.score - a.score);
  const best = candidates[0];
  const second = candidates[1];
  if (!best || best.score < 0.52) return null;
  const confidence = Math.min(0.99, Math.max(0.52, best.score));
  const ambiguous = second && best.score - second.score < 0.08;
  return {
    field: best.field,
    sourceHeader: header,
    confidence: ambiguous ? Math.min(confidence, 0.76) : confidence,
    reason: ambiguous
      ? `Ambiguo entre ${best.field} y ${second.field}; se priorizó ${best.field} por el contenido.`
      : best.alias === normalized ? "Coincidencia exacta" : `Relacionado con “${best.alias}” y validado por el contenido`,
  };
}

export function detectColumns(headers: string[], rows: Record<string, string>[]): FieldDetection[] {
  const candidates = headers.flatMap((header) => {
    const values = rows.map((row) => row[header] ?? "");
    return fields.map((field) => ({ header, field, ...scoreField(field, header, values) }));
  });
  const selected: FieldDetection[] = [];
  const usedHeaders = new Set<string>();
  const usedFields = new Set<CanonicalImportField>();

  while (true) {
    const available = candidates
      .filter((c) => !usedHeaders.has(c.header) && !usedFields.has(c.field) && c.score >= 0.52)
      .sort((a, b) => b.score - a.score);
    const best = available[0];
    if (!best) break;
    const alternatives = candidates
      .filter((c) => c.header === best.header && c.field !== best.field)
      .sort((a, b) => b.score - a.score);
    const second = alternatives[0];
    const confidence = Math.min(0.99, Math.max(0.52, best.score));
    const ambiguous = second && best.score - second.score < 0.08;
    selected.push({
      field: best.field,
      sourceHeader: best.header,
      confidence: ambiguous ? Math.min(confidence, 0.76) : confidence,
      reason: ambiguous
        ? `Ambiguo; se priorizó ${best.field} por el contenido de la columna.`
        : best.score >= 1 ? "Coincidencia semántica fuerte + contenido compatible" : `Relacionado con “${best.alias}”`,
    });
    usedHeaders.add(best.header);
    usedFields.add(best.field);
  }
  const headerOrder = new Map(headers.map((header, index) => [header, index]));
  return selected.sort((a, b) => (headerOrder.get(a.sourceHeader) ?? Number.MAX_SAFE_INTEGER) - (headerOrder.get(b.sourceHeader) ?? Number.MAX_SAFE_INTEGER));
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
  const negative = /^\(.*\)$/.test(raw);
  raw = raw.replace(/^\(|\)$/g, "");
  if (raw.includes(",") && raw.includes(".")) {
    raw = raw.lastIndexOf(",") > raw.lastIndexOf(".") ? raw.replace(/\./g, "").replace(",", ".") : raw.replace(/,/g, "");
  } else if (raw.includes(",")) {
    const decimals = raw.split(",")[1];
    raw = decimals && decimals.length <= 2 ? raw.replace(",", ".") : raw.replace(/,/g, "");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
    raw = raw.replace(/\./g, "");
  }
  const number = Number(raw.replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(number)) return null;
  return negative ? -Math.abs(number) : number;
}

export function buildIntelligentRows(text: string): ImportAnalysis {
  const rawRows = parseDelimited(text);
  const headers = rawRows.length ? Object.keys(rawRows[0]) : [];
  const detections = detectColumns(headers, rawRows);
  const detectedHeaders = new Set(detections.map((d) => d.sourceHeader));
  const unmappedHeaders = headers.filter((header) => !detectedHeaders.has(header));
  const rows = rawRows.map((raw, index) => {
    const mapped: Partial<Record<CanonicalImportField, string>> = {};
    const rowDetections = detections;
    for (const detection of detections) {
      const value = raw[detection.sourceHeader]?.trim();
      if (value) mapped[detection.field] = value;
    }
    const warnings: string[] = [];
    if (!mapped.name) warnings.push("No se identificó una columna de nombre/producto.");
    if (!mapped.sku && !mapped.barcode) warnings.push("No hay identificador único claro; Nüva usará el nombre con cautela.");
    if (mapped.stock && parseNumber(mapped.stock) === null) warnings.push("Stock no numérico: revisar antes de importar.");
    if (detections.some((d) => d.confidence < 0.8)) warnings.push("Hay columnas con confianza media; conviene revisar el mapeo antes de importar.");
    return { rowNumber: index + 2, raw, mapped, detections: rowDetections, warnings };
  });

  const identifiers = rows
    .map((row) => normalize(row.mapped.sku || row.mapped.barcode || row.mapped.name || ""))
    .filter(Boolean);
  const counts = new Map<string, number>();
  identifiers.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
  const duplicateIdentifiers = [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
  const duplicateSet = new Set(duplicateIdentifiers);
  rows.forEach((row) => {
    const id = normalize(row.mapped.sku || row.mapped.barcode || row.mapped.name || "");
    if (id && duplicateSet.has(id)) row.warnings.push("Identificador repetido dentro del archivo; Nüva no debe fusionarlo a ciegas.");
  });

  const averageConfidence = detections.length
    ? detections.reduce((sum, detection) => sum + detection.confidence, 0) / detections.length
    : 0;
  const quality: ImportMappingQuality = !detections.length || averageConfidence < 0.65 || !rows.some((row) => row.mapped.name)
    ? "weak"
    : averageConfidence < 0.82 || rows.some((row) => row.warnings.length)
      ? "review"
      : "high";

  return { detections, rows, headers, quality, unmappedHeaders, duplicateIdentifiers };
}