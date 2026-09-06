import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness, useMyRole, canWriteOperations } from "@/lib/use-business";
import { adjustInventoryStock } from "@/lib/inventory-transactions";
import { buildIntelligentRows, parseNumber, type CanonicalImportField, type IntelligentImportRow } from "@/lib/intelligent-import";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const labels: Record<CanonicalImportField, string> = {
  name: "Producto", sku: "SKU / referencia", barcode: "Código de barras", stock: "Stock", cost: "Costo", price: "Precio",
  minimum: "Mínimo", reorderPoint: "Punto de reposición", maxStock: "Stock objetivo", category: "Categoría",
};

export function InventorySmartImport() {
  const { active } = useActiveBusiness();
  const { data: role } = useMyRole();
  const canWrite = canWriteOperations(role);
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<IntelligentImportRow[]>([]);
  const [detections, setDetections] = useState<{ field: CanonicalImportField; sourceHeader: string; confidence: number; reason: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const stats = useMemo(() => ({
    ready: rows.filter((row) => Boolean(row.mapped.name) && (!row.mapped.stock || parseNumber(row.mapped.stock) !== null)).length,
    warnings: rows.filter((row) => row.warnings.length).length,
  }), [rows]);

  async function readFile(file: File) {
    setFileName(file.name);
    const text = await file.text();
    if (/\.xlsx?$/i.test(file.name)) {
      toast.error("El archivo Excel debe guardarse como CSV UTF-8 para esta versión del importador.");
      setRows([]); setDetections([]); return;
    }
    const result = buildIntelligentRows(text);
    setRows(result.rows);
    setDetections(result.detections);
    if (!result.rows.length) toast.error("No encontré filas legibles en el archivo.");
    else toast.success(`Detecté ${result.detections.length} campos y ${result.rows.length} filas.`);
  }

  async function importRows() {
    if (!active?.id || !canWrite || !rows.length) return;
    const valid = rows.filter((row) => row.mapped.name && (!row.mapped.stock || parseNumber(row.mapped.stock) !== null));
    if (!valid.length) return toast.error("No hay filas válidas para importar.");
    setBusy(true);
    let created = 0; let updated = 0; let adjusted = 0; let skipped = 0;
    try {
      for (const row of valid) {
        const m = row.mapped;
        const name = String(m.name).trim();
        const sku = m.sku?.trim() || null;
        const barcode = m.barcode?.trim() || null;
        let query = supabase.from("products").select("id,name,sku,barcode,stock").eq("business_id", active.id).limit(1);
        if (sku) query = query.eq("sku", sku) as typeof query;
        else if (barcode) query = query.eq("barcode", barcode) as typeof query;
        else query = query.ilike("name", name) as typeof query;
        const { data: existing, error: findError } = await query;
        if (findError) throw findError;
        const current = existing?.[0];
        const payload: Record<string, unknown> = {
          business_id: active.id, name, sku, barcode,
          cost: parseNumber(m.cost) ?? 0, price: parseNumber(m.price) ?? 0,
          low_stock_threshold: parseNumber(m.minimum) ?? 0, reorder_point: parseNumber(m.reorderPoint) ?? 0,
          max_stock: parseNumber(m.maxStock) ?? 0,
        };
        if (current) {
          const { error } = await supabase.from("products").update(payload).eq("id", current.id).eq("business_id", active.id);
          if (error) throw error;
          updated += 1;
          const target = parseNumber(m.stock);
          const delta = target === null ? 0 : target - Number(current.stock ?? 0);
          if (delta) { await adjustInventoryStock(supabase, { productId: current.id, delta, reason: `Importación inteligente · fila ${row.rowNumber}`, sourceType: "smart_import", sourceId: fileName || null }); adjusted += 1; }
        } else {
          const { data: product, error } = await supabase.from("products").insert({ ...payload, stock: 0 } as never).select("id").single();
          if (error) throw error;
          created += 1;
          const target = parseNumber(m.stock);
          if (target) { await adjustInventoryStock(supabase, { productId: product.id, delta: target, reason: `Stock inicial · importación inteligente · fila ${row.rowNumber}`, sourceType: "smart_import", sourceId: fileName || null }); adjusted += 1; }
        }
      }
      skipped = rows.length - valid.length;
      toast.success(`Importación terminada: ${created} creados, ${updated} actualizados y ${adjusted} stocks trazados${skipped ? `; ${skipped} omitidos` : ""}.`);
      setRows([]); setDetections([]); setFileName("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "La importación se detuvo por un error.");
    } finally { setBusy(false); }
  }

  return <Card className="p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5" /><h2 className="text-lg font-semibold">Importación inteligente</h2></div><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Nüva no exige que tu negocio use el mismo Excel. Detecta semánticamente columnas como SKU, Código, Referencia, EAN, Producto, Existencias, Cantidad, Precio de venta, Costo, Mínimo o Reposición y las convierte al modelo interno.</p></div>
      <div className="flex gap-2"><input ref={inputRef} type="file" accept=".csv,.txt,.tsv,.xlsx,.xls" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void readFile(file); e.currentTarget.value = ""; }} /><Button variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}><Upload className="mr-2 h-4 w-4" />Analizar archivo</Button><Button onClick={() => void importRows()} disabled={!canWrite || busy || !stats.ready}>{busy ? "Importando…" : `Importar ${stats.ready} filas`}</Button></div>
    </div>
    {fileName && <div className="mt-4 rounded-lg border bg-muted/20 p-3 text-sm"><strong>{fileName}</strong> · {rows.length} filas · {stats.ready} listas · {stats.warnings} con advertencias</div>}
    {detections.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{detections.map((d) => <div key={d.field} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">{labels[d.field]}</span><Badge variant={d.confidence >= 0.9 ? "secondary" : "outline"}>{Math.round(d.confidence * 100)}%</Badge></div><p className="mt-1 text-xs text-muted-foreground">← {d.sourceHeader} · {d.reason}</p></div>)}</div>}
    {rows.length > 0 && <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="p-2">Fila</th><th className="p-2">Producto</th><th className="p-2">Identificador</th><th className="p-2">Stock</th><th className="p-2">Precio</th><th className="p-2">Resultado</th></tr></thead><tbody>{rows.slice(0, 50).map((row) => <tr key={row.rowNumber} className="border-b"><td className="p-2">{row.rowNumber}</td><td className="p-2 font-medium">{row.mapped.name || "—"}</td><td className="p-2">{row.mapped.sku || row.mapped.barcode || "Nombre"}</td><td className="p-2">{row.mapped.stock || "—"}</td><td className="p-2">{row.mapped.price || "—"}</td><td className="p-2">{row.warnings.length ? <span className="inline-flex items-center gap-1 text-amber-600"><AlertTriangle className="h-4 w-4" />Revisar</span> : <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="h-4 w-4" />Listo</span>}</td></tr>)}</tbody></table>{rows.length > 50 && <p className="mt-2 text-xs text-muted-foreground">Vista previa limitada a 50 filas; la importación procesa todas las filas válidas.</p>}</div>}
  </Card>;
}
