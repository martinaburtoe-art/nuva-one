import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Link2, ScanBarcode, ShieldCheck, Smartphone, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LiveProductScanner } from '@/components/scanner/LiveProductScanner';
import { pairMobileScanner, submitMobileScannerEvent, type MobileScannerSession } from '@/lib/mobile-scanner-bridge';
import { toast } from 'sonner';

export const Route = createFileRoute('/_authenticated/mobile-scanner')({
  head: () => ({ meta: [{ title: 'Nüva Scanner Móvil' }] }),
  component: MobileScanner,
});

const STORAGE_KEY = 'nuva.mobile-scanner.session';

function MobileScanner() {
  const [pairCode, setPairCode] = useState('');
  const [session, setSession] = useState<MobileScannerSession | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastCode, setLastCode] = useState('');
  const [sent, setSent] = useState(0);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) setSession(JSON.parse(saved) as MobileScannerSession);
    } catch { /* ignore stale local session */ }
  }, []);

  async function pair() {
    if (!/^\d{6}$/.test(pairCode)) return toast.error('Ingresa el código de 6 dígitos que aparece en Caja');
    setBusy(true);
    try {
      const paired = await pairMobileScanner(pairCode);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(paired));
      setSession(paired);
      setPairCode('');
      toast.success('Celular vinculado a Caja');
    } catch (error: any) {
      toast.error(String(error?.message ?? '').includes('PAIR_CODE') ? 'Código inválido o vencido' : 'No se pudo vincular el celular');
    } finally { setBusy(false); }
  }

  function disconnect() {
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setScannerOpen(false);
    setLastCode('');
    setSent(0);
  }

  async function handleScan(result: { rawValue: string }) {
    if (!session) return;
    const code = result.rawValue.trim();
    if (!code) return;
    setLastCode(code);
    try {
      await submitMobileScannerEvent(session.sessionId, code, 'camera');
      setSent((n) => n + 1);
    } catch {
      toast.error('No se pudo enviar el escaneo a Caja. Revisa la conexión.');
    }
  }

  if (!session) {
    return <div className="mx-auto max-w-md space-y-5 p-4 sm:p-6"><div className="text-center"><div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10"><Smartphone className="h-7 w-7 text-primary" /></div><h1 className="text-2xl font-bold">Nüva Scanner Móvil</h1><p className="mt-1 text-sm text-muted-foreground">Usa tu celular como lector de códigos para la Caja abierta en otro equipo.</p></div><Card className="space-y-4 p-5"><div className="flex items-center gap-2 text-sm font-medium"><Link2 className="h-4 w-4 text-primary" />Vincular con Caja</div><p className="text-sm text-muted-foreground">En el computador abre Caja → <strong>Usar celular como escáner</strong>. Introduce aquí el código de 6 dígitos.</p><Input inputMode="numeric" pattern="[0-9]*" maxLength={6} value={pairCode} onChange={(e) => setPairCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="h-14 text-center font-mono text-2xl tracking-[0.35em]" autoFocus /><Button className="h-12 w-full" disabled={busy || pairCode.length !== 6} onClick={pair}>{busy ? 'Vinculando…' : 'Vincular celular'}</Button></Card><Card className="p-4 text-xs text-muted-foreground"><div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>La vinculación dura 10 minutos, requiere una cuenta autorizada en el mismo negocio y no entrega acceso a otros negocios.</span></div></Card></div>;
  }

  return <div className="mx-auto max-w-lg space-y-4 p-4 sm:p-6"><div className="flex items-center justify-between gap-3"><div><h1 className="text-xl font-bold">Escáner conectado</h1><p className="text-xs text-muted-foreground">Este celular funciona como la pistola lectora de Caja.</p></div><Badge className="gap-1"><Wifi className="h-3 w-3" />En línea</Badge></div><Card className="p-4"><div className="flex items-center justify-between gap-3"><div><div className="text-xs text-muted-foreground">Sesión</div><div className="font-mono text-xs">{session.sessionId.slice(0, 8)}…</div></div><Button variant="outline" size="sm" onClick={disconnect}>Desconectar</Button></div></Card><Card className="border-primary/20 bg-primary/5 p-4"><div className="flex items-start gap-3"><ScanBarcode className="mt-0.5 h-5 w-5 text-primary" /><div><div className="font-semibold">Listo para escanear</div><div className="text-sm text-muted-foreground">Apunta al código. La lectura se envía al instante al carrito de Caja del computador, incluso si el código todavía no está registrado.</div></div></div></Card><Button className="h-14 w-full text-base" onClick={() => setScannerOpen(true)}><ScanBarcode className="mr-2 h-5 w-5" />Abrir cámara y escanear</Button><Card className="p-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Lecturas enviadas</span><strong className="text-2xl">{sent}</strong></div>{lastCode && <div className="mt-2 truncate rounded-lg bg-muted/50 p-2 font-mono text-xs">{lastCode}</div>}</Card><div className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><WifiOff className="h-3.5 w-3.5" />Si se pierde internet, el lector avisará y no inventará lecturas.</div><LiveProductScanner open={scannerOpen} onOpenChange={setScannerOpen} onScan={handleScan} title="Nüva Scanner · Caja" /></div>;
}
