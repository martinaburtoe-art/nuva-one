import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Check, ClipboardList, Loader2, PackagePlus, Plus, RotateCcw, ScanBarcode, Search, X, Zap, ZapOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UnifiedScanEngine, type UnifiedScanResult } from "@/lib/unified-scan-engine";
import { resolveProductCode, normalizeProductCode, type ProductResolution } from "@/lib/product-resolver";
import { executeScannerInventoryAction, type ScannerInventoryAction } from "@/lib/scanner-inventory-actions";
import { validateScannerInventoryAction } from "@/lib/scanner-inventory-action-state";
import { validateScannedCode } from "@/lib/scanner-code-validation";
import { adjustInventoryStock } from "@/lib/inventory-transactions";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusinessId, useMyRole, canWriteOperations } from "@/lib/use-business";
import { toast } from "sonner";

type ScannerState = "idle" | "requesting_permission" | "camera_starting" | "scanning" | "detected" | "resolving" | "found" | "not_found" | "duplicate" | "inactive" | "permission_denied" | "camera_error" | "unsupported" | "stopped";
export type ScannerAction = "entry" | "exit" | "count" | "new_product" | "add_code" | "view_product";
type ScannerProduct = NonNullable<ProductResolution["product"]> & { id: string; stock?: number | null };
type InventoryActionResult = { stock_before?: number | null; stock_after?: number | null } | Array<{ stock_before?: number | null; stock_after?: number | null }>;

type NewProductForm = { name: string; sku: string; cost: string; price: string; initialStock: string };

export type LiveProductScannerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan?: (result: UnifiedScanResult) => void;
  onResolved?: (resolution: ProductResolution) => void;
  onProductFound?: (product: ScannerProduct, result: UnifiedScanResult) => void;
  onCodeNotFound?: (code: string, result: UnifiedScanResult) => void;
  onAction?: (action: ScannerAction, context: { code: string; product?: ScannerProduct; result?: UnifiedScanResult }) => void;
  title?: string;
  continuous?: boolean;
};

