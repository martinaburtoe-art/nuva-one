import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActiveBusiness } from "@/lib/use-business";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, MessageSquare, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/foro/")({
  head: () => ({
    meta: [
      {
        title: "Foro de negocios PyME — Nüva One",
      },
      {
        name: "description",
        content:
          "Comunidad de dueños de PyMEs en Chile: preguntas y respuestas sobre ventas, marketing, finanzas y gestión de negocio.",
      },
    ],
  }),
  component: ForoIndex,
});

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "ventas", label: "Ventas" },
  { value: "marketing", label: "Marketing" },
  { value: "finanzas", label: "Finanzas" },
  { value: "operaciones", label: "Operaciones" },
  { value: "tecnologia", label: "Tecnología" },
  { value: "legal", label: "Legal" },
] as const;

type Topic = {
  id: string;
  title: string;
  body: string;
  category: string;
  business_name: string;
  business_industry: string | null;
  reply_count: number;
  views: number;
  created_at: string;
};

function useTopics(category: string | "all") {
  return useQuery({
    queryKey: ["forum_topics", category],
    queryFn: async () => {
      let q = supabase
        .from("forum_topics")
        .select(
          "id, title, body, category, business_name, business_industry, reply_count, views, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(50);
      if (category !== "all") q = q.eq("category", category);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Topic[];
    },
  });
}

function NewTopicForm() {
  const { active } = useActiveBusiness();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<string>("general");

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Debes iniciar sesión para publicar.");
      if (!active) throw new Error("Selecciona un negocio primero.");
      const { error } = await supabase.from("forum_topics").insert({
        business_id: active.id,
        business_name: active.name,
        business_industry: active.industry,
        author_user_id: userData.user.id,
        title,
        body,
        category,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Publicado en el foro");
      setTitle("");
      setBody("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["forum_topics"] });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo publicar"),
  });

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="shadow-elegant">
        <Plus className="mr-1.5 h-4 w-4" /> Nuevo tema
      </Button>
    );
  }

  return (
    <div className="w-full rounded-xl border bg-card p-5 shadow-soft">
      <div className="mb-3 text-sm font-semibold">Publicar un tema nuevo</div>
      <div className="space-y-3">
        <Input
          placeholder="Título (ej: ¿Cómo bajar el costo de despacho para envíos regionales?)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={150}
        />
        <Textarea
          placeholder="Cuenta el contexto de tu negocio y qué necesitas saber..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          maxLength={5000}
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || title.trim().length < 5 || body.trim().length < 10}
          >
            Publicar
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Se publica de inmediato y queda visible para cualquier visitante, incluso sin cuenta.
          Puedes borrarlo después si te equivocas.
        </p>
      </div>
    </div>
  );
}

function ForoIndex() {
  const [category, setCategory] = useState<string | "all">("all");
  const { data: topics, isLoading } = useTopics(category);

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
          <Link to="/negocios">
            <Button variant="ghost" size="sm">
              Directorio de negocios
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Foro de negocios PyME</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Preguntas y conversación entre dueños de negocio sobre ventas, marketing, finanzas y
          operación. Abierto para leer sin cuenta — para publicar necesitas una cuenta de Nüva One.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setCategory("all")}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                category === "all"
                  ? "bg-gradient-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Todos
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  category === c.value
                    ? "bg-gradient-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <NewTopicForm />
        </div>

        <div className="mt-8 space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">Cargando temas...</p>}
          {!isLoading && topics?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Todavía no hay temas en esta categoría. ¡Sé el primero en publicar!
            </p>
          )}
          {topics?.map((t) => (
            <Link
              key={t.id}
              to="/foro/$topicId"
              params={{ topicId: t.id }}
              className="block rounded-xl border bg-card p-5 shadow-soft transition-shadow hover:shadow-elegant"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {CATEGORIES.find((c) => c.value === t.category)?.label ?? t.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {t.business_name}
                      {t.business_industry ? ` · ${t.business_industry}` : ""}
                    </span>
                  </div>
                  <h2 className="truncate text-base font-semibold">{t.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.body}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" /> {t.reply_count}
                  </span>
                  <span className="text-xs">{t.views} vistas</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
