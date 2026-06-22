import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageHeader, ComingSoonBadge } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Shield, AlertTriangle } from "lucide-react";
import { useActiveBusiness } from "@/lib/use-business";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Configuración — NovaFlow" }] }),
  component: Settings,
});

function Settings() {
  const { active } = useActiveBusiness();
  const navigate = useNavigate();
  const [name, setName] = useState(active?.name ?? "");
  const [taxId, setTaxId] = useState("");

  useEffect(() => { if (active) setName(active.name); }, [active]);

  async function save() {
    if (!active) return;
    const { error } = await supabase.from("businesses").update({ name, tax_id: taxId }).eq("id", active.id);
    if (error) toast.error("Error"); else toast.success("Guardado");
  }

  async function deleteBusiness() {
    if (!active) return;
    if (!confirm(`¿Eliminar el negocio "${active.name}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from("businesses").delete().eq("id", active.id);
    if (error) toast.error("Error"); else { localStorage.removeItem("novaflow.active_business_id"); navigate({ to: "/select-business" }); }
  }

  return (
    <>
      <PageHeader title="Configuración" description="Gestiona tu negocio, equipo y preferencias" />
      <Tabs defaultValue="business">
        <TabsList>
          <TabsTrigger value="business">Negocio</TabsTrigger>
          <TabsTrigger value="team">Equipo</TabsTrigger>
          <TabsTrigger value="security">Seguridad</TabsTrigger>
          <TabsTrigger value="billing">Facturación</TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold">Perfil del negocio</h3>
            <div className="mt-4 space-y-4">
              <div><Label htmlFor="bname">Nombre</Label><Input id="bname" value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label htmlFor="tax">RUT / Tax ID</Label><Input id="tax" value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="76.123.456-7" /></div>
              <Button onClick={save}>Guardar cambios</Button>
            </div>
          </Card>

          <Card className="border-destructive/30 p-6">
            <h3 className="font-semibold text-destructive">Zona peligrosa</h3>
            <p className="mt-1 text-sm text-muted-foreground">Eliminar este negocio borra todos sus datos. No se puede revertir.</p>
            <Button variant="destructive" className="mt-4" onClick={deleteBusiness}><Trash2 className="mr-1.5 h-4 w-4" />Eliminar negocio</Button>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card className="p-6">
            <h3 className="font-semibold">Miembros del equipo</h3>
            <p className="mt-1 text-sm text-muted-foreground">Invita personas y asigna roles (Propietario, Admin, Staff, Solo lectura).</p>
            <div className="mt-4 flex gap-2">
              <Input type="email" placeholder="email@ejemplo.cl" />
              <Button>Invitar</Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Funcionalidad de invitaciones por email <ComingSoonBadge /></p>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="p-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <h3 className="font-semibold">Autenticación de dos factores (2FA)</h3>
                <p className="mt-1 text-sm text-muted-foreground">Añade una capa extra de seguridad a tu cuenta.</p>
                <Button variant="outline" className="mt-4">Activar 2FA</Button>
                <p className="mt-3 text-xs text-muted-foreground"><ComingSoonBadge /></p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card className="p-6">
            <h3 className="font-semibold">Plan actual: Starter</h3>
            <p className="mt-1 text-sm text-muted-foreground">Actualiza para desbloquear automatizaciones e IA ilimitada.</p>
            <Button className="mt-4">Actualizar a Pro</Button>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
