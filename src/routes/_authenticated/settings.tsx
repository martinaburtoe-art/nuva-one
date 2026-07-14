import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageHeader, ComingSoonBadge } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Shield, AlertTriangle, Lock, ClipboardList } from "lucide-react";
import { useActiveBusiness, useMyRole } from "@/lib/use-business";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MfaSetup } from "@/components/mfa-setup";
import { AuditLogView } from "@/components/audit-log-view";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Configuración — Nüva One" }] }),
  component: Settings,
});

function Settings() {
  const { active } = useActiveBusiness();
  const { data: myRole } = useMyRole();
  const canManage = myRole === "owner" || myRole === "admin";
  const isOwner = myRole === "owner";
  const navigate = useNavigate();
  const [name, setName] = useState(active?.name ?? "");
  const [taxId, setTaxId] = useState("");

  useEffect(() => {
    if (active) setName(active.name);
  }, [active]);

  async function save() {
    if (!active) return;
    const { error } = await supabase
      .from("businesses")
      .update({ name, tax_id: taxId })
      .eq("id", active.id);
    if (error) toast.error("Error");
    else toast.success("Guardado");
  }

  async function deleteBusiness() {
    if (!active) return;
    if (!confirm(`¿Eliminar el negocio "${active.name}"? Esta acción no se puede deshacer.`))
      return;
    const { error } = await supabase.from("businesses").delete().eq("id", active.id);
    if (error) toast.error("Error");
    else {
      localStorage.removeItem("novaflow.active_business_id");
      navigate({ to: "/select-business" });
    }
  }

  return (
    <>
      <PageHeader title="Configuración" description="Gestiona tu negocio, equipo y preferencias" />
      <Tabs defaultValue="business">
        <TabsList>
          <TabsTrigger value="business">Negocio</TabsTrigger>
          <TabsTrigger value="team">Equipo</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
          {canManage && <TabsTrigger value="audit">Auditoría</TabsTrigger>}
          <TabsTrigger value="billing">Facturación</TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold">Perfil del negocio</h3>
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="bname">Nombre</Label>
                <Input
                  id="bname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canManage}
                />
              </div>
              <div>
                <Label htmlFor="tax">RUT / Tax ID</Label>
                <Input
                  id="tax"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="76.123.456-7"
                  disabled={!canManage}
                />
              </div>
              <Button onClick={save} disabled={!canManage}>
                Guardar cambios
              </Button>
              {!canManage && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="h-3 w-3" /> Solo el propietario o administradores pueden editar
                  el perfil del negocio.
                </p>
              )}
            </div>
          </Card>

          {isOwner && (
            <Card className="border-destructive/30 p-6">
              <h3 className="font-semibold text-destructive">Zona peligrosa</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Eliminar este negocio borra todos sus datos. No se puede revertir.
              </p>
              <Button variant="destructive" className="mt-4" onClick={deleteBusiness}>
                <Trash2 className="mr-1.5 h-4 w-4" />
                Eliminar negocio
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="team">
          <Card className="p-6">
            <h3 className="font-semibold">Miembros del equipo</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Invita personas y asigna roles (Propietario, Admin, Staff, Solo lectura).
            </p>
            {canManage ? (
              <>
                <div className="mt-4 flex gap-2">
                  <Input type="email" placeholder="email@ejemplo.cl" disabled />
                  <Button disabled>Invitar</Button>
                </div>
                <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Funcionalidad de invitaciones por email{" "}
                  <ComingSoonBadge />
                </p>
              </>
            ) : (
              <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" /> Solo el propietario o administradores pueden gestionar
                al equipo.
              </p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <h3 className="font-semibold">Autenticación de dos factores (2FA)</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Añade una capa extra de seguridad a tu cuenta con una app autenticadora (TOTP).
                </p>
                <div className="mt-4">
                  <MfaSetup />
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {canManage && (
          <TabsContent value="audit">
            <Card className="p-6">
              <div className="flex items-start gap-3">
                <ClipboardList className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <h3 className="font-semibold">Registro de auditoría</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Quién hizo qué y cuándo — visible solo para propietarios y administradores. Cada
                    venta, cambio de stock, cotización o gasto queda registrado automáticamente y no
                    puede editarse ni borrarse, ni siquiera por un administrador.
                  </p>
                  <div className="mt-4">
                    <AuditLogView />
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="billing">
          <BillingTab />
        </TabsContent>
      </Tabs>
    </>
  );
}

function BillingTab() {
  const { active } = useActiveBusiness();
  const { data: myRole } = useMyRole();
  const canManage = myRole === "owner" || myRole === "admin";
  const [loading, setLoading] = useState(false);
  const plan = (active as any)?.plan ?? "starter";
  const status = (active as any)?.subscription_status ?? "active";
  const isPro = plan === "pro";
  const createdAt = (active as any)?.created_at ? new Date((active as any).created_at) : null;
  const trialDaysLeft = createdAt
    ? Math.max(0, 15 - Math.floor((Date.now() - createdAt.getTime()) / 86_400_000))
    : 15;
  const trialExpired = !isPro && trialDaysLeft <= 0;

  async function callBillingEndpoint(path: "checkout" | "portal") {
    if (!active) return;
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch(`/api/billing/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ business_id: active.id }),
      });
      const json = await res.json();
      if (json.url) window.location.href = json.url;
      else toast.error(json.error ?? "No se pudo iniciar el proceso de pago");
    } catch {
      toast.error("Error de conexión con el sistema de pagos");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold">Plan actual: {isPro ? "Pro" : "Prueba gratuita"}</h3>
        <span
          className={
            isPro
              ? "rounded-full bg-gradient-primary px-2 py-0.5 text-xs font-medium text-primary-foreground"
              : trialExpired
                ? "rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive"
                : "rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
          }
        >
          {isPro ? (status === "active" ? "Activo" : status) : trialExpired ? "Vencida" : `${trialDaysLeft} días restantes`}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {isPro
          ? "Tienes acceso completo a todas las funciones de Nüva One."
          : trialExpired
            ? "Tu prueba gratuita de 15 días terminó. Actualiza a Pro para seguir usando Nüva One."
            : "Prueba gratuita de 15 días con acceso completo — sin tarjeta. Al terminar, necesitas el plan Pro para seguir usando la app."}
      </p>

      <ul className="mt-4 space-y-2 text-sm">
        <li className="flex items-center gap-2">✅ Negocios y productos ilimitados</li>
        <li className="flex items-center gap-2">✅ Ventas, compras, inventario y Caja</li>
        <li className="flex items-center gap-2">✅ Asistente IA</li>
        <li className="flex items-center gap-2">✅ Automatizaciones y bot de WhatsApp</li>
        <li className="flex items-center gap-2">✅ Cotizaciones en PDF</li>
        <li className="flex items-center gap-2">✅ Marketing con IA</li>
        <li className="flex items-center gap-2">✅ Roles de equipo y auditoría</li>
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        Todo Nüva One tiene un único nivel de funciones. La única diferencia entre Prueba gratuita y
        Pro es el tiempo de acceso.
      </p>

      {!canManage ? (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" /> Solo el propietario o administradores pueden gestionar el plan.
        </p>
      ) : isPro ? (
        <Button className="mt-4" variant="outline" disabled={loading} onClick={() => callBillingEndpoint("portal")}>
          Gestionar suscripción
        </Button>
      ) : (
        <Button className="mt-4" disabled={loading} onClick={() => callBillingEndpoint("checkout")}>
          Actualizar a Pro — $29.990/mes
        </Button>
      )}
    </Card>
  );
}
