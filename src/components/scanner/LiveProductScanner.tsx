import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Check, ClipboardList, Loader2, PackagePlus, Plus, RotateCcw, ScanBarcode, Search, X, Zap, ZapOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UnifiedScanEngine, type UnifiedScanResult } from "@/lib/unified-scan-engine";
import { resolveProductCode, type ProductResolution } from "@/lib/product-resolver";
import { toast } from "sonner";

type ScannerState = "idle" | "requesting_permission" | "camera_starting" | "scanning" | "detected" | "resolving" | "found" | "not_found" | "duplicate" | "inactive" | "permission_denied" | "camera_error" | "unsupported" | "stopped";
export type ScannerAction = "entry" | "exit" | "count" | "new_product" | "add_code" | "view_product";

export type LiveProductScannerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan?: (result: UnifiedScanResult) => void;
  onResolved?: (resolution: ProductResolution) => void;
  onProductFound?: (product: NonNullable<ProductResolution["product"]>, result: UnifiedScanResult) => void;
  onCodeNotFound?: (code: string, result: UnifiedScanResult) => void;
  onAction?: (action: ScannerAction, context: { code: string; product?: NonNullable<ProductResolution["product"]>; result?: UnifiedScanResult }) => void;
  title?: string;
  continuous?: boolean;
};

