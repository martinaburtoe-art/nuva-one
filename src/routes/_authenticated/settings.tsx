import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageHeader, ComingSoonBadge } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Shield, AlertTriangle, Lock, ClipboardList, Globe } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useActiveBusiness,
  useMyRole,
  canManageBusiness,
  isBusinessOwner,
} from "@/lib/use-business";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MfaSetup } from "@/components/mfa-setup";
import { AuditLogView } from "@/components/audit-log-view";
import { TeamManagement } from "@/components/team-management";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Configuración — Nüva One" }] }),
  component: Settings,
});

function Settings() {
  const { active } = useActiveBusiness();
  const { data: myRole } = useMyRole();
  const canManage = canManageBusiness(myRole);
  const isOwner = isBusinessOwner(myRole);
  const navigate = useNavigate();
  const [name, setName] = useState(active?.name ?? "");
  const [taxId, setTaxId] = useState("");
  const [giro, setGiro] = useState("");
  const [address, setAddress] = useState("");
  const [comuna, setComuna] = useState("");

  useEffect(() => {
    if (active) {
      setName(active.name);
      setTaxId(active.tax_id ?? "");
      setGiro(active.giro ?? "");
      setAddress(active.address ?? "");
      setComuna(active.comuna ?? "");
    }
  }, [active]);

  async function save() {
    if (!active) return;
    const { error } = await supabase
      .from("businesses")
      .update({ name, tax_id: taxId, giro, address, comuna })
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

  async function requestAccountDeletion() {
    if (
      !confirm(
        "¿Solicitar la eliminación de tu cuenta de Nüva One? Te contactaremos para confirmar y coordinar el proceso antes de eliminar cualquier dato.",
      )
    )
      return;
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email ?? "(sin email disponible)";
    const userId = data.user?.id ?? "(sin id disponible)";
    const subject = encodeURIComponent("Solicitud de eliminación de cuenta — Nüva One");
    const body = encodeURIComponent(
      `Solicito la eliminación de mi cuenta de Nüva One.\n\nEmail: ${email}\nUser ID: ${userId}\n\n(No borres nada todavía sin confirmar conmigo por este medio.)`,
    );
    window.location.href = `mailto:privacidad@nuvaone.cl?subject=${subject}&body=${body}`;
    toast.info("Se abrió tu app de correo para enviar la solicitud a privacidad@nuvaone.cl");
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
              <div>
                <Label htmlFor="giro">Giro</Label>
                <Input
                  id="giro"
                  value={giro}
                  onChange={(e) => setGiro(e.target.value)}
                  placeholder="Venta al por menor de artículos deportivos"
                  disabled={!canManage}
                />
              </div>
              <div>
                <Label htmlFor="address">Dirección</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Av. Siempre Viva 123"
                  disabled={!canManage}
                />
              </div>
              <div>
                <Label htmlFor="comuna">Comuna</Label>
                <Input
                  id="comuna"
                  value={comuna}
                  onChange={(e) => setComuna(e.target.value)}
                  placeholder="Talca"
                  disabled={!canManage}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Estos datos aparecen en la boleta/comprobante impreso de Caja, igual que en el
                retail: úsalos exactamente como están registrados ante el SII.
              </p>
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

          <PublicProfileCard canManage={canManage} />

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
          {active && <TeamManagement businessId={active.id} canManage={canManage} />}
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
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

          <Card className="border-destructive/30 p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div className="flex-1">
                <h3 className="font-semibold text-destructive">Eliminar mi cuenta</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Esto es distinto a eliminar un negocio: elimina tu cuenta personal de Nüva One (tu
                  acceso, tu perfil y tu membresía en cualquier negocio). Si eres propietario de un
                  negocio con datos contables sujetos a retención tributaria (SII), primero te
                  contactaremos para coordinar la transferencia o cierre correspondiente.
                </p>
                <Button variant="destructive" className="mt-4" onClick={requestAccountDeletion}>
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Solicitar eliminación de mi cuenta
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Procesamos las solicitudes dentro de un plazo razonable. También puedes escribir
                  directamente a{" "}
                  <a href="mailto:privacidad@nuvaone.cl" className="underline">
                    privacidad@nuvaone.cl
                  </a>
                  .
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {canManage && (
          <TabsContent value="audit">
            <Card className="p-4 sm:p-6">
              <div className="flex items-start gap-3">
                <ClipboardList className="hidden h-5 w-5 shrink-0 text-primary sm:block" />
                <div className="min-w-0 flex-1">
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
  const canManage = canManageBusiness(myRole);
  const [loading, setLoading] = useState(false);
  const plan = (active as any)?.plan ?? "starter";
  const status = (active as any)?.subscription_status ?? "active";
  const isPro = plan === "pro";
  const createdAt = (active as any)?.created_at ? new Date((active as any).created_at) : null;
  const trialDaysLeft = createdAt
    ? Math.max(0, 15 - Math.floor((Date.now() - createdAt.getTime()) / 86_400_000))
    : 15;
  const trialExpired = !isPro && trialDaysLeft <= 0;

  async function callBillingEndpoint(path: "register") {
    if (!active) return;
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch(`/api/billing/subscribe/${path}`, {
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
          {isPro
            ? status === "active"
              ? "Activo"
              : status
            : trialExpired
              ? "Vencida"
              : `${trialDaysLeft} días restantes`}
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
        <li className="flex items-center gap-2">
          ✅ {isPro ? "Productos ilimitados" : "Hasta 50 productos (ilimitados en Pro)"}
        </li>
        <li className="flex items-center gap-2">✅ Negocios ilimitados</li>
        <li className="flex items-center gap-2">✅ Ventas, compras, inventario y Caja</li>
        <li className="flex items-center gap-2">✅ Asistente IA</li>
        <li className="flex items-center gap-2">✅ Automatizaciones y bot de WhatsApp</li>
        <li className="flex items-center gap-2">✅ Cotizaciones en PDF</li>
        <li className="flex items-center gap-2">✅ Roles de equipo y auditoría</li>
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        Todo Nüva One tiene el mismo set de funciones. Las únicas diferencias entre Prueba gratuita
        y Pro son el tiempo de acceso y el tope de 50 productos.
      </p>

      {!canManage ? (
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" /> Solo el propietario o administradores pueden gestionar el
          plan.
        </p>
      ) : isPro ? (
        <Button
          className="mt-4"
          variant="outline"
          disabled={loading}
          onClick={async () => {
            if (!active) return;
            setLoading(true);
            try {
              const { data: sessionData } = await supabase.auth.getSession();
              const token = sessionData.session?.access_token;
              const res = await fetch("/api/billing/subscribe/cancel", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ business_id: active.id }),
              });
              const json = await res.json();
              if (json.ok) {
                toast.success("Suscripción cancelada — volviste al plan Starter");
                window.location.reload();
              } else {
                toast.error(json.error ?? "No se pudo cancelar");
              }
            } catch {
              toast.error("Error de conexión");
            } finally {
              setLoading(false);
            }
          }}
        >
          Cancelar suscripción
        </Button>
      ) : (
        <Button className="mt-4" disabled={loading} onClick={() => callBillingEndpoint("register")}>
          Actualizar a Pro — $29.990/mes
        </Button>
      )}
      {!isPro && (
        <p className="mt-2 text-xs text-muted-foreground">
          El pago se procesa con Flow. Te pediremos registrar una tarjeta para el cargo automático
          mensual — el cobro se realiza de inmediato al confirmar.
        </p>
      )}
    </Card>
  );
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function PublicProfileCard({ canManage }: { canManage: boolean }) {
  const { active } = useActiveBusiness();
  const [enabled, setEnabled] = useState(false);
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (active) {
      setEnabled(active.public_enabled ?? false);
      setSlug(active.public_slug ?? slugify(active.name));
      setDescription(active.public_description ?? "");
    }
  }, [active]);

  async function save(nextEnabled: boolean) {
    if (!active) return;
    setSaving(true);
    const finalSlug = slug.trim() ? slugify(slug) : slugify(active.name);
    const { error } = await supabase
      .from("businesses")
      .update({
        public_enabled: nextEnabled,
        public_slug: finalSlug,
        public_description: description || null,
      })
      .eq("id", active.id);
    setSaving(false);
    if (error) {
      if ((error as any).code === "23505") {
        toast.error("Ese nombre de perfil público (URL) ya está en uso, prueba otro.");
      } else {
        toast.error("No se pudo guardar el perfil público");
      }
      return;
    }
    setEnabled(nextEnabled);
    toast.success(nextEnabled ? "Perfil público activado" : "Perfil público desactivado");
  }

  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <Globe className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold">Perfil público</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Muestra tu negocio en el{" "}
                <a href="/negocios" className="underline" target="_blank" rel="noreferrer">
                  directorio público
                </a>{" "}
                y junto a tus publicaciones del{" "}
                <a href="/foro" className="underline" target="_blank" rel="noreferrer">
                  foro
                </a>
                . Solo se muestra nombre, rubro y la descripción que escribas aquí — nunca tu RUT,
                dirección ni otros datos privados.
              </p>
            </div>
            <Switch
              checked={enabled}
              disabled={!canManage || saving}
              onCheckedChange={(v) => save(v)}
            />
          </div>

          {enabled && (
            <div className="mt-4 space-y-3">
              <div>
                <Label htmlFor="pub-slug">URL pública</Label>
                <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <span>nuva-one.vercel.app/negocios/</span>
                  <Input
                    id="pub-slug"
                    value={slug}
                    onChange={(e) => setSlug(slugify(e.target.value))}
                    disabled={!canManage}
                    className="h-8 w-48"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="pub-desc">Descripción corta</Label>
                <Textarea
                  id="pub-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!canManage}
                  rows={3}
                  maxLength={300}
                  placeholder="Ej: Vendemos artículos deportivos en Talca, despacho a toda la región del Maule."
                />
              </div>
              <Button size="sm" disabled={!canManage || saving} onClick={() => save(true)}>
                Guardar
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
