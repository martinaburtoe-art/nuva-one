import { createFileRoute } from "@tanstack/react-router";

// Sitemap dinámico: combina rutas estáticas con contenido real (temas del
// foro y negocios con perfil público activo) para que Google indexe todo
// el contenido generado por usuarios, no solo la landing.
//
// Cacheado 1h vía header — el foro cambia seguido pero no necesita
// regenerarse en cada crawl.

const BASE_URL = "https://nuvaone.cl";

const STATIC_PATHS = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/foro", priority: "0.9", changefreq: "hourly" },
  { path: "/negocios", priority: "0.8", changefreq: "daily" },
];

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      default:
        return "&quot;";
    }
  });
}

function urlEntry(loc: string, lastmod?: string, priority = "0.6", changefreq = "weekly") {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const [topicsRes, businessesRes] = await Promise.all([
          supabaseAdmin
            .from("forum_topics")
            .select("id, created_at")
            .order("created_at", { ascending: false })
            .limit(5000),
          supabaseAdmin.from("businesses_public").select("public_slug, created_at").limit(5000),
        ]);

        const entries: string[] = [
          ...STATIC_PATHS.map((p) =>
            urlEntry(`${BASE_URL}${p.path}`, undefined, p.priority, p.changefreq),
          ),
          ...(topicsRes.data ?? []).map((t) =>
            urlEntry(
              `${BASE_URL}/foro/${t.id}`,
              new Date(t.created_at).toISOString(),
              "0.7",
              "weekly",
            ),
          ),
          ...(businessesRes.data ?? []).map((b) =>
            urlEntry(
              `${BASE_URL}/negocios/${b.public_slug}`,
              b.created_at ? new Date(b.created_at).toISOString() : undefined,
              "0.6",
              "weekly",
            ),
          ),
        ];

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>`;

        return new Response(xml, {
          status: 200,
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600, s-maxage=3600",
          },
        });
      },
    },
  },
});
