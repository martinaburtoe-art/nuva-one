import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Sparkles, Mail, Lock, Phone, Loader2 } from "lucide-react";

const searchSchema = z.object({
  mode: z.enum(["login", "signup"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Iniciar sesión — NovaFlow" }] }),
  component: AuthPage,
});

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"login" | "signup">(search.mode ?? "login");
  const [loading, setLoading] = useState(false);
  const [phoneStep, setPhoneStep] = useState<"input" | "otp">("input");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: search.redirect ?? "/select-business" });
    });
  }, [navigate, search.redirect]);

  async function handleEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const full_name = String(fd.get("full_name") ?? "").trim();
    setLoading(true);
    try {
      if (tab === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/onboarding`,
            data: { full_name },
          },
        });
        if (error) throw error;
        toast.success("¡Cuenta creada! Revisa tu correo si necesitas verificar.");
        navigate({ to: "/onboarding" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenido de vuelta");
        navigate({ to: "/select-business" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Error de autenticación");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/auth",
    });
    if (result.error) {
      toast.error("No se pudo iniciar sesión con Google");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/select-business" });
  }

  async function handlePhone(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      if (phoneStep === "input") {
        const { error } = await supabase.auth.signInWithOtp({ phone });
        if (error) throw error;
        toast.success("Código enviado");
        setPhoneStep("otp");
      } else {
        const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
        if (error) throw error;
        toast.success("Bienvenido");
        navigate({ to: "/onboarding" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Error con SMS");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Visual */}
      <div className="relative hidden overflow-hidden bg-gradient-primary lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-gradient-mesh opacity-50" />
        <Link to="/" className="relative flex items-center gap-2 text-primary-foreground">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-foreground/10 backdrop-blur">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-semibold tracking-tight">NovaFlow</span>
        </Link>
        <div className="relative max-w-md text-primary-foreground">
          <h2 className="text-3xl font-bold leading-tight">Tu negocio, todo conectado.</h2>
          <p className="mt-4 text-primary-foreground/80">
            Únete a miles de PYMEs que ya operan más rápido y mejor con NovaFlow.
          </p>
        </div>
        <div className="relative text-xs text-primary-foreground/60">© {new Date().getFullYear()} NovaFlow</div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight">NovaFlow</span>
          </Link>

          <h1 className="text-3xl font-bold tracking-tight">
            {tab === "login" ? "Bienvenido de vuelta" : "Crea tu cuenta"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {tab === "login" ? "Inicia sesión para continuar" : "Empieza gratis en menos de un minuto"}
          </p>

          <div className="mt-8 space-y-3">
            <Button onClick={handleGoogle} variant="outline" className="w-full" disabled={loading}>
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continuar con Google
            </Button>
          </div>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">o con</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="signup">Registrarse</TabsTrigger>
            </TabsList>

            <TabsContent value={tab} className="mt-6">
              <Tabs defaultValue="email">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="email"><Mail className="mr-1.5 h-3.5 w-3.5" />Email</TabsTrigger>
                  <TabsTrigger value="phone"><Phone className="mr-1.5 h-3.5 w-3.5" />Teléfono</TabsTrigger>
                </TabsList>

                <TabsContent value="email" className="mt-4 space-y-4">
                  <form onSubmit={handleEmail} className="space-y-4">
                    {tab === "signup" && (
                      <div>
                        <Label htmlFor="full_name">Nombre completo</Label>
                        <Input id="full_name" name="full_name" required className="mt-1.5" />
                      </div>
                    )}
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" required className="mt-1.5" />
                    </div>
                    <div>
                      <Label htmlFor="password">Contraseña</Label>
                      <Input id="password" name="password" type="password" required minLength={8} className="mt-1.5" />
                      <p className="mt-1 text-xs text-muted-foreground">Mínimo 8 caracteres</p>
                    </div>
                    <Button type="submit" className="w-full shadow-elegant" disabled={loading}>
                      {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                      {tab === "login" ? "Entrar" : "Crear cuenta"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="phone" className="mt-4">
                  <form onSubmit={handlePhone} className="space-y-4">
                    {phoneStep === "input" ? (
                      <>
                        <div>
                          <Label htmlFor="phone">Número de teléfono</Label>
                          <Input id="phone" type="tel" placeholder="+56 9 1234 5678" value={phone} onChange={(e) => setPhone(e.target.value)} required className="mt-1.5" />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                          Enviar código
                        </Button>
                      </>
                    ) : (
                      <>
                        <div>
                          <Label htmlFor="otp">Código recibido</Label>
                          <Input id="otp" inputMode="numeric" value={otp} onChange={(e) => setOtp(e.target.value)} required className="mt-1.5" />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                          Verificar
                        </Button>
                        <button type="button" onClick={() => setPhoneStep("input")} className="text-xs text-muted-foreground hover:underline">
                          Cambiar número
                        </button>
                      </>
                    )}
                  </form>
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Al continuar aceptas nuestros{" "}
            <Link to="/terms" className="underline">Términos</Link> y{" "}
            <Link to="/privacy" className="underline">Política de Privacidad</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
