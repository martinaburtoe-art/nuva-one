import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness, useMyRole, canWriteOperations } from "@/lib/use-business";
import { useBizList } from "@/lib/biz-data";
import { resolveProductCode } from "@/lib/product-resolver";
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

export const Route = createFileRoute("/_authenticated/inventario-conteo")({
  head: () => ({ meta: [{ title: "Conteo físico — Nüva One" }] }),
  component: InventoryCount,
});

type Line = { id: string; product_id: string; barcode: string | null; product_name: string; system_qty: number; counted_qty: number };
type ResolvedScan = { product_id: string; name: string | null; barcode: string | null; stock: number | null; sku: string | null };

function InventoryCount() {
  const { active } = useActiveBusiness();
  const { data: role } = useMyRole();
  const canWrite = canWriteOperations(role);
  const { data: products = [], refetch } = useBizList<any>("products", { order: "name", ascending: true });
  const [barcode, setBarcode] = useState("");
  const [stocktakeId, setStocktakeId] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", sku: "", barcode: "", category: "", cost: "0", price: "0", stock: "0" });
  const inputRef = useRef<HTMLInputElement>(null);

  const matched = useMemo(() => products.find((p: any) => String(p.barcode ?? "").trim().toLowerCase() === barcode.trim().toLowerCase() || String(p.sku ?? "").trim().toLowerCase() === barcode.trim().toLowerCase()), [products, barcode]);

  async function startCount() {
    if (!active || !canWrite || stocktakeId) return;
    const { data: session } = await supabase.auth.getSession();
    const { data, error } = await supabase.from("inventory_stocktakes" as any).insert({ business_id: active.id, status: "counting", created_by: session.session?.user.id }).select("id").single();
    if (error) return toast.error(error.message);
    setStocktakeId(data.id);
    setLines([]);
    toast.success("Conteo físico iniciado");
  }

  async function scanValue(value: string, resolved?: ResolvedScan) {
    const code = value.trim();
    if (!code || !active || !canWrite) return;

    let product: ResolvedScan | undefined = resolved;
    if (!product) {
      try {
        const resolution = await resolveProductCode(code);
        if (resolution.status === "UNAUTHORIZED") return toast.error("No tienes autorización para consultar este producto");
        if (resolution.status === "DUPLICATE") return toast.error("El código está asociado a más de un producto");
        if (resolution.status !== "FOUND" || !resolution.product) {
          setNewProduct((v) => ({ ...v, barcode: code }));
          setNewProductOpen(true);
          return;
        }
        product = resolution.product;
      } catch (error: any) {
        return toast.error(error?.message ?? "No se pudo resolver el código");
      }
    }

    let sid = stocktakeId;
    if (!sid) {
      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase.from("inventory_stocktakes" as any).insert({ business_id: active.id, status: "counting", created_by: session.session?.user.id }).select("id").single();
      if (error) return toast.error(error.message);
      sid = data.id;
      setStocktakeId(sid);
    }

    const current = product;
    setLines((prev) => {
      const existing = prev.find((x) => x.product_id === current.product_id);
      if (existing) return prev.map((x) => x.product_id === current.product_id ? { ...x, counted_qty: x.counted_qty + 1 } : x);
      return [...prev, { id: crypto.randomUUID(), product_id: current.product_id, barcode: current.barcode ?? code, product_name: current.name ?? "Producto", system_qty: Number(current.stock ?? 0), counted_qty: 1 }];
    });
    setBarcode("");
    inputRef.current?.focus();
  }

  async function saveLines(): Promise<boolean> {
    if (!stocktakeId || !active) return false;
    const { error: deleteError } = await supabase.from("inventory_stocktake_lines" as any).delete().eq("stocktake_id", stocktakeId).eq("business_id", active.id);
    if (deleteError) {
      toast.error(`No se pudo preparar el guardado del conteo: ${deleteError.message}`);
      return false;
    }
    const payload = lines.map((x) => ({ stocktake_id: stocktakeId, business_id: active.id, product_id: x.product_id, barcode: x.barcode, product_name: x.product_name, system_qty: x.system_qty, counted_qty: x.counted_qty, difference: x.counted_qty - x.system_qty }));
    const { error } = await supabase.from("inventory_stocktake_lines" as any).insert(payload);
    if (error) {
      toast.error(`No se pudo guardar el conteo: ${error.message}`);
      return false;
    }
    return true;
  }

  async function finishCount() {
    if (!stocktakeId || !active || !lines.length || !canWrite) return;
    const saved = await saveLines();
    if (!saved) return;
    const { data, error } = await (supabase as any).rpc("finalize_inventory_stocktake", { p_stocktake_id: stocktakeId });
    if (error) return toast.error(error.message ?? "No se pudo finalizar el conteo");
    await generatePdf();
    setStocktakeId(null);
    setLines([]);
    await refetch();
    const result = Array.isArray(data) ? data[0] : data;
    toast.success(`Conteo finalizado. ${Number(result?.adjusted_products ?? 0)} productos ajustados.`);
  }

  async function createProduct() {
    if (!active || !newProduct.name.trim() || !newProduct.barcode.trim()) return toast.error("Nombre y código de barras son obligatorios");
    const { data, error } = await supabase.from("products" as any).insert({ business_id: active.id, name: newProduct.name.trim(), sku: newProduct.sku.trim() || null, barcode: newProduct.barcode.trim(), category: newProduct.category.trim() || null, cost: Number(newProduct.cost) || 0, price: Number(newProduct.price) || 0, stock: 0 }).select("id,name,barcode,stock,sku").single();
    if (error) return toast.error(error.message.includes("barcode") ? "Ese código ya existe para este negocio" : error.message);
    setNewProductOpen(false);
    setBarcode("");
    await refetch();
    if (data) await scanValue(String(data.barcode), { product_id: data.id, name: data.name, barcode: data.barcode, sku: data.sku, stock: Number(data.stock ?? 0) });
    toast.success("Producto agregado al inventario");
  }

  async function generatePdf() {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text("Nüva One — Conteo físico de inventario", 14, 18);
    doc.setFontSize(10); doc.text(`Empresa: ${active?.name ?? "Empresa activa"}`, 14, 26); doc.text(`Fecha: ${new Date().toLocaleString("es-CL")}`, 14, 32);
    doc.text("Producto", 14, 43); doc.text("Código", 92, 43); doc.text("Sistema", 130, 43); doc.text("Físico", 157, 43); doc.text("Dif.", 181, 43);
    let y = 50;
    lines.forEach((x) => { if (y > 280) { doc.addPage(); y = 18; } doc.setFontSize(9); doc.text(x.product_name.slice(0, 38), 14, y); doc.text(String(x.barcode ?? "—"), 92, y); doc.text(String(x.system_qty), 130, y); doc.text(String(x.counted_qty), 157, y); doc.text(String(x.counted_qty - x.system_qty), 181, y); y += 7; });
    const totalSystem = lines.reduce((s, x) => s + x.system_qty, 0); const totalPhysical = lines.reduce((s, x) => s + x.counted_qty, 0);
    y += 5; doc.setFontSize(11); doc.text(`Total unidades registradas: ${totalSystem}`, 14, y); y += 7; doc.text(`Total unidades físicas: ${totalPhysical}`, 14, y); y += 7; doc.text(`Diferencia total: ${totalPhysical - totalSystem}`, 14, y);
    doc.save(`nuva-conteo-${new Date().toISOString().slice(0,10)}.pdf`);
  }

  const differences = lines.filter((x) => x.counted_qty !== x.system_qty).length;
  return <ModuleGuard module="inventory"><div className="space-y-6"><PageHeader title="Conteo físico de inventario" description="Escanea con cámara o pistola, compara contra el stock digital y aplica las diferencias de forma atómica al finalizar." action={<Badge variant={stocktakeId ? "default" : "secondary"}>{stocktakeId ? "Conteo en curso" : "Sin conteo"}</Badge>} />
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card className="p-5 space-y-4"><div className="flex flex-wrap gap-2"><Button disabled={!canWrite || !!stocktakeId} onClick={startCount}><ClipboardCheck className="mr-2 h-4 w-4"/>Nuevo conteo</Button><Button variant="outline" onClick={() => setScannerOpen(true)} disabled={!canWrite}><ScanBarcode className="mr-2 h-4 w-4"/>Escáner móvil</Button></div>
      <div className="flex gap-2"><Input ref={inputRef} autoFocus value={barcode} onChange={(e)=>setBarcode(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter"){e.preventDefault();void scanValue(barcode)}}} placeholder="Pistola USB/Bluetooth HID: escanea y presiona Enter…"/><Button onClick={()=>void scanValue(barcode)}><Search className="h-4 w-4"/></Button></div>
      {matched && <div className="rounded-lg border p-3 text-sm"><b>{matched.name}</b> · Código {matched.barcode ?? matched.sku} · Stock digital {matched.stock}</div>}
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Producto</th><th className="p-2">Código</th><th className="p-2">Sistema</th><th className="p-2">Físico</th><th className="p-2">Dif.</th></tr></thead><tbody>{lines.map((x)=> <tr key={x.id} className="border-b"><td className="p-2">{x.product_name}</td><td className="p-2">{x.barcode ?? "—"}</td><td className="p-2">{x.system_qty}</td><td className="p-2"><div className="flex items-center gap-1"><Button size="icon" variant="outline" onClick={()=>setLines(v=>v.map(y=>y.id===x.id?{...y,counted_qty:Math.max(0,y.counted_qty-1)}:y))}><Minus className="h-3 w-3"/></Button><span className="w-8 text-center">{x.counted_qty}</span><Button size="icon" variant="outline" onClick={()=>setLines(v=>v.map(y=>y.id===x.id?{...y,counted_qty:y.counted_qty+1}:y))}><Plus className="h-3 w-3"/></Button></div></td><td className={x.counted_qty===x.system_qty?"p-2 text-emerald-600":"p-2 font-semibold text-destructive"}>{x.counted_qty-x.system_qty}</td></tr>)}</tbody></table>{!lines.length&&<p className="py-10 text-center text-sm text-muted-foreground">Escanea el primer producto para comenzar.</p>}</div></Card>
      <Card className="p-5 space-y-4"><h2 className="font-semibold">Resultado del conteo</h2><div className="grid grid-cols-2 gap-3"><Metric label="Productos contados" value={String(lines.length)}/><Metric label="Con diferencias" value={String(differences)}/><Metric label="Stock digital" value={String(lines.reduce((s,x)=>s+x.system_qty,0))}/><Metric label="Stock físico" value={String(lines.reduce((s,x)=>s+x.counted_qty,0))}/></div><Button className="w-full" variant="outline" disabled={!lines.length} onClick={()=>void generatePdf()}><FileDown className="mr-2 h-4 w-4"/>Generar documento comparativo</Button><Button className="w-full" disabled={!stocktakeId || !lines.length || !canWrite} onClick={()=>void finishCount()}><ClipboardCheck className="mr-2 h-4 w-4"/>Guardar, finalizar y auditar</Button><p className="text-xs text-muted-foreground">Si el guardado falla, el conteo no se completa. La finalización aplica los ajustes y crea los movimientos de auditoría dentro de una transacción.</p></Card></div>
    <LiveProductScanner open={scannerOpen} onOpenChange={setScannerOpen} title="Nüva Scan · Conteo" onProductFound={(product) => { void scanValue(product.sku ?? product.barcode ?? "", { product_id: product.product_id, name: product.name, barcode: product.barcode, sku: product.sku, stock: product.stock }); }} />
    <Dialog open={newProductOpen} onOpenChange={setNewProductOpen}><DialogContent><DialogHeader><DialogTitle>Producto no registrado</DialogTitle></DialogHeader><div className="space-y-3"><p className="text-sm text-muted-foreground">El código {newProduct.barcode} no existe. Puedes crear el producto directamente desde el escaneo.</p>{Object.entries({name:"Nombre",sku:"SKU",category:"Categoría",cost:"Costo",price:"Precio",stock:"Stock inicial"}).map(([key,label])=><div key={key}><Label>{label}</Label><Input type={key==='cost'||key==='price'||key==='stock'?'number':'text'} value={(newProduct as any)[key]} onChange={(e)=>setNewProduct(v=>({...v,[key]:e.target.value}))}/></div>)}<Button className="w-full" onClick={()=>void createProduct()}><PackagePlus className="mr-2 h-4 w-4"/>Crear producto y agregar al conteo</Button></div></DialogContent></Dialog>
  </div></ModuleGuard>;
}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-xl font-bold">{value}</div></div>}
