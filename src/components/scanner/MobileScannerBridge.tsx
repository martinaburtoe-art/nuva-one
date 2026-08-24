import { useEffect, useRef } from 'react';
import { resolveProductCode, normalizeProductCode } from '@/lib/product-resolver';
import { toast } from 'sonner';

/**
 * Invisible hardware-scanner bridge for Caja.
 * USB/Bluetooth barcode readers normally behave as keyboard wedges: they type
 * a barcode rapidly and finish with Enter. The camera scanner remains the
 * single visible scanner control in the POS.
 */
export function MobileScannerBridge({ onScan }: { businessId: string; onScan: (code: string) => void }) {
  const onScanRef = useRef(onScan);
  const bufferRef = useRef('');
  const firstKeyAtRef = useRef(0);
  const lastKeyAtRef = useRef(0);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    let disposed = false;

    const handleKeyDown = async (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditable = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      const now = performance.now();

      if (now - lastKeyAtRef.current > 120) {
        bufferRef.current = '';
        firstKeyAtRef.current = now;
      }
      lastKeyAtRef.current = now;

      if (event.key === 'Enter') {
        const code = normalizeProductCode(bufferRef.current);
        const burstDuration = firstKeyAtRef.current ? now - firstKeyAtRef.current : Infinity;
        const looksLikeScanner = code.length >= 4 && bufferRef.current.length >= 4 && burstDuration <= 220;
        bufferRef.current = '';
        firstKeyAtRef.current = 0;
        if (!looksLikeScanner) return;

        try {
          const resolution = await resolveProductCode(code);
          if (disposed) return;
          if (resolution.status === 'FOUND' && resolution.product) {
            event.preventDefault();
            onScanRef.current(code);
            navigator.vibrate?.(20);
            toast.success(`${resolution.product.name ?? 'Producto'} identificado por lector`);
          } else if (resolution.status === 'DUPLICATE') {
            toast.error(`El código ${code} está asociado a más de un producto`);
          } else if (resolution.status === 'NOT_FOUND' && !isEditable) {
            toast.error(`Código ${code} no registrado`);
          }
        } catch {
          // Do not interrupt the POS when a reader sends an invalid/unknown code.
        }
        return;
      }

      if (event.key.length !== 1) return;
      if (isEditable && !/^[0-9A-Za-z]$/.test(event.key)) return;

      if (!bufferRef.current) firstKeyAtRef.current = now;
      bufferRef.current += event.key;
      if (bufferRef.current.length > 64) bufferRef.current = bufferRef.current.slice(-64);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      disposed = true;
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  return null;
}
