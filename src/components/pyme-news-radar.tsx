import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  RefreshCw,
  Sparkles,
  Landmark,
  Scale,
  WalletCards,
  BellRing,
  ShieldAlert,
  TrendingUp,
  CalendarClock,
  ArrowUpRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type NewsItem = {
  title: string;
  link: string;
  pubDate?: string;
  source: string;
  category: string;
  summary?: string;
  impact: "Oportunidad" | "Atención" | "Información";
  score: number;
};
const FEEDS = [
  { url: "https://www.sii.cl/rss/noticias.xml", source: "SII", category: "Tributario" },
  { url: "https://www.sercotec.cl/feed/", source: "Sercotec", category: "Fondos y apoyo" },
  {
    url: "https://www.corfo.cl/sites/cpp/sala_prensa",
    source: "Corfo",
    category: "Financiamiento e innovación",
  },
];
const OFFICIAL = {
  SII: "https://www.sii.cl/noticias/",
  Sercotec: "https://www.sercotec.cl/noticias/",
  Corfo: "https://www.corfo.cl/sites/cpp/homecorfo",
};
const FALLBACK: NewsItem[] = [
  {
    title: "Revisa convocatorias y programas de apoyo disponibles para micro y pequeñas empresas",
    link: OFFICIAL.Sercotec,
    source: "Sercotec",
    category: "Fondos y apoyo",
    summary:
      "Consulta convocatorias, subsidios, capacitación y programas antes de iniciar una postulación.",
    impact: "Oportunidad",
    score: 92,
  },
  {
    title: "SII: novedades tributarias, instrucciones y comunicaciones para contribuyentes",
    link: OFFICIAL.SII,
    source: "SII",
    category: "Tributario",
    summary:
      "Mantente al día con cambios, instrucciones y obligaciones que pueden afectar la operación de tu empresa.",
    impact: "Atención",
    score: 88,
  },
  {
    title: "Corfo: instrumentos para innovación, productividad y transformación empresarial",
    link: OFFICIAL.Corfo,
    source: "Corfo",
    category: "Financiamiento e innovación",
    summary:
      "Explora instrumentos públicos relacionados con innovación, productividad y crecimiento.",
    impact: "Oportunidad",
    score: 84,
  },
];
const classify = (title: string, summary: string, category: string) => {
  const text = `${title} ${summary} ${category}`.toLocaleLowerCase("es-CL");
  const opp = [
    "convocatoria",
    "postul",
    "subsidio",
    "fondo",
    "financiamiento",
    "capital semilla",
    "capital abeja",
    "crece",
    "digitaliza",
    "beneficio",
  ].filter((k) => text.includes(k)).length;
  const attention = [
    "ley",
    "obligación",
    "plazo",
    "vencimiento",
    "iva",
    "impuesto",
    "tributari",
    "resolución",
    "normativa",
    "fiscalización",
  ].filter((k) => text.includes(k)).length;
  if (opp >= attention && opp > 0)
    return { impact: "Oportunidad" as const, score: Math.min(99, 70 + opp * 6) };
  if (attention > 0)
    return { impact: "Atención" as const, score: Math.min(99, 68 + attention * 7) };
  return { impact: "Información" as const, score: 55 };
};

