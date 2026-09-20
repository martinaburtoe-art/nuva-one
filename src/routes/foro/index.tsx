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
import { Sparkles, MessageSquare, Plus, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/foro/")({
  head: () => ({
    meta: [
      {
        title: "Foro para PyMEs en Chile | Ventas, Inventario, Finanzas y Gestión — Nüva One",
      },
      {
        name: "description",
        content:
          "Foro para dueños y equipos de PyMEs en Chile. Aprende sobre gestión empresarial, ventas, inventario, flujo de caja, costos, compras, marketing, tecnología e IA para negocios.",
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

const SEO_TOPICS = [
  {
    title: "Cómo ordenar las ventas de una pyme",
    text: "Conversaciones sobre ventas, clientes, cotizaciones, seguimiento comercial y CRM para pequeñas y medianas empresas.",
    category: "ventas",
  },
  {
    title: "Control de inventario y stock",
    text: "Ideas para reducir quiebres de stock, ordenar productos, controlar existencias y conectar inventario con las ventas.",
    category: "operaciones",
  },
  {
    title: "Flujo de caja y finanzas para pymes",
    text: "Preguntas prácticas sobre caja, ingresos, egresos, costos, márgenes, compras y decisiones financieras del negocio.",
    category: "finanzas",
  },
  {
    title: "Cómo gestionar una pyme sin depender de Excel",
    text: "Experiencias sobre digitalización, automatización y sistemas de gestión empresarial para centralizar la operación.",
    category: "tecnologia",
  },
  {
    title: "Marketing y crecimiento de negocios",
    text: "Estrategias para atraer clientes, mejorar la presencia digital, convertir oportunidades y hacer crecer una pyme.",
    category: "marketing",
  },
  {
    title: "IA para negocios y gestión empresarial",
    text: "Casos de uso de inteligencia artificial para analizar información, detectar oportunidades y tomar mejores decisiones.",
    category: "tecnologia",
  },
] as const;

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

      <main>
        <section className="relative isolate min-h-[min(720px,82vh)] overflow-hidden bg-[#080809] text-white" aria-labelledby="video-comunidad">
          <video
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1800ms] ease-out motion-safe:hover:scale-[1.015]"
            src="/foro-community/Data_pulses_traveling_network_di…_20260920193246.mp4"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080809]/90 via-[#080809]/55 to-[#080809]/25" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080809] via-transparent to-[#080809]/20" />
          <div className="relative z-10 mx-auto flex min-h-[min(720px,82vh)] max-w-7xl items-end px-6 pb-14 pt-32 md:px-10 md:pb-20">
            <div className="max-w-4xl">
              <Badge variant="outline" className="border-white/25 bg-white/10 text-white backdrop-blur">
                COMUNIDAD NÜVA ONE · PYME · CHILE
              </Badge>
              <h1
                id="video-comunidad"
                className="mt-5 max-w-4xl text-5xl font-semibold leading-[.94] tracking-[-.045em] sm:text-7xl lg:text-[clamp(4.5rem,7vw,7.5rem)]"
              >
                Un lugar donde las preguntas <span className="text-[#E6C687]">se convierten en conocimiento.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
                Comparte experiencias y encuentra respuestas sobre ventas, inventario, finanzas,
                compras, marketing, tecnología e inteligencia artificial para PyMEs chilenas.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                {["VENTAS", "INVENTARIO", "FINANZAS", "COMPRAS", "MARKETING", "IA"].map((x) => (
                  <span key={x} className="rounded-full border border-white/15 bg-black/25 px-3 py-1.5 text-[10px] font-bold tracking-[.16em] text-white/75 backdrop-blur">
                    {x}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-6 py-10 sm:py-14">
        <section className="mt-10 rounded-2xl border bg-card/70 p-6 shadow-soft" aria-labelledby="recursos-pyme">
          <div className="max-w-3xl">
            <h2 id="recursos-pyme" className="text-xl font-semibold">
              Recursos para administrar y hacer crecer tu pyme
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Las dudas reales de una empresa suelen estar conectadas: una venta afecta el stock,
              una compra afecta la caja y los costos, y toda esa información ayuda a decidir. Por
              eso este foro reúne conocimiento sobre <strong>gestión empresarial para pymes</strong>,
              software de gestión, digitalización, operaciones y crecimiento en un mismo lugar.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SEO_TOPICS.map((topic) => (
              <button
                key={topic.title}
                type="button"
                onClick={() => setCategory(topic.category)}
                className="group rounded-xl border bg-background/60 p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <h3 className="text-sm font-semibold group-hover:text-primary">{topic.title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{topic.text}</p>
                <span className="mt-3 inline-flex items-center text-xs font-medium text-primary">
                  Ver conversaciones <ArrowRight className="ml-1 h-3 w-3" />
                </span>
              </button>
            ))}
          </div>
        </section>

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

        <section id="conversaciones" className="mt-8 scroll-mt-24" aria-labelledby="conversaciones-title">
          <h2 id="conversaciones-title" className="sr-only">Conversaciones de la comunidad</h2>
          <div className="space-y-3">
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
        </section>

        <section className="mt-12 border-t pt-8" aria-labelledby="que-resuelve">
          <h2 id="que-resuelve" className="text-xl font-semibold">
            Problemas habituales que puedes resolver con una gestión conectada
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Si tu negocio lleva ventas, compras, inventario, gastos y clientes en herramientas
            separadas, es fácil perder tiempo buscando información o tomar decisiones con datos
            desactualizados. Nüva One está orientado a centralizar la operación de la pyme para
            tener una visión más clara del negocio y convertir los datos en acciones.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {[
              "software para pymes en Chile",
              "sistema de gestión para pymes",
              "ERP para pymes Chile",
              "control de inventario",
              "gestión de ventas",
              "flujo de caja",
              "control de gastos",
              "gestión de compras",
              "CRM para pymes",
              "dashboard empresarial",
              "automatización de negocios",
              "IA para empresas",
            ].map((keyword) => (
              <span key={keyword} className="rounded-full border bg-muted/40 px-3 py-1.5">
                {keyword}
              </span>
            ))}
          </div>
        </section>
        </div>
      </main>
    </div>
  );
}
