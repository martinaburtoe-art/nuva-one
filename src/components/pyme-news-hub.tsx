import { useEffect, useMemo, useState } from "react";
import { ExternalLink, RefreshCw, Sparkles, Landmark, Scale, WalletCards, Megaphone, Clock3, BellRing } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type NewsItem = { title: string; link: string; pubDate?: string; source: string; category: string; summary?: string };
const FEEDS = [
  { url: "https://www.sii.cl/rss/noticias.xml", source: "SII", category: "Tributario", icon: Scale },
  { url: "https://www.sercotec.cl/feed/", source: "Sercotec", category: "Fondos y apoyo", icon: WalletCards },
  { url: "https://www.corfo.cl/sites/cpp/sala_prensa", source: "Corfo", category: "Financiamiento e innovación", icon: Landmark },
];
const FALLBACK: NewsItem[] = [
  { title: "Sercotec: nuevas convocatorias y programas de apoyo para pymes", link: "https://www.sercotec.cl/noticias/", source: "Sercotec", category: "Fondos y apoyo", summary: "Revisa convocatorias, subsidios, capacitaciones y programas disponibles para micro y pequeñas empresas." },
  { title: "SII: novedades tributarias y obligaciones para contribuyentes", link: "https://www.sii.cl/noticias/", source: "SII", category: "Tributario", summary: "Consulta las últimas novedades, instrucciones y comunicaciones oficiales del Servicio de Impuestos Internos." },
  { title: "Corfo: oportunidades para innovación, digitalización y crecimiento", link: "https://www.corfo.cl/sites/cpp/homecorfo", source: "Corfo", category: "Financiamiento e innovación", summary: "Explora instrumentos y programas para innovación, productividad y transformación empresarial." },
];

export function PymeNewsHub() {
  const [items, setItems] = useState<NewsItem[]>(FALLBACK);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [filter, setFilter] = useState("Todas");

  const load = async () => {
    setLoading(true);
    const collected: NewsItem[] = [];
    await Promise.all(FEEDS.map(async (feed) => {
      try {
        const endpoint = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`;
        const res = await fetch(endpoint, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        (data.items ?? []).slice(0, 5).forEach((item: any) => collected.push({ title: item.title, link: item.link, pubDate: item.pubDate, source: feed.source, category: feed.category, summary: String(item.description ?? "").replace(/<[^>]*>/g, "").slice(0, 180) }));
      } catch { /* fallback remains available */ }
    }));
    if (collected.length) setItems(collected.sort((a, b) => new Date(b.pubDate ?? 0).getTime() - new Date(a.pubDate ?? 0).getTime()).slice(0, 8));
    setUpdatedAt(new Date());
    setLoading(false);
  };
  useEffect(() => { void load(); const id = window.setInterval(() => void load(), 30 * 60 * 1000); return () => window.clearInterval(id); }, []);
  const categories = useMemo(() => ["Todas", ...Array.from(new Set(items.map((i) => i.category)))], [items]);
  const visible = filter === "Todas" ? items : items.filter((i) => i.category === filter);

  return <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-primary/[0.04] via-background to-background">
    <div className="border-b p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3"><div className="rounded-xl bg-primary/10 p-2 text-primary"><BellRing className="h-5 w-5" /></div><div><div className="flex items-center gap-2"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Nüva PYME Radar</p><Badge variant="secondary" className="gap-1 text-[10px]"><Sparkles className="h-3 w-3" /> Actualización automática</Badge></div><h2 className="mt-1 text-lg font-semibold">Noticias y oportunidades que pueden mover tu negocio</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Fondos, cambios tributarios, leyes, programas públicos, digitalización y oportunidades relevantes para PYMEs chilenas.</p></div></div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />Actualizar</Button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{categories.map((c) => <Button key={c} size="sm" variant={filter === c ? "default" : "outline"} onClick={() => setFilter(c)}>{c}</Button>)}</div>
    </div>
    <div className="grid gap-3 p-5 md:grid-cols-2 md:p-6 lg:grid-cols-4">
      {visible.map((item, idx) => { const Icon = item.source === "SII" ? Scale : item.source === "Corfo" ? Landmark : WalletCards; return <article key={`${item.link}-${idx}`} className="group rounded-xl border bg-background/75 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft"><div className="flex items-center justify-between gap-2"><Badge variant="outline" className="gap-1"><Icon className="h-3 w-3" />{item.source}</Badge><span className="text-[10px] text-muted-foreground">{item.pubDate ? new Date(item.pubDate).toLocaleDateString("es-CL") : "Actual"}</span></div><h3 className="mt-3 line-clamp-3 text-sm font-semibold leading-5">{item.title}</h3>{item.summary && <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">{item.summary}</p>}<a href={item.link} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center text-xs font-semibold text-primary">Ver fuente oficial <ExternalLink className="ml-1 h-3 w-3" /></a></article>; })}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-5 py-3 text-[11px] text-muted-foreground md:px-6"><span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{updatedAt ? `Última actualización ${updatedAt.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}` : "Actualizando fuentes..."}</span><span>Las noticias se muestran desde fuentes oficiales; Nüva no garantiza plazos ni adjudicación de convocatorias.</span></div>
  </Card>;
}