export function LiveProductScanner({ open, onOpenChange, onScan, onResolved, onProductFound, onCodeNotFound, onAction, title = "Nüva Live", continuous = true }: LiveProductScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<UnifiedScanEngine | null>(null);
  const lastHandledRef = useRef("");
  const onScanRef = useRef(onScan);
  const continuousRef = useRef(continuous);
  const [businessId] = useActiveBusinessId();
  const { data: role } = useMyRole();
  const canWrite = canWriteOperations(role);
  const [state, setState] = useState<ScannerState>("idle");
  const [lastCode, setLastCode] = useState("");
  const [lastFormat, setLastFormat] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [operation, setOperation] = useState<ScannerInventoryAction | null>(null);
  const [operationProduct, setOperationProduct] = useState<ScannerProduct | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [savingOperation, setSavingOperation] = useState(false);
  const [newProductOpen, setNewProductOpen] = useState(false);
  const [newProductSaving, setNewProductSaving] = useState(false);
  const [newProductForm, setNewProductForm] = useState<NewProductForm>({ name: "", sku: "", cost: "", price: "", initialStock: "0" });

  useEffect(() => { onScanRef.current = onScan; }, [onScan]);
  useEffect(() => { continuousRef.current = continuous; }, [continuous]);

  const stop = useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current = null;
    setTorch(false);
    setTorchSupported(false);
    setOperation(null);
    setOperationProduct(null);
    setNewProductOpen(false);
    setState("stopped");
  }, []);

  const emitAction = useCallback((action: ScannerAction, product?: ScannerProduct) => {
    onAction?.({ action, context: { code: lastCode, product } });
    if ((action === "entry" || action === "exit" || action === "count") && product?.id) {
      setOperation(action);
      setOperationProduct(product);
      setQuantity("1");
      setReason(action === "entry" ? "Entrada desde escáner" : action === "exit" ? "Salida desde escáner" : "Conteo físico desde escáner");
    }
    if (action === "new_product") {
      setNewProductForm({ name: "", sku: "", cost: "", price: "", initialStock: "0" });
      setNewProductOpen(true);
    }
  }, [lastCode, onAction]);

  const handleDetection = useCallback(async (result: UnifiedScanResult) => {
    const code = normalizeProductCode(result.rawValue);
    if (!code || code === lastHandledRef.current) return;
    lastHandledRef.current = code;
    setLastCode(code);
    setManualCode(code);
    setLastFormat(result.format ?? result.input);
    setState("detected");
    if (typeof navigator !== "undefined") navigator.vibrate?.(35);
    onScanRef.current?.(result);
    setState("resolving");
    try {
      const resolution = await resolveProductCode(code);
      onResolved?.(resolution);
      if (resolution.status === "FOUND" && resolution.product) {
        const product = resolution.product as ScannerProduct;
        setOperationProduct(product);
        setState("found");
        onProductFound?.(product, result);
        toast.success(`${product.name ?? "Producto"} encontrado`);
      } else if (resolution.status === "DUPLICATE") {
        setOperationProduct(null);
        setState("duplicate");
        toast.error("Hay múltiples productos asociados a este código");
      } else if (resolution.status === "NOT_FOUND") {
        setOperationProduct(null);
        setState("not_found");
        onCodeNotFound?.(code, result);
        toast.info("Código nuevo detectado");
      } else if (resolution.status === "UNAUTHORIZED") {
        setOperationProduct(null);
        setState("camera_error");
        toast.error("No tienes autorización para consultar este producto");
      } else {
        setOperationProduct(null);
        setState("camera_error");
        toast.error("No se pudo resolver el código");
      }
    } catch {
      setOperationProduct(null);
      setState("camera_error");
      toast.error("No se pudo consultar el producto");
    } finally {
      window.setTimeout(() => {
        lastHandledRef.current = "";
        if (continuousRef.current && scannerRef.current && !operation && !newProductOpen) setState("scanning");
      }, 900);
    }
  }, [onCodeNotFound, onProductFound, onResolved, operation, newProductOpen]);

  useEffect(() => {
    if (!open || !videoRef.current) return;
    let cancelled = false;
    let scanner: UnifiedScanEngine | null = null;
    const start = async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setState("unsupported");
        return;
      }
      setState("requesting_permission");
      scanner = new UnifiedScanEngine({ onDetect: handleDetection, onError: () => { if (!cancelled) setState("camera_error"); }, hidEnabled: true });
      scannerRef.current = scanner;
      setState("camera_starting");
      try {
        await scanner.start(videoRef.current!);
        if (cancelled) return;
        const torchInfo = scanner.getTorchState();
        setTorchSupported(torchInfo.supported);
        setState("scanning");
      } catch (error) {
        if (cancelled) return;
        const name = error instanceof DOMException ? error.name : "";
        setState(name === "NotAllowedError" || name === "PermissionDeniedError" ? "permission_denied" : "camera_error");
      }
    };
    void start();
    return () => { cancelled = true; scanner?.stop(); scannerRef.current = null; };
  }, [open, handleDetection]);

  const submitManualCode = async () => { const code = manualCode.trim(); if (!code) return; await handleDetection({ rawValue: code, format: "manual" } as UnifiedScanResult); };

  const submitOperation = async () => {
    if (!operation || !operationProduct) return;
    const parsedQuantity = Number(quantity);
    try {
      const validated = validateScannerInventoryAction({ operation, quantity: parsedQuantity, reason, currentStock: Number(operationProduct.stock ?? 0) });
      setSavingOperation(true);
      const result = await executeScannerInventoryAction({ client: supabase, productId: operationProduct.id, operation: validated.operation, quantity: validated.quantity, currentStock: validated.currentStock, reason: validated.reason, scanCode: lastCode });
      const payload = Array.isArray(result) ? result[0] : result;
      const stockBefore = typeof payload?.stock_before === "number" ? payload.stock_before : validated.currentStock;
      const stockAfter = typeof payload?.stock_after === "number" ? payload.stock_after : null;
      if (typeof stockAfter === "number") setOperationProduct((current) => current ? { ...current, stock: stockAfter } : current);
      toast.success(`Movimiento registrado · stock ${stockBefore} → ${stockAfter ?? "actualizado"}`);
      setOperation(null); setQuantity("1"); setReason("");
      if (continuousRef.current && scannerRef.current) setState("scanning");
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo registrar el movimiento"); }
    finally { setSavingOperation(false); }
  };

  const openNewProduct = () => {
    if (!canWrite || !businessId || !lastCode) { toast.error("No se puede crear el producto sin una empresa y un código válido."); return; }
    const validation = validateScannedCode(lastCode);
    if (validation.kind === "invalid") { toast.error(validation.message); return; }
    setNewProductForm({ name: "", sku: "", cost: "", price: "", initialStock: "0" });
    setNewProductOpen(true);
  };

  const createProductFromScanner = async () => {
    if (!canWrite || !businessId) return;
    const code = normalizeProductCode(lastCode);
    const validation = validateScannedCode(code);
    if (validation.kind === "invalid") { toast.error(validation.message); return; }
    const name = newProductForm.name.trim();
    if (!name) { toast.error("El nombre del producto es obligatorio."); return; }
    const cost = Number(newProductForm.cost || 0);
    const price = Number(newProductForm.price || 0);
    const initialStock = Number(newProductForm.initialStock || 0);
    if (![cost, price, initialStock].every(Number.isFinite) || cost < 0 || price < 0 || !Number.isInteger(initialStock) || initialStock < 0) { toast.error("Costo, precio y stock inicial deben ser valores válidos."); return; }
    setNewProductSaving(true);
    let createdId: string | null = null;
    let codeId: string | null = null;
    try {
      const existing = await resolveProductCode(code);
      if (existing.status === "FOUND") throw new Error(`El código ya está asociado a ${existing.product?.name ?? "otro producto"}.`);
      if (existing.status === "DUPLICATE") throw new Error("El código tiene múltiples asociaciones y no puede reutilizarse.");
      if (existing.status === "UNAUTHORIZED") throw new Error("No tienes autorización para registrar este código.");

      let sku = newProductForm.sku.trim().toUpperCase();
      if (!sku) {
        const { data, error } = await (supabase as any).rpc("generate_product_sku", { p_business_id: businessId, p_prefix: "NVA-PRD" });
        if (error) throw error;
        sku = String(data ?? "").trim().toUpperCase();
      }
      if (!sku) throw new Error("No fue posible generar el SKU.");

      const { data: created, error: productError } = await (supabase as any).from("products").insert({ business_id: businessId, name, sku, cost, price, stock: 0 }).select("id,name,sku,stock").single();
      if (productError) throw productError;
      createdId = String(created.id);

      const userId = (await supabase.auth.getUser()).data.user?.id ?? null;
      const codeType = validation.kind === "EAN-13" ? "ean_13" : validation.kind === "EAN-8" ? "ean_8" : validation.kind === "UPC-A" ? "upc_a" : "alternate";
      const { data: createdCode, error: codeError } = await (supabase as any).from("product_codes").insert({ business_id: businessId, product_id: createdId, code, code_type: codeType, is_primary: true, created_by: userId }).select("id").single();
      if (codeError) throw codeError;
      codeId = String(createdCode.id);

      if (initialStock > 0) await adjustInventoryStock(supabase, { productId: createdId, delta: initialStock, reason: "Stock inicial desde scanner", sourceType: "scanner_new_product", sourceId: code });

      setOperationProduct({ ...created, id: createdId, stock: initialStock } as ScannerProduct);
      setNewProductOpen(false);
      setState("found");
      toast.success(`${name} creado · ${sku} · código asociado`);
      onAction?.({ action: "new_product", context: { code, product: { ...created, id: createdId, stock: initialStock } as ScannerProduct } });
    } catch (error) {
      if (codeId && createdId) await (supabase as any).from("product_codes").delete().eq("id", codeId).eq("business_id", businessId);
      if (createdId) await (supabase as any).from("products").delete().eq("id", createdId).eq("business_id", businessId);
      toast.error(error instanceof Error ? error.message : "No se pudo crear el producto desde el scanner.");
    } finally { setNewProductSaving(false); }
  };

  const toggleTorch = async () => { const scanner = scannerRef.current; if (!scanner || !torchSupported) return; try { await scanner.setTorch(!torch); setTorch((value) => !value); } catch { toast.error("La linterna no está disponible"); } };

  const statusText: Record<ScannerState, string> = { idle: "Listo para escanear", requesting_permission: "Solicitando acceso a la cámara…", camera_starting: "Iniciando cámara…", scanning: continuous ? "Apunta al código · escaneo continuo" : "Apunta al código", detected: "Código detectado", resolving: "Buscando producto…", found: "Producto encontrado", not_found: "Código nuevo", duplicate: "Múltiples coincidencias", inactive: "Código inactivo", permission_denied: "Permiso de cámara denegado", camera_error: "No se pudo iniciar la cámara", unsupported: "Este dispositivo no permite escaneo en vivo", stopped: "Escáner detenido" };

  return <Dialog open={open} onOpenChange={(value) => { if (!value) stop(); onOpenChange(value); }}>
    <DialogContent className="max-w-lg overflow-hidden p-0">
      <DialogHeader className="px-4 pt-4"><DialogTitle className="flex items-center gap-2"><ScanBarcode className="h-5 w-5 text-primary" />{title}{continuous && <Badge variant="outline" className="ml-auto text-[10px]">Continuo</Badge>}</DialogTitle></DialogHeader>
      <div className="space-y-3 px-4 pb-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black"><video ref={videoRef} className="h-full w-full object-cover" muted autoPlay playsInline /><div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="relative h-32 w-[78%] max-w-sm rounded-2xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,.35)]"><div className="absolute left-0 right-0 top-1/2 h-0.5 animate-pulse bg-primary" /></div></div><div className="absolute left-3 top-3"><Badge variant="secondary" className="gap-1 bg-black/55 text-white"><span className="h-2 w-2 animate-pulse rounded-full bg-primary" />{statusText[state]}</Badge></div>{state === "resolving" && <div className="absolute inset-x-0 bottom-3 mx-auto flex w-fit items-center gap-2 rounded-full bg-black/65 px-3 py-2 text-xs text-white"><Loader2 className="h-4 w-4 animate-spin" />Consultando producto</div>}</div>
        <div className="flex gap-2"><Input value={manualCode} onChange={(e) => setManualCode(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void submitManualCode(); }} placeholder="Ingresar SKU / EAN manualmente" className="font-mono" /><Button size="icon" variant="outline" onClick={() => void submitManualCode()} disabled={!manualCode.trim()} aria-label="Buscar código"><Search className="h-4 w-4" /></Button></div>
        <div className="flex items-center justify-between gap-2"><div className="min-w-0 flex-1"><div className="text-xs text-muted-foreground">Último código</div><div className="truncate font-mono text-sm font-semibold">{lastCode || "—"}</div>{lastFormat && <div className="text-[11px] text-muted-foreground">{lastFormat}</div>}</div><div className="flex gap-2"><Button size="icon" variant="outline" disabled={!torchSupported} onClick={toggleTorch} aria-label="Linterna">{torch ? <ZapOff className="h-4 w-4" /> : <Zap className="h-4 w-4" />}</Button><Button size="icon" variant="outline" onClick={() => { stop(); onOpenChange(false); }} aria-label="Cerrar"><X className="h-4 w-4" /></Button></div></div>
        {state === "found" && !operation && operationProduct && <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3"><div className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-primary" /><span>Producto identificado. Selecciona una operación.</span></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3"><Button size="sm" variant="outline" onClick={() => emitAction("entry", operationProduct)}><PackagePlus className="mr-1.5 h-4 w-4" />Entrada</Button><Button size="sm" variant="outline" onClick={() => emitAction("exit", operationProduct)}><PackagePlus className="mr-1.5 h-4 w-4" />Salida</Button><Button size="sm" variant="outline" onClick={() => emitAction("count", operationProduct)}><ClipboardList className="mr-1.5 h-4 w-4" />Contar</Button><Button size="sm" variant="outline" onClick={() => emitAction("add_code", operationProduct)}><Plus className="mr-1.5 h-4 w-4" />Agregar código</Button><Button size="sm" variant="outline" onClick={() => emitAction("view_product", operationProduct)}><Search className="mr-1.5 h-4 w-4" />Ver producto</Button></div></div>}
        {state === "found" && operation && operationProduct && <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-3"><div><div className="text-sm font-semibold">{operation === "entry" ? "Entrada de inventario" : operation === "exit" ? "Salida de inventario" : "Conteo físico"}</div><div className="text-xs text-muted-foreground">{operationProduct.name ?? "Producto"} · Stock actual: {Number(operationProduct.stock ?? 0)}</div></div><div className="grid gap-2"><Input type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Cantidad" inputMode="numeric"/><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo del movimiento"/><div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setOperation(null)} disabled={savingOperation}>Cancelar</Button><Button onClick={() => void submitOperation()} disabled={savingOperation}>{savingOperation ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Registrando…</> : "Confirmar movimiento"}</Button></div></div></div>}
        {state === "not_found" && <div className="rounded-xl border bg-muted/40 p-3 text-sm"><div className="font-medium">Código no registrado</div><div className="mt-1 text-xs text-muted-foreground">El código puede crear un producto nuevo directamente desde el scanner.</div><div className="mt-3 flex gap-2"><Button size="sm" onClick={openNewProduct}><Plus className="mr-1.5 h-4 w-4" />Crear producto</Button><Button size="sm" variant="outline" onClick={() => emitAction("add_code")}><Plus className="mr-1.5 h-4 w-4" />Asociar código</Button></div></div>}
        {(state === "duplicate" || state === "camera_error" || state === "permission_denied" || state === "unsupported") && <div className="rounded-xl border bg-muted/40 p-3 text-sm"><div className="font-medium">{statusText[state]}</div>{state === "duplicate" && <div className="mt-1 text-xs text-muted-foreground">Revisa las asociaciones y conserva un único código primario por producto.</div>}{state === "permission_denied" && <div className="mt-1 text-xs text-muted-foreground">Permite la cámara en el navegador y vuelve a intentarlo.</div>}{state === "unsupported" && <div className="mt-1 text-xs text-muted-foreground">Prueba Chrome actualizado en Android o la aplicación nativa.</div>}<Button variant="outline" className="mt-3" onClick={() => { stop(); setLastCode(""); setManualCode(""); setState("idle"); onOpenChange(false); window.setTimeout(() => onOpenChange(true), 0); }}><RotateCcw className="mr-2 h-4 w-4" />Reintentar</Button></div>}
        {state === "scanning" && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Camera className="h-4 w-4" />Cámara en vivo · lector HID · búsqueda manual</div>}
        {state === "stopped" && <div className="flex items-center gap-2 text-xs text-muted-foreground"><CameraOff className="h-4 w-4" />Cámara detenida</div>}
      </div>
      <Dialog open={newProductOpen} onOpenChange={setNewProductOpen}><DialogContent><DialogHeader><DialogTitle>Crear producto desde código</DialogTitle></DialogHeader><div className="space-y-4"><div className="rounded-lg bg-muted/50 p-3 text-sm"><div className="text-xs text-muted-foreground">Código detectado</div><div className="font-mono font-semibold">{lastCode || "—"}</div></div><div><Label htmlFor="scanner-product-name">Nombre</Label><Input id="scanner-product-name" value={newProductForm.name} onChange={(e) => setNewProductForm((f) => ({ ...f, name: e.target.value }))} autoFocus /></div><div><Label htmlFor="scanner-product-sku">SKU <span className="text-xs text-muted-foreground">(se genera si queda vacío)</span></Label><Input id="scanner-product-sku" value={newProductForm.sku} onChange={(e) => setNewProductForm((f) => ({ ...f, sku: e.target.value }))} /></div><div className="grid grid-cols-2 gap-3"><div><Label htmlFor="scanner-product-cost">Costo</Label><Input id="scanner-product-cost" type="number" min="0" step="0.01" value={newProductForm.cost} onChange={(e) => setNewProductForm((f) => ({ ...f, cost: e.target.value }))} /></div><div><Label htmlFor="scanner-product-price">Precio</Label><Input id="scanner-product-price" type="number" min="0" step="0.01" value={newProductForm.price} onChange={(e) => setNewProductForm((f) => ({ ...f, price: e.target.value }))} /></div></div><div><Label htmlFor="scanner-product-stock">Stock inicial</Label><Input id="scanner-product-stock" type="number" min="0" step="1" inputMode="numeric" value={newProductForm.initialStock} onChange={(e) => setNewProductForm((f) => ({ ...f, initialStock: e.target.value }))} /></div><div className="grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setNewProductOpen(false)} disabled={newProductSaving}>Cancelar</Button><Button onClick={() => void createProductFromScanner()} disabled={newProductSaving || !canWrite}>{newProductSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Creando…</> : "Crear producto"}</Button></div></div></DialogContent></Dialog>
    </DialogContent>
  </Dialog>;
}
