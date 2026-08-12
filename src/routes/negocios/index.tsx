import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/negocios/")({
  head: () => ({
    meta: [
      { title: "Directorio de negocios PyME — Nüva One" },
      {
        name: "description",
        content:
          "Directorio público de negocios chilenos que usan Nüva One para gestionar ventas, inventario y finanzas.",
      },
    ],
  }),
  component: DirectoryIndex,
});

type PublicBusiness = {
  id: string;
  name: string;
  industry: string;
  public_slug: string;
  public_description: string | null;
};

function DirectoryIndex() {
  const { data: businesses, isLoading } = useQuery({
    queryKey: ["businesses_public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses_public")
        .select("id, name, industry, public_slug, public_description")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as PublicBusiness[];
    },
  });

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 glass border-b border-border/40">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight">Nüva One</span>
          </Link>
          <Link to="/foro">
            <Button variant="ghost" size="sm">
              Ir al foro
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Directorio de negocios</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Negocios chilenos que usan Nüva One y decidieron hacer público su perfil. Actívalo tú
          también desde Configuración → Perfil público.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}
          {!isLoading && businesses?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Todavía no hay negocios con perfil público. ¡Sé el primero!
            </p>
          )}
          {businesses?.map((b) => (
            <div key={b.id} className="rounded-xl border bg-card p-5 shadow-soft">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {b.industry}
              </div>
              <h2 className="mt-1 text-lg font-semibold">{b.name}</h2>
              {b.public_description && (
                <p className="mt-2 text-sm text-muted-foreground">{b.public_description}</p>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
