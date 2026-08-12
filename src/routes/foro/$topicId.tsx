import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness } from "@/lib/use-business";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/foro/$topicId")({
  component: TopicDetail,
});

type Topic = {
  id: string;
  title: string;
  body: string;
  category: string;
  business_id: string;
  business_name: string;
  business_industry: string | null;
  created_at: string;
};

type Reply = {
  id: string;
  body: string;
  business_id: string;
  business_name: string;
  created_at: string;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TopicDetail() {
  const { topicId } = Route.useParams();
  const navigate = useNavigate();
  const { active } = useActiveBusiness();
  const qc = useQueryClient();
  const [reply, setReply] = useState("");

  const { data: topic, isLoading: loadingTopic } = useQuery({
    queryKey: ["forum_topic", topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_topics")
        .select(
          "id, title, body, category, business_id, business_name, business_industry, created_at",
        )
        .eq("id", topicId)
        .single();
      if (error) throw error;
      supabase.rpc("increment_forum_topic_views", { topic_id: topicId }).then();
      return data as Topic;
    },
  });

  const { data: replies, isLoading: loadingReplies } = useQuery({
    queryKey: ["forum_replies", topicId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_replies")
        .select("id, body, business_id, business_name, created_at")
        .eq("topic_id", topicId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Reply[];
    },
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Debes iniciar sesión para responder.");
      if (!active) throw new Error("Selecciona un negocio primero.");
      const { error } = await supabase.from("forum_replies").insert({
        topic_id: topicId,
        business_id: active.id,
        business_name: active.name,
        author_user_id: userData.user.id,
        body: reply,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["forum_replies", topicId] });
      toast.success("Respuesta publicada");
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo responder"),
  });

  const deleteTopicMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("forum_topics").delete().eq("id", topicId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tema eliminado");
      navigate({ to: "/foro" });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
  });

  const deleteReplyMutation = useMutation({
    mutationFn: async (replyId: string) => {
      const { error } = await supabase.from("forum_replies").delete().eq("id", replyId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["forum_replies", topicId] });
      toast.success("Respuesta eliminada");
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
  });

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 glass border-b border-border/40">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold tracking-tight">Nüva One</span>
          </Link>
          <Link to="/foro">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Volver al foro
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        {loadingTopic && <p className="text-sm text-muted-foreground">Cargando...</p>}

        {topic && (
          <>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-[10px] capitalize">
                {topic.category}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {topic.business_name}
                {topic.business_industry ? ` · ${topic.business_industry}` : ""} ·{" "}
                {fmtDate(topic.created_at)}
              </span>
              {active?.id === topic.business_id && (
                <button
                  onClick={() => {
                    if (confirm("¿Eliminar este tema y todas sus respuestas?")) {
                      deleteTopicMutation.mutate();
                    }
                  }}
                  className="ml-auto flex items-center gap-1 text-xs text-destructive hover:underline"
                >
                  <Trash2 className="h-3 w-3" /> Eliminar
                </button>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{topic.title}</h1>
            <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{topic.body}</p>

            <div className="mt-10 border-t pt-6">
              <h2 className="mb-4 text-sm font-semibold">
                {loadingReplies ? "Cargando respuestas..." : `${replies?.length ?? 0} respuestas`}
              </h2>
              <div className="space-y-4">
                {replies?.map((r) => (
                  <div key={r.id} className="rounded-lg border bg-card p-4 shadow-soft">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {r.business_name} · {fmtDate(r.created_at)}
                      </span>
                      {active?.id === r.business_id && (
                        <button
                          onClick={() => deleteReplyMutation.mutate(r.id)}
                          className="text-xs text-destructive hover:underline"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-sm">{r.body}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-lg border bg-card p-4 shadow-soft">
                <Textarea
                  placeholder="Escribe una respuesta..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                  maxLength={3000}
                />
                <div className="mt-2 flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => replyMutation.mutate()}
                    disabled={replyMutation.isPending || reply.trim().length < 2}
                  >
                    Responder
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
