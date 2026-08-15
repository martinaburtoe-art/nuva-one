import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, ArrowRight, ArrowLeft, BarChart3, Boxes, CircleDollarSign, Users, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Configura tu negocio — Nüva One" }, { name: "description", content: "Configura Nüva One para empezar a entender y controlar tu negocio." }] }),
  component: Onboarding,
});

const goals = [
  { id: "sales", title: "Ventas", text: "Saber qué vendo y cuánto genero.", icon: CircleDollarSign },
  { id: "inventory", title: "Inventario", text: "Evitar quiebres y exceso de stock.", icon: Boxes },
  { id: "finance", title: "Finanzas", text: "Entender ingresos, gastos y margen.", icon: BarChart3 },
  { id: "customers", title: "Clientes", text: "Conocer y hacer crecer mi cartera.", icon: Users },
];

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("other");
  const [size, setSize] = useState("1-5");
  const [goal, setGoal] = useState("sales");

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
      const { data, error } = await supabase.from("businesses").insert({ name, industry: industry as any, size } as any).select("id").single();
      if (error) throw error;
      localStorage.setItem("novaflow.active_business_id", data.id);
      localStorage.setItem("nuva.onboarding_goal", goal);
      toast.success("¡Listo! Tu negocio está creado");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Error al crear el negocio");
    } finally {
      setLoading(false);
    }
  }

  const labels = ["Tu negocio", "Tu industria", "Tu foco", "Listo"];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-mesh px-4 py-8 sm:px-6 sm:py-12">
      <Card className="w-full max-w-2xl overflow-hidden shadow-elegant">
        <div className="border-b bg-card/80 px-6 py-5 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary"><Sparkles className="h-4 w-4 text-primary-foreground" /></div><span className="font-semibold tracking-tight">Nüva One</span></div>
            <span className="text-xs text-muted-foreground">Configuración inicial</span>
          </div>
          <div className="mt-6 grid grid-cols-4 gap-2">{labels.map((label, index) => { const n = index + 1; return <div key={label}><div className={`h-1.5 rounded-full transition-colors ${n <= step ? "bg-gradient-primary" : "bg-muted"}`} /><div className={`mt-2 hidden text-[11px] sm:block ${n <= step ? "font-medium text-foreground" : "text-muted-foreground"}`}>{label}</div></div>; })}</div>
        </div>

        <div className="px-6 py-8 sm:px-8 sm:py-10">
          {step === 1 && <div className="animate-fade-in-up"><span className="text-xs font-semibold uppercase tracking-wider text-primary">Paso 1 de 4</span><h1 className="mt-2 text-2xl font-bold sm:text-3xl">Empecemos por tu negocio.</h1><p className="mt-2 max-w-lg text-sm text-muted-foreground">Este será el centro de tu espacio Nüva One. Podrás cambiar la información después.</p><div className="mt-7 space-y-3"><Label htmlFor="bname">Nombre del negocio</Label><Input id="bname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Boutique Norte" autoFocus className="h-11" /></div><div className="mt-8 flex justify-end"><Button onClick={() => setStep(2)} disabled={!name.trim()} size="lg">Continuar <ArrowRight className="ml-1.5 h-4 w-4" /></Button></div></div>}

          {step === 2 && <div className="animate-fade-in-up"><span className="text-xs font-semibold uppercase tracking-wider text-primary">Paso 2 de 4</span><h1 className="mt-2 text-2xl font-bold sm:text-3xl">Personalicemos tu experiencia.</h1><p className="mt-2 max-w-lg text-sm text-muted-foreground">Nüva One utilizará esta información para darte un contexto más útil.</p><div className="mt-7 space-y-3"><Label>Industria</Label><Select value={industry} onValueChange={setIndustry}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="retail">Retail / Comercio</SelectItem><SelectItem value="food">Gastronomía</SelectItem><SelectItem value="services">Servicios profesionales</SelectItem><SelectItem value="manufacturing">Manufactura</SelectItem><SelectItem value="health">Salud</SelectItem><SelectItem value="construction">Construcción</SelectItem><SelectItem value="other">Otro</SelectItem></SelectContent></Select></div><div className="mt-8 flex justify-between"><Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="mr-1.5 h-4 w-4" />Atrás</Button><Button onClick={() => setStep(3)} size="lg">Continuar <ArrowRight className="ml-1.5 h-4 w-4" /></Button></div></div>}

          {step === 3 && <div className="animate-fade-in-up"><span className="text-xs font-semibold uppercase tracking-wider text-primary">Paso 3 de 4</span><h1 className="mt-2 text-2xl font-bold sm:text-3xl">¿Qué quieres controlar primero?</h1><p className="mt-2 max-w-lg text-sm text-muted-foreground">Elige una prioridad. Esto no limita las funcionalidades de tu cuenta.</p><div className="mt-7 grid gap-3 sm:grid-cols-2">{goals.map(({ id, title, text, icon: Icon }) => <button key={id} type="button" onClick={() => setGoal(id)} className={`rounded-2xl border p-4 text-left transition-all hover:border-primary hover:shadow-soft ${goal === id ? "border-primary bg-accent shadow-soft" : "border-border bg-card"}`}><div className="flex items-start gap-3"><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${goal === id ? "bg-primary text-primary-foreground" : "bg-muted"}`}><Icon className="h-4 w-4" /></div><div><div className="font-semibold">{title}</div><div className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</div></div></div></button>)}</div><div className="mt-7 flex justify-between"><Button variant="ghost" onClick={() => setStep(2)}><ArrowLeft className="mr-1.5 h-4 w-4" />Atrás</Button><Button onClick={() => setStep(4)} size="lg">Continuar <ArrowRight className="ml-1.5 h-4 w-4" /></Button></div></div>}

          {step === 4 && <div className="animate-fade-in-up text-center"><span className="text-xs font-semibold uppercase tracking-wider text-primary">Paso 4 de 4</span><div className="mx-auto mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10"><CheckCircle2 className="h-7 w-7 text-primary" /></div><h1 className="mt-4 text-2xl font-bold sm:text-3xl">Tu espacio está listo para comenzar.</h1><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">Crearemos <strong className="text-foreground">{name}</strong> en Nüva One y te llevaremos directamente a tu dashboard.</p><div className="mx-auto mt-6 max-w-sm rounded-2xl border bg-muted/30 p-4 text-left"><div className="text-xs text-muted-foreground">Tu configuración</div><div className="mt-2 font-medium">{name}</div><div className="mt-1 text-xs text-muted-foreground">{industry === "other" ? "Otro" : industry} · {size === "solo" ? "Solo yo" : `${size} personas`}</div><div className="mt-2 text-xs text-primary">Foco inicial: {goals.find((item) => item.id === goal)?.title}</div></div><div className="mt-7 flex justify-between"><Button variant="ghost" onClick={() => setStep(3)}><ArrowLeft className="mr-1.5 h-4 w-4" />Atrás</Button><Button onClick={finish} disabled={loading} size="lg" className="shadow-elegant">{loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Preparar mi Nüva One <ArrowRight className="ml-1.5 h-4 w-4" /></Button></div></div>}
        </div>
        <div className="border-t px-6 py-4 text-center text-xs text-muted-foreground">Configuración gratuita · Puedes cambiar estos datos después</div>
      </Card>
    </div>
  );
}
