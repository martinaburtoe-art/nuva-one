import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Landmark,
  RefreshCw,
  Scale,
  ShieldAlert,
  Sparkles,
  Target,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type RadarType = "Oportunidad" | "Atención" | "Información";
type Impact = "Alto" | "Medio" | "Bajo";

type NewsItem = {
  title: string;
  link: string;
  pubDate?: string;
  source: string;
  category: string;
  summary?: string;
  type: RadarType;
  impact: Impact;
  relevance: number;
};

type Feed = { url: string; source: string; category: string };

const FEEDS: Feed[] = [
  { url: "https://www.sii.cl/rss/noticias.xml", source: "SII", category: "Tributario" },
  { url: "https://www.sercotec.cl/feed/", source: "Sercotec", category: "Fondos y apoyo" },
];

const FALLBACK: NewsItem[] = [
  {
    title: "Sercotec: nuevas convocatorias y programas de apoyo para pymes",
    link: "https://www.sercotec.cl/noticias/",
    source: "Sercotec",
    category: "Fondos y apoyo",
    summary: "Revisa convocatorias, subsidios, capacitaciones y programas disponibles para micro y pequeñas empresas.",
    type: "Oportunidad",
    impact: "Alto",
    relevance: 94,
  },
  {
    title: "SII: novedades tributarias y obligaciones para contribuyentes",
    link: "https://www.sii.cl/noticias/",
    source: "SII",
    category: "Tributario",
    summary: "Consulta novedades, instrucciones y comunicaciones oficiales del Servicio de Impuestos Internos.",
    type: "Atención",
    impact: "Alto",
    relevance: 92,
  },
  {
    title: "Corfo: oportunidades para innovación, digitalización y crecimiento",
    link: "https://www.corfo.cl/sites/cpp/homecorfo",
    source: "Corfo",
    category: "Financiamiento e innovación",
    summary: "Explora instrumentos y programas para innovación, productividad y transformación empresarial.",
    type: "Oportunidad",
    impact: "Medio",
    relevance: 89,
  },
];

const OPPORTUNITY_WORDS = [
  "convocatoria",
  "fondo",
  "subsidio",
  "capital semilla",
  "capital abeja",
  "postul",
  "financiamiento",
  "programa",
  "beneficio",
  "innovación",
  "digitalización",
  "concurso",
  "emprend",
];

const ATTENTION_WORDS = [
  "ley",
  "obligación",
  "tribut",
  "iva",
  "plazo",
  "vencimiento",
  "resolución",
  "normativa",
  "fiscalización",
  "declaración",
  "sii",
  "cotización",
  "laboral",
];

function cleanSummary(value: unknown) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 260);
}

function calculateRelevance(title: string, source: string, pubDate?: string) {
  const text = `${title} ${source}`.toLowerCase();
  const opportunity = OPPORTUNITY_WORDS.reduce((score, word) => score + (text.includes(word) ? 9 : 0), 0);
  const attention = ATTENTION_WORDS.reduce((score, word) => score + (text.includes(word) ? 10 : 0), 0);
  const ageHours = pubDate ? Math.max(0, (Date.now() - new Date(pubDate).getTime()) / 3_600_000) : 72;
  const freshness = ageHours <= 24 ? 8 : ageHours <= 72 ? 4 : 0;
  const signal = Math.max(opportunity, attention);

  if (opportunity >= attention && opportunity >= 18) {
    return { type: "Oportunidad" as RadarType, impact: opportunity >= 36 ? "Alto" as Impact : "Medio" as Impact, relevance: Math.min(99, 68 + opportunity + freshness) };
  }
  if (attention >= 18) {
    return { type: "Atención" as RadarType, impact: attention >= 30 ? "Alto" as Impact : "Medio" as Impact, relevance: Math.min(99, 68 + attention + freshness) };
  }
  return { type: "Información" as RadarType, impact: signal >= 10 ? "Medio" as Impact : "Bajo" as Impact, relevance: Math.min(90, 62 + signal + freshness) };
}

function normalizeItem(feed: Feed, item: { title?: string; link?: string; pubDate?: string; description?: string }): NewsItem | null {
  if (!item.title || !item.link) return null;
  const signal = calculateRelevance(item.title, feed.source, item.pubDate);
  return {
    title: item.title,
    link: item.link,
    pubDate: item.pubDate,
    source: feed.source,
    category: feed.category,
    summary: cleanSummary(item.description),
    ...signal,
  };
}

function impactClass(impact: Impact) {
  if (impact === "Alto") return "text-destructive";
  if (impact === "Medio") return "text-amber-600 dark:text-amber-400";
  return "text-muted-foreground";
}