export function LiveProductScanner({ open, onOpenChange, onScan, onResolved, onProductFound, onCodeNotFound, onAction, title = "Nüva Live", continuous = true }: LiveProductScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<UnifiedScanEngine | null>(null);
  const lastHandledRef = useRef("");
  const onScanRef = useRef(onScan);
  const continuousRef = useRef(continuous);
  const [state, setState] = useState<ScannerState>("idle");
  const [lastCode, setLastCode] = useState("");
  const [lastFormat, setLastFormat] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  useEffect(() => { onScanRef.current = onScan; }, [onScan]);
  useEffect(() => { continuousRef.current = continuous; }, [continuous]);

  const stop = useCallback(() => {
    scannerRef.current?.stop();
    scannerRef.current = null;
    setTorch(false);
    setTorchSupported(false);
    setState("stopped");
  }, []);

  const emitAction = useCallback((action: ScannerAction, product?: NonNullable<ProductResolution["product"]>) => {
    onAction?.({ action, context: { code: lastCode, product } });
  }, [lastCode, onAction]);

  const handleDetection = useCallback(async (result: UnifiedScanResult) => {
    const code = result.rawValue.trim();
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
        setState("found");
        onProductFound?.(resolution.product, result);
        toast.success(`${resolution.product.name ?? "Producto"} encontrado`);
      } else if (resolution.status === "DUPLICATE") {
        setState("duplicate");
        toast.error("Hay múltiples productos asociados a este código");
      } else if (resolution.status === "NOT_FOUND") {
        setState("not_found");
        onCodeNotFound?.(code, result);
        toast.info("Código nuevo detectado");
      } else if (resolution.status === "UNAUTHORIZED") {
        setState("camera_error");
        toast.error("No tienes autorización para consultar este producto");
      } else {
        setState("camera_error");
        toast.error("No se pudo resolver el código");
      }
    } catch {
      setState("camera_error");
      toast.error("No se pudo consultar el producto");
    } finally {
      window.setTimeout(() => {
        lastHandledRef.current = "";
        if (continuousRef.current && scannerRef.current) setState("scanning");
      }, 900);
    }
  }, [onCodeNotFound, onProductFound, onResolved]);

  useEffect(() => {
    if (!open || !videoRef.current) return;
    let cancelled = false;
    const start = async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setState("unsupported");
        return;
      }
      setState("requesting_permission");
      const scanner = new UnifiedScanEngine({ onDetect: handleDetection, onError: () => { if (!cancelled) setState("camera_error"); }, hidEnabled: true });
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
    return () => { cancelled = true; scanner.stop(); scannerRef.current = null; };
  }, [open, handleDetection]);

  const submitManualCode = async () => {
    const code = manualCode.trim();
    if (!code) return;
    await handleDetection({ rawValue: code, format: "manual" } as UnifiedScanResult);
  };

  const toggleTorch = async () => {
    const scanner = scannerRef.current;
    if (!scanner || !torchSupported) return;
    try { await scanner.setTorch(!torch); setTorch((value) => !value); } catch { toast.error("La linterna no está disponible"); }
  };

  const statusText: Record<ScannerState, string> = {
    idle: "Listo para escanear", requesting_permission: "Solicitando acceso a la cámara…", camera_starting: "Iniciando cámara…", scanning: continuous ? "Apunta al código · escaneo continuo" : "Apunta al código", detected: "Código detectado", resolving: "Buscando producto…", found: "Producto encontrado", not_found: "Código nuevo", duplicate: "Múltiples coincidencias", inactive: "Código inactivo", permission_denied: "Permiso de cámara denegado", camera_error: "No se pudo iniciar la cámara", unsupported: "Este dispositivo no permite escaneo en vivo", stopped: "Escáner detenido",
  };

  return <Dialog open={open} onOpenChange={(value) => { if (!value) stop(); onOpenChange(value); }}>
    <DialogContent className="max-w-lg overflow-hidden p-0">
      <DialogHeader className="px-4 pt-4"><DialogTitle className="flex items-center gap-2"><ScanBarcode className="h-5 w-5 text-primary" />{title}{continuous && <Badge variant="outline" className="ml-auto text-[10px]">Continuo</Badge>}</DialogTitle></DialogHeader>
      <div className="space-y-3 px-4 pb-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" muted autoPlay playsInline />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="relative h-32 w-[78%] max-w-sm rounded-2xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,.35)]"><div className="absolute left-0 right-0 top-1/2 h-0.5 animate-pulse bg-primary" /></div></div>
          <div className="absolute left-3 top-3"><Badge variant="secondary" className="gap-1 bg-black/55 text-white"><span className="h-2 w-2 animate-pulse rounded-full bg-primary" />{statusText[state]}</Badge></div>
          {state === "resolving" && <div className="absolute inset-x-0 bottom-3 mx-auto flex w-fit items-center gap-2 rounded-full bg-black/65 px-3 py-2 text-xs text-white"><Loader2 className="h-4 w-4 animate-spin" />Consultando producto</div>}
        </div>
        <div className="flex gap-2"><Input value={manualCode} onChange={(e) => setManualCode(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void submitManualCode(); }} placeholder="Ingresar SKU / EAN manualmente" className="font-mono" /><Button size="icon" variant="outline" onClick={() => void submitManualCode()} disabled={!manualCode.trim()} aria-label="Buscar código"><Search className="h-4 w-4" /></Button></div>
        <div className="flex items-center justify-between gap-2"><div className="min-w-0 flex-1"><div className="text-xs text-muted-foreground">Último código</div><div className="truncate font-mono text-sm font-semibold">{lastCode || "—"}</div>{lastFormat && <div className="text-[11px] text-muted-foreground">{lastFormat}</div>}</div><div className="flex gap-2"><Button size="icon" variant="outline" disabled={!torchSupported} onClick={toggleTorch} aria-label="Linterna">{torch ? <ZapOff className="h-4 w-4" /> : <Zap className="h-4 w-4" />}</Button><Button size="icon" variant="outline" onClick={() => { stop(); onOpenChange(false); }} aria-label="Cerrar"><X className="h-4 w-4" /></Button></div></div>
        {state === "found" && <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3"><div className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-primary" /><span>Producto identificado. Selecciona una operación.</span></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3"><Button size="sm" variant="outline" onClick={() => emitAction("entry")}><PackagePlus className="mr-1.5 h-4 w-4" />Entrada</Button><Button size="sm" variant="outline" onClick={() => emitAction("exit")}><PackagePlus className="mr-1.5 h-4 w-4" />Salida</Button><Button size="sm" variant="outline" onClick={() => emitAction("count")}><ClipboardList className="mr-1.5 h-4 w-4" />Contar</Button><Button size="sm" variant="outline" onClick={() => emitAction("add_code")}><Plus className="mr-1.5 h-4 w-4" />Agregar código</Button><Button size="sm" variant="outline" onClick={() => emitAction("view_product")}><Search className="mr-1.5 h-4 w-4" />Ver producto</Button></div></div>}
        {state === "not_found" && <div className="rounded-xl border bg-muted/40 p-3 text-sm"><div className="font-medium">Código no registrado</div><div className="mt-1 text-xs text-muted-foreground">Puedes crear un producto nuevo o asociar este código a un producto existente.</div><div className="mt-3 flex gap-2"><Button size="sm" onClick={() => emitAction("new_product")}><Plus className="mr-1.5 h-4 w-4" />Crear producto</Button><Button size="sm" variant="outline" onClick={() => emitAction("add_code")}><Plus className="mr-1.5 h-4 w-4" />Asociar código</Button></div></div>}
        {(state === "duplicate" || state === "camera_error" || state === "permission_denied" || state === "unsupported") && <div className="rounded-xl border bg-muted/40 p-3 text-sm"><div className="font-medium">{statusText[state]}</div>{state === "duplicate" && <div className="mt-1 text-xs text-muted-foreground">Revisa las asociaciones y conserva un único código primario por producto.</div>}{state === "permission_denied" && <div className="mt-1 text-xs text-muted-foreground">Permite la cámara en el navegador y vuelve a intentarlo.</div>}{state === "unsupported" && <div className="mt-1 text-xs text-muted-foreground">Prueba Chrome actualizado en Android o la aplicación nativa.</div>}<Button variant="outline" className="mt-3" onClick={() => { stop(); setLastCode(""); setManualCode(""); setState("idle"); onOpenChange(false); window.setTimeout(() => onOpenChange(true), 0); }}><RotateCcw className="mr-2 h-4 w-4" />Reintentar</Button></div>}
        {state === "scanning" && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Camera className="h-4 w-4" />Cámara en vivo · lector HID · búsqueda manual</div>}
        {state === "stopped" && <div className="flex items-center gap-2 text-xs text-muted-foreground"><CameraOff className="h-4 w-4" />Cámara detenida</div>}
      </div>
    </DialogContent>
  </Dialog>;
}
