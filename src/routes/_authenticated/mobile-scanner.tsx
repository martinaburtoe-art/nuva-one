import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Link2,
  ScanBarcode,
  ShieldCheck,
  Smartphone,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LiveProductScanner } from "@/components/scanner/LiveProductScanner";
import {
  pairMobileScanner,
  submitMobileScannerEvent,
  heartbeatMobileScannerSession,
  revokeMobileScannerSession,
  setMobileScannerContext,
  countPendingMobileScannerEvents,
  enqueueMobileScannerEvent,
  flushMobileScannerOutbox,
  type MobileScannerSession,
} from "@/lib/mobile-scanner-bridge";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/mobile-scanner")({
  head: () => ({ meta: [{ title: "Nüva Scanner Móvil" }] }),
  component: MobileScanner,
});

const STORAGE_KEY = "nuva.mobile-scanner.session";

function MobileScanner() {
  return <MobileScannerContent />;
}

function MobileScannerContent() {
  const [pairCode, setPairCode] = useState("");
  const [session, setSession] = useState<MobileScannerSession | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastCode, setLastCode] = useState("");
  const [sent, setSent] = useState(0);
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [activeModule, setActiveModule] = useState("pos");
  const [operationId, setOperationId] = useState("");
  const [deviceName, setDeviceName] = useState("Mi celular");
  const [contextSaved, setContextSaved] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const pendingCountRef = useRef(0);
  pendingCountRef.current = pendingCount;
  const flushingOutbox = useRef(false);
  const heartbeatWarningShown = useRef(false);

  const flushPendingScans = useCallback(async () => {
    if (!session?.sessionId || !online || flushingOutbox.current) return;
    flushingOutbox.current = true;
    try {
      const delivered = await flushMobileScannerOutbox(session.sessionId);
      const remaining = await countPendingMobileScannerEvents(session.sessionId);
      setPendingCount(remaining);
      if (delivered > 0) {
        setSent(current => current + delivered);
        toast.success(`${delivered} lectura(s) pendiente(s) sincronizada(s)`);
      }
    } catch (error) {
      try {
        setPendingCount(await countPendingMobileScannerEvents(session.sessionId));
      } catch {
        // Keep the last visible pending count if IndexedDB is temporarily unavailable.
      }
      toast.error(error instanceof Error
        ? `Hay lecturas pendientes sin confirmar: ${error.message}`
        : "No se pudieron sincronizar las lecturas pendientes. Se conservaron en este dispositivo.");
    } finally {
      flushingOutbox.current = false;
    }
  }, [session?.sessionId, online]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) { const restored = JSON.parse(saved) as MobileScannerSession; setSession(restored); setActiveModule(restored.activeModule ?? "pos"); setOperationId(restored.operationId ?? ""); setDeviceName(restored.deviceName ?? "Mi celular"); setContextSaved(Boolean(restored.operationId)); }
    } catch {
      /* ignore stale local session */
    }
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    setCameraAvailable(Boolean(navigator.mediaDevices?.getUserMedia));
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if (!session?.sessionId) {
      setPendingCount(0);
      return;
    }
    let active = true;
    void countPendingMobileScannerEvents(session.sessionId)
      .then(count => { if (active) setPendingCount(count); })
      .catch(error => {
        if (active) toast.error(error instanceof Error ? error.message : "No se pudo leer la bandeja local");
      });
    return () => { active = false; };
  }, [session?.sessionId]);

  useEffect(() => {
    if (session?.sessionId && online) void flushPendingScans();
  }, [session?.sessionId, online, flushPendingScans]);

  useEffect(() => {
    if (!session) return;
    let active = true;
    const beat = async () => {
      try {
        const expiresAt = await heartbeatMobileScannerSession(session.sessionId);
        if (!active) return;
        heartbeatWarningShown.current = false;
        setOnline(true);
        // Read the latest persisted context: the heartbeat effect is keyed by session ID,
        // so its closure may outlive a module/operation change made on this device.
        let current = session;
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = JSON.parse(stored) as MobileScannerSession;
            if (parsed.sessionId === session.sessionId) current = parsed;
          }
        } catch {
          // Keep the in-memory session if local storage is unavailable or malformed.
        }
        const next = { ...current, expiresAt };
        setSession(next);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (error) {
        if (!active) return;
        const failure = error as { code?: string; status?: number; message?: string };
        const message = String(failure?.message ?? error ?? "");
        const sessionInvalid = failure?.status === 401
          || failure?.status === 403
          || failure?.code === "42501"
          || /SCANNER_SESSION_INVALID|UNAUTHENTICATED|JWT expired/i.test(message);
        if (sessionInvalid) {
          localStorage.removeItem(STORAGE_KEY);
          setSession(null);
          toast.error(pendingCountRef.current > 0
            ? `La sesión fue revocada. Quedaron ${pendingCountRef.current} lectura(s) locales sin sincronizar; no se descartaron.`
            : "La sesión del dispositivo venció o fue revocada. Vuelve a vincularlo.");
          return;
        }
        // A transient network failure must not erase the local session: the
        // IndexedDB outbox needs it to retry the same event IDs after reconnect.
        setOnline(false);
        if (!heartbeatWarningShown.current) {
          heartbeatWarningShown.current = true;
          toast.warning("Conexión interrumpida. La sesión local se conserva y las lecturas quedarán en cola.");
        }
      }
    };
    void beat();
    const timer = window.setInterval(() => void beat(), 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [session?.sessionId]);

  async function pair() {
    if (!/^\d{6}$/.test(pairCode))
      return toast.error("Ingresa el código de 6 dígitos que aparece en Caja o Inventario");
    if (!online) return toast.error("Necesitas conexión para vincular el celular");
    setBusy(true);
    try {
      const paired = await pairMobileScanner(pairCode);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(paired));
      setActiveModule(paired.activeModule ?? "pos");
      setOperationId(paired.operationId ?? "");
      setDeviceName(paired.deviceName ?? "Mi celular");
      setContextSaved(Boolean(paired.operationId));
      setSession(paired);
      setPairCode("");
      toast.success("Celular vinculado a Nüva One");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo vincular el celular");
    } finally {
      setBusy(false);
    }
  }

  function disconnect() {
    if (session) void revokeMobileScannerSession(session.sessionId).catch(() => {});
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setScannerOpen(false);
    setLastCode("");
    setSent(0);
  }

  const moduleOperational = activeModule === "pos" || activeModule === "inventory";

  async function handleScan(result: { rawValue: string }) {
    if (!session) return;
    if (!moduleOperational) return toast.error("Este módulo todavía está en integración. El escáner está habilitado en Caja e Inventario.");
    if (!operationId.trim() || !contextSaved) return toast.error("Guarda primero el contexto de Caja o Inventario antes de escanear.");
    const code = result.rawValue.trim();
    if (!code) return;
    setLastCode(code);
    const clientEventId = crypto.randomUUID();
    if (!online) {
      try {
        await enqueueMobileScannerEvent(session.sessionId, code, "camera", clientEventId);
        setPendingCount(await countPendingMobileScannerEvents(session.sessionId));
        toast.info("Lectura guardada en el celular. Se enviará al recuperar la conexión.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar la lectura sin conexión.");
      }
      return;
    }
    try {
      await submitMobileScannerEvent(session.sessionId, code, "camera", clientEventId);
      setSent((n) => n + 1);
    } catch (error) {
      try {
        // Reuse the same UUID: the server may have committed the event even if
        // the response was lost. The RPC's unique key makes the retry idempotent.
        await enqueueMobileScannerEvent(session.sessionId, code, "camera", clientEventId);
        setPendingCount(await countPendingMobileScannerEvents(session.sessionId));
        toast.info("No llegó la confirmación. La lectura quedó guardada y se reintentará sin duplicarla.");
      } catch (queueError) {
        toast.error(queueError instanceof Error
          ? queueError.message
          : error instanceof Error ? error.message : "No se pudo enviar ni guardar la lectura.");
      }
    }
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-md space-y-5 p-4 sm:p-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Smartphone className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Nüva Scanner Móvil</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Usa tu celular como lector de códigos para la operación abierta en otro equipo.
          </p>
        </div>
        <Card className="space-y-4 p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Link2 className="h-4 w-4 text-primary" />
            Vincular dispositivo
          </div>
          <p className="text-sm text-muted-foreground">
            En el computador abre Caja o Inventario y genera un código en <strong>Vincular lector móvil</strong>. Introduce aquí
            el código de 6 dígitos.
          </p>
          <Input
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pairCode}
            onChange={(e) => setPairCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="h-14 text-center font-mono text-2xl tracking-[0.35em]"
            autoFocus
          />
          <Button
            className="h-12 w-full"
            disabled={busy || !online || pairCode.length !== 6}
            onClick={pair}
          >
            {busy ? "Vinculando…" : !online ? "Sin conexión" : "Vincular celular"}
          </Button>
        </Card>
        <div className="grid gap-2 sm:grid-cols-2">
          <Card className="p-4 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                El código de vinculación dura 10 minutos. Después, la sesión se renueva mientras el dispositivo esté activo y autorizado.
              </span>
            </div>
          </Card>
          <Card className="p-4 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              {online ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              ) : (
                <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>
                {online
                  ? "Conexión disponible. El celular está listo para vincularse."
                  : "Sin conexión. Recupera internet para vincular el dispositivo."}
              </span>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Escáner conectado</h1>
          <p className="text-xs text-muted-foreground">
            Este celular es un dispositivo compartido de Nüva One y puede cambiar de módulo sin volver a vincularse.
          </p>
        </div>
        <Badge variant={online ? "default" : "destructive"} className="gap-1">
          {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {online ? "En línea" : "Sin conexión"}
        </Badge>
      </div>
      {!online && (
        <Card className="border-destructive/30 bg-destructive/5 p-3">
          <div className="flex items-start gap-2 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <span>
              <strong>Sin conexión.</strong> Las lecturas se guardan en este celular y se enviarán
              al recuperar internet. No se marcarán como confirmadas hasta recibir respuesta del servidor.
            </span>
          </div>
        </Card>
      )}
      {!cameraAvailable && (
        <Card className="border-amber-500/30 bg-amber-500/5 p-3">
          <div className="flex items-start gap-2 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Este navegador no expone cámara. Puedes usar un lector físico compatible o ingresar el
              código manualmente desde Caja.
            </span>
          </div>
        </Card>
      )}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-muted-foreground">Sesión</div>
            <div className="font-mono text-xs">{session.sessionId.slice(0, 8)}…</div>
          </div>
          <Button variant="outline" size="sm" aria-label="Desconectar escáner móvil" disabled={pendingCount > 0} onClick={disconnect}>
            {pendingCount > 0 ? `${pendingCount} pendientes` : "Desconectar"}
          </Button>
        </div>
      </Card>
      <Card className="space-y-3 p-4">
        <div>
          <div className="font-semibold">Contexto de trabajo</div>
          <p className="text-xs text-muted-foreground">El escáner envía las lecturas solo al módulo y operación seleccionados.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-medium">Módulo
            <select value={activeModule} onChange={e => { setActiveModule(e.target.value); setContextSaved(false); }}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="pos">Caja</option>
              <option value="inventory">Inventario</option>
              <optgroup label="En integración">
                <option value="receiving" disabled>Recepción · Próximamente</option>
                <option value="picking" disabled>Preparación · Próximamente</option>
                <option value="dispatch" disabled>Despacho · Próximamente</option>
                <option value="returns" disabled>Devoluciones · Próximamente</option>
                <option value="transfers" disabled>Traslados · Próximamente</option>
              </optgroup>
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium">Nombre del dispositivo
            <Input value={deviceName} onChange={e => { setDeviceName(e.target.value); setContextSaved(false); }} maxLength={80} />
          </label>
        </div>
        <label className="block space-y-1 text-xs font-medium">Identificador de operación
          <Input value={operationId} onChange={e => { setOperationId(e.target.value); setContextSaved(false); }} placeholder="Se asigna al vincular desde el módulo" />
        </label>
        <Button className="w-full" variant="outline" disabled={!online || !operationId.trim() || !moduleOperational}
          onClick={async () => {
            try {
              await setMobileScannerContext(session.sessionId, activeModule as any, operationId.trim(), deviceName);
              const next = { ...session, activeModule, operationId: operationId.trim(), deviceName };
              setSession(next);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
              setContextSaved(true);
              toast.success("Contexto del dispositivo actualizado");
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "No se pudo cambiar el contexto");
            }
          }}>
          Guardar contexto de trabajo
        </Button>
      </Card>
      <Card className="border-primary/20 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <ScanBarcode className="mt-0.5 h-5 w-5 text-primary" />
          <div>
            <div className="font-semibold">Listo para escanear</div>
            <div className="text-sm text-muted-foreground">
              {activeModule === "pos"
                ? "Apunta al código. La lectura se envía al carrito de Caja asignado a este dispositivo."
                : activeModule === "inventory"
                  ? "Apunta al código. La lectura se envía al conteo de Inventario asignado a este dispositivo."
                  : "Este módulo está en integración. Por ahora, el lector funciona en Caja e Inventario."}
            </div>
          </div>
        </div>
      </Card>
      <Button
        className="h-14 w-full text-base"
        disabled={!online || !cameraAvailable || !operationId.trim() || !contextSaved || !moduleOperational}
        onClick={() => setScannerOpen(true)}
      >
        <ScanBarcode className="mr-2 h-5 w-5" />
        {!cameraAvailable
          ? "Cámara no disponible"
          : !online
            ? "Esperando conexión"
            : !moduleOperational
              ? "Módulo en integración"
              : !operationId.trim() || !contextSaved
                ? "Guarda el contexto de operación"
                : "Abrir cámara y escanear"}
      </Button>
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Lecturas enviadas</span>
          <strong className="text-2xl">{sent}</strong>
        </div>
        {pendingCount > 0 && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="min-w-0">
              <div className="text-sm font-medium">{pendingCount} lectura(s) pendiente(s)</div>
              <div className="text-xs text-muted-foreground">Guardadas en este celular; se conservan hasta recibir confirmación del servidor.</div>
            </div>
            <Button size="sm" variant="outline" disabled={!online} onClick={() => void flushPendingScans()}>
              Reintentar
            </Button>
          </div>
        )}
        {lastCode && (
          <div className="mt-2 truncate rounded-lg bg-muted/50 p-2 font-mono text-xs" aria-live="polite">
            {lastCode}
          </div>
        )}
      </Card>
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <WifiOff className="h-3.5 w-3.5" />
        Si se pierde internet, el lector se pausa y no inventa lecturas.
      </div>
      <LiveProductScanner
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleScan}
        title={`Nüva Scanner · ${activeModule === "pos" ? "Caja" : activeModule === "inventory" ? "Inventario" : activeModule}`}
      />
    </div>
  );
}
