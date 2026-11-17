import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardCheck, FileDown, PackagePlus, ScanBarcode, Search, Users, Plus } from "lucide-react";
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
import { MobileScannerPairingCard } from "@/components/scanner/MobileScannerPairingCard";
import { subscribeToMobileScannerOperation, type MobileScannerEvent } from "@/lib/mobile-scanner-bridge";
import { resolveProductCode } from "@/lib/product-resolver";
import { createProductFromScanner } from "@/lib/scanner-product-onboarding";
import {
  loadStocktakeLines,
  recordStocktakeScan,
  subscribeToStocktake,
  type StocktakeCountMode,
  type StocktakeLine,
} from "@/lib/inventory-stocktake-collaboration";

type Product = Database["public"]["Tables"]["products"]["Row"];

export function InventoryCountPanel({ onOpenProducts }: { onOpenProducts?: () => void }) {
  const { active } = useActiveBusiness();
  const { data: role } = useMyRole();
  const canWrite = canWriteOperations(role);
  const [products, setProducts] = useState<Product[]>([]);
  const [code, setCode] = useState("");
  const [lines, setLines] = useState<StocktakeLine[]>([]);
  const [stocktakeId, setStocktakeId] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [countMode, setCountMode] = useState<StocktakeCountMode>("unit");
  const [countQuantity, setCountQuantity] = useState("1");
  const [unknownCode, setUnknownCode] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [existingProductId, setExistingProductId] = useState("");
  const [pendingMobileEvent, setPendingMobileEvent] = useState<Pick<MobileScannerEvent, "client_event_id" | "session_id" | "code"> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refreshLines = useCallback(async (id = stocktakeId) => {
    if (!id) return;
    const next = await loadStocktakeLines(id);
    setLines(next);
  }, [stocktakeId]);

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      if (!active?.id) {
        setProducts([]);
        setLines([]);
        setStocktakeId(null);
        return;
      }
      try {
        const [productResult, activeCount] = await Promise.all([
          supabase.from("products").select("*").eq("business_id", active.id).order("name"),
          supabase.from("inventory_stocktakes").select("id")
            .eq("business_id", active.id).eq("status", "counting")
            .order("created_at", { ascending: false }).limit(1).maybeSingle(),
        ]);
        if (productResult.error) throw productResult.error;
        if (cancelled) return;
        setProducts(productResult.data ?? []);
        if (activeCount.error) throw activeCount.error;
        if (activeCount.data?.id) {
          setStocktakeId(activeCount.data.id);
          const next = await loadStocktakeLines(activeCount.data.id);
          if (!cancelled) setLines(next);
        } else {
          setStocktakeId(null);
          setLines([]);
        }
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "No se pudo cargar Inventario");
      }
    }
    void initialize();
    return () => { cancelled = true; };
  }, [active?.id]);

  useEffect(() => {
    if (!stocktakeId) return;
    let cancelled = false;
    const unsubscribe = subscribeToStocktake(stocktakeId, () => {
      if (!cancelled) void refreshLines(stocktakeId).catch(() => {
        toast.error("No se pudo sincronizar el conteo compartido");
      });
    });
    return () => { cancelled = true; unsubscribe(); };
  }, [stocktakeId, refreshLines]);

  useEffect(() => {
    if (!stocktakeId) return;
    const unsubscribe = subscribeToMobileScannerOperation(stocktakeId, "inventory", async event => {
      try {
        const resolution = await resolveProductCode(event.code);
        if (resolution.status === "FOUND" && resolution.product) {
          const product = {
            id: resolution.product.product_id,
            name: resolution.product.name ?? "Producto",
            stock: Number(resolution.product.stock ?? 0),
            barcode: resolution.product.barcode,
            sku: resolution.product.sku,
          };
          if (countMode === "unit") {
            await addProduct(product, event.code, event);
          } else {
            setCode(event.code);
            setPendingMobileEvent({
              client_event_id: event.client_event_id,
              session_id: event.session_id,
              code: event.code,
            });
            toast.info("Código recibido desde el celular. Ingresa la cantidad y pulsa Agregar.");
          }
        } else if (resolution.status === "NOT_FOUND") {
          setUnknownCode(event.code);
          setPendingMobileEvent({
            client_event_id: event.client_event_id,
            session_id: event.session_id,
            code: event.code,
          });
          toast.info("Código desconocido recibido desde el celular.");
        } else {
          toast.error("No se pudo resolver el código recibido desde el celular.");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Falló la lectura móvil");
      }
    });
    return unsubscribe;
  }, [stocktakeId, countMode]);

  async function startCount() {
    if (!active || !canWrite) return null;
    if (stocktakeId) return stocktakeId;
    const { data: existing, error: lookupError } = await supabase
      .from("inventory_stocktakes").select("id")
      .eq("business_id", active.id).eq("status", "counting")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing?.id) {
      setStocktakeId(existing.id);
      await refreshLines(existing.id);
      return existing.id;
    }
    const { data: auth } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("inventory_stocktakes")
      .insert({ business_id: active.id, status: "counting", created_by: auth.user?.id ?? null })
      .select("id").single();
    if (error) throw error;
    setStocktakeId(data.id);
    setLines([]);
    toast.success("Conteo compartido iniciado");
    return data.id;
  }

  async function addProduct(product: Product | {
    id: string; name: string; stock: number; barcode?: string | null; sku?: string | null;
  }, scannedCode?: string, mobileEvent?: Pick<MobileScannerEvent, "client_event_id" | "session_id" | "code"> | null) {
    if (!canWrite) return;
    setBusy(true);
    try {
      const sid = await startCount();
      if (!sid) return;
      const quantity = Number(countQuantity);
      if (countMode === "quantity" && (!Number.isFinite(quantity) || quantity <= 0)) {
        toast.error("Ingresa una cantidad mayor que cero");
        return;
      }
      const result = await recordStocktakeScan({
        stocktakeId: sid,
        productId: product.id,
        code: scannedCode ?? product.barcode ?? product.sku ?? null,
        mode: countMode,
        quantity: countMode === "unit" ? 1 : quantity,
        clientEventId: mobileEvent?.client_event_id,
        sourceSessionId: mobileEvent?.session_id,
      });
      await refreshLines(sid);
      setCode("");
      setCountQuantity("1");
      setUnknownCode("");
      setPendingMobileEvent(null);
      inputRef.current?.focus();
      if (!result.inserted) toast.info("Esta lectura ya estaba registrada; no se duplicó");
      else toast.success(countMode === "unit" ? "Unidad contabilizada" : `${quantity} unidades contabilizadas`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar la lectura");
    } finally {
      setBusy(false);
    }
  }

  async function resolveTypedCode() {
    const value = code.trim();
    if (!value) return;
    setBusy(true);
    try {
      const resolution = await resolveProductCode(value);
      if (resolution.status === "FOUND" && resolution.product) {
        await addProduct({
          id: resolution.product.product_id,
          name: resolution.product.name ?? "Producto",
          stock: Number(resolution.product.stock ?? 0),
          barcode: resolution.product.barcode,
          sku: resolution.product.sku,
        }, value, pendingMobileEvent?.code === value ? pendingMobileEvent : null);
      } else if (resolution.status === "NOT_FOUND") {
        setUnknownCode(value);
        setNewProductName("");
        setExistingProductId(products[0]?.id ?? "");
        toast.info("Código no registrado. Puedes crear el producto o asociarlo a uno existente.");
      } else if (resolution.status === "DUPLICATE") {
        toast.error("El código está asociado a más de un producto. Corrige el catálogo antes de contar.");
      } else {
        toast.error("No se pudo validar el código o no tienes permisos.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo buscar el producto");
    } finally {
      setBusy(false);
    }
  }

  async function createUnknownProduct() {
    if (!active?.id || !unknownCode || !newProductName.trim() || busy) return;
    setBusy(true);
    try {
      const created = await createProductFromScanner(supabase, {
        businessId: active.id,
        name: newProductName.trim(),
        code: unknownCode,
        codeType: "barcode",
        initialStock: 0,
      });
      const { data, error } = await supabase.from("products").select("*")
        .eq("business_id", active.id).eq("id", created.product_id).single();
      if (error) throw error;
      setProducts(current => [...current, data]);
      await addProduct(data, unknownCode, pendingMobileEvent);
      toast.success("Producto creado con stock inicial cero y agregado al conteo");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo crear el producto");
    } finally {
      setBusy(false);
    }
  }

  async function associateUnknownCode() {
    if (!active?.id || !unknownCode || !existingProductId || busy) return;
    setBusy(true);
    try {
      const client = supabase as any;
      const { error } = await client.rpc("associate_product_code_from_scanner", {
        p_business_id: active.id,
        p_product_id: existingProductId,
        p_code: unknownCode,
        p_code_type: "barcode",
      });
      if (error) throw error;
      const product = products.find(p => p.id === existingProductId);
      if (!product) throw new Error("Producto seleccionado no encontrado");
      await addProduct(product, unknownCode, pendingMobileEvent);
      toast.success("Código asociado al producto existente");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo asociar el código");
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    if (!stocktakeId || !active || !lines.length || !canWrite || busy) return;
    setBusy(true);
    try {
      const { data, error } = await (supabase as any).rpc("finalize_inventory_stocktake", {
        p_stocktake_id: stocktakeId,
      });
      if (error) throw error;
      const adjusted = Number(data?.[0]?.adjusted_products ?? 0);
      setStocktakeId(null);
      setLines([]);
      toast.success(`Conteo finalizado. ${adjusted} productos ajustados.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo finalizar el conteo");
    } finally {
      setBusy(false);
    }
  }

  function exportPdf() {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Nüva One — Conteo físico de inventario", 14, 18);
    doc.setFontSize(10);
    doc.text(`Empresa: ${active?.name ?? "Empresa activa"}`, 14, 26);
    doc.text(`Fecha: ${new Date().toLocaleString("es-CL")}`, 14, 32);
    doc.text("Producto", 14, 43);
    doc.text("Sistema", 130, 43);
    doc.text("Físico", 157, 43);
    doc.text("Dif.", 181, 43);
    let y = 50;
    for (const line of lines) {
      if (y > 280) { doc.addPage(); y = 18; }
      doc.setFontSize(9);
      doc.text(line.product_name.slice(0, 40), 14, y);
      doc.text(String(line.system_qty), 130, y);
      doc.text(String(line.counted_qty), 157, y);
      doc.text(String(Number(line.difference ?? 0)), 181, y);
      y += 7;
    }
    doc.save(`nuva-conteo-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Conteo físico colaborativo</h2>
            <p className="text-sm text-muted-foreground">
              Las lecturas se guardan inmediatamente y se sincronizan entre los dispositivos autorizados.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {stocktakeId && <Badge variant="secondary" className="gap-1"><Users className="h-3 w-3" /> Compartido</Badge>}
            <Button disabled={!canWrite || busy} onClick={() => void startCount()}>
              <ClipboardCheck className="mr-2 h-4 w-4" />{stocktakeId ? "Continuar conteo" : "Iniciar conteo"}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input ref={inputRef} value={code} onChange={e => setCode(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") void resolveTypedCode(); }}
              placeholder="Escanea o ingresa SKU / código de barras" className="pl-9" />
          </div>
          <Button onClick={() => void resolveTypedCode()} disabled={!canWrite || busy || !code.trim()}>
            {busy ? "Guardando…" : "Agregar"}
          </Button>
          <Button variant="outline" onClick={() => setScannerOpen(true)} disabled={!canWrite || busy}>
            <ScanBarcode className="mr-2 h-4 w-4" />Escanear
          </Button>
        </div>
        {stocktakeId && active?.id && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold">Conteo sincronizado con móviles</div>
              <div className="truncate font-mono text-[10px] text-muted-foreground">Operación {stocktakeId}</div>
            </div>
            <MobileScannerPairingCard businessId={active.id} module="inventory" operationId={stocktakeId} title="Vincular móvil a este conteo" />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Modo de conteo</span>
          <Button size="sm" variant={countMode === "unit" ? "default" : "outline"} onClick={() => setCountMode("unit")}>
            <Plus className="mr-1 h-3 w-3" />Cada lectura = 1
          </Button>
          <Button size="sm" variant={countMode === "quantity" ? "default" : "outline"} onClick={() => setCountMode("quantity")}>
            Escanear + cantidad
          </Button>
          {countMode === "quantity" && (
            <Input type="number" min="0.001" step="1" value={countQuantity}
              onChange={e => setCountQuantity(e.target.value)} className="h-9 w-28" aria-label="Cantidad contada" />
          )}
        </div>
        {unknownCode && (
          <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div>
              <div className="font-semibold">Código nuevo detectado</div>
              <div className="font-mono text-sm text-muted-foreground">{unknownCode}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Puedes crear un producto nuevo (stock inicial cero) o asociar este código a uno existente.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input value={newProductName} onChange={e => setNewProductName(e.target.value)} placeholder="Nombre del producto" />
              <Button onClick={() => void createUnknownProduct()} disabled={!canWrite || busy || !newProductName.trim()}>
                <PackagePlus className="mr-2 h-4 w-4" />Crear y contar
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <select value={existingProductId} onChange={e => setExistingProductId(e.target.value)}
                className="h-10 rounded-md border bg-background px-3 text-sm">
                {products.map(product => <option key={product.id} value={product.id}>{product.name} · {product.sku ?? "Sin SKU"}</option>)}
              </select>
              <Button variant="outline" onClick={() => void associateUnknownCode()} disabled={!canWrite || busy || !existingProductId}>
                Asociar y contar
              </Button>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setUnknownCode("")}>Cancelar</Button>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="overflow-x-auto p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Productos contabilizados</h3>
            <Badge variant="outline">{lines.length} productos</Badge>
          </div>
          <table className="w-full min-w-[580px] text-sm">
            <thead><tr className="border-b text-left text-xs text-muted-foreground">
              <th className="p-2">Producto</th><th className="p-2">Código</th>
              <th className="p-2 text-right">Sistema</th><th className="p-2 text-right">Físico</th>
              <th className="p-2 text-right">Dif.</th>
            </tr></thead>
            <tbody>{lines.map(line => (
              <tr key={line.id} className="border-b">
                <td className="p-2 font-medium">{line.product_name}</td>
                <td className="p-2 font-mono text-xs">{line.barcode ?? "—"}</td>
                <td className="p-2 text-right">{line.system_qty}</td>
                <td className="p-2 text-right font-semibold">{line.counted_qty}</td>
                <td className="p-2 text-right">
                  <Badge variant={Number(line.difference ?? 0) === 0 ? "secondary" : "destructive"}>
                    {Number(line.difference ?? 0)}
                  </Badge>
                </td>
              </tr>
            ))}</tbody>
          </table>
          {!lines.length && <p className="py-10 text-center text-sm text-muted-foreground">
            Inicia o continúa un conteo compartido y agrega productos desde cualquier dispositivo.
          </p>}
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold">Resumen compartido</h3>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span>Productos</span><strong>{lines.length}</strong></div>
            <div className="flex justify-between"><span>Unidades sistema</span><strong>{lines.reduce((s,l) => s + Number(l.system_qty), 0)}</strong></div>
            <div className="flex justify-between"><span>Unidades físicas</span><strong>{lines.reduce((s,l) => s + Number(l.counted_qty), 0)}</strong></div>
            <div className="flex justify-between"><span>Diferencia</span><strong>{lines.reduce((s,l) => s + Number(l.difference ?? 0), 0)}</strong></div>
          </div>
          <div className="mt-5 grid gap-2">
            <Button disabled={!lines.length || !canWrite || busy} onClick={() => void finish()}>
              <ClipboardCheck className="mr-2 h-4 w-4" />Finalizar y ajustar
            </Button>
            <Button variant="outline" disabled={!lines.length} onClick={exportPdf}>
              <FileDown className="mr-2 h-4 w-4" />Exportar PDF
            </Button>
            <Button variant="outline" onClick={onOpenProducts} disabled={!onOpenProducts}>
              <PackagePlus className="mr-2 h-4 w-4" />Catálogo de productos
            </Button>
          </div>
        </Card>
      </div>

      <LiveProductScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        title="Escáner de conteo"
        onResolved={resolution => {
          const product = resolution.product;
          if (resolution.status === "FOUND" && product) {
            void addProduct({
              id: product.product_id,
              name: product.name ?? "Producto",
              stock: Number(product.stock ?? 0),
              barcode: product.barcode,
              sku: product.sku,
            }, resolution.input);
          } else if (resolution.status === "NOT_FOUND") {
            setUnknownCode(resolution.input);
            setScannerOpen(false);
          }
        }}
      />
    </div>
  );
}
