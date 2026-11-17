import { useCallback, useEffect, useRef, useState } from "react";
import { Link2, RefreshCw, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  createMobileScannerSessionForOperation,
  subscribeToMobileScannerOperation,
  type MobileScannerEvent,
  type MobileScannerSession,
} from "@/lib/mobile-scanner-bridge";
import { toast } from "sonner";

type DeviceModule = "pos" | "inventory" | "receiving" | "picking" | "dispatch" | "returns" | "transfers";

export function MobileScannerPairingCard({
  businessId,
  module,
  operationId,
  onScan,
  title = "Conectar celular",
}: {
  businessId: string;
  module: DeviceModule;
  operationId: string;
  onScan?: (code: string, event: MobileScannerEvent) => void;
  title?: string;
}) {
  const [session, setSession] = useState<MobileScannerSession | null>(null);
  const [loading, setLoading] = useState(false);
  const onScanRef = useRef(onScan);

  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  const generate = useCallback(async () => {
    if (!businessId || !operationId) return;
    setLoading(true);
    try {
      const next = await createMobileScannerSessionForOperation(businessId, module, operationId);
      setSession(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo preparar la vinculación");
    } finally {
      setLoading(false);
    }
  }, [businessId, module, operationId]);

  useEffect(() => { void generate(); }, [generate]);

  useEffect(() => {
    if (!onScan) return;
    const unsubscribe = subscribeToMobileScannerOperation(operationId, module, event => {
      onScanRef.current?.(event.code, event);
    });
    return unsubscribe;
  }, [module, operationId]);

  return (
    <Card className="flex min-w-[220px] items-center gap-3 border-primary/20 bg-primary/5 p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Smartphone className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{title}</span>
          <Badge variant="secondary" className="text-[10px]">Móvil</Badge>
        </div>
        {session?.pairCode ? (
          <>
            <div className="mt-0.5 font-mono text-lg font-bold tracking-[0.18em]">{session.pairCode}</div>
            <div className="text-[10px] text-muted-foreground">Código válido por 10 minutos · solo para esta operación</div>
          </>
        ) : (
          <div className="text-xs text-muted-foreground">{loading ? "Preparando código…" : "Genera un código para vincular"}</div>
        )}
      </div>
      <Button size="icon" variant="outline" aria-label="Generar nuevo código" disabled={loading} onClick={() => void generate()}>
        {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
      </Button>
    </Card>
  );
}
