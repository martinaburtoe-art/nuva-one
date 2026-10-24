import { createFileRoute } from "@tanstack/react-router";
import type { Database } from "@/integrations/supabase/types";
import { assertPlatformOwner, platformOwnerErrorResponse } from "@/lib/platform-owner.server";

type ForumTopicModerationPatch = Partial<
  Pick<
    Database["public"]["Tables"]["forum_topics"]["Row"],
    "is_pinned" | "status" | "updated_by" | "updated_at" | "title" | "body"
  >
>;

/**
 * Moderación del foro público desde la Owner Console (migración 20261023190000).
 * La RLS "Platform owner moderates forum_topics" es el control efectivo en BD;
 * esta ruta valida el claim en servidor, aplica la acción con el cliente admin
 * y registra cada acción en owner_admin_actions (bitácora append-only).
 *
 * Operaciones: list · pin/unpin · publish/unlist/draft · update (título/cuerpo).
 * La eliminación de contenido de usuarios NO se ofrece deliberadamente:
 * el diseño original (borrar y republicar) queda para el dueño del negocio;
 * la plataforma solo fija, retira del listado o corrige.
 */
export const Route = createFileRoute("/api/owner/forum-admin")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await assertPlatformOwner(request);
        if (!auth.ok) return platformOwnerErrorResponse(auth);

        const payload = (await request.json().catch(() => null)) as {
          op?: string;
          topic_id?: string;
          title?: string;
          body?: string;
          reason?: string;
        } | null;
        if (!payload?.op) return bad("Falta la operación");

        if (payload.op === "list") {
          const { data, error } = await auth.admin
            .from("forum_topics")
            .select("id,title,body,category,business_name,reply_count,views,is_pinned,status,created_at,updated_at")
            .order("is_pinned", { ascending: false })
            .order("updated_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false })
            .limit(200);
          if (error) return bad("No se pudo listar el foro");
          return ok({ topics: data ?? [] });
        }

        if (!payload.topic_id) return bad("Falta topic_id");

        const patch: ForumTopicModerationPatch = {
          updated_by: auth.userId,
          updated_at: new Date().toISOString(),
        };
        let auditedAction = `forum_${payload.op}`;

        switch (payload.op) {
          case "pin":
            patch.is_pinned = true;
            break;
          case "unpin":
            patch.is_pinned = false;
            break;
          case "unlist":
            patch.status = "unlisted";
            break;
          case "publish":
            patch.status = "published";
            break;
          case "draft":
            patch.status = "draft";
            break;
          case "update": {
            const title = payload.title?.trim() ?? "";
            const body = payload.body?.trim() ?? "";
            if (title.length < 5 || title.length > 150) return bad("El título debe tener entre 5 y 150 caracteres");
            if (body.length < 10 || body.length > 5000) return bad("El cuerpo debe tener entre 10 y 5000 caracteres");
            patch.title = title;
            patch.body = body;
            auditedAction = "forum_update_content";
            break;
          }
          default:
            return bad("Operación no soportada");
        }

        const { data: updated, error: updateError } = await auth.admin
          .from("forum_topics")
          .update(patch)
          .eq("id", payload.topic_id)
          .select("id,title,is_pinned,status,updated_at")
          .single();
        if (updateError || !updated) return bad("El tema no existe o no se pudo actualizar");

        await auth.admin.from("owner_admin_actions").insert({
          actor_user_id: auth.userId,
          action: auditedAction,
          target_type: "forum_topic",
          target_id: payload.topic_id,
          details: {
            op: payload.op,
            reason: payload.reason ?? null,
            changed_fields: Object.keys(patch).filter((k) => k !== "updated_by" && k !== "updated_at"),
          },
        });

        return ok({ topic: updated });
      },
    },
  },
});

function ok(data: unknown) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "private, no-store" },
  });
}
function bad(error: string) {
  return new Response(JSON.stringify({ error }), {
    status: 400,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
