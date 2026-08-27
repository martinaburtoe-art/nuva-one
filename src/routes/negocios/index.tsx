import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Building2, MapPin } from "lucide-react";

export const Route = createFileRoute("/negocios/")({
  head: () => ({
    meta: [
      { title: "Red de negocios y contactos PyME — Nüva One" },
      {
        name: "description",
        content:
          "Conecta con negocios chilenos que usan Nüva One: fotos, redes sociales y contacto directo. Publicita tu PyME como en LinkedIn.",
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
  logo_url: string | null;
  public_photos: string[] | null;
  comuna: string | null;
};

function useDirectory() {
  return useQuery({
    queryKey: ["businesses_public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses_public")
        .select(
          "id, name, industry, public_slug, public_description, logo_url, public_photos, comuna",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as PublicBusiness[];
    },
  });
}

function DirectoryIndex() {
  const { data: businesses, isLoading } = useDirectory();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 glass border-b border-border/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
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

      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Red de negocios y contactos</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Negocios chilenos que usan Nüva One y activaron su perfil público: fotos, redes sociales y
          contacto directo. Como un LinkedIn de PyMEs. El perfil público y la presencia en esta red son
          gratuitos para toda cuenta de Nüva One.{" "}
          <Link to="/settings" className="underline">
            Crea o gestiona tu perfil público aquí
          </Link>
          .
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl border bg-card" />
            ))}
          {!isLoading && businesses?.length === 0 && (
            <p className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
              Todavía no hay negocios con perfil público. ¡Sé el primero!
            </p>
          )}
          {businesses?.map((b) => {
            const cover = b.public_photos?.[0];
            return (
              <Link
                key={b.id}
                to="/negocios/$slug"
                params={{ slug: b.public_slug }}
                className="group overflow-hidden rounded-xl border bg-card shadow-soft transition-shadow hover:shadow-elegant"
              >
                <div className="aspect-[16/9] w-full overflow-hidden bg-secondary/40">
                  {cover ? (
                    <img
                      src={cover}
                      alt={b.name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Building2 className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2">
                    {b.logo_url ? (
                      <img
                        src={b.logo_url}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded-full border object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-xs font-semibold text-primary-foreground">
                        {b.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold group-hover:text-primary">
                        {b.name}
                      </h2>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {b.industry}
                        </Badge>
                        {b.comuna && (
                          <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                            <MapPin className="h-3 w-3" /> {b.comuna}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {b.public_description && (
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                      {b.public_description}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
