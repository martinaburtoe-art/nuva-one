import { Camera, CameraOff, Flashlight, FlashlightOff, RotateCcw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { LiveScanner, type LiveScanResult } from '@/lib/live-scanner';

type ScannerStatus =
  | 'starting'
  | 'scanning'
  | 'detected'
  | 'error'
  | 'unsupported';

export type LiveScannerViewProps = {
  open: boolean;
  title?: string;
  onClose: () => void;
  onDetect: (result: LiveScanResult) => void;
  onError?: (error: unknown) => void;
};

export function LiveScannerView({
  open,
  title = 'Escanear producto',
  onClose,
  onDetect,
  onError,
}: LiveScannerViewProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<LiveScanner | null>(null);
  const [status, setStatus] = useState<ScannerStatus>('starting');
  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);

  useEffect(() => {
    if (!open) return;

    const scanner = new LiveScanner({
      onDetect: (result) => {
        setStatus('detected');
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate?.(45);
        }
        onDetect(result);
        window.setTimeout(() => {
          if (scannerRef.current === scanner) setStatus('scanning');
        }, 450);
      },
      onError: (error) => {
        setStatus(
          LiveScanner.hasCameraSupport() && LiveScanner.hasNativeBarcodeDetector()
            ? 'error'
            : 'unsupported',
        );
        onError?.(error);
      },
      facingMode: 'environment',
      scanIntervalMs: 160,
      duplicateCooldownMs: 1200,
    });

    scannerRef.current = scanner;
    const video = videoRef.current;

    if (!video) return;

    setStatus('starting');
    scanner
      .start(video)
      .then(() => {
        const torchState = scanner.getTorchState();
        setTorchSupported(torchState.supported);
        setTorch(torchState.enabled);
        setStatus('scanning');
      })
      .catch(() => undefined);

    return () => {
      scanner.stop();
      if (scannerRef.current === scanner) scannerRef.current = null;
    };
  }, [open, cameraKey, onDetect, onError]);

  if (!open) return null;

  const toggleTorch = async () => {
    const scanner = scannerRef.current;
    if (!scanner || !torchSupported) return;

    try {
      const next = !torch;
      await scanner.setTorch(next);
      setTorch(next);
    } catch (error) {
      onError?.(error);
    }
  };

  const restart = () => setCameraKey((value) => value + 1);

  const statusText = {
    starting: 'Activando cámara…',
    scanning: 'Apunta al código de barras',
    detected: 'Código detectado',
    error: 'No fue posible iniciar la cámara',
    unsupported: 'Este navegador no admite escaneo en vivo',
  }[status];

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white">
      <div className="relative flex h-full min-h-dvh w-full flex-col overflow-hidden">
        <video
          ref={videoRef}
          key={cameraKey}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          playsInline
          aria-label="Vista de cámara para escaneo en vivo"
        />

        <div className="absolute inset-0 bg-black/30" aria-hidden="true" />

        <header className="relative z-10 flex items-center justify-between px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/65">Nüva One</p>
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-11 place-items-center rounded-full bg-black/45 backdrop-blur transition active:scale-95"
            aria-label="Cerrar escáner"
          >
            <X className="size-5" />
          </button>
        </header>

        <main className="relative z-10 flex flex-1 items-center justify-center px-6">
          <div className="relative aspect-[1.65] w-full max-w-[430px]">
            <div className="absolute inset-0 rounded-3xl border border-white/15" />
            <div className="absolute -left-px -top-px h-14 w-14 rounded-tl-3xl border-l-2 border-t-2 border-white" />
            <div className="absolute -right-px -top-px h-14 w-14 rounded-tr-3xl border-r-2 border-t-2 border-white" />
            <div className="absolute -bottom-px -left-px h-14 w-14 rounded-bl-3xl border-b-2 border-l-2 border-white" />
            <div className="absolute -bottom-px -right-px h-14 w-14 rounded-br-3xl border-b-2 border-r-2 border-white" />
            {status === 'scanning' && (
              <div className="absolute inset-x-5 top-1/2 h-px animate-pulse bg-white shadow-[0_0_18px_rgba(255,255,255,0.9)]" />
            )}
          </div>
        </main>

        <footer className="relative z-10 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5">
          <div className="mx-auto mb-4 flex max-w-[520px] items-center justify-center gap-2 rounded-full bg-black/45 px-4 py-2.5 text-sm backdrop-blur">
            {status === 'scanning' ? <Camera className="size-4" /> : <CameraOff className="size-4" />}
            <span>{statusText}</span>
          </div>

          {(status === 'error' || status === 'unsupported') && (
            <button
              type="button"
              onClick={restart}
              className="mx-auto mb-4 flex h-12 w-full max-w-[320px] items-center justify-center gap-2 rounded-2xl bg-white font-semibold text-black"
            >
              <RotateCcw className="size-4" />
              Reintentar
            </button>
          )}

          <div className="mx-auto flex max-w-[520px] items-center justify-between gap-3">
            <button
              type="button"
              onClick={toggleTorch}
              disabled={!torchSupported}
              className="grid size-12 place-items-center rounded-full bg-black/45 backdrop-blur disabled:cursor-not-allowed disabled:opacity-35"
              aria-label={torch ? 'Apagar linterna' : 'Encender linterna'}
              title={torchSupported ? undefined : 'Linterna no disponible'}
            >
              {torch ? <FlashlightOff className="size-5" /> : <Flashlight className="size-5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-12 flex-1 rounded-2xl bg-white font-semibold text-black"
            >
              Listo
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
