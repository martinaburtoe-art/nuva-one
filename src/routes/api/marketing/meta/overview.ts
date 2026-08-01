import { createFileRoute } from "@tanstack/react-router";
import { getAuthedMetaIntegration } from "@/lib/marketing-meta-auth.server";

export const Route = createFileRoute("/api/marketing/meta/overview")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const businessId = new URL(request.url).searchParams.get("business_id");
        const result = await getAuthedMetaIntegration(request, businessId);
        if ("error" in result) return result.error;
        const { integration } = result;
        const token = integration.access_token;
        if (!token) return new Response("Sin token", { status: 404 });

        try {
          const [igRes, mediaRes] = await Promise.all([
            integration.ig_user_id
              ? fetch(
                  `https://graph.facebook.com/v21.0/${integration.ig_user_id}?fields=username,followers_count,media_count,profile_picture_url&access_token=${encodeURIComponent(token)}`,
                )
              : Promise.resolve(null),
            integration.ig_user_id
              ? fetch(
                  `https://graph.facebook.com/v21.0/${integration.ig_user_id}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,like_count,comments_count,timestamp&limit=12&access_token=${encodeURIComponent(token)}`,
                )
              : Promise.resolve(null),
          ]);

          const ig = igRes ? await igRes.json() : null;
          const mediaJson = mediaRes ? await mediaRes.json() : null;
          const media = mediaJson?.data ?? [];

          // Comentarios recientes (aprox., sin webhook de "leídos"): sumamos
          // comments_count de los últimos posts.
          const unreadComments = media.reduce(
            (acc: number, m: any) => acc + (m.comments_count || 0),
            0,
          );

          const pageRes = await fetch(
            `https://graph.facebook.com/v21.0/${integration.fb_page_id}?fields=name,fan_count,picture{url}&access_token=${encodeURIComponent(token)}`,
          );
          const page = await pageRes.json();

          return new Response(
            JSON.stringify({
              account_name: integration.account_name,
              fb: { name: page.name, fan_count: page.fan_count, picture: page.picture?.data?.url },
              ig: ig
                ? {
                    username: ig.username,
                    followers_count: ig.followers_count,
                    media_count: ig.media_count,
                    picture: ig.profile_picture_url,
                  }
                : null,
              media,
              unread_comments: unreadComments,
            }),
            { headers: { "Content-Type": "application/json" } },
          );
        } catch {
          return new Response(JSON.stringify({ error: "Error consultando Meta" }), { status: 502 });
        }
      },
    },
  },
});