export function PymeNewsRadar() {
  const [items, setItems] = useState<NewsItem[]>(FALLBACK);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [filter, setFilter] = useState("Todas");
  const load = async () => {
    setLoading(true);
    const collected: NewsItem[] = [];
    await Promise.all(
      FEEDS.map(async (feed) => {
        try {
          const res = await fetch(
            `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`,
            { cache: "no-store" },
          );
          if (!res.ok) return;
          const data = await res.json();
          (data.items ?? []).slice(0, 8).forEach((item: any) => {
            const title = String(item.title ?? "").trim();
            const summary = String(item.description ?? "")
              .replace(/<[^>]*>/g, "")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 220);
            if (!title || !item.link) return;
            collected.push({
              title,
              link: String(item.link),
              pubDate: item.pubDate,
              source: feed.source,
              category: feed.category,
              summary,
              ...classify(title, summary, feed.category),
            });
          });
        } catch {
          /* fallback */
        }
      }),
    );
    if (collected.length)
      setItems(
        Array.from(new Map(collected.map((x) => [x.link, x])).values())
          .sort(
            (a, b) =>
              b.score - a.score ||
              new Date(b.pubDate ?? 0).getTime() - new Date(a.pubDate ?? 0).getTime(),
          )
          .slice(0, 10),
      );
    setUpdatedAt(new Date());
    setLoading(false);
  };
  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);
  const categories = useMemo(
    () => ["Todas", ...Array.from(new Set(items.map((i) => i.category)))],
    [items],
  );
  const visible = filter === "Todas" ? items : items.filter((i) => i.category === filter);
  const opportunities = items.filter((i) => i.impact === "Oportunidad").length;
  const attention = items.filter((i) => i.impact === "Atención").length;
  const top = items[0];
  return (
    <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.04] via-background to-background">
      <div className="border-b p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Nüva PYME Radar
                </p>
                <Badge variant="secondary" className="gap-1 text-[10px]">
                  <Sparkles className="h-3 w-3" /> Inteligencia automática
                </Badge>
              </div>
              <h2 className="mt-1 text-lg font-semibold">
                Lo que está pasando afuera puede cambiar tu negocio
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Nüva monitorea fuentes oficiales y convierte noticias, convocatorias y cambios
                tributarios en señales accionables para PYMEs chilenas.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Mini
            icon={<TrendingUp className="h-4 w-4" />}
            label="Oportunidades detectadas"
            value={String(opportunities)}
          />
          <Mini
            icon={<ShieldAlert className="h-4 w-4" />}
            label="Alertas de atención"
            value={String(attention)}
          />
          <Mini
            icon={<CalendarClock className="h-4 w-4" />}
            label="Frecuencia"
            value="Cada 30 min"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {categories.map((c) => (
            <Button
              key={c}
              size="sm"
              variant={filter === c ? "default" : "outline"}
              onClick={() => setFilter(c)}
            >
              {c}
            </Button>
          ))}
        </div>
      </div>
      {top && (
        <div className="border-b bg-primary/[0.035] px-5 py-4 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                Nüva Priority Signal
              </p>
              <p className="mt-1 text-sm font-semibold">{top.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Prioridad calculada por señales de oportunidad o atención. Verifica siempre la
                fuente oficial.
              </p>
            </div>
            <a href={top.link} target="_blank" rel="noreferrer">
              <Button size="sm">
                Revisar <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </a>
          </div>
        </div>
      )}
      <div className="grid gap-3 p-5 md:grid-cols-2 md:p-6 lg:grid-cols-4">
        {visible.map((item, idx) => {
          const Icon =
            item.source === "SII" ? Scale : item.source === "Corfo" ? Landmark : WalletCards;
          const tone =
            item.impact === "Oportunidad"
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : item.impact === "Atención"
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                : "bg-muted text-muted-foreground";
          return (
            <article
              key={`${item.link}-${idx}`}
              className="group rounded-xl border bg-background/75 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft"
            >
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="gap-1">
                  <Icon className="h-3 w-3" />
                  {item.source}
                </Badge>
                <Badge className={`text-[10px] ${tone}`}>{item.impact}</Badge>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[10px] font-medium text-muted-foreground">
                  Relevancia {item.score}/100
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {item.pubDate ? new Date(item.pubDate).toLocaleDateString("es-CL") : "Actual"}
                </span>
              </div>
              <h3 className="mt-2 line-clamp-3 text-sm font-semibold leading-5">{item.title}</h3>
              {item.summary && (
                <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">
                  {item.summary}
                </p>
              )}
              <a
                href={item.link}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center text-xs font-semibold text-primary"
              >
                Ver fuente oficial <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </article>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-5 py-3 text-[11px] text-muted-foreground md:px-6">
        <span>
          {updatedAt
            ? `Última actualización ${updatedAt.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}`
            : "Actualizando fuentes..."}
        </span>
        <span>
          Fuentes oficiales: SII, Sercotec y Corfo. La relevancia es una señal de apoyo, no garantía
          de adjudicación.
        </span>
      </div>
    </Card>
  );
}
function Mini({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background/70 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  );
}
