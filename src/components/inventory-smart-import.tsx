import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { adjustInventoryStock } from "@/lib/inventory-transactions";
import { buildIntelligentRows, parseNumber, type CanonicalImportField, type IntelligentImportRow, type ImportMappingQuality } from "@/lib/intelligent-import";
import { applySavedImportMapping, readImportFile, saveImportMapping } from "@/lib/universal-import";
import { useActiveBusinessId, useMyRole, canWriteOperations } from "@/lib/use-business";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const labels: Record<CanonicalImportField, string> = {
  name: "Producto", sku: "SKU / referencia", barcode: "Código de barras", stock: "Stock", cost: "Costo", price: "Precio",
  minimum: "Mínimo", reorderPoint: "Punto de reposición", maxStock: "Stock objetivo", category: "Categoría",
};
const qualityLabels: Record<ImportMappingQuality, string> = { high: "Mapeo automático", review: "Revisión recomendada", weak: "Mapeo insuficiente" };

export function InventorySmartImport() {
  const [businessId] = useActiveBusinessId();
  const { data: role } = useMyRole();
  const canWrite = canWriteOperations(role);
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<IntelligentImportRow[]>([]);
  const [detections, setDetections] = useState<{ field: CanonicalImportField; sourceHeader: string; confidence: number; reason: string }[]>([]);
  const [unmappedHeaders, setUnmappedHeaders] = useState<string[]>([]);
  const [duplicateIdentifiers, setDuplicateIdentifiers] = useState<string[]>([]);
  const [quality, setQuality] = useState<ImportMappingQuality>("weak");
  const [busy, setBusy] = useState(false);
  const [format, setFormat] = useState("");
  const [sheets, setSheets] = useState<string[]>([]);

  const stats = useMemo(() => {
    const blocked = new Set(duplicateIdentifiers);
    const ready = rows.filter((row) => {
      const identifier = (row.mapped.sku || row.mapped.barcode || row.mapped.name || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      return Boolean(row.mapped.name) && (!row.mapped.stock || parseNumber(row.mapped.stock) !== null) && (!identifier || !blocked.has(identifier));
    }).length;
    return { ready, warnings: rows.filter((row) => row.warnings.length).length, blocked: rows.filter((row) => row.warnings.some((warning) => warning.includes("Identificador repetido"))).length };
  }, [rows, duplicateIdentifiers]);

  async function readFile(file: File) {
    setFileName(file.name); setBusy(true);
    try {
      const imported = await readImportFile(file);
      const text = applySavedImportMapping(imported.text, businessId);
      const result = buildIntelligentRows(text);
      setFormat(imported.format.toUpperCase()); setSheets(imported.sheetNames);
      setRows(result.rows); setDetections(result.detections); setUnmappedHeaders(result.unmappedHeaders); setDuplicateIdentifiers(result.duplicateIdentifiers); setQuality(result.quality);
      if (businessId && result.detections.length) saveImportMapping(businessId, Object.fromEntries(result.detections.map((d) => [d.sourceHeader, d.field])));
      if (!result.rows.length) toast.error("No encontré filas legibles en el archivo.");
      else if (result.quality === "weak") toast.warning("No tengo suficiente evidencia para importar automáticamente este archivo.");
      else toast.success(`Analicé ${result.rows.length} filas y detecté ${result.detections.length} campos.`);
    } catch (error) {
      setRows([]); setDetections([]); setUnmappedHeaders([]); setDuplicateIdentifiers([]); setQuality("weak");
      toast.error(error instanceof Error ? error.message : "No pude interpretar el archivo.");
    } finally { setBusy(false); }
  }

  async function importRows() {
    if (!businessId || !canWrite || !rows.length) return;
    if (quality === "weak") return toast.error("El mapeo no es suficientemente confiable para importar.");
    if (duplicateIdentifiers.length) return toast.error("Hay identificadores repetidos dentro del archivo. Corrígelos antes de importar para evitar fusiones incorrectas.");
    const valid = rows.filter((row) => row.mapped.name && (!row.mapped.stock || parseNumber(row.mapped.stock) !== null));
    if (!valid.length) return toast.error("No hay filas válidas para importar.");
    setBusy(true);
    let created = 0; let updated = 0; let adjusted = 0; let skipped = 0;
    try {
      for (const row of valid) {
        const m = row.mapped; const name = String(m.name).trim(); const sku = m.sku?.trim() || null; const barcode = m.barcode?.trim() || null;
        let query = supabase.from("products").select("id,name,sku,barcode,stock").eq("business_id", businessId).limit(1);
        if (sku) query = query.eq("sku", sku) as typeof query; else if (barcode) query = query.eq("barcode", barcode) as typeof query; else query = query.ilike("name", name) as typeof query;
        const { data: existing, error: findError } = await query; if (findError) throw findError;
        const current = existing?.[0];
        const payload: Record<string, unknown> = { business_id: businessId, name, sku, barcode, cost: parseNumber(m.cost) ?? 0, price: parseNumber(m.price) ?? 0, low_stock_threshold: parseNumber(m.minimum) ?? 0, reorder_point: parseNumber(m.reorderPoint) ?? 0, max_stock: parseNumber(m.maxStock) ?? 0 };
        if (current) {
          const { error } = await supabase.from("products").update(payload as never).eq("id", current.id).eq("business_id", businessId); if (error) throw error; updated += 1;
          const target = parseNumber(m.stock); const delta = target === null ? 0 : target - Number(current.stock ?? 0);
          if (delta) { await adjustInventoryStock(supabase, { productId: current.id, delta, reason: `Importación inteligente · fila ${row.rowNumber}`, sourceType: "smart_import", sourceId: fileName || undefined }); adjusted += 1; }
        } else {
          const { data: product, error } = await supabase.from("products").insert({ ...payload, stock: 0 } as never).select("id").single(); if (error) throw error; created += 1;
          const target = parseNumber(m.stock); if (target) { await adjustInventoryStock(supabase, { productId: product.id, delta: target, reason: `Stock inicial · importación inteligente · fila ${row.rowNumber}`, sourceType: "smart_import", sourceId: fileName || undefined }); adjusted += 1; }
        }
      }
      skipped = rows.length - valid.length;
      toast.success(`Importación terminada: ${created} creados, ${updated} actualizados y ${adjusted} stocks trazados${skipped ? `; ${skipped} omitidos` : ""}.`);
      setRows([]); setDetections([]); setUnmappedHeaders([]); setDuplicateIdentifiers([]); setQuality("weak"); setFileName("");
    } catch (error) { toast.error(error instanceof Error ? error.message : "La importación se detuvo por un error."); }
    finally { setBusy(false); }
  }

  return <Card className="p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" /><h2 className="text-lg font-semibold">Importación inteligente</h2></div><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Nüva interpreta formatos reales de negocio: CSV, TSV y XLSX; combina semántica, forma de los datos y contexto para reconocer SKU, código, referencia, EAN, producto, existencias, precios, costos, mínimos y reposición.</p></div>
      <div className="flex gap-2"><input ref={inputRef} type="file" accept=".csv,.txt,.tsv,.xlsx,.xls" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void readFile(file); e.currentTarget.value = ""; }} /><Button variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}><Upload className="mr-2 h-4 w-4" />Analizar archivo</Button><Button onClick={() => void importRows()} disabled={!canWrite || busy || !stats.ready || quality === "weak"}>{busy ? "Procesando…" : `Importar ${stats.ready} filas`}</Button></div>
    </div>
    {fileName && <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-3 text-sm"><strong>{fileName}</strong><Badge variant={quality === "high" ? "secondary" : "outline"}>{qualityLabels[quality]}</Badge><span>· {format} · {rows.length} filas · {stats.ready} listas · {stats.warnings} advertencias</span>{sheets.length > 1 && <Badge variant="outline">{sheets.length} hojas detectadas</Badge>}{stats.blocked > 0 && <Badge variant="destructive">{stats.blocked} duplicadas</Badge>}</div>}
    {detections.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{detections.map((d) => <div key={d.field} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{labels[d.field]}</span><Badge variant={d.confidence >= 0.9 ? "secondary" : "outline"}>{Math.round(d.confidence * 100)}%</Badge></div><p className="mt-1 text-xs text-muted-foreground">← {d.sourceHeader} · {d.reason}</p></div>)}</div>}
    {(unmappedHeaders.length > 0 || duplicateIdentifiers.length > 0) && <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm"><div className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" />Nüva detectó cosas que no debe adivinar</div>{unmappedHeaders.length > 0 && <p className="mt-1 text-muted-foreground">Columnas sin uso automático: {unmappedHeaders.join(", ")}</p>}{duplicateIdentifiers.length > 0 && <p className="mt-1 text-muted-foreground">Identificadores repetidos: {duplicateIdentifiers.slice(0, 8).join(", ")}{duplicateIdentifiers.length > 8 ? "…" : ""}</p>}</div>}
    {rows.length > 0 && <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="p-2">Fila</th><th className="p-2">Producto</th><th className="p-2">Identificador</th><th className="p-2">Stock</th><th className="p-2">Precio</th><th className="p-2">Resultado</th></tr></thead><tbody>{rows.slice(0, 50).map((row) => <tr key={row.rowNumber} className="border-b"><td className="p-2">{row.rowNumber}</td><td className="p-2 font-medium">{row.mapped.name || "—"}</td><td className="p-2">{row.mapped.sku || row.mapped.barcode || "Nombre"}</td><td className="p-2">{row.mapped.stock || "—"}</td><td className="p-2">{row.mapped.price || "—"}</td><td className="p-2">{row.warnings.length ? <span className="inline-flex items-center gap-1 text-amber-600"><AlertTriangle className="h-4 w-4" />Revisar</span> : <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-4 w-4" />Listo</span>}</td></tr>)}</tbody></table>{rows.length > 50 && <p className="mt-2 text-xs text-muted-foreground">Vista previa limitada a 50 filas; la importación procesa todas las filas válidas.</p>}</div>}
  </Card>;
}
