import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, RefreshCw, Save, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness } from "@/lib/use-business";
import { INDUSTRY_PROFILES, getIndustryProfile } from "@/lib/industry-profiles";
import { serializeIndustryAnswers, type IndustryAnswerDraft } from "@/lib/industry-profile-answers";
import { toast } from "sonner";

type PersistedIndustry = {
  industry_profile: string | null;
  industry_secondary_profiles: string[] | null;
  industry_config: { schemaVersion?: number; answers?: Record<string, boolean> } | null;
};

function toDraft(profileId: string | null, answers: Record<string, boolean> | null | undefined): IndustryAnswerDraft {
  const profile = getIndustryProfile(profileId);
  if (!profile) return {};
  return Object.fromEntries(profile.operationalQuestions.flatMap((_, index) => {
    const key = "operation_" + (index + 1);
    return typeof answers?.[key] === "boolean" ? [[key, answers[key] ? "yes" : "no"]] : [];
  }));
}

export function IndustryProfileSettings({ canManage }: { canManage: boolean }) {
  const { active } = useActiveBusiness();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schemaAvailable, setSchemaAvailable] = useState(false);
  const [profileId, setProfileId] = useState("");
  const [answers, setAnswers] = useState<IndustryAnswerDraft>({});
  const [secondaryProfiles, setSecondaryProfiles] = useState<string[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const profile = useMemo(() => getIndustryProfile(profileId), [profileId]);

  useEffect(() => {
    let mounted = true;
    if (!active?.id) { setLoading(false); return; }
    setLoading(true);
    setLoadError(null);
    (supabase.from("businesses") as any)
      .select("industry_profile, industry_secondary_profiles, industry_config")
      .eq("id", active.id)
      .maybeSingle()
      .then(({ data, error }: { data: PersistedIndustry | null; error: { code?: string; message?: string } | null }) => {
        if (!mounted) return;
        const missing = error?.code === "42703" || error?.code === "PGRST204" || /industry_profile|industry_config/i.test(error?.message ?? "");
        if (missing) {
          setSchemaAvailable(false);
          setLoadError(null);
        } else if (error) {
          setLoadError("No fue posible leer la configuración sectorial de este negocio.");
        } else {
          setSchemaAvailable(true);
          const selected = data?.industry_profile ?? "";
          setProfileId(selected);
          setSecondaryProfiles(data?.industry_secondary_profiles ?? []);
          setAnswers(toDraft(selected, data?.industry_config?.answers));
        }
        setLoading(false);
      });
    return () => { mounted = false; };
  }, [active?.id]);

  function changeProfile(next: string) {
    setProfileId(next);
    setAnswers({});
  }

  async function save() {
    if (!active?.id || !profile || !canManage || !schemaAvailable) return;
    setSaving(true);
    const payload = {
      industry: profile.coreIndustry,
      industry_profile: profile.id,
      industry_secondary_profiles: secondaryProfiles.filter((id) => id !== profile.id),
      industry_config: { schemaVersion: 1, answers: serializeIndustryAnswers(profile.id, answers) },
      industry_config_version: 1,
      industry_profile_updated_at: new Date().toISOString(),
    };
    const { error } = await (supabase.from("businesses") as any).update(payload).eq("id", active.id);
    setSaving(false);
    if (error) {
      toast.error(error.message?.includes("industry_profile") ? "La migración sectorial aún no está disponible en esta base de datos." : "No se pudo guardar el perfil sectorial.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["dashboard-industry-profile", active.id] });
    toast.success("Perfil sectorial actualizado");
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="h-4 w-4" /></div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold">Inteligencia sectorial</h3>
          <p className="mt-1 text-sm text-muted-foreground">Define el rubro operativo para adaptar el Resumen y las recomendaciones. No modifica tu giro tributario ni activa funciones que aún no están disponibles.</p>
        </div>
      </div>
      {loading ? <p className="mt-4 text-sm text-muted-foreground">Cargando configuración…</p> : loadError ? <p role="alert" className="mt-4 text-sm text-destructive">{loadError}</p> : !schemaAvailable ? (
        <div className="mt-4 rounded-lg border border-dashed p-3 text-sm text-muted-foreground"><Lock className="mr-2 inline h-4 w-4" />La estructura de base de datos para perfiles sectoriales está pendiente de migración. No se ha modificado ningún dato.</div>
      ) : (
        <>
          <div className="mt-4 space-y-2">
            <Label htmlFor="industry-profile-settings">Rubro principal</Label>
            <Select value={profileId} onValueChange={changeProfile} disabled={!canManage}>
              <SelectTrigger id="industry-profile-settings"><SelectValue placeholder="Selecciona el rubro de tu negocio" /></SelectTrigger>
              <SelectContent className="max-h-80">
                {INDUSTRY_PROFILES.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {profile && <p className="text-xs text-muted-foreground">{profile.summary}</p>}
          </div>
          {profile && profile.operationalQuestions.length > 0 && (
            <div className="mt-5 space-y-3">
              <div><h4 className="text-sm font-medium">Cómo opera tu negocio</h4><p className="text-xs text-muted-foreground">Responde solo lo que corresponda. Las preguntas sin respuesta no se guardan.</p></div>
              {profile.operationalQuestions.map((question, index) => {
                const key = "operation_" + (index + 1);
                return <div key={key} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_190px] sm:items-center">
                  <Label className="leading-5">{question}</Label>
                  <Select value={answers[key] ?? "unanswered"} onValueChange={(value) => setAnswers((current) => ({ ...current, [key]: value === "yes" || value === "no" ? value : undefined }))} disabled={!canManage}>
                    <SelectTrigger aria-label={question}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unanswered">Sin responder</SelectItem>
                      <SelectItem value="yes">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>;
              })}
            </div>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            {!canManage && <p className="text-xs text-muted-foreground"><Lock className="mr-1 inline h-3 w-3" />Solo propietario o administrador puede editar.</p>}
            <Button onClick={save} disabled={!canManage || !profile || saving || loading} className="ml-auto">{saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Guardar rubro y contexto</Button>
          </div>
        </>
      )}
    </Card>
  );
}