export function PymeNewsHub() {
  const [items, setItems] = useState<NewsItem[]>(FALLBACK);
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [filter, setFilter] = useState("Todas");
  const [onlyPriority, setOnlyPriority] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLastError(null);

    const collected: NewsItem[] = [];
    let successfulFeeds = 0;

    await Promise.all(
      FEEDS.map(async (feed) => {
        try {
          const endpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
          const response = await fetch(endpoint, { cache: "no-store" });
          if (!response.ok) return;
          const data = await response.json();
          successfulFeeds += 1;
          (data.items ?? []).slice(0, 10).forEach((item: { title?: string; link?: string; pubDate?: string; description?: string }) => {
            const normalized = normalizeItem(feed, item);
            if (normalized) collected.push(normalized);
          });
        } catch {
          // A failed public feed must not break the dashboard.
        }
      }),
    );

    const unique = Array.from(new Map(collected.map((item) => [item.link, item])).values());

    if (unique.length) {
      setItems(
        unique
          .sort((a, b) => b.relevance - a.relevance || new Date(b.pubDate ?? 0).getTime() - new Date(a.pubDate ?? 0).getTime())
          .slice(0, 18),
      );
    } else if (successfulFeeds === 0) {
      setLastError("Las fuentes externas no respondieron. Se muestran referencias de respaldo.");
    }

    setUpdatedAt(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [load]);

  const categories = useMemo(
    () => ["Todas", ...Array.from(new Set(items.map((item) => item.category)))],
    [items],
  );

  const priorityItems = useMemo(() => items.filter((item) => item.relevance >= 85), [items]);
  const visible = useMemo(() => {
    return items.filter((item) => {
      const categoryMatch = filter === "Todas" || item.category === filter;
      const priorityMatch = !onlyPriority || item.relevance >= 85;
      return categoryMatch && priorityMatch;
    });
  }, [filter, items, onlyPriority]);

  const priority = items[0];
  const opportunityCount = items.filter((item) => item.type === "Oportunidad").length;
  const attentionCount = items.filter((item) => item.type === "Atención").length;
  const highImpactCount = items.filter((item) => item.impact === "Alto").length;

  return (
    <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.05] via-background to-background">
      <div className="border-b p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Nüva PYME Radar</p>
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <Sparkles className="h-3 w-3" /> Inteligencia externa
                </Badge>
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Clock3 className="h-3 w-3" /> 30 min
                </Badge>
              </div>
              <h2 className="mt-1 text-lg font-semibold">Oportunidades y riesgos que pueden mover tu negocio</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Nüva monitorea fuentes públicas y prioriza fondos, cambios tributarios, normativa y programas relevantes para PYMEs chilenas.
              </p>
            </div>
          </div>

          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>

        {lastError && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <span>{lastError}</span>
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-background/70 p-3">
            <p className="text-[11px] text-muted-foreground">Señal principal</p>
            <p className="mt-1 line-clamp-2 text-sm font-semibold">{priority?.title ?? "Sin novedades"}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Relevancia {priority?.relevance ?? 0}/100</p>
          </div>
          <div className="rounded-xl border bg-background/70 p-3">
            <p className="text-[11px] text-muted-foreground">Oportunidades</p>
            <p className="mt-1 text-xl font-bold">{opportunityCount}</p>
            <p className="text-[11px] text-muted-foreground">Fondos, convocatorias y programas</p>
          </div>
          <div className="rounded-xl border bg-background/70 p-3">
            <p className="text-[11px] text-muted-foreground">Atención</p>
            <p className="mt-1 text-xl font-bold">{attentionCount}</p>
            <p className="text-[11px] text-muted-foreground">Cambios y obligaciones</p>
          </div>
          <div className="rounded-xl border bg-background/70 p-3">
            <p className="text-[11px] text-muted-foreground">Impacto alto</p>
            <p className="mt-1 text-xl font-bold">{highImpactCount}</p>
            <p className="text-[11px] text-muted-foreground">Señales para revisar primero</p>
          </div>
        </div>

        {priority && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/15 bg-primary/[0.04] p-3">
            <div className="flex min-w-0 items-center gap-2">
              <Target className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">Priority Signal</p>
                <p className="truncate text-sm font-medium">{priority.title}</p>
              </div>
            </div>
            <a href={priority.link} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center text-xs font-semibold text-primary">
              Revisar fuente <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button key={category} size="sm" variant={filter === category ? "default" : "outline"} onClick={() => setFilter(category)}>
              {category}
            </Button>
          ))}
          <Button size="sm" variant={onlyPriority ? "default" : "outline"} onClick={() => setOnlyPriority((value) => !value)}>
            <Target className="mr-2 h-3.5 w-3.5" /> Solo prioritarias ({priorityItems.length})
          </Button>
        </div>
      </div>

      <div className="grid gap-3 p-5 md:grid-cols-2 md:p-6 lg:grid-cols-3">
        {visible.map((item, index) => {
          const SourceIcon = item.source === "SII" ? Scale : item.source === "Corfo" ? Landmark : WalletCards;
          const TypeIcon = item.type === "Oportunidad" ? CheckCircle2 : item.type === "Atención" ? ShieldAlert : Sparkles;
          return (
            <article key={`${item.link}-${index}`} className="group rounded-xl border bg-background/75 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="gap-1">
                  <SourceIcon className="h-3 w-3" />
                  {item.source}
                </Badge>
                <Badge variant={item.type === "Atención" ? "destructive" : "secondary"} className="gap-1 text-[10px]">
                  <TypeIcon className="h-3 w-3" />
                  {item.type}
                </Badge>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground">{item.category}</span>
                <span className={`text-[10px] font-semibold ${impactClass(item.impact)}`}>Impacto {item.impact}</span>
              </div>

              <h3 className="mt-2 line-clamp-3 text-sm font-semibold leading-5">{item.title}</h3>
              {item.summary && <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">{item.summary}</p>}

              <div className="mt-4 flex items-center justify-between gap-2 border-t pt-3">
                <div>
                  <p className="text-[10px] text-muted-foreground">Relevancia</p>
                  <p className="text-xs font-bold text-primary">{item.relevance}/100</p>
                </div>
                <a href={item.link} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs font-semibold text-primary">
                  Fuente oficial <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </div>
            </article>
          );
        })}
      </div>

      {visible.length === 0 && (
        <div className="px-6 pb-6 text-center text-sm text-muted-foreground">No hay señales que coincidan con los filtros actuales.</div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-5 py-3 text-[11px] text-muted-foreground md:px-6">
        <span>
          {updatedAt ? `Última actualización ${updatedAt.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}` : "Actualizando fuentes..."} · actualización automática cada 30 min
        </span>
        <span>Fuentes públicas · verificar siempre condiciones y plazos en la fuente original.</span>
      </div>
    </Card>
  );
}
