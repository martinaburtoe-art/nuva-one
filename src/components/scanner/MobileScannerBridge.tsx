import { useEffect, useRef } from 'react';
import { resolveProductCode, normalizeProductCode } from '@/lib/product-resolver';
import { toast } from 'sonner';

/**
 * Scanner bridge for Caja.
 *
 * USB/Bluetooth barcode readers normally behave as keyboard wedges: they type
 * the barcode very quickly and finish with Enter. We listen globally so a
 * reader connected to the POS device can identify the product without a
 * dedicated input or extra button. The visible camera scanner remains the
 * single scanner control in Caja.
 */
export function MobileScannerBridge({ onScan }: { businessId: string; onScan: (code: string) => void }) {
  const onScanRef = useRef(onScan);
  const bufferRef = useRef('');
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

      // Scanner guns send characters in a very short burst. If the user is
      // typing normally, never steal their input. A burst is considered a
      // scanner candidate after at least 4 characters arrive within 120ms.
      if (now - lastKeyAtRef.current > 120) bufferRef.current = '';
      lastKeyAtRef.current = now;

      if (event.key === 'Enter') {
        const code = normalizeProductCode(bufferRef.current);
        bufferRef.current = '';
        if (!code || code.length < 4) return;
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
          // The camera scanner handles its own errors; hardware-reader
          // failures are intentionally silent here to avoid disrupting POS.
        }
        return;
      }

      if (event.key.length !== 1) return;
      if (isEditable && !/^[0-9A-Za-z]$/.test(event.key)) return;

      bufferRef.current += event.key;
      // Keep the buffer bounded so accidental keyboard use can never grow it.
      if (bufferRef.current.length > 64) bufferRef.current = bufferRef.current.slice(-64);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      disposed = true;
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  // Intentionally no visible UI: Caja now has one scanner control only.
  return null;
}
