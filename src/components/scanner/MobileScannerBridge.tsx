import { useEffect, useState } from 'react';
import { Link2, ScanBarcode, ShieldCheck, Smartphone, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { createMobileScannerSession, revokeMobileScannerSession, subscribeToMobileScanner, type MobileScannerSession } from '@/lib/mobile-scanner-bridge';
import { toast } from 'sonner';

export function MobileScannerBridge({ businessId, onScan }: { businessId: string; onScan: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<MobileScannerSession | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) return;
    return subscribeToMobileScanner(session.sessionId, (event) => {
      onScan(event.code);
      if (typeof navigator !== 'undefined') navigator.vibrate?.(20);
    });
  }, [session, onScan]);

  async function start() {
    setBusy(true);
    try {
      const next = await createMobileScannerSession(businessId);
      setSession(next);
      setOpen(true);
      toast.success('Sesión de escáner móvil creada');
    } catch { toast.error('No se pudo crear la sesión del escáner móvil'); }
    finally { setBusy(false); }
  }

  async function close() {
    if (session) await revokeMobileScannerSession(session.sessionId).catch(() => {});
    setSession(null);
    setOpen(false);
  }

  const mobileUrl = typeof window !== 'undefined' ? `${window.location.origin}/mobile-scanner` : '/mobile-scanner';
  return <>
    <Button variant="outline" onClick={start} disabled={busy || !businessId}>
      <Smartphone className="mr-2 h-4 w-4" />{busy ? 'Preparando…' : 'Usar celular como escáner'}
    </Button>
    <Dialog open={open} onOpenChange={(value) => { if (!value) void close(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><ScanBarcode className="h-5 w-5 text-primary" />Celular como lector de Caja</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Card className="border-primary/20 bg-primary/5 p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-primary" /><div><div className="font-semibold">Vinculación segura</div><p className="mt-1 text-sm text-muted-foreground">Abre <strong>Nüva Scanner Móvil</strong> en el celular e ingresa este código. Ambos dispositivos deben usar una cuenta autorizada para este negocio.</p></div></div></Card>
          <div className="rounded-2xl border bg-muted/30 p-5 text-center"><div className="text-xs uppercase tracking-wider text-muted-foreground">Código de vinculación</div><div className="mt-2 font-mono text-5xl font-bold tracking-[0.25em]">{session?.pairCode}</div><div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground"><Wifi className="h-3.5 w-3.5" />Esperando lecturas del celular</div></div>
          <div className="rounded-lg border p-3 text-xs text-muted-foreground"><div className="flex items-center gap-2 font-medium text-foreground"><Link2 className="h-3.5 w-3.5" />Dirección del lector</div><div className="mt-1 break-all font-mono">{mobileUrl}</div></div>
          <div className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => void close()}>Desconectar</Button><Button className="flex-1" onClick={() => { setOpen(false); }}>Mantener conectado</Button></div>
          <Badge variant="secondary" className="w-full justify-center">Cada código recibido se agrega al carrito de Caja</Badge>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
