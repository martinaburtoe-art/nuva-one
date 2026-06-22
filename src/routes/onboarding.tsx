import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Empieza — NovaFlow" }] }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("other");
  const [size, setSize] = useState("1-5");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate({ to: "/auth" });
    });
  }, [navigate]);

  async function finish() {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("No autenticado");
      const { data, error } = await supabase
        .from("businesses")
        .insert({ name, industry: industry as any, size, owner_id: userData.user.id })
        .select("id")
        .single();
      if (error) throw error;
      localStorage.setItem("novaflow.active_business_id", data.id);
      toast.success("¡Listo! Tu negocio está creado");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Error al crear el negocio");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-mesh px-6 py-12">
      <Card className="w-full max-w-lg p-8 shadow-elegant">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold tracking-tight">NovaFlow</span>
        </div>

        <div className="mb-6 flex gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`h-1.5 flex-1 rounded-full transition-colors ${n <= step ? "bg-gradient-primary" : "bg-muted"}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="animate-fade-in-up">
            <h2 className="text-2xl font-bold">¿Cómo se llama tu negocio?</h2>
            <p className="mt-2 text-sm text-muted-foreground">Puedes cambiarlo más tarde.</p>
            <div className="mt-6 space-y-3">
              <Label htmlFor="bname">Nombre del negocio</Label>
              <Input id="bname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Boutique Norte" autoFocus />
            </div>
            <div className="mt-8 flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!name.trim()}>
                Siguiente <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in-up">
            <h2 className="text-2xl font-bold">¿En qué industria estás?</h2>
            <p className="mt-2 text-sm text-muted-foreground">Esto nos ayuda a personalizar tu experiencia.</p>
            <div className="mt-6 space-y-3">
              <Label>Industria</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">Retail / Comercio</SelectItem>
                  <SelectItem value="food">Gastronomía</SelectItem>
                  <SelectItem value="services">Servicios profesionales</SelectItem>
                  <SelectItem value="manufacturing">Manufactura</SelectItem>
                  <SelectItem value="health">Salud</SelectItem>
                  <SelectItem value="construction">Construcción</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="mr-1.5 h-4 w-4" />Atrás</Button>
              <Button onClick={() => setStep(3)}>Siguiente <ArrowRight className="ml-1.5 h-4 w-4" /></Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in-up">
            <h2 className="text-2xl font-bold">¿Cuántas personas trabajan contigo?</h2>
            <p className="mt-2 text-sm text-muted-foreground">Para configurar tu plan ideal.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {["solo", "1-5", "6-20", "21+"].map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`rounded-xl border p-4 text-left transition-all hover:border-primary hover:shadow-soft ${size === s ? "border-primary bg-accent" : "border-border"}`}
                >
                  <div className="font-semibold">{s === "solo" ? "Solo yo" : `${s} personas`}</div>
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}><ArrowLeft className="mr-1.5 h-4 w-4" />Atrás</Button>
              <Button onClick={finish} disabled={loading} className="shadow-elegant">
                {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Empezar
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
