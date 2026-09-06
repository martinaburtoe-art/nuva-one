import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MessageCircle, Phone, CheckCircle2, ChevronDown, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBizList, useBizUpdate, useBizDelete } from "@/lib/biz-data";
import { useActiveBusiness, useMyRole, canWriteOperations } from "@/lib/use-business";
import { normalizeWhatsAppNumber, isPlausiblePhoneNumber } from "@/lib/phone";
import { toast } from "sonner";
import { ModuleGuard } from "@/components/module-guard";

export const Route = createFileRoute("/_authenticated/automations")({
  head: () => ({ meta: [{ title: "Vinculación WhatsApp — Nüva One" }] }),
  component: WhatsAppLinking,
});

type OwnerLink = { id: string; owner_phone_number: string; active: boolean };
type WhatsAppConnection = { id: string; phone_number_id: string; waba_id: string | null; display_phone_number: string | null; auto_stock_query: boolean; auto_price_query: boolean; auto_general_ai: boolean; active: boolean };

function WhatsAppLinking() {
  const { active } = useActiveBusiness();
  const { data: myRole } = useMyRole();
  const canWrite = canWriteOperations(myRole);
  const queryClient = useQueryClient();
  const { data: ownerLinks, isLoading: ownerLoading } = useBizList<OwnerLink>("whatsapp_owner_links");
  const ownerInsert = useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      if (!active) throw new Error("Selecciona un negocio");
      const { error } = await supabase.from("whatsapp_owner_links").insert({ ...row, business_id: active.id } as never);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["whatsapp_owner_links", active?.id] }); toast.success("Guardado"); },
    onError: (e: Error) => toast.error(e.message ?? "Error al guardar"),
  });
  const ownerUpdate = useBizUpdate("whatsapp_owner_links");
  const ownerDelete = useBizDelete("whatsapp_owner_links");
  const ownerLink = ownerLinks?.[0];
  const [ownerPhone, setOwnerPhone] = useState("");
  useEffect(() => { if (ownerLink) setOwnerPhone(ownerLink.owner_phone_number); }, [ownerLink?.id]);

  async function linkOwnerNumber() {
    if (!isPlausiblePhoneNumber(ownerPhone)) { toast.error("Ingresa tu número completo con código de país, ej: +56 9 1234 5678"); return; }
    const normalized = normalizeWhatsAppNumber(ownerPhone);
    try {
      if (ownerLink) await ownerUpdate.mutateAsync({ id: ownerLink.id, patch: { owner_phone_number: normalized, active: true } });
      else await ownerInsert.mutateAsync({ owner_phone_number: normalized, active: true });
    } catch (err: any) {
      if (err?.code === "23505") { toast.error("Ese número de WhatsApp ya está vinculado a otro negocio en Nüva One. Cada número solo puede estar vinculado a un negocio a la vez."); return; }
      throw err;
    }
  }
  async function unlinkOwnerNumber() { if (!ownerLink) return; await ownerDelete.mutateAsync(ownerLink.id); setOwnerPhone(""); }

  const { data: waConnections, isLoading: waLoading } = useQuery({
    enabled: !!active?.id,
    queryKey: ["whatsapp_connections", active?.id],
    queryFn: async () => {
      if (!active) return [] as WhatsAppConnection[];
      const { data, error } = await supabase.from("whatsapp_connections").select("id, phone_number_id, waba_id, display_phone_number, auto_stock_query, auto_price_query, auto_general_ai, active").eq("business_id", active.id);
      if (error) throw error;
      return (data ?? []) as WhatsAppConnection[];
    },
  });
  const waUpdate = useBizUpdate("whatsapp_connections");
  const wa = waConnections?.[0];
  const [waForm, setWaForm] = useState({ phone_number_id: "", waba_id: "", display_phone_number: "", access_token: "" });
  useEffect(() => { if (wa) setWaForm((current) => ({ ...current, phone_number_id: wa.phone_number_id, waba_id: wa.waba_id ?? "", display_phone_number: wa.display_phone_number ?? "" })); }, [wa?.id, wa?.phone_number_id, wa?.waba_id, wa?.display_phone_number]);
  const waInsert = useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      if (!active) throw new Error("Selecciona un negocio");
      const { error } = await supabase.from("whatsapp_connections").insert({ ...row, business_id: active.id } as never);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["whatsapp_connections", active?.id] }); toast.success("Guardado"); setWaForm((current) => ({ ...current, access_token: "" })); },
    onError: (e: Error) => toast.error(e.message ?? "Error al guardar"),
  });
  async function saveWhatsAppBusinessNumber() {
    if (!waForm.phone_number_id || !waForm.access_token) { toast.error("Completa el Phone Number ID y el Access Token de Meta"); return; }
    if (wa) {
      await waUpdate.mutateAsync({ id: wa.id, patch: { phone_number_id: waForm.phone_number_id, waba_id: waForm.waba_id || null, display_phone_number: waForm.display_phone_number || null, access_token: waForm.access_token } });
      setWaForm((current) => ({ ...current, access_token: "" }));
    } else {
      await waInsert.mutateAsync({ ...waForm, auto_stock_query: true, auto_price_query: true, auto_general_ai: true, active: true });
    }
  }

  return (
    <ModuleGuard module="automations">
      <>
        <PageHeader title="Vinculación WhatsApp" description="Pregúntale a tu asistente de IA sobre tu negocio directamente desde tu WhatsApp, sin abrir la app" />
        <Card className="mb-6 border-primary/30 bg-accent/40 p-6"><div className="flex items-start gap-3"><Sparkles className="mt-0.5 h-5 w-5 text-primary" /><div className="w-full flex-1"><div className="flex items-center gap-2"><h3 className="font-semibold">Tu asistente de IA por WhatsApp</h3>{ownerLink?.active && <CheckCircle2 className="h-4 w-4 text-green-600" />}</div><p className="mt-1 text-sm text-muted-foreground">Ingresa tu número de WhatsApp una sola vez. Desde ese momento puedes escribirle al número de Nüva One y preguntar por tus ventas, stock, flujo de caja o cotizaciones — el mismo asistente que tienes en el dashboard, pero por WhatsApp, para cuando estás apurada/o y no puedes entrar a la app.</p>{ownerLoading ? <Skeleton className="mt-4 h-10 w-full" /> : <div className="mt-4 flex flex-col gap-2 sm:flex-row"><Input placeholder="+56 9 1234 5678" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} disabled={!canWrite} className="sm:max-w-xs" /><div className="flex gap-2"><Button onClick={linkOwnerNumber} disabled={!canWrite}>{ownerLink ? "Actualizar número" : "Vincular WhatsApp"}</Button>{ownerLink && <Button variant="outline" onClick={unlinkOwnerNumber} disabled={!canWrite}>Desvincular</Button>}</div></div>}{ownerLink && <p className="mt-3 text-xs text-muted-foreground">Vinculado: +{ownerLink.owner_phone_number}. Escríbele al número de WhatsApp de Nüva One para empezar a preguntar por tu negocio.</p>}</div></div></Card>
        <Collapsible><CollapsibleTrigger asChild><button className="mb-3 flex w-full items-center gap-2 text-left text-sm font-semibold text-muted-foreground hover:text-foreground"><ChevronDown className="h-4 w-4" />AVANZADO (OPCIONAL): NÚMERO PROPIO PARA TUS CLIENTES</button></CollapsibleTrigger><CollapsibleContent><Card className="mb-6 p-6"><div className="flex items-start gap-3"><Phone className="mt-0.5 h-5 w-5 text-primary" /><div className="w-full flex-1"><div className="flex items-center gap-2"><h3 className="font-semibold">Conecta el WhatsApp de tu negocio (para tus clientes)</h3>{wa?.active && <CheckCircle2 className="h-4 w-4 text-green-600" />}</div><p className="mt-1 text-sm text-muted-foreground">Esto es distinto a lo de arriba: aquí conectas tu PROPIO número de WhatsApp Business (vía Meta Cloud API) para que tus CLIENTES te escriban directamente y reciban stock/precios automáticos. También habilita los recordatorios automáticos de cotizaciones y cobranza.</p>{waLoading ? <Skeleton className="mt-4 h-32 w-full" /> : <div className="mt-4 grid gap-3 sm:grid-cols-2"><div><Label htmlFor="wa_phone_id">Phone Number ID (Meta)</Label><Input id="wa_phone_id" value={waForm.phone_number_id} onChange={(e) => setWaForm((f) => ({ ...f, phone_number_id: e.target.value }))} disabled={!canWrite} /></div><div><Label htmlFor="wa_display">Número visible (opcional)</Label><Input id="wa_display" placeholder="+56 9 1234 5678" value={waForm.display_phone_number} onChange={(e) => setWaForm((f) => ({ ...f, display_phone_number: e.target.value }))} disabled={!canWrite} /></div><div><Label htmlFor="wa_waba">WhatsApp Business Account ID (opcional)</Label><Input id="wa_waba" value={waForm.waba_id} onChange={(e) => setWaForm((f) => ({ ...f, waba_id: e.target.value }))} disabled={!canWrite} /></div><div><Label htmlFor="wa_token">Access Token (Meta)</Label><Input id="wa_token" type="password" autoComplete="new-password" value={waForm.access_token} onChange={(e) => setWaForm((f) => ({ ...f, access_token: e.target.value }))} disabled={!canWrite} placeholder="Se solicita solo al guardar" /></div></div>}{wa && (<div className="mt-4 rounded-lg border p-3 text-sm"><p className="font-medium">Número conectado: {wa.display_phone_number || wa.phone_number_id}</p><div className="mt-3 grid gap-3 sm:grid-cols-3"><label className="flex items-center justify-between gap-3"><span>Consulta de stock</span><Switch checked={wa.auto_stock_query} onCheckedChange={(checked) => waUpdate.mutate({ id: wa.id, patch: { auto_stock_query: checked } })} disabled={!canWrite} /></label><label className="flex items-center justify-between gap-3"><span>Consulta de precios</span><Switch checked={wa.auto_price_query} onCheckedChange={(checked) => waUpdate.mutate({ id: wa.id, patch: { auto_price_query: checked } })} disabled={!canWrite} /></label><label className="flex items-center justify-between gap-3"><span>IA general</span><Switch checked={wa.auto_general_ai} onCheckedChange={(checked) => waUpdate.mutate({ id: wa.id, patch: { auto_general_ai: checked } })} disabled={!canWrite} /></label></div></div>)}<div className="mt-4"><Button onClick={() => void saveWhatsAppBusinessNumber()} disabled={!canWrite || !waForm.phone_number_id || !waForm.access_token}>Guardar conexión</Button></div></div></div></Card></CollapsibleContent></Collapsible>
      </>
    </ModuleGuard>
  );
}
