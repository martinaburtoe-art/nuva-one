import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useActiveBusiness, useMyRole, canWriteOperations } from "@/lib/use-business";
import { PageHeader } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ModuleGuard } from "@/components/module-guard";
import { LiveProductScanner } from "@/components/scanner/LiveProductScanner";
import { FileDown, PackagePlus, ScanBarcode, ClipboardCheck, Plus, Minus, Search } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";

export const Route = createFileRoute("/_authenticated/inventario-conteo")({ head: () => ({ meta: [{ title: "Conteo físico — Nüva One" }] }), component: InventoryCount });

type Product = Database["public"]["Tables"]["products"]["Row"];
type Stocktake = Database["public"]["Tables"]["inventory_stocktakes"]["Row"];
type Line = { id: string; product_id: string; barcode: string | null; product_name: string; system_qty: number; counted_qty: number };
type ResolvedScan = { product_id: string; name: string | null; barcode: string | null; stock: number | null; sku: string | null };

function InventoryCount() {
  const { active } = useActiveBusiness();
  const { data: role } = useMyRole();
  const canWrite = canWriteOperations(role);
  const [products, setProducts] = useState<Product[]>([]);
  const [barcode, setBarcode] = useState("");
  const [stocktakeId, setStocktakeId] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", sku: "", barcode: "", category: "", cost: "0", price: "0" });
  const inputRef = useRef<HTMLInputElement>(null);

  async function refreshProducts() {
    if (!active?.id) return;
    const { data, error } = await supabase.from("products").select("*").eq("business_id", active.id).order("name", { ascending: true });
    if (error) throw error;
    setProducts(data ?? []);
  }

  useMemo(() => { void refreshProducts(); }, [active?.id]);

  const matched = useMemo(() => products.find((product) => String(product.barcode ?? "").trim().toLowerCase() === barcode.trim().toLowerCase() || String(product.sku ?? "").trim().toLowerCase() === barcode.trim().toLowerCase()), [products, barcode]);

  async function startCount(): Promise<string | null> {
    if (!active || !canWrite || stocktakeId) return stocktakeId;
    const { data: session } = await supabase.auth.getSession();
    const { data, error } = await supabase.from("inventory_stocktakes").insert({ business_id: active.id, status: "counting", created_by: session.session?.user.id ?? null }).select("*").single();
    if (error) { toast.error(error.message); return null; }
    const stocktake: Stocktake = data;
    setStocktakeId(stocktake.id);
    setLines([]);
    toast.success("Conteo físico iniciado");
    return stocktake.id;
  }

  async function scanValue(value: string, resolved?: ResolvedScan) {
    const code = value.trim();
    if (!code || !active || !canWrite) return;
    let product = resolved;
    if (!product) {
      const candidate = products.find((item) => String(item.barcode ?? "").toLowerCase() === code.toLowerCase() || String(item.sku ?? "").toLowerCase() === code.toLowerCase());
      if (!candidate) {
        setNewProduct((current) => ({ ...current, barcode: code }));
        setNewProductOpen(true);
        return;
      }
      product = { product_id: candidate.id, name: candidate.name, barcode: candidate.barcode, sku: candidate.sku, stock: candidate.stock };
    }
    const sid = stocktakeId ?? await startCount();
    if (!sid || !product) return;
    const current = product;
    setLines((previous) => {
      const existing = previous.find((line) => line.product_id === current.product_id);
      if (existing) return previous.map((line) => line.product_id === current.product_id ? { ...line, counted_qty: line.counted_qty + 1 } : line);
      return [...previous, { id: crypto.randomUUID(), product_id: current.product_id, barcode: current.barcode ?? code, product_name: current.name ?? "Producto", system_qty: Number(current.stock ?? 0), counted_qty: 1 }];
    });
    setBarcode("");
    inputRef.current?.focus();
  }

  async function saveLines(): Promise<boolean> {
    if (!stocktakeId || !active) return false;
    const { error: deleteError } = await supabase.from("inventory_stocktake_lines").delete().eq("stocktake_id", stocktakeId).eq("business_id", active.id);
    if (deleteError) { toast.error(`No se pudo preparar el guardado del conteo: ${deleteError.message}`); return false; }
    const payload: Database["public"]["Tables"]["inventory_stocktake_lines"]["Insert"][] = lines.map((line) => ({ stocktake_id: stocktakeId, business_id: active.id, product_id: line.product_id, barcode: line.barcode, product_name: line.product_name, system_qty: line.system_qty, counted_qty: line.counted_qty, difference: line.counted_qty - line.system_qty }));
    const { error } = await supabase.from("inventory_stocktake_lines").insert(payload);
    if (error) { toast.error(`No se pudo guardar el conteo: ${error.message}`); return false; }
    return true;
  }

  async function finishCount() {
    if (!stocktakeId || !active || !lines.length || !canWrite) return;
    if (!(await saveLines())) return;
    const { data, error } = await supabase.rpc("finalize_inventory_stocktake", { p_stocktake_id: stocktakeId });
    if (error) { toast.error(error.message); return; }
    await generatePdf();
    const result = data[0];
    setStocktakeId(null);
    setLines([]);
    await refreshProducts();
    toast.success(`Conteo finalizado. ${Number(result?.adjusted_products ?? 0)} productos ajustados.`);
  }

  async function createProduct() {
    if (!active || !canWrite) return;
    if (!newProduct.name.trim()) return toast.error("El nombre del producto es obligatorio");
    if (!newProduct.barcode.trim() && !newProduct.sku.trim()) return toast.error("Ingresa un código o SKU para identificar el producto");
    const { data, error } = await supabase.from("products").insert({ business_id: active.id, name: newProduct.name.trim(), sku: newProduct.sku.trim() || null, barcode: newProduct.barcode.trim() || null, category: newProduct.category.trim() || null, cost: Number(newProduct.cost) || 0, price: Number(newProduct.price) || 0, stock: 0 }).select("id,name,barcode,stock,sku").single();
    if (error) return toast.error(error.message);
    setNewProductOpen(false);
    setNewProduct({ name: "", sku: "", barcode: "", category: "", cost: "0", price: "0" });
    await refreshProducts();
    await scanValue(String(data.barcode ?? data.sku ?? ""), { product_id: data.id, name: data.name, barcode: data.barcode, sku: data.sku, stock: data.stock });
    toast.success("Producto creado y agregado al conteo");
  }

  async function generatePdf() {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text("Nüva One — Conteo físico de inventario", 14, 18);
    doc.setFontSize(10); doc.text(`Empresa: ${active?.name ?? "Empresa activa"}`, 14, 26); doc.text(`Fecha: ${new Date().toLocaleString("es-CL")}`, 14, 32);
    doc.text("Producto", 14, 43); doc.text("Código", 92, 43); doc.text("Sistema", 130, 43); doc.text("Físico", 157, 43); doc.text("Dif.", 181, 43);
    let y = 50;
    for (const line of lines) {
      if (y > 280) { doc.addPage(); y = 18; }
      doc.setFontSize(9); doc.text(line.product_name.slice(0, 38), 14, y); doc.text(String(line.barcode ?? "—"), 92, y); doc.text(String(line.system_qty), 130, y); doc.text(String(line.counted_qty), 157, y); doc.text(String(line.counted_qty - line.system_qty), 181, y); y += 7;
    }
    y += 5; doc.setFontSize(11); doc.text(`Total sistema: ${lines.reduce((sum, line) => sum + line.system_qty, 0)}`, 14, y); doc.text(`Total físico: ${lines.reduce((sum, line) => sum + line.counted_qty, 0)}`, 14, y + 7); doc.save(`nuva-conteo-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <ModuleGuard module="inventory">
      <div className="space-y-6">
        <PageHeader title="Conteo físico" description="Cuenta productos, detecta diferencias y aplica los ajustes desde una jornada trazable." action={<div className="flex gap-2"><Button variant="outline" onClick={() => void refreshProducts()}><RefreshCwIcon /></Button><Button disabled={!canWrite} onClick={() => void startCount()}><ClipboardCheck className="mr-2 h-4 w-4" />Iniciar conteo</Button></div>} />
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card className="p-5"><div className="flex flex-wrap gap-2"><div className="relative flex-1 min-w-[220px]"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input ref={inputRef} value={barcode} onChange={(e) => setBarcode(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void scanValue(barcode); }} placeholder="Escanea o ingresa código / SKU" className="pl-9" /></div><Button onClick={() => void scanValue(barcode)} disabled={!canWrite || !barcode.trim()}>Agregar</Button><Button variant="outline" onClick={() => setScannerOpen(true)} disabled={!canWrite}><ScanBarcode className="mr-2 h-4 w-4" />Escanear</Button></div>{matched && <div className="mt-3 rounded-lg border p-3 text-sm"><strong>{matched.name}</strong> · stock sistema {Number(matched.stock ?? 0)}</div>}<div className="mt-5 overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead><tr className="border-b text-left text-xs text-muted-foreground"><th className="p-2">Producto</th><th className="p-2">Código</th><th className="p-2 text-right">Sistema</th><th className="p-2 text-right">Físico</th><th className="p-2 text-right">Dif.</th><th className="p-2" /></tr></thead><tbody>{lines.map((line) => <tr key={line.id} className="border-b"><td className="p-2">{line.product_name}</td><td className="p-2">{line.barcode ?? "—"}</td><td className="p-2 text-right">{line.system_qty}</td><td className="p-2 text-right"><div className="flex items-center justify-end gap-1"><Button size="icon" variant="ghost" onClick={() => setLines((current) => current.map((item) => item.id === line.id ? { ...item, counted_qty: Math.max(0, item.counted_qty - 1) } : item))}><Minus className="h-3 w-3" /></Button>{line.counted_qty}<Button size="icon" variant="ghost" onClick={() => setLines((current) => current.map((item) => item.id === line.id ? { ...item, counted_qty: item.counted_qty + 1 } : item))}><Plus className="h-3 w-3" /></Button></div></td><td className="p-2 text-right"><Badge variant={line.counted_qty === line.system_qty ? "secondary" : "destructive"}>{line.counted_qty - line.system_qty}</Badge></td><td className="p-2" /></tr>)}</tbody></table>{lines.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Todavía no hay productos en el conteo.</p>}</div></Card>
          <Card className="p-5"><h2 className="font-semibold">Resumen</h2><div className="mt-4 space-y-3 text-sm"><Row label="Productos" value={String(lines.length)} /><Row label="Unidades sistema" value={String(lines.reduce((sum, line) => sum + line.system_qty, 0))} /><Row label="Unidades físicas" value={String(lines.reduce((sum, line) => sum + line.counted_qty, 0))} /><Row label="Diferencia" value={String(lines.reduce((sum, line) => sum + line.counted_qty - line.system_qty, 0))} /></div><div className="mt-5 grid gap-2"><Button disabled={!lines.length || !canWrite} onClick={() => void finishCount()}><ClipboardCheck className="mr-2 h-4 w-4" />Finalizar y ajustar</Button><Button variant="outline" disabled={!lines.length} onClick={() => void generatePdf()}><FileDown className="mr-2 h-4 w-4" />Exportar PDF</Button><Button variant="outline" onClick={() => setNewProductOpen(true)} disabled={!canWrite}><PackagePlus className="mr-2 h-4 w-4" />Nuevo producto</Button></div></Card>
        </div>
        <LiveProductScanner open={scannerOpen} onOpenChange={setScannerOpen} title="Escáner de conteo" onResolved={(resolution) => { const product = resolution.product; if (resolution.status === "FOUND" && product) void scanValue(product.barcode ?? product.sku ?? "", { product_id: product.id, name: product.name, barcode: product.barcode, sku: product.sku, stock: product.stock }); }} />
        <Dialog open={newProductOpen} onOpenChange={setNewProductOpen}><DialogContent><DialogHeader><DialogTitle>Nuevo producto</DialogTitle></DialogHeader><div className="space-y-3"><Field label="Nombre"><Input value={newProduct.name} onChange={(e) => setNewProduct((v) => ({ ...v, name: e.target.value }))} /></Field><Field label="SKU"><Input value={newProduct.sku} onChange={(e) => setNewProduct((v) => ({ ...v, sku: e.target.value }))} /></Field><Field label="Código de barras"><Input value={newProduct.barcode} onChange={(e) => setNewProduct((v) => ({ ...v, barcode: e.target.value }))} /></Field><Field label="Categoría"><Input value={newProduct.category} onChange={(e) => setNewProduct((v) => ({ ...v, category: e.target.value }))} /></Field><div className="grid grid-cols-2 gap-3"><Field label="Costo"><Input type="number" min="0" value={newProduct.cost} onChange={(e) => setNewProduct((v) => ({ ...v, cost: e.target.value }))} /></Field><Field label="Precio"><Input type="number" min="0" value={newProduct.price} onChange={(e) => setNewProduct((v) => ({ ...v, price: e.target.value }))} /></Field></div><Button className="w-full" onClick={() => void createProduct()} disabled={!canWrite}>Crear producto</Button></div></DialogContent></Dialog>
      </div>
    </ModuleGuard>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="space-y-1 text-sm"><span className="font-medium">{label}</span>{children}</label>; }
function Row({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>; }
function RefreshCwIcon() { return <span className="text-sm">↻</span>; }
