import { createFileRoute } from "@tanstack/react-router";
import { getAuthedMetaIntegration } from "@/lib/marketing-meta-auth.server";

export const Route = createFileRoute("/api/marketing/meta/publish")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => ({}));
        const businessId = body.business_id as string | undefined;
        const content = String(body.content || "").trim();
        const imageUrl = body.image_url ? String(body.image_url) : null;
        const platforms: string[] = Array.isArray(body.platforms) ? body.platforms : [];

        const result = await getAuthedMetaIntegration(request, businessId ?? null);
        if ("error" in result) return result.error;
        const { integration } = result;
        const token = integration.access_token;
        if (!token || !content) return new Response("Datos incompletos", { status: 400 });

        const out: Record<string, { ok: boolean; error?: string; id?: string }> = {};

        if (platforms.includes("facebook")) {
          if (!integration.fb_page_id) {
            out.facebook = { ok: false, error: "Sin página de Facebook vinculada" };
          } else {
            try {
              const res = await fetch(
                `https://graph.facebook.com/v21.0/${integration.fb_page_id}/feed`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ message: content, access_token: token }),
                },
              );
              const json = await res.json();
              if (json.id) out.facebook = { ok: true, id: json.id };
              else out.facebook = { ok: false, error: json.error?.message || "Error al publicar" };
            } catch {
              out.facebook = { ok: false, error: "Error de red" };
            }
          }
        }

        if (platforms.includes("instagram")) {
          if (!integration.ig_user_id) {
            out.instagram = { ok: false, error: "Sin cuenta de Instagram vinculada" };
          } else if (!imageUrl) {
            out.instagram = { ok: false, error: "Instagram requiere una imagen (URL pública)" };
          } else {
            try {
              const createRes = await fetch(
                `https://graph.facebook.com/v21.0/${integration.ig_user_id}/media`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ image_url: imageUrl, caption: content, access_token: token }),
                },
              );
              const createJson = await createRes.json();
              if (!createJson.id) {
                out.instagram = { ok: false, error: createJson.error?.message || "Error al crear el post" };
              } else {
                const pubRes = await fetch(
                  `https://graph.facebook.com/v21.0/${integration.ig_user_id}/media_publish`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ creation_id: createJson.id, access_token: token }),
                  },
                );
                const pubJson = await pubRes.json();
                if (pubJson.id) out.instagram = { ok: true, id: pubJson.id };
                else out.instagram = { ok: false, error: pubJson.error?.message || "Error al publicar" };
              }
            } catch {
              out.instagram = { ok: false, error: "Error de red" };
            }
          }
        }

        const allOk = Object.values(out).every((r) => r.ok);
        return new Response(JSON.stringify({ results: out, all_ok: allOk }), {
          status: allOk ? 200 : 207,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
