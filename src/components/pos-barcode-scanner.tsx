import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Keyboard, ScanBarcode, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type NativeDetector = { new (options?: { formats?: string[] }): NativeDetector; detect(source: HTMLVideoElement): Promise<Array<{ rawValue?: string }>> };
const BARCODE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "itf", "codabar", "qr_code"];
const normalizeCode = (value: string) => value.trim().replace(/\s+/g, "");

export function PosBarcodeScanner({ onDetected }: { onDetected: (code: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<NativeDetector | null>(null);
  const scanningRef = useRef(false);
  const lastCodeRef = useRef("");
  const [code, setCode] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(true);

  const emit = useCallback((raw: string) => {
    const value = normalizeCode(raw);
    if (!value || value === lastCodeRef.current) return;
    lastCodeRef.current = value;
    setCode("");
    onDetected(value);
    toast.success(`Código leído: ${value}`);
    window.setTimeout(() => { lastCodeRef.current = ""; inputRef.current?.focus(); }, 700);
  }, [onDetected]);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOpen(false);
  }, []);

  const scanFrame = useCallback(async () => {
    if (!scanningRef.current || !videoRef.current || !detectorRef.current) return;
    try {
      const results = await detectorRef.current.detect(videoRef.current);
      const value = results.find((result) => result.rawValue)?.rawValue;
      if (value) emit(value);
    } catch { /* transient camera-frame errors are expected */ }
    if (scanningRef.current) window.setTimeout(scanFrame, 220);
  }, [emit]);

  const startCamera = useCallback(async () => {
    const Detector = (window as unknown as { BarcodeDetector?: NativeDetector }).BarcodeDetector;
    if (!Detector) {
      setCameraSupported(false);
      toast.error("Tu navegador no soporta escaneo por cámara. Usa Chrome/Android actualizado o una pistola lectora.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("La cámara no está disponible en este dispositivo o contexto.");
      return;
    }
    try {
      detectorRef.current = new Detector({ formats: BARCODE_FORMATS });
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      if (!videoRef.current) return;
      videoRef.current.srcObject = streamRef.current;
      await videoRef.current.play();
      scanningRef.current = true;
      setCameraOpen(true);
      window.setTimeout(scanFrame, 250);
    } catch {
      stopCamera();
      toast.error("No se pudo abrir la cámara. Revisa el permiso de cámara del navegador.");
    }
  }, [scanFrame, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return <Card className="border-primary/20 bg-primary/[0.025] p-3 shadow-sm">
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 text-sm font-semibold"><ScanBarcode className="h-4 w-4 text-primary" />Escáner de caja</div>
      <span className="hidden text-xs text-muted-foreground sm:inline">Pistola USB/Bluetooth o cámara del teléfono</span>
      <div className="ml-auto"><Button type="button" size="sm" variant={cameraOpen ? "destructive" : "outline"} onClick={cameraOpen ? stopCamera : startCamera}>{cameraOpen ? <CameraOff className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}{cameraOpen ? "Cerrar cámara" : "Escanear con cámara"}</Button></div>
    </div>
    <div className="mt-3 flex gap-2">
      <div className="relative flex-1"><Keyboard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input ref={inputRef} value={code} onChange={(event) => setCode(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); emit(code); } }} placeholder="Listo para pistola lectora… apunta y dispara" className="pl-9" autoComplete="off" inputMode="none" aria-label="Entrada de código de barras para pistola lectora" /></div>
      {code && <Button type="button" variant="ghost" size="icon" aria-label="Limpiar código" onClick={() => setCode("")}><X className="h-4 w-4" /></Button>}
    </div>
    {cameraOpen && <div className="relative mt-3 overflow-hidden rounded-xl border bg-black"><video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline /><div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="h-24 w-64 rounded-lg border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.28)]" /></div><div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/65 px-3 py-1 text-xs text-white">Centra el código dentro del recuadro</div></div>}
    {!cameraSupported && !cameraOpen && <p className="mt-2 text-xs text-muted-foreground">Cámara no disponible en este navegador. La pistola lectora tipo HID sigue funcionando mediante teclado.</p>}
  </Card>;
}
