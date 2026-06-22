import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusinesses } from "@/lib/use-business";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, Building2, LogOut } from "lucide-react";

export const Route = createFileRoute("/select-business")({
  head: () => ({ meta: [{ title: "Selecciona tu negocio — NovaFlow" }] }),
  component: SelectBusiness,
});

function SelectBusiness() {
  const navigate = useNavigate();
  const { data: businesses, isLoading } = useBusinesses();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate({ to: "/auth" });
    });
  }, [navigate]);

  useEffect(() => {
    if (!isLoading && businesses && businesses.length === 0) {
      navigate({ to: "/onboarding" });
    }
    if (!isLoading && businesses && businesses.length === 1) {
      localStorage.setItem("novaflow.active_business_id", businesses[0].id);
      navigate({ to: "/dashboard" });
    }
  }, [businesses, isLoading, navigate]);

  function select(id: string) {
    localStorage.setItem("novaflow.active_business_id", id);
    navigate({ to: "/dashboard" });
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight">NovaFlow</span>
          </Link>
          <Button variant="ghost" size="sm" onClick={logout}><LogOut className="mr-1.5 h-4 w-4" />Salir</Button>
        </div>

        <div className="mt-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Selecciona tu negocio</h1>
          <p className="mt-3 text-muted-foreground">Elige el negocio con el que quieres trabajar.</p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {businesses?.map((b) => (
            <Card
              key={b.id}
              onClick={() => select(b.id)}
              className="group cursor-pointer p-6 transition-all hover:-translate-y-1 hover:border-primary hover:shadow-elegant"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-semibold">{b.name}</h3>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{b.industry}</p>
            </Card>
          ))}
          <Link to="/onboarding">
            <Card className="flex h-full cursor-pointer items-center justify-center border-dashed p-6 transition-all hover:-translate-y-1 hover:border-primary hover:bg-accent">
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/40">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="mt-4 text-sm font-medium">Crear nuevo negocio</p>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
