import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, Package, Search, ShoppingBag, Copy, Check, MessageCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/page-utils";
import { ModuleGuard } from "@/components/module-guard";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useBizList, fmtCLP } from "@/lib/biz-data";
import { useActiveBusiness } from "@/lib/use-business";

export const Route = createFileRoute("/_authenticated/catalog")({
  head: () => ({ meta: [{ title: "Catálogo — Nüva One" }] }),
  component: CatalogPage,
});

function CatalogPage() {
  const { active } = useActiveBusiness();
  const { data: products, isLoading } = useBizList<any>("products", { order: "name", ascending: true });
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products ?? [];
    return (products ?? []).filter((p: any) => `${p.name ?? ""} ${p.sku ?? ""} ${p.category ?? ""}`.toLowerCase().includes(q));
  }, [products, query]);
  const publicUrl = active?.public_enabled && active?.public_slug ? `${window.location.origin}/public-catalog/${active.public_slug}` : null;

  function shareCatalogWhatsApp() {
    if (!publicUrl) return;
    const text = encodeURIComponent(`Hola, te comparto nuestro catálogo de Nüva One: ${publicUrl}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  async function shareCatalog() {
    if (!publicUrl) return;
    try { await navigator.clipboard.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { window.prompt("Copia el enlace del catálogo", publicUrl); }
  }

  return (
    <ModuleGuard module="catalog">
      <div className="space-y-5">
        <PageHeader title="Catálogo digital" description="Tu catálogo nace del mismo inventario: precio, disponibilidad y producto se mantienen sincronizados." actions={<div className="flex gap-2">{publicUrl && <a href={publicUrl} target="_blank" rel="noreferrer"><Button variant="outline"><ExternalLink className="mr-2 h-4 w-4" />Abrir público</Button></a>}<div className="flex gap-2"><Button variant="outline" disabled={!publicUrl} onClick={shareCatalogWhatsApp}><MessageCircle className="mr-2 h-4 w-4" />WhatsApp</Button><Button variant="outline" disabled={!publicUrl} onClick={shareCatalog}>{copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}{copied ? "Enlace copiado" : "Copiar enlace"}</Button></div></div>} />
        <Card className="overflow-hidden rounded-2xl border-primary/20 bg-gradient-to-br from-primary/[0.07] via-background to-accent/20 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary"><ShoppingBag className="h-4 w-4" /> Venta conectada</div><h2 className="mt-1 text-lg font-semibold">Inventario → catálogo → venta</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">La base está conectada al inventario. Cuando el catálogo público está habilitado, los clientes ven disponibilidad real y pueden contactar al negocio directamente.</p></div><Link to="/inventory"><Button variant="outline">Administrar inventario</Button></Link></div>
        </Card>
        {!publicUrl && <Card className="border-warning/30 bg-warning/5 p-4 text-sm"><strong>Publicación pendiente.</strong> Activa un slug público y la publicación del negocio para habilitar el enlace comercial.</Card>}
        <div className="flex items-center gap-2"><div className="relative max-w-md flex-1"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar producto, SKU o categoría…" className="pl-9" /></div><Badge variant="outline">{filtered.length} productos</Badge></div>
        {isLoading ? <Card className="p-6 text-sm text-muted-foreground">Cargando catálogo…</Card> : filtered.length === 0 ? <Card className="p-10 text-center text-sm text-muted-foreground">No hay productos para mostrar.</Card> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filtered.map((p: any) => { const stock = Number(p.stock ?? 0); const available = Math.max(0, stock - Number(p.reserved_stock ?? 0) - Number(p.blocked_stock ?? 0)); return <Card key={p.id} className="overflow-hidden rounded-2xl border-border/70 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"><div className="aspect-[4/3] bg-muted/30">{p.image_url ? <img src={p.image_url} alt={p.name ?? "Producto"} className="h-full w-full object-cover" loading="lazy" /> : <div className="grid h-full place-items-center text-muted-foreground"><Package className="h-10 w-10" /></div>}</div><div className="space-y-2 p-4"><div className="flex items-start justify-between gap-2"><h3 className="font-semibold leading-tight">{p.name || "Producto sin nombre"}</h3>{p.category && <Badge variant="secondary" className="shrink-0">{p.category}</Badge>}</div><p className="text-lg font-bold">{fmtCLP(Number(p.price ?? 0))}</p><p className="text-xs text-muted-foreground">{available > 0 ? `${available} disponibles` : "Sin disponibilidad"}{p.sku ? ` · SKU ${p.sku}` : ""}</p></div></Card>; })}</div>}
      </div>
    </ModuleGuard>
  );
}
