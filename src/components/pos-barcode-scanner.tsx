import { useRef, useState } from 'react';
import { Camera, CameraOff, Keyboard, ScanBarcode, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LiveScannerView } from '@/components/scanner/LiveScannerView';
import { toast } from 'sonner';
import { normalizeProductCode, resolveProductCode } from '@/lib/product-resolver';

type Props = { onDetected: (code: string) => void };

/** POS scanner: live camera + HID keyboard input. No photo/upload path. */
export function PosBarcodeScanner({ onDetected }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [resolving, setResolving] = useState(false);

  async function emit(raw: string) {
    const value = normalizeProductCode(raw);
    if (!value) return;
    setResolving(true);
    try {
      const resolution = await resolveProductCode(value);
      if (resolution.status === 'UNAUTHORIZED') {
        toast.error('No tienes acceso a este producto.');
        return;
      }
      if (resolution.status === 'DUPLICATE') {
        toast.error('El código está asociado a más de un producto. Revisa Códigos y SKU.');
        return;
      }
      if (resolution.status === 'NOT_FOUND') {
        toast.error(`No existe un producto con el código ${value}`);
        setCode(value);
        return;
      }
      setCode('');
      onDetected(value);
      toast.success(`${resolution.product?.name ?? 'Producto'} agregado a Caja`);
    } catch (error: any) {
      toast.error(error?.message ?? 'No se pudo resolver el producto.');
    } finally {
      setResolving(false);
      inputRef.current?.focus();
    }
  }

  return (
    <Card className="border-primary/20 bg-primary/[0.025] p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {cameraOpen ? <Camera className="h-4 w-4 text-primary" /> : <ScanBarcode className="h-4 w-4 text-primary" />}
          Escáner de Caja
        </div>
        <span className="hidden text-xs text-muted-foreground sm:inline">Cámara en vivo · pistola USB/Bluetooth HID · SKU</span>
        <div className="ml-auto flex gap-2">
          <Button type="button" size="sm" variant={cameraOpen ? 'destructive' : 'outline'} onClick={() => setCameraOpen((open) => !open)} disabled={resolving}>
            {cameraOpen ? <CameraOff className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
            {cameraOpen ? 'Cerrar cámara' : 'Cámara en vivo'}
          </Button>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <Keyboard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void emit(code);
              }
            }}
            placeholder="Listo para pistola lectora… o escribe SKU/código"
            className="pl-9"
            autoComplete="off"
            aria-label="Entrada de SKU o código de producto"
          />
        </div>
        {code && <Button type="button" variant="ghost" size="icon" aria-label="Limpiar código" onClick={() => setCode('')}><X className="h-4 w-4" /></Button>}
      </div>
      {cameraOpen && (
        <LiveScannerView
          open={cameraOpen}
          title="Escanear producto para Caja"
          onClose={() => setCameraOpen(false)}
          onDetect={(result) => void emit(result.rawValue)}
          onError={(error) => console.error('POS live scanner error', error)}
        />
      )}
    </Card>
  );
}
