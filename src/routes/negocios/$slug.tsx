import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Building2,
  MapPin,
  Mail,
  Phone,
  Globe,
  Instagram,
  Facebook,
  Linkedin,
  MessageCircle,
  ArrowLeft,
} from "lucide-react";

export const Route = createFileRoute("/negocios/$slug")({
  component: BusinessProfile,
});

type PublicBusinessDetail = {
  id: string;
  name: string;
  industry: string;
  public_slug: string;
  public_description: string | null;
  logo_url: string | null;
  public_photos: string[] | null;
  public_social_links: Record<string, string> | null;
  public_contact_email: string | null;
  public_contact_phone: string | null;
  comuna: string | null;
};

function useBusinessProfile(slug: string) {
  return useQuery({
    queryKey: ["business_public_profile", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("businesses_public")
        .select(
          "id, name, industry, public_slug, public_description, logo_url, public_photos, public_social_links, public_contact_email, public_contact_phone, comuna",
        )
        .eq("public_slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as PublicBusinessDetail | null;
    },
  });
}

function whatsappHref(raw: string) {
  const digits = raw.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}`;
}

const SOCIAL_ICONS: Record<string, typeof Instagram> = {
  instagram: Instagram,
  facebook: Facebook,
  linkedin: Linkedin,
};

function BusinessProfile() {
  const { slug } = Route.useParams();
  const { data: business, isLoading } = useBusinessProfile(slug);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 glass border-b border-border/40">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight">Nüva One</span>
          </Link>
          <Link to="/negocios">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Directorio
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        {isLoading && <p className="text-sm text-muted-foreground">Cargando...</p>}

        {!isLoading && !business && (
          <div className="rounded-xl border bg-card p-8 text-center">
            <Building2 className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-3 text-muted-foreground">
              No encontramos este perfil, o su negocio ya no lo tiene activo.
            </p>
            <Link to="/negocios" className="mt-4 inline-block">
              <Button variant="outline" size="sm">
                Volver al directorio
              </Button>
            </Link>
          </div>
        )}

        {business && (
          <>
            <div className="flex flex-wrap items-start gap-4">
              {business.logo_url ? (
                <img
                  src={business.logo_url}
                  alt=""
                  className="h-16 w-16 shrink-0 rounded-full border object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-xl font-semibold text-primary-foreground">
                  {business.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold tracking-tight">{business.name}</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{business.industry}</Badge>
                  {business.comuna && (
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {business.comuna}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {business.public_description && (
              <p className="mt-6 max-w-2xl text-muted-foreground">{business.public_description}</p>
            )}

            {business.public_photos && business.public_photos.length > 0 && (
              <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {business.public_photos.map((url) => (
                  <div key={url} className="aspect-square overflow-hidden rounded-xl border">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-10 rounded-xl border bg-card p-6">
              <h2 className="font-semibold">Contactar</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {business.public_contact_email && (
                  <a href={`mailto:${business.public_contact_email}`}>
                    <Button variant="outline" size="sm">
                      <Mail className="mr-1.5 h-4 w-4" /> Email
                    </Button>
                  </a>
                )}
                {business.public_contact_phone && (
                  <a href={`tel:${business.public_contact_phone.replace(/[^\d+]/g, "")}`}>
                    <Button variant="outline" size="sm">
                      <Phone className="mr-1.5 h-4 w-4" /> Llamar
                    </Button>
                  </a>
                )}
                {business.public_social_links?.whatsapp && (
                  <a
                    href={whatsappHref(business.public_social_links.whatsapp)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button variant="outline" size="sm">
                      <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp
                    </Button>
                  </a>
                )}
                {business.public_social_links?.website && (
                  <a href={business.public_social_links.website} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm">
                      <Globe className="mr-1.5 h-4 w-4" /> Sitio web
                    </Button>
                  </a>
                )}
                {(["instagram", "facebook", "linkedin"] as const).map((key) => {
                  const url = business.public_social_links?.[key];
                  if (!url) return null;
                  const Icon = SOCIAL_ICONS[key];
                  return (
                    <a key={key} href={url} target="_blank" rel="noreferrer">
                      <Button variant="outline" size="sm">
                        <Icon className="mr-1.5 h-4 w-4" />
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </Button>
                    </a>
                  );
                })}
                {!business.public_contact_email &&
                  !business.public_contact_phone &&
                  !business.public_social_links?.whatsapp &&
                  !business.public_social_links?.website &&
                  !business.public_social_links?.instagram &&
                  !business.public_social_links?.facebook &&
                  !business.public_social_links?.linkedin && (
                    <p className="text-sm text-muted-foreground">
                      Este negocio aún no agregó datos de contacto.
                    </p>
                  )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
