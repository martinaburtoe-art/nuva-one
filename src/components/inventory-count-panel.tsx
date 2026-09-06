import { useEffect, useMemo, useRef, useState } from "react";
import { ClipboardCheck, FileDown, Minus, PackagePlus, Plus, ScanBarcode, Search } from "lucide-react";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useActiveBusiness, useMyRole, canWriteOperations } from "@/lib/use-business";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LiveProductScanner } from "@/components/scanner/LiveProductScanner";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Line = { id: string; product_id: string; barcode: string | null; product_name: string; system_qty: number; counted_qty: number };

export function InventoryCountPanel() {
  const { active } = useActiveBusiness();
  const { data: role } = useMyRole();
  const canWrite = canWriteOperations(role);
  const [products, setProducts] = useState<Product[]>([]);
  const [code, setCode] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [stocktakeId, setStocktakeId] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    if (!active?.id) return;
    const { data, error } = await supabase.from("products").select("*").eq("business_id", active.id).order("name");
    if (error) toast.error(error.message);
    else setProducts(data ?? []);
  }
  useEffect(() => { void refresh(); }, [active?.id]);

  const matched = useMemo(() => {
    const q = code.trim().toLowerCase();
    return q ? products.find(p => String(p.barcode ?? "").toLowerCase() === q || String(p.sku ?? "").toLowerCase() === q) : null;
  }, [products, code]);

  async function startCount() {
    if (!active || !canWrite) return null;
    if (stocktakeId) return stocktakeId;
    const { data: session } = await supabase.auth.getSession();
    const { data, error } = await supabase.from("inventory_stocktakes").insert({ business_id: active.id, status: "counting", created_by: session.session?.user.id ?? null }).select("id").single();
    if (error) { toast.error(error.message); return null; }
    setStocktakeId(data.id); setLines([]); toast.success("Conteo físico iniciado"); return data.id;
  }

  async function addProduct(product: Product) {
    if (!canWrite) return;
    const sid = stocktakeId ?? await startCount();
    if (!sid) return;
    setLines(current => {
      const existing = current.find(line => line.product_id === product.id);
      if (existing) return current.map(line => line.product_id === product.id ? { ...line, counted_qty: line.counted_qty + 1 } : line);
      return [...current, { id: crypto.randomUUID(), product_id: product.id, barcode: product.barcode ?? product.sku, product_name: product.name ?? "Producto", system_qty: Number(product.stock ?? 0), counted_qty: 1 }];
    });
    setCode(""); inputRef.current?.focus();
  }

  async function resolve() {
    if (!matched) return toast.error("Producto no encontrado. Busca por SKU o código de barras.");
    await addProduct(matched);
  }

  async function finish() {
    if (!stocktakeId || !active || !lines.length || !canWrite) return;
    const { error: deleteError } = await supabase.from("inventory_stocktake_lines").delete().eq("stocktake_id", stocktakeId).eq("business_id", active.id);
    if (deleteError) return toast.error(deleteError.message);
    const payload = lines.map(line => ({ stocktake_id: stocktakeId, business_id: active.id, product_id: line.product_id, barcode: line.barcode, product_name: line.product_name, system_qty: line.system_qty, counted_qty: line.counted_qty, difference: line.counted_qty - line.system_qty }));
    const { error } = await supabase.from("inventory_stocktake_lines").insert(payload);
    if (error) return toast.error(error.message);
    const { data, error: finalizeError } = await supabase.rpc("finalize_inventory_stocktake", { p_stocktake_id: stocktakeId });
    if (finalizeError) return toast.error(finalizeError.message);
    const adjusted = Number(data?.[0]?.adjusted_products ?? 0);
    setStocktakeId(null); setLines([]); await refresh();
    toast.success(`Conteo finalizado. ${adjusted} productos ajustados.`);
  }

  function exportPdf() {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text("Nüva One — Conteo físico de inventario", 14, 18);
    doc.setFontSize(10); doc.text(`Empresa: ${active?.name ?? "Empresa activa"}`, 14, 26); doc.text(`Fecha: ${new Date().toLocaleString("es-CL")}`, 14, 32);
    doc.text("Producto", 14, 43); doc.text("Sistema", 130, 43); doc.text("Físico", 157, 43); doc.text("Dif.", 181, 43);
    let y = 50;
    for (const line of lines) { if (y > 280) { doc.addPage(); y = 18; } doc.setFontSize(9); doc.text(line.product_name.slice(0, 40), 14, y); doc.text(String(line.system_qty), 130, y); doc.text(String(line.counted_qty), 157, y); doc.text(String(line.counted_qty - line.system_qty), 181, y); y += 7; }
    doc.save(`nuva-conteo-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return <div className="space-y-4">
    <Card className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Conteo físico</h2><p className="text-sm text-muted-foreground">Cuenta, compara contra el sistema y aplica diferencias desde el mismo espacio de Inventario.</p></div><Button disabled={!canWrite} onClick={() => void startCount()}><ClipboardCheck className="mr-2 h-4 w-4" />Iniciar conteo</Button></div>
      <div className="mt-4 flex flex-wrap gap-2"><div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input ref={inputRef} value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void resolve(); }} placeholder="Escanea o ingresa SKU / código de barras" className="pl-9" /></div><Button onClick={() => void resolve()} disabled={!canWrite || !code.trim()}>Agregar</Button><Button variant="outline" onClick={() => setScannerOpen(true)} disabled={!canWrite}><ScanBarcode className="mr-2 h-4 w-4" />Escanear</Button></div>
      {matched && <div className="mt-3 rounded-lg border p-3 text-sm"><strong>{matched.name}</strong> · stock sistema {Number(matched.stock ?? 0)}</div>}
    </Card>
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]"><Card className="overflow-x-auto p-5"><table className="w-full min-w-[620px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="p-2">Producto</th><th className="p-2">Código</th><th className="p-2 text-right">Sistema</th><th className="p-2 text-right">Físico</th><th className="p-2 text-right">Dif.</th></tr></thead><tbody>{lines.map(line => <tr key={line.id} className="border-b"><td className="p-2 font-medium">{line.product_name}</td><td className="p-2">{line.barcode ?? "—"}</td><td className="p-2 text-right">{line.system_qty}</td><td className="p-2 text-right"><span className="inline-flex items-center gap-1"><Button size="icon" variant="ghost" onClick={() => setLines(current => current.map(item => item.id === line.id ? { ...item, counted_qty: Math.max(0, item.counted_qty - 1) } : item))}><Minus className="h-3 w-3" /></Button>{line.counted_qty}<Button size="icon" variant="ghost" onClick={() => setLines(current => current.map(item => item.id === line.id ? { ...item, counted_qty: item.counted_qty + 1 } : item))}><Plus className="h-3 w-3" /></Button></span></td><td className="p-2 text-right"><Badge variant={line.counted_qty === line.system_qty ? "secondary" : "destructive"}>{line.counted_qty - line.system_qty}</Badge></td></tr>)}</tbody></table>{!lines.length && <p className="py-10 text-center text-sm text-muted-foreground">Inicia un conteo y agrega productos.</p>}</Card>
      <Card className="p-5"><h3 className="font-semibold">Resumen</h3><div className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><span>Productos</span><strong>{lines.length}</strong></div><div className="flex justify-between"><span>Unidades sistema</span><strong>{lines.reduce((s,l) => s + l.system_qty, 0)}</strong></div><div className="flex justify-between"><span>Unidades físicas</span><strong>{lines.reduce((s,l) => s + l.counted_qty, 0)}</strong></div><div className="flex justify-between"><span>Diferencia</span><strong>{lines.reduce((s,l) => s + l.counted_qty - l.system_qty, 0)}</strong></div></div><div className="mt-5 grid gap-2"><Button disabled={!lines.length || !canWrite} onClick={() => void finish()}><ClipboardCheck className="mr-2 h-4 w-4" />Finalizar y ajustar</Button><Button variant="outline" disabled={!lines.length} onClick={exportPdf}><FileDown className="mr-2 h-4 w-4" />Exportar PDF</Button><Button variant="outline" onClick={() => toast.info("Crea el producto desde Productos y luego incorpóralo al conteo.")}><PackagePlus className="mr-2 h-4 w-4" />Nuevo producto</Button></div></Card></div>
    <LiveProductScanner open={scannerOpen} onOpenChange={setScannerOpen} title="Escáner de conteo" onResolved={resolution => { const product = resolution.product; if (resolution.status === "FOUND" && product) void addProduct(products.find(p => p.id === product.id) ?? ({ id: product.id, name: product.name, barcode: product.barcode, sku: product.sku, stock: product.stock } as Product)); }} />
  </div>;
}
