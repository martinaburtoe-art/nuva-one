import { useState } from "react";
import { CheckCircle2, Info, RefreshCw, Workflow, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { ActiveBusiness } from "@/lib/use-business";

type Props = { business: ActiveBusiness | null };

type Status = "idle" | "checking" | "ready" | "not_configured" | "error";

export function N8nConnectionCard({ business }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function checkConnection() {
    if (!business?.id) {
      setStatus("error");
      setMessage("Selecciona un negocio antes de comprobar n8n.");
      return;
    }
    setStatus("checking");
    setMessage("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sesión no disponible");
      const response = await fetch("/api/n8n", {
        headers: { Authorization: `Bearer ${token}`, "x-business-id": business.id },
      });
      const body = (await response.json()) as { configured?: boolean; error?: string };
      if (!response.ok) throw new Error(body.error ?? "No se pudo comprobar la conexión");
      if (body.configured) {
        setStatus("ready");
        setMessage("La pasarela segura de n8n está configurada para este entorno.");
      } else {
        setStatus("not_configured");
        setMessage("La arquitectura está lista, pero falta configurar el webhook seguro de n8n en el entorno de Nüva One.");
      }
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "No se pudo comprobar la conexión");
    }
  }

  const badge = status === "ready" ? "Conectado" : status === "checking" ? "Comprobando" : "Preparado";

  return (
    <Card className="mt-6 border-primary/20 bg-primary/[0.03]">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Workflow className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg">n8n · Motor de automatización</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Conecta Nüva One con cientos de servicios mediante eventos, webhooks y flujos automatizados.
              </p>
            </div>
          </div>
          <Badge variant={status === "ready" ? "secondary" : "outline"}>{badge}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border bg-background/70 p-4">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Qué queda preparado</p>
              <p className="mt-1">Eventos normalizados, aislamiento por negocio, firma HMAC, idempotencia y una pasarela server-side. Las credenciales de n8n nunca se envían al navegador.</p>
            </div>
          </div>
        </div>
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <div className="rounded-lg border p-3">✓ Eventos de negocio</div>
          <div className="rounded-lg border p-3">✓ Webhooks seguros</div>
          <div className="rounded-lg border p-3">✓ HMAC + anti-manipulación</div>
          <div className="rounded-lg border p-3">✓ Aislamiento multiempresa</div>
        </div>
        {message && (
          <div className="flex items-start gap-2 rounded-lg border p-3 text-sm">
            {status === "ready" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" /> : status === "error" ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> : null}
            <span className="text-muted-foreground">{message}</span>
          </div>
        )}
        <Button type="button" variant="outline" onClick={checkConnection} disabled={status === "checking" || !business?.id}>
          <RefreshCw className={`mr-2 h-4 w-4 ${status === "checking" ? "animate-spin" : ""}`} />
          Comprobar conexión n8n
        </Button>
      </CardContent>
    </Card>
  );
}
