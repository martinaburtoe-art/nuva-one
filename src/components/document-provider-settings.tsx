import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActiveBusiness, useMyRole, canManageBusiness } from "@/lib/use-business";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, ShieldCheck, Unplug, Wallet } from "lucide-react";

type ProviderStatus = {
  resend_configured: boolean;
  sender_domain: string | null;
  inngest_configured: boolean;
};

export function DocumentProviderSettings() {
  const { active } = useActiveBusiness();
  const { data: role } = useMyRole();
  const canManage = canManageBusiness(role);
  const queryClient = useQueryClient();
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [environment, setEnvironment] = useState<"dev" | "prod">("dev");
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);

  const { data: integration, isLoading } = useQuery({
    queryKey: ["payment-gateway-integration", active?.id],
    enabled: !!active?.id && canManage,
    queryFn: async () => {
      const { data, error } = await supabase.from("billing_integrations")
        .select("id,provider,status,environment,connected_at")
        .eq("business_id", active!.id)
        .eq("type", "payment")
        .eq("status", "connected")
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; provider: string; status: string; environment: string; connected_at: string | null } | null;
    },
  });

  const { data: emailStatus, isLoading: emailStatusLoading } = useQuery({
    queryKey: ["document-provider-status", active?.id],
    enabled: !!active?.id && canManage,
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const response = await fetch("/api/documents/provider-status?business_id=" + encodeURIComponent(active!.id), {
        headers: token ? { Authorization: "Bearer " + token } : {},
        cache: "no-store",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo consultar el estado del correo");
      return body as ProviderStatus;
    },
  });

  async function connectFlow(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!active || !apiKey.trim() || !secretKey.trim()) return;
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
      const response = await fetch("/api/billing/payments/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({
          business_id: active.id,
          provider: "flow",
          api_key: apiKey.trim(),
          secret_key: secretKey.trim(),
          environment,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo conectar Flow");
      setApiKey("");
      setSecretKey("");
      await queryClient.invalidateQueries({ queryKey: ["payment-gateway-integration", active.id] });
      toast.success("Flow conectado y credenciales validadas", {
        description: environment === "prod" ? "Ambiente de producción." : "Ambiente sandbox; no procesa cobros reales.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo conectar Flow");
    } finally {
      setSaving(false);
    }
  }

  async function disconnectFlow() {
    if (!active) return;
    if (!window.confirm("¿Desconectar Flow de este negocio? Los nuevos checkouts quedarán deshabilitados.")) return;
    setSaving(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const response = await fetch("/api/billing/payments/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ business_id: active.id }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo desconectar Flow");
      await queryClient.invalidateQueries({ queryKey: ["payment-gateway-integration", active.id] });
      toast.success("Flow desconectado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo desconectar Flow");
    } finally {
      setSaving(false);
    }
  }

  async function sendTestEmail() {
    if (!active) return;
    setTestingEmail(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const response = await fetch("/api/documents/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ business_id: active.id }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "No se pudo enviar el correo de prueba");
      toast.success("Resend aceptó el correo de prueba", {
        description: "Revisa la bandeja del correo de tu cuenta y el registro de actividad de Resend.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo enviar el correo de prueba");
    } finally {
      setTestingEmail(false);
    }
  }

  if (!canManage) {
    return <Card className="p-5"><p className="text-sm text-muted-foreground">Solo propietarios y administradores pueden gestionar las conexiones de pago y correo.</p></Card>;
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-5 w-5 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">Correo transaccional · Resend</h3>
              {emailStatusLoading ? <Badge variant="outline">Comprobando</Badge> : emailStatus?.resend_configured ? <Badge>Configurado</Badge> : <Badge variant="destructive">Pendiente</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Envío de cotizaciones, documentos de cobro y recordatorios a clientes. La credencial se administra a nivel de plataforma, nunca desde el navegador.</p>
            {emailStatus?.sender_domain && <p className="mt-2 text-xs text-muted-foreground">Remitente configurado: {emailStatus.sender_domain}</p>}
            {!emailStatus?.resend_configured && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Faltan RESEND_API_KEY y/o NUVA_DOCUMENTS_FROM_EMAIL en las variables de entorno de producción.</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={sendTestEmail} disabled={!emailStatus?.resend_configured || testingEmail}>
                <Mail className="mr-1.5 h-4 w-4" />{testingEmail ? "Enviando..." : "Enviar correo de prueba"}
              </Button>
              <a className="text-xs underline text-muted-foreground" href="https://resend.com/domains" target="_blank" rel="noreferrer">Configurar dominio en Resend</a>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 font-medium text-foreground"><ShieldCheck className="h-4 w-4" />Automatización de recordatorios</div>
          {emailStatus?.inngest_configured
            ? "La firma de Inngest está configurada. Falta certificar la sincronización de las funciones en el panel de Inngest."
            : "Inngest aún no tiene INNGEST_SIGNING_KEY configurada; los recordatorios automáticos no se consideran activos."}
        </div>
      </Card>

      <Card className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Wallet className="mt-0.5 h-5 w-5 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">Cobros online · Flow</h3>
              {isLoading ? <Badge variant="outline">Comprobando</Badge> : integration ? <Badge>Conectado</Badge> : <Badge variant="outline">Sin conectar</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Conecta la cuenta Flow de este negocio para que tus clientes paguen cotizaciones convertidas en documentos de cobro y saldos pendientes.</p>
            {integration && <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"><div><p className="font-medium">Flow · {integration.environment === "prod" ? "Producción" : "Sandbox"}</p><p className="text-xs text-muted-foreground">Conectado {integration.connected_at ? new Date(integration.connected_at).toLocaleDateString("es-CL") : ""}</p></div><Button type="button" variant="outline" size="sm" onClick={disconnectFlow} disabled={saving}><Unplug className="mr-1.5 h-4 w-4" />Desconectar</Button></div>}
          </div>
        </div>
        <form onSubmit={connectFlow} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label htmlFor="flow-environment">Ambiente Flow</Label><select id="flow-environment" value={environment} onChange={(event) => setEnvironment(event.target.value as "dev" | "prod")} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="dev">Sandbox · pruebas sin cobros reales</option><option value="prod">Producción · cobros reales</option></select></div>
          <div><Label htmlFor="flow-api-key">API Key</Label><Input id="flow-api-key" value={apiKey} onChange={(event) => setApiKey(event.target.value)} autoComplete="off" spellCheck={false} placeholder="API Key de Flow" /></div>
          <div><Label htmlFor="flow-secret-key">Secret Key</Label><Input id="flow-secret-key" type="password" value={secretKey} onChange={(event) => setSecretKey(event.target.value)} autoComplete="new-password" placeholder="Secret Key de Flow" /></div>
          <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2">
            <p className="max-w-xl text-xs text-muted-foreground">Las claves se validan con una consulta de solo lectura y se cifran antes de guardarse. No se crea un cobro de prueba. En producción se procesarán transacciones reales.</p>
            <Button type="submit" disabled={saving || !apiKey.trim() || !secretKey.trim()}>{saving ? "Validando y guardando..." : integration ? "Actualizar conexión Flow" : "Conectar Flow"}</Button>
          </div>
        </form>
        <p className="text-xs text-muted-foreground">Obtén tus claves desde <a className="underline" href="https://www.flow.cl/app/web/misDatos.php" target="_blank" rel="noreferrer">Mi cuenta Flow</a>. Recomendamos validar primero en Sandbox. Las credenciales son propias de cada negocio.</p>
      </Card>
    </div>
  );
}
