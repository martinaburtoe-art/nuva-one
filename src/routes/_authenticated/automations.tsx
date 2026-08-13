import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MessageCircle, Phone, CheckCircle2, ChevronDown, Sparkles } from "lucide-react";
import { useBizList, useBizInsert, useBizUpdate, useBizDelete } from "@/lib/biz-data";
import { useMyRole, canWriteOperations } from "@/lib/use-business";
import { normalizeWhatsAppNumber, isPlausiblePhoneNumber } from "@/lib/phone";
import { toast } from "sonner";
import { ModuleGuard } from "@/components/module-guard";

export const Route = createFileRoute("/_authenticated/automations")({
  head: () => ({ meta: [{ title: "Vinculación WhatsApp — Nüva One" }] }),
  component: WhatsAppLinking,
});

type OwnerLink = {
  id: string;
  owner_phone_number: string;
  active: boolean;
};

function WhatsAppLinking() {
  const { data: myRole } = useMyRole();
  const canWrite = canWriteOperations(myRole);

  // --- Vinculación personal (Doña María pregunta por SU negocio) ---
  const { data: ownerLinks, isLoading: ownerLoading } =
    useBizList<OwnerLink>("whatsapp_owner_links");
  const ownerInsert = useBizInsert("whatsapp_owner_links");
  const ownerUpdate = useBizUpdate("whatsapp_owner_links");
  const ownerDelete = useBizDelete("whatsapp_owner_links");
  const ownerLink = ownerLinks?.[0];
  const [ownerPhone, setOwnerPhone] = useState("");

  useEffect(() => {
    if (ownerLink) setOwnerPhone(ownerLink.owner_phone_number);
  }, [ownerLink?.id]);

  async function linkOwnerNumber() {
    if (!isPlausiblePhoneNumber(ownerPhone)) {
      toast.error("Ingresa tu número completo con código de país, ej: +56 9 1234 5678");
      return;
    }
    const normalized = normalizeWhatsAppNumber(ownerPhone);
    try {
      if (ownerLink) {
        await ownerUpdate.mutateAsync({
          id: ownerLink.id,
          patch: { owner_phone_number: normalized, active: true },
        });
      } else {
        await ownerInsert.mutateAsync({ owner_phone_number: normalized, active: true });
      }
    } catch (err: any) {
      // Índice único parcial en whatsapp_owner_links (owner_phone_number
      // WHERE active = true) -- este número ya está vinculado como owner de
      // OTRO negocio.
      if (err?.code === "23505") {
        toast.error(
          "Ese número de WhatsApp ya está vinculado a otro negocio en Nüva One. Cada número solo puede estar vinculado a un negocio a la vez.",
        );
        return;
      }
      throw err;
    }
  }

  async function unlinkOwnerNumber() {
    if (!ownerLink) return;
    await ownerDelete.mutateAsync(ownerLink.id);
    setOwnerPhone("");
  }

  // --- Avanzado / opcional: número propio del negocio para SUS clientes ---
  const { data: waConnections, isLoading: waLoading } = useBizList<{
    id: string;
    phone_number_id: string;
    waba_id: string | null;
    display_phone_number: string | null;
    access_token: string;
    auto_stock_query: boolean;
    auto_price_query: boolean;
    auto_general_ai: boolean;
    active: boolean;
  }>("whatsapp_connections");
  const waInsert = useBizInsert("whatsapp_connections");
  const waUpdate = useBizUpdate("whatsapp_connections");
  const wa = waConnections?.[0];
  const [waForm, setWaForm] = useState({
    phone_number_id: "",
    waba_id: "",
    display_phone_number: "",
    access_token: "",
  });

  useEffect(() => {
    if (wa) {
      setWaForm({
        phone_number_id: wa.phone_number_id,
        waba_id: wa.waba_id ?? "",
        display_phone_number: wa.display_phone_number ?? "",
        access_token: wa.access_token,
      });
    }
  }, [wa?.id]);

  async function saveWhatsAppBusinessNumber() {
    if (!waForm.phone_number_id || !waForm.access_token) {
      toast.error("Completa el Phone Number ID y el Access Token de Meta");
      return;
    }
    if (wa) {
      await waUpdate.mutateAsync({ id: wa.id, patch: waForm });
    } else {
      await waInsert.mutateAsync({
        ...waForm,
        auto_stock_query: true,
        auto_price_query: true,
        auto_general_ai: true,
        active: true,
      });
    }
  }

  return (
    <ModuleGuard module="automations">
      <>
        <PageHeader
          title="Vinculación WhatsApp"
          description="Pregúntale a tu asistente de IA sobre tu negocio directamente desde tu WhatsApp, sin abrir la app"
        />

        <Card className="mb-6 border-primary/30 bg-accent/40 p-6">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
            <div className="w-full flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Tu asistente de IA por WhatsApp</h3>
                {ownerLink?.active && <CheckCircle2 className="h-4 w-4 text-green-600" />}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Ingresa tu número de WhatsApp una sola vez. Desde ese momento puedes escribirle al
                número de Nüva One y preguntar por tus ventas, stock, flujo de caja o cotizaciones —
                el mismo asistente que tienes en el dashboard, pero por WhatsApp, para cuando estás
                apurada/o y no puedes entrar a la app.
              </p>

              {ownerLoading ? (
                <Skeleton className="mt-4 h-10 w-full" />
              ) : (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Input
                    placeholder="+56 9 1234 5678"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    disabled={!canWrite}
                    className="sm:max-w-xs"
                  />
                  <div className="flex gap-2">
                    <Button onClick={linkOwnerNumber} disabled={!canWrite}>
                      {ownerLink ? "Actualizar número" : "Vincular WhatsApp"}
                    </Button>
                    {ownerLink && (
                      <Button variant="outline" onClick={unlinkOwnerNumber} disabled={!canWrite}>
                        Desvincular
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {ownerLink && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Vinculado: +{ownerLink.owner_phone_number}. Escríbele al número de WhatsApp de
                  Nüva One para empezar a preguntar por tu negocio.
                </p>
              )}
            </div>
          </div>
        </Card>

        <Collapsible>
          <CollapsibleTrigger asChild>
            <button className="mb-3 flex w-full items-center gap-2 text-left text-sm font-semibold text-muted-foreground hover:text-foreground">
              <ChevronDown className="h-4 w-4" />
              AVANZADO (OPCIONAL): NÚMERO PROPIO PARA TUS CLIENTES
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="mb-6 p-6">
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-5 w-5 text-primary" />
                <div className="w-full flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">
                      Conecta el WhatsApp de tu negocio (para tus clientes)
                    </h3>
                    {wa?.active && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Esto es distinto a lo de arriba: aquí conectas tu PROPIO número de WhatsApp
                    Business (vía Meta Cloud API, gratis hasta 1.000 conversaciones/mes) para que
                    tus CLIENTES te escriban directamente y reciban stock/precios automáticos.
                    También habilita los recordatorios automáticos de cotizaciones y cobranza.
                  </p>

                  {waLoading ? (
                    <Skeleton className="mt-4 h-32 w-full" />
                  ) : (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="wa_phone_id">Phone Number ID (Meta)</Label>
                        <Input
                          id="wa_phone_id"
                          value={waForm.phone_number_id}
                          onChange={(e) =>
                            setWaForm((f) => ({ ...f, phone_number_id: e.target.value }))
                          }
                          disabled={!canWrite}
                        />
                      </div>
                      <div>
                        <Label htmlFor="wa_display">Número visible (opcional)</Label>
                        <Input
                          id="wa_display"
                          placeholder="+56 9 1234 5678"
                          value={waForm.display_phone_number}
                          onChange={(e) =>
                            setWaForm((f) => ({ ...f, display_phone_number: e.target.value }))
                          }
                          disabled={!canWrite}
                        />
                      </div>
                      <div>
                        <Label htmlFor="wa_waba">WhatsApp Business Account ID (opcional)</Label>
                        <Input
                          id="wa_waba"
                          value={waForm.waba_id}
                          onChange={(e) => setWaForm((f) => ({ ...f, waba_id: e.target.value }))}
                          disabled={!canWrite}
                        />
                      </div>
                      <div>
                        <Label htmlFor="wa_token">Access Token (Meta)</Label>
                        <Input
                          id="wa_token"
                          type="password"
                          value={waForm.access_token}
                          onChange={(e) =>
                            setWaForm((f) => ({ ...f, access_token: e.target.value }))
                          }
                          disabled={!canWrite}
                        />
                      </div>
                    </div>
                  )}

                  {wa && (
                    <div className="mt-4 space-y-2 border-t pt-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="auto_stock" className="font-normal">
                          Responder consultas de stock
                        </Label>
                        <Switch
                          id="auto_stock"
                          checked={wa.auto_stock_query}
                          disabled={!canWrite}
                          onCheckedChange={(v) =>
                            waUpdate.mutate({ id: wa.id, patch: { auto_stock_query: v } })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="auto_price" className="font-normal">
                          Responder consultas de precio
                        </Label>
                        <Switch
                          id="auto_price"
                          checked={wa.auto_price_query}
                          disabled={!canWrite}
                          onCheckedChange={(v) =>
                            waUpdate.mutate({ id: wa.id, patch: { auto_price_query: v } })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="auto_general" className="font-normal">
                          Responder preguntas generales con IA
                        </Label>
                        <Switch
                          id="auto_general"
                          checked={wa.auto_general_ai}
                          disabled={!canWrite}
                          onCheckedChange={(v) =>
                            waUpdate.mutate({ id: wa.id, patch: { auto_general_ai: v } })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="wa_active" className="font-normal">
                          Chatbot activo
                        </Label>
                        <Switch
                          id="wa_active"
                          checked={wa.active}
                          disabled={!canWrite}
                          onCheckedChange={(v) =>
                            waUpdate.mutate({ id: wa.id, patch: { active: v } })
                          }
                        />
                      </div>
                    </div>
                  )}

                  {canWrite && (
                    <Button onClick={saveWhatsAppBusinessNumber} className="mt-4" variant="outline">
                      {wa ? "Actualizar conexión" : "Conectar WhatsApp de mi negocio"}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        <Card className="p-4">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <MessageCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              ¿Necesitas automatizar flujos más complejos (n8n, Make, Zapier)? Ese motor externo se
              movió — escríbenos y te ayudamos a conectarlo a medida.
            </p>
          </div>
        </Card>
      </>
    </ModuleGuard>
  );
}
